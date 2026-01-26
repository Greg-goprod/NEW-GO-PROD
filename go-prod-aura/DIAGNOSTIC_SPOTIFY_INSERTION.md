# 🔍 Diagnostic : Données Spotify Non Insérées

## Problème Identifié
- ✅ L'artiste est créé dans la table `artists`
- ❌ Aucune donnée n'est insérée dans la table `spotify_data`
- ❌ L'artiste n'est pas synchronisé avec Spotify

## Causes Possibles

### 1. Artiste Spotify Non Sélectionné
- **Symptôme** : `selectedSpotifyArtist` est `null` ou `undefined`
- **Solution** : Vérifier que l'utilisateur a bien sélectionné un artiste dans le popup Spotify

### 2. Erreur d'Insertion Silencieuse
- **Symptôme** : L'insertion échoue sans erreur visible
- **Solution** : Vérifier les logs détaillés et la structure de la table

### 3. Problème de Structure de Table
- **Symptôme** : La table `spotify_data` n'existe pas ou a une structure incorrecte
- **Solution** : Vérifier la structure de la table

## Étapes de Diagnostic

### 1. Vérifier les Logs de la Console
1. Ouvrez la console (F12)
2. Ajoutez un nouvel artiste avec des données Spotify
3. Regardez les logs :
   - `🔍 selectedSpotifyArtist:` - L'artiste est-il sélectionné ?
   - `🔍 artistData?.id:` - L'ID de l'artiste est-il présent ?
   - `🎵 Insertion des données Spotify...` - Cette ligne apparaît-elle ?

### 2. Utiliser le Script SQL de Test
Exécutez `sql/test_spotify_insert_manual.sql` dans Supabase :
1. Vérifiez que la table `spotify_data` existe
2. Vérifiez la structure de la table
3. Testez une insertion manuelle

### 3. Vérifier la Sélection d'Artiste
1. Dans le modal d'ajout, cliquez sur "Rechercher sur Spotify"
2. Sélectionnez un artiste dans le popup
3. Vérifiez que l'artiste apparaît comme sélectionné dans le modal

## Solutions

### Si l'artiste Spotify n'est pas sélectionné :
1. Vérifier que le popup Spotify s'ouvre
2. Vérifier que la sélection fonctionne
3. Vérifier que l'artiste apparaît comme sélectionné

### Si l'insertion échoue :
1. Vérifier la structure de la table `spotify_data`
2. Vérifier les contraintes de clé étrangère
3. Vérifier les logs d'erreur détaillés

### Si la table n'existe pas :
1. Créer la table `spotify_data`
2. Vérifier les permissions
3. Vérifier la connexion à la base

## Logs à Surveiller

### Ajout d'Artiste
- `🚀 Début de l'ajout d'artiste`
- `📝 Données: selectedSpotifyArtist: true/false`
- `🔍 selectedSpotifyArtist: true/false`
- `🎵 Insertion des données Spotify...`
- `✅ Données Spotify insérées avec succès`

### Erreurs Possibles
- `❌ Erreur lors de l'insertion des données Spotify`
- `⚠️ Aucun artiste Spotify sélectionné`

## Prochaines Étapes
1. Exécutez le diagnostic avec les logs détaillés
2. Vérifiez la structure de la table `spotify_data`
3. Testez une insertion manuelle
4. Identifiez la cause exacte du problème


