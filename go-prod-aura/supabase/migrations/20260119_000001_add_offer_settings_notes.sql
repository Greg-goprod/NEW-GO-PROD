-- =============================================================================
-- MIGRATION: Ajout des colonnes extras_note et exclusivity_note
-- Date: 2026-01-19
-- Description: Ajoute les champs de notes pour les sections Extras et 
--              Clauses d'exclusivite dans offer_settings
-- =============================================================================

-- Ajout de la colonne extras_note
ALTER TABLE public.offer_settings
ADD COLUMN IF NOT EXISTS extras_note TEXT;

-- Ajout de la colonne exclusivity_note
ALTER TABLE public.offer_settings
ADD COLUMN IF NOT EXISTS exclusivity_note TEXT;

-- Commentaires
COMMENT ON COLUMN offer_settings.extras_note IS 'Note d''introduction pour la section extras';
COMMENT ON COLUMN offer_settings.exclusivity_note IS 'Note d''introduction pour la section clauses d''exclusivite';
