-- Migration pour corriger les fonctions RPC CRM qui ont besoin du company_id en paramètre

-- 1) Recréer upsert_crm_option avec company_id en paramètre
DROP FUNCTION IF EXISTS public.upsert_crm_option(text, uuid, text, boolean, int);

CREATE OR REPLACE FUNCTION public.upsert_crm_option(
  p_table text,
  p_company_id uuid,
  p_id uuid,
  p_label text,
  p_active boolean DEFAULT true,
  p_sort_order int DEFAULT 100
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_sql text;
  v_return_id uuid;
BEGIN
  -- Vérifier que l'utilisateur a accès à cette company
  IF NOT (
    SELECT is_owner_admin() 
    OR EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() 
      AND company_id = p_company_id
    )
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Vérifier que la table est autorisée
  IF p_table NOT IN ('company_types','contact_statuses','departments','contact_roles','seniority_levels') THEN
    RAISE EXCEPTION 'Table not allowed';
  END IF;

  -- Insertion ou mise à jour
  IF p_id IS NULL THEN
    -- Insertion
    v_sql := format($f$
      INSERT INTO public.%I (company_id, label, active, sort_order)
      VALUES ($1, $2, $3, $4)
      RETURNING id
    $f$, p_table);
    EXECUTE v_sql USING p_company_id, p_label, p_active, p_sort_order INTO v_return_id;
  ELSE
    -- Mise à jour
    v_sql := format($f$
      UPDATE public.%I
         SET label = $2,
             active = $3,
             sort_order = $4,
             updated_at = timezone('utc', now())
       WHERE id = $1 AND company_id = $5
       RETURNING id
    $f$, p_table);
    EXECUTE v_sql USING p_id, p_label, p_active, p_sort_order, p_company_id INTO v_return_id;

    IF v_return_id IS NULL THEN
      RAISE EXCEPTION 'Not found or forbidden';
    END IF;
  END IF;

  RETURN v_return_id;
END;
$$;

-- Permissions
GRANT EXECUTE ON FUNCTION public.upsert_crm_option(text, uuid, uuid, text, boolean, int) TO authenticated;

-- 2) Recréer disable_crm_option avec company_id en paramètre
DROP FUNCTION IF EXISTS public.disable_crm_option(text, uuid);

CREATE OR REPLACE FUNCTION public.disable_crm_option(
  p_table text,
  p_company_id uuid,
  p_id uuid
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_sql text;
BEGIN
  -- Vérifier que l'utilisateur a accès à cette company
  IF NOT (
    SELECT is_owner_admin() 
    OR EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() 
      AND company_id = p_company_id
    )
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Vérifier que la table est autorisée
  IF p_table NOT IN ('company_types','contact_statuses','departments','contact_roles','seniority_levels') THEN
    RAISE EXCEPTION 'Table not allowed';
  END IF;

  -- Désactiver
  v_sql := format($f$
    UPDATE public.%I
       SET active = false,
           updated_at = timezone('utc', now())
     WHERE id = $1 AND company_id = $2
  $f$, p_table);
  
  EXECUTE v_sql USING p_id, p_company_id;
END;
$$;

-- Permissions
GRANT EXECUTE ON FUNCTION public.disable_crm_option(text, uuid, uuid) TO authenticated;










