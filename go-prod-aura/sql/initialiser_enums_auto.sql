-- Initialiser les enums pour TOUTES vos companies
-- (exécutez cette requête telle quelle, sans modification)

DO $$
DECLARE
    company_record RECORD;
    result_count INTEGER;
BEGIN
    -- Pour chaque company
    FOR company_record IN SELECT id, name FROM public.companies LOOP
        RAISE NOTICE '🔧 Initialisation des enums pour company: % (id: %)', company_record.name, company_record.id;
        
        -- Appeler la fonction d'initialisation
        PERFORM initialize_stage_enums_for_company(company_record.id);
        
        -- Vérifier le résultat
        SELECT COUNT(*) INTO result_count FROM public.stage_types WHERE company_id = company_record.id;
        RAISE NOTICE '✅ % types de scènes créés', result_count;
        
        SELECT COUNT(*) INTO result_count FROM public.stage_specificities WHERE company_id = company_record.id;
        RAISE NOTICE '✅ % spécificités créées', result_count;
        
        RAISE NOTICE '---';
    END LOOP;
    
    RAISE NOTICE '🎉 Initialisation terminée !';
END $$;

-- Vérifier les résultats
SELECT 
    c.name as company_name,
    (SELECT COUNT(*) FROM public.stage_types WHERE company_id = c.id) as types_count,
    (SELECT COUNT(*) FROM public.stage_specificities WHERE company_id = c.id) as specs_count
FROM public.companies c;


