-- Test d'insertion manuelle des données Spotify pour James Blunt
-- ID de l'artiste: 0df832b8-756c-41ff-b247-68d529ed08c5

-- 1. Vérifier que l'artiste existe
SELECT id, name, company_id, created_at
FROM artists 
WHERE id = '0df832b8-756c-41ff-b247-68d529ed08c5';

-- 2. Vérifier s'il a déjà des données Spotify
SELECT * FROM spotify_data 
WHERE artist_id = '0df832b8-756c-41ff-b247-68d529ed08c5';

-- 3. Insérer des données Spotify de test pour James Blunt
INSERT INTO spotify_data (
    artist_id,
    spotify_id,
    name,
    external_url,
    image_url,
    popularity,
    followers,
    genres,
    updated_at
) VALUES (
    '0df832b8-756c-41ff-b247-68d529ed08c5',
    'spotify_james_blunt_test',
    'James Blunt',
    'https://open.spotify.com/artist/4GNN9dgX481dGqtOwEvQ3n',
    'https://i.scdn.co/image/ab6761610000e5ebc8a444e2ef04c22d6fcc7e45',
    75,
    2500000,
    ARRAY['pop', 'singer-songwriter'],
    NOW()
) ON CONFLICT (artist_id) DO UPDATE SET
    spotify_id = EXCLUDED.spotify_id,
    name = EXCLUDED.name,
    external_url = EXCLUDED.external_url,
    image_url = EXCLUDED.image_url,
    popularity = EXCLUDED.popularity,
    followers = EXCLUDED.followers,
    genres = EXCLUDED.genres,
    updated_at = EXCLUDED.updated_at;

-- 4. Vérifier l'insertion
SELECT 
    a.name as artist_name,
    sd.spotify_id,
    sd.name as spotify_name,
    sd.external_url,
    sd.image_url,
    sd.popularity,
    sd.followers,
    sd.genres
FROM artists a
LEFT JOIN spotify_data sd ON a.id = sd.artist_id
WHERE a.id = '0df832b8-756c-41ff-b247-68d529ed08c5';

-- 5. Tester la requête utilisée par l'application
SELECT 
    a.*,
    sd.*
FROM artists a
LEFT JOIN spotify_data sd ON a.id = sd.artist_id
WHERE a.company_id = '06f6c960-3f90-41cb-b0d7-46937eaf90a8'
ORDER BY a.created_at DESC
LIMIT 5;


