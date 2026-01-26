-- =============================================================================
-- MIGRATION SYSTÈME DE BOOKING COMPLET
-- Date : 2025-11-14
-- Description : Création de toutes les tables nécessaires au système de booking
--               avec extras, clauses d'exclusivité et versioning
-- =============================================================================

-- =============================================================================
-- 1. TABLE OFFERS (Principale)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  
  -- Relations
  artist_id UUID REFERENCES artists(id) ON DELETE SET NULL,
  stage_id UUID REFERENCES event_stages(id) ON DELETE SET NULL,
  agency_contact_id UUID REFERENCES crm_contacts(id) ON DELETE SET NULL,
  
  -- Données cachées (pour affichage si relations supprimées)
  artist_name TEXT,
  stage_name TEXT,
  
  -- Date/Heure
  date_time TIMESTAMPTZ,
  performance_time TEXT, -- Format: 'HH:MM:SS' ou 'TBC'
  duration_minutes INTEGER,
  
  -- Financier de base
  currency TEXT CHECK (currency IN ('EUR', 'GBP', 'USD', 'CHF')) DEFAULT 'EUR',
  amount_net NUMERIC(12,2),
  amount_gross NUMERIC(12,2),
  amount_display NUMERIC(12,2), -- Montant affiché dans le contrat
  amount_is_net BOOLEAN DEFAULT false,
  amount_gross_is_subject_to_withholding BOOLEAN DEFAULT false,
  withholding_note TEXT, -- Note explicative si soumis à l'impôt
  agency_commission_pct NUMERIC(5,2),
  
  -- Frais additionnels (6 types)
  prod_fee_amount NUMERIC(12,2),
  prod_fee_currency TEXT CHECK (prod_fee_currency IN ('EUR', 'GBP', 'USD', 'CHF')),
  
  backline_fee_amount NUMERIC(12,2),
  backline_fee_currency TEXT CHECK (backline_fee_currency IN ('EUR', 'GBP', 'USD', 'CHF')),
  
  buyout_hotel_amount NUMERIC(12,2),
  buyout_hotel_currency TEXT CHECK (buyout_hotel_currency IN ('EUR', 'GBP', 'USD', 'CHF')),
  
  buyout_meal_amount NUMERIC(12,2),
  buyout_meal_currency TEXT CHECK (buyout_meal_currency IN ('EUR', 'GBP', 'USD', 'CHF')),
  
  flight_contribution_amount NUMERIC(12,2),
  flight_contribution_currency TEXT CHECK (flight_contribution_currency IN ('EUR', 'GBP', 'USD', 'CHF')),
  
  technical_fee_amount NUMERIC(12,2),
  technical_fee_currency TEXT CHECK (technical_fee_currency IN ('EUR', 'GBP', 'USD', 'CHF')),
  
  -- Versioning
  version INTEGER DEFAULT 1,
  original_offer_id UUID REFERENCES offers(id) ON DELETE SET NULL,
  
  -- Autres
  validity_date DATE, -- Date limite de validité de l'offre (DEADLINE)
  terms_json JSONB DEFAULT '{}', -- Clauses d'exclusivité { "selectedClauseIds": ["uuid1", "uuid2"] }
  status TEXT CHECK (status IN ('draft', 'ready_to_send', 'sent', 'accepted', 'rejected')) DEFAULT 'draft',
  pdf_storage_path TEXT, -- Chemin dans Supabase Storage
  
  -- Dates importantes
  ready_to_send_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  rejection_reason TEXT,
  
  -- Metadata
  created_by UUID DEFAULT auth.uid(),
  created_at TIMESTAMPTZ DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ DEFAULT timezone('utc', now())
);

-- Index pour performances
CREATE INDEX IF NOT EXISTS idx_offers_company_id ON offers(company_id);
CREATE INDEX IF NOT EXISTS idx_offers_event_id ON offers(event_id);
CREATE INDEX IF NOT EXISTS idx_offers_artist_id ON offers(artist_id);
CREATE INDEX IF NOT EXISTS idx_offers_original_offer_id ON offers(original_offer_id);
CREATE INDEX IF NOT EXISTS idx_offers_status ON offers(status);
CREATE INDEX IF NOT EXISTS idx_offers_created_at ON offers(created_at DESC);

-- Trigger updated_at
CREATE OR REPLACE TRIGGER trg_offers_updated_at
BEFORE UPDATE ON public.offers
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Commentaires
COMMENT ON TABLE offers IS 'Offres artistes avec versioning complet';
COMMENT ON COLUMN offers.amount_is_net IS 'true = montant net de taxes, false = montant brut';
COMMENT ON COLUMN offers.amount_gross_is_subject_to_withholding IS 'true = montant brut soumis à l''impôt à la source';
COMMENT ON COLUMN offers.version IS 'Numéro de version (1, 2, 3...)';
COMMENT ON COLUMN offers.original_offer_id IS 'Lien vers la version 1 (NULL si c''est la v1)';
COMMENT ON COLUMN offers.terms_json IS 'Clauses d''exclusivité sélectionnées au format JSON';

