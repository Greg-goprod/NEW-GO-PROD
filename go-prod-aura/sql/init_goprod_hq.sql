-- Initialiser les enums pour Go-Prod HQ
-- Company ID: 06f6c960-3f90-41cb-b0d7-46937eaf90a8

-- Vérifier d'abord s'il y a déjà des données
SELECT 
    'AVANT INITIALISATION' as info,
    (SELECT COUNT(*) FROM public.stage_types WHERE company_id = '06f6c960-3f90-41cb-b0d7-46937eaf90a8') as types_count,
    (SELECT COUNT(*) FROM public.stage_specificities WHERE company_id = '06f6c960-3f90-41cb-b0d7-46937eaf90a8') as specs_count;

-- Appeler la fonction d'initialisation
SELECT initialize_stage_enums_for_company('06f6c960-3f90-41cb-b0d7-46937eaf90a8');

-- Vérifier les résultats
SELECT 
    'APRÈS INITIALISATION' as info,
    (SELECT COUNT(*) FROM public.stage_types WHERE company_id = '06f6c960-3f90-41cb-b0d7-46937eaf90a8') as types_count,
    (SELECT COUNT(*) FROM public.stage_specificities WHERE company_id = '06f6c960-3f90-41cb-b0d7-46937eaf90a8') as specs_count;

-- Afficher toutes les données créées
SELECT 'TYPES DE SCÈNES' as info;
SELECT value, label, display_order
FROM public.stage_types 
WHERE company_id = '06f6c960-3f90-41cb-b0d7-46937eaf90a8'
ORDER BY display_order;

SELECT 'SPÉCIFICITÉS' as info;
SELECT value, label, display_order
FROM public.stage_specificities 
WHERE company_id = '06f6c960-3f90-41cb-b0d7-46937eaf90a8'
ORDER BY display_order;


