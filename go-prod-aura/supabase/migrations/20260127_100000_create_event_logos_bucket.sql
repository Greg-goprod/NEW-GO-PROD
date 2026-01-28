-- =====================================================
-- Migration: Create Event Logos Storage Bucket
-- Description: Configure storage bucket and RLS for event logos
-- Author: AI Assistant
-- Date: 2026-01-27
-- =====================================================

-- Créer le bucket s'il n'existe pas
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'event-logos',
  'event-logos',
  true, -- Public pour pouvoir lire les logos
  5242880, -- 5 MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE
SET 
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];

-- =====================================================
-- POLITIQUES RLS POUR LE BUCKET event-logos
-- =====================================================

-- Supprimer les anciennes politiques si elles existent
DROP POLICY IF EXISTS "Allow all uploads to event-logos" ON storage.objects;
DROP POLICY IF EXISTS "Allow all updates in event-logos" ON storage.objects;
DROP POLICY IF EXISTS "Allow all deletes in event-logos" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read event-logos" ON storage.objects;

-- 1. LECTURE PUBLIQUE
CREATE POLICY "Allow public read event-logos"
ON storage.objects
FOR SELECT
USING (bucket_id = 'event-logos');

-- 2. UPLOAD (INSERT) - Autorisé pour tous
CREATE POLICY "Allow all uploads to event-logos"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'event-logos');

-- 3. UPDATE - Autorisé pour tous
CREATE POLICY "Allow all updates in event-logos"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'event-logos')
WITH CHECK (bucket_id = 'event-logos');

-- 4. DELETE - Autorisé pour tous
CREATE POLICY "Allow all deletes in event-logos"
ON storage.objects
FOR DELETE
USING (bucket_id = 'event-logos');

-- =====================================================
-- VÉRIFICATION
-- =====================================================

-- Lister les politiques créées
SELECT 
  policyname,
  cmd
FROM pg_policies
WHERE tablename = 'objects'
  AND policyname LIKE '%event-logos%'
ORDER BY policyname;

-- Vérifier la configuration du bucket
SELECT 
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
FROM storage.buckets
WHERE id = 'event-logos';