-- =============================================================================
-- 2. TABLE BOOKING_EXTRAS (Référentiel)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.booking_extras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 100,
  created_at TIMESTAMPTZ DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ DEFAULT timezone('utc', now())
);

-- Trigger updated_at
CREATE OR REPLACE TRIGGER trg_booking_extras_updated_at
BEFORE UPDATE ON public.booking_extras
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Index
CREATE INDEX IF NOT EXISTS idx_booking_extras_active ON booking_extras(is_active);

COMMENT ON TABLE booking_extras IS 'Référentiel des extras bookés (backline, hébergement, etc.)';

-- =============================================================================
-- 3. TABLE OFFER_EXTRAS (Liaison Offers ↔ Booking Extras)
-- =============================================================================
-- Note: La table existe déjà mais vérifions sa structure
DO $$
BEGIN
  -- Vérifier si la colonne charge_to existe, sinon la créer
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'offer_extras' AND column_name = 'charge_to'
  ) THEN
    ALTER TABLE offer_extras ADD COLUMN charge_to TEXT CHECK (charge_to IN ('artist', 'festival'));
    COMMENT ON COLUMN offer_extras.charge_to IS 'Qui paie: artist ou festival (mutuellement exclusif)';
  END IF;
  
  -- Vérifier si la colonne extra_id existe, sinon la créer
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'offer_extras' AND column_name = 'extra_id'
  ) THEN
    ALTER TABLE offer_extras ADD COLUMN extra_id UUID REFERENCES booking_extras(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_offer_extras_extra_id ON offer_extras(extra_id);
  END IF;
END $$;

-- Contrainte unique
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_offer_extras_offer_extra'
  ) THEN
    ALTER TABLE offer_extras ADD CONSTRAINT uq_offer_extras_offer_extra UNIQUE(offer_id, extra_id);
  END IF;
END $$;

COMMENT ON TABLE offer_extras IS 'Liaison entre offres et extras (avec assignation artist/festival)';

-- =============================================================================
-- 4. TABLE EXCLUSIVITY_CLAUSES (Référentiel)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.exclusivity_clauses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  text TEXT NOT NULL,
  category TEXT, -- 'temporelle', 'géographique', 'genre', 'festival', etc.
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 100,
  created_at TIMESTAMPTZ DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ DEFAULT timezone('utc', now())
);

-- Trigger updated_at
CREATE OR REPLACE TRIGGER trg_exclusivity_clauses_updated_at
BEFORE UPDATE ON public.exclusivity_clauses
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Index
CREATE INDEX IF NOT EXISTS idx_exclusivity_clauses_active ON exclusivity_clauses(is_active);
CREATE INDEX IF NOT EXISTS idx_exclusivity_clauses_category ON exclusivity_clauses(category);

COMMENT ON TABLE exclusivity_clauses IS 'Référentiel des clauses d''exclusivité réutilisables';

-- =============================================================================
-- 5. INSERTION DES DONNÉES DE RÉFÉRENCE
-- =============================================================================

-- 5.1 Booking Extras (depuis GO-PROD actuel)
INSERT INTO booking_extras (id, name, description, is_active, sort_order) VALUES
('bc2cd1dd-757b-4297-bc0e-c1faa463050c', 'Backline', 'Équipement musical fourni par l''organisateur', true, 10),
('e25e47bb-dd21-46e8-bb48-b792b111680a', 'Éclairage', 'Éclairage scénique spécifique', true, 20),
('d6ee2711-c00c-47a0-b786-f2796432dab7', 'Hébergement', 'Hébergement pour l''artiste et son équipe', true, 30),
('f6fb33c3-4213-4191-bc4f-b09a899806fd', 'Restauration', 'Restauration sur place (catering)', true, 40),
('63d74a7d-4de9-401d-8008-575a2455de2f', 'Sonorisation', 'Sonorisation et équipement audio spécifique', true, 50),
('5415b35a-84f7-400f-a6e7-0c0b9044e73b', 'Transport local', 'Transport local depuis/vers l''aéroport ou la gare', true, 60)
ON CONFLICT (id) DO NOTHING;

