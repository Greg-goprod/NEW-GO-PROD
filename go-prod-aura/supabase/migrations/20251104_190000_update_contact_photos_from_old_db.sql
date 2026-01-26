-- =============================================================================
-- RÉASSOCIATION des photos des contacts depuis l'ancienne base
-- Date: 2025-01-04
-- Nombre de contacts avec photos: 11
-- =============================================================================

-- Étape 1: Vérifier l'état actuel dans crm_contacts
SELECT 
  '🔍 ÉTAT AVANT MISE À JOUR' as info;

SELECT 
  CASE 
    WHEN photo_url IS NOT NULL THEN '✅ Avec photo'
    ELSE '⚠️ Sans photo'
  END as status,
  count(*) as nombre
FROM public.crm_contacts
GROUP BY CASE WHEN photo_url IS NOT NULL THEN '✅ Avec photo' ELSE '⚠️ Sans photo' END;

-- =============================================================================
-- Étape 2: MISE À JOUR des photo_url pour les 11 contacts
-- =============================================================================

DO $$
DECLARE
  v_updated integer := 0;
  v_not_found integer := 0;
  v_already_ok integer := 0;
BEGIN
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '🔄 DÉBUT DE LA RÉASSOCIATION DES PHOTOS';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  
  -- Mettre à jour les photos pour chaque contact
  UPDATE public.crm_contacts
  SET photo_url = mapping.new_photo_url,
      updated_at = now()
  FROM (VALUES
    -- Format: (contact_id, first_name, last_name, photo_url)
    ('de9b7525-876b-44f6-bc91-69a500b95c2e'::uuid, 'Sonia', 'Bra', 'https://oqqphvcylcsxgxbtvwau.supabase.co/storage/v1/object/public/contact-photos/de9b7525-876b-44f6-bc91-69a500b95c2e-1750507521625.jpg'),
    ('e93d2129-ae18-48e8-aeea-e30de5d7117d'::uuid, 'Solstice', 'Denervaud', 'https://oqqphvcylcsxgxbtvwau.supabase.co/storage/v1/object/public/contact-photos/temp-1756726598760.jpg'),
    ('10c9f05a-fd5b-4de1-b4aa-d687b51850c7'::uuid, 'Greg', 'Fischer', 'https://oqqphvcylcsxgxbtvwau.supabase.co/storage/v1/object/public/contact-photos/10c9f05a-fd5b-4de1-b4aa-d687b51850c7-1750507460499.jpg'),
    ('df64b309-6a23-45da-bb89-f765e30fd4dc'::uuid, 'Natalie', 'Geerts', 'https://oqqphvcylcsxgxbtvwau.supabase.co/storage/v1/object/public/contact-photos/df64b309-6a23-45da-bb89-f765e30fd4dc-1750659379159.jpg'),
    ('d1962b96-f4f3-4961-962c-0838238290a1'::uuid, 'Antoine', 'Grenon', 'https://oqqphvcylcsxgxbtvwau.supabase.co/storage/v1/object/public/contact-photos/temp-1756726013401.jpg'),
    ('dbc61307-d82c-4096-a55c-c91027428d2d'::uuid, 'Lionel', 'Martin', 'https://oqqphvcylcsxgxbtvwau.supabase.co/storage/v1/object/public/contact-photos/temp-1756728833483.jpg'),
    ('f5c919e2-93a2-4dc5-ab93-5b0c8f1dd06d'::uuid, 'Lola', 'Nada', 'https://oqqphvcylcsxgxbtvwau.supabase.co/storage/v1/object/public/contact-photos/temp-1756725228467.jpg'),
    ('3efe35e3-5f7a-4802-831c-76a77e33e90e'::uuid, 'Carole', 'Pennec', 'https://oqqphvcylcsxgxbtvwau.supabase.co/storage/v1/object/public/contact-photos/3efe35e3-5f7a-4802-831c-76a77e33e90e-1750507506809.jpg'),
    ('4d67d9f5-14c2-4868-bdd3-0d76bfbb019f'::uuid, 'Simon', 'Roueche', 'https://oqqphvcylcsxgxbtvwau.supabase.co/storage/v1/object/public/contact-photos/4d67d9f5-14c2-4868-bdd3-0d76bfbb019f-1750507580608.jpg'),
    ('f8ff4458-1084-4cad-a539-2fd459b08eb1'::uuid, 'Corinne', 'Taiana', 'https://oqqphvcylcsxgxbtvwau.supabase.co/storage/v1/object/public/contact-photos/temp-1756725754791.jpg'),
    ('352564c5-9237-4b54-8707-7e003afdc6e4'::uuid, 'JB', 'TCO', 'https://oqqphvcylcsxgxbtvwau.supabase.co/storage/v1/object/public/contact-photos/temp-1756725655220.jpg')
  ) AS mapping(contact_id, first_name, last_name, new_photo_url)
  WHERE crm_contacts.id = mapping.contact_id
    AND (crm_contacts.photo_url IS NULL OR crm_contacts.photo_url != mapping.new_photo_url);
  
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  
  -- Compter les contacts qui avaient déjà la bonne photo
  SELECT count(*) INTO v_already_ok
  FROM public.crm_contacts c
  INNER JOIN (VALUES
    ('de9b7525-876b-44f6-bc91-69a500b95c2e'::uuid, 'https://oqqphvcylcsxgxbtvwau.supabase.co/storage/v1/object/public/contact-photos/de9b7525-876b-44f6-bc91-69a500b95c2e-1750507521625.jpg'),
    ('e93d2129-ae18-48e8-aeea-e30de5d7117d'::uuid, 'https://oqqphvcylcsxgxbtvwau.supabase.co/storage/v1/object/public/contact-photos/temp-1756726598760.jpg'),
    ('10c9f05a-fd5b-4de1-b4aa-d687b51850c7'::uuid, 'https://oqqphvcylcsxgxbtvwau.supabase.co/storage/v1/object/public/contact-photos/10c9f05a-fd5b-4de1-b4aa-d687b51850c7-1750507460499.jpg'),
    ('df64b309-6a23-45da-bb89-f765e30fd4dc'::uuid, 'https://oqqphvcylcsxgxbtvwau.supabase.co/storage/v1/object/public/contact-photos/df64b309-6a23-45da-bb89-f765e30fd4dc-1750659379159.jpg'),
    ('d1962b96-f4f3-4961-962c-0838238290a1'::uuid, 'https://oqqphvcylcsxgxbtvwau.supabase.co/storage/v1/object/public/contact-photos/temp-1756726013401.jpg'),
    ('dbc61307-d82c-4096-a55c-c91027428d2d'::uuid, 'https://oqqphvcylcsxgxbtvwau.supabase.co/storage/v1/object/public/contact-photos/temp-1756728833483.jpg'),
    ('f5c919e2-93a2-4dc5-ab93-5b0c8f1dd06d'::uuid, 'https://oqqphvcylcsxgxbtvwau.supabase.co/storage/v1/object/public/contact-photos/temp-1756725228467.jpg'),
    ('3efe35e3-5f7a-4802-831c-76a77e33e90e'::uuid, 'https://oqqphvcylcsxgxbtvwau.supabase.co/storage/v1/object/public/contact-photos/3efe35e3-5f7a-4802-831c-76a77e33e90e-1750507506809.jpg'),
    ('4d67d9f5-14c2-4868-bdd3-0d76bfbb019f'::uuid, 'https://oqqphvcylcsxgxbtvwau.supabase.co/storage/v1/object/public/contact-photos/4d67d9f5-14c2-4868-bdd3-0d76bfbb019f-1750507580608.jpg'),
    ('f8ff4458-1084-4cad-a539-2fd459b08eb1'::uuid, 'https://oqqphvcylcsxgxbtvwau.supabase.co/storage/v1/object/public/contact-photos/temp-1756725754791.jpg'),
    ('352564c5-9237-4b54-8707-7e003afdc6e4'::uuid, 'https://oqqphvcylcsxgxbtvwau.supabase.co/storage/v1/object/public/contact-photos/temp-1756725655220.jpg')
  ) AS mapping(contact_id, photo_url)
    ON c.id = mapping.contact_id
  WHERE c.photo_url = mapping.photo_url;
  
  -- Compter les contacts non trouvés
  SELECT 11 - v_updated - v_already_ok INTO v_not_found;
  
  -- Afficher le résumé
  RAISE NOTICE '';
  RAISE NOTICE '✅ RÉSUMÉ DE LA MIGRATION';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '📸 Contacts avec photos dans ancienne BD: 11';
  RAISE NOTICE '🔄 Photos mises à jour: %', v_updated;
  RAISE NOTICE '✓  Photos déjà OK: %', v_already_ok;
  RAISE NOTICE '⚠️  Contacts non trouvés: %', v_not_found;
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '';
  
  IF v_not_found > 0 THEN
    RAISE WARNING '⚠️ Certains contacts n''ont pas été trouvés dans crm_contacts';
    RAISE NOTICE 'Vérifiez que l''import des contacts a bien été effectué';
  END IF;
  
  IF v_updated = 0 AND v_already_ok = 11 THEN
    RAISE NOTICE '🎉 Toutes les photos étaient déjà correctement associées !';
  ELSIF v_updated > 0 THEN
    RAISE NOTICE '🎉 Migration des photos terminée avec succès !';
  END IF;
