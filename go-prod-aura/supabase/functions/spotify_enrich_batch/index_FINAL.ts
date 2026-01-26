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

    // Récupérer TOUS les artistes avec leurs données Spotify
    const { data: artists, error: artistsErr } = await supabase
      .from("artists")
      .select("id, name, spotify_data(spotify_id, external_url)")
      .eq("company_id", company_id)
      .limit(limit);
    
    if (artistsErr) throw artistsErr;
    
    if (!artists?.length) {
      return new Response(
        JSON.stringify({ message: "No artists found" }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${artists.length} artists to process`);

    const token = await getSpotifyAppToken();
    let syncedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const artist of artists as any[]) {
      try {
        // Extraire le spotify_id
        let spotifyId: string | null = null;
        
        // D'abord essayer spotify_id direct
        if (artist.spotify_data?.spotify_id) {
          spotifyId = artist.spotify_data.spotify_id;
          console.log(`Artist ${artist.name}: Using existing spotify_id ${spotifyId}`);
        } 
        // Ensuite essayer d'extraire depuis external_url
        else if (artist.spotify_data?.external_url) {
          const match = artist.spotify_data.external_url.match(/artist\/([A-Za-z0-9]{22})/);
          spotifyId = match?.[1] ?? null;
          if (spotifyId) {
            console.log(`Artist ${artist.name}: Extracted spotify_id ${spotifyId} from URL`);
          }
        }

        // Si pas de spotify_id trouvé, ignorer
        if (!spotifyId) {
          console.log(`Skipping artist ${artist.name}: no spotify_id or external_url found`);
          skippedCount++;
          continue;
        }

        // Récupérer les données depuis Spotify API
        const sp = await fetchArtistById(token, spotifyId);
        const followers = sp.followers?.total ?? null;
        const popularity = sp.popularity ?? null;
        const genres = Array.isArray(sp.genres) ? sp.genres : null;
        const image_url = Array.isArray(sp.images) && sp.images[0]?.url ? sp.images[0].url : null;
        const external_url = `https://open.spotify.com/artist/${spotifyId}`;

        console.log(`Artist ${artist.name}: Fetched from Spotify - followers: ${followers}, popularity: ${popularity}`);

        // Vérifier si l'entrée existe déjà
        const { data: exists } = await supabase
          .from("spotify_data")
          .select("artist_id")
          .eq("artist_id", artist.id)
          .maybeSingle();

        if (exists?.artist_id) {
          // Mise à jour
          const { error: upErr } = await supabase.from("spotify_data").update({
            spotify_id: spotifyId,
            external_url: external_url,
            followers,
            popularity,
            genres,
            image_url,
            updated_at: new Date().toISOString(),
          }).eq("artist_id", artist.id);
          
          if (upErr) {
            console.error(`Error updating artist ${artist.name}:`, upErr);
            errorCount++;
          } else {
            syncedCount++;
            console.log(`✓ Updated artist ${artist.name}`);
          }
        } else {
          // Insertion
          const { error: insErr } = await supabase.from("spotify_data").insert([{
            artist_id: artist.id,
            spotify_id: spotifyId,
            external_url: external_url,
            followers,
            popularity,
            genres,
            image_url,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }]);
          
          if (insErr) {
            console.error(`Error inserting artist ${artist.name}:`, insErr);
            errorCount++;
          } else {
            syncedCount++;
            console.log(`✓ Inserted artist ${artist.name}`);
          }
        }
      } catch (err: any) {
        console.error(`Error syncing artist ${artist.name}:`, err.message);
        errorCount++;
      }
    }

    const summary = {
      message: `Synced ${syncedCount} out of ${artists.length} artist(s)`,
      total: artists.length,
      synced: syncedCount,
      skipped: skippedCount,
      errors: errorCount
    };

    console.log('✅ Sync summary:', summary);

    return new Response(
      JSON.stringify(summary),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e: any) {
    console.error('❌ Fatal error:', e);
    return new Response(
      JSON.stringify({ error: e.message ?? "unknown error" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});



