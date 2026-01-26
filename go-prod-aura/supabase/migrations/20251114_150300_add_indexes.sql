-- Migration: Ajout des index manquants pour performance
-- Date: 2025-11-14
-- Description: Ajoute les index de performance mentionnés dans la documentation

-- ============================================================================
-- INDEX MISSIONS
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_missions_pickup_type 
  ON missions(pickup_type);

CREATE INDEX IF NOT EXISTS idx_missions_drop_type 
  ON missions(drop_type);

CREATE INDEX IF NOT EXISTS idx_missions_pickup_datetime 
  ON missions(pickup_datetime);

CREATE INDEX IF NOT EXISTS idx_missions_base_id 
  ON missions(base_id);

-- ============================================================================
-- INDEX TRAVELS
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_travels_type 
  ON travels(travel_type);

CREATE INDEX IF NOT EXISTS idx_travels_is_arrival 
  ON travels(is_arrival);

-- ============================================================================
-- INDEX CATERING
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_catering_vouchers_ticket 
  ON catering_vouchers(ticket_number);

CREATE INDEX IF NOT EXISTS idx_catering_vouchers_meal_type 
  ON catering_vouchers(meal_type);

CREATE INDEX IF NOT EXISTS idx_catering_requirements_artist 
  ON catering_requirements(artist_id);

CREATE INDEX IF NOT EXISTS idx_catering_requirements_event 
  ON catering_requirements(event_id);

-- ============================================================================
-- INDEX DRIVERS
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_drivers_name 
  ON drivers(last_name, first_name);

CREATE INDEX IF NOT EXISTS idx_drivers_email 
  ON drivers(email);

-- ============================================================================
-- INDEX VEHICLES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_vehicles_type 
  ON vehicles(type);

CREATE INDEX IF NOT EXISTS idx_vehicles_supplier 
  ON vehicles(supplier);

-- ============================================================================
-- INDEX HOTELS
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_hotel_reservations_check_in 
  ON hotel_reservations(check_in_date);

CREATE INDEX IF NOT EXISTS idx_hotel_reservations_check_out 
  ON hotel_reservations(check_out_date);

CREATE INDEX IF NOT EXISTS idx_hotel_reservations_status 
  ON hotel_reservations(status);

CREATE INDEX IF NOT EXISTS idx_hotel_room_types_hotel 
  ON hotel_room_types(hotel_id);

-- ============================================================================
-- INDEX STAFF_ASSIGNMENTS
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_staff_assignments_role 
  ON staff_assignments(role);

CREATE INDEX IF NOT EXISTS idx_staff_assignments_status 
  ON staff_assignments(status);

-- ============================================================================
-- INDEX BASES (nouvellement créée)
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_bases_city 
  ON bases(city);

-- Index géospatial pour recherche par proximité (si besoin futur)
-- CREATE INDEX IF NOT EXISTS idx_bases_location 
--   ON bases USING GIST (ll_to_earth(latitude, longitude));

-- ============================================================================
-- INDEX TRAVEL_DETAILS
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_travel_details_reference 
  ON travel_details(reference_number);

-- ============================================================================
-- STATISTIQUES
-- ============================================================================

-- Mettre à jour les statistiques pour l'optimiseur de requêtes
ANALYZE missions;
ANALYZE travels;
ANALYZE drivers;
ANALYZE vehicles;
ANALYZE catering_vouchers;
ANALYZE hotel_reservations;

-- ============================================================================
-- VÉRIFICATION
-- ============================================================================

DO $$
DECLARE
  index_count INTEGER;
BEGIN
  -- Compter les nouveaux index créés
  SELECT COUNT(*) INTO index_count
  FROM pg_indexes
  WHERE schemaname = 'public'
  AND (
    indexname LIKE 'idx_missions_%'
    OR indexname LIKE 'idx_travels_%'
    OR indexname LIKE 'idx_catering_%'
    OR indexname LIKE 'idx_drivers_%'
    OR indexname LIKE 'idx_vehicles_%'
    OR indexname LIKE 'idx_hotel_%'
    OR indexname LIKE 'idx_staff_%'
    OR indexname LIKE 'idx_bases_%'
    OR indexname LIKE 'idx_travel_details_%'
  );
  
  RAISE NOTICE 'Migration 20251114_150300 appliquée avec succès - % index créés', index_count;
END $$;





