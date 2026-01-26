-- ============================================
-- SCRIPT D'IMPORT COMPLET - Go-Prod-AURA
-- ============================================
-- Version: 1.0
-- Date: 2025-01-22
-- 
-- AVANT D'EXÉCUTER :
-- 1. Placer vos fichiers CSV/SQL dans database/old-data/
-- 2. Adapter les chemins et mappings ci-dessous
-- 3. Créer une company par défaut si nécessaire
-- 4. Vérifier que le schéma existe (01-schema-current.sql)
--
-- ⚠️ CE SCRIPT SUPPRIME ET RÉINSÈRE LES DONNÉES !
-- ============================================

BEGIN;

-- ============================================
-- ÉTAPE 0 : Configuration
-- ============================================
-- Désactiver les contraintes FK pendant l'import
SET session_replication_role = 'replica';

-- Désactiver RLS temporairement (dev uniquement)
ALTER TABLE public.companies DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.artists DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.spotify_data DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_media_data DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.events DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_artists DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.artist_tags DISABLE ROW LEVEL SECURITY;

-- ============================================
-- ÉTAPE 1 : Nettoyage (OPTIONNEL - commenter si vous voulez garder les données existantes)
-- ============================================
-- ⚠️ ATTENTION : Décommenter pour supprimer TOUTES les données existantes
/*
TRUNCATE TABLE public.artist_tags CASCADE;
TRUNCATE TABLE public.tags CASCADE;
TRUNCATE TABLE public.event_artists CASCADE;
TRUNCATE TABLE public.events CASCADE;
TRUNCATE TABLE public.social_media_data CASCADE;
TRUNCATE TABLE public.spotify_data CASCADE;
TRUNCATE TABLE public.artists CASCADE;
TRUNCATE TABLE public.profiles CASCADE;
TRUNCATE TABLE public.companies CASCADE;
*/

-- ============================================
-- ÉTAPE 2 : Créer une company par défaut (si multi-tenant)
-- ============================================
INSERT INTO public.companies (id, name, created_at)
VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  'GC Entertainment',
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- Variable pour company_id par défaut
DO $$ 
DECLARE
  default_company_id UUID := '00000000-0000-0000-0000-000000000001'::uuid;
BEGIN
  RAISE NOTICE 'Company ID par défaut : %', default_company_id;
END $$;

-- ============================================
-- ÉTAPE 3 : Import ARTISTS
-- ============================================
-- Option A : Depuis un fichier CSV externe
-- (Nécessite accès au système de fichiers du serveur Supabase)
/*
COPY public.artists (id, name, status, email, phone, location, company_id, created_at)
FROM '/path/to/old-data/artists.csv'
DELIMITER ',' CSV HEADER;
*/

-- Option B : Insertion manuelle (adapter selon votre dump)
-- Si votre ancien dump est en SQL, copier les INSERT ici

-- Exemple d'insertion avec mapping
/*
INSERT INTO public.artists (id, name, status, email, phone, location, company_id, created_at)
SELECT
  old_id::uuid,                                    -- Convertir l'ancien ID en UUID
  name,
  CASE 
    WHEN old_status = 'actif' THEN 'active'
    WHEN old_status = 'inactif' THEN 'inactive'
    ELSE 'archived'
  END as status,
  email,
  phone,
  location,
  '00000000-0000-0000-0000-000000000001'::uuid,    -- company_id par défaut
  COALESCE(created_at, NOW())
FROM old_schema.artists
ON CONFLICT (id) DO NOTHING;
*/

