-- ============================================
-- SCRIPT DE VALIDATION POST-IMPORT
-- ============================================
-- À exécuter après 02-import-full.sql
-- Vérifie l'intégrité des données importées

-- ============================================
-- 1. Comptage des enregistrements
-- ============================================
\echo '\n========================================='
\echo 'COMPTAGE DES ENREGISTREMENTS'
\echo '========================================='

SELECT 'companies' as table_name, COUNT(*) as count FROM public.companies
UNION ALL
SELECT 'profiles', COUNT(*) FROM public.profiles
UNION ALL
SELECT 'artists', COUNT(*) FROM public.artists
UNION ALL
SELECT 'spotify_data', COUNT(*) FROM public.spotify_data
UNION ALL
SELECT 'social_media_data', COUNT(*) FROM public.social_media_data
UNION ALL
SELECT 'events', COUNT(*) FROM public.events
UNION ALL
SELECT 'event_artists', COUNT(*) FROM public.event_artists
UNION ALL
SELECT 'tags', COUNT(*) FROM public.tags
UNION ALL
SELECT 'artist_tags', COUNT(*) FROM public.artist_tags;

-- ============================================
-- 2. Vérification des FK (relations)
-- ============================================
\echo '\n========================================='
\echo 'VÉRIFICATION DES FOREIGN KEYS'
\echo '========================================='

-- Artists sans company_id (multi-tenant)
\echo '\n⚠️  Artists sans company_id :'
SELECT COUNT(*) as artists_without_company
FROM public.artists
WHERE company_id IS NULL;

-- Spotify_data orphelins (artist_id invalide)
\echo '\n⚠️  Spotify_data orphelins :'
SELECT COUNT(*) as orphan_spotify_data
FROM public.spotify_data s
LEFT JOIN public.artists a ON a.id = s.artist_id
WHERE a.id IS NULL;

-- Social_media_data orphelins
\echo '\n⚠️  Social_media_data orphelins :'
SELECT COUNT(*) as orphan_social_media
FROM public.social_media_data s
LEFT JOIN public.artists a ON a.id = s.artist_id
WHERE a.id IS NULL;

-- Event_artists avec event_id invalide
\echo '\n⚠️  Event_artists avec event_id invalide :'
SELECT COUNT(*) as invalid_event_ids
FROM public.event_artists ea
LEFT JOIN public.events e ON e.id = ea.event_id
WHERE e.id IS NULL;

-- Event_artists avec artist_id invalide
\echo '\n⚠️  Event_artists avec artist_id invalide :'
SELECT COUNT(*) as invalid_artist_ids
FROM public.event_artists ea
LEFT JOIN public.artists a ON a.id = ea.artist_id
WHERE a.id IS NULL;

-- ============================================
-- 3. Vérification des contraintes UNIQUE
-- ============================================
\echo '\n========================================='
\echo 'VÉRIFICATION DES CONTRAINTES UNIQUE'
\echo '========================================='

-- Spotify_data : chaque artist_id doit être unique
\echo '\nArtists avec plusieurs spotify_data (doit être 0) :'
SELECT artist_id, COUNT(*) as duplicate_count
FROM public.spotify_data
GROUP BY artist_id
HAVING COUNT(*) > 1;

-- Social_media_data : chaque artist_id doit être unique
\echo '\nArtists avec plusieurs social_media_data (doit être 0) :'
SELECT artist_id, COUNT(*) as duplicate_count
FROM public.social_media_data
GROUP BY artist_id
HAVING COUNT(*) > 1;

-- Event_artists : chaque (event_id, artist_id) doit être unique
\echo '\nDoublons dans event_artists (doit être 0) :'
SELECT event_id, artist_id, COUNT(*) as duplicate_count
FROM public.event_artists
GROUP BY event_id, artist_id
HAVING COUNT(*) > 1;

-- ============================================
-- 4. Vérification des valeurs obligatoires (NOT NULL)
-- ============================================
\echo '\n========================================='
\echo 'VÉRIFICATION DES VALEURS OBLIGATOIRES'
\echo '========================================='

