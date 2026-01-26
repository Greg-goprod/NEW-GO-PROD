-- Migration: Ajout colonne performance_date à artist_touring_party
-- Date: 2025-11-14
-- Description: Permet de différencier les touring parties par date de performance

-- ============================================================================
-- AJOUT COLONNE PERFORMANCE_DATE
-- ============================================================================

DO $$
BEGIN
  -- Ajouter la colonne si elle n'existe pas
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'artist_touring_party' 
    AND column_name = 'performance_date'
  ) THEN
    ALTER TABLE artist_touring_party 
      ADD COLUMN performance_date DATE;
    
    RAISE NOTICE 'Colonne performance_date ajoutée';
  ELSE
    RAISE NOTICE 'Colonne performance_date existe déjà';
  END IF;
END $$;

-- ============================================================================
-- MIGRATION DES DONNÉES EXISTANTES
-- ============================================================================

-- Mettre à jour les entrées existantes avec une date par défaut
-- (à ajuster selon les besoins réels)
UPDATE artist_touring_party
SET performance_date = (
  SELECT MIN(date) 
  FROM event_days 
  WHERE event_id = artist_touring_party.event_id
)
WHERE performance_date IS NULL;

-- ============================================================================
-- MODIFICATION CONTRAINTE UNIQUE
-- ============================================================================

DO $$
BEGIN
  -- Supprimer l'ancienne contrainte unique si elle existe
  IF EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'uq_touring_party_artist_event'
    OR indexname = 'artist_touring_party_event_id_artist_id_key'
  ) THEN
    DROP INDEX IF EXISTS uq_touring_party_artist_event CASCADE;
    DROP INDEX IF EXISTS artist_touring_party_event_id_artist_id_key CASCADE;
    RAISE NOTICE 'Anciennes contraintes UNIQUE supprimées';
  END IF;
  
  -- Créer nouvelle contrainte UNIQUE incluant performance_date
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'uq_touring_party_artist_date_event'
  ) THEN
    CREATE UNIQUE INDEX uq_touring_party_artist_date_event 
      ON artist_touring_party(artist_id, performance_date, event_id)
      WHERE performance_date IS NOT NULL;
    
    RAISE NOTICE 'Nouvelle contrainte UNIQUE créée';
  END IF;
END $$;

-- ============================================================================
-- INDEX SUPPLÉMENTAIRE SUR PERFORMANCE_DATE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_touring_party_performance_date 
  ON artist_touring_party(performance_date)
  WHERE performance_date IS NOT NULL;

-- ============================================================================
-- COMMENTAIRES
-- ============================================================================

COMMENT ON COLUMN artist_touring_party.performance_date IS 
  'Date de la performance pour cette touring party. Permet plusieurs touring parties pour un même artiste à des dates différentes';

-- ============================================================================
-- VÉRIFICATION
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'artist_touring_party' 
    AND column_name = 'performance_date'
  ) THEN
    RAISE EXCEPTION 'Colonne performance_date non créée';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'uq_touring_party_artist_date_event'
  ) THEN
    RAISE EXCEPTION 'Index uq_touring_party_artist_date_event non créé';
  END IF;
  
  RAISE NOTICE 'Migration 20251114_150200 appliquée avec succès';
END $$;





