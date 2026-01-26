# 🚀 Déploiement de l'Edge Function Spotify

## Problème Identifié
L'erreur "EdgeFunction error: 404" indique que l'Edge Function `spotify_enrich_batch` n'est pas déployée sur Supabase.

## Solution : Déployer l'Edge Function

### 1. Prérequis
- CLI Supabase installé : `npm install -g supabase`
- Projet Supabase connecté
- Variables d'environnement configurées

### 2. Déploiement
```bash
# Se connecter à Supabase
supabase login

# Lier le projet
supabase link --project-ref YOUR_PROJECT_REF

# Déployer l'Edge Function
supabase functions deploy spotify_enrich_batch
```

### 3. Configuration des Variables d'Environnement
Dans le dashboard Supabase > Settings > Edge Functions :

```
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
```

### 4. Vérification
```bash
# Tester l'Edge Function
curl -X POST 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/spotify_enrich_batch' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"company_id": "06f6c960-3f90-41cb-b0d7-46937eaf90a8"}'
```

### 5. Alternative : Désactiver la Synchronisation
Si vous ne voulez pas déployer l'Edge Function, vous pouvez désactiver le bouton de synchronisation en modifiant `index.tsx` :

```typescript
// Commenter ou supprimer le bouton de synchronisation
{/* <Button onClick={...}>Synchroniser Spotify</Button> */}
```

## Résultat Attendu
- ✅ L'erreur "EdgeFunction error: 404" disparaît
- ✅ Le bouton "Synchroniser Spotify" fonctionne
- ✅ Les données Spotify sont synchronisées


