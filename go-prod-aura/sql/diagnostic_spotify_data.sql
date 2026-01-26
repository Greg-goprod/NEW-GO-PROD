-- Diagnostic des données Spotify
-- Vérifier les artistes et leurs données Spotify

-- 1. Vérifier les artistes récents
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

-- 2. Compter les artistes avec et sans données Spotify
SELECT 
    COUNT(*) as total_artists,
    COUNT(sd.artist_id) as artists_with_spotify,
    COUNT(*) - COUNT(sd.artist_id) as artists_without_spotify
FROM artists a
LEFT JOIN spotify_data sd ON a.id = sd.artist_id
WHERE a.company_id = '06f6c960-3f90-41cb-b0d7-46937eaf90a8';

-- 3. Vérifier la structure de la table spotify_data
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'spotify_data' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 4. Vérifier les contraintes de clé étrangère
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name = 'spotify_data';


