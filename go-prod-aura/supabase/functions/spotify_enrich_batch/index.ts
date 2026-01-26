// deno-lint-ignore-file no-explicit-any
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SPOTIFY_CLIENT_ID = Deno.env.get("SPOTIFY_CLIENT_ID")!;
const SPOTIFY_CLIENT_SECRET = Deno.env.get("SPOTIFY_CLIENT_SECRET")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// CORS headers - IMPORTANT !
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

async function getSpotifyAppToken() {
  const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Authorization": "Basic " + btoa(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!tokenRes.ok) throw new Error(`Spotify token error: ${tokenRes.status}`);
  const json = await tokenRes.json();
  return json.access_token as string;
}

async function fetchArtistById(token: string, spotifyId: string) {
  const res = await fetch(`https://api.spotify.com/v1/artists/${spotifyId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error(`Spotify artist ${spotifyId}: ${res.status}`);
  return await res.json();
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { company_id, limit = 100 } = await req.json();
    if (!company_id) {
      return new Response(
        JSON.stringify({ error: "company_id is required" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`🚀 Starting sync for company ${company_id}, limit ${limit}`);

    const { data: candidates, error: candErr } = await supabase.rpc("artists_for_spotify_sync", {
      p_company_id: company_id,
      p_limit: limit,
    });
    
    if (candErr) throw candErr;
    
    console.log(`Found ${candidates?.length || 0} candidates for sync`);
    
    if (!candidates?.length) {
      return new Response(
        JSON.stringify({ message: "Nothing to sync" }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = await getSpotifyAppToken();
    let syncedCount = 0;
    let skippedCount = 0;

    for (const a of candidates as any[]) {
      try {
        let spotifyId: string | null = null;
        const { data: sd } = await supabase.from("spotify_data")
          .select("spotify_id, external_url")
          .eq("artist_id", a.id).maybeSingle();
        spotifyId = sd?.spotify_id ?? null;

        if (!spotifyId && sd?.external_url && /spotify\.com\/artist\/[A-Za-z0-9]{22}/.test(sd.external_url)) {
          const m = sd.external_url.match(/artist\/([A-Za-z0-9]{22})/);
          spotifyId = m?.[1] ?? null;
        }
        
        if (!spotifyId) {
          console.log(`⏭️ Skipping ${a.name}: no spotify_id found`);
          skippedCount++;
          continue;
        }
        
        console.log(`🎵 Syncing ${a.name} (${spotifyId})...`);

        const sp = await fetchArtistById(token, spotifyId);
        const followers = sp.followers?.total ?? null;
        const popularity = sp.popularity ?? null;
        const genres = Array.isArray(sp.genres) ? sp.genres : null;
        const image_url = Array.isArray(sp.images) && sp.images[0]?.url ? sp.images[0].url : null;

        const { data: exists } = await supabase
          .from("spotify_data").select("artist_id").eq("artist_id", a.id).maybeSingle();

        if (exists?.artist_id) {
          const { error: upErr } = await supabase.from("spotify_data").update({
            spotify_id: spotifyId,
            external_url: `https://open.spotify.com/artist/${spotifyId}`,
            followers, popularity, genres, image_url,
            updated_at: new Date().toISOString(),
          }).eq("artist_id", a.id);
          if (upErr) {
            console.error(`❌ Error updating ${a.name}:`, upErr);
          } else {
            syncedCount++;
            console.log(`✅ Updated ${a.name}`);
          }
        } else {
          const { error: insErr } = await supabase.from("spotify_data").insert([{
            artist_id: a.id,
            spotify_id: spotifyId,
            external_url: `https://open.spotify.com/artist/${spotifyId}`,
            followers, popularity, genres, image_url,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }]);
          if (insErr) {
            console.error(`❌ Error inserting ${a.name}:`, insErr);
          } else {
            syncedCount++;
            console.log(`✅ Inserted ${a.name}`);
          }
        }
      } catch (err: any) {
        console.error(`💥 Error syncing ${a.name}:`, err.message);
      }
    }

    const summary = {
      message: `Synced ${syncedCount} out of ${candidates.length} artist(s)`,
      total: candidates.length,
      synced: syncedCount,
      skipped: skippedCount
    };
    
    console.log('✅ Sync summary:', summary);

    return new Response(
      JSON.stringify(summary),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e: any) {
    console.error(e);
    return new Response(
      JSON.stringify({ error: e.message ?? "unknown error" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
