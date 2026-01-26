# 🗑️ Système d'enrichissement supprimé

## Contexte

Le système d'enrichissement des artistes (MusicBrainz, Wikipedia, TheAudioDB, Bandsintown) a été **supprimé** car il est maintenant **géré directement en backend par Supabase**.

## Fichiers supprimés

### Code source (4 fichiers)
- ❌ `src/types/external.ts`
- ❌ `src/services/enrichment/httpClients.ts`
- ❌ `src/services/enrichment/mappers.ts`
- ❌ `src/services/enrichment/artistEnricher.ts`

### Netlify Functions (2 fichiers)
- ❌ `netlify/functions/enrich-artist.ts`
- ❌ `netlify/functions/enrich-missing.ts`

### SQL (1 fichier)
- ❌ `sql/create_enrichment_tables.sql`

### Documentation (7 fichiers)
- ❌ `README_ENRICH.md`
- ❌ `ENRICHMENT_ENV_SETUP.md`
- ❌ `ENRICHMENT_TEST_LOG.md`
- ❌ `ENRICHMENT_SUMMARY.md`
- ❌ `ENRICHMENT_QUICK_START.md`
- ❌ `ENRICHMENT_FILES_INDEX.md`
- ❌ `ENRICHMENT_EVENTS_PATCH.md`

**Total : 14 fichiers supprimés**

## Fonctionnalités conservées

### ✅ Synchronisation Spotify
- `src/lib/spotifySync.ts` - **CONSERVÉ**
- `supabase/functions/spotify_enrich_batch/` - **CONSERVÉ**
- `supabase/functions/spotify_daily_sync/` - **CONSERVÉ**
- `src/components/artists/ArtistStatsChart.tsx` - **CONSERVÉ**
- Graphique d'évolution Spotify - **CONSERVÉ**
- Cron job quotidien (12h UTC) - **CONSERVÉ**

### ✅ Données des réseaux sociaux
- Table `social_media_data` - **CONSERVÉE**
- Affichage des icônes sur la page détail - **CONSERVÉ**
- Les données sont maintenant gérées par le backend Supabase

## Architecture actuelle

```
Frontend (go-prod-aura)
  ↓
  Lit les données depuis Supabase
  ↓
  Tables:
  - artists
  - spotify_data (sync Spotify conservée)
  - social_media_data (remplie par backend Supabase)
  - artists_enriched (remplie par backend Supabase)
  - artist_events (remplie par backend Supabase)
  - spotify_history (conservée)
```

## Où sont les données ?

| Données | Table Supabase | Gestion |
|---------|----------------|---------|
| **Spotify** | `spotify_data` | ✅ Edge Functions conservées |
| **Réseaux sociaux** | `social_media_data` | 🔵 Backend Supabase |
| **Biographies, images** | `artists_enriched` | 🔵 Backend Supabase |
| **Concerts/événements** | `artist_events` | 🔵 Backend Supabase |
| **Historique Spotify** | `spotify_history` | ✅ Cron job conservé |

## Pages impactées

### ✅ Aucune page UI modifiée
Toutes les pages continuent de fonctionner :
- `/app/artistes` - Liste des artistes
- `/app/artistes/detail/:id` - Détail artiste avec réseaux sociaux

Les pages **lisent** les données depuis `social_media_data`, qui est maintenant remplie par le backend Supabase.

## Variables d'environnement obsolètes

Ces variables peuvent être supprimées (uniquement si elles étaient pour l'enrichissement) :
- ~~`THEAUDIODB_API_KEY`~~ (si utilisée uniquement pour enrichissement)
- ~~`BANDSINTOWN_APP_ID`~~ (si utilisée uniquement pour enrichissement)
- ~~`WIKIPEDIA_LANG`~~ (si utilisée uniquement pour enrichissement)
- ~~`ENRICH_RATE_LIMIT_QPS`~~
- ~~`ENRICH_TIMEOUT_MS`~~

### ⚠️ À CONSERVER
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (pour Spotify sync)
- `VITE_SPOTIFY_CLIENT_ID`
- `VITE_SPOTIFY_CLIENT_SECRET`

## Avantages de la suppression

✅ **Code plus simple** - Moins de fichiers à maintenir
✅ **Meilleure séparation** - Backend gère l'enrichissement
✅ **Pas de duplication** - Une seule source de vérité
✅ **Performances** - Backend peut optimiser les appels API
✅ **Sécurité** - API keys restent côté backend uniquement

## Note importante

La **synchronisation Spotify** reste intacte :
- Bouton "Synchroniser Spotify" (si réactivé)
- Graphique d'évolution des followers/popularité
- Cron job quotidien à 12h UTC
- Edge Functions Spotify

Seul l'enrichissement des données externes (biographies, réseaux sociaux, concerts) est maintenant géré par le backend Supabase.

---

**Date de suppression** : 2025-10-24
**Raison** : Système d'enrichissement migré vers backend Supabase



