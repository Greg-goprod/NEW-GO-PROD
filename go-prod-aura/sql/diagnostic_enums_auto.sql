-- Script de diagnostic automatique (pas besoin de remplacer quoi que ce soit)

-- 1. Lister toutes les companies
SELECT '========== VOS COMPANIES ==========' as info;
SELECT id, name, created_at FROM public.companies;

-- 2. Vérifier si les tables existent
SELECT '========== TABLES EXISTENT ? ==========' as info;
SELECT table_name
FROM information_schema.tables 
WHERE table_name IN ('stage_types', 'stage_specificities')
AND table_schema = 'public';

-- 3. Compter les lignes par company
SELECT '========== NOMBRE DE LIGNES PAR COMPANY ==========' as info;
SELECT 
    c.name as company_name,
    c.id as company_id,
    (SELECT COUNT(*) FROM public.stage_types WHERE company_id = c.id) as types_count,
    (SELECT COUNT(*) FROM public.stage_specificities WHERE company_id = c.id) as specs_count
FROM public.companies c;

-- 4. Voir toutes les données de TOUTES les companies
SELECT '========== TOUS LES TYPES ==========' as info;
SELECT 
    c.name as company_name,
    st.value,
    st.label,
    st.display_order
FROM public.stage_types st
JOIN public.companies c ON c.id = st.company_id
ORDER BY c.name, st.display_order;

SELECT '========== TOUTES LES SPÉCIFICITÉS ==========' as info;
SELECT 
    c.name as company_name,
    ss.value,
    ss.label,
    ss.display_order
FROM public.stage_specificities ss
JOIN public.companies c ON c.id = ss.company_id
ORDER BY c.name, ss.display_order;

-- 5. Vérifier les policies RLS
SELECT '========== POLICIES RLS ==========' as info;
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    cmd
FROM pg_policies 
WHERE tablename IN ('stage_types', 'stage_specificities')
AND schemaname = 'public';


