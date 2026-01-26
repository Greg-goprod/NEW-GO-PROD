-- Test d'accès aux données social_media_data pour Naza

-- 1. Test simple : Lire directement depuis social_media_data
SELECT 
  'Test 1: Lecture directe' as test,
  COUNT(*) as nb_rows
FROM public.social_media_data;

-- 2. Test avec JOIN sur artists
SELECT 
  'Test 2: JOIN avec artists' as test,
  COUNT(*) as nb_rows
FROM public.artists a
LEFT JOIN public.social_media_data smd ON smd.artist_id = a.id;

-- 3. Test spécifique pour Naza
SELECT 
  'Test 3: Données Naza' as test,
  a.name,
  smd.instagram_url,
  smd.facebook_url,
  smd.youtube_url
FROM public.artists a
LEFT JOIN public.social_media_data smd ON smd.artist_id = a.id
WHERE LOWER(a.name) LIKE '%naza%';

-- 4. Simuler la requête exacte de Supabase (avec *)
SELECT 
  a.*,
  (SELECT row_to_json(sd.*) 
   FROM public.spotify_data sd 
   WHERE sd.artist_id = a.id) as spotify_data,
  (SELECT row_to_json(smd.*) 
   FROM public.social_media_data smd 
   WHERE smd.artist_id = a.id) as social_media_data
FROM public.artists a
WHERE LOWER(a.name) LIKE '%naza%';

-- 5. Vérifier les permissions de la table
SELECT 
  grantee,
  privilege_type
FROM information_schema.role_table_grants 
WHERE table_name = 'social_media_data';



