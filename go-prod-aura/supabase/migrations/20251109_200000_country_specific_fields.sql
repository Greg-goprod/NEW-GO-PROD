-- =====================================================================
-- MIGRATION : Champs spécifiques par pays pour CRM
-- Date : 2025-11-09
-- Description : Système dynamique pour gérer les données bancaires,
--               fiscales et réglementaires selon le pays de l'entreprise
-- =====================================================================

-- =============================================================================
-- 1) Ajouter le champ JSONB pour données spécifiques pays
-- =============================================================================
ALTER TABLE public.crm_companies 
ADD COLUMN IF NOT EXISTS country_specific_data JSONB DEFAULT '{}';

-- Index GIN pour recherche performante dans JSONB
CREATE INDEX IF NOT EXISTS idx_crm_companies_country_data 
ON public.crm_companies USING GIN (country_specific_data);

-- =============================================================================
-- 2) Table de configuration des champs par pays
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.country_business_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code TEXT NOT NULL, -- CH, FR, GB, US, DE, BE, etc.
  field_key TEXT NOT NULL, -- uid, siret, ein, etc.
  field_label TEXT NOT NULL, -- "N° UID", "N° SIRET", etc.
  field_type TEXT NOT NULL DEFAULT 'text', -- text, number, iban, select
  is_required BOOLEAN DEFAULT false,
  validation_regex TEXT, -- Regex pour validation
  placeholder TEXT, -- Exemple de format
  help_text TEXT, -- Aide contextuelle
  sort_order INT DEFAULT 100,
  select_options JSONB DEFAULT NULL, -- Pour les selects (ex: cantons suisses)
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT uq_country_field UNIQUE (country_code, field_key)
);

-- Trigger updated_at
CREATE OR REPLACE TRIGGER trg_country_business_fields_updated_at
BEFORE UPDATE ON public.country_business_fields
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_country_fields_country 
ON public.country_business_fields(country_code, sort_order);

-- =============================================================================
-- 3) Seeding des configurations par pays
-- =============================================================================

-- 🇨🇭 SUISSE
INSERT INTO public.country_business_fields (country_code, field_key, field_label, field_type, is_required, validation_regex, placeholder, help_text, sort_order) VALUES
('CH', 'uid', 'N° UID', 'text', true, '^CHE-\d{3}\.\d{3}\.\d{3}$', 'CHE-123.456.789', 'Numéro d''identification unique des entreprises', 10),
('CH', 'canton', 'Canton', 'select', false, NULL, NULL, 'Canton du siège social', 20),
('CH', 'rc_number', 'N° Registre du Commerce', 'text', false, NULL, '123456', 'Numéro au registre cantonal du commerce', 30),
('CH', 'bc_number', 'BC Number', 'text', false, '^\d{5}$', '09000', 'Numéro de clearing bancaire (5 chiffres)', 40)
ON CONFLICT (country_code, field_key) DO NOTHING;

-- Options pour canton suisse
UPDATE public.country_business_fields 
SET select_options = '["AG", "AI", "AR", "BE", "BL", "BS", "FR", "GE", "GL", "GR", "JU", "LU", "NE", "NW", "OW", "SG", "SH", "SO", "SZ", "TG", "TI", "UR", "VD", "VS", "ZG", "ZH"]'::jsonb
WHERE country_code = 'CH' AND field_key = 'canton';

-- 🇫🇷 FRANCE
INSERT INTO public.country_business_fields (country_code, field_key, field_label, field_type, is_required, validation_regex, placeholder, help_text, sort_order) VALUES
('FR', 'siret', 'N° SIRET', 'text', true, '^\d{14}$', '12345678901234', 'Système d''identification du répertoire des établissements (14 chiffres)', 10),
('FR', 'siren', 'N° SIREN', 'text', true, '^\d{9}$', '123456789', 'Système d''identification du répertoire des entreprises (9 chiffres)', 20),
('FR', 'code_ape', 'Code APE/NAF', 'text', false, '^\d{4}[A-Z]$', '9001Z', 'Code d''activité principale exercée', 30),
('FR', 'rcs', 'RCS', 'text', false, NULL, 'Paris', 'Ville d''immatriculation au registre du commerce', 40),
('FR', 'capital_social', 'Capital social (€)', 'text', false, NULL, '10000', 'Montant du capital social', 50),
('FR', 'forme_juridique', 'Forme juridique', 'select', false, NULL, NULL, 'Statut juridique de l''entreprise', 60)
ON CONFLICT (country_code, field_key) DO NOTHING;

-- Options formes juridiques françaises
UPDATE public.country_business_fields 
SET select_options = '["SAS", "SARL", "SA", "SNC", "EURL", "SASU", "SCI", "Association", "Auto-entrepreneur", "Autre"]'::jsonb
WHERE country_code = 'FR' AND field_key = 'forme_juridique';

