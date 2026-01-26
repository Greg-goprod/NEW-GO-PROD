-- =============================================================================
-- Script 1: RÉCUPÉRER les contacts avec photos depuis l'ANCIENNE base
-- =============================================================================
-- À exécuter sur votre ANCIENNE base de données Supabase
-- =============================================================================

-- Option A: Lister tous les contacts avec leurs photos (si photo_url existe)
SELECT 
  id as contact_id,
  first_name,
  last_name,
  email,
  photo_url,
  -- Extraire le nom du fichier de l'URL
  CASE 
    WHEN photo_url IS NOT NULL 
    THEN substring(photo_url from '.*contact-photos/(.*)$')
    ELSE NULL
  END as photo_filename
FROM public.contacts
WHERE photo_url IS NOT NULL
  AND photo_url != ''
ORDER BY last_name, first_name;

-- =============================================================================
-- Option B: Export CSV pour réimport facile
-- =============================================================================
-- Copier le résultat et sauvegarder en CSV

SELECT 
  id::text as contact_id,
  first_name,
  last_name,
  email,
  photo_url
FROM public.contacts
WHERE photo_url IS NOT NULL
  AND photo_url != ''
ORDER BY last_name, first_name;

-- =============================================================================
-- Option C: Vérifier le bucket storage et les fichiers
-- =============================================================================
-- Lister tous les fichiers dans le bucket contact-photos

SELECT 
  name as filename,
  id,
  bucket_id,
  metadata,
  created_at
FROM storage.objects
WHERE bucket_id = 'contact-photos'
ORDER BY created_at DESC;

-- =============================================================================
-- Option D: Mapping complet contacts <-> photos
-- =============================================================================
-- Jointure entre les contacts et les fichiers storage

SELECT 
  c.id as contact_id,
  c.first_name,
  c.last_name,
  c.email,
  c.photo_url,
  o.name as storage_filename,
  o.id as storage_object_id,
  o.created_at as photo_uploaded_at,
  (o.metadata->>'size')::bigint as photo_size_bytes,
  o.metadata->>'mimetype' as photo_mimetype
FROM public.contacts c
LEFT JOIN storage.objects o 
  ON o.bucket_id = 'contact-photos'
  AND (
    -- Matcher par nom de fichier extrait de l'URL
    o.name = substring(c.photo_url from '.*contact-photos/(.*)$')
    OR
    -- Matcher par ID de contact dans le nom du fichier
    o.name LIKE c.id::text || '%'
  )
WHERE c.photo_url IS NOT NULL
ORDER BY c.last_name, c.first_name;

-- =============================================================================
-- RÉSULTAT ATTENDU
-- =============================================================================
-- Vous obtiendrez la liste des contacts avec leurs photos associées.
-- Utilisez ces informations pour le script de réassociation.











