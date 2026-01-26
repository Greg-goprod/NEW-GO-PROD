-- Activer RLS et créer les policies pour stage_types et stage_specificities

-- 1. Activer RLS sur les tables
ALTER TABLE public.stage_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stage_specificities ENABLE ROW LEVEL SECURITY;

-- 2. Supprimer les anciennes policies si elles existent
DROP POLICY IF EXISTS "Users can view stage_types of their company" ON public.stage_types;
DROP POLICY IF EXISTS "Users can insert stage_types for their company" ON public.stage_types;
DROP POLICY IF EXISTS "Users can update stage_types of their company" ON public.stage_types;
DROP POLICY IF EXISTS "Users can delete stage_types of their company" ON public.stage_types;

DROP POLICY IF EXISTS "Users can view stage_specificities of their company" ON public.stage_specificities;
DROP POLICY IF EXISTS "Users can insert stage_specificities for their company" ON public.stage_specificities;
DROP POLICY IF EXISTS "Users can update stage_specificities of their company" ON public.stage_specificities;
DROP POLICY IF EXISTS "Users can delete stage_specificities of their company" ON public.stage_specificities;

-- 3. Créer les policies pour stage_types
CREATE POLICY "Users can view stage_types of their company"
ON public.stage_types
FOR SELECT
USING (company_id = auth_company_id());

CREATE POLICY "Users can insert stage_types for their company"
ON public.stage_types
FOR INSERT
WITH CHECK (company_id = auth_company_id());

CREATE POLICY "Users can update stage_types of their company"
ON public.stage_types
FOR UPDATE
USING (company_id = auth_company_id())
WITH CHECK (company_id = auth_company_id());

CREATE POLICY "Users can delete stage_types of their company"
ON public.stage_types
FOR DELETE
USING (company_id = auth_company_id());

-- 4. Créer les policies pour stage_specificities
CREATE POLICY "Users can view stage_specificities of their company"
ON public.stage_specificities
FOR SELECT
USING (company_id = auth_company_id());

CREATE POLICY "Users can insert stage_specificities for their company"
ON public.stage_specificities
FOR INSERT
WITH CHECK (company_id = auth_company_id());

CREATE POLICY "Users can update stage_specificities of their company"
ON public.stage_specificities
FOR UPDATE
USING (company_id = auth_company_id())
WITH CHECK (company_id = auth_company_id());

CREATE POLICY "Users can delete stage_specificities of their company"
ON public.stage_specificities
FOR DELETE
USING (company_id = auth_company_id());

-- 5. Vérifier que la fonction auth_company_id() existe
-- Si elle n'existe pas, la créer
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'auth_company_id') THEN
        CREATE OR REPLACE FUNCTION auth_company_id()
        RETURNS UUID
        LANGUAGE plpgsql
        SECURITY DEFINER
        STABLE
        AS $func$
        DECLARE
            user_company_id UUID;
        BEGIN
            -- Récupérer le company_id depuis auth.users ou user_metadata
            SELECT 
                COALESCE(
                    (auth.jwt()->>'company_id')::UUID,
                    (auth.jwt()->'user_metadata'->>'company_id')::UUID,
                    '00000000-0000-0000-0000-000000000000'::UUID
                )
            INTO user_company_id;
            
            RETURN user_company_id;
        END;
        $func$;
    END IF;
END $$;

-- 6. Afficher un résumé
DO $$
BEGIN
    RAISE NOTICE '✅ RLS activé et policies créées pour stage_types et stage_specificities';
    RAISE NOTICE '📋 Policies créées:';
    RAISE NOTICE '  - SELECT: Lecture des enums de sa company';
    RAISE NOTICE '  - INSERT: Ajout d''enums pour sa company';
    RAISE NOTICE '  - UPDATE: Modification des enums de sa company';
    RAISE NOTICE '  - DELETE: Suppression des enums de sa company';
END $$;