-- Artists sans name
\echo '\nArtists sans name (doit être 0) :'
SELECT COUNT(*) as artists_without_name
FROM public.artists
WHERE name IS NULL OR name = '';

-- Artists avec status invalide
\echo '\nArtists avec status invalide (doit être 0) :'
SELECT COUNT(*) as invalid_status
FROM public.artists
WHERE status NOT IN ('active', 'inactive', 'archived');

-- Events sans name
\echo '\nEvents sans name (doit être 0) :'
SELECT COUNT(*) as events_without_name
FROM public.events
WHERE name IS NULL OR name = '';

-- Events sans date
\echo '\nEvents sans date (doit être 0) :'
SELECT COUNT(*) as events_without_date
FROM public.events
WHERE event_date IS NULL;

-- ============================================
-- 5. Statistiques de couverture des données
-- ============================================
\echo '\n========================================='
\echo 'STATISTIQUES DE COUVERTURE'
\echo '========================================='

-- Pourcentage d'artists avec spotify_data
\echo '\nCouverture Spotify :'
SELECT
  COUNT(DISTINCT a.id) as total_artists,
  COUNT(DISTINCT s.artist_id) as artists_with_spotify,
  ROUND(100.0 * COUNT(DISTINCT s.artist_id) / NULLIF(COUNT(DISTINCT a.id), 0), 2) as coverage_percent
FROM public.artists a
LEFT JOIN public.spotify_data s ON s.artist_id = a.id;

-- Pourcentage d'artists avec social_media_data
\echo '\nCouverture Social Media :'
SELECT
  COUNT(DISTINCT a.id) as total_artists,
  COUNT(DISTINCT sm.artist_id) as artists_with_social,
  ROUND(100.0 * COUNT(DISTINCT sm.artist_id) / NULLIF(COUNT(DISTINCT a.id), 0), 2) as coverage_percent
FROM public.artists a
LEFT JOIN public.social_media_data sm ON sm.artist_id = a.id;

-- Répartition par status
\echo '\nRépartition des artists par status :'
SELECT
  status,
  COUNT(*) as count,
  ROUND(100.0 * COUNT(*) / (SELECT COUNT(*) FROM public.artists), 2) as percent
FROM public.artists
GROUP BY status
ORDER BY count DESC;

-- Répartition des events par status
\echo '\nRépartition des events par status :'
SELECT
  status,
  COUNT(*) as count,
  ROUND(100.0 * COUNT(*) / (SELECT COUNT(*) FROM public.events), 2) as percent
FROM public.events
GROUP BY status
ORDER BY count DESC;

-- ============================================
-- 6. Vérification des valeurs Spotify
-- ============================================
\echo '\n========================================='
\echo 'VÉRIFICATION DES DONNÉES SPOTIFY'
\echo '========================================='

-- Spotify popularity hors limites (doit être 0-100)
\echo '\nSpotify popularity hors limites (doit être 0) :'
SELECT COUNT(*) as invalid_popularity
FROM public.spotify_data
WHERE popularity < 0 OR popularity > 100;

-- Statistiques followers
\echo '\nStatistiques Spotify followers :'
SELECT
  MIN(followers) as min_followers,
  MAX(followers) as max_followers,
  ROUND(AVG(followers)::numeric, 0) as avg_followers,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY followers) as median_followers
FROM public.spotify_data
WHERE followers IS NOT NULL;

-- ============================================
-- 7. Vérification des URLs (format basique)
-- ============================================
\echo '\n========================================='
\echo 'VÉRIFICATION DES URLs'
\echo '========================================='

-- URLs Spotify invalides
\echo '\nURLs Spotify invalides (ne commencent pas par http) :'
SELECT COUNT(*) as invalid_spotify_urls
FROM public.spotify_data
WHERE external_url IS NOT NULL
  AND external_url NOT LIKE 'http%';

-- URLs Instagram invalides
\echo '\nURLs Instagram invalides :'
SELECT COUNT(*) as invalid_instagram_urls
FROM public.social_media_data
WHERE instagram_url IS NOT NULL
  AND instagram_url NOT LIKE 'http%';

