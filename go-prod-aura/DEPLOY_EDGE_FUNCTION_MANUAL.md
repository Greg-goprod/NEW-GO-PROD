# 🚀 Déploiement Manuel de l'Edge Function Spotify

## Méthode 1 : Via le Dashboard Supabase (Recommandée)

### 1. Accéder au Dashboard Supabase
1. Allez sur [supabase.com](https://supabase.com)
2. Connectez-vous à votre compte
3. Sélectionnez votre projet

### 2. Créer l'Edge Function
1. Dans le menu de gauche, cliquez sur **"Edge Functions"**
2. Cliquez sur **"Create a new function"**
3. Nom : `spotify_enrich_batch`
4. Cliquez sur **"Create function"**

### 3. Copier le Code
Remplacez le contenu par défaut par le code de `supabase/functions/spotify_enrich_batch/index.ts` :

```typescript
// supabase/functions/spotify_enrich_batch/index.ts
// deno-lint-ignore-file no-explicit-any
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SPOTIFY_CLIENT_ID = Deno.env.get("SPOTIFY_CLIENT_ID")!;
const SPOTIFY_CLIENT_SECRET = Deno.env.get("SPOTIFY_CLIENT_SECRET")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

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
  try {
    const { company_id, limit = 25 } = await req.json();
    if (!company_id) return new Response(JSON.stringify({ error: "company_id is required" }), { status: 400 });

    const { data: candidates, error: candErr } = await supabase.rpc("artists_for_spotify_sync", {
      p_company_id: company_id,
      p_limit: limit,
    });
    if (candErr) throw candErr;
    if (!candidates?.length) return new Response(JSON.stringify({ message: "Nothing to sync" }), { status: 200 });

    const token = await getSpotifyAppToken();

    for (const a of candidates as any[]) {
      // spotify_id: on tente de le lire depuis spotify_data si déjà présent
      let spotifyId: string | null = null;
      const { data: sd } = await supabase.from("spotify_data")
        .select("spotify_id, spotify_url")
        .eq("artist_id", a.id).maybeSingle();
      spotifyId = sd?.spotify_id ?? null;

      if (!spotifyId && sd?.spotify_url && /spotify\.com\/artist\/[A-Za-z0-9]{22}/.test(sd.spotify_url)) {
        const m = sd.spotify_url.match(/artist\/([A-Za-z0-9]{22})/);
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
          spotify_url: `https://open.spotify.com/artist/${spotifyId}`,
          followers, popularity, genres, image_url,
          updated_at: new Date().toISOString(),
        }).eq("artist_id", a.id);
        if (upErr) throw upErr;
      } else {
        const { error: insErr } = await supabase.from("spotify_data").insert([{
          artist_id: a.id,
          spotify_id: spotifyId,
          spotify_url: `https://open.spotify.com/artist/${spotifyId}`,
          followers, popularity, genres, image_url,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }]);
        if (insErr) throw insErr;
      }
    }

    return new Response(JSON.stringify({ message: `Synced ${candidates.length} artist(s)` }), { status: 200 });
  } catch (e: any) {
    console.error(e);
    return new Response(JSON.stringify({ error: e.message ?? "unknown error" }), { status: 500 });
  }
});
```

### 4. Configurer les Variables d'Environnement
1. Dans l'onglet **"Settings"** de l'Edge Function
2. Ajoutez les variables :
   - `SPOTIFY_CLIENT_ID` : Votre Client ID Spotify
   - `SPOTIFY_CLIENT_SECRET` : Votre Client Secret Spotify

### 5. Déployer
1. Cliquez sur **"Deploy"**
2. Attendez que le déploiement soit terminé

## Méthode 2 : Via CLI (Alternative)

### 1. Installer la CLI Supabase
```bash
# Windows (PowerShell)
iwr -useb https://supabase.com/install.ps1 | iex

# Ou via Scoop
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

### 2. Se connecter
```bash
supabase login
```

### 3. Lier le projet
```bash
supabase link --project-ref YOUR_PROJECT_REF
```

### 4. Déployer
```bash
supabase functions deploy spotify_enrich_batch
```

## Vérification

### 1. Tester l'Edge Function
```bash
curl -X POST 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/spotify_enrich_batch' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"company_id": "06f6c960-3f90-41cb-b0d7-46937eaf90a8"}'
```

### 2. Réactiver le bouton
Une fois déployée, modifiez `src/pages/app/artistes/index.tsx` :
```typescript
// Réactiver l'import
import { triggerSpotifySync } from "../../../lib/spotifySync";

// Réactiver le bouton
<Button
  variant="secondary"
  onClick={() => {
    if (!companyId) return;
    setSyncState("running");
    triggerSpotifySync(supabase, companyId, 25).then((r) => {
      setSyncState(r.ok ? "done" : "error");
      setSyncMsg(r.message);
      fetchArtists();
    });
  }}
>
  Synchroniser Spotify
</Button>
```

## Résultat Attendu
- ✅ L'erreur "EdgeFunction error: 404" disparaît
- ✅ Le bouton "Synchroniser Spotify" fonctionne
- ✅ Les données Spotify sont synchronisées automatiquement


