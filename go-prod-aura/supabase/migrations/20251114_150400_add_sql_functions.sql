-- Migration: Ajout des fonctions SQL utilitaires
-- Date: 2025-11-14
-- Description: Fonctions pour calculs automatiques et opérations métier

-- ============================================================================
-- FONCTION: Calcul start_at pour missions
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_mission_start_at(
  p_flight_arrival TIMESTAMPTZ,
  p_base_to_pickup_duration INTEGER
)
RETURNS TIMESTAMPTZ AS $$
BEGIN
  -- Validation des paramètres
  IF p_flight_arrival IS NULL OR p_base_to_pickup_duration IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Calcul : arrivée vol - durée trajet
  RETURN p_flight_arrival - (p_base_to_pickup_duration || ' minutes')::INTERVAL;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION calculate_mission_start_at IS 
  'Calcule l''heure de départ de la base pour arriver à temps au pickup';

-- ============================================================================
-- FONCTION: Calcul start_at avec waiting_time
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_mission_start_at_with_waiting(
  p_pickup_datetime TIMESTAMPTZ,
  p_base_to_pickup_duration INTEGER,
  p_pickup_type VARCHAR DEFAULT 'other'
)
RETURNS TIMESTAMPTZ AS $$
DECLARE
  waiting_minutes INTEGER;
BEGIN
  -- Validation
  IF p_pickup_datetime IS NULL OR p_base_to_pickup_duration IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Récupérer le temps d'attente
  SELECT minutes INTO waiting_minutes
  FROM waiting_time
  WHERE place_type = p_pickup_type;
  
  -- Fallback si type non trouvé
  IF waiting_minutes IS NULL THEN
    waiting_minutes := 10;
  END IF;
  
  -- Calcul : pickup - trajet - waiting
  RETURN p_pickup_datetime 
    - (p_base_to_pickup_duration || ' minutes')::INTERVAL
    - (waiting_minutes || ' minutes')::INTERVAL;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION calculate_mission_start_at_with_waiting IS 
  'Calcule l''heure de départ en incluant le temps d''attente du lieu';

-- ============================================================================
-- FONCTION: Dispatch mission (assignation chauffeur + véhicule)
-- ============================================================================

