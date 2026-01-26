-- Test d'insertion manuelle dans spotify_data
-- Pour diagnostiquer le problème d'insertion

-- 1. Vérifier que la table spotify_data existe
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'spotify_data'
) as table_exists;

-- 2. Vérifier la structure de la table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'spotify_data' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. Récupérer un artiste récent pour le test
SELECT id, name, company_id
FROM artists 
WHERE company_id = '06f6c960-3f90-41cb-b0d7-46937eaf90a8'
ORDER BY created_at DESC
LIMIT 1;

-- 4. Test d'insertion manuelle (remplacez ARTIST_ID par l'ID de l'artiste ci-dessus)
-- INSERT INTO spotify_data (
--     artist_id,
--     spotify_id,
--     name,
--     external_url,
--     image_url,
--     popularity,
--     followers,
--     genres,
--     updated_at
-- ) VALUES (
--     'ARTIST_ID_ICI', -- Remplacez par l'ID de l'artiste
--     'test_spotify_123',
--     'Test Artist',
--     'https://open.spotify.com/artist/test',
--     'https://i.scdn.co/image/test.jpg',
--     85,
--     1000000,
--     ARRAY['pop', 'rock'],
--     NOW()
-- );

-- 5. Vérifier les données après insertion
-- SELECT * FROM spotify_data WHERE artist_id = 'ARTIST_ID_ICI';


