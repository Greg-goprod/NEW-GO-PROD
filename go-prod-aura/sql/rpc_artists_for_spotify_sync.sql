-- sql/rpc_artists_for_spotify_sync.sql
CREATE OR REPLACE FUNCTION artists_for_spotify_sync(p_company_id uuid, p_limit int DEFAULT 25)
RETURNS TABLE (
  id uuid,
  name text,
  spotify_id text,
  spotify_url text
)
LANGUAGE sql
AS $$
  WITH base AS (
    SELECT a.id, a.name
    FROM artists a
    WHERE a.company_id = p_company_id
  ),
  missing AS (
    SELECT b.id, b.name
    FROM base b
    LEFT JOIN spotify_data sd ON sd.artist_id = b.id
    WHERE sd.artist_id IS NULL
  ),
  stale AS (
    SELECT a.id, a.name
    FROM base a
    JOIN spotify_data sd ON sd.artist_id = a.id
    WHERE sd.updated_at IS NULL OR sd.updated_at < now() - interval '7 days'
  ),
  unioned AS (
    SELECT * FROM missing
    UNION
    SELECT * FROM stale
  )
  SELECT u.id, u.name, NULL::text AS spotify_id, NULL::text AS spotify_url
  FROM unioned u
  ORDER BY u.name
  LIMIT p_limit;
$$;
