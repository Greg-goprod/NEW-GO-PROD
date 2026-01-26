-- Migration: Activation Row Level Security (RLS)
-- Date: 2025-11-14
-- Description: Active RLS sur toutes les tables Production et crée les policies

-- ⚠️ IMPORTANT: Cette migration est CRITIQUE pour la sécurité multitenant
-- À activer AVANT la mise en production

-- ============================================================================
-- ACTIVATION RLS SUR TOUTES LES TABLES
-- ============================================================================

-- Tables Production principales
ALTER TABLE artist_touring_party ENABLE ROW LEVEL SECURITY;
ALTER TABLE travels ENABLE ROW LEVEL SECURITY;
ALTER TABLE travel_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_check_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE hotel_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE hotel_room_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE catering_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE catering_vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE party_crew ENABLE ROW LEVEL SECURITY;
ALTER TABLE bases ENABLE ROW LEVEL SECURITY;

-- Tables ressources globales
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE hotels ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- FONCTION HELPER: Récupérer company_id de l'utilisateur
-- ============================================================================

CREATE OR REPLACE FUNCTION auth_company_id()
RETURNS UUID AS $$
BEGIN
  -- Récupérer le company_id depuis auth.users ou user_metadata
  RETURN (
    SELECT (auth.jwt()->>'company_id')::UUID
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION auth_company_id IS 
  'Retourne le company_id de l''utilisateur authentifié depuis le JWT';

-- ============================================================================
-- POLICIES: Tables liées aux événements
-- ============================================================================

-- Pour toutes les tables avec event_id
DO $$
DECLARE
  table_name TEXT;
BEGIN
  FOR table_name IN 
    SELECT UNNEST(ARRAY[
      'artist_touring_party',
      'travels',
      'missions',
      'vehicles',
      'vehicle_check_logs',
      'shifts',
      'hotel_reservations',
      'catering_requirements',
      'catering_vouchers'
    ])
  LOOP
    -- Policy SELECT
    EXECUTE format('
      CREATE POLICY "Users can view %s of their company events"
        ON %I FOR SELECT
        USING (
          event_id IN (
            SELECT id FROM events WHERE company_id = auth_company_id()
          )
        );
    ', table_name, table_name);
    
    -- Policy INSERT
    EXECUTE format('
      CREATE POLICY "Users can insert %s for their company events"
        ON %I FOR INSERT
        WITH CHECK (
          event_id IN (
            SELECT id FROM events WHERE company_id = auth_company_id()
          )
        );
    ', table_name, table_name);
    
    -- Policy UPDATE
    EXECUTE format('
      CREATE POLICY "Users can update %s of their company events"
        ON %I FOR UPDATE
        USING (
          event_id IN (
            SELECT id FROM events WHERE company_id = auth_company_id()
          )
        );
    ', table_name, table_name);
    
    -- Policy DELETE
    EXECUTE format('
      CREATE POLICY "Users can delete %s of their company events"
        ON %I FOR DELETE
        USING (
          event_id IN (
            SELECT id FROM events WHERE company_id = auth_company_id()
          )
        );
    ', table_name, table_name);
    
    RAISE NOTICE 'Policies créées pour table: %', table_name;
  END LOOP;
END $$;

-- ============================================================================
-- POLICIES: travel_details (liée à travels)
-- ============================================================================

CREATE POLICY "Users can view travel_details of their company"
  ON travel_details FOR SELECT
  USING (
    travel_id IN (
      SELECT id FROM travels 
      WHERE event_id IN (
        SELECT id FROM events WHERE company_id = auth_company_id()
      )
    )
  );

CREATE POLICY "Users can insert travel_details for their company"
  ON travel_details FOR INSERT
  WITH CHECK (
    travel_id IN (
      SELECT id FROM travels 
      WHERE event_id IN (
        SELECT id FROM events WHERE company_id = auth_company_id()
      )
    )
  );

CREATE POLICY "Users can update travel_details of their company"
  ON travel_details FOR UPDATE
  USING (
    travel_id IN (
      SELECT id FROM travels 
      WHERE event_id IN (
        SELECT id FROM events WHERE company_id = auth_company_id()
      )
    )
  );

CREATE POLICY "Users can delete travel_details of their company"
  ON travel_details FOR DELETE
  USING (
    travel_id IN (
      SELECT id FROM travels 
      WHERE event_id IN (
        SELECT id FROM events WHERE company_id = auth_company_id()
      )
    )
  );

-- ============================================================================
-- POLICIES: shift_drivers (liée à shifts)
-- ============================================================================

CREATE POLICY "Users can view shift_drivers of their company"
  ON shift_drivers FOR SELECT
  USING (
    shift_id IN (
      SELECT id FROM shifts 
      WHERE event_id IN (
        SELECT id FROM events WHERE company_id = auth_company_id()
      )
    )
  );

CREATE POLICY "Users can manage shift_drivers of their company"
  ON shift_drivers FOR ALL
  USING (
    shift_id IN (
      SELECT id FROM shifts 
      WHERE event_id IN (
        SELECT id FROM events WHERE company_id = auth_company_id()
      )
    )
  );

-- ============================================================================
-- POLICIES: Ressources globales (company_id direct)
-- ============================================================================

-- DRIVERS
CREATE POLICY "Users can view drivers of their company"
  ON drivers FOR SELECT
  USING (company_id = auth_company_id());

CREATE POLICY "Users can manage drivers of their company"
  ON drivers FOR ALL
  USING (company_id = auth_company_id());

-- BASES
CREATE POLICY "Users can view bases of their company"
  ON bases FOR SELECT
  USING (company_id = auth_company_id());

CREATE POLICY "Users can manage bases of their company"
  ON bases FOR ALL
  USING (company_id = auth_company_id());

-- PARTY_CREW
CREATE POLICY "Users can view party_crew of their company"
  ON party_crew FOR SELECT
  USING (company_id = auth_company_id());

CREATE POLICY "Users can manage party_crew of their company"
  ON party_crew FOR ALL
  USING (company_id = auth_company_id());

-- HOTELS (ressource globale partagée - tous peuvent voir, seuls admins peuvent modifier)
CREATE POLICY "All authenticated users can view hotels"
  ON hotels FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Only admins can manage hotels"
  ON hotels FOR ALL
  USING (
    auth.jwt()->>'role' = 'admin'
  );

-- HOTEL_ROOM_TYPES
CREATE POLICY "All authenticated users can view hotel_room_types"
  ON hotel_room_types FOR SELECT
  USING (auth.role() = 'authenticated');

-- STAFF_ASSIGNMENTS
CREATE POLICY "Users can view staff_assignments of their company events"
  ON staff_assignments FOR SELECT
  USING (
    event_id IN (
      SELECT id FROM events WHERE company_id = auth_company_id()
    )
  );

CREATE POLICY "Users can manage staff_assignments for their company events"
  ON staff_assignments FOR ALL
  USING (
    event_id IN (
      SELECT id FROM events WHERE company_id = auth_company_id()
    )
  );

-- ============================================================================
-- VÉRIFICATION
-- ============================================================================

DO $$
DECLARE
  rls_count INTEGER;
  policy_count INTEGER;
BEGIN
  -- Compter les tables avec RLS activé
  SELECT COUNT(*) INTO rls_count
  FROM pg_tables t
  JOIN pg_class c ON t.tablename = c.relname
  WHERE t.schemaname = 'public'
  AND c.relrowsecurity = true
  AND t.tablename IN (
    'artist_touring_party', 'travels', 'travel_details', 'missions',
    'drivers', 'vehicles', 'vehicle_check_logs', 'shifts', 'shift_drivers',
    'hotels', 'hotel_room_types', 'hotel_reservations',
    'catering_requirements', 'catering_vouchers', 'party_crew',
    'bases', 'staff_assignments'
  );
  
  -- Compter les policies créées
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public';
  
  RAISE NOTICE 'Migration 20251114_150500 appliquée';
  RAISE NOTICE 'Tables avec RLS: %', rls_count;
  RAISE NOTICE 'Policies créées: %', policy_count;
  
  IF rls_count < 15 THEN
    RAISE WARNING 'Seulement % tables sur 17 ont RLS activé', rls_count;
  END IF;
END $$;

-- ============================================================================
-- NOTES IMPORTANTES
-- ============================================================================

COMMENT ON FUNCTION auth_company_id IS 
  '⚠️ SÉCURITÉ: Cette fonction doit retourner le company_id depuis le JWT.
   Adapter selon votre implémentation auth (user_metadata, custom claims, etc.)';

-- ⚠️ À TESTER AVANT PRODUCTION:
-- 1. Vérifier que auth_company_id() retourne bien le bon company_id
-- 2. Tester avec plusieurs utilisateurs de companies différentes
-- 3. Vérifier l'isolation des données
-- 4. Tester tous les CRUDs avec RLS actif





