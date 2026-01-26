-- Vérifier la structure exacte de la table spotify_data
-- Exécuter ce script dans Supabase SQL Editor

-- 1. Vérifier toutes les colonnes de la table spotify_data
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'spotify_data' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Vérifier les données existantes (structure)
SELECT * FROM spotify_data LIMIT 1;

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


