-- =====================================================
-- Migration: Fix Contact Photos Bucket RLS Policies
-- Description: Configure storage policies for contact-photos bucket
-- Author: AI Assistant
-- Date: 2025-11-09
-- =====================================================

-- Créer le bucket s'il n'existe pas
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'contact-photos',
  'contact-photos',
  true, -- Public pour pouvoir lire les photos
  5242880, -- 5 MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE
SET 
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

-- =====================================================
-- SUPPRIMER LES ANCIENNES POLITIQUES
-- =====================================================

DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated delete" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated update" ON storage.objects;

-- =====================================================
-- POLITIQUES RLS POUR LE BUCKET contact-photos
-- =====================================================

-- 1. LECTURE PUBLIQUE (public = true, donc accessible sans auth)
-- Tous les fichiers du bucket sont publics, pas besoin de politique supplémentaire

-- 2. UPLOAD (INSERT) - Autorisé pour tous (même sans authentification en dev)
CREATE POLICY "Allow all uploads to contact-photos"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'contact-photos');

-- 3. UPDATE - Autorisé pour tous
CREATE POLICY "Allow all updates in contact-photos"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'contact-photos')
WITH CHECK (bucket_id = 'contact-photos');

-- 4. DELETE - Autorisé pour tous
CREATE POLICY "Allow all deletes in contact-photos"
ON storage.objects
FOR DELETE
USING (bucket_id = 'contact-photos');

-- =====================================================
-- VÉRIFICATION
-- =====================================================

-- Lister les politiques créées
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'objects'
  AND policyname LIKE '%contact-photos%'
ORDER BY policyname;

-- Vérifier la configuration du bucket
SELECT 
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types,
  created_at
FROM storage.buckets
WHERE id = 'contact-photos';