-- Exemple avec données de test (à remplacer par vos vraies données)
INSERT INTO public.artists (id, name, status, email, phone, location, company_id, created_at)
VALUES
  (gen_random_uuid(), 'DJ Shadow', 'active', 'dj.shadow@example.com', '+41 79 123 45 67', 'Geneva, Switzerland', '00000000-0000-0000-0000-000000000001'::uuid, NOW()),
  (gen_random_uuid(), 'Emma Johnson', 'active', 'emma.j@example.com', '+41 79 234 56 78', 'Lausanne, Switzerland', '00000000-0000-0000-0000-000000000001'::uuid, NOW()),
  (gen_random_uuid(), 'The Midnight', 'active', 'contact@themidnight.com', '+1 555 0123', 'Los Angeles, USA', '00000000-0000-0000-0000-000000000001'::uuid, NOW()),
  (gen_random_uuid(), 'Bonobo', 'active', 'booking@bonobomusic.com', '+44 20 7123 4567', 'London, UK', '00000000-0000-0000-0000-000000000001'::uuid, NOW()),
  (gen_random_uuid(), 'Amelie Lens', 'active', 'info@amelielens.com', '+32 2 123 45 67', 'Antwerp, Belgium', '00000000-0000-0000-0000-000000000001'::uuid, NOW()),
  (gen_random_uuid(), 'Vintage Artist', 'archived', 'old@artist.com', NULL, NULL, '00000000-0000-0000-0000-000000000001'::uuid, NOW() - INTERVAL '2 years')
ON CONFLICT (id) DO NOTHING;

-- Récupérer les IDs créés pour les relations
CREATE TEMP TABLE temp_artist_mapping AS
SELECT id, name FROM public.artists;

-- ============================================
-- ÉTAPE 4 : Import SPOTIFY_DATA
-- ============================================
/*
-- Exemple d'import depuis ancien schéma
INSERT INTO public.spotify_data (id, artist_id, image_url, followers, popularity, external_url, genres, created_at)
SELECT
  gen_random_uuid(),
  a.id,                                            -- FK vers artists
  old_spotify.image_url,
  old_spotify.followers::integer,
  old_spotify.popularity::integer,
  old_spotify.spotify_url,
  old_spotify.genres::jsonb,                       -- Convertir en JSONB si nécessaire
  COALESCE(old_spotify.created_at, NOW())
FROM old_schema.spotify_data old_spotify
INNER JOIN public.artists a ON a.id = old_spotify.artist_id::uuid
ON CONFLICT (artist_id) DO NOTHING;
*/

-- Données de test
INSERT INTO public.spotify_data (artist_id, image_url, followers, popularity, external_url, genres)
SELECT
  a.id,
  CASE a.name
    WHEN 'DJ Shadow' THEN 'https://i.scdn.co/image/ab6761610000e5eb8f7f9f9f9f9f9f9f9f9f9f9f'
    WHEN 'Emma Johnson' THEN 'https://i.scdn.co/image/ab6761610000e5eb1234567890abcdef12345678'
    WHEN 'The Midnight' THEN 'https://i.scdn.co/image/ab6761610000e5ebfedcba0987654321fedcba09'
    WHEN 'Bonobo' THEN 'https://i.scdn.co/image/ab6761610000e5ebabcdefabcdefabcdefabcdef'
    WHEN 'Amelie Lens' THEN 'https://i.scdn.co/image/ab6761610000e5eb111111111111111111111111'
    ELSE NULL
  END,
  CASE a.name
    WHEN 'DJ Shadow' THEN 850000
    WHEN 'Emma Johnson' THEN 45000
    WHEN 'The Midnight' THEN 1200000
    WHEN 'Bonobo' THEN 2500000
    WHEN 'Amelie Lens' THEN 600000
    ELSE 10000
  END,
  CASE a.name
    WHEN 'DJ Shadow' THEN 72
    WHEN 'Emma Johnson' THEN 45
    WHEN 'The Midnight' THEN 81
    WHEN 'Bonobo' THEN 88
    WHEN 'Amelie Lens' THEN 75
    ELSE 30
  END,
  'https://open.spotify.com/artist/' || substr(md5(a.name), 1, 22),
  CASE a.name
    WHEN 'DJ Shadow' THEN '["hip hop", "trip hop", "electronic"]'::jsonb
    WHEN 'Emma Johnson' THEN '["indie", "folk", "acoustic"]'::jsonb
    WHEN 'The Midnight' THEN '["synthwave", "electronic", "retro"]'::jsonb
    WHEN 'Bonobo' THEN '["downtempo", "electronic", "trip hop"]'::jsonb
    WHEN 'Amelie Lens' THEN '["techno", "electronic"]'::jsonb
    ELSE '[]'::jsonb
  END
FROM public.artists a
WHERE a.status != 'archived'
ON CONFLICT (artist_id) DO NOTHING;