-- 5.2 Exclusivity Clauses (depuis GO-PROD actuel)
INSERT INTO exclusivity_clauses (id, text, category, is_active, sort_order) VALUES
-- Clauses géographiques
('b8702206-b828-4869-859d-5299149336ae', 'Exclusivité géographique (rayon 100km)', 'géographique', true, 10),
('3c0cb6a4-c564-4744-9cfc-abfd30d96d67', 'Exclusivité géographique (rayon 200km)', 'géographique', true, 20),
('0dc83650-ff8d-4da9-85e1-9a0d9c4586f4', 'Exclusivité géographique (rayon 50km)', 'géographique', true, 30),

-- Clauses temporelles
('ce752c08-edc1-4515-8774-ccba4d808fa5', 'Exclusivité temporelle (1 mois avant)', 'temporelle', true, 40),
('3e9000e2-6df5-4da8-ac0a-06f5ba8a38bc', 'Exclusivité temporelle (1 mois après)', 'temporelle', true, 50),
('09b63fa4-cb3b-4601-ad30-9d0165025043', 'Exclusivité temporelle (2 mois avant)', 'temporelle', true, 60),
('184eeff5-41c0-4cd0-bfbc-0bcff01cc8a0', 'Exclusivité temporelle (2 mois après)', 'temporelle', true, 70),
('711d9db8-ed9c-4cb4-a964-c55b3e240152', 'Exclusivité temporelle (3 mois avant)', 'temporelle', true, 80),
('bd59503d-d910-4e3a-bdf2-4a0271c0a36f', 'Exclusivité temporelle (3 mois après)', 'temporelle', true, 90),

-- Autres clauses
('27ec9865-5062-467b-a3af-e83d76bf5a67', 'Exclusivité de festival', 'festival', true, 100),
('12189884-4b61-4a62-bddb-50b1a1db1954', 'Exclusivité de genre musical', 'genre', true, 110),
('8d5049ba-20b9-43ba-b93b-c271d2735649', 'Exclusivité de label/maison de disques', 'label', true, 120)
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- 6. RLS (Row Level Security) - À activer en production
-- =============================================================================

-- Offers
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view offers of their company" ON offers;
CREATE POLICY "Users can view offers of their company"
ON offers FOR SELECT
USING (company_id = auth_company_id());

DROP POLICY IF EXISTS "Users can insert offers for their company" ON offers;
CREATE POLICY "Users can insert offers for their company"
ON offers FOR INSERT
WITH CHECK (company_id = auth_company_id());

DROP POLICY IF EXISTS "Users can update offers of their company" ON offers;
CREATE POLICY "Users can update offers of their company"
ON offers FOR UPDATE
USING (company_id = auth_company_id())
WITH CHECK (company_id = auth_company_id());

DROP POLICY IF EXISTS "Users can delete offers of their company" ON offers;
CREATE POLICY "Users can delete offers of their company"
ON offers FOR DELETE
USING (company_id = auth_company_id());

-- Offer Extras
ALTER TABLE offer_extras ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view offer extras of their company" ON offer_extras;
CREATE POLICY "Users can view offer extras of their company"
ON offer_extras FOR SELECT
USING (company_id = auth_company_id());

DROP POLICY IF EXISTS "Users can insert offer extras for their company" ON offer_extras;
CREATE POLICY "Users can insert offer extras for their company"
ON offer_extras FOR INSERT
WITH CHECK (company_id = auth_company_id());

DROP POLICY IF EXISTS "Users can update offer extras of their company" ON offer_extras;
CREATE POLICY "Users can update offer extras of their company"
ON offer_extras FOR UPDATE
USING (company_id = auth_company_id())
WITH CHECK (company_id = auth_company_id());

DROP POLICY IF EXISTS "Users can delete offer extras of their company" ON offer_extras;
CREATE POLICY "Users can delete offer extras of their company"
ON offer_extras FOR DELETE
USING (company_id = auth_company_id());

-- Booking Extras (lecture publique, gestion admin)
ALTER TABLE booking_extras ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Everyone can view active booking extras" ON booking_extras;
CREATE POLICY "Everyone can view active booking extras"
ON booking_extras FOR SELECT
USING (is_active = true);

-- Exclusivity Clauses (lecture publique, gestion admin)
ALTER TABLE exclusivity_clauses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Everyone can view active exclusivity clauses" ON exclusivity_clauses;
CREATE POLICY "Everyone can view active exclusivity clauses"
ON exclusivity_clauses FOR SELECT
USING (is_active = true);

