-- Migration: Suppression de la table email_configs (Brevo) devenue obsolète
-- La solution email utilise maintenant smtp_configs avec le relay SMTP Fly.io

-- Supprimer les policies RLS
DROP POLICY IF EXISTS "Email configs are readable by tenant users" ON public.email_configs;
DROP POLICY IF EXISTS "Email configs are insertable by tenant users" ON public.email_configs;
DROP POLICY IF EXISTS "Email configs are updatable by tenant users" ON public.email_configs;
DROP POLICY IF EXISTS "Email configs are deletable by tenant users" ON public.email_configs;

-- Supprimer le trigger
DROP TRIGGER IF EXISTS trg_email_configs_updated_at ON public.email_configs;

-- Supprimer l'index
DROP INDEX IF EXISTS idx_email_configs_company_id;

-- Supprimer la table
DROP TABLE IF EXISTS public.email_configs;

-- Confirmation
DO $$
BEGIN
  RAISE NOTICE 'Table email_configs (Brevo) supprimée avec succès. Utiliser smtp_configs à la place.';
END $$;
