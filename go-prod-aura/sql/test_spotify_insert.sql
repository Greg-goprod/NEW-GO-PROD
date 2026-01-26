-- Test d'insertion manuelle de données Spotify
-- Pour diagnostiquer le problème

-- 1. Vérifier la structure de la table spotify_data
\d spotify_data;

-- 2. Insérer des données de test pour un artiste existant
-- Remplacez 'ARTIST_ID_HERE' par l'ID d'un artiste existant
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
    'ARTIST_ID_HERE', -- Remplacez par un ID d'artiste existant
    'test_spotify_id_123',
    'Test Artist Spotify',
    'https://open.spotify.com/artist/test123',
    'https://i.scdn.co/image/test_image.jpg',
    85,
    1000000,
    ARRAY['pop', 'rock'],
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

-- 3. Vérifier l'insertion
SELECT 
    a.name as artist_name,
    sd.spotify_id,
    sd.name as spotify_name,
    sd.image_url,
    sd.popularity,
    sd.followers
FROM artists a
LEFT JOIN spotify_data sd ON a.id = sd.artist_id
WHERE a.company_id = '06f6c960-3f90-41cb-b0d7-46937eaf90a8'
ORDER BY a.created_at DESC
LIMIT 5;