-- =============================================================================
-- 7. FONCTION HELPER : Créer une nouvelle version d'offre
-- =============================================================================
CREATE OR REPLACE FUNCTION public.create_offer_version(
  p_original_offer_id UUID,
  p_new_offer_data JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_offer_id UUID;
  v_current_max_version INTEGER;
  v_new_version INTEGER;
BEGIN
  -- Récupérer la version maximale existante
  SELECT COALESCE(MAX(version), 0) INTO v_current_max_version
  FROM offers
  WHERE original_offer_id = p_original_offer_id
     OR id = p_original_offer_id;
  
  v_new_version := v_current_max_version + 1;
  
  -- Créer la nouvelle offre avec version incrémentée
  INSERT INTO offers (
    company_id, event_id, artist_id, stage_id, agency_contact_id,
    artist_name, stage_name, date_time, performance_time, duration_minutes,
    currency, amount_net, amount_gross, amount_display,
    amount_is_net, amount_gross_is_subject_to_withholding, withholding_note,
    agency_commission_pct, validity_date, terms_json, status,
    prod_fee_amount, prod_fee_currency,
    backline_fee_amount, backline_fee_currency,
    buyout_hotel_amount, buyout_hotel_currency,
    buyout_meal_amount, buyout_meal_currency,
    flight_contribution_amount, flight_contribution_currency,
    technical_fee_amount, technical_fee_currency,
    version, original_offer_id
  )
  SELECT 
    (p_new_offer_data->>'company_id')::UUID,
    (p_new_offer_data->>'event_id')::UUID,
    (p_new_offer_data->>'artist_id')::UUID,
    (p_new_offer_data->>'stage_id')::UUID,
    (p_new_offer_data->>'agency_contact_id')::UUID,
    p_new_offer_data->>'artist_name',
    p_new_offer_data->>'stage_name',
    (p_new_offer_data->>'date_time')::TIMESTAMPTZ,
    p_new_offer_data->>'performance_time',
    (p_new_offer_data->>'duration_minutes')::INTEGER,
    p_new_offer_data->>'currency',
    (p_new_offer_data->>'amount_net')::NUMERIC,
    (p_new_offer_data->>'amount_gross')::NUMERIC,
    (p_new_offer_data->>'amount_display')::NUMERIC,
    (p_new_offer_data->>'amount_is_net')::BOOLEAN,
    (p_new_offer_data->>'amount_gross_is_subject_to_withholding')::BOOLEAN,
    p_new_offer_data->>'withholding_note',
    (p_new_offer_data->>'agency_commission_pct')::NUMERIC,
    (p_new_offer_data->>'validity_date')::DATE,
    (p_new_offer_data->>'terms_json')::JSONB,
    COALESCE(p_new_offer_data->>'status', 'draft'),
    (p_new_offer_data->>'prod_fee_amount')::NUMERIC,
    p_new_offer_data->>'prod_fee_currency',
    (p_new_offer_data->>'backline_fee_amount')::NUMERIC,
    p_new_offer_data->>'backline_fee_currency',
    (p_new_offer_data->>'buyout_hotel_amount')::NUMERIC,
    p_new_offer_data->>'buyout_hotel_currency',
    (p_new_offer_data->>'buyout_meal_amount')::NUMERIC,
    p_new_offer_data->>'buyout_meal_currency',
    (p_new_offer_data->>'flight_contribution_amount')::NUMERIC,
    p_new_offer_data->>'flight_contribution_currency',
    (p_new_offer_data->>'technical_fee_amount')::NUMERIC,
    p_new_offer_data->>'technical_fee_currency',
    v_new_version,
    p_original_offer_id
  RETURNING id INTO v_new_offer_id;
  
  RETURN v_new_offer_id;
END;
$$;

COMMENT ON FUNCTION create_offer_version IS 'Crée une nouvelle version d''une offre existante avec versioning automatique';

-- =============================================================================
-- 8. VUE : Offres avec informations enrichies
-- =============================================================================
CREATE OR REPLACE VIEW public.offers_enriched AS
SELECT 
  o.*,
  a.name AS artist_full_name,
  es.name AS stage_full_name,
  cc.display_name AS contact_name,
  cc.email_primary AS contact_email,
  e.name AS event_name,
  -- Compter le nombre d'extras
  (SELECT COUNT(*) FROM offer_extras oe WHERE oe.offer_id = o.id) AS extras_count,
  -- Version textuelle
  CASE 
    WHEN o.version = 1 THEN 'v1 (original)'
    ELSE 'v' || o.version::TEXT
  END AS version_label
FROM offers o
LEFT JOIN artists a ON o.artist_id = a.id
LEFT JOIN event_stages es ON o.stage_id = es.id
LEFT JOIN crm_contacts cc ON o.agency_contact_id = cc.id
LEFT JOIN events e ON o.event_id = e.id;

COMMENT ON VIEW offers_enriched IS 'Vue enrichie des offres avec toutes les relations jointes';

-- =============================================================================
-- FIN DE LA MIGRATION
-- =============================================================================


