# Songstats v4 Enrichment System

## 📋 Vue d'ensemble

Ce système ingère les informations complètes Songstats (artist_info, links, genres, related_artists) et les écrit dans des tables dédiées. Il offre deux runtimes :

1. **Netlify Function** - Pour les tâches planifiées (cron) en production
2. **Supabase Edge Function** - Pour les déclenchements manuels ou studio/dev

## 🗄️ Nouvelles tables créées

### `artists` (colonnes ajoutées)
- `songstats_id` : Identifiant unique Songstats
- `avatar_url` : URL de l'avatar
- `songstats_url` : URL du profil Songstats
- `bio` : Biographie de l'artiste

### `artist_links_songstats`
Liens multi-plateformes de l'artiste (Spotify, Beatport, Apple Music, Deezer, etc.)

### `artist_genres`
Genres musicaux associés à l'artiste

### `artist_related`
Artistes similaires/liés

## 🔧 Installation

### 1. Exécuter les migrations SQL

Dans Supabase Studio SQL Editor, exécutez dans l'ordre :

```bash
supabase/migrations/20251025_songstats_v4_enrichment.sql
supabase/migrations/20251025_rpc_lock_enrich_batch.sql
```

### 2. Configurer les variables d'environnement

#### Pour Netlify :
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
SONGSTATS_API_KEY=your-songstats-api-key
RATE_DELAY_MS=600  # (optionnel, délai entre requêtes en ms)
```

#### Pour Supabase Edge Functions :
```bash
supabase secrets set SUPABASE_URL=https://your-project.supabase.co
supabase secrets set SUPABASE_SERVICE_KEY=your-service-role-key
supabase secrets set SONGSTATS_API_KEY=your-songstats-api-key
supabase secrets set RATE_DELAY_MS=600
```

### 3. Déployer les fonctions

#### Netlify Function :
La fonction est automatiquement déployée avec votre site Netlify.

#### Supabase Edge Function :
```bash
supabase functions deploy queue-stats
```

## 🚀 Utilisation

### Netlify Function (Scheduled)

Configurez un Scheduled Function dans Netlify pour exécuter périodiquement :

**Endpoint :** `/.netlify/functions/queue-stats`

**Méthode :** POST

**Body :**
```json
{
  "company_id": "06f6c960-3f90-41cb-b0d7-46937eaf90a8",
  "batch_size": 25,
  "dry_run": false
}
```

### Supabase Edge Function (Manuel)

**Endpoint :** `https://[project-ref].functions.supabase.co/queue-stats`

**Méthode :** POST

**Headers :**
```
Authorization: Bearer [anon-key]
```

**Body :**
```json
{
  "company_id": "06f6c960-3f90-41cb-b0d7-46937eaf90a8",
  "batch_size": 10,
  "dry_run": false
}
```

### Test en mode dry-run

Pour tester sans écrire dans la base :

```json
{
  "company_id": "06f6c960-3f90-41cb-b0d7-46937eaf90a8",
  "batch_size": 5,
  "dry_run": true
}
```

## 📊 Paramètres

| Paramètre | Type | Défaut | Description |
|-----------|------|--------|-------------|
| `company_id` | string | **requis** | UUID de l'entreprise tenant |
| `batch_size` | number | 10 | Nombre d'artistes à traiter par batch |
| `dry_run` | boolean | false | Mode test (ne fait pas d'appels API réels) |

## 🔐 Sécurité

- Utilise le **service role key** pour contourner RLS
- Toutes les écritures sont tenant-aware (company_id)
- Locking atomique via RPC `lock_enrich_batch` (évite les doublons)
- Rate limiting configurable (RATE_DELAY_MS)

## 📝 Workflow

1. La fonction lock un batch de rows `pending` dans `artist_enrich_queue`
2. Pour chaque artiste :
   - Récupère le `songstats_id`
   - Appelle l'API Songstats `/artist/{songstats_id}`
   - Parse et normalise les données via `mapArtistInfo.ts`
   - Écrit dans les 4 tables (artists, genres, links, related)
   - Marque la row comme `done` ou `error`
3. Attend RATE_DELAY_MS entre chaque artiste
4. Retourne le nombre traité

## 🔍 Monitoring

Les logs sont visibles dans :
- **Netlify :** Functions logs
- **Supabase :** Edge Functions logs

Vérifiez l'état des jobs dans `artist_enrich_queue` :
```sql
SELECT status, COUNT(*) 
FROM artist_enrich_queue 
WHERE company_id = '06f6c960-3f90-41cb-b0d7-46937eaf90a8'
GROUP BY status;
```

## ⚠️ Notes importantes

1. **Clé Songstats API** : Assurez-vous d'avoir un quota suffisant
2. **Rate limiting** : Respectez les limites de l'API Songstats
3. **artist_enrich_queue** : Cette table doit exister (créée séparément)
4. **RLS** : Les nouvelles tables n'ont PAS de RLS (accès via service key uniquement)

## 🐛 Troubleshooting

### Erreur "company_id required"
Vérifiez que le body contient bien `company_id`

### Erreur "missing songstats_id"
L'artiste n'a pas de `songstats_id` dans la table `artists`

### Erreur "Songstats HTTP 4XX/5XX"
- Vérifiez votre clé API Songstats
- Vérifiez que le `songstats_id` est valide
- Vérifiez votre quota API

### Erreur "artist_info missing"
La réponse API Songstats ne contient pas la structure attendue

