# Configuration Spotify API

## 🎯 **Configuration requise pour la recherche Spotify**

### **1. Créer une application Spotify**

1. Aller sur [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Se connecter avec votre compte Spotify
3. Cliquer sur "Create App"
4. Remplir les informations :
   - **App name** : Go-Prod-AURA
   - **App description** : Application de gestion d'artistes
   - **Website** : `http://localhost:3000` (pour le développement)
   - **Redirect URI** : `http://localhost:3000/callback` (optionnel)

### **2. Récupérer les identifiants**

1. Dans votre application, aller dans "Settings"
2. Copier :
   - **Client ID**
   - **Client Secret**

### **3. Configurer les variables d'environnement**

Créer un fichier `.env.local` à la racine du projet :

```env
# Spotify API Configuration
SPOTIFY_CLIENT_ID=your_spotify_client_id_here
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret_here

# Supabase Configuration (si pas déjà configuré)
VITE_SUPABASE_URL=your_supabase_url_here
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

### **4. Redémarrer le serveur de développement**

```bash
npm run dev
```

## 🔧 **Fonctionnalités disponibles**

### **Recherche d'artistes**
- Recherche par nom d'artiste
- Affichage de 8 résultats maximum
- Informations : nom, image, followers, popularité, genres
- Lien direct vers la page Spotify

### **Enrichissement automatique**
- Sélection d'un artiste Spotify
- Auto-remplissage des données
- Insertion dans `artists` et `spotify_data`
- Gestion des erreurs

## 🚨 **Limitations Spotify API**

### **Rate Limits**
- **Client Credentials Flow** : 10,000 requêtes/heure
- **Recherche** : 1,000 requêtes/heure par utilisateur

### **Données disponibles**
- ✅ Nom, image, followers, popularité
- ✅ Genres, lien Spotify
- ❌ Albums, tracks (nécessite authentification utilisateur)

## 🛠 **Dépannage**

### **Erreur "Failed to get Spotify access token"**
- Vérifier les variables d'environnement
- Vérifier que l'application Spotify est active
- Vérifier les identifiants Client ID/Secret

### **Erreur "Failed to search Spotify"**
- Vérifier la connexion internet
- Vérifier que l'API Spotify est accessible
- Vérifier les rate limits

### **Aucun résultat trouvé**
- Essayer avec un nom plus simple
- Vérifier l'orthographe
- Essayer avec le nom complet de l'artiste

## 📚 **Documentation Spotify API**

- [Spotify Web API Reference](https://developer.spotify.com/documentation/web-api/)
- [Authentication Guide](https://developer.spotify.com/documentation/general/guides/authorization/)
- [Search API](https://developer.spotify.com/documentation/web-api/reference/search)

## 🎯 **Prochaines étapes**

1. **Configuration** : Ajouter les variables d'environnement
2. **Test** : Tester la recherche d'artistes
3. **Optimisation** : Ajouter la mise en cache des résultats
4. **Fonctionnalités** : Ajouter la recherche d'albums/tracks


