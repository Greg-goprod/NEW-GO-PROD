-- =============================================================================
-- Table: smtp_configs
-- Description: Configuration SMTP par company (tenant)
--              Permet à chaque organisation de configurer son propre serveur SMTP
--              Le mot de passe est stocké chiffré
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.smtp_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  -- Informations du serveur SMTP
  name TEXT NOT NULL DEFAULT 'Configuration principale',  -- Nom pour identifier la config
  host TEXT NOT NULL,                                      -- Serveur SMTP (ex: smtp.infomaniak.com)
  port INTEGER NOT NULL DEFAULT 587,                       -- Port (587 = TLS, 465 = SSL, 25 = non sécurisé)
  secure BOOLEAN NOT NULL DEFAULT true,                    -- true = SSL/TLS
  
  -- Authentification
  username TEXT NOT NULL,                                  -- Utilisateur (souvent l'email)
  password_encrypted TEXT NOT NULL,                        -- Mot de passe chiffré
  
  -- Expéditeur par défaut
  from_email TEXT NOT NULL,                                -- Adresse email d'envoi
  from_name TEXT NOT NULL,                                 -- Nom d'affichage
  reply_to TEXT,                                           -- Adresse de réponse (optionnel)
  
  -- Configuration
  is_active BOOLEAN NOT NULL DEFAULT true,                 -- Config active
  is_default BOOLEAN NOT NULL DEFAULT false,               -- Config par défaut
  
  -- Métadonnées
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  last_tested_at TIMESTAMPTZ,                              -- Dernier test réussi
  created_by UUID REFERENCES auth.users(id),
  
  -- Contraintes
  CONSTRAINT smtp_configs_port_valid CHECK (port > 0 AND port < 65536),
  CONSTRAINT smtp_configs_email_format CHECK (from_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  CONSTRAINT smtp_configs_reply_to_format CHECK (reply_to IS NULL OR reply_to ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  CONSTRAINT smtp_configs_unique_per_company UNIQUE (company_id, name)
);

-- Index pour les requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_smtp_configs_company_id ON public.smtp_configs(company_id);
CREATE INDEX IF NOT EXISTS idx_smtp_configs_is_default ON public.smtp_configs(company_id, is_default) WHERE is_default = true;

-- Trigger pour mettre à jour updated_at
CREATE OR REPLACE TRIGGER trg_smtp_configs_updated_at
BEFORE UPDATE ON public.smtp_configs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Fonction pour s'assurer qu'il n'y a qu'une seule config par défaut par company
CREATE OR REPLACE FUNCTION ensure_single_default_smtp_config()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default = true THEN
    UPDATE public.smtp_configs
    SET is_default = false, updated_at = timezone('utc', now())
    WHERE company_id = NEW.company_id
      AND id != NEW.id
      AND is_default = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_ensure_single_default_smtp_config
BEFORE INSERT OR UPDATE ON public.smtp_configs
FOR EACH ROW EXECUTE FUNCTION ensure_single_default_smtp_config();

-- Commentaires
COMMENT ON TABLE public.smtp_configs IS 'Configuration SMTP par tenant pour l''envoi d''emails';
COMMENT ON COLUMN public.smtp_configs.host IS 'Serveur SMTP (ex: smtp.infomaniak.com, smtp.gmail.com)';
COMMENT ON COLUMN public.smtp_configs.port IS 'Port SMTP (587=TLS recommandé, 465=SSL, 25=non sécurisé)';
COMMENT ON COLUMN public.smtp_configs.secure IS 'Utiliser SSL/TLS pour la connexion';
COMMENT ON COLUMN public.smtp_configs.password_encrypted IS 'Mot de passe chiffré avec la clé serveur';

-- =============================================================================
-- Row Level Security
-- =============================================================================
ALTER TABLE public.smtp_configs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "SMTP configs are readable by tenant users" ON public.smtp_configs;
CREATE POLICY "SMTP configs are readable by tenant users"
ON public.smtp_configs FOR SELECT
USING (company_id = auth_company_id());

DROP POLICY IF EXISTS "SMTP configs are insertable by tenant users" ON public.smtp_configs;
CREATE POLICY "SMTP configs are insertable by tenant users"
ON public.smtp_configs FOR INSERT
WITH CHECK (company_id = auth_company_id());

DROP POLICY IF EXISTS "SMTP configs are updatable by tenant users" ON public.smtp_configs;
CREATE POLICY "SMTP configs are updatable by tenant users"
ON public.smtp_configs FOR UPDATE
USING (company_id = auth_company_id())
WITH CHECK (company_id = auth_company_id());

DROP POLICY IF EXISTS "SMTP configs are deletable by tenant users" ON public.smtp_configs;
CREATE POLICY "SMTP configs are deletable by tenant users"
ON public.smtp_configs FOR DELETE
USING (company_id = auth_company_id());

-- =============================================================================
-- Supprimer les tables Resend (email_domains)
-- =============================================================================
DROP TABLE IF EXISTS public.email_domains CASCADE;

-- Supprimer la colonne domain_id de email_senders si elle existe
ALTER TABLE public.email_senders DROP COLUMN IF EXISTS domain_id;