-- 🇬🇧 ROYAUME-UNI
INSERT INTO public.country_business_fields (country_code, field_key, field_label, field_type, is_required, validation_regex, placeholder, help_text, sort_order) VALUES
('GB', 'company_number', 'Company Registration Number', 'text', true, '^\d{8}$', '12345678', 'Companies House registration number (8 chiffres)', 10),
('GB', 'vat_number', 'VAT Number', 'text', false, '^GB\d{9,12}$', 'GB123456789', 'Numéro de TVA britannique', 20),
('GB', 'sort_code', 'Sort Code', 'text', false, '^\d{2}-\d{2}-\d{2}$', '12-34-56', 'Code d''identification bancaire UK', 30),
('GB', 'registered_office', 'Registered Office', 'text', false, NULL, 'London', 'Adresse du siège social enregistré', 40),
('GB', 'entity_type', 'Entity Type', 'select', false, NULL, NULL, 'Type d''entité légale', 50)
ON CONFLICT (country_code, field_key) DO NOTHING;

-- Options entity types UK
UPDATE public.country_business_fields 
SET select_options = '["Ltd", "PLC", "LLP", "Limited Partnership", "Sole Trader", "Other"]'::jsonb
WHERE country_code = 'GB' AND field_key = 'entity_type';

-- 🇺🇸 ÉTATS-UNIS
INSERT INTO public.country_business_fields (country_code, field_key, field_label, field_type, is_required, validation_regex, placeholder, help_text, sort_order) VALUES
('US', 'ein', 'EIN (Tax ID)', 'text', true, '^\d{2}-\d{7}$', '12-3456789', 'Employer Identification Number (9 chiffres)', 10),
('US', 'state_of_incorporation', 'State of Incorporation', 'select', false, NULL, NULL, 'État d''enregistrement de l''entreprise', 20),
('US', 'routing_number', 'Routing Number', 'text', false, '^\d{9}$', '021000021', 'Numéro de routage bancaire ABA (9 chiffres)', 30),
('US', 'account_number', 'Account Number', 'text', false, NULL, '123456789', 'Numéro de compte bancaire', 40),
('US', 'entity_type', 'Entity Type', 'select', false, NULL, NULL, 'Type d''entité légale', 50)
ON CONFLICT (country_code, field_key) DO NOTHING;

-- Options entity types US
UPDATE public.country_business_fields 
SET select_options = '["LLC", "Corporation (C-Corp)", "S-Corporation", "Partnership", "Sole Proprietorship", "Non-Profit", "Other"]'::jsonb
WHERE country_code = 'US' AND field_key = 'entity_type';

-- Options états US (50 états)
UPDATE public.country_business_fields 
SET select_options = '["Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut", "Delaware", "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire", "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota", "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington", "West Virginia", "Wisconsin", "Wyoming"]'::jsonb
WHERE country_code = 'US' AND field_key = 'state_of_incorporation';

-- 🇩🇪 ALLEMAGNE
INSERT INTO public.country_business_fields (country_code, field_key, field_label, field_type, is_required, validation_regex, placeholder, help_text, sort_order) VALUES
('DE', 'handelsregister', 'Handelsregisternummer', 'text', true, NULL, 'HRB 12345', 'Numéro du registre du commerce', 10),
('DE', 'ust_idnr', 'USt-IdNr', 'text', false, '^DE\d{9}$', 'DE123456789', 'Numéro de TVA allemand', 20),
('DE', 'steuernummer', 'Steuernummer', 'text', false, '^\d{11}$', '12345678901', 'Numéro fiscal local (11 chiffres)', 30),
('DE', 'entity_type', 'Rechtsform', 'select', false, NULL, NULL, 'Forme juridique', 40)
ON CONFLICT (country_code, field_key) DO NOTHING;

-- Options formes juridiques allemandes
UPDATE public.country_business_fields 
SET select_options = '["GmbH", "AG", "UG", "KG", "OHG", "GbR", "eK", "Andere"]'::jsonb
WHERE country_code = 'DE' AND field_key = 'entity_type';

-- 🇧🇪 BELGIQUE
INSERT INTO public.country_business_fields (country_code, field_key, field_label, field_type, is_required, validation_regex, placeholder, help_text, sort_order) VALUES
('BE', 'enterprise_number', 'N° d''entreprise', 'text', true, '^\d{4}\.\d{3}\.\d{3}$', '0123.456.789', 'Numéro d''entreprise belge (10 chiffres)', 10),
('BE', 'entity_type', 'Forme juridique', 'select', false, NULL, NULL, 'Forme juridique de l''entreprise', 20)
ON CONFLICT (country_code, field_key) DO NOTHING;

