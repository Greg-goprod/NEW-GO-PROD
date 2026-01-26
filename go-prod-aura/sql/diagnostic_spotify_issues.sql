-- Diagnostic des problèmes Spotify
-- Exécuter ce script dans Supabase SQL Editor

-- 1. Vérifier la structure de la table spotify_data
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'spotify_data' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Vérifier les données existantes
SELECT 
    a.name as artist_name,
    sd.spotify_id,
    sd.spotify_url,
    sd.external_url,
    sd.image_url,
    sd.popularity,
    sd.followers,
    sd.updated_at
FROM artists a
LEFT JOIN spotify_data sd ON sd.artist_id = a.id
WHERE a.company_id = '06f6c960-3f90-41cb-b0d7-46937eaf90a8'
ORDER BY a.name;

-- 3. Vérifier les contraintes
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


