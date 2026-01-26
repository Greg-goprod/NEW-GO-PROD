-- =============================================================================
-- MIGRATION: Table offer_settings
-- Date: 2026-01-19
-- Description: Stocke les parametres par defaut des offres pour chaque company
--              (transports, paiements, clauses additionnelles, etc.)
-- =============================================================================

-- =============================================================================
-- 1. TABLE OFFER_SETTINGS
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.offer_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Transports locaux (note + contenu multi-lignes)
  transport_note TEXT,
  transport_content TEXT,
  
  -- Conditions de paiement (note + contenu multi-lignes)
  payment_note TEXT,
  payment_content TEXT,
  
  -- Validite de l'offre
  validity_text TEXT,
  
  -- Stage PA & Lights
  stage_pa_lights TEXT,
  
  -- Ecrans
  screens TEXT,
  
  -- Merchandising
  merchandising TEXT,
  
  -- Impots a la source
  withholding_taxes TEXT,
  
  -- Limitation decibels
  decibel_limit TEXT,
  
  -- Assortiments Tour Bus
  tour_bus TEXT,
  
  -- Catering / Repas
  catering_meals TEXT,
  
  -- Affiche / Artwork
  artwork TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ DEFAULT timezone('utc', now()),
  
  -- Une seule config par company
  CONSTRAINT offer_settings_company_id_key UNIQUE (company_id)
);

-- Index
CREATE INDEX IF NOT EXISTS idx_offer_settings_company_id ON offer_settings(company_id);

-- Trigger updated_at
CREATE OR REPLACE TRIGGER trg_offer_settings_updated_at
BEFORE UPDATE ON public.offer_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Commentaires
COMMENT ON TABLE offer_settings IS 'Parametres par defaut des offres par tenant (transports, paiements, clauses)';
COMMENT ON COLUMN offer_settings.transport_note IS 'Note d''introduction pour la section transports';
COMMENT ON COLUMN offer_settings.transport_content IS 'Contenu multi-lignes des transports (avec puces)';
COMMENT ON COLUMN offer_settings.payment_note IS 'Note d''introduction pour les conditions de paiement';
COMMENT ON COLUMN offer_settings.payment_content IS 'Contenu multi-lignes des conditions de paiement (avec puces)';
COMMENT ON COLUMN offer_settings.stage_pa_lights IS 'Description PA & Lights (multi-lignes)';
COMMENT ON COLUMN offer_settings.withholding_taxes IS 'Texte concernant les impots a la source';
COMMENT ON COLUMN offer_settings.decibel_limit IS 'Limitation en dB';

-- =============================================================================
-- 2. ROW LEVEL SECURITY
-- =============================================================================
ALTER TABLE public.offer_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Les utilisateurs peuvent lire les settings de leur company
DROP POLICY IF EXISTS "Offer settings readable by tenant" ON public.offer_settings;
CREATE POLICY "Offer settings readable by tenant" ON public.offer_settings
  FOR SELECT
  USING (company_id = auth_company_id());

-- Policy: Les utilisateurs peuvent inserer pour leur company
DROP POLICY IF EXISTS "Offer settings insertable by tenant" ON public.offer_settings;
CREATE POLICY "Offer settings insertable by tenant" ON public.offer_settings
  FOR INSERT
  WITH CHECK (company_id = auth_company_id());

-- Policy: Les utilisateurs peuvent modifier les settings de leur company
DROP POLICY IF EXISTS "Offer settings updatable by tenant" ON public.offer_settings;
CREATE POLICY "Offer settings updatable by tenant" ON public.offer_settings
  FOR UPDATE
  USING (company_id = auth_company_id())
  WITH CHECK (company_id = auth_company_id());

-- Policy: Les utilisateurs peuvent supprimer les settings de leur company
DROP POLICY IF EXISTS "Offer settings deletable by tenant" ON public.offer_settings;
CREATE POLICY "Offer settings deletable by tenant" ON public.offer_settings
  FOR DELETE
  USING (company_id = auth_company_id());
