-- =============================================================================
-- MIGRATION SYSTÈME DE BOOKING - Compléments
-- Date : 2025-11-14
-- Description : Ajout des champs manquants et données de référence
-- =============================================================================

-- =============================================================================
-- 1. AJOUT CHAMPS MANQUANTS DANS OFFERS
-- =============================================================================

-- Ajouter duration_minutes si pas déjà présent
ALTER TABLE offers ADD COLUMN IF NOT EXISTS duration_minutes INTEGER;

-- Ajouter les dates de workflow
ALTER TABLE offers ADD COLUMN IF NOT EXISTS ready_to_send_at TIMESTAMPTZ;
ALTER TABLE offers ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ;
ALTER TABLE offers ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ;
ALTER TABLE offers ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ;

-- Ajouter created_by si manquant
ALTER TABLE offers ADD COLUMN IF NOT EXISTS created_by UUID DEFAULT auth.uid();

-- Commentaires
COMMENT ON COLUMN offers.duration_minutes IS 'Durée de la performance en minutes';
COMMENT ON COLUMN offers.ready_to_send_at IS 'Date où l''offre a été marquée "prête à envoyer"';
COMMENT ON COLUMN offers.sent_at IS 'Date d''envoi effectif de l''offre';
COMMENT ON COLUMN offers.accepted_at IS 'Date d''acceptation de l''offre';
COMMENT ON COLUMN offers.rejected_at IS 'Date de rejet de l''offre';

-- =============================================================================
-- 2. AJOUT COLONNE CATEGORY DANS EXCLUSIVITY_CLAUSES
-- =============================================================================

ALTER TABLE exclusivity_clauses ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE exclusivity_clauses ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 100;

COMMENT ON COLUMN exclusivity_clauses.category IS 'Catégorie de clause: temporelle, géographique, genre, festival, label';

-- Index
CREATE INDEX IF NOT EXISTS idx_exclusivity_clauses_category ON exclusivity_clauses(category);

-- =============================================================================
-- 3. INSERTION DES DONNÉES DE RÉFÉRENCE
-- =============================================================================

-- 3.1 Booking Extras (depuis GO-PROD actuel)
INSERT INTO booking_extras (id, name, description, is_active, sort_order) VALUES
('bc2cd1dd-757b-4297-bc0e-c1faa463050c', 'Backline', 'Équipement musical fourni par l''organisateur', true, 10),
('e25e47bb-dd21-46e8-bb48-b792b111680a', 'Éclairage', 'Éclairage scénique spécifique', true, 20),
('d6ee2711-c00c-47a0-b786-f2796432dab7', 'Hébergement', 'Hébergement pour l''artiste et son équipe', true, 30),
('f6fb33c3-4213-4191-bc4f-b09a899806fd', 'Restauration', 'Restauration sur place (catering)', true, 40),
('63d74a7d-4de9-401d-8008-575a2455de2f', 'Sonorisation', 'Sonorisation et équipement audio spécifique', true, 50),
('5415b35a-84f7-400f-a6e7-0c0b9044e73b', 'Transport local', 'Transport local depuis/vers l''aéroport ou la gare', true, 60)
ON CONFLICT (id) DO NOTHING;

-- 3.2 Exclusivity Clauses (depuis GO-PROD actuel)
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
-- 4. FONCTION HELPER : Créer une nouvelle version d'offre
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
    artist_name, stage_name, date_time, performance_time, duration, duration_minutes,
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
    (p_new_offer_data->>'performance_time')::TIME,
    (p_new_offer_data->>'duration')::INTEGER,
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
-- FIN DE LA MIGRATION
-- =============================================================================


