# Guide : Ajouter un Spotify ID à un artiste

## 🎯 Problème

Le message "Aucune statistique disponible" apparaît car l'artiste n'a pas de `spotify_id` configuré dans votre base de données. L'API Songstats utilise le Spotify ID pour récupérer les données.

## ✅ Solution en 3 étapes

### Étape 1 : Trouver le Spotify ID

1. Allez sur [Spotify Web Player](https://open.spotify.com)
2. Cherchez l'artiste (exemple : "Bigflo & Oli")
3. Cliquez sur l'artiste dans les résultats
4. Copiez l'URL qui ressemble à : `https://open.spotify.com/artist/4xRMa17WGRdHSHzCKaIhgq`
5. Le Spotify ID est la dernière partie : `4xRMa17WGRdHSHzCKaIhgq`

**Exemples d'artistes français populaires** :

| Artiste | Spotify ID | URL |
|---------|------------|-----|
| Bigflo & Oli | `4xRMa17WGRdHSHzCKaIhgq` | https://open.spotify.com/artist/4xRMa17WGRdHSHzCKaIhgq |
| Clara Luciani | `3Isy6kedDrgPYoTS1dazA9` | https://open.spotify.com/artist/3Isy6kedDrgPYoTS1dazA9 |
| Angèle | `4WM8JHkEZmWfFLCzibWkA1` | https://open.spotify.com/artist/4WM8JHkEZmWfFLCzibWkA1 |
| Julien Doré | `6qWbt0ZCuJgqkQW7PNK1bC` | https://open.spotify.com/artist/6qWbt0ZCuJgqkQW7PNK1bC |
| Soprano | `3z5smdEyLqvPMdwJaZYvZi` | https://open.spotify.com/artist/3z5smdEyLqvPMdwJaZYvZi |

### Étape 2 : Ajouter le Spotify ID dans Supabase

#### Option A : Via le SQL Editor de Supabase (recommandé)

1. Allez sur [Supabase Dashboard](https://supabase.com/dashboard)
2. Sélectionnez votre projet
3. Cliquez sur "SQL Editor" dans la sidebar
4. Collez cette requête en remplaçant les valeurs :

```sql
-- Pour Bigflo & Oli
-- D'abord, récupérer l'artist_id et company_id
WITH artist_info AS (
  SELECT id as artist_id, company_id 
  FROM artists 
  WHERE name = 'BIGFLO & OLI'
  LIMIT 1
)
INSERT INTO artist_links_songstats (
  artist_id, 
  company_id, 
  source, 
  external_id, 
  url
)
SELECT 
  artist_id,
  company_id,
  'spotify',
  '4xRMa17WGRdHSHzCKaIhgq',
  'https://open.spotify.com/artist/4xRMa17WGRdHSHzCKaIhgq'
FROM artist_info
ON CONFLICT (artist_id, source) 
DO UPDATE SET 
  external_id = EXCLUDED.external_id,
  url = EXCLUDED.url,
  updated_at = NOW();
```

5. Cliquez sur "Run" (ou Ctrl+Enter)
6. Vérifiez que "Success. 1 row(s) affected." apparaît

#### Option B : Via Table Editor

1. Allez sur [Supabase Dashboard](https://supabase.com/dashboard)
2. Cliquez sur "Table Editor" > "artist_links_songstats"
3. Cliquez sur "+ Insert row"
4. Remplissez :
   - `artist_id` : (Copiez l'ID de l'artiste depuis la table artists)
   - `company_id` : (Copiez votre company_id)
   - `source` : `spotify`
   - `external_id` : `4xRMa17WGRdHSHzCKaIhgq`
   - `url` : `https://open.spotify.com/artist/4xRMa17WGRdHSHzCKaIhgq`
5. Cliquez sur "Save"

### Étape 3 : Tester dans AURA

1. Retournez sur `/app/artistes/stats`
2. Sélectionnez "Bigflo & Oli" dans le dropdown
3. Les données Songstats devraient s'afficher ! 🎉

## 📝 Script SQL pour plusieurs artistes

Si vous voulez ajouter plusieurs Spotify IDs en une fois :

```sql
-- Ajouter plusieurs artistes avec leurs Spotify IDs
DO $$ 
DECLARE
  artist_data RECORD;
  artists_to_update TEXT[][] := ARRAY[
    ['BIGFLO & OLI', '4xRMa17WGRdHSHzCKaIhgq'],
    ['CLARA LUCIANI', '3Isy6kedDrgPYoTS1dazA9'],
    ['ANGÈLE', '4WM8JHkEZmWfFLCzibWkA1'],
    ['JULIEN DORÉ', '6qWbt0ZCuJgqkQW7PNK1bC'],
    ['SOPRANO', '3z5smdEyLqvPMdwJaZYvZi']
  ];
BEGIN
  FOR i IN 1..array_length(artists_to_update, 1) LOOP
    -- Récupérer l'artist_id et company_id
    SELECT id, company_id INTO artist_data
    FROM artists
    WHERE name = artists_to_update[i][1]
    LIMIT 1;
    
    IF FOUND THEN
      -- Insérer ou mettre à jour le lien Spotify
      INSERT INTO artist_links_songstats (artist_id, company_id, source, external_id, url)
      VALUES (
        artist_data.id,
        artist_data.company_id,
        'spotify',
        artists_to_update[i][2],
        'https://open.spotify.com/artist/' || artists_to_update[i][2]
      )
      ON CONFLICT (artist_id, source) DO UPDATE SET 
        external_id = EXCLUDED.external_id,
        url = EXCLUDED.url,
        updated_at = NOW();
        
      RAISE NOTICE 'Updated: %', artists_to_update[i][1];
    ELSE
      RAISE NOTICE 'Artist not found: %', artists_to_update[i][1];
    END IF;
  END LOOP;
END $$;
```

## 🔍 Vérifier qu'un artiste a un Spotify ID

Pour voir quels artistes ont déjà un Spotify ID :

```sql
SELECT 
  a.name,
  als.external_id as spotify_id,
  als.url as spotify_url,
  CASE 
    WHEN als.external_id IS NOT NULL 
    THEN '✅ Configuré' 
    ELSE '❌ Manquant' 
  END as status
FROM artists a
LEFT JOIN artist_links_songstats als 
  ON a.id = als.artist_id AND als.source = 'spotify'
ORDER BY a.name;
```

## ⚠️ Important

- Le `spotify_id` est **obligatoire** pour utiliser l'API Songstats
- Sans Spotify ID, l'application ne peut pas récupérer les données
- Utilisez le **nom exact** de l'artiste dans la requête SQL
- Le Spotify ID est sensible à la casse (majuscules/minuscules)

## 🚀 Automatisation future

Pour éviter de faire ça manuellement, vous pourriez :

1. Créer un bouton "Enrichir Spotify" dans l'interface artiste
2. Utiliser l'API Spotify Search pour trouver automatiquement l'ID
3. Pré-remplir les Spotify IDs lors de l'import d'artistes

## 💡 Astuce

Gardez une liste des Spotify IDs dans un fichier Excel/Sheets pour référence :

| Nom Artiste | Spotify ID | Date Ajout |
|-------------|------------|------------|
| Bigflo & Oli | 4xRMa17WGRdHSHzCKaIhgq | 2025-11-25 |
| Clara Luciani | 3Isy6kedDrgPYoTS1dazA9 | 2025-11-25 |
| ... | ... | ... |

