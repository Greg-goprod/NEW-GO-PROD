-- =============================================================================
-- Script 2: RÉASSOCIER les photos aux contacts dans la NOUVELLE base
-- =============================================================================
-- À exécuter sur votre NOUVELLE base de données (après migration CRM)
-- =============================================================================

-- ⚠️ PRÉREQUIS :
-- 1. Les contacts doivent être importés dans crm_contacts
-- 2. Les photos doivent être présentes dans le bucket storage "contact-photos"
-- 3. Les URLs de photos doivent pointer vers le même bucket

-- =============================================================================
-- Étape 1: Vérifier l'état actuel
-- =============================================================================

-- Compter les contacts avec et sans photos
SELECT 
  CASE 
    WHEN photo_url IS NOT NULL THEN 'Avec photo'
    ELSE 'Sans photo'
  END as status,
  count(*) as nombre
FROM public.crm_contacts
GROUP BY CASE WHEN photo_url IS NOT NULL THEN 'Avec photo' ELSE 'Sans photo' END;

-- =============================================================================
-- Étape 2: Lister les contacts de la nouvelle BD avec leurs anciennes photos
-- =============================================================================

-- Si vous avez gardé les mêmes IDs lors de l'import
SELECT 
  id,
  first_name,
  last_name,
  email_primary,
  photo_url
FROM public.crm_contacts
WHERE photo_url IS NOT NULL
ORDER BY last_name, first_name;

-- =============================================================================
-- Étape 3: MISE À JOUR - Réassocier les photos par ID de contact
-- =============================================================================

-- Option A: Si les IDs de contacts sont IDENTIQUES entre ancienne et nouvelle BD
-- Les photos ont déjà été importées avec les bons IDs, pas besoin de mise à jour
-- Vérifier simplement que les URLs sont correctes

SELECT 
  id,
  first_name,
  last_name,
  photo_url,
  CASE 
    WHEN photo_url LIKE '%contact-photos%' THEN '✅ URL correcte'
    WHEN photo_url IS NULL THEN '⚠️ Pas de photo'
    ELSE '❌ URL invalide'
  END as validation
FROM public.crm_contacts
ORDER BY 
  CASE 
    WHEN photo_url IS NULL THEN 2
    WHEN photo_url LIKE '%contact-photos%' THEN 0
    ELSE 1
  END,
  last_name;

-- =============================================================================
-- Étape 4: CORRECTION - Mettre à jour les URLs si nécessaire
-- =============================================================================

-- Option B: Si vous devez corriger les URLs de photos
-- Exemple: remplacer l'ancienne URL Supabase par la nouvelle

DO $$
DECLARE
  v_old_supabase_url text := 'https://OLD_PROJECT.supabase.co';
  v_new_supabase_url text := 'https://oqqphvcylcsxgxbtvwau.supabase.co';
  v_updated integer;
BEGIN
  -- Mettre à jour les URLs de photos
  UPDATE public.crm_contacts
  SET photo_url = replace(photo_url, v_old_supabase_url, v_new_supabase_url)
  WHERE photo_url LIKE v_old_supabase_url || '%';
  
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RAISE NOTICE '✅ % URLs de photos mises à jour', v_updated;
END $$;

-- =============================================================================
-- Étape 5: RÉASSOCIATION MANUELLE - Par liste de correspondances
-- =============================================================================

-- Option C: Si vous avez un mapping manuel contact_id <-> photo_url
-- Utilisez cette structure pour mettre à jour par batch

