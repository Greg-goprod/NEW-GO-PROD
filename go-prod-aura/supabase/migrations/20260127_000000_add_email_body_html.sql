-- =============================================================================
-- MIGRATION: Ajout du champ email_body_html dans offer_settings
-- Date: 2026-01-27
-- Description: Ajoute un champ pour stocker le corps HTML des emails d'offres
-- =============================================================================

ALTER TABLE public.offer_settings
ADD COLUMN IF NOT EXISTS email_body_html TEXT;

COMMENT ON COLUMN offer_settings.email_body_html IS 'Corps HTML par defaut pour les emails d''offres';
