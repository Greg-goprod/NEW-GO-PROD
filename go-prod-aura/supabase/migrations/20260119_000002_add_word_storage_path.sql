-- =============================================================================
-- MIGRATION: Ajout de la colonne word_storage_path dans offers
-- Date: 2026-01-19
-- Description: Stocke le chemin du document Word genere pour chaque offre
-- =============================================================================

-- Ajout de la colonne word_storage_path
ALTER TABLE public.offers
ADD COLUMN IF NOT EXISTS word_storage_path TEXT;

-- Commentaire
COMMENT ON COLUMN offers.word_storage_path IS 'Chemin du document Word genere dans le bucket offers';
