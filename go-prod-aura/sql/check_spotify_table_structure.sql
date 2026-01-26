-- Vérifier la structure de la table spotify_data
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

-- 2. Vérifier les contraintes de clé étrangère
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

-- 3. Vérifier les données Spotify existantes (version simplifiée)
SELECT 
    artist_id,
    spotify_id,
    name,
    image_url,
    popularity,
    followers,
    updated_at
FROM spotify_data
ORDER BY updated_at DESC
LIMIT 5;