UPDATE public.crm_contacts
SET photo_url = mapping.new_photo_url
FROM (VALUES
  -- Format: (contact_id, photo_url)
  ('10c9f05a-fd5b-4de1-b4aa-d687b51850c7', 'https://oqqphvcylcsxgxbtvwau.supabase.co/storage/v1/object/public/contact-photos/10c9f05a-fd5b-4de1-b4aa-d687b51850c7-1750507460499.jpg'),
  ('352564c5-9237-4b54-8707-7e003afdc6e4', 'https://oqqphvcylcsxgxbtvwau.supabase.co/storage/v1/object/public/contact-photos/temp-1756725655220.jpg'),
  ('3efe35e3-5f7a-4802-831c-76a77e33e90e', 'https://oqqphvcylcsxgxbtvwau.supabase.co/storage/v1/object/public/contact-photos/3efe35e3-5f7a-4802-831c-76a77e33e90e-1750507506809.jpg'),
  ('4d67d9f5-14c2-4868-bdd3-0d76bfbb019f', 'https://oqqphvcylcsxgxbtvwau.supabase.co/storage/v1/object/public/contact-photos/4d67d9f5-14c2-4868-bdd3-0d76bfbb019f-1750507580608.jpg'),
  ('d1962b96-f4f3-4961-962c-0838238290a1', 'https://oqqphvcylcsxgxbtvwau.supabase.co/storage/v1/object/public/contact-photos/temp-1756726013401.jpg'),
  ('dbc61307-d82c-4096-a55c-c91027428d2d', 'https://oqqphvcylcsxgxbtvwau.supabase.co/storage/v1/object/public/contact-photos/temp-1756728833483.jpg'),
  ('de9b7525-876b-44f6-bc91-69a500b95c2e', 'https://oqqphvcylcsxgxbtvwau.supabase.co/storage/v1/object/public/contact-photos/de9b7525-876b-44f6-bc91-69a500b95c2e-1750507521625.jpg'),
  ('df64b309-6a23-45da-bb89-f765e30fd4dc', 'https://oqqphvcylcsxgxbtvwau.supabase.co/storage/v1/object/public/contact-photos/df64b309-6a23-45da-bb89-f765e30fd4dc-1750659379159.jpg'),
  ('e93d2129-ae18-48e8-aeea-e30de5d7117d', 'https://oqqphvcylcsxgxbtvwau.supabase.co/storage/v1/object/public/contact-photos/temp-1756726598760.jpg'),
  ('f5c919e2-93a2-4dc5-ab93-5b0c8f1dd06d', 'https://oqqphvcylcsxgxbtvwau.supabase.co/storage/v1/object/public/contact-photos/temp-1756725228467.jpg'),
  ('f8ff4458-1084-4cad-a539-2fd459b08eb1', 'https://oqqphvcylcsxgxbtvwau.supabase.co/storage/v1/object/public/contact-photos/temp-1756725754791.jpg')
  -- Ajoutez vos autres contacts ici...
) AS mapping(contact_id, new_photo_url)
WHERE crm_contacts.id = mapping.contact_id::uuid;

-- =============================================================================
-- Étape 6: RÉASSOCIATION AUTOMATIQUE - Par email (si IDs différents)
-- =============================================================================

-- Option D: Si les IDs ont changé, matcher par email
-- ATTENTION: Ne fonctionne que si les emails sont uniques !

DO $$
DECLARE
  v_updated integer := 0;
BEGIN
  -- Créer une table temporaire avec les anciennes correspondances
  CREATE TEMP TABLE temp_old_photos (
    old_contact_id uuid,
    email text,
    photo_url text
  );
  
  -- Insérer les anciennes données (à adapter selon votre export)
  INSERT INTO temp_old_photos (old_contact_id, email, photo_url) VALUES
    ('10c9f05a-fd5b-4de1-b4aa-d687b51850c7', 'artists@venogefestival.ch', 'https://oqqphvcylcsxgxbtvwau.supabase.co/storage/v1/object/public/contact-photos/10c9f05a-fd5b-4de1-b4aa-d687b51850c7-1750507460499.jpg');
    -- Ajoutez les autres...
  
  -- Mettre à jour par email
  UPDATE public.crm_contacts c
  SET photo_url = t.photo_url
  FROM temp_old_photos t
  WHERE c.email_primary = t.email
    AND t.photo_url IS NOT NULL;
  
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RAISE NOTICE '✅ % photos réassociées par email', v_updated;
  
  DROP TABLE temp_old_photos;
END $$;

-- =============================================================================
-- Étape 7: Vérification finale
-- =============================================================================

-- Lister les contacts avec photos après mise à jour
SELECT 
  id,
  first_name,
  last_name,
  email_primary,
  photo_url,
  CASE 
    WHEN photo_url IS NOT NULL AND photo_url LIKE '%contact-photos%' THEN '✅'
    WHEN photo_url IS NULL THEN '⚠️'
    ELSE '❌'
  END as status
FROM public.crm_contacts
ORDER BY 
  CASE 
    WHEN photo_url IS NULL THEN 2
    WHEN photo_url LIKE '%contact-photos%' THEN 0
    ELSE 1
  END,
  last_name, first_name;

-- Compter le résultat final
SELECT 
  CASE 
    WHEN photo_url IS NOT NULL AND photo_url LIKE '%contact-photos%' THEN '✅ Photo valide'
    WHEN photo_url IS NULL THEN '⚠️ Pas de photo'
    ELSE '❌ Photo invalide'
  END as status,
  count(*) as nombre
FROM public.crm_contacts
GROUP BY 
  CASE 
    WHEN photo_url IS NOT NULL AND photo_url LIKE '%contact-photos%' THEN '✅ Photo valide'
    WHEN photo_url IS NULL THEN '⚠️ Pas de photo'
    ELSE '❌ Photo invalide'
  END
ORDER BY status;

-- =============================================================================
-- ℹ️ NOTES IMPORTANTES
-- =============================================================================
-- 
-- 1. Les fichiers dans storage.objects doivent exister physiquement
-- 2. Le bucket "contact-photos" doit être public ou accessible
-- 3. Les URLs doivent pointer vers le bon projet Supabase
-- 4. Format URL: https://[project].supabase.co/storage/v1/object/public/contact-photos/[filename]
-- 
-- =============================================================================











