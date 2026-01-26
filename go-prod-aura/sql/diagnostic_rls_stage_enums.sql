-- Diagnostic RLS pour stage_types et stage_specificities

-- 1. Vérifier si RLS est activé
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename IN ('stage_types', 'stage_specificities')
AND schemaname = 'public';

-- 2. Lister les policies existantes
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd as operation,
    qual as using_expression,
    with_check as with_check_expression
FROM pg_policies
WHERE tablename IN ('stage_types', 'stage_specificities')
AND schemaname = 'public'
ORDER BY tablename, policyname;

-- 3. Vérifier si la fonction auth_company_id() existe
SELECT 
    proname as function_name,
    prosrc as function_body
FROM pg_proc
WHERE proname = 'auth_company_id';

-- 4. Tester une requête SELECT simple
SELECT 
    'stage_types' as table_name,
    COUNT(*) as row_count
FROM public.stage_types
UNION ALL
SELECT 
    'stage_specificities' as table_name,
    COUNT(*) as row_count
FROM public.stage_specificities;

-- 5. Vérifier les contraintes UNIQUE
SELECT
    conname as constraint_name,
    conrelid::regclass as table_name,
    pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid IN ('public.stage_types'::regclass, 'public.stage_specificities'::regclass)
AND contype = 'u'
ORDER BY table_name, constraint_name;


