-- Script pour reconstruire toutes les external_url manquantes
-- à partir des spotify_id existants

-- 1. Afficher le nombre d'artistes concernés
SELECT 
  'Artistes avec spotify_id mais sans external_url' as info,
  COUNT(*) as count
FROM spotify_data
WHERE spotify_id IS NOT NULL 
  AND spotify_id != ''
  AND (external_url IS NULL OR external_url = '');

-- 2. Prévisualiser les changements
SELECT 
  sd.artist_id,
  a.name,
  sd.spotify_id,
  sd.external_url as current_url,
  'https://open.spotify.com/artist/' || sd.spotify_id as new_url
FROM spotify_data sd
INNER JOIN artists a ON a.id = sd.artist_id
WHERE sd.spotify_id IS NOT NULL 
  AND sd.spotify_id != ''
  AND (sd.external_url IS NULL OR sd.external_url = '')
ORDER BY a.name;

-- 3. APPLIQUER LA CORRECTION
-- Décommentez les lignes ci-dessous pour exécuter la mise à jour

UPDATE spotify_data
SET 
  external_url = 'https://open.spotify.com/artist/' || spotify_id,
  updated_at = NOW()
WHERE spotify_id IS NOT NULL 
  AND spotify_id != ''
  AND (external_url IS NULL OR external_url = '');

-- 4. Vérifier le résultat
SELECT 
  'Artistes après correction' as info,
  COUNT(*) as count
FROM spotify_data
WHERE spotify_id IS NOT NULL 
  AND (external_url IS NULL OR external_url = '');



