-- Script de diagnostic pour les tables stage_types et stage_specificities

-- 1. Vérifier si les tables existent
SELECT 
    table_name,
    table_schema
FROM information_schema.tables 
WHERE table_name IN ('stage_types', 'stage_specificities')
AND table_schema = 'public';

-- 2. Vérifier le contenu des tables
SELECT 'stage_types' as table_name, COUNT(*) as row_count FROM public.stage_types
UNION ALL
SELECT 'stage_specificities' as table_name, COUNT(*) as row_count FROM public.stage_specificities;

-- 3. Voir quelques exemples de données (les 5 premières lignes)
SELECT 'STAGE_TYPES:' as info;
SELECT id, company_id, value, label, display_order FROM public.stage_types LIMIT 5;

SELECT 'STAGE_SPECIFICITIES:' as info;
SELECT id, company_id, value, label, display_order FROM public.stage_specificities LIMIT 5;

-- 4. Vérifier les RLS policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename IN ('stage_types', 'stage_specificities')
AND schemaname = 'public';

-- 5. Vérifier si les contraintes UNIQUE existent
SELECT
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
WHERE tc.constraint_type = 'UNIQUE' 
    AND tc.table_name IN ('stage_types', 'stage_specificities')
    AND tc.table_schema = 'public';


