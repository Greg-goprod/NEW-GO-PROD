-- Script de diagnostic pour comprendre pourquoi les artistes ne s'affichent pas

-- 1. Compter le nombre total d'artistes
SELECT 
  'Total artistes' as info,
  COUNT(*) as count
FROM artists;

-- 2. Artistes par company_id
SELECT 
  'Artistes par company' as info,
  company_id,
  COUNT(*) as count
FROM artists
GROUP BY company_id;

-- 3. Artistes avec leurs données Spotify
SELECT 
  a.id,
  a.name,
  a.company_id,
  a.status,
  CASE 
    WHEN sd.artist_id IS NOT NULL THEN 'Oui'
    ELSE 'Non'
  END as has_spotify_data,
  sd.image_url,
  sd.external_url,
  sd.followers,
  sd.popularity
FROM artists a
LEFT JOIN spotify_data sd ON sd.artist_id = a.id
WHERE a.company_id = '06f6c960-3f90-41cb-b0d7-46937eaf90a8'
ORDER BY a.name;

-- 4. Vérifier les artistes sans données Spotify
SELECT 
  'Artistes sans données Spotify' as info,
  COUNT(*) as count
FROM artists a
LEFT JOIN spotify_data sd ON sd.artist_id = a.id
WHERE a.company_id = '06f6c960-3f90-41cb-b0d7-46937eaf90a8'
  AND sd.artist_id IS NULL;

-- 5. Vérifier les artistes avec données Spotify mais sans image
SELECT 
  'Artistes avec Spotify mais sans image' as info,
  COUNT(*) as count
FROM artists a
INNER JOIN spotify_data sd ON sd.artist_id = a.id
WHERE a.company_id = '06f6c960-3f90-41cb-b0d7-46937eaf90a8'
  AND (sd.image_url IS NULL OR sd.image_url = '');



