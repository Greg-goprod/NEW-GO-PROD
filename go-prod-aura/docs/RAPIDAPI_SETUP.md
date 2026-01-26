# Configuration RapidAPI pour Songstats

## 🔑 Obtenir votre clé RapidAPI en 5 minutes

### Étape 1 : Créer un compte RapidAPI

1. Allez sur [rapidapi.com](https://rapidapi.com)
2. Cliquez sur "Sign Up" (Inscription)
3. Créez votre compte (email, Google ou GitHub)
4. Confirmez votre email

### Étape 2 : S'abonner à l'API Songstats

1. Recherchez "Songstats" dans la barre de recherche RapidAPI
2. Cliquez sur l'API **"Songstats API"** (par Songstats)
3. Vous arriverez sur la page : `https://rapidapi.com/songstats/api/songstats`

### Étape 3 : Choisir un plan

RapidAPI propose généralement plusieurs plans :

- **Basic / Free** : Pour tester (limité en nombre de requêtes)
- **Pro** : Pour un usage régulier
- **Ultra / Mega** : Pour un usage intensif

**Recommandation** : Commencez par le plan Basic/Free pour tester, puis passez à un plan payant selon vos besoins.

### Étape 4 : S'abonner (Subscribe)

1. Cliquez sur le bouton **"Subscribe to Test"** ou **"Pricing"**
2. Sélectionnez le plan qui vous convient
3. Entrez vos informations de paiement (même pour le plan gratuit)
4. Confirmez l'abonnement

### Étape 5 : Récupérer votre clé API

Une fois abonné :

1. Restez sur la page de l'API Songstats
2. Allez dans l'onglet **"Endpoints"** ou **"Code Snippets"**
3. Vous verrez un en-tête de requête avec :
   ```
   X-RapidAPI-Key: VOTRE_CLE_ICI_xxxxxxxxxxxxxxxxxxxxx
   X-RapidAPI-Host: songstats.p.rapidapi.com
   ```
4. Copiez la valeur de `X-RapidAPI-Key`

### Étape 6 : Configurer dans AURA

1. Ouvrez votre fichier `.env` à la racine du projet
2. Ajoutez ou modifiez la ligne :
   ```env
   VITE_RAPIDAPI_KEY=VOTRE_CLE_COPIEE_ICI
   ```
3. Sauvegardez le fichier
4. **Redémarrez le serveur de développement** :
   ```bash
   # Arrêtez le serveur (Ctrl+C)
   # Puis relancez
   npm run dev
   ```

## ✅ Vérifier que ça fonctionne

### Test 1 : Console du navigateur

1. Ouvrez votre application AURA
2. Allez sur `/app/artistes/stats`
3. Ouvrez la console du navigateur (F12)
4. Sélectionnez un artiste
5. Vous devriez voir les appels API réussir (pas d'erreur 401 ou 403)

### Test 2 : Test direct avec curl

```bash
curl --request GET \
  --url 'https://songstats.p.rapidapi.com/v1/artists/3Isy6kedDrgPYoTS1dazA9' \
  --header 'X-RapidAPI-Host: songstats.p.rapidapi.com' \
  --header 'X-RapidAPI-Key: VOTRE_CLE_ICI'
```

Si ça fonctionne, vous obtiendrez les données de Clara Luciani !

## 🔍 Endpoints disponibles sur RapidAPI

Tous ces endpoints sont accessibles via votre clé RapidAPI :

### Artistes
- `GET /v1/artists/{artist_id}`
- `GET /v1/artists/{artist_id}/catalog`
- `GET /v1/artists/{artist_id}/stats`
- `GET /v1/artists/{artist_id}/stats/history`
- `GET /v1/artists/{artist_id}/playlists`
- `GET /v1/artists/{artist_id}/charts`
- `GET /v1/artists/{artist_id}/radios`
- `GET /v1/artists/{artist_id}/social`

### Tracks
- `GET /v1/tracks/{track_id}`
- `GET /v1/tracks/{track_id}/stats/current`
- `GET /v1/tracks/{track_id}/stats/history`
- `GET /v1/tracks/{track_id}/playlists`
- `GET /v1/tracks/{track_id}/charts`
- `GET /v1/tracks/{track_id}/radios`
- `GET /v1/tracks/{track_id}/social`

### Labels
- `GET /v1/labels/{label_id}`
- `GET /v1/labels/{label_id}/catalog`
- `GET /v1/labels/{label_id}/stats`
- `GET /v1/labels/{label_id}/stats/history`

### Radiostats
- `GET /v1/radiostats/{entity_id}`
- `GET /v1/radiostats/{entity_id}/stations`

### Playlists
- `GET /v1/playlists/{playlist_id}`
- `GET /v1/playlists/{playlist_id}/stats`
- `GET /v1/playlists/top`

## ⚠️ Limites et quotas

RapidAPI impose des limites selon votre plan :

- **Requêtes par mois** : Varie selon le plan
- **Requêtes par seconde** : Pour éviter le rate limiting
- **Coût par requête** : Certains plans sont à l'usage

### Voir votre consommation

1. Allez sur [rapidapi.com/developer/dashboard](https://rapidapi.com/developer/dashboard)
2. Cliquez sur "My Apps"
3. Sélectionnez votre application
4. Vous verrez le nombre de requêtes consommées

## 💡 Bonnes pratiques

### 1. Caching
Implémentez un système de cache pour éviter les appels répétés :
```typescript
// Exemple : cache local storage
const cacheKey = `songstats_artist_${artistId}`;
const cached = localStorage.getItem(cacheKey);
if (cached) {
  const { data, timestamp } = JSON.parse(cached);
  if (Date.now() - timestamp < 3600000) { // 1 heure
    return data;
  }
}
```

### 2. Gestion des erreurs
L'API retourne des codes d'erreur clairs :
- **401** : Clé API invalide
- **403** : Accès refusé (quota dépassé ou plan insuffisant)
- **404** : Ressource non trouvée
- **429** : Trop de requêtes (rate limiting)

### 3. Optimisation
Utilisez `getArtistFullData()` qui fait tous les appels en parallèle :
```typescript
const data = await songstatsApi.getArtistFullData(spotifyId);
// Récupère tout en une seule fois !
```

## 🆘 Problèmes courants

### Erreur 401 "Unauthorized"
→ Votre clé API est incorrecte ou mal configurée
→ Vérifiez le `.env` et redémarrez le serveur

### Erreur 403 "Forbidden"
→ Vous avez dépassé votre quota mensuel
→ Passez à un plan supérieur sur RapidAPI

### Erreur 429 "Too Many Requests"
→ Vous envoyez trop de requêtes trop rapidement
→ Implémentez un système de rate limiting côté client

### Données manquantes pour un artiste
→ L'artiste n'a peut-être pas de données Songstats
→ Vérifiez que le Spotify ID est correct
→ Certains artistes ont des données limitées

## 📞 Support

- **Documentation RapidAPI** : [rapidapi.com/docs](https://docs.rapidapi.com)
- **Support RapidAPI** : Bouton "Contact" sur la page de l'API
- **Documentation Songstats** : [docs.songstats.com](https://docs.songstats.com)

## 🎯 Prêt !

Vous êtes maintenant configuré pour utiliser l'API Songstats via RapidAPI dans AURA ! 🚀

Allez sur `/app/artistes/stats` et testez avec Clara Luciani ou un autre artiste.





