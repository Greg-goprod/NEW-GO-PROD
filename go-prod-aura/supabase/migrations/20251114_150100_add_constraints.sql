-- Migration: Ajout des contraintes CHECK manquantes
-- Date: 2025-11-14
-- Description: Ajoute les contraintes de validation sur les tables

-- ============================================================================
-- CONTRAINTES TRAVELS
-- ============================================================================

-- XOR : Soit artist_id, soit contact_id (mais pas les deux, ni aucun)
DO $$
BEGIN
  -- Supprimer contrainte si elle existe déjà
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'chk_travels_person' 
    AND conrelid = 'travels'::regclass
  ) THEN
    ALTER TABLE travels DROP CONSTRAINT chk_travels_person;
  END IF;
  
  -- Ajouter la contrainte
  ALTER TABLE travels ADD CONSTRAINT chk_travels_person CHECK (
    (artist_id IS NOT NULL AND contact_id IS NULL) OR
    (artist_id IS NULL AND contact_id IS NOT NULL)
  );
  
  RAISE NOTICE 'Contrainte chk_travels_person ajoutée';
END $$;

-- ============================================================================
-- CONTRAINTES SHIFTS
-- ============================================================================

-- Dates cohérentes : end_datetime > start_datetime
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'chk_shifts_dates'
    AND conrelid = 'shifts'::regclass
  ) THEN
    ALTER TABLE shifts DROP CONSTRAINT chk_shifts_dates;
  END IF;
  
  ALTER TABLE shifts ADD CONSTRAINT chk_shifts_dates CHECK (
    end_datetime > start_datetime
  );
  
  RAISE NOTICE 'Contrainte chk_shifts_dates ajoutée';
END $$;

-- ============================================================================
-- CONTRAINTES HOTEL_RESERVATIONS
-- ============================================================================

-- Dates cohérentes : check_out_date > check_in_date
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'chk_hotel_dates'
    AND conrelid = 'hotel_reservations'::regclass
  ) THEN
    ALTER TABLE hotel_reservations DROP CONSTRAINT chk_hotel_dates;
  END IF;
  
  ALTER TABLE hotel_reservations ADD CONSTRAINT chk_hotel_dates CHECK (
    check_out_date > check_in_date
  );
  
  RAISE NOTICE 'Contrainte chk_hotel_dates ajoutée';
END $$;

-- ============================================================================
-- CONTRAINTES MISSIONS
-- ============================================================================

-- passenger_count > 0
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'chk_missions_passenger_count'
    AND conrelid = 'missions'::regclass
  ) THEN
    ALTER TABLE missions DROP CONSTRAINT chk_missions_passenger_count;
  END IF;
  
  ALTER TABLE missions ADD CONSTRAINT chk_missions_passenger_count CHECK (
    passenger_count > 0
  );
  
  RAISE NOTICE 'Contrainte chk_missions_passenger_count ajoutée';
END $$;

-- dropoff_datetime > pickup_datetime (si les deux sont définis)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'chk_missions_datetime'
    AND conrelid = 'missions'::regclass
  ) THEN
    ALTER TABLE missions DROP CONSTRAINT chk_missions_datetime;
  END IF;
  
  ALTER TABLE missions ADD CONSTRAINT chk_missions_datetime CHECK (
    dropoff_datetime IS NULL OR 
    pickup_datetime IS NULL OR 
    dropoff_datetime > pickup_datetime
  );
  
  RAISE NOTICE 'Contrainte chk_missions_datetime ajoutée';
END $$;

-- ============================================================================
-- CONTRAINTES CATERING_REQUIREMENTS
-- ============================================================================

-- Au moins une quantité > 0
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'chk_catering_requirements_count'
    AND conrelid = 'catering_requirements'::regclass
  ) THEN
    ALTER TABLE catering_requirements DROP CONSTRAINT chk_catering_requirements_count;
  END IF;
  
  ALTER TABLE catering_requirements ADD CONSTRAINT chk_catering_requirements_count CHECK (
    count > 0
  );
  
  RAISE NOTICE 'Contrainte chk_catering_requirements_count ajoutée';
END $$;

-- ============================================================================
-- VÉRIFICATION
-- ============================================================================

DO $$
BEGIN
  -- Vérifier que toutes les contraintes sont en place
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'chk_travels_person'
  ) THEN
    RAISE EXCEPTION 'Contrainte chk_travels_person non créée';
  END IF;
  
  RAISE NOTICE 'Migration 20251114_150100 appliquée avec succès';
END $$;





