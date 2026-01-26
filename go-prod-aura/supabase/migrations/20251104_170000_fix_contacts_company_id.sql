-- =============================================================================
-- Corriger les company_id des contacts et sociétés importés
-- Les mettre tous sur Go-Prod HQ (tenant principal)
-- =============================================================================

-- UUID de Go-Prod HQ (l'entreprise utilisée par l'application)
DO $$
DECLARE
  v_goprod_hq_id uuid := '06f6c960-3f90-41cb-b0d7-46937eaf90a8';
  v_contacts_updated integer;
  v_companies_updated integer;
BEGIN
  -- Vérifier que Go-Prod HQ existe
  IF NOT EXISTS (SELECT 1 FROM public.companies WHERE id = v_goprod_hq_id) THEN
    RAISE EXCEPTION 'L''entreprise Go-Prod HQ (%) n''existe pas', v_goprod_hq_id;
  END IF;

  -- Mettre à jour tous les contacts importés
  UPDATE public.crm_contacts
  SET company_id = v_goprod_hq_id
  WHERE company_id != v_goprod_hq_id;
  
  GET DIAGNOSTICS v_contacts_updated = ROW_COUNT;
  RAISE NOTICE '✅ % contacts mis à jour avec le company_id de Go-Prod HQ', v_contacts_updated;

  -- Mettre à jour toutes les sociétés CRM importées
  UPDATE public.crm_companies
  SET company_id = v_goprod_hq_id
  WHERE company_id != v_goprod_hq_id;
  
  GET DIAGNOSTICS v_companies_updated = ROW_COUNT;
  RAISE NOTICE '✅ % sociétés CRM mises à jour avec le company_id de Go-Prod HQ', v_companies_updated;

  -- Afficher le résumé
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '✅ Migration terminée';
  RAISE NOTICE '   • % contacts corrigés', v_contacts_updated;
  RAISE NOTICE '   • % sociétés corrigées', v_companies_updated;
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
END $$;

-- Vérification finale : compter les contacts et sociétés par company_id
SELECT 
  'crm_contacts' as table_name,
  company_id,
  count(*) as count
FROM public.crm_contacts
GROUP BY company_id
UNION ALL
SELECT 
  'crm_companies' as table_name,
  company_id,
  count(*) as count
FROM public.crm_companies
GROUP BY company_id
ORDER BY table_name, count DESC;