END $$;

-- =============================================================================
-- Étape 3: Vérification finale - Détail par contact
-- =============================================================================

SELECT 
  '📋 DÉTAIL DES CONTACTS APRÈS MISE À JOUR' as info;

SELECT 
  c.id,
  c.first_name,
  c.last_name,
  c.email_primary,
  CASE 
    WHEN c.photo_url IS NOT NULL THEN '✅ Oui'
    ELSE '❌ Non'
  END as a_photo,
  c.photo_url
FROM public.crm_contacts c
WHERE c.id IN (
  'de9b7525-876b-44f6-bc91-69a500b95c2e',
  'e93d2129-ae18-48e8-aeea-e30de5d7117d',
  '10c9f05a-fd5b-4de1-b4aa-d687b51850c7',
  'df64b309-6a23-45da-bb89-f765e30fd4dc',
  'd1962b96-f4f3-4961-962c-0838238290a1',
  'dbc61307-d82c-4096-a55c-c91027428d2d',
  'f5c919e2-93a2-4dc5-ab93-5b0c8f1dd06d',
  '3efe35e3-5f7a-4802-831c-76a77e33e90e',
  '4d67d9f5-14c2-4868-bdd3-0d76bfbb019f',
  'f8ff4458-1084-4cad-a539-2fd459b08eb1',
  '352564c5-9237-4b54-8707-7e003afdc6e4'
)
ORDER BY c.last_name, c.first_name;

