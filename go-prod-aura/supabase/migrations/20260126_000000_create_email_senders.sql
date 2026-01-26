-- =============================================================================
-- Table: email_senders
-- Description: Configuration des expéditeurs d'emails par company (tenant)
--              Permet à chaque organisation de définir ses propres adresses d'envoi
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.email_senders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  -- Informations de l'expéditeur
  name TEXT NOT NULL,                    -- Nom d'affichage (ex: "Venoge Festival Booking")
  email TEXT NOT NULL,                   -- Adresse email (ex: "booking@venogefestival.ch")
  reply_to TEXT,                         -- Adresse de réponse (optionnel)
  
  -- Configuration
  is_default BOOLEAN NOT NULL DEFAULT false,  -- Expéditeur par défaut pour cette company
  is_verified BOOLEAN NOT NULL DEFAULT false, -- Domaine vérifié dans Resend
  
  -- Catégorie d'usage (optionnel, pour filtrer dans les modals)
  category TEXT CHECK (category IN ('general', 'booking', 'contracts', 'notifications', 'press', 'production')),
  
  -- Métadonnées
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  created_by UUID REFERENCES auth.users(id),
  
  -- Contraintes
  CONSTRAINT email_senders_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  CONSTRAINT email_senders_reply_to_format CHECK (reply_to IS NULL OR reply_to ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Index pour les requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_email_senders_company_id ON public.email_senders(company_id);
CREATE INDEX IF NOT EXISTS idx_email_senders_is_default ON public.email_senders(company_id, is_default) WHERE is_default = true;

-- Trigger pour mettre à jour updated_at
CREATE OR REPLACE TRIGGER trg_email_senders_updated_at
BEFORE UPDATE ON public.email_senders
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Fonction pour s'assurer qu'il n'y a qu'un seul expéditeur par défaut par company
CREATE OR REPLACE FUNCTION ensure_single_default_email_sender()
RETURNS TRIGGER AS $$
BEGIN
  -- Si le nouvel enregistrement est défini comme défaut
  IF NEW.is_default = true THEN
    -- Désactiver le défaut pour les autres expéditeurs de la même company
    UPDATE public.email_senders
    SET is_default = false, updated_at = timezone('utc', now())
    WHERE company_id = NEW.company_id
      AND id != NEW.id
      AND is_default = true;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_ensure_single_default_email_sender
BEFORE INSERT OR UPDATE ON public.email_senders
FOR EACH ROW EXECUTE FUNCTION ensure_single_default_email_sender();

-- Commentaires
COMMENT ON TABLE public.email_senders IS 'Configuration des expéditeurs d''emails par tenant';
COMMENT ON COLUMN public.email_senders.name IS 'Nom d''affichage de l''expéditeur';
COMMENT ON COLUMN public.email_senders.email IS 'Adresse email d''envoi';
COMMENT ON COLUMN public.email_senders.reply_to IS 'Adresse de réponse (optionnelle)';
COMMENT ON COLUMN public.email_senders.is_default IS 'Expéditeur par défaut pour cette company';
COMMENT ON COLUMN public.email_senders.is_verified IS 'Domaine vérifié dans le service d''envoi (Resend)';
COMMENT ON COLUMN public.email_senders.category IS 'Catégorie d''usage pour filtrer les expéditeurs';

-- =============================================================================
-- Row Level Security
-- =============================================================================
ALTER TABLE public.email_senders ENABLE ROW LEVEL SECURITY;

-- Politique de lecture : les utilisateurs peuvent voir les expéditeurs de leur company
DROP POLICY IF EXISTS "Email senders are readable by tenant users" ON public.email_senders;
CREATE POLICY "Email senders are readable by tenant users"
ON public.email_senders FOR SELECT
USING (company_id = auth_company_id());

-- Politique d'insertion : les utilisateurs peuvent créer des expéditeurs pour leur company
DROP POLICY IF EXISTS "Email senders are insertable by tenant users" ON public.email_senders;
CREATE POLICY "Email senders are insertable by tenant users"
ON public.email_senders FOR INSERT
WITH CHECK (company_id = auth_company_id());

-- Politique de mise à jour : les utilisateurs peuvent modifier les expéditeurs de leur company
DROP POLICY IF EXISTS "Email senders are updatable by tenant users" ON public.email_senders;
CREATE POLICY "Email senders are updatable by tenant users"
ON public.email_senders FOR UPDATE
USING (company_id = auth_company_id())
WITH CHECK (company_id = auth_company_id());

-- Politique de suppression : les utilisateurs peuvent supprimer les expéditeurs de leur company
DROP POLICY IF EXISTS "Email senders are deletable by tenant users" ON public.email_senders;
CREATE POLICY "Email senders are deletable by tenant users"
ON public.email_senders FOR DELETE
USING (company_id = auth_company_id());
