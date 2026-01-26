-- Migration: Ajout des tables manquantes
-- Date: 2025-11-14
-- Description: Crée les tables bases, travel_details et waiting_time manquantes

-- ============================================================================
-- TABLE BASES (Bases de départ pour missions)
-- ============================================================================

CREATE TABLE IF NOT EXISTS bases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  postal_code TEXT,
  country TEXT DEFAULT 'CH',
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE bases IS 'Bases de départ pour les missions de transport';
COMMENT ON COLUMN bases.latitude IS 'Latitude GPS pour calcul d''itinéraires';
COMMENT ON COLUMN bases.longitude IS 'Longitude GPS pour calcul d''itinéraires';

-- Index
CREATE INDEX IF NOT EXISTS idx_bases_company ON bases(company_id);

-- Trigger updated_at
CREATE TRIGGER tr_update_bases_updated_at
  BEFORE UPDATE ON bases
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- TABLE TRAVEL_DETAILS (Détails supplémentaires des voyages)
-- ============================================================================

CREATE TABLE IF NOT EXISTS travel_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  travel_id UUID NOT NULL REFERENCES travels(id) ON DELETE CASCADE,
  reference_number TEXT,      -- Numéro de vol, train, réservation
  departure_location TEXT,    -- Aéroport, gare de départ
  arrival_location TEXT,      -- Aéroport, gare d'arrivée
  terminal_info TEXT,         -- Terminal, quai, porte
  seat_number TEXT,           -- Numéro de siège
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE travel_details IS 'Détails spécifiques au type de transport (vol, train, etc.)';
COMMENT ON COLUMN travel_details.reference_number IS 'Numéro de vol, train ou réservation';

-- Index
CREATE INDEX IF NOT EXISTS idx_travel_details_travel ON travel_details(travel_id);

-- ============================================================================
-- TABLE WAITING_TIME (Temps d'attente par type de lieu)
-- ============================================================================

CREATE TABLE IF NOT EXISTS waiting_time (
  place_type VARCHAR(32) PRIMARY KEY,
  minutes SMALLINT NOT NULL CHECK (minutes >= 0),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE waiting_time IS 'Temps d''attente standard par type de lieu (aéroport, hôtel, etc.)';
COMMENT ON COLUMN waiting_time.place_type IS 'Type de lieu : airport, hotel, train_station, venue, other';
COMMENT ON COLUMN waiting_time.minutes IS 'Temps d''attente en minutes';

-- Trigger updated_at
CREATE TRIGGER tr_update_waiting_time_updated_at
  BEFORE UPDATE ON waiting_time
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Données initiales
INSERT INTO waiting_time (place_type, minutes, description) VALUES
  ('airport', 45, 'Temps d''attente standard pour aéroports'),
  ('hotel', 10, 'Temps d''attente standard pour hôtels'),
  ('train_station', 15, 'Temps d''attente standard pour gares'),
  ('venue', 10, 'Temps d''attente lieu événement'),
  ('other', 10, 'Temps d''attente par défaut')
ON CONFLICT (place_type) DO UPDATE SET
  minutes = EXCLUDED.minutes,
  description = EXCLUDED.description,
  updated_at = NOW();

-- ============================================================================
-- VÉRIFICATION
-- ============================================================================

-- Vérifier que les tables existent
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'bases') THEN
    RAISE EXCEPTION 'Table bases non créée';
  END IF;
  
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'travel_details') THEN
    RAISE EXCEPTION 'Table travel_details non créée';
  END IF;
  
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'waiting_time') THEN
    RAISE EXCEPTION 'Table waiting_time non créée';
  END IF;
  
  RAISE NOTICE 'Migration 20251114_150000 appliquée avec succès';
END $$;





