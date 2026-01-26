-- Vérification pour la Demo Company
-- Company ID: c78343c3-1e73-4a4b-8e3d-e887780f82a4

-- 1. Vérifier si les tables existent
SELECT '========== TABLES EXISTENT ? ==========' as info;
SELECT table_name
FROM information_schema.tables 
WHERE table_name IN ('stage_types', 'stage_specificities')
AND table_schema = 'public';

-- 2. Compter les lignes pour cette company
SELECT '========== NOMBRE DE LIGNES POUR DEMO COMPANY ==========' as info;
SELECT 
    (SELECT COUNT(*) FROM public.stage_types WHERE company_id = 'c78343c3-1e73-4a4b-8e3d-e887780f82a4') as types_count,
    (SELECT COUNT(*) FROM public.stage_specificities WHERE company_id = 'c78343c3-1e73-4a4b-8e3d-e887780f82a4') as specs_count;

-- 3. Voir les données existantes (si il y en a)
SELECT '========== TYPES DE SCÈNES EXISTANTS ==========' as info;
SELECT id, value, label, display_order, created_at
FROM public.stage_types 
WHERE company_id = 'c78343c3-1e73-4a4b-8e3d-e887780f82a4'
ORDER BY display_order;

SELECT '========== SPÉCIFICITÉS EXISTANTES ==========' as info;
SELECT id, value, label, display_order, created_at
FROM public.stage_specificities 
WHERE company_id = 'c78343c3-1e73-4a4b-8e3d-e887780f82a4'
ORDER BY display_order;

-- 4. Vérifier les contraintes UNIQUE
SELECT '========== CONTRAINTES UNIQUE ==========' as info;
SELECT
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.constraint_type = 'UNIQUE' 
    AND tc.table_name IN ('stage_types', 'stage_specificities')
    AND tc.table_schema = 'public';

-- 5. Vérifier les policies RLS
SELECT '========== POLICIES RLS ==========' as info;
SELECT 
    tablename,
    policyname,
    permissive,
    cmd,
    qual
FROM pg_policies 
WHERE tablename IN ('stage_types', 'stage_specificities')
AND schemaname = 'public';


