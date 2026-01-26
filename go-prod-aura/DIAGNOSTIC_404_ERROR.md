# 🔍 Diagnostic : Erreur 404 Edge Function

## Problème
L'erreur "EdgeFunction error: 404" persiste même après le déploiement de l'Edge Function.

## Causes Possibles

### 1. URL Incorrecte
- **Problème** : URL relative au lieu de l'URL complète
- **Solution** : ✅ Corrigé dans `spotifySync.ts`

### 2. Edge Function Non Déployée
- **Vérification** : Dans le dashboard Supabase > Edge Functions
- **Solution** : Vérifier que `spotify_enrich_batch` est bien déployée

### 3. Variables d'Environnement Manquantes
- **Vérification** : Dans l'Edge Function > Settings
- **Variables requises** :
  - `SPOTIFY_CLIENT_ID`
  - `SPOTIFY_CLIENT_SECRET`

### 4. RPC Function Manquante
- **Problème** : La fonction `artists_for_spotify_sync` n'existe pas
- **Solution** : Exécuter le script SQL `sql/rpc_artists_for_spotify_sync.sql`

## Étapes de Diagnostic

### 1. Vérifier les Logs
Ouvrez la console (F12) et regardez les logs :
```
🔗 URL Edge Function: https://YOUR_PROJECT.supabase.co/functions/v1/spotify_enrich_batch
🔑 Access Token présent: true/false
📊 Payload: {company_id: "...", limit: 25}
```

### 2. Tester l'URL Manuellement
```bash
curl -X POST 'https://YOUR_PROJECT.supabase.co/functions/v1/spotify_enrich_batch' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"company_id": "06f6c960-3f90-41cb-b0d7-46937eaf90a8"}'
```

### 3. Vérifier l'Edge Function
Dans le dashboard Supabase :
1. Edge Functions > `spotify_enrich_batch`
2. Vérifier que le statut est "Deployed"
3. Vérifier les logs d'exécution

### 4. Vérifier la RPC Function
Exécuter dans Supabase SQL Editor :
```sql
-- Vérifier que la fonction existe
SELECT proname FROM pg_proc WHERE proname = 'artists_for_spotify_sync';

-- Tester la fonction
SELECT * FROM artists_for_spotify_sync('06f6c960-3f90-41cb-b0d7-46937eaf90a8', 25);
```

## Solutions

### Si l'URL est incorrecte :
✅ Déjà corrigé dans `spotifySync.ts`

### Si l'Edge Function n'est pas déployée :
1. Aller dans Supabase Dashboard
2. Edge Functions > Create function
3. Nom : `spotify_enrich_batch`
4. Copier le code fourni
5. Déployer

### Si la RPC Function manque :
Exécuter `sql/rpc_artists_for_spotify_sync.sql` dans Supabase SQL Editor

### Si les variables d'environnement manquent :
Dans l'Edge Function > Settings, ajouter :
- `SPOTIFY_CLIENT_ID`
- `SPOTIFY_CLIENT_SECRET`

## Test Final
1. Redémarrer l'application
2. Aller sur la page des artistes
3. Cliquer sur "Synchroniser Spotify"
4. Vérifier qu'il n'y a plus d'erreur 404


