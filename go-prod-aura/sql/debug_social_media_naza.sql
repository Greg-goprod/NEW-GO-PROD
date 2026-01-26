-- Script de debug pour vérifier les données réseaux sociaux de Naza

-- 1. Trouver l'artiste Naza
SELECT 
  id,
  name,
  company_id,
  status,
  created_at
FROM public.artists
WHERE LOWER(name) LIKE '%naza%';

-- 2. Vérifier les données social_media_data pour Naza
SELECT 
  smd.artist_id,
  a.name AS artist_name,
  smd.instagram_url,
  smd.facebook_url,
  smd.twitter_url,
  smd.youtube_url,
  smd.tiktok_url,
  smd.website_url,
  smd.threads_url,
  smd.soundcloud_url,
  smd.bandcamp_url,
  smd.wikipedia_url,
  smd.updated_at,
  smd.last_checked_at
FROM public.social_media_data smd
INNER JOIN public.artists a ON a.id = smd.artist_id
WHERE LOWER(a.name) LIKE '%naza%';

-- 3. Compter les liens non NULL pour Naza
SELECT 
  a.name AS artist_name,
  CASE WHEN smd.instagram_url IS NOT NULL THEN 1 ELSE 0 END +
  CASE WHEN smd.facebook_url IS NOT NULL THEN 1 ELSE 0 END +
  CASE WHEN smd.twitter_url IS NOT NULL THEN 1 ELSE 0 END +
  CASE WHEN smd.youtube_url IS NOT NULL THEN 1 ELSE 0 END +
  CASE WHEN smd.tiktok_url IS NOT NULL THEN 1 ELSE 0 END +
  CASE WHEN smd.website_url IS NOT NULL THEN 1 ELSE 0 END +
  CASE WHEN smd.threads_url IS NOT NULL THEN 1 ELSE 0 END +
  CASE WHEN smd.soundcloud_url IS NOT NULL THEN 1 ELSE 0 END +
  CASE WHEN smd.bandcamp_url IS NOT NULL THEN 1 ELSE 0 END +
  CASE WHEN smd.wikipedia_url IS NOT NULL THEN 1 ELSE 0 END AS total_liens
FROM public.social_media_data smd
INNER JOIN public.artists a ON a.id = smd.artist_id
WHERE LOWER(a.name) LIKE '%naza%';

-- 4. Requête exacte comme dans le code
SELECT 
  a.*,
  sd.*,
  smd.*
FROM public.artists a
LEFT JOIN public.spotify_data sd ON sd.artist_id = a.id
LEFT JOIN public.social_media_data smd ON smd.artist_id = a.id
WHERE LOWER(a.name) LIKE '%naza%';

-- 5. Vérifier la relation (doit être 1-to-1)
SELECT 
  a.name,
  COUNT(smd.artist_id) as nb_social_media_rows
FROM public.artists a
LEFT JOIN public.social_media_data smd ON smd.artist_id = a.id
WHERE LOWER(a.name) LIKE '%naza%'
GROUP BY a.name;