-- Options formes juridiques belges
UPDATE public.country_business_fields 
SET select_options = '["SA/NV", "SPRL/BVBA", "SRL/BV", "SCRL/CVBA", "SC/CV", "SNC/VOF", "SCS/CommV", "ASBL/VZW", "Autre"]'::jsonb
WHERE country_code = 'BE' AND field_key = 'entity_type';

-- 🇪🇸 ESPAGNE
INSERT INTO public.country_business_fields (country_code, field_key, field_label, field_type, is_required, validation_regex, placeholder, help_text, sort_order) VALUES
('ES', 'cif', 'CIF/NIF', 'text', true, '^[A-Z]\d{7}[A-Z0-9]$', 'A12345678', 'Código de Identificación Fiscal', 10),
('ES', 'entity_type', 'Forma jurídica', 'select', false, NULL, NULL, 'Forme juridique de l''entreprise', 20)
ON CONFLICT (country_code, field_key) DO NOTHING;

-- Options formes juridiques espagnoles
UPDATE public.country_business_fields 
SET select_options = '["SL", "SA", "SLU", "Autónomo", "Cooperativa", "Asociación", "Otra"]'::jsonb
WHERE country_code = 'ES' AND field_key = 'entity_type';

-- 🇮🇹 ITALIE
INSERT INTO public.country_business_fields (country_code, field_key, field_label, field_type, is_required, validation_regex, placeholder, help_text, sort_order) VALUES
('IT', 'partita_iva', 'Partita IVA', 'text', true, '^\d{11}$', '12345678901', 'Numéro de TVA italien (11 chiffres)', 10),
('IT', 'codice_fiscale', 'Codice Fiscale', 'text', false, '^[A-Z0-9]{11,16}$', 'RSSMRA85M01H501Z', 'Code fiscal de l''entreprise', 20),
('IT', 'entity_type', 'Forma giuridica', 'select', false, NULL, NULL, 'Forme juridique de l''entreprise', 30)
ON CONFLICT (country_code, field_key) DO NOTHING;

-- Options formes juridiques italiennes
UPDATE public.country_business_fields 
SET select_options = '["SRL", "SPA", "SRLS", "SNC", "SAS", "Ditta Individuale", "Altra"]'::jsonb
WHERE country_code = 'IT' AND field_key = 'entity_type';

-- =============================================================================
-- 4) Fonction de validation des données pays
-- =============================================================================
CREATE OR REPLACE FUNCTION public.validate_country_specific_data(
  p_country TEXT,
  p_data JSONB
) RETURNS TABLE(is_valid BOOLEAN, errors TEXT[]) AS $$
DECLARE
  v_field RECORD;
  v_value TEXT;
  v_errors TEXT[] := ARRAY[]::TEXT[];
BEGIN
  -- Parcourir tous les champs requis pour ce pays
  FOR v_field IN 
    SELECT field_key, field_label, validation_regex, is_required
    FROM public.country_business_fields
    WHERE country_code = p_country AND is_required = true
  LOOP
    v_value := p_data->>v_field.field_key;
    
    -- Vérifier si le champ requis est présent
    IF v_value IS NULL OR v_value = '' THEN
      v_errors := array_append(v_errors, v_field.field_label || ' est requis');
    -- Vérifier la regex si définie
    ELSIF v_field.validation_regex IS NOT NULL THEN
      IF NOT (v_value ~ v_field.validation_regex) THEN
        v_errors := array_append(v_errors, v_field.field_label || ' format invalide');
      END IF;
    END IF;
  END LOOP;
  
  RETURN QUERY SELECT (array_length(v_errors, 1) IS NULL), v_errors;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 5) RLS Policies pour country_business_fields
-- =============================================================================
ALTER TABLE public.country_business_fields ENABLE ROW LEVEL SECURITY;

-- Lecture publique (configurations accessibles à tous les utilisateurs authentifiés)
CREATE POLICY "Country fields are readable by authenticated users"
ON public.country_business_fields
FOR SELECT
TO authenticated
USING (true);

-- Seuls les admins peuvent modifier (à adapter selon votre système de rôles)
CREATE POLICY "Country fields are writable by admins only"
ON public.country_business_fields
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role_name = 'admin'
  )
);

-- =============================================================================
-- COMMENTAIRES
-- =============================================================================
COMMENT ON TABLE public.country_business_fields IS 'Configuration des champs spécifiques par pays pour les données d''entreprise';
COMMENT ON COLUMN public.crm_companies.country_specific_data IS 'Données spécifiques au pays (SIRET, UID, EIN, etc.) stockées en JSONB';
COMMENT ON FUNCTION public.validate_country_specific_data IS 'Valide les données spécifiques pays selon les règles configurées';







