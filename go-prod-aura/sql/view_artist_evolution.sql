-- Script pour visualiser l'évolution d'un artiste spécifique
-- Remplacez l'UUID par celui de votre artiste

-- 1. Liste des artistes disponibles avec données Spotify
SELECT 
  a.id,
  a.name,
  sd.followers,
  sd.popularity,
  (
    SELECT COUNT(*) 
    FROM spotify_history h 
    WHERE h.artist_id = a.id
  ) as nb_points_historiques
FROM artists a
INNER JOIN spotify_data sd ON sd.artist_id = a.id
WHERE a.company_id = '06f6c960-3f90-41cb-b0d7-46937eaf90a8'
  AND sd.followers IS NOT NULL
ORDER BY a.name;

-- 2. Évolution d'un artiste spécifique (exemple: GAZO)
-- Remplacez l'UUID ci-dessous
WITH artist_history AS (
  SELECT 
    h.recorded_at::date as date,
    h.followers,
    h.popularity,
    LAG(h.followers) OVER (ORDER BY h.recorded_at) as prev_followers,
    LAG(h.popularity) OVER (ORDER BY h.recorded_at) as prev_popularity
  FROM spotify_history h
  WHERE h.artist_id = '03f55e62-9549-4633-a830-0f77b004e600' -- GAZO
  ORDER BY h.recorded_at
)
SELECT 
  date,
  followers,
  CASE 
    WHEN prev_followers IS NOT NULL 
    THEN followers - prev_followers 
    ELSE NULL 
  END as followers_change,
  popularity,
  CASE 
    WHEN prev_popularity IS NOT NULL 
    THEN popularity - prev_popularity 
    ELSE NULL 
  END as popularity_change
FROM artist_history
ORDER BY date DESC
LIMIT 30;

-- 3. Statistiques résumées pour cet artiste
SELECT 
  a.name,
  COUNT(h.*) as nb_mesures,
  MIN(h.recorded_at)::date as premiere_mesure,
  MAX(h.recorded_at)::date as derniere_mesure,
  MIN(h.followers) as min_followers,
  MAX(h.followers) as max_followers,
  MAX(h.followers) - MIN(h.followers) as croissance_totale,
  ROUND(
    (MAX(h.followers)::numeric - MIN(h.followers)::numeric) / NULLIF(MIN(h.followers)::numeric, 0) * 100,
    2
  ) as pourcentage_croissance,
  MIN(h.popularity) as min_popularity,
  MAX(h.popularity) as max_popularity,
  ROUND(AVG(h.popularity)::numeric, 1) as avg_popularity
FROM spotify_history h
INNER JOIN artists a ON a.id = h.artist_id
WHERE h.artist_id = '03f55e62-9549-4633-a830-0f77b004e600' -- GAZO
GROUP BY a.name;

-- 4. Comparer plusieurs artistes (top 5 en croissance)
WITH artist_stats AS (
  SELECT 
    a.id,
    a.name,
    MAX(h.followers) - MIN(h.followers) as croissance,
    COUNT(h.*) as nb_mesures
  FROM spotify_history h
  INNER JOIN artists a ON a.id = h.artist_id
  WHERE h.recorded_at >= NOW() - INTERVAL '30 days'
  GROUP BY a.id, a.name
  HAVING COUNT(h.*) > 5
)
SELECT 
  name,
  croissance,
  nb_mesures,
  ROUND(croissance::numeric / nb_mesures::numeric, 0) as croissance_par_jour
FROM artist_stats
ORDER BY croissance DESC
LIMIT 5;



