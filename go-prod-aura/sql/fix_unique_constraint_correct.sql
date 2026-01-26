-- Corriger les contraintes UNIQUE incorrectes
-- Problème : UNIQUE sur "value" au lieu de UNIQUE sur "(company_id, value)"

-- 1. Supprimer les mauvaises contraintes UNIQUE sur "value" seul
DO $$
BEGIN
    -- Supprimer contrainte UNIQUE sur stage_types.value (si elle existe)
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'stage_types_value_key'
    ) THEN
        ALTER TABLE public.stage_types DROP CONSTRAINT stage_types_value_key;
        RAISE NOTICE '✅ Contrainte stage_types_value_key supprimée';
    END IF;
    
    -- Supprimer contrainte UNIQUE sur stage_specificities.value (si elle existe)
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'stage_specificities_value_key'
    ) THEN
        ALTER TABLE public.stage_specificities DROP CONSTRAINT stage_specificities_value_key;
        RAISE NOTICE '✅ Contrainte stage_specificities_value_key supprimée';
    END IF;
END $$;

-- 2. Ajouter les bonnes contraintes UNIQUE sur (company_id, value)
DO $$
BEGIN
    -- Pour stage_types
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'stage_types_company_id_value_key'
    ) THEN
        ALTER TABLE public.stage_types 
            ADD CONSTRAINT stage_types_company_id_value_key UNIQUE (company_id, value);
        RAISE NOTICE '✅ Contrainte stage_types_company_id_value_key créée';
    ELSE
        RAISE NOTICE '⚠️ Contrainte stage_types_company_id_value_key existe déjà';
    END IF;
    
    -- Pour stage_specificities
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'stage_specificities_company_id_value_key'
    ) THEN
        ALTER TABLE public.stage_specificities 
            ADD CONSTRAINT stage_specificities_company_id_value_key UNIQUE (company_id, value);
        RAISE NOTICE '✅ Contrainte stage_specificities_company_id_value_key créée';
    ELSE
        RAISE NOTICE '⚠️ Contrainte stage_specificities_company_id_value_key existe déjà';
    END IF;
END $$;

-- 3. Vérifier les contraintes finales
SELECT 
    'CONTRAINTES FINALES' as info,
    tc.constraint_name, 
    tc.table_name, 
    STRING_AGG(kcu.column_name, ', ' ORDER BY kcu.ordinal_position) as columns
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
WHERE tc.constraint_type = 'UNIQUE' 
    AND tc.table_name IN ('stage_types', 'stage_specificities')
    AND tc.table_schema = 'public'
GROUP BY tc.constraint_name, tc.table_name
ORDER BY tc.table_name, tc.constraint_name;


