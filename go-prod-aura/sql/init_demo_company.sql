-- Initialiser les enums pour Demo Company
-- Company ID: c78343c3-1e73-4a4b-8e3d-e887780f82a4

-- Appeler la fonction d'initialisation
SELECT initialize_stage_enums_for_company('c78343c3-1e73-4a4b-8e3d-e887780f82a4');

-- Vérifier les résultats
SELECT 
    'Types de scènes créés' as resultat,
    COUNT(*) as total
FROM public.stage_types 
WHERE company_id = 'c78343c3-1e73-4a4b-8e3d-e887780f82a4'
UNION ALL
SELECT 
    'Spécificités créées' as resultat,
    COUNT(*) as total
FROM public.stage_specificities 
WHERE company_id = 'c78343c3-1e73-4a4b-8e3d-e887780f82a4';

-- Afficher toutes les données créées
SELECT '========== TYPES DE SCÈNES ==========' as info;
SELECT value, label, display_order
FROM public.stage_types 
WHERE company_id = 'c78343c3-1e73-4a4b-8e3d-e887780f82a4'
ORDER BY display_order;

SELECT '========== SPÉCIFICITÉS ==========' as info;
SELECT value, label, display_order
FROM public.stage_specificities 
WHERE company_id = 'c78343c3-1e73-4a4b-8e3d-e887780f82a4'
ORDER BY display_order;


