-- ============================================
-- GESTION DES SCÈNES - ENUMS PAR COMPANY
-- ============================================

-- 1. Supprimer la vue dépendante si elle existe
DROP VIEW IF EXISTS v_event_stages_flat CASCADE;

-- 2. Créer la table pour les types de scènes (par company)
CREATE TABLE IF NOT EXISTS public.stage_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  value TEXT NOT NULL,
  label TEXT NOT NULL,
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ajouter la contrainte UNIQUE après création de la table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'stage_types_company_id_value_key'
    ) THEN
        ALTER TABLE public.stage_types 
            ADD CONSTRAINT stage_types_company_id_value_key UNIQUE (company_id, value);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_stage_types_company_id ON public.stage_types(company_id);

-- 3. Créer la table pour les spécificités de scènes (par company)
CREATE TABLE IF NOT EXISTS public.stage_specificities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  value TEXT NOT NULL,
  label TEXT NOT NULL,
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ajouter la contrainte UNIQUE après création de la table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'stage_specificities_company_id_value_key'
    ) THEN
        ALTER TABLE public.stage_specificities 
            ADD CONSTRAINT stage_specificities_company_id_value_key UNIQUE (company_id, value);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_stage_specificities_company_id ON public.stage_specificities(company_id);

-- 4. Modifier la table event_stages
ALTER TABLE public.event_stages
  ALTER COLUMN type TYPE TEXT,
  ALTER COLUMN type DROP NOT NULL;

ALTER TABLE public.event_stages
  ADD COLUMN IF NOT EXISTS specificity TEXT;

ALTER TABLE public.event_stages
  DROP COLUMN IF EXISTS notes CASCADE;

-- 5. Recréer une vue simplifiée si nécessaire
CREATE OR REPLACE VIEW v_event_stages_flat AS
SELECT 
  es.id,
  es.event_id,
  es.name,
  es.type,
  es.specificity,
  es.capacity,
  es.display_order,
  es.created_at,
  e.name as event_name,
  e.company_id
FROM public.event_stages es
LEFT JOIN public.events e ON es.event_id = e.id;

-- ============================================
-- VALEURS PAR DÉFAUT (à adapter pour chaque company)
-- ============================================

-- Note: Ces valeurs doivent être insérées pour chaque company
-- Exemple pour une company spécifique (remplacer 'YOUR_COMPANY_ID')

-- INSERT INTO public.stage_types (company_id, value, label, display_order) VALUES
-- ('YOUR_COMPANY_ID', 'main', 'Principale', 1),
-- ('YOUR_COMPANY_ID', 'secondary', 'Secondaire', 2),
-- ('YOUR_COMPANY_ID', 'club', 'Club', 3),
-- ('YOUR_COMPANY_ID', 'outdoor', 'Extérieur', 4),
-- ('YOUR_COMPANY_ID', 'tent', 'Chapiteau', 5),
-- ('YOUR_COMPANY_ID', 'workshop', 'Atelier', 6),
-- ('YOUR_COMPANY_ID', 'vip', 'VIP', 7),
-- ('YOUR_COMPANY_ID', 'other', 'Autre', 8);

-- INSERT INTO public.stage_specificities (company_id, value, label, display_order) VALUES
-- ('YOUR_COMPANY_ID', 'covered', 'Couvert', 1),
-- ('YOUR_COMPANY_ID', 'open_air', 'Plein air', 2),
-- ('YOUR_COMPANY_ID', 'indoor', 'Intérieur', 3),
-- ('YOUR_COMPANY_ID', 'mobile', 'Mobile', 4),
-- ('YOUR_COMPANY_ID', 'permanent', 'Permanent', 5),
-- ('YOUR_COMPANY_ID', 'acoustic', 'Acoustique', 6),
-- ('YOUR_COMPANY_ID', 'electric', 'Électrique', 7);

-- ============================================
-- RPC: Fonction pour initialiser les enums pour une company
-- ============================================

CREATE OR REPLACE FUNCTION initialize_stage_enums_for_company(p_company_id UUID)
RETURNS void AS $$
BEGIN
  -- Insérer les types par défaut
  INSERT INTO public.stage_types (company_id, value, label, display_order) VALUES
  (p_company_id, 'main', 'Principale', 1),
  (p_company_id, 'secondary', 'Secondaire', 2),
  (p_company_id, 'club', 'Club', 3),
  (p_company_id, 'outdoor', 'Extérieur', 4),
  (p_company_id, 'tent', 'Chapiteau', 5),
  (p_company_id, 'workshop', 'Atelier', 6),
  (p_company_id, 'vip', 'VIP', 7),
  (p_company_id, 'other', 'Autre', 8)
  ON CONFLICT (company_id, value) DO NOTHING;

  -- Insérer les spécificités par défaut
  INSERT INTO public.stage_specificities (company_id, value, label, display_order) VALUES
  (p_company_id, 'covered', 'Couvert', 1),
  (p_company_id, 'open_air', 'Plein air', 2),
  (p_company_id, 'indoor', 'Intérieur', 3),
  (p_company_id, 'mobile', 'Mobile', 4),
  (p_company_id, 'permanent', 'Permanent', 5),
  (p_company_id, 'acoustic', 'Acoustique', 6),
  (p_company_id, 'electric', 'Électrique', 7)
  ON CONFLICT (company_id, value) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- TEST: Initialiser pour toutes les companies existantes
-- ============================================

-- Décommenter cette ligne pour initialiser les enums pour toutes les companies
-- SELECT initialize_stage_enums_for_company(id) FROM public.companies;