-- ============================================
-- ÉTAPE 5 : Import SOCIAL_MEDIA_DATA
-- ============================================
/*
INSERT INTO public.social_media_data (id, artist_id, instagram_url, facebook_url, youtube_url, tiktok_url, twitter_url, created_at)
SELECT
  gen_random_uuid(),
  a.id,
  old_social.instagram,
  old_social.facebook,
  old_social.youtube,
  old_social.tiktok,
  old_social.twitter,
  COALESCE(old_social.created_at, NOW())
FROM old_schema.social_media old_social
INNER JOIN public.artists a ON a.id = old_social.artist_id::uuid
ON CONFLICT (artist_id) DO NOTHING;
*/

-- Données de test
INSERT INTO public.social_media_data (artist_id, instagram_url, facebook_url, youtube_url, tiktok_url, twitter_url)
SELECT
  a.id,
  'https://instagram.com/' || lower(replace(a.name, ' ', '')),
  'https://facebook.com/' || lower(replace(a.name, ' ', '')),
  'https://youtube.com/@' || lower(replace(a.name, ' ', '')),
  NULL,
  'https://twitter.com/' || lower(replace(a.name, ' ', ''))
FROM public.artists a
WHERE a.status = 'active'
ON CONFLICT (artist_id) DO NOTHING;

-- ============================================
-- ÉTAPE 6 : Import EVENTS
-- ============================================
/*
INSERT INTO public.events (id, name, event_date, venue, city, country, status, company_id, created_at)
SELECT
  old_id::uuid,
  name,
  event_date::date,
  venue,
  city,
  country,
  CASE
    WHEN old_status = 'planifié' THEN 'planned'
    WHEN old_status = 'confirmé' THEN 'confirmed'
    WHEN old_status = 'annulé' THEN 'cancelled'
    WHEN old_status = 'terminé' THEN 'completed'
    ELSE 'planned'
  END,
  '00000000-0000-0000-0000-000000000001'::uuid,
  COALESCE(created_at, NOW())
FROM old_schema.events
ON CONFLICT (id) DO NOTHING;
*/

-- Données de test
INSERT INTO public.events (name, event_date, venue, city, country, status, company_id)
VALUES
  ('Montreux Jazz Festival 2024', '2024-07-15', 'Montreux Music & Convention Centre', 'Montreux', 'Switzerland', 'completed', '00000000-0000-0000-0000-000000000001'::uuid),
  ('Paléo Festival 2024', '2024-07-23', 'Plaine de l''Asse', 'Nyon', 'Switzerland', 'completed', '00000000-0000-0000-0000-000000000001'::uuid),
  ('Geneva Electronic Festival 2025', '2025-06-20', 'Parc des Eaux-Vives', 'Geneva', 'Switzerland', 'confirmed', '00000000-0000-0000-0000-000000000001'::uuid),
  ('Lausanne Lights 2025', '2025-08-10', 'Esplanade de Montbenon', 'Lausanne', 'Switzerland', 'planned', '00000000-0000-0000-0000-000000000001'::uuid)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- ÉTAPE 7 : Import EVENT_ARTISTS (relation many-to-many)
-- ============================================
/*
INSERT INTO public.event_artists (event_id, artist_id, performance_order, fee_amount, fee_currency, created_at)
SELECT
  e.id,
  a.id,
  old_ea.performance_order,
  old_ea.fee::numeric,
  COALESCE(old_ea.currency, 'CHF'),
  COALESCE(old_ea.created_at, NOW())
FROM old_schema.event_artists old_ea
INNER JOIN public.events e ON e.id = old_ea.event_id::uuid
INNER JOIN public.artists a ON a.id = old_ea.artist_id::uuid
ON CONFLICT (event_id, artist_id) DO NOTHING;
*/

-- Données de test
WITH event_mapping AS (
  SELECT id, name FROM public.events
),
artist_mapping AS (
  SELECT id, name FROM public.artists
)
INSERT INTO public.event_artists (event_id, artist_id, performance_order, fee_amount, fee_currency)
SELECT
  e.id,
  a.id,
  1,
  CASE a.name
    WHEN 'Bonobo' THEN 50000.00
    WHEN 'The Midnight' THEN 35000.00
    WHEN 'Amelie Lens' THEN 30000.00
    WHEN 'DJ Shadow' THEN 25000.00
    ELSE 15000.00
  END,
  'CHF'