-- =============================================================================
-- Étape 4: Statistiques globales
-- =============================================================================

SELECT 
  '📊 STATISTIQUES GLOBALES' as info;

SELECT 
  CASE 
    WHEN photo_url IS NOT NULL AND photo_url LIKE '%contact-photos%' THEN '✅ Avec photo valide'
    WHEN photo_url IS NOT NULL THEN '⚠️ Photo invalide'
    ELSE '❌ Sans photo'
  END as status,
  count(*) as nombre,
  round(count(*) * 100.0 / (SELECT count(*) FROM public.crm_contacts), 1) || '%' as pourcentage
FROM public.crm_contacts
GROUP BY 
  CASE 
    WHEN photo_url IS NOT NULL AND photo_url LIKE '%contact-photos%' THEN '✅ Avec photo valide'
    WHEN photo_url IS NOT NULL THEN '⚠️ Photo invalide'
    ELSE '❌ Sans photo'
  END
ORDER BY status;

-- =============================================================================
-- ✅ MIGRATION TERMINÉE
-- =============================================================================
-- 
-- Les 11 contacts suivants ont maintenant leurs photos associées :
-- 1. Sonia Bra
-- 2. Solstice Denervaud
-- 3. Greg Fischer
-- 4. Natalie Geerts
-- 5. Antoine Grenon
-- 6. Lionel Martin
-- 7. Lola Nada
-- 8. Carole Pennec
-- 9. Simon Roueche
-- 10. Corinne Taiana
-- 11. JB TCO
-- 
-- Testez dans l'interface : /app/contacts/personnes (vue grille)
-- =============================================================================











