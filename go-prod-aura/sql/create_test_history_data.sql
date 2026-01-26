-- Script pour créer des données de test historiques
-- Permet de tester les graphiques immédiatement sans attendre 30 jours

-- Sélectionner 5 artistes aléatoires avec données Spotify
WITH selected_artists AS (
  SELECT 
    a.id,
    a.name,
    sd.followers as current_followers,
    sd.popularity as current_popularity
  FROM artists a
  INNER JOIN spotify_data sd ON sd.artist_id = a.id
  WHERE sd.followers IS NOT NULL
    AND a.company_id = '06f6c960-3f90-41cb-b0d7-46937eaf90a8'
  LIMIT 5
)
-- Créer 30 jours d'historique pour chaque artiste
INSERT INTO spotify_history (artist_id, followers, popularity, recorded_at)
SELECT 
  sa.id,
  -- Simuler une croissance progressive avec variation aléatoire
  GREATEST(
    FLOOR(sa.current_followers * (0.90 + (0.10 * (i::float / 30)))), -- Croissance de 90% à 100% sur 30j
    1000
  ) + FLOOR(RANDOM() * (sa.current_followers * 0.01))::INT, -- +/- 1% aléatoire
  
  -- Popularité varie légèrement autour de la valeur actuelle
  LEAST(
    100,
    GREATEST(
      0,
      sa.current_popularity + FLOOR(RANDOM() * 6 - 3)::INT -- +/- 3 points
    )
  ),
  
  -- Date : il y a 30 jours jusqu'à aujourd'hui
  NOW() - INTERVAL '30 days' + (i || ' days')::INTERVAL
FROM selected_artists sa
CROSS JOIN generate_series(0, 30) AS i
ON CONFLICT (artist_id, recorded_at) DO NOTHING;

-- Afficher les artistes avec données de test
SELECT 
  'Données de test créées pour:' as info,
  COUNT(DISTINCT artist_id) as nb_artistes,
  COUNT(*) as nb_entrees,
  MIN(recorded_at)::date as de,
  MAX(recorded_at)::date as a
FROM spotify_history;

-- Afficher un exemple d'évolution pour 1 artiste
SELECT 
  a.name,
  h.followers,
  h.popularity,
  h.recorded_at::date as date
FROM spotify_history h
INNER JOIN artists a ON a.id = h.artist_id
ORDER BY h.recorded_at DESC
LIMIT 10;

-- Tester la vue avec les variations
SELECT 
  name,
  current_followers,
  previous_followers,
  followers_change,
  popularity_change
FROM spotify_stats_with_change
WHERE followers_change IS NOT NULL
ORDER BY followers_change DESC
LIMIT 5;



