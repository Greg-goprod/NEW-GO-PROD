-- =====================================================
-- Migration: Create Email Offers Attachments Storage Bucket
-- Description: Configure storage bucket and RLS for email offer attachments
-- Author: AI Assistant
-- Date: 2026-01-27
-- =====================================================

-- Créer le bucket s'il n'existe pas
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'email-offers-attachments',
  'email-offers-attachments',
  false, -- Private - accès via signed URLs
  26214400, -- 25 MB limit
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO UPDATE
SET 
  public = false,
  file_size_limit = 26214400,
  allowed_mime_types = ARRAY['application/pdf'];

-- =====================================================
-- POLITIQUES RLS POUR LE BUCKET email-offers-attachments
-- =====================================================

-- Supprimer les anciennes politiques si elles existent
DROP POLICY IF EXISTS "Allow all uploads to email-offers-attachments" ON storage.objects;
DROP POLICY IF EXISTS "Allow all updates in email-offers-attachments" ON storage.objects;
DROP POLICY IF EXISTS "Allow all deletes in email-offers-attachments" ON storage.objects;
DROP POLICY IF EXISTS "Allow all reads in email-offers-attachments" ON storage.objects;

-- 1. LECTURE - Autorisé pour tous (accès via signed URLs gérés par l'app)
CREATE POLICY "Allow all reads in email-offers-attachments"
ON storage.objects
FOR SELECT
USING (bucket_id = 'email-offers-attachments');

-- 2. UPLOAD (INSERT) - Autorisé pour tous
CREATE POLICY "Allow all uploads to email-offers-attachments"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'email-offers-attachments');

-- 3. UPDATE - Autorisé pour tous
CREATE POLICY "Allow all updates in email-offers-attachments"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'email-offers-attachments')
WITH CHECK (bucket_id = 'email-offers-attachments');

-- 4. DELETE - Autorisé pour tous
CREATE POLICY "Allow all deletes in email-offers-attachments"
ON storage.objects
FOR DELETE
USING (bucket_id = 'email-offers-attachments');

-- =====================================================
-- TABLE email_offer_attachments (si elle n'existe pas)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.email_offer_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  original_filename text NOT NULL,
  storage_path text NOT NULL,
  file_size bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Index pour les requêtes par company
CREATE INDEX IF NOT EXISTS idx_email_offer_attachments_company 
ON public.email_offer_attachments(company_id);

-- RLS sur la table
ALTER TABLE public.email_offer_attachments ENABLE ROW LEVEL SECURITY;

-- Politique permissive (dev mode)
DROP POLICY IF EXISTS "Allow all on email_offer_attachments" ON public.email_offer_attachments;
CREATE POLICY "Allow all on email_offer_attachments"
ON public.email_offer_attachments
FOR ALL
USING (true)
WITH CHECK (true);

-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION update_email_offer_attachments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_email_offer_attachments_updated_at ON public.email_offer_attachments;
CREATE TRIGGER trg_email_offer_attachments_updated_at
BEFORE UPDATE ON public.email_offer_attachments
FOR EACH ROW
EXECUTE FUNCTION update_email_offer_attachments_updated_at();

-- =====================================================
-- VÉRIFICATION
-- =====================================================

-- Lister les politiques créées
SELECT 
  policyname,
  cmd
FROM pg_policies
WHERE tablename = 'objects'
  AND policyname LIKE '%email-offers-attachments%'
ORDER BY policyname;

-- Vérifier la configuration du bucket
SELECT 
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
FROM storage.buckets
WHERE id = 'email-offers-attachments';
