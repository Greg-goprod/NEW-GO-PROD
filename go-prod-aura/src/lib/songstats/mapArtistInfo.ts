export type SongstatsArtistInfo = {
  songstats_artist_id: string;
  avatar?: string | null;
  site_url?: string | null;
  name?: string | null;
  country?: string | null;
  bio?: string | null;
  genres?: string[] | null;
  links?: { source: string; external_id?: string | null; url?: string | null }[] | null;
  related_artists?: {
    songstats_artist_id: string;
    avatar?: string | null;
    site_url?: string | null;
    name?: string | null;
  }[] | null;
};

export function normalizeArtistInfo(ai: SongstatsArtistInfo) {
  const genres = (ai.genres ?? []).filter(Boolean) as string[];

  const links = (ai.links ?? []).map(l => ({
    source: String(l.source || '').toLowerCase(),
    external_id: l.external_id ?? null,
    url: l.url ?? null,
  }));

  const socialsWhitelist = new Set([
    "instagram","tiktok","youtube","facebook","twitter","x","soundcloud"
  ]);

  const socialUrls: Record<string, string | null> = {};
  for (const l of links) {
    const s = l.source === "twitter" ? "x" : l.source;
    if (socialsWhitelist.has(s) && l.url) {
      socialUrls[s] = l.url;
    }
  }

  const related = (ai.related_artists ?? []).map(r => ({
    related_songstats_id: r.songstats_artist_id,
    name: r.name ?? null,
    avatar: r.avatar ?? null,
    site_url: r.site_url ?? null,
  }));

  return {
    core: {
      songstats_id: ai.songstats_artist_id,
      name: ai.name ?? null,
      country: ai.country ?? null,
      avatar_url: ai.avatar ?? null,
      songstats_url: ai.site_url ?? null,
      bio: ai.bio ?? null,
    },
    genres,
    links,
    related,
    socials: socialUrls,
  };
}

