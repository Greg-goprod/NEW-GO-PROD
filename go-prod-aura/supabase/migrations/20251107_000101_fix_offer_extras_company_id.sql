-- =============================================================================
-- Fix offer_extras : Ajout company_id pour multitenancy
-- =============================================================================
-- PROBLÈME : offer_extras n'a ni company_id ni event_id
-- SOLUTION : Ajouter company_id et le remplir via la relation avec offers
-- =============================================================================

-- 1. Ajouter la colonne company_id (nullable temporairement)
ALTER TABLE offer_extras 
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;

-- 2. Remplir company_id avec les données existantes via la relation avec offers
UPDATE offer_extras oe
SET company_id = o.company_id
FROM offers o
WHERE oe.offer_id = o.id
  AND oe.company_id IS NULL;

-- 3. Vérifier qu'il n'y a pas de lignes sans company_id
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count FROM offer_extras WHERE company_id IS NULL;
  
  IF v_count > 0 THEN
    RAISE EXCEPTION 'ERREUR : % ligne(s) dans offer_extras n''ont pas pu être associées à un company_id. Vérifier les données.', v_count;
  END IF;
END $$;

-- 4. Rendre la colonne NOT NULL
ALTER TABLE offer_extras 
ALTER COLUMN company_id SET NOT NULL;

-- 5. Ajouter un index pour les performances
CREATE INDEX IF NOT EXISTS idx_offer_extras_company 
ON offer_extras(company_id);

-- 6. Ajouter un commentaire
COMMENT ON COLUMN offer_extras.company_id IS 'Partitionnement multi-tenant (ajouté pour cohérence architecture)';

-- 7. Activer RLS (optionnel - peut être commenté en dev)
-- ALTER TABLE offer_extras ENABLE ROW LEVEL SECURITY;

-- 8. Créer les policies RLS (optionnel - peut être commenté en dev)
/*
CREATE POLICY "Users can view offer extras of their company"
ON offer_extras FOR SELECT
USING (company_id = auth_company_id());

CREATE POLICY "Users can insert offer extras for their company"
ON offer_extras FOR INSERT
WITH CHECK (company_id = auth_company_id());

CREATE POLICY "Users can update offer extras of their company"
ON offer_extras FOR UPDATE
USING (company_id = auth_company_id())
WITH CHECK (company_id = auth_company_id());

CREATE POLICY "Users can delete offer extras of their company"
ON offer_extras FOR DELETE
USING (company_id = auth_company_id());
*/

-- =============================================================================
-- Vérification finale
-- =============================================================================

DO $$
DECLARE
  v_total INTEGER;
  v_with_company_id INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_total FROM offer_extras;
  SELECT COUNT(*) INTO v_with_company_id FROM offer_extras WHERE company_id IS NOT NULL;
  
  RAISE NOTICE '';
  RAISE NOTICE '✅ Table offer_extras corrigée avec succès !';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '  • Total lignes : %', v_total;
  RAISE NOTICE '  • Lignes avec company_id : %', v_with_company_id;
  RAISE NOTICE '  • Index créé : idx_offer_extras_company';
  RAISE NOTICE '  • RLS : Non activé (dev mode)';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '';
END $$;













