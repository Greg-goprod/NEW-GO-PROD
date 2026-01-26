-- Vérification des données Spotify dans la base
-- Exécuter ce script dans Supabase SQL Editor

-- 1. Vérifier les artistes récents avec leurs données Spotify
SELECT 
    a.id as artist_id,
    a.name as artist_name,
    a.company_id,
    a.created_at as artist_created,
    sd.spotify_id,
    sd.name as spotify_name,
    sd.external_url,
    sd.image_url,
    sd.popularity,
    sd.followers,
    sd.genres,
    sd.updated_at as spotify_updated
FROM artists a
LEFT JOIN spotify_data sd ON a.id = sd.artist_id
WHERE a.company_id = '06f6c960-3f90-41cb-b0d7-46937eaf90a8'
ORDER BY a.created_at DESC
LIMIT 10;

-- 2. Compter les artistes avec et sans données Spotify
SELECT 
    COUNT(*) as total_artists,
    COUNT(sd.artist_id) as artists_with_spotify,
    COUNT(*) - COUNT(sd.artist_id) as artists_without_spotify,
    ROUND(COUNT(sd.artist_id) * 100.0 / COUNT(*), 2) as percentage_with_spotify
FROM artists a
LEFT JOIN spotify_data sd ON a.id = sd.artist_id
WHERE a.company_id = '06f6c960-3f90-41cb-b0d7-46937eaf90a8';

-- 3. Vérifier la structure de la relation
SELECT 
    'artists' as table_name,
    COUNT(*) as total_records
FROM artists 
WHERE company_id = '06f6c960-3f90-41cb-b0d7-46937eaf90a8'

UNION ALL

SELECT 
    'spotify_data' as table_name,
    COUNT(*) as total_records
FROM spotify_data sd
JOIN artists a ON sd.artist_id = a.id
WHERE a.company_id = '06f6c960-3f90-41cb-b0d7-46937eaf90a8';

-- 4. Vérifier les données Spotify les plus récentes
SELECT 
    sd.artist_id,
    a.name as artist_name,
    sd.spotify_id,
    sd.name as spotify_name,
    sd.image_url,
    sd.popularity,
    sd.followers,
    sd.updated_at
FROM spotify_data sd
JOIN artists a ON sd.artist_id = a.id
WHERE a.company_id = '06f6c960-3f90-41cb-b0d7-46937eaf90a8'
ORDER BY sd.updated_at DESC
LIMIT 5;
