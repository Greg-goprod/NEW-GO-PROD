-- Script de test pour vérifier le système d'historique Spotify

-- 1. Vérifier que la table existe
SELECT 
  'Table spotify_history' as test,
  CASE 
    WHEN EXISTS (SELECT FROM pg_tables WHERE tablename = 'spotify_history') 
    THEN '✅ OK' 
    ELSE '❌ Manquante' 
  END as status;

-- 2. Vérifier les index
SELECT 
  'Index sur artist_id' as test,
  CASE 
    WHEN EXISTS (SELECT FROM pg_indexes WHERE indexname = 'idx_spotify_history_artist_id') 
    THEN '✅ OK' 
    ELSE '❌ Manquant' 
  END as status
UNION ALL
SELECT 
  'Index sur recorded_at' as test,
  CASE 
    WHEN EXISTS (SELECT FROM pg_indexes WHERE indexname = 'idx_spotify_history_recorded_at') 
    THEN '✅ OK' 
    ELSE '❌ Manquant' 
  END as status;

-- 3. Vérifier la vue
SELECT 
  'Vue spotify_stats_with_change' as test,
  CASE 
    WHEN EXISTS (SELECT FROM pg_views WHERE viewname = 'spotify_stats_with_change') 
    THEN '✅ OK' 
    ELSE '❌ Manquante' 
  END as status;

-- 4. Compter les entrées actuelles
SELECT 
  'Entrées historiques' as info,
  COUNT(*) as count,
  MIN(recorded_at)::date as premiere_date,
  MAX(recorded_at)::date as derniere_date
FROM spotify_history;

-- 5. Statistiques par artiste
SELECT 
  a.name as artiste,
  COUNT(h.*) as nb_entrees,
  MIN(h.recorded_at)::date as premiere_mesure,
  MAX(h.recorded_at)::date as derniere_mesure,
  MAX(h.followers) as max_followers,
  MAX(h.popularity) as max_popularity
FROM spotify_history h
INNER JOIN artists a ON a.id = h.artist_id
GROUP BY a.id, a.name
ORDER BY nb_entrees DESC
LIMIT 10;

-- 6. Créer des données de test pour 1 artiste (OPTIONNEL - décommenter pour tester)
/*
-- Remplacez 'UUID-DE-VOTRE-ARTISTE' par un vrai UUID d'artiste
DO $$
DECLARE
  test_artist_id UUID := '0df832b8-756c-41ff-b247-68d529ed08c5'; -- James Blunt par exemple
  base_followers INT := 3000000;
  base_popularity INT := 65;
  i INT;
BEGIN
  -- Créer 30 jours de données de test
  FOR i IN 1..30 LOOP
    INSERT INTO spotify_history (artist_id, followers, popularity, recorded_at)
    VALUES (
      test_artist_id,
      base_followers + (i * 1000) + (RANDOM() * 5000)::INT, -- Croissance progressive
      LEAST(100, base_popularity + (i / 5) + (RANDOM() * 3)::INT), -- Popularité augmente lentement
      NOW() - INTERVAL '30 days' + (i || ' days')::INTERVAL
    )
    ON CONFLICT (artist_id, recorded_at) DO NOTHING;
  END LOOP;
  
  RAISE NOTICE 'Données de test créées pour l''artiste %', test_artist_id;
END $$;

-- Vérifier les données créées
SELECT 
  a.name,
  h.followers,
  h.popularity,
  h.recorded_at::date
FROM spotify_history h
INNER JOIN artists a ON a.id = h.artist_id
WHERE h.recorded_at >= NOW() - INTERVAL '30 days'
ORDER BY h.recorded_at DESC
LIMIT 10;
*/

-- 7. Tester la vue avec variations
SELECT * FROM spotify_stats_with_change
ORDER BY followers_change DESC NULLS LAST
LIMIT 5;



