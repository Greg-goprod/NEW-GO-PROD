# 🔍 Diagnostic des Données Spotify

## Problème Identifié
Les artistes sont bien ajoutés à la base de données, mais leurs données Spotify ne s'affichent pas (pas d'image, pas de données Spotify).

## Étapes de Diagnostic

### 1. Vérifier les Logs de la Console
1. Ouvrez la console du navigateur (F12)
2. Ajoutez un nouvel artiste avec des données Spotify
3. Regardez les logs pour voir :
   - `🎵 Artiste sélectionné:` - L'artiste Spotify est-il bien sélectionné ?
   - `📊 Payload Spotify:` - Les données sont-elles correctes ?
   - `✅ Données Spotify insérées avec succès:` - L'insertion a-t-elle réussi ?

### 2. Utiliser le Bouton Diagnostic
1. Dans le modal d'ajout d'artiste, cliquez sur "Diagnostic"
2. Regardez les logs pour voir :
   - `🎵 === DIAGNOSTIC SPOTIFY ===`
   - `✅ Artistes récupérés:` - Les artistes sont-ils récupérés ?
   - `🎤 [Nom]:` - Chaque artiste a-t-il des données Spotify ?

### 3. Vérifier la Base de Données
Exécutez le script SQL `sql/diagnostic_spotify_data.sql` dans Supabase :

```sql
-- Vérifier les artistes et leurs données Spotify
SELECT 
    a.id,
    a.name,
    a.company_id,
    a.created_at,
    sd.spotify_id,
    sd.name as spotify_name,
    sd.image_url,
    sd.popularity,
    sd.followers
FROM artists a
LEFT JOIN spotify_data sd ON a.id = sd.artist_id
WHERE a.company_id = '06f6c960-3f90-41cb-b0d7-46937eaf90a8'
ORDER BY a.created_at DESC
LIMIT 10;
```

### 4. Causes Possibles

#### A. Données Spotify non insérées
- **Symptôme** : `selectedSpotifyArtist` est `null` ou `undefined`
- **Solution** : Vérifier que l'artiste Spotify est bien sélectionné dans le popup

#### B. Erreur lors de l'insertion
- **Symptôme** : Erreur dans les logs `❌ Erreur lors de l'insertion des données Spotify`
- **Solution** : Vérifier la structure de la table `spotify_data`

#### C. Relation mal configurée
- **Symptôme** : Données insérées mais pas récupérées
- **Solution** : Vérifier la clé étrangère `artist_id`

#### D. Problème de requête
- **Symptôme** : Données en base mais pas affichées
- **Solution** : Vérifier la requête `spotify_data(*)`

## Solutions

### Si les données ne sont pas insérées :
1. Vérifier que l'artiste Spotify est sélectionné
2. Vérifier les logs d'erreur
3. Vérifier la structure de la table `spotify_data`

### Si les données sont insérées mais pas affichées :
1. Vérifier la requête de récupération
2. Vérifier la relation entre les tables
3. Vérifier les logs de récupération

### Test Manuel
Utilisez le script `sql/test_spotify_insert.sql` pour insérer manuellement des données de test.

## Logs à Surveiller

### Ajout d'Artiste
- `🚀 Début de l'ajout d'artiste`
- `✅ Artiste inséré avec succès`
- `🎵 Insertion des données Spotify...`
- `✅ Données Spotify insérées avec succès`

### Diagnostic
- `🎵 === DIAGNOSTIC SPOTIFY ===`
- `✅ Artistes récupérés`
- `🎤 [Nom]: hasSpotifyData: true/false`

## Prochaines Étapes
1. Exécutez le diagnostic
2. Partagez les logs de la console
3. Exécutez le script SQL de diagnostic
4. Identifiez la cause exacte du problème


