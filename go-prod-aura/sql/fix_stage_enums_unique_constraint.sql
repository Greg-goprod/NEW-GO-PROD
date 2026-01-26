-- ============================================
-- FIX: Ajouter les contraintes UNIQUE manquantes
-- ============================================

-- 1. Vérifier et ajouter la contrainte UNIQUE sur stage_types
DO $$
BEGIN
    -- Supprimer la contrainte si elle existe déjà (au cas où)
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'stage_types_company_id_value_key'
    ) THEN
        ALTER TABLE public.stage_types DROP CONSTRAINT stage_types_company_id_value_key;
    END IF;
    
    -- Créer la contrainte UNIQUE
    ALTER TABLE public.stage_types 
        ADD CONSTRAINT stage_types_company_id_value_key UNIQUE (company_id, value);
END $$;

-- 2. Vérifier et ajouter la contrainte UNIQUE sur stage_specificities
DO $$
BEGIN
    -- Supprimer la contrainte si elle existe déjà (au cas où)
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'stage_specificities_company_id_value_key'
    ) THEN
        ALTER TABLE public.stage_specificities DROP CONSTRAINT stage_specificities_company_id_value_key;
    END IF;
    
    -- Créer la contrainte UNIQUE
    ALTER TABLE public.stage_specificities 
        ADD CONSTRAINT stage_specificities_company_id_value_key UNIQUE (company_id, value);
END $$;

-- 3. Vérifier que les contraintes ont été créées
SELECT 
    'stage_types' as table_name,
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conname = 'stage_types_company_id_value_key'
UNION ALL
SELECT 
    'stage_specificities' as table_name,
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conname = 'stage_specificities_company_id_value_key';


