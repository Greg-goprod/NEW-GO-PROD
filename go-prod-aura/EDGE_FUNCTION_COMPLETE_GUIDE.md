# 🚀 Guide Complet - Déploiement Edge Function Spotify

## 📋 **RÉSUMÉ DU PROBLÈME**

**Erreur actuelle** : `TypeError: Failed to fetch`

**Cause** : L'Edge Function `spotify_enrich_batch` n'est pas déployée ou mal configurée dans Supabase.

---

## ✅ **SOLUTION COMPLÈTE**

### **📦 Étape 1 : Créer l'Edge Function dans Supabase**

1. **Aller dans Supabase Dashboard** :
   - https://supabase.com/dashboard
   - Sélectionner votre projet

2. **Naviguer vers Edge Functions** :
   - Menu latéral > Edge Functions
   - Cliquer sur "Create a new function"

3. **Créer la fonction** :
   - **Nom** : `spotify_enrich_batch`
   - **Cliquer** sur "Create function"

---

### **📝 Étape 2 : Coller le Code de l'Edge Function**

Dans l'éditeur de l'Edge Function, **REMPLACER TOUT LE CONTENU** par le code suivant :

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

    const { data: candidates, error: candErr } = await supabase.rpc("artists_for_spotify_sync", {
      p_company_id: company_id,
      p_limit: limit,
    });
    
    if (candErr) throw candErr;
    
    if (!candidates?.length) {
      return new Response(
        JSON.stringify({ message: "Nothing to sync" }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = await getSpotifyAppToken();

    for (const a of candidates as any[]) {
      let spotifyId: string | null = null;
      const { data: sd } = await supabase.from("spotify_data")
        .select("spotify_id, external_url")
        .eq("artist_id", a.id).maybeSingle();
      spotifyId = sd?.spotify_id ?? null;

      if (!spotifyId && sd?.external_url && /spotify\\.com\\/artist\\/[A-Za-z0-9]{22}/.test(sd.external_url)) {
        const m = sd.external_url.match(/artist\\/([A-Za-z0-9]{22})/);
        spotifyId = m?.[1] ?? null;
      }
      if (!spotifyId) continue;

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
          external_url: \`https://open.spotify.com/artist/\${spotifyId}\`,
          followers, popularity, genres, image_url,
          updated_at: new Date().toISOString(),
        }).eq("artist_id", a.id);
        if (upErr) throw upErr;
      } else {
        const { error: insErr } = await supabase.from("spotify_data").insert([{
          artist_id: a.id,
          spotify_id: spotifyId,
          external_url: \`https://open.spotify.com/artist/\${spotifyId}\`,
          followers, popularity, genres, image_url,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }]);
        if (insErr) throw insErr;
      }
    }

    return new Response(
      JSON.stringify({ message: \`Synced \${candidates.length} artist(s)\` }),
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

---

### **🔑 Étape 3 : Configurer les Variables d'Environnement**

1. **Dans l'Edge Function** > Onglet "Settings"
2. **Ajouter les variables** :

| Variable | Valeur |
|----------|--------|
| `SPOTIFY_CLIENT_ID` | Votre Spotify Client ID |
| `SPOTIFY_CLIENT_SECRET` | Votre Spotify Client Secret |

**📌 Note** : `SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY` sont automatiquement disponibles.

---

### **🚀 Étape 4 : Déployer l'Edge Function**

1. **Cliquer sur "Deploy"** (bouton en haut à droite)
2. **Attendre** la fin du déploiement (indicateur vert)
3. **Vérifier** le statut : "Deployed"

---

### **✅ Étape 5 : Vérifier que la RPC Function Existe**

Dans le **SQL Editor de Supabase**, exécuter :

\`\`\`sql
-- Vérifier que la fonction RPC existe
SELECT proname FROM pg_proc WHERE proname = 'artists_for_spotify_sync';
\`\`\`

**Si elle n'existe pas**, exécuter le script `sql/rpc_artists_for_spotify_sync.sql` :

\`\`\`sql
CREATE OR REPLACE FUNCTION artists_for_spotify_sync(
  p_company_id UUID,
  p_limit INT DEFAULT 25
)
RETURNS TABLE(
  id UUID,
  name TEXT,
  company_id UUID
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id,
    a.name,
    a.company_id
  FROM artists a
  LEFT JOIN spotify_data sd ON a.id = sd.artist_id
  WHERE a.company_id = p_company_id
    AND (
      sd.artist_id IS NULL 
      OR sd.updated_at IS NULL 
      OR sd.updated_at < now() - interval '7 days'
    )
  ORDER BY a.created_at DESC
  LIMIT p_limit;
END;
$$;
\`\`\`

---

### **🧪 Étape 6 : Tester l'Edge Function**

1. **Dans l'Edge Function** > Onglet "Invocations"
2. **Cliquer sur "Invoke function"**
3. **Payload de test** :
\`\`\`json
{
  "company_id": "06f6c960-3f90-41cb-b0d7-46937eaf90a8",
  "limit": 5
}
\`\`\`
4. **Vérifier** : Réponse `200` avec message de succès

---

### **🎯 Étape 7 : Tester dans l'Application**

1. **Aller sur** http://localhost:5173/app/artistes
2. **Cliquer sur** "Synchroniser Spotify"
3. **Vérifier** :
   - ✅ Pas d'erreur "Failed to fetch"
   - ✅ Message de succès
   - ✅ Données Spotify mises à jour

---

## 🔍 **DIAGNOSTIC EN CAS DE PROBLÈME**

### **Erreur : "Failed to fetch"**
- ✅ Vérifier que l'Edge Function est déployée
- ✅ Vérifier les CORS dans le code
- ✅ Vérifier l'URL dans `spotifySync.ts`

### **Erreur : "RPC function not found"**
- ✅ Exécuter le script SQL de la RPC function

### **Erreur : "Spotify token error"**
- ✅ Vérifier les variables d'environnement Spotify
- ✅ Vérifier que les credentials Spotify sont valides

---

## 📌 **CHECKLIST FINALE**

- [ ] Edge Function `spotify_enrich_batch` créée
- [ ] Code copié et déployé
- [ ] Variables d'environnement configurées
- [ ] RPC function `artists_for_spotify_sync` créée
- [ ] Test de l'Edge Function réussi
- [ ] Test dans l'application réussi

---

## 🎉 **RÉSULTAT ATTENDU**

**✅ La synchronisation Spotify fonctionne sans erreur !**
**✅ Les données sont mises à jour automatiquement !**
**✅ Le bouton "Synchroniser Spotify" est opérationnel !**



