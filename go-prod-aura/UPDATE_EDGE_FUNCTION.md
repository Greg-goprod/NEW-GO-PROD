# 🔄 Mise à Jour Edge Function - Version Corrigée

## 🐛 **PROBLÈMES CORRIGÉS**

1. ✅ **Limite de 8 artistes** : Maintenant synchronise tous les artistes (jusqu'à la limite spécifiée)
2. ✅ **URLs Spotify manquantes** : Les `external_url` sont maintenant correctement enregistrées
3. ✅ **Meilleure gestion des erreurs** : Continue même si un artiste échoue
4. ✅ **Logs détaillés** : Affiche le nombre exact d'artistes synchronisés

## 📝 **NOUVEAU CODE À COPIER**

Dans Supabase Dashboard > Edge Functions > `spotify_enrich_batch` :

**REMPLACER TOUT LE CODE** par celui du fichier : `supabase/functions/spotify_enrich_batch/index_v2.ts`

Ou copier directement ci-dessous :

\`\`\`typescript
// deno-lint-ignore-file no-explicit-any
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SPOTIFY_CLIENT_ID = Deno.env.get("SPOTIFY_CLIENT_ID")!;
const SPOTIFY_CLIENT_SECRET = Deno.env.get("SPOTIFY_CLIENT_SECRET")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function getSpotifyAppToken() {
  const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Authorization": "Basic " + btoa(\`\${SPOTIFY_CLIENT_ID}:\${SPOTIFY_CLIENT_SECRET}\`),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!tokenRes.ok) throw new Error(\`Spotify token error: \${tokenRes.status}\`);
  const json = await tokenRes.json();
  return json.access_token as string;
}

async function fetchArtistById(token: string, spotifyId: string) {
  const res = await fetch(\`https://api.spotify.com/v1/artists/\${spotifyId}\`, {
    headers: { Authorization: \`Bearer \${token}\` }
  });
  if (!res.ok) throw new Error(\`Spotify artist \${spotifyId}: \${res.status}\`);
  return await res.json();
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { company_id, limit = 25 } = await req.json();
    if (!company_id) {
      return new Response(
        JSON.stringify({ error: "company_id is required" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Récupérer tous les artistes avec leurs données Spotify
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

    const token = await getSpotifyAppToken();
    let syncedCount = 0;

    for (const artist of artists as any[]) {
      try {
        // Extraire le spotify_id depuis external_url ou depuis spotify_id
        let spotifyId: string | null = null;
        
        if (artist.spotify_data?.spotify_id) {
          spotifyId = artist.spotify_data.spotify_id;
        } else if (artist.spotify_data?.external_url) {
          const match = artist.spotify_data.external_url.match(/artist\\/([A-Za-z0-9]{22})/);
          spotifyId = match?.[1] ?? null;
        }

        // Si pas de spotify_id trouvé, ignorer cet artiste
        if (!spotifyId) {
          console.log(\`Skipping artist \${artist.name}: no spotify_id found\`);
          continue;
        }

        // Récupérer les données depuis Spotify API
        const sp = await fetchArtistById(token, spotifyId);
        const followers = sp.followers?.total ?? null;
        const popularity = sp.popularity ?? null;
        const genres = Array.isArray(sp.genres) ? sp.genres : null;
        const image_url = Array.isArray(sp.images) && sp.images[0]?.url ? sp.images[0].url : null;
        const external_url = \`https://open.spotify.com/artist/\${spotifyId}\`;

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
            console.error(\`Error updating artist \${artist.name}:\`, upErr);
          } else {
            syncedCount++;
            console.log(\`Updated artist \${artist.name}\`);
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
            console.error(\`Error inserting artist \${artist.name}:\`, insErr);
          } else {
            syncedCount++;
            console.log(\`Inserted artist \${artist.name}\`);
          }
        }
      } catch (err: any) {
        console.error(\`Error syncing artist \${artist.name}:\`, err.message);
        // Continue avec l'artiste suivant
      }
    }

    return new Response(
      JSON.stringify({ 
        message: \`Synced \${syncedCount} out of \${artists.length} artist(s)\`,
        total: artists.length,
        synced: syncedCount
      }),
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
\`\`\`

## 🚀 **ÉTAPES DE MISE À JOUR**

1. **Aller dans Supabase** > Edge Functions > `spotify_enrich_batch`
2. **Sélectionner tout le code** (Ctrl+A)
3. **Coller le nouveau code** ci-dessus
4. **Cliquer sur "Deploy"**
5. **Attendre** la fin du déploiement
6. **Tester** dans l'application

## 🧪 **TEST**

1. Aller sur http://localhost:5173/app/artistes
2. Cliquer sur "Synchroniser Spotify"
3. Vérifier le message : "Synced X out of Y artist(s)"
4. Vérifier dans la base de données :

\`\`\`sql
SELECT 
  a.name,
  sd.external_url,
  sd.followers,
  sd.popularity
FROM artists a
LEFT JOIN spotify_data sd ON a.id = sd.artist_id
WHERE a.company_id = '06f6c960-3f90-41cb-b0d7-46937eaf90a8'
ORDER BY a.name;
\`\`\`

## ✅ **RÉSULTAT ATTENDU**

- ✅ **Tous les artistes** avec des données Spotify sont synchronisés
- ✅ **external_url** correctement enregistré pour chaque artiste
- ✅ **Message détaillé** : "Synced 24 out of 24 artist(s)"
- ✅ **Logs dans la console** de l'Edge Function

🎉 **Après mise à jour, tous vos artistes seront complètement synchronisés !**



