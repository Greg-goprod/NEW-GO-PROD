-- =============================================================================
-- Table: email_configs
-- Description: Configuration email Brevo par company (tenant)
--              Simple et efficace : juste la clé API et l'expéditeur
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.email_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  -- Configuration Brevo
  brevo_api_key TEXT NOT NULL,                           -- Clé API Brevo (xkeysib-xxx)
  
  -- Expéditeur
  from_email TEXT NOT NULL,                              -- Adresse email d'envoi
  from_name TEXT NOT NULL,                               -- Nom d'affichage
  reply_to TEXT,                                         -- Adresse de réponse (optionnel)
  
  -- État
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  -- Métadonnées
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  last_tested_at TIMESTAMPTZ,
  
  -- Contraintes
  CONSTRAINT email_configs_email_format CHECK (from_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  CONSTRAINT email_configs_reply_to_format CHECK (reply_to IS NULL OR reply_to ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  CONSTRAINT email_configs_unique_per_company UNIQUE (company_id)
);

-- Index
CREATE INDEX IF NOT EXISTS idx_email_configs_company_id ON public.email_configs(company_id);

-- Trigger pour updated_at
CREATE OR REPLACE TRIGGER trg_email_configs_updated_at
BEFORE UPDATE ON public.email_configs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Commentaires
COMMENT ON TABLE public.email_configs IS 'Configuration email Brevo par tenant';
COMMENT ON COLUMN public.email_configs.brevo_api_key IS 'Clé API Brevo (commence par xkeysib-)';

-- =============================================================================
-- Row Level Security
-- =============================================================================
ALTER TABLE public.email_configs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Email configs are readable by tenant users" ON public.email_configs;
CREATE POLICY "Email configs are readable by tenant users"
ON public.email_configs FOR SELECT
USING (company_id = auth_company_id());

DROP POLICY IF EXISTS "Email configs are insertable by tenant users" ON public.email_configs;
CREATE POLICY "Email configs are insertable by tenant users"
ON public.email_configs FOR INSERT
WITH CHECK (company_id = auth_company_id());

DROP POLICY IF EXISTS "Email configs are updatable by tenant users" ON public.email_configs;
CREATE POLICY "Email configs are updatable by tenant users"
ON public.email_configs FOR UPDATE
USING (company_id = auth_company_id())
WITH CHECK (company_id = auth_company_id());

DROP POLICY IF EXISTS "Email configs are deletable by tenant users" ON public.email_configs;
CREATE POLICY "Email configs are deletable by tenant users"
ON public.email_configs FOR DELETE
USING (company_id = auth_company_id());