-- URLs Facebook invalides
\echo '\nURLs Facebook invalides :'
SELECT COUNT(*) as invalid_facebook_urls
FROM public.social_media_data
WHERE facebook_url IS NOT NULL
  AND facebook_url NOT LIKE 'http%';

-- ============================================
-- 8. Liste des 10 premiers artists (vérification visuelle)
-- ============================================
\echo '\n========================================='
\echo 'ÉCHANTILLON D''ARTISTS (10 premiers)'
\echo '========================================='

SELECT
  a.name,
  a.status,
  CASE WHEN s.id IS NOT NULL THEN '✓' ELSE '✗' END as has_spotify,
  CASE WHEN sm.id IS NOT NULL THEN '✓' ELSE '✗' END as has_social,
  s.followers as spotify_followers,
  s.popularity as spotify_popularity
FROM public.artists a
LEFT JOIN public.spotify_data s ON s.artist_id = a.id
LEFT JOIN public.social_media_data sm ON sm.artist_id = a.id
ORDER BY a.created_at DESC
LIMIT 10;

-- ============================================
-- 9. Vérification des RPC functions
-- ============================================
\echo '\n========================================='
\echo 'VÉRIFICATION DES RPC FUNCTIONS'
\echo '========================================='

-- Test fetch_artists_page
\echo '\nTest fetch_artists_page (page 0, 5 résultats) :'
SELECT
  id,
  name,
  status,
  (spotify_data->>'followers')::integer as followers
FROM fetch_artists_page(0, 5, NULL, NULL);

-- Test count_artists_filtered
\echo '\nTest count_artists_filtered (tous) :'
SELECT count_artists_filtered(NULL, NULL) as total_artists;

\echo '\nTest count_artists_filtered (status = active) :'
SELECT count_artists_filtered(NULL, 'active') as active_artists;

-- ============================================
-- 10. Résumé final
-- ============================================
\echo '\n========================================='
\echo 'RÉSUMÉ DE VALIDATION'
\echo '========================================='

DO $$
DECLARE
  total_artists INTEGER;
  total_events INTEGER;
  total_relations INTEGER;
  orphans INTEGER;
  invalid_status INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_artists FROM public.artists;
  SELECT COUNT(*) INTO total_events FROM public.events;
  SELECT COUNT(*) INTO total_relations FROM public.event_artists;
  
  -- Compter les problèmes
  SELECT COUNT(*) INTO orphans
  FROM public.spotify_data s
  LEFT JOIN public.artists a ON a.id = s.artist_id
  WHERE a.id IS NULL;
  
  SELECT COUNT(*) INTO invalid_status
  FROM public.artists
  WHERE status NOT IN ('active', 'inactive', 'archived');
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'RÉSUMÉ FINAL';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Total artists : %', total_artists;
  RAISE NOTICE 'Total events : %', total_events;
  RAISE NOTICE 'Total relations event-artist : %', total_relations;
  RAISE NOTICE '';
  
  IF orphans = 0 AND invalid_status = 0 THEN
    RAISE NOTICE '✅ Toutes les validations sont passées avec succès !';
  ELSE
    RAISE WARNING '⚠️  Problèmes détectés :';
    IF orphans > 0 THEN
      RAISE WARNING '   - % enregistrement(s) orphelin(s)', orphans;
    END IF;
    IF invalid_status > 0 THEN
      RAISE WARNING '   - % status invalide(s)', invalid_status;
    END IF;
  END IF;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
END $$;

-- ============================================
-- 11. Suggestions de corrections (si problèmes détectés)
-- ============================================
\echo '\n========================================='
\echo 'SUGGESTIONS DE CORRECTIONS'
\echo '========================================='

-- Si des orphelins sont détectés, les supprimer
-- UNCOMMENT si nécessaire :
/*
DELETE FROM public.spotify_data
WHERE artist_id NOT IN (SELECT id FROM public.artists);

DELETE FROM public.social_media_data
WHERE artist_id NOT IN (SELECT id FROM public.artists);
*/

-- Si des status invalides, les corriger
-- UNCOMMENT si nécessaire :
/*
UPDATE public.artists
SET status = 'active'
WHERE status NOT IN ('active', 'inactive', 'archived');
*/

\echo '\nFIN DE LA VALIDATION'