CREATE OR REPLACE FUNCTION assign_mission_driver(
  p_mission_id UUID,
  p_vehicle_id UUID,
  p_driver_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  rows_affected INTEGER;
BEGIN
  -- Vérifier que la mission est dans un état assignable
  UPDATE missions 
  SET 
    vehicle_id = p_vehicle_id,
    driver_id = p_driver_id,
    status = 'dispatched',
    updated_at = NOW()
  WHERE id = p_mission_id 
    AND status IN ('draft', 'planned', 'unplanned');
  
  GET DIAGNOSTICS rows_affected = ROW_COUNT;
  
  -- Retourner true si au moins une ligne affectée
  RETURN rows_affected > 0;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION assign_mission_driver IS 
  'Assigne un chauffeur et un véhicule à une mission et passe le statut à dispatched';

-- ============================================================================
-- FONCTION: Récupération touring party par événement
-- ============================================================================

CREATE OR REPLACE FUNCTION get_artist_touring_party_by_event(event_id_param UUID)
RETURNS TABLE (
  id UUID,
  event_id UUID,
  artist_id UUID,
  artist_name TEXT,
  performance_date DATE,
  group_size INTEGER,
  vehicles JSONB,
  notes TEXT,
  special_requirements TEXT,
  status TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    atp.id,
    atp.event_id,
    atp.artist_id,
    a.name as artist_name,
    atp.performance_date,
    atp.group_size,
    atp.vehicles,
    atp.notes,
    atp.special_requirements,
    atp.status,
    atp.created_at,
    atp.updated_at
  FROM artist_touring_party atp
  JOIN artists a ON atp.artist_id = a.id
  WHERE atp.event_id = event_id_param
  ORDER BY atp.performance_date NULLS LAST, a.name;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_artist_touring_party_by_event IS 
  'Récupère toutes les touring parties d''un événement avec les noms d''artistes';

-- ============================================================================
-- FONCTION: Récupération temps d'attente par type de lieu
-- ============================================================================

CREATE OR REPLACE FUNCTION get_waiting_time(p_place_type VARCHAR)
RETURNS INTEGER AS $$
DECLARE
  wait_minutes INTEGER;
BEGIN
  SELECT minutes INTO wait_minutes
  FROM waiting_time
  WHERE place_type = p_place_type;
  
  -- Fallback si non trouvé
  IF wait_minutes IS NULL THEN
    RETURN 10;
  END IF;
  
  RETURN wait_minutes;
EXCEPTION
  WHEN OTHERS THEN
    RETURN 10; -- Fallback par défaut
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_waiting_time IS 
  'Retourne le temps d''attente en minutes pour un type de lieu donné';

-- ============================================================================
-- FONCTION: Vérifier disponibilité chauffeur
-- ============================================================================

CREATE OR REPLACE FUNCTION check_driver_availability(
  p_driver_id UUID,
  p_start_datetime TIMESTAMPTZ,
  p_end_datetime TIMESTAMPTZ,
  p_exclude_mission_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  conflict_count INTEGER;
BEGIN
  -- Compter les missions conflictuelles
  SELECT COUNT(*) INTO conflict_count
  FROM missions
  WHERE driver_id = p_driver_id
    AND (id != p_exclude_mission_id OR p_exclude_mission_id IS NULL)
    AND status IN ('planned', 'dispatched', 'in_progress')
    AND (
      -- La mission chevauche le créneau demandé
      (pickup_datetime, dropoff_datetime) OVERLAPS (p_start_datetime, p_end_datetime)
    );
  
  RETURN conflict_count = 0;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION check_driver_availability IS 
  'Vérifie si un chauffeur est disponible sur un créneau horaire donné';

-- ============================================================================
-- FONCTION: Vérifier disponibilité véhicule
-- ============================================================================

CREATE OR REPLACE FUNCTION check_vehicle_availability(
  p_vehicle_id UUID,
  p_start_datetime TIMESTAMPTZ,
  p_end_datetime TIMESTAMPTZ,
  p_exclude_mission_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  conflict_count INTEGER;
BEGIN
  -- Compter les missions conflictuelles
  SELECT COUNT(*) INTO conflict_count
  FROM missions
  WHERE vehicle_id = p_vehicle_id
    AND (id != p_exclude_mission_id OR p_exclude_mission_id IS NULL)
    AND status IN ('planned', 'dispatched', 'in_progress')
    AND (
      (pickup_datetime, dropoff_datetime) OVERLAPS (p_start_datetime, p_end_datetime)
    );
  
  RETURN conflict_count = 0;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION check_vehicle_availability IS 
  'Vérifie si un véhicule est disponible sur un créneau horaire donné';

-- ============================================================================
-- FONCTION: Compter total repas catering
-- ============================================================================

CREATE OR REPLACE FUNCTION get_catering_totals_by_event(event_id_param UUID)
RETURNS TABLE (
  meal_type TEXT,
  total_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cr.meal_type::TEXT,
    SUM(cr.count)::INTEGER as total_count
  FROM catering_requirements cr
  WHERE cr.event_id = event_id_param
  GROUP BY cr.meal_type
  ORDER BY cr.meal_type;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_catering_totals_by_event IS 
  'Retourne les totaux de repas par type pour un événement';

-- ============================================================================
-- VÉRIFICATION
-- ============================================================================

DO $$
DECLARE
  function_count INTEGER;
BEGIN
  -- Compter les fonctions créées
  SELECT COUNT(*) INTO function_count
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
  AND p.proname IN (
    'calculate_mission_start_at',
    'calculate_mission_start_at_with_waiting',
    'assign_mission_driver',
    'get_artist_touring_party_by_event',
    'get_waiting_time',
    'check_driver_availability',
    'check_vehicle_availability',
    'get_catering_totals_by_event'
  );
  
  IF function_count < 8 THEN
    RAISE WARNING 'Seulement % fonctions créées sur 8 attendues', function_count;
  END IF;
  
  RAISE NOTICE 'Migration 20251114_150400 appliquée avec succès - % fonctions créées', function_count;
END $$;





