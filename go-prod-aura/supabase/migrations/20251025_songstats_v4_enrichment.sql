-- == Extend artists with Songstats fields (idempotent) ==
ALTER TABLE public.artists
  ADD COLUMN IF NOT EXISTS songstats_id   text,
  ADD COLUMN IF NOT EXISTS avatar_url     text,
  ADD COLUMN IF NOT EXISTS songstats_url  text,
  ADD COLUMN IF NOT EXISTS bio            text;

CREATE INDEX IF NOT EXISTS idx_artists_songstats_id ON public.artists (songstats_id);

-- == New table: artist_links_songstats ==
CREATE TABLE IF NOT EXISTS public.artist_links_songstats (
  artist_id   uuid NOT NULL REFERENCES public.artists(id) ON DELETE CASCADE,
  company_id  uuid NOT NULL,
  source      text NOT NULL,            -- spotify, beatport, traxsource, apple_music, deezer, amazon, tidal, tracklist, soundcloud, youtube, tiktok, instagram, facebook, twitter/x, bandsintown, songkick
  external_id text,
  url         text,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (artist_id, source)
);

CREATE INDEX IF NOT EXISTS idx_artist_links_songstats_company ON public.artist_links_songstats (company_id);
CREATE INDEX IF NOT EXISTS idx_artist_links_songstats_url     ON public.artist_links_songstats (url);

-- == New table: artist_genres ==
CREATE TABLE IF NOT EXISTS public.artist_genres (
  artist_id   uuid NOT NULL REFERENCES public.artists(id) ON DELETE CASCADE,
  company_id  uuid NOT NULL,
  genre       text NOT NULL,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (artist_id, genre)
);

CREATE INDEX IF NOT EXISTS idx_artist_genres_company ON public.artist_genres (company_id);
CREATE INDEX IF NOT EXISTS idx_artist_genres_genre   ON public.artist_genres (genre);

-- == New table: artist_related ==
CREATE TABLE IF NOT EXISTS public.artist_related (
  artist_id            uuid NOT NULL REFERENCES public.artists(id) ON DELETE CASCADE,
  company_id           uuid NOT NULL,
  related_songstats_id text NOT NULL,
  name                 text,
  avatar               text,
  site_url             text,
  updated_at           timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (artist_id, related_songstats_id)
);

CREATE INDEX IF NOT EXISTS idx_artist_related_company ON public.artist_related (company_id);