FROM event_mapping e
CROSS JOIN artist_mapping a
WHERE e.name LIKE '%2024%' OR e.name LIKE '%2025%'
LIMIT 10
ON CONFLICT (event_id, artist_id) DO NOTHING;

-- ============================================
-- ÉTAPE 8 : Import TAGS
-- ============================================
INSERT INTO public.tags (name)
VALUES
  ('Electronic'),
  ('Hip Hop'),
  ('Techno'),
  ('House'),
  ('Indie'),
  ('Festival'),
  ('Club'),
  ('Live'),
  ('DJ Set')
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- ÉTAPE 9 : Import ARTIST_TAGS
-- ============================================
WITH tag_mapping AS (
  SELECT id, name FROM public.tags
),
artist_mapping AS (
  SELECT id, name FROM public.artists
)
INSERT INTO public.artist_tags (artist_id, tag_id)
SELECT DISTINCT
  a.id,
  t.id
FROM artist_mapping a
CROSS JOIN tag_mapping t
WHERE
  (a.name = 'DJ Shadow' AND t.name IN ('Electronic', 'Hip Hop', 'Live'))
  OR (a.name = 'Amelie Lens' AND t.name IN ('Techno', 'Electronic', 'DJ Set'))
  OR (a.name = 'Bonobo' AND t.name IN ('Electronic', 'Live', 'Festival'))
  OR (a.name = 'The Midnight' AND t.name IN ('Electronic', 'Indie', 'Live'))
ON CONFLICT (artist_id, tag_id) DO NOTHING;

-- ============================================
-- ÉTAPE 10 : Validation
-- ============================================
DO $$
DECLARE
  artists_count INTEGER;
  spotify_count INTEGER;
  social_count INTEGER;
  events_count INTEGER;
  event_artists_count INTEGER;
  orphan_spotify INTEGER;
  orphan_social INTEGER;
BEGIN
  -- Compter les enregistrements
  SELECT COUNT(*) INTO artists_count FROM public.artists;
  SELECT COUNT(*) INTO spotify_count FROM public.spotify_data;
  SELECT COUNT(*) INTO social_count FROM public.social_media_data;
  SELECT COUNT(*) INTO events_count FROM public.events;
  SELECT COUNT(*) INTO event_artists_count FROM public.event_artists;
  
  -- Vérifier les orphelins
  SELECT COUNT(*) INTO orphan_spotify
  FROM public.spotify_data s
  LEFT JOIN public.artists a ON a.id = s.artist_id
  WHERE a.id IS NULL;
  
  SELECT COUNT(*) INTO orphan_social
  FROM public.social_media_data s
  LEFT JOIN public.artists a ON a.id = s.artist_id
  WHERE a.id IS NULL;
  
  -- Rapport
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'RAPPORT D''IMPORT';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Artists importés : %', artists_count;
  RAISE NOTICE 'Spotify data importés : %', spotify_count;
  RAISE NOTICE 'Social media data importés : %', social_count;
  RAISE NOTICE 'Events importés : %', events_count;
  RAISE NOTICE 'Event-Artist relations : %', event_artists_count;
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  Orphelins (Spotify) : %', orphan_spotify;
  RAISE NOTICE '⚠️  Orphelins (Social) : %', orphan_social;
  RAISE NOTICE '';
  
  IF orphan_spotify > 0 OR orphan_social > 0 THEN
    RAISE WARNING 'Des enregistrements orphelins ont été détectés !';
  ELSE
    RAISE NOTICE '✅ Aucun orphelin détecté';
  END IF;
  
  RAISE NOTICE '========================================';
END $$;

-- ============================================
-- ÉTAPE 11 : Réactivation des contraintes
-- ============================================
SET session_replication_role = 'origin';

-- Réactiver RLS (si nécessaire en prod)
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spotify_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_media_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_artists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artist_tags ENABLE ROW LEVEL SECURITY;

COMMIT;

-- ============================================
-- FIN DE L'IMPORT
-- ============================================
-- Exécuter 03-validation.sql pour vérifier l'intégrité




