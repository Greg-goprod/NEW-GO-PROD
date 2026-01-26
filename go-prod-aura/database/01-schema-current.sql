-- ============================================
-- SCHÉMA ACTUEL : Go-Prod-AURA
-- ============================================
-- Ce fichier documente le schéma de la nouvelle base.
-- NE PAS EXÉCUTER si les tables existent déjà.

-- Extension UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABLE: companies (multi-tenant)
-- ============================================
CREATE TABLE IF NOT EXISTS public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABLE: profiles (utilisateurs)
-- ============================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('owner', 'admin', 'manager', 'user')),
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABLE: artists
-- ============================================
CREATE TABLE IF NOT EXISTS public.artists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
  email TEXT,
  phone TEXT,
  location TEXT,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour recherche et filtres
CREATE INDEX IF NOT EXISTS idx_artists_name ON public.artists USING gin(name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_artists_status ON public.artists(status);
CREATE INDEX IF NOT EXISTS idx_artists_company_id ON public.artists(company_id);

-- ============================================
-- TABLE: spotify_data
-- ============================================
CREATE TABLE IF NOT EXISTS public.spotify_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id UUID NOT NULL UNIQUE REFERENCES public.artists(id) ON DELETE CASCADE,
  image_url TEXT,
  followers INTEGER,
  popularity INTEGER CHECK (popularity >= 0 AND popularity <= 100),
  external_url TEXT,
  genres JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour jointure
CREATE INDEX IF NOT EXISTS idx_spotify_data_artist_id ON public.spotify_data(artist_id);

-- ============================================
-- TABLE: social_media_data
-- ============================================
CREATE TABLE IF NOT EXISTS public.social_media_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id UUID NOT NULL UNIQUE REFERENCES public.artists(id) ON DELETE CASCADE,
  instagram_url TEXT,
  facebook_url TEXT,
  youtube_url TEXT,
  tiktok_url TEXT,
  twitter_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour jointure
CREATE INDEX IF NOT EXISTS idx_social_media_data_artist_id ON public.social_media_data(artist_id);

-- ============================================
-- TABLE: events (bookings/événements)
-- ============================================
CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  event_date DATE NOT NULL,
  venue TEXT,
  city TEXT,
  country TEXT,
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'confirmed', 'cancelled', 'completed')),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_event_date ON public.events(event_date);
CREATE INDEX IF NOT EXISTS idx_events_status ON public.events(status);
CREATE INDEX IF NOT EXISTS idx_events_company_id ON public.events(company_id);

-- ============================================
-- TABLE: event_artists (relation many-to-many)
-- ============================================
CREATE TABLE IF NOT EXISTS public.event_artists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  artist_id UUID NOT NULL REFERENCES public.artists(id) ON DELETE CASCADE,
  performance_order INTEGER,
  fee_amount NUMERIC(10, 2),
  fee_currency TEXT DEFAULT 'CHF',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, artist_id)
);

CREATE INDEX IF NOT EXISTS idx_event_artists_event_id ON public.event_artists(event_id);
CREATE INDEX IF NOT EXISTS idx_event_artists_artist_id ON public.event_artists(artist_id);

-- ============================================
-- TABLE: tags
-- ============================================
CREATE TABLE IF NOT EXISTS public.tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABLE: artist_tags (relation many-to-many)
-- ============================================
CREATE TABLE IF NOT EXISTS public.artist_tags (
  artist_id UUID NOT NULL REFERENCES public.artists(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (artist_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_artist_tags_artist_id ON public.artist_tags(artist_id);
CREATE INDEX IF NOT EXISTS idx_artist_tags_tag_id ON public.artist_tags(tag_id);

-- ============================================
-- RPC: fetch_artists_page (pagination serveur)
-- ============================================
CREATE OR REPLACE FUNCTION fetch_artists_page(
  p_page INTEGER DEFAULT 0,
  p_page_size INTEGER DEFAULT 12,
  p_search TEXT DEFAULT NULL,
  p_status TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  status TEXT,
  created_at TIMESTAMPTZ,
  spotify_data JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id,
    a.name,
    a.status,
    a.created_at,
    jsonb_build_object(
      'image_url', s.image_url,
      'followers', s.followers,
      'popularity', s.popularity
    ) AS spotify_data
  FROM public.artists a
  LEFT JOIN public.spotify_data s ON s.artist_id = a.id
  WHERE
    (p_search IS NULL OR a.name ILIKE '%' || p_search || '%')
    AND (p_status IS NULL OR a.status = p_status)
  ORDER BY a.name
  LIMIT p_page_size
  OFFSET p_page * p_page_size;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- RPC: count_artists_filtered
-- ============================================
CREATE OR REPLACE FUNCTION count_artists_filtered(
  p_search TEXT DEFAULT NULL,
  p_status TEXT DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  result INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO result
  FROM public.artists a
  WHERE
    (p_search IS NULL OR a.name ILIKE '%' || p_search || '%')
    AND (p_status IS NULL OR a.status = p_status);
  
  RETURN result;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- RLS (Row Level Security)
-- ============================================
-- Activer RLS sur toutes les tables
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spotify_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_media_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_artists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artist_tags ENABLE ROW LEVEL SECURITY;

-- Politique par défaut (à adapter selon vos besoins)
-- Exemple : lecture pour tous les utilisateurs authentifiés
CREATE POLICY "Allow authenticated read" ON public.artists
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated read" ON public.spotify_data
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated read" ON public.social_media_data
  FOR SELECT TO authenticated USING (true);

-- Pour l'import : désactiver RLS temporairement si nécessaire
-- ALTER TABLE public.artists DISABLE ROW LEVEL SECURITY;




