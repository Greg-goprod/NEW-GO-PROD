-- ============================================
-- Tables pour les details complets des tracks
-- Source: Songstats /tracks/info API
-- ============================================

-- Table des collaborateurs/credits par track
CREATE TABLE IF NOT EXISTS public.track_collaborators (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  artist_id UUID REFERENCES public.artists(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  track_external_id TEXT NOT NULL, -- songstats_track_id
  collaborator_name TEXT NOT NULL,
  collaborator_external_id TEXT, -- songstats_collaborator_id
  roles TEXT[], -- array de roles: Songwriter, Composer, Vocalist, Producer, Engineer, etc.
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE (artist_id, track_external_id, collaborator_external_id)
);

-- Table des liens externes par track (Spotify, Apple Music, Deezer, YouTube, TikTok, etc.)
CREATE TABLE IF NOT EXISTS public.track_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  artist_id UUID REFERENCES public.artists(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  track_external_id TEXT NOT NULL, -- songstats_track_id
  source TEXT NOT NULL, -- spotify, apple_music, deezer, youtube, tiktok, etc.
  platform_track_id TEXT, -- ID sur la plateforme
  url TEXT,
  isrc TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE (artist_id, track_external_id, source, platform_track_id)
);

-- Table des audio features par track (analyse audio Spotify)
CREATE TABLE IF NOT EXISTS public.track_audio_features (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  artist_id UUID REFERENCES public.artists(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  track_external_id TEXT NOT NULL, -- songstats_track_id
  duration TEXT, -- format MM:SS
  tempo DECIMAL, -- BPM
  key TEXT, -- note musicale (A, B, C#, etc.)
  mode TEXT, -- majeur/mineur
  time_signature INTEGER,
  acousticness DECIMAL,
  danceability DECIMAL,
  energy DECIMAL,
  instrumentalness DECIMAL,
  liveness DECIMAL,
  loudness DECIMAL,
  speechiness DECIMAL,
  valence DECIMAL, -- positivite du morceau
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE (artist_id, track_external_id)
);

-- Enrichir la table artist_catalog existante avec plus de champs
ALTER TABLE public.artist_catalog
ADD COLUMN IF NOT EXISTS distributors JSONB,
ADD COLUMN IF NOT EXISTS genres TEXT[],
ADD COLUMN IF NOT EXISTS collaborators_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS links_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS has_audio_features BOOLEAN DEFAULT false;

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_track_collaborators_artist_id ON public.track_collaborators (artist_id);
CREATE INDEX IF NOT EXISTS idx_track_collaborators_track_id ON public.track_collaborators (track_external_id);
CREATE INDEX IF NOT EXISTS idx_track_links_artist_id ON public.track_links (artist_id);
CREATE INDEX IF NOT EXISTS idx_track_links_track_id ON public.track_links (track_external_id);
CREATE INDEX IF NOT EXISTS idx_track_links_source ON public.track_links (source);
CREATE INDEX IF NOT EXISTS idx_track_audio_features_artist_id ON public.track_audio_features (artist_id);

-- Commentaires
COMMENT ON TABLE public.track_collaborators IS 'Credits et collaborateurs par track (songwriters, producers, etc.)';
COMMENT ON TABLE public.track_links IS 'Liens externes par track vers toutes les plateformes (Spotify, Apple, YouTube, TikTok, etc.)';
COMMENT ON TABLE public.track_audio_features IS 'Analyse audio des tracks (tempo, energy, danceability, etc.)';

