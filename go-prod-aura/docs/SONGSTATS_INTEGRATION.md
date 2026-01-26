# Intégration Songstats API - Documentation

## Vue d'ensemble

L'application AURA intègre désormais l'API Songstats pour récupérer des données complètes et à jour sur les artistes, tracks, labels, playlists, diffusions radios et statistiques sociales.

## Configuration requise

### 1. Clé API nécessaire

L'API Songstats est accessible via RapidAPI. Vous n'avez besoin que d'une seule clé :

#### RapidAPI Key
1. Créez un compte sur [RapidAPI](https://rapidapi.com)
2. Souscrivez à l'API [Songstats](https://rapidapi.com/songstats/api/songstats)
3. Copiez votre clé RapidAPI
4. Ajoutez-la à votre fichier `.env` :
```env
VITE_RAPIDAPI_KEY=votre_cle_rapidapi_ici
```

**Note** : Une seule clé RapidAPI donne accès à toutes les fonctionnalités Songstats (artistes, tracks, labels, radiostats, playlists).

### 2. Configuration Supabase

Pour que l'intégration fonctionne correctement, chaque artiste doit avoir un `spotify_id` configuré dans la table `artists`.

#### Enrichir les données Spotify des artistes

Depuis la page "Artistes" de l'application, vous pouvez enrichir automatiquement les données Spotify des artistes en utilisant la fonction d'enrichissement intégrée.

Ou manuellement via SQL :
```sql
UPDATE artists 
SET spotify_data = jsonb_set(
  COALESCE(spotify_data, '{}'::jsonb), 
  '{spotify_id}', 
  '"identifiant_spotify_artiste"'
)
WHERE id = 'id_artiste';
```

## Architecture de l'intégration

### Fichiers créés

```
src/lib/songstats/
  ├── api.ts              # Service API Songstats via RapidAPI
src/pages/app/artistes/
  ├── stats.tsx           # Page principale Stats Artistes
  ├── stats-components.tsx # Composants d'affichage pour les différentes sections
```

### Structure du service API

Le fichier `src/lib/songstats/api.ts` expose une classe `SongstatsAPI` qui se connecte à l'API Songstats via RapidAPI et gère :

- **Artistes** : métadonnées, stats, historique, playlists, charts, radios, social
- **Tracks** : métadonnées, stats, historique, playlists, charts, radios, social
- **Labels** : informations, catalogue, stats, historique
- **Radiostats** : diffusions radios par station et pays
- **Playlists** : métadonnées playlists, stats avancées, top playlists, top curateurs

**Avantage** : Une seule clé RapidAPI pour toute l'API Songstats !

### Endpoints disponibles

#### Artiste
| Endpoint | Description |
|----------|-------------|
| `GET /artists/{artist_id}` | Métadonnées complètes (nom, genres, pays, labels, image, liens DSP) |
| `GET /artists/{artist_id}/catalog` | Catalogue complet des tracks |
| `GET /artists/{artist_id}/stats` | Statistiques globales récentes (followers, listeners, streams, popularité) |
| `GET /artists/{artist_id}/stats/history` | Historique temporel des métriques |
| `GET /artists/{artist_id}/playlists` | Playlists (éditoriales, algorithmiques, user-curated) |
| `GET /artists/{artist_id}/charts` | Présence dans les charts avec positions et durée |
| `GET /artists/{artist_id}/radios` | Diffusions radios (stations, pays, évolution) |
| `GET /artists/{artist_id}/social` | Données sociales détaillées par plateforme |

#### Track
| Endpoint | Description |
|----------|-------------|
| `GET /tracks/{track_id}` | Métadonnées complètes (titre, artistes, ISRC, durée, date sortie, label, liens DSP) |
| `GET /tracks/{track_id}/stats/current` | Statistiques actuelles |
| `GET /tracks/{track_id}/stats/history` | Évolution historique des streams |
| `GET /tracks/{track_id}/playlists` | Playlists contenant le track |
| `GET /tracks/{track_id}/charts` | Classements et positions dans les charts |
| `GET /tracks/{track_id}/radios` | Diffusions radios détaillées |
| `GET /tracks/{track_id}/social` | Statistiques sociales (vues vidéos, engagement) |

#### Label
| Endpoint | Description |
|----------|-------------|
| `GET /labels/{label_id}` | Informations et métadonnées |
| `GET /labels/{label_id}/catalog` | Catalogue complet des sorties |
| `GET /labels/{label_id}/stats` | Statistiques globales |
| `GET /labels/{label_id}/stats/history` | Historique des performances |

#### Radiostats
| Endpoint | Description |
|----------|-------------|
| `GET /radiostats/{entity_id}` | Nombre total de diffusions |
| `GET /radiostats/{entity_id}/stations` | Liste des stations et marchés |
| `GET /radiostats/plays` | Liste détaillée des diffusions avec timestamp |

#### Playlistcheck (RapidAPI)
| Endpoint | Description |
|----------|-------------|
| `GET /playlists/{playlist_id}` | Métadonnées détaillées |
| `GET /playlists/{playlist_id}/stats` | Statistiques avancées |
| `GET /playlists/top` | Liste des playlists principales par territoire |
| `GET /curators/top` | Liste des meilleurs curateurs |

## Utilisation dans l'application

### Page Stats Artistes

La page "Stats artistes" (`/app/artistes/stats`) permet de :

1. **Rechercher un artiste** via la barre de recherche ou le dropdown
2. **Visualiser automatiquement** :
   - Profil complet (image, genres, pays, labels, liens DSP)
   - Statistiques globales (followers, monthly listeners, engagement par plateforme)
   - Graphiques d'évolution historique
   - Playlists (éditoriales, algorithmiques, user-curated)
   - Classements dans les charts par pays
   - Diffusions radios par station et pays
   - Statistiques détaillées des réseaux sociaux
   - Catalogue de morceaux

### Exemple d'utilisation du service API

```typescript
import { songstatsApi } from '@/lib/songstats/api';

// Récupérer toutes les données d'un artiste en un seul appel
const artistData = await songstatsApi.getArtistFullData('spotify_artist_id');

// Accéder aux différentes sections
console.log(artistData.metadata); // Infos de base
console.log(artistData.stats); // Stats actuelles
console.log(artistData.history); // Historique
console.log(artistData.playlists); // Playlists
console.log(artistData.charts); // Charts
console.log(artistData.radios); // Radios
console.log(artistData.social); // Social media
console.log(artistData.catalog); // Catalogue

// Les erreurs sont capturées par section
console.log(artistData.errors); // { metadata: null, stats: "Error message", ... }
```

### Appels API individuels

```typescript
import { songstatsApi } from '@/lib/songstats/api';

// Récupérer uniquement les métadonnées
const metadata = await songstatsApi.getArtistMetadata('spotify_artist_id');

// Récupérer uniquement les stats
const stats = await songstatsApi.getArtistStats('spotify_artist_id');

// Récupérer l'historique avec filtres
const history = await songstatsApi.getArtistStatsHistory(
  'spotify_artist_id',
  '2024-01-01', // startDate
  '2024-12-31', // endDate
  ['followers', 'monthly_listeners'] // metrics
);

// Récupérer les playlists
const playlists = await songstatsApi.getArtistPlaylists('spotify_artist_id');
```

## Affichage des données

### Containers créés

La page Stats Artistes organise les données dans des containers visuels distincts :

1. **ArtistProfile** : Photo, nom, genres, pays, labels, liens DSP
2. **GlobalStats** : KPIs (followers, listeners, popularity, engagement)
3. **EvolutionCharts** : Graphiques temporels interactifs
4. **PlaylistsSection** : Playlists par type (éditoriales, algorithmiques, user-curated)
5. **ChartsSection** : Classements par pays avec positions et durées
6. **RadioSection** : Top radios et diffusions par pays
7. **SocialMediaSection** : Stats détaillées par plateforme sociale
8. **CatalogSection** : Liste des morceaux avec popularité

### Graphiques et visualisations

L'intégration utilise **Chart.js** et **react-chartjs-2** pour :

- **Courbes** : Évolution temporelle des followers, listeners, streams
- **Barres horizontales** : Top radios par nombre de diffusions
- **Camemberts** : Répartition géographique de l'audience

## Gestion des erreurs

Le service API gère les erreurs de manière gracieuse :

- **Appel global** (`getArtistFullData`) : Récupère toutes les données disponibles, capture les erreurs par section
- **Affichage** : Les sections sans données ne s'affichent pas (condition `length > 0`)
- **Feedback utilisateur** : Loading spinners, messages d'erreur clairs

## Performance et optimisation

- **Parallélisation** : `getArtistFullData` utilise `Promise.allSettled` pour appeler tous les endpoints en parallèle
- **Caching** : À implémenter selon les besoins (localStorage, React Query, etc.)
- **Rate limiting** : Respecter les limites de l'API Songstats (vérifier la documentation officielle)

## Prochaines étapes

### Améliorations suggérées

1. **Caching des données** : Implémenter un système de cache pour éviter les appels API répétés
2. **Pagination** : Ajouter la pagination pour les listes longues (playlists, catalogue)
3. **Export des données** : Permettre l'export en CSV/PDF des statistiques
4. **Comparaison d'artistes** : Comparer les stats de plusieurs artistes côte à côte
5. **Alertes** : Notifications quand un artiste entre dans un chart ou une playlist importante
6. **Historique automatique** : Stocker l'historique des stats dans Supabase pour analyse long terme

### Extension aux tracks

Créer une page similaire pour les tracks :
- `/app/tracks/stats`
- Utiliser les endpoints tracks de l'API
- Afficher les mêmes types de données mais au niveau du morceau

### Extension aux labels

Créer une section labels :
- `/app/labels/stats`
- Utiliser les endpoints labels de l'API
- Vue d'ensemble du catalogue et des performances

## Support

Pour toute question ou problème :
- Documentation officielle Songstats : https://docs.songstats.com
- Documentation RapidAPI : https://rapidapi.com/docs
- GitHub Issues du projet AURA

## Changelog

### Version 1.0.0 (2025-11-25)
- Intégration initiale de l'API Songstats
- Page Stats Artistes avec tous les containers
- Service API complet avec parallélisation
- Composants de visualisation (graphiques, charts, tables)
- Gestion gracieuse des erreurs
- Documentation complète

