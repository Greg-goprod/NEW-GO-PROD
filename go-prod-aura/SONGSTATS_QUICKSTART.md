# Songstats API - Guide de démarrage rapide

## 🚀 Configuration en 3 étapes

### 1. Obtenir votre clé RapidAPI

L'API Songstats est accessible via RapidAPI. Vous n'avez besoin que d'une seule clé :

1. Créez un compte sur [RapidAPI](https://rapidapi.com)
2. Souscrivez à l'API [Songstats](https://rapidapi.com/songstats/api/songstats) sur RapidAPI
3. Copiez votre clé RapidAPI

### 2. Configurer la variable d'environnement

Ajoutez à votre fichier `.env` :

```env
VITE_RAPIDAPI_KEY=votre_cle_rapidapi_ici
```

**C'est tout !** Une seule clé pour accéder à toutes les fonctionnalités Songstats.

### 3. Enrichir les données Spotify des artistes

Chaque artiste doit avoir un `spotify_id` dans la table `artists`.

#### Option A : Via l'interface AURA
1. Accédez à `/app/artistes`
2. Cliquez sur un artiste
3. Utilisez la fonction "Enrichir données Spotify"

#### Option B : SQL manuel
```sql
UPDATE artists 
SET spotify_data = jsonb_set(
  COALESCE(spotify_data, '{}'::jsonb), 
  '{spotify_id}', 
  '"3Isy6kedDrgPYoTS1dazA9"'  -- ID Spotify de l'artiste
)
WHERE name = 'Clara Luciani';
```

## 📊 Accéder aux Stats Artistes

1. Naviguez vers `/app/artistes/stats`
2. Cherchez ou sélectionnez un artiste
3. Visualisez toutes les données Songstats !

## 🔍 Trouver un Spotify ID

### Méthode 1 : Via l'URL Spotify
```
https://open.spotify.com/artist/3Isy6kedDrgPYoTS1dazA9
                                ↑
                            Spotify ID
```

### Méthode 2 : API Spotify
```bash
curl "https://api.spotify.com/v1/search?q=Clara%20Luciani&type=artist" \
  -H "Authorization: Bearer YOUR_SPOTIFY_TOKEN"
```

### Méthode 3 : Extension Chrome
Installez "Spotify ID Finder" depuis le Chrome Web Store

## ✅ Vérifier que tout fonctionne

1. **Test connexion API** :
```typescript
import { songstatsApi } from '@/lib/songstats/api';

// Test avec Clara Luciani (Spotify ID: 3Isy6kedDrgPYoTS1dazA9)
const data = await songstatsApi.getArtistFullData('3Isy6kedDrgPYoTS1dazA9');
console.log(data);
```

2. **Via l'interface** :
   - Allez sur `/app/artistes/stats`
   - Sélectionnez "Clara Luciani"
   - Vous devriez voir : profil, stats, playlists, charts, radios, social

## 📝 Données affichées

✅ **Profil artiste** : Image, genres, pays, labels, liens DSP  
✅ **Stats globales** : Followers Spotify/Instagram/TikTok/YouTube, monthly listeners  
✅ **Graphiques évolution** : Historique temporel des métriques  
✅ **Playlists** : Éditoriales, algorithmiques, user-curated  
✅ **Charts** : Positions par pays  
✅ **Radios** : Diffusions par station et pays  
✅ **Social** : Stats détaillées par plateforme  
✅ **Catalogue** : Liste des morceaux  

## ⚠️ Problèmes courants

### "Cet artiste n'a pas de Spotify ID configuré"
→ Ajoutez le `spotify_id` dans la table `artists` (voir étape 3)

### "Failed to fetch artist full data"
→ Vérifiez que votre clé RapidAPI est correcte dans `.env`
→ Vérifiez que vous avez bien souscrit à l'API Songstats sur RapidAPI

### "Certaines données n'ont pas pu être chargées"
→ Normal, certains endpoints peuvent ne pas avoir de données pour tous les artistes

### Aucune donnée affichée
→ L'artiste n'a peut-être pas de données sur Songstats  
→ Vérifiez que le Spotify ID est correct

## 📖 Documentation complète

Pour plus de détails, consultez :
- `docs/RAPIDAPI_SETUP.md` - Guide détaillé de configuration RapidAPI
- `docs/SONGSTATS_INTEGRATION.md` - Documentation technique complète
- Code source : `src/lib/songstats/api.ts`
- RapidAPI Songstats : https://rapidapi.com/songstats/api/songstats

## 🎯 Exemples d'artistes avec données riches

```typescript
// Artistes français populaires avec beaucoup de données
const artistsToTest = [
  { name: 'Clara Luciani', spotifyId: '3Isy6kedDrgPYoTS1dazA9' },
  { name: 'Angèle', spotifyId: '4WM8JHkEZmWfFLCzibWkA1' },
  { name: 'Julien Doré', spotifyId: '6qWbt0ZCuJgqkQW7PNK1bC' },
  { name: 'Stromae', spotifyId: '1Y7jsXvMaWkWJZhANEdx9x' },
  { name: 'Soprano', spotifyId: '3z5smdEyLqvPMdwJaZYvZi' },
];
```

## 🚀 C'est parti !

Vous êtes maintenant prêt à utiliser l'intégration Songstats dans AURA !

