// Edge Function pour la synchronisation quotidienne automatique
// Appelée par un cron job tous les jours à midi
// Synchronise les données Spotify ET enregistre l'historique

// deno-lint-ignore-file no-explicit-any
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SPOTIFY_CLIENT_ID = Deno.env.get("SPOTIFY_CLIENT_ID")!;
const SPOTIFY_CLIENT_SECRET = Deno.env.get("SPOTIFY_CLIENT_SECRET")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

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
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('🚀 Starting daily Spotify sync...');
    const startTime = new Date();

    // Récupérer TOUTES les entreprises actives
    const { data: companies, error: compErr } = await supabase
      .from('companies')
      .select('id, name');
    
    if (compErr) throw compErr;
    
    console.log(`Found ${companies?.length || 0} companies`);

    const token = await getSpotifyAppToken();
    let totalSynced = 0;
    let totalHistorySaved = 0;
    let totalErrors = 0;

    // Pour chaque entreprise
    for (const company of (companies || [])) {
      console.log(`\n📊 Processing company: ${company.name} (${company.id})`);

      // Récupérer tous les artistes de cette entreprise avec données Spotify
      const { data: artists, error: artistsErr } = await supabase
        .from('artists')
        .select('id, name, spotify_data(spotify_id, external_url)')
        .eq('company_id', company.id);
      
      if (artistsErr) {
        console.error(`Error fetching artists for ${company.name}:`, artistsErr);
        continue;
      }

      console.log(`  Found ${artists?.length || 0} artists`);

      // Pour chaque artiste
      for (const artist of (artists || []) as any[]) {
        try {
          // Extraire le spotify_id
          let spotifyId: string | null = null;
          
          if (artist.spotify_data?.spotify_id) {
            spotifyId = artist.spotify_data.spotify_id;
          } else if (artist.spotify_data?.external_url) {
            const match = artist.spotify_data.external_url.match(/artist\/([A-Za-z0-9]{22})/);
            spotifyId = match?.[1] ?? null;
          }

          if (!spotifyId) {
            console.log(`  ⏭️ Skipping ${artist.name}: no spotify_id`);
            continue;
          }

          // Récupérer les données fraîches depuis Spotify
          const sp = await fetchArtistById(token, spotifyId);
          const followers = sp.followers?.total ?? null;
          const popularity = sp.popularity ?? null;
          const genres = Array.isArray(sp.genres) ? sp.genres : null;
          const image_url = Array.isArray(sp.images) && sp.images[0]?.url ? sp.images[0].url : null;
          const external_url = `https://open.spotify.com/artist/${spotifyId}`;

          // Mettre à jour spotify_data
          const { error: updateErr } = await supabase
            .from('spotify_data')
            .upsert({
              artist_id: artist.id,
              spotify_id: spotifyId,
              external_url,
              followers,
              popularity,
              genres,
              image_url,
              updated_at: new Date().toISOString(),
            }, {
              onConflict: 'artist_id'
            });

          if (updateErr) {
            console.error(`  ❌ Error updating ${artist.name}:`, updateErr);
            totalErrors++;
            continue;
          }

          totalSynced++;

          // Enregistrer dans l'historique
          const { error: historyErr } = await supabase
            .from('spotify_history')
            .insert({
              artist_id: artist.id,
              followers,
              popularity,
              recorded_at: new Date().toISOString(),
            });

          if (historyErr) {
            // Si erreur (probablement duplicate), on ignore
            console.log(`  ⚠️ History already exists for ${artist.name} today`);
          } else {
            totalHistorySaved++;
            console.log(`  ✅ Synced ${artist.name}: ${followers} followers, popularity ${popularity}`);
          }

        } catch (err: any) {
          console.error(`  💥 Error processing ${artist.name}:`, err.message);
          totalErrors++;
        }
      }
    }

    const endTime = new Date();
    const duration = (endTime.getTime() - startTime.getTime()) / 1000;

    const summary = {
      success: true,
      message: 'Daily sync completed',
      stats: {
        companies: companies?.length || 0,
        synced: totalSynced,
        historySaved: totalHistorySaved,
        errors: totalErrors,
        duration: `${duration.toFixed(2)}s`,
        timestamp: new Date().toISOString()
      }
    };

    console.log('\n✅ Daily sync completed:', summary);

    return new Response(
      JSON.stringify(summary),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (e: any) {
    console.error('❌ Fatal error:', e);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: e.message ?? "unknown error",
        timestamp: new Date().toISOString()
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});



