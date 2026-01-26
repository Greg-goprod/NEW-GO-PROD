-- Migration: RPC pour récupérer toutes les données Songstats d'un artiste
-- Cette fonction est tenant-aware (requiert company_id)

CREATE OR REPLACE FUNCTION public.rpc_artist_songstats_full(
  _company_id uuid,
  _artist_id  uuid,
  _top_geo_limit int DEFAULT 10,
  _top_tracks_limit int DEFAULT 10,
  _events_limit int DEFAULT 15
)
RETURNS jsonb
LANGUAGE sql
STABLE
AS $$
WITH
stats AS (
  SELECT
    MAX(CASE WHEN s.source='spotify'   AND s.metric='followers'         THEN s.value::bigint END) AS spotify_followers,
    MAX(CASE WHEN s.source='spotify'   AND s.metric='monthly_listeners' THEN s.value::bigint END) AS spotify_monthly_listeners,
    MAX(CASE WHEN s.source='instagram' AND s.metric='followers'         THEN s.value::bigint END) AS instagram_followers,
    MAX(s.updated_at) AS last_stats_updated_at
  FROM public.artist_stats_current s
  WHERE s.company_id = _company_id
    AND s.artist_id  = _artist_id
),
geo AS (
  SELECT jsonb_agg(
           jsonb_build_object('country_code', g.country_code, 'audience_count', g.audience_count)
           ORDER BY g.audience_count DESC NULLS LAST
         ) AS items
  FROM (
    SELECT g.*
    FROM public.artist_audience_geo g
    JOIN public.artists a ON a.id = g.artist_id
    WHERE a.company_id = _company_id
      AND g.artist_id  = _artist_id
      AND g.source     = 'spotify'
    ORDER BY g.audience_count DESC NULLS LAST
    LIMIT _top_geo_limit
  ) g
),
tracks AS (
  SELECT jsonb_agg(
           jsonb_build_object(
             'source', t.source,
             'rank',   t.rank,
             'name',   t.track_name,
             'track_external_id', t.track_external_id,
             'popularity', t.popularity,
             'updated_at', t.updated_at
           )
           ORDER BY t.rank NULLS LAST
         ) AS items
  FROM (
    SELECT t.*
    FROM public.artist_top_tracks t
    JOIN public.artists a ON a.id = t.artist_id
    WHERE a.company_id = _company_id
      AND t.artist_id  = _artist_id
    ORDER BY t.rank NULLS LAST, t.updated_at DESC NULLS LAST
    LIMIT _top_tracks_limit
  ) t
),
events AS (
  SELECT jsonb_agg(
           jsonb_build_object(
             'date', e.date, 'city', e.city, 'country', e.country,
             'venue', e.venue, 'url', e.url, 'updated_at', e.updated_at
           )
           ORDER BY e.date NULLS LAST
         ) AS items
  FROM (
    SELECT e.*
    FROM public.artist_events e
    JOIN public.artists a ON a.id = e.artist_id
    WHERE a.company_id = _company_id
      AND e.artist_id  = _artist_id
      AND (e.date IS NULL OR e.date >= CURRENT_DATE)
    ORDER BY e.date NULLS LAST
    LIMIT _events_limit
  ) e
),
info AS (
  SELECT jsonb_build_object(
    'artist_spotify_id', sd.spotify_id,
    'artist_spotify_url', CASE WHEN sd.spotify_id IS NOT NULL THEN concat('https://open.spotify.com/artist/', sd.spotify_id) END,
    'artist_name', a.name,
    'last_updated_any', GREATEST(
      (SELECT last_stats_updated_at FROM stats),
      (SELECT MAX(updated_at) FROM public.artist_top_tracks  WHERE artist_id=_artist_id),
      (SELECT MAX(updated_at) FROM public.artist_audience_geo WHERE artist_id=_artist_id),
      (SELECT MAX(updated_at) FROM public.artist_events       WHERE artist_id=_artist_id)
    )
  ) AS j
  FROM public.artists a
  LEFT JOIN public.spotify_data sd ON sd.artist_id = a.id
  WHERE a.id = _artist_id AND a.company_id = _company_id
)
SELECT jsonb_build_object(
  'stats',   COALESCE((SELECT to_jsonb(stats.*) FROM stats), '{}'::jsonb),
  'geo',     COALESCE((SELECT items FROM geo), '[]'::jsonb),
  'tracks',  COALESCE((SELECT items FROM tracks), '[]'::jsonb),
  'events',  COALESCE((SELECT items FROM events), '[]'::jsonb),
  'info',    COALESCE((SELECT j FROM info), '{}'::jsonb)
);
$$;

