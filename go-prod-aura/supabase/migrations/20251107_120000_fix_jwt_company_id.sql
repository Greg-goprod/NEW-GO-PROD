-- =============================================================================
-- Fix JWT company_id pour le mode développement
-- =============================================================================
-- PROBLÈME: auth_company_id() retourne NULL car le JWT ne contient pas company_id
-- SOLUTION TEMPORAIRE: Retourner l'entreprise de dev si JWT vide (mode développement)
-- SOLUTION LONG TERME: Implémenter un système d'affiliation user->company
-- =============================================================================

-- 1. Créer une fonction améliorée qui gère le mode développement
CREATE OR REPLACE FUNCTION public.auth_company_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  jwt_company_id uuid;
  dev_company_id uuid := '06f6c960-3f90-41cb-b0d7-46937eaf90a8'; -- Go-Prod HQ
BEGIN
  -- Essayer de récupérer company_id depuis le JWT
  jwt_company_id := nullif(current_setting('request.jwt.claims', true)::jsonb->>'company_id','')::uuid;
  
  -- Si JWT contient company_id, le retourner
  IF jwt_company_id IS NOT NULL THEN
    RETURN jwt_company_id;
  END IF;
  
  -- SINON : Mode développement - retourner l'entreprise de dev par défaut
  RETURN dev_company_id;
END;
$$;

COMMENT ON FUNCTION public.auth_company_id() IS 
'Récupère company_id depuis JWT, ou retourne Go-Prod HQ en mode développement';

-- =============================================================================
-- 2. [OPTIONNEL] Créer table user_profiles pour lier users → companies
-- Cette table permettra plus tard d'assigner les users à des companies
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'member',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

COMMENT ON TABLE public.user_profiles IS 'Profils utilisateurs avec affiliation company (multi-tenant)';

CREATE INDEX IF NOT EXISTS idx_user_profiles_company ON public.user_profiles(company_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON public.user_profiles(role);

-- Trigger pour updated_at
CREATE TRIGGER trg_user_profiles_updated_at
BEFORE UPDATE ON public.user_profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================================================
-- 3. Activer RLS sur user_profiles
-- =============================================================================

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Les users peuvent voir leur propre profil
CREATE POLICY "Users can view own profile"
ON public.user_profiles FOR SELECT
USING (id = auth.uid());

-- Policy: Les users peuvent mettre à jour leur propre profil
CREATE POLICY "Users can update own profile"
ON public.user_profiles FOR UPDATE
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- =============================================================================
-- 4. [OPTIONNEL] Fonction pour créer automatiquement un profil lors de l'inscription
-- =============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  dev_company_id uuid := '06f6c960-3f90-41cb-b0d7-46937eaf90a8';
BEGIN
  -- Créer un profil pour le nouvel utilisateur avec l'entreprise de dev
  INSERT INTO public.user_profiles (id, company_id, full_name, avatar_url)
  VALUES (
    new.id,
    dev_company_id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  
  RETURN new;
END;
$$;

COMMENT ON FUNCTION public.handle_new_user() IS 
'Trigger: Cree automatiquement un profil user avec company_id lors de l inscription';

-- Créer le trigger sur auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================================================
-- 5. [PRODUCTION] Pour activer le JWT company_id en production:
-- =============================================================================
-- Dans le dashboard Supabase (Authentication > Hooks), créer un hook:
-- Hook type: "Custom Access Token"
-- SQL Function:
/*
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  claims jsonb;
  user_company_id uuid;
BEGIN
  -- Récupérer le company_id du user depuis user_profiles
  SELECT company_id INTO user_company_id
  FROM public.user_profiles
  WHERE id = (event->>'user_id')::uuid;
  
  -- Ajouter company_id aux claims JWT
  claims := event->'claims';
  IF user_company_id IS NOT NULL THEN
    claims := jsonb_set(claims, '{company_id}', to_jsonb(user_company_id::text));
  END IF;
  
  RETURN jsonb_set(event, '{claims}', claims);
END;
$$;
*/

-- =============================================================================
-- 📝 NOTES POUR LE DÉVELOPPEUR
-- =============================================================================
-- Cette migration corrige temporairement le problème en mode développement.
-- Pour activer complètement le multi-tenant en production:
--
-- 1. Créer un hook Auth dans le dashboard Supabase (voir ci-dessus)
-- 2. Assigner les users existants à des companies dans user_profiles
-- 3. Tester que le JWT contient bien company_id après connexion
-- 4. Retirer la ligne "RETURN dev_company_id" de auth_company_id()
--
-- =============================================================================

