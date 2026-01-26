// deno-lint-ignore-file no-explicit-any
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

// Import type and function from shared lib
// Note: Adjust path if needed based on your Deno import setup
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

function normalizeArtistInfo(ai: SongstatsArtistInfo) {
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

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || "";
const RAPIDAPI_KEY = Deno.env.get("RAPIDAPI_KEY")!;
const RAPIDAPI_HOST = Deno.env.get("RAPIDAPI_SONGSTATS_HOST") || "songstats.p.rapidapi.com";
const SPOTIFY_CLIENT_ID = Deno.env.get("SPOTIFY_CLIENT_ID")!;
const SPOTIFY_CLIENT_SECRET = Deno.env.get("SPOTIFY_CLIENT_SECRET")!;
const RATE_DELAY_MS = Number(Deno.env.get("RATE_DELAY_MS") ?? 600);
const CATALOG_LIMIT = 500; // Max tracks per artist (increased for full catalog)
const ALBUMS_LIMIT = 200; // Max albums per artist (increased to get full discography)
const ENABLE_MULTISOURCE = true; // Appeler enrich-artist-multisource apres chaque artiste

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

// Flag pour savoir si Spotify est correctement configure
let spotifyConfigOk = false;

type QueueRow = { id:string; artist_id:string; company_id:string; priority:string; retries:number; attempts:number; };

async function lockBatch(company_id: string, limit: number) {
  const { data, error } = await supabase.rpc("lock_enrich_batch", { p_company_id: company_id, p_batch_size: limit });
  if (error) throw error;
  return (data ?? []) as QueueRow[];
}

async function getSongstatsId(artist_id: string) {
  const { data, error } = await supabase.from("artists").select("songstats_id").eq("id", artist_id).single();
  if (error) throw error;
  return data?.songstats_id as string | null;
}

async function fetchArtistInfo(songstats_id: string) {
  // Utiliser RapidAPI pour /artists/info
  const url = `https://${RAPIDAPI_HOST}/artists/info?songstats_artist_id=${encodeURIComponent(songstats_id)}`;
  const res = await fetch(url, {
    headers: {
      "x-rapidapi-host": RAPIDAPI_HOST,
      "x-rapidapi-key": RAPIDAPI_KEY,
    },
  });
  if (!res.ok) throw new Error(`Songstats HTTP ${res.status}`);
  const json = await res.json();
  if (!json?.artist_info) throw new Error("artist_info missing");
  return json.artist_info;
}

// Type pour les activités Songstats
type SongstatsActivity = {
  source: string;
  activity_text: string;
  activity_type: string;
  activity_date: string;
  activity_url: string | null;
  activity_avatar: string | null;
  activity_tier: number;
  track_info?: {
    songstats_track_id: string;
    avatar: string;
    title: string;
    release_date: string;
    site_url: string;
    artists: { name: string; songstats_artist_id: string }[];
  };
};

async function fetchArtistActivities(songstats_id: string): Promise<SongstatsActivity[]> {
  // Utiliser RapidAPI pour /artists/activities
  const url = `https://${RAPIDAPI_HOST}/artists/activities?songstats_artist_id=${encodeURIComponent(songstats_id)}&limit=50`;
  const res = await fetch(url, {
    headers: {
      "x-rapidapi-host": RAPIDAPI_HOST,
      "x-rapidapi-key": RAPIDAPI_KEY,
    },
  });
  if (!res.ok) {
    console.log(`[Activities] HTTP ${res.status} for ${songstats_id}`);
    return []; // Ne pas bloquer si activities échoue
  }
  const json = await res.json();
  return json?.activities ?? json?.data ?? [];
}

async function upsertActivities(artist_id: string, company_id: string, activities: SongstatsActivity[]) {
  if (!activities || activities.length === 0) return;

  // Supprimer les anciennes activités pour éviter les doublons
  await supabase.from("artist_activities").delete().eq("artist_id", artist_id);

  // Insérer les nouvelles
  const payload = activities.slice(0, 100).map((a) => ({
    artist_id,
    company_id,
    source: a.source,
    activity_type: a.activity_type,
    activity_date: a.activity_date,
    activity_tier: a.activity_tier,
    title: a.track_info?.title ?? null,
    description: a.activity_text,
    url: a.activity_url,
    image_url: a.activity_avatar,
    metadata: {
      activity_text: a.activity_text,
      activity_avatar: a.activity_avatar,
      track_info: a.track_info ?? null,
    },
    updated_at: new Date().toISOString(),
  }));

  const { error } = await supabase.from("artist_activities").insert(payload);
  if (error) console.log(`[Activities] Insert error: ${error.message}`);
  else console.log(`[Activities] Inserted ${payload.length} activities for ${artist_id}`);
}

// ============ STATS PLATEFORMES (via /artists/stats) ============

type SongstatsPlatformStat = {
  source: string;
  data: {
    followers?: number;
    followers_total?: number;
    monthly_listeners?: number;
    popularity?: number;
    streams?: number;
    streams_total?: number;
    views?: number;
    views_total?: number;
    subscribers?: number;
    likes?: number;
    posts?: number;
    engagement_rate?: number;
    shazams?: number;
    playlists?: number;
    playlist_reach?: number;
    [key: string]: number | undefined;
  };
};

// Recuperer les stats de toutes les plateformes via Songstats API
async function fetchArtistStats(songstats_id: string): Promise<SongstatsPlatformStat[]> {
  const url = `https://${RAPIDAPI_HOST}/artists/stats?songstats_artist_id=${encodeURIComponent(songstats_id)}`;
  
  try {
    const res = await fetch(url, {
      headers: {
        "x-rapidapi-host": RAPIDAPI_HOST,
        "x-rapidapi-key": RAPIDAPI_KEY,
      },
    });
    
    if (!res.ok) {
      console.log(`[Stats] HTTP ${res.status} for ${songstats_id}`);
      return [];
    }
    
    const json = await res.json();
    console.log(`[Stats] Response keys:`, Object.keys(json));
    
    // Songstats retourne les stats par plateforme
    if (json.stats && Array.isArray(json.stats)) {
      return json.stats;
    }
    
    // Format alternatif: objet avec sources comme cles
    if (json.result === "success" && json.stats) {
      const statsArray: SongstatsPlatformStat[] = [];
      for (const [source, data] of Object.entries(json.stats)) {
        if (data && typeof data === 'object') {
          statsArray.push({ source, data: data as SongstatsPlatformStat['data'] });
        }
      }
      return statsArray;
    }
    
    return [];
  } catch (err: any) {
    console.log(`[Stats] Error for ${songstats_id}: ${err.message}`);
    return [];
  }
}

// Stocker les stats dans artist_stats_current
async function upsertStats(artist_id: string, company_id: string, stats: SongstatsPlatformStat[]) {
  if (!stats || stats.length === 0) {
    console.log(`[Stats] No stats to upsert for ${artist_id}`);
    return;
  }

  const now = new Date().toISOString();
  const payload: any[] = [];

  // Capturer TOUTES les metriques retournees par l'API Songstats
  // Plus de filtrage restrictif - on veut toutes les donnees disponibles
  for (const stat of stats) {
    const source = stat.source.toLowerCase();
    const data = stat.data;
    
    if (!data) continue;
    
    // Extraire TOUTES les metriques disponibles dans data
    for (const [metric, value] of Object.entries(data)) {
      if (value !== undefined && value !== null && typeof value === 'number' && !isNaN(value)) {
        payload.push({
          artist_id,
          company_id,
          source,
          metric,
          value: Math.round(value),
          unit: getMetricUnit(metric),
          retrieved_at: now,
          updated_at: now,
        });
      }
    }
  }

  if (payload.length === 0) {
    console.log(`[Stats] No valid metrics to upsert for ${artist_id}`);
    return;
  }

  // Supprimer les anciennes stats pour cet artiste
  await supabase.from("artist_stats_current").delete().eq("artist_id", artist_id);

  // Inserer les nouvelles stats par batch
  for (let i = 0; i < payload.length; i += 50) {
    const batch = payload.slice(i, i + 50);
    const { error } = await supabase.from("artist_stats_current").insert(batch);
    if (error) {
      console.log(`[Stats] Insert error: ${error.message}`);
    }
  }
  
  console.log(`[Stats] Upserted ${payload.length} metrics for ${artist_id}`);
}

function getMetricUnit(metric: string): string {
  if (metric.includes('rate')) return 'percent';
  if (metric.includes('streams') || metric.includes('views')) return 'count';
  return 'count';
}

// ============ AUDIENCE GEOGRAPHIQUE (via /artists/audience) ============

type SongstatsAudienceCity = {
  city_name: string;
  city_region?: string;
  country_code: string;
  city_lat?: string;
  city_lng?: string;
  current_listeners: number | null;
  peak_listeners?: number;
  peak_date?: string;
};

type SongstatsAudienceData = {
  source: string;
  data: {
    monthly_listeners?: SongstatsAudienceCity[];
    city_charts?: any[];
    country_charts?: any[];
  };
};

type SongstatsAudienceResponse = {
  result: string;
  message: string;
  audience?: SongstatsAudienceData[];
  artist_info?: any;
};

// Retourne les donnees d'audience de TOUTES les sources (Spotify, Apple Music, Deezer, etc.)
// Essaie d'abord source=all, puis fallback vers source=spotify si erreur 500
async function fetchArtistAudience(songstats_id: string, spotify_id: string | null): Promise<SongstatsAudienceData[]> {
  // Helper pour faire l'appel API
  async function tryFetch(source: string): Promise<SongstatsAudienceData[] | null> {
    try {
      let url = `https://${RAPIDAPI_HOST}/artists/audience?songstats_artist_id=${encodeURIComponent(songstats_id)}&source=${source}`;
      if (spotify_id) {
        url += `&spotify_artist_id=${encodeURIComponent(spotify_id)}`;
      }
      console.log(`[Audience] Fetching (source=${source}) from: ${url}`);
      
      const res = await fetch(url, {
        headers: {
          "x-rapidapi-key": RAPIDAPI_KEY,
          "x-rapidapi-host": RAPIDAPI_HOST,
          "Accept": "application/json",
        },
      });
      
      if (!res.ok) {
        console.log(`[Audience] HTTP error ${res.status} for ${songstats_id} (source=${source})`);
        return null; // Retourner null pour indiquer echec (permettre fallback)
      }
      
      const json: SongstatsAudienceResponse = await res.json();
      
      if (json.result === "success" && json.audience && json.audience.length > 0) {
        const sources = json.audience.map(a => a.source).join(", ");
        console.log(`[Audience] Found data from sources: ${sources}`);
        return json.audience;
      }
      
      return [];
    } catch (err: any) {
      console.log(`[Audience] Error for ${songstats_id} (source=${source}): ${err.message}`);
      return null;
    }
  }
  
  // Essayer d'abord source=all (pour avoir toutes les plateformes)
  const allResult = await tryFetch("all");
  if (allResult !== null) {
    return allResult;
  }
  
  // Fallback vers source=spotify si source=all echoue (erreur 500)
  console.log(`[Audience] Fallback to source=spotify`);
  const spotifyResult = await tryFetch("spotify");
  return spotifyResult ?? [];
}

async function upsertAudience(artist_id: string, company_id: string, audienceData: SongstatsAudienceData[]) {
  if (!audienceData || audienceData.length === 0) {
    console.log(`[Audience] No audience data to upsert for ${artist_id}`);
    return;
  }

  const now = new Date().toISOString();
  
  // Supprimer les anciennes donnees d'audience pour cet artiste
  await supabase.from("artist_audience").delete().eq("artist_id", artist_id);
  
  // Preparer les nouvelles donnees de TOUTES les sources
  const payload: any[] = [];
  
  for (const sourceData of audienceData) {
    const source = sourceData.source.toLowerCase();
    const cities = sourceData.data?.monthly_listeners || [];
    
    for (const city of cities) {
      if (city.current_listeners !== null && city.current_listeners > 0) {
        payload.push({
          artist_id,
          company_id,
          source, // spotify, apple_music, deezer, etc.
          country_code: city.country_code,
          city: city.city_name,
          listeners_count: city.current_listeners,
          percentage: null,
          rank: null,
          updated_at: now,
        });
      }
    }
  }

  if (payload.length === 0) {
    console.log(`[Audience] No valid cities to insert for ${artist_id}`);
    return;
  }

  // Inserer par batch
  for (let i = 0; i < payload.length; i += 50) {
    const batch = payload.slice(i, i + 50);
    const { error } = await supabase.from("artist_audience").insert(batch);
    if (error) {
      console.log(`[Audience] Insert error: ${error.message}`);
    }
  }
  
  // Log des sources inserees
  const sourceCounts = audienceData.map(s => `${s.source}: ${s.data?.monthly_listeners?.length || 0}`).join(", ");
  console.log(`[Audience] Upserted ${payload.length} entries from sources: ${sourceCounts}`);
}

// Type pour le catalog
type CatalogTrackLink = {
  source: string;
  url: string;
  id?: string;
};

type CatalogTrack = {
  songstats_track_id: string;
  avatar: string;
  title: string;
  release_date: string;
  site_url: string;
  isrcs: string[];
  artists: { name: string; songstats_artist_id: string }[];
  links?: CatalogTrackLink[];
  label?: string;
};

// Recuperer le catalog de l'artiste via RapidAPI
async function fetchArtistCatalog(songstats_id: string): Promise<{ tracks: CatalogTrack[]; total: number }> {
  const allTracks: CatalogTrack[] = [];
  let offset = 0;
  const limit = 50;
  let total = 0;
  
  // Pagination - fetch all tracks with links
  while (offset < CATALOG_LIMIT) {
    const url = `https://${RAPIDAPI_HOST}/artists/catalog?songstats_artist_id=${encodeURIComponent(songstats_id)}&limit=${limit}&offset=${offset}&with_links=true`;
    
    const res = await fetch(url, {
      headers: {
        "x-rapidapi-host": RAPIDAPI_HOST,
        "x-rapidapi-key": RAPIDAPI_KEY,
      },
    });
    
    if (!res.ok) {
      console.log(`[Catalog] HTTP ${res.status} for ${songstats_id}`);
      break;
    }
    
    const json = await res.json();
    if (json.result !== "success" || !json.catalog) {
      console.log(`[Catalog] No data for ${songstats_id}`);
      break;
    }
    
    total = json.tracks_total || 0;
    const tracks = json.catalog as CatalogTrack[];
    allTracks.push(...tracks);
    
    console.log(`[Catalog] Fetched ${tracks.length} tracks (offset ${offset}, total ${total})`);
    
    // Si moins de tracks que la limite, on a tout
    if (tracks.length < limit) break;
    
    offset += limit;
    await new Promise(r => setTimeout(r, RATE_DELAY_MS));
  }
  
  return { tracks: allTracks, total };
}

// Stocker le catalog dans artist_catalog
async function upsertCatalog(artist_id: string, company_id: string, tracks: CatalogTrack[]) {
  if (!tracks || tracks.length === 0) {
    console.log(`[Catalog] No tracks to upsert for ${artist_id}`);
    return;
  }

  const payload = tracks.map((t) => ({
    artist_id,
    company_id,
    track_external_id: t.songstats_track_id,
    source: "songstats",
    track_name: t.title,
    album_image_url: t.avatar || null,
    track_url: t.site_url || null,
    release_date: t.release_date || null,
    isrc: t.isrcs?.[0] || null,
    label: t.label || null,
    // Stocker les liens externes (Spotify, YouTube, Apple Music, etc.)
    external_links: t.links ? JSON.stringify(t.links) : null,
    retrieved_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }));

  // Upsert par batch de 50
  for (let i = 0; i < payload.length; i += 50) {
    const batch = payload.slice(i, i + 50);
    const { error } = await supabase
      .from("artist_catalog")
      .upsert(batch, { onConflict: "artist_id,track_external_id,source" });
    
    if (error) {
      console.log(`[Catalog] Upsert error batch ${i}: ${error.message}`);
    }
  }
  
  console.log(`[Catalog] Upserted ${payload.length} tracks for ${artist_id}`);
}

// ============ CONCERTS (via Bandsintown / concerts-tracker API) ============

const CONCERTS_API_HOST = "concerts-artists-events-tracker.p.rapidapi.com";

type BandsintownConcert = {
  artist_id: string;
  source: string;
  event_id: string;
  external_id: string | null;
  event_name: string | null;
  event_date: string;
  event_time: string | null;
  venue_name: string | null;
  city: string | null;
  country: string | null;
  ticket_url: string | null;
  is_future: boolean;
  raw_payload?: any;
};

const concertApiHeaders = () => ({
  "X-RapidAPI-Key": RAPIDAPI_KEY,
  "X-RapidAPI-Host": CONCERTS_API_HOST,
});

// Rechercher l'artiste sur Bandsintown
async function searchBandsintownArtist(artistName: string): Promise<string | null> {
  const url = `https://${CONCERTS_API_HOST}/search?keyword=${encodeURIComponent(artistName)}&types=artist`;
  
  try {
    const res = await fetch(url, { headers: concertApiHeaders() });
    if (res.ok) {
      const data = await res.json();
      const artists = data?.artists || [];
      if (artists.length > 0) {
        const match = artists.find((a: any) => a.verified) || artists[0];
        console.log(`[Concerts] Found on Bandsintown: ${match?.name} (ID: ${match?.id})`);
        return match?.id ? String(match.id) : null;
      }
    }
  } catch (err: any) {
    console.log(`[Concerts] Bandsintown search error: ${err.message}`);
  }
  return null;
}

// Recuperer les concerts a venir
async function fetchUpcomingConcerts(bandsintownId: string, dbArtistId: string): Promise<BandsintownConcert[]> {
  const url = `https://${CONCERTS_API_HOST}/artist/events?artist_id=${bandsintownId}`;
  const events: BandsintownConcert[] = [];
  
  try {
    const res = await fetch(url, { headers: concertApiHeaders() });
    if (res.ok) {
      const data = await res.json();
      const eventsList = data?.events || [];
      const venuesMap: Record<number, any> = {};
      
      if (data?.venues && Array.isArray(data.venues)) {
        for (const v of data.venues) venuesMap[v.id] = v;
      }
      
      console.log(`[Concerts] Found ${eventsList.length} upcoming events`);
      
      for (const e of eventsList) {
        const venue = venuesMap[e.venue_id] || {};
        const eventDate = e.starts_at?.split("T")[0] || new Date().toISOString().split("T")[0];
        const eventTime = e.starts_at?.includes("T") ? e.starts_at.split("T")[1]?.slice(0, 8) : null;
        
        events.push({
          artist_id: dbArtistId,
          source: "bandsintown",
          event_id: e.id ? String(e.id) : (`bit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`),
          external_id: e.id ? String(e.id) : null,
          event_name: e.title || venue.name || null,
          event_date: eventDate,
          event_time: eventTime,
          venue_name: venue.name || null,
          city: venue.city || null,
          country: venue.country || null,
          ticket_url: e.has_tickets ? `https://www.bandsintown.com/e/${e.id}` : null,
          is_future: true,
          raw_payload: { ...e, venue_details: venue },
        });
      }
    }
  } catch (err: any) {
    console.log(`[Concerts] Upcoming fetch error: ${err.message}`);
  }
  
  return events;
}

// Recuperer les concerts passes
async function fetchPastConcerts(bandsintownId: string, dbArtistId: string): Promise<BandsintownConcert[]> {
  const today = new Date().toISOString().split("T")[0];
  const url = `https://${CONCERTS_API_HOST}/artist/past?artist_id=${bandsintownId}&before=${today}`;
  const events: BandsintownConcert[] = [];
  
  try {
    const res = await fetch(url, { headers: concertApiHeaders() });
    if (res.ok) {
      const data = await res.json();
      const eventsList = data?.events || [];
      const venuesMap: Record<number, any> = {};
      
      if (data?.venues && Array.isArray(data.venues)) {
        for (const v of data.venues) venuesMap[v.id] = v;
      }
      
      console.log(`[Concerts] Found ${eventsList.length} past events`);
      
      for (const e of eventsList.slice(0, 100)) {
        const venue = venuesMap[e.venue_id] || {};
        const eventDate = e.starts_at?.split("T")[0] || new Date().toISOString().split("T")[0];
        const eventTime = e.starts_at?.includes("T") ? e.starts_at.split("T")[1]?.slice(0, 8) : null;
        
        events.push({
          artist_id: dbArtistId,
          source: "bandsintown",
          event_id: e.id ? String(e.id) : (`bit-past-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`),
          external_id: e.id ? String(e.id) : null,
          event_name: e.title || venue.name || null,
          event_date: eventDate,
          event_time: eventTime,
          venue_name: venue.name || null,
          city: venue.city || null,
          country: venue.country || null,
          ticket_url: null,
          is_future: false,
          raw_payload: { ...e, venue_details: venue },
        });
      }
    }
  } catch (err: any) {
    console.log(`[Concerts] Past fetch error: ${err.message}`);
  }
  
  return events;
}

// Fonction principale pour recuperer et stocker les concerts
async function fetchAndStoreConcerts(artist_id: string, artistName: string): Promise<{ upcoming: number; past: number }> {
  console.log(`[Concerts] Searching for: ${artistName}`);
  
  // 1. Chercher l'artiste sur Bandsintown
  const bandsintownId = await searchBandsintownArtist(artistName);
  if (!bandsintownId) {
    console.log(`[Concerts] Artist not found on Bandsintown: ${artistName}`);
    return { upcoming: 0, past: 0 };
  }
  
  // 2. Recuperer les concerts
  await new Promise(r => setTimeout(r, 300));
  const upcoming = await fetchUpcomingConcerts(bandsintownId, artist_id);
  
  await new Promise(r => setTimeout(r, 300));
  const past = await fetchPastConcerts(bandsintownId, artist_id);
  
  const allEvents = [...upcoming, ...past];
  console.log(`[Concerts] Total events: ${allEvents.length}`);
  
  // 3. Stocker les concerts
  if (allEvents.length > 0) {
    // Supprimer les anciens concerts de cette source
    await supabase.from("artist_events").delete().eq("artist_id", artist_id).eq("source", "bandsintown");
    
    // Inserer par batch
    for (let i = 0; i < allEvents.length; i += 50) {
      const batch = allEvents.slice(i, i + 50);
      const { error } = await supabase.from("artist_events").insert(batch);
      if (error) console.log(`[Concerts] Insert error batch ${i}: ${error.message}`);
    }
    
    console.log(`[Concerts] Stored ${allEvents.length} concerts for ${artistName}`);
  }
  
  return { upcoming: upcoming.length, past: past.length };
}

// ============ STATS HISTORIQUES (via /artists/historic_stats) ============

type HistoricStatDay = {
  date: string;
  popularity_current?: number;
  followers_total?: number;
  monthly_listeners_current?: number;
  streams_total?: number;
  playlists_current?: number;
  playlist_reach_current?: number;
};

async function fetchArtistHistoricStats(songstats_id: string, source: string = "spotify", days: number = 30): Promise<HistoricStatDay[]> {
  const endDate = new Date().toISOString().split("T")[0];
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  
  const url = `https://${RAPIDAPI_HOST}/artists/historic_stats?songstats_artist_id=${encodeURIComponent(songstats_id)}&source=${source}&start_date=${startDate}&end_date=${endDate}&with_aggregates=true`;
  
  try {
    const res = await fetch(url, {
      headers: {
        "x-rapidapi-host": RAPIDAPI_HOST,
        "x-rapidapi-key": RAPIDAPI_KEY,
      },
    });
    
    if (!res.ok) {
      console.log(`[HistoricStats] HTTP ${res.status} for ${songstats_id}`);
      return [];
    }
    
    const json = await res.json();
    if (json.result !== "success" || !json.stats) {
      return [];
    }
    
    // stats est un array avec { source, data: { history: [...] } }
    const spotifyStats = json.stats.find((s: any) => s.source === source);
    if (spotifyStats?.data?.history) {
      console.log(`[HistoricStats] Found ${spotifyStats.data.history.length} days of history`);
      return spotifyStats.data.history;
    }
    
    return [];
  } catch (err: any) {
    console.log(`[HistoricStats] Error for ${songstats_id}: ${err.message}`);
    return [];
  }
}

async function upsertHistoricStats(artist_id: string, _company_id: string, history: HistoricStatDay[]) {
  if (!history || history.length === 0) {
    console.log(`[HistoricStats] No history to upsert for ${artist_id}`);
    return;
  }

  // La table artist_stats_history utilise metric/value, pas des colonnes separees
  // Schema: artist_id, source, metric, ts, value, unit, retrieved_at
  const payload: any[] = [];
  const source = "spotify";
  const now = new Date().toISOString();
  
  // Mapping API Songstats -> noms dans la DB (compatibles avec le frontend)
  const metricMapping: Record<string, string> = {
    popularity_current: "popularity",
    followers_total: "followers_total",
    monthly_listeners_current: "monthly_listeners",
    streams_total: "streams_total",
    playlists_current: "playlists_count",
    playlist_reach_current: "playlist_reach",
  };
  
  for (const day of history) {
    const ts = new Date(day.date).toISOString();
    
    for (const [key, metric] of Object.entries(metricMapping)) {
      const value = day[key as keyof HistoricStatDay];
      if (value !== undefined && value !== null && typeof value === 'number') {
        payload.push({
          artist_id,
          source,
          metric,
          ts,
          value,
          unit: "count",
          retrieved_at: now,
        });
      }
    }
  }

  if (payload.length === 0) {
    console.log(`[HistoricStats] No metrics to insert`);
    return;
  }

  // Upsert par batch - onConflict: artist_id,source,metric,ts
  for (let i = 0; i < payload.length; i += 100) {
    const batch = payload.slice(i, i + 100);
    const { error } = await supabase
      .from("artist_stats_history")
      .upsert(batch, { onConflict: "artist_id,source,metric,ts" });
    
    if (error) {
      console.log(`[HistoricStats] Upsert error: ${error.message}`);
    }
  }
  
  console.log(`[HistoricStats] Upserted ${payload.length} metric/day pairs for ${artist_id}`);
}

// ============ TOP CURATORS (via /artists/top_curators) ============

type TopCurator = {
  curator_id: string;
  curator_name: string;
  curator_type: string;
  playlists_with_artist: number;
  followers_total: string;
  external_url?: string;
};

async function fetchArtistTopCurators(songstats_id: string, source: string = "spotify", limit: number = 30): Promise<TopCurator[]> {
  const url = `https://${RAPIDAPI_HOST}/artists/top_curators?songstats_artist_id=${encodeURIComponent(songstats_id)}&source=${source}&scope=total&limit=${limit}`;
  
  try {
    const res = await fetch(url, {
      headers: {
        "x-rapidapi-host": RAPIDAPI_HOST,
        "x-rapidapi-key": RAPIDAPI_KEY,
      },
    });
    
    if (!res.ok) {
      console.log(`[TopCurators] HTTP ${res.status} for ${songstats_id}`);
      return [];
    }
    
    const json = await res.json();
    if (json.result !== "success" || !json.data) {
      return [];
    }
    
    // data est un array avec { source, top_curators: [...] }
    const spotifyData = json.data.find((d: any) => d.source === source);
    if (spotifyData?.top_curators) {
      console.log(`[TopCurators] Found ${spotifyData.top_curators.length} curators`);
      return spotifyData.top_curators;
    }
    
    return [];
  } catch (err: any) {
    console.log(`[TopCurators] Error for ${songstats_id}: ${err.message}`);
    return [];
  }
}

async function upsertTopCurators(artist_id: string, company_id: string, curators: TopCurator[]) {
  if (!curators || curators.length === 0) {
    console.log(`[TopCurators] No curators to upsert for ${artist_id}`);
    return;
  }

  // Supprimer les anciens curators de cet artiste
  await supabase.from("artist_curators").delete().eq("artist_id", artist_id);

  const now = new Date().toISOString();
  
  const payload = curators.map((c) => ({
    artist_id,
    company_id,
    curator_external_id: c.curator_id,
    source: "spotify",
    curator_name: c.curator_name,
    curator_type: c.curator_type || "user",
    playlists_with_artist: c.playlists_with_artist || 0,
    total_followers: parseFollowersCount(c.followers_total),
    contact_info: null,
    updated_at: now,
  }));

  const { error } = await supabase.from("artist_curators").insert(payload);
  
  if (error) {
    console.log(`[TopCurators] Insert error: ${error.message}`);
  } else {
    console.log(`[TopCurators] Inserted ${payload.length} curators for ${artist_id}`);
  }
}

// ============ AUDIENCE DETAILS (via /artists/audience/details) ============

type AudienceDetailItem = {
  metric_type: string; // 'city_charts', 'country_charts', etc.
  data: any[];
};

async function fetchArtistAudienceDetails(
  songstats_id: string, 
  spotify_id: string | null,
  country_code: string = "US"
): Promise<AudienceDetailItem[]> {
  let url = `https://${RAPIDAPI_HOST}/artists/audience/details?songstats_artist_id=${encodeURIComponent(songstats_id)}&source=spotify&country_code=${country_code}`;
  if (spotify_id) {
    url += `&spotify_artist_id=${encodeURIComponent(spotify_id)}`;
  }
  
  try {
    const res = await fetch(url, {
      headers: {
        "x-rapidapi-host": RAPIDAPI_HOST,
        "x-rapidapi-key": RAPIDAPI_KEY,
      },
    });
    
    if (!res.ok) {
      console.log(`[AudienceDetails] HTTP ${res.status} for ${songstats_id}`);
      return [];
    }
    
    const json = await res.json();
    if (json.result !== "success" || !json.audience) {
      return [];
    }
    
    const results: AudienceDetailItem[] = [];
    for (const aud of json.audience) {
      if (aud.data?.city_charts && aud.data.city_charts.length > 0) {
        results.push({ metric_type: 'city_charts', data: aud.data.city_charts });
      }
      if (aud.data?.country_charts && aud.data.country_charts.length > 0) {
        results.push({ metric_type: 'country_charts', data: aud.data.country_charts });
      }
    }
    
    console.log(`[AudienceDetails] Found ${results.length} detail types for ${country_code}`);
    return results;
  } catch (err: any) {
    console.log(`[AudienceDetails] Error for ${songstats_id}: ${err.message}`);
    return [];
  }
}

async function upsertAudienceDetails(artist_id: string, company_id: string, details: AudienceDetailItem[]) {
  if (!details || details.length === 0) {
    console.log(`[AudienceDetails] No details to upsert for ${artist_id}`);
    return;
  }

  const now = new Date().toISOString();
  const payload: any[] = [];
  
  for (const detail of details) {
    for (const item of detail.data || []) {
      payload.push({
        artist_id,
        company_id,
        source: "spotify",
        metric_type: detail.metric_type,
        metric_key: item.chart_name || item.city_name || item.country_name || "unknown",
        metric_value: item.position || item.listeners || 0,
        percentage: null,
        updated_at: now,
      });
    }
  }

  if (payload.length === 0) return;

  // Supprimer les anciens details d'audience pour cet artiste
  await supabase.from("artist_audience_details").delete().eq("artist_id", artist_id);

  // Inserer par batch
  for (let i = 0; i < payload.length; i += 50) {
    const batch = payload.slice(i, i + 50);
    const { error } = await supabase.from("artist_audience_details").insert(batch);
    if (error) {
      console.log(`[AudienceDetails] Insert error: ${error.message}`);
    }
  }
  
  console.log(`[AudienceDetails] Upserted ${payload.length} details for ${artist_id}`);
}

// ============ TOP PLAYLISTS (via /artists/top_playlists) ============

type TopPlaylist = {
  playlist_id: string;
  playlist_name: string;
  external_url: string;
  followers_total: string;
  image_url?: string;
};

async function fetchArtistTopPlaylists(songstats_id: string, source: string = "spotify", limit: number = 50): Promise<TopPlaylist[]> {
  const url = `https://${RAPIDAPI_HOST}/artists/top_playlists?songstats_artist_id=${encodeURIComponent(songstats_id)}&source=${source}&scope=total&limit=${limit}`;
  
  try {
    const res = await fetch(url, {
      headers: {
        "x-rapidapi-host": RAPIDAPI_HOST,
        "x-rapidapi-key": RAPIDAPI_KEY,
      },
    });
    
    if (!res.ok) {
      console.log(`[TopPlaylists] HTTP ${res.status} for ${songstats_id}`);
      return [];
    }
    
    const json = await res.json();
    if (json.result !== "success" || !json.data) {
      return [];
    }
    
    // data est un array avec { source, metric, scope, top_playlists: [...] }
    const spotifyData = json.data.find((d: any) => d.source === source);
    if (spotifyData?.top_playlists) {
      console.log(`[TopPlaylists] Found ${spotifyData.top_playlists.length} playlists`);
      return spotifyData.top_playlists;
    }
    
    return [];
  } catch (err: any) {
    console.log(`[TopPlaylists] Error for ${songstats_id}: ${err.message}`);
    return [];
  }
}

async function upsertTopPlaylists(artist_id: string, company_id: string, playlists: TopPlaylist[]) {
  if (!playlists || playlists.length === 0) {
    console.log(`[TopPlaylists] No playlists to upsert for ${artist_id}`);
    return;
  }

  // Supprimer les anciennes top playlists de cet artiste (marques par playlist_owner = 'top_playlist')
  await supabase
    .from("artist_playlists")
    .delete()
    .eq("artist_id", artist_id)
    .eq("playlist_owner", "top_playlist");

  const now = new Date().toISOString();
  
  const payload = playlists.map((p, index) => ({
    artist_id,
    company_id,
    playlist_external_id: p.playlist_id,
    source: "spotify",
    playlist_name: p.playlist_name,
    playlist_owner: "top_playlist", // Marqueur pour distinguer les top playlists
    playlist_owner_type: "editorial",
    followers_count: parseFollowersCount(p.followers_total),
    playlist_url: p.external_url,
    playlist_image_url: p.image_url || null,
    position: index + 1,
    retrieved_at: now,
    updated_at: now,
  }));

  // Inserer les nouvelles
  const { error } = await supabase.from("artist_playlists").insert(payload);
  
  if (error) {
    console.log(`[TopPlaylists] Insert error: ${error.message}`);
  } else {
    console.log(`[TopPlaylists] Inserted ${payload.length} top playlists for ${artist_id}`);
  }
}

// Convertir "34.5M" en nombre
function parseFollowersCount(str: string): number {
  if (!str) return 0;
  const num = parseFloat(str.replace(/[^0-9.]/g, ''));
  if (str.toLowerCase().includes('m')) return Math.round(num * 1_000_000);
  if (str.toLowerCase().includes('k')) return Math.round(num * 1_000);
  return Math.round(num);
}

// ============ TRACK DETAILS (via /tracks/info) ============

// Limite de tracks a enrichir en detail (pour eviter trop d'appels API)
const TRACK_DETAILS_LIMIT = 50; // Enrichir les 50 tracks les plus recents

// Types pour les details de track
type TrackCollaborator = {
  name: string;
  songstats_collaborator_id?: string;
  roles?: string[];
};

type TrackLink = {
  source: string;
  external_id?: string;
  url?: string;
  isrc?: string;
};

type TrackAudioFeature = {
  key: string;
  value: string;
};

type TrackDetails = {
  songstats_track_id: string;
  avatar?: string;
  site_url?: string;
  release_date?: string;
  title?: string;
  artists?: { name: string; songstats_artist_id: string }[];
  collaborators?: TrackCollaborator[];
  labels?: { name: string }[];
  distributors?: { name: string }[];
  genres?: string[];
  links?: TrackLink[];
};

type TrackInfoResponse = {
  result: string;
  track_info: TrackDetails;
  audio_analysis?: TrackAudioFeature[];
};

// Extraire le Spotify Track ID depuis les liens du catalog
function getSpotifyTrackId(trackLinks: CatalogTrackLink[] | undefined): string | null {
  if (!trackLinks) return null;
  const spotifyLink = trackLinks.find(l => l.source?.toLowerCase() === 'spotify');
  return spotifyLink?.id || null;
}

// Recuperer les details d'un track via /tracks/info
// Priorite: spotify_track_id > songstats_track_id
async function fetchTrackDetails(songstats_track_id: string, spotify_track_id: string | null): Promise<TrackInfoResponse | null> {
  // Utiliser spotify_track_id en priorite (meilleur taux de succes)
  let url: string;
  if (spotify_track_id) {
    url = `https://${RAPIDAPI_HOST}/tracks/info?spotify_track_id=${encodeURIComponent(spotify_track_id)}`;
  } else {
    url = `https://${RAPIDAPI_HOST}/tracks/info?songstats_track_id=${encodeURIComponent(songstats_track_id)}`;
  }
  
  try {
    const res = await fetch(url, {
      headers: {
        "x-rapidapi-host": RAPIDAPI_HOST,
        "x-rapidapi-key": RAPIDAPI_KEY,
      },
    });
    
    if (!res.ok) {
      // Ne pas logger les 404 comme erreurs majeures
      if (res.status !== 404) {
        console.log(`[TrackDetails] HTTP ${res.status} for ${spotify_track_id || songstats_track_id}`);
      }
      return null;
    }
    
    const json = await res.json();
    if (json.result !== "success" || !json.track_info) {
      return null;
    }
    
    return json as TrackInfoResponse;
  } catch (err: any) {
    console.log(`[TrackDetails] Error for ${spotify_track_id || songstats_track_id}: ${err.message}`);
    return null;
  }
}

// Stocker les collaborateurs d'un track
async function upsertTrackCollaborators(
  artist_id: string, 
  company_id: string, 
  track_id: string, 
  collaborators: TrackCollaborator[]
) {
  if (!collaborators || collaborators.length === 0) return;
  
  const payload = collaborators.map(c => ({
    artist_id,
    company_id,
    track_external_id: track_id,
    collaborator_name: c.name,
    collaborator_external_id: c.songstats_collaborator_id || null,
    roles: c.roles || [],
    updated_at: new Date().toISOString(),
  }));
  
  const { error } = await supabase
    .from("track_collaborators")
    .upsert(payload, { onConflict: "artist_id,track_external_id,collaborator_external_id" });
  
  if (error) {
    console.log(`[TrackCollaborators] Upsert error: ${error.message}`);
  }
}

// Stocker les liens externes d'un track
async function upsertTrackLinks(
  artist_id: string, 
  company_id: string, 
  track_id: string, 
  links: TrackLink[]
) {
  if (!links || links.length === 0) return;
  
  const payload = links.map(l => ({
    artist_id,
    company_id,
    track_external_id: track_id,
    source: l.source,
    platform_track_id: l.external_id || null,
    url: l.url || null,
    isrc: l.isrc || null,
    updated_at: new Date().toISOString(),
  }));
  
  const { error } = await supabase
    .from("track_links")
    .upsert(payload, { onConflict: "artist_id,track_external_id,source,platform_track_id" });
  
  if (error) {
    console.log(`[TrackLinks] Upsert error: ${error.message}`);
  }
}

// Stocker les audio features d'un track
async function upsertTrackAudioFeatures(
  artist_id: string, 
  company_id: string, 
  track_id: string, 
  audio: TrackAudioFeature[]
) {
  if (!audio || audio.length === 0) return;
  
  // Convertir l'array en objet
  const features: Record<string, string | number | null> = {};
  for (const f of audio) {
    features[f.key] = f.value;
  }
  
  const payload = {
    artist_id,
    company_id,
    track_external_id: track_id,
    duration: features.duration || null,
    tempo: features.tempo ? parseFloat(String(features.tempo)) : null,
    key: features.key || null,
    mode: features.mode || null,
    time_signature: features.time_signature ? parseInt(String(features.time_signature)) : null,
    acousticness: features.acousticness ? parseFloat(String(features.acousticness)) : null,
    danceability: features.danceability ? parseFloat(String(features.danceability)) : null,
    energy: features.energy ? parseFloat(String(features.energy)) : null,
    instrumentalness: features.instrumentalness ? parseFloat(String(features.instrumentalness)) : null,
    liveness: features.liveness ? parseFloat(String(features.liveness)) : null,
    loudness: features.loudness ? parseFloat(String(features.loudness)) : null,
    speechiness: features.speechiness ? parseFloat(String(features.speechiness)) : null,
    valence: features.valence ? parseFloat(String(features.valence)) : null,
    updated_at: new Date().toISOString(),
  };
  
  const { error } = await supabase
    .from("track_audio_features")
    .upsert(payload, { onConflict: "artist_id,track_external_id" });
  
  if (error) {
    console.log(`[TrackAudioFeatures] Upsert error: ${error.message}`);
  }
}

// Mettre a jour artist_catalog avec les compteurs
async function updateCatalogWithDetails(
  artist_id: string,
  track_id: string,
  details: TrackDetails,
  hasAudioFeatures: boolean
) {
  const { error } = await supabase
    .from("artist_catalog")
    .update({
      distributors: details.distributors ? JSON.stringify(details.distributors) : null,
      genres: details.genres || [],
      collaborators_count: details.collaborators?.length || 0,
      links_count: details.links?.length || 0,
      has_audio_features: hasAudioFeatures,
      updated_at: new Date().toISOString(),
    })
    .eq("artist_id", artist_id)
    .eq("track_external_id", track_id);
  
  if (error) {
    console.log(`[CatalogUpdate] Error: ${error.message}`);
  }
}

// Enrichir les details de tous les tracks d'un artiste (limite a TRACK_DETAILS_LIMIT)
async function enrichTrackDetails(
  artist_id: string, 
  company_id: string, 
  tracks: CatalogTrack[]
): Promise<number> {
  // Limiter le nombre de tracks a enrichir
  const tracksToEnrich = tracks.slice(0, TRACK_DETAILS_LIMIT);
  let enrichedCount = 0;
  
  console.log(`[TrackDetails] Enriching ${tracksToEnrich.length} tracks (of ${tracks.length} total)`);
  
  for (const track of tracksToEnrich) {
    await new Promise(r => setTimeout(r, RATE_DELAY_MS)); // Rate limiting
    
    // Extraire le Spotify Track ID des liens du catalog
    const spotifyTrackId = getSpotifyTrackId(track.links);
    
    const response = await fetchTrackDetails(track.songstats_track_id, spotifyTrackId);
    if (!response) continue;
    
    const details = response.track_info;
    const audio = response.audio_analysis;
    
    // Stocker les collaborateurs
    if (details.collaborators && details.collaborators.length > 0) {
      await upsertTrackCollaborators(artist_id, company_id, track.songstats_track_id, details.collaborators);
    }
    
    // Stocker les liens externes
    if (details.links && details.links.length > 0) {
      await upsertTrackLinks(artist_id, company_id, track.songstats_track_id, details.links);
    }
    
    // Stocker les audio features
    if (audio && audio.length > 0) {
      await upsertTrackAudioFeatures(artist_id, company_id, track.songstats_track_id, audio);
    }
    
    // Mettre a jour le catalog avec les compteurs
    await updateCatalogWithDetails(
      artist_id, 
      track.songstats_track_id, 
      details, 
      audio && audio.length > 0
    );
    
    enrichedCount++;
  }
  
  console.log(`[TrackDetails] Enriched ${enrichedCount} tracks with full details`);
  return enrichedCount;
}

// ============ TRACK STATS (via /tracks/stats) ============
// Statistiques en temps reel des tracks (streams, playlists, charts)

type TrackStatItem = {
  source: string;
  data: {
    streams_current?: number;
    streams_total?: number;
    playlists_total?: number;
    charts_total?: number;
    chart_peak_position?: number;
    chart_peak_date?: string;
  };
};

type TrackStatsResponse = {
  result: string;
  stats?: TrackStatItem[];
  playlists?: any[];
  charts?: any[];
  videos?: any[];
  links?: any[];
};

async function fetchTrackStats(spotify_track_id: string): Promise<TrackStatsResponse | null> {
  const url = `https://${RAPIDAPI_HOST}/tracks/stats?source=all&spotify_track_id=${encodeURIComponent(spotify_track_id)}&with_playlists=true&with_charts=true&limit=50`;
  
  try {
    const res = await fetch(url, {
      headers: {
        "x-rapidapi-host": RAPIDAPI_HOST,
        "x-rapidapi-key": RAPIDAPI_KEY,
      },
    });
    
    if (!res.ok) {
      if (res.status !== 404) {
        console.log(`[TrackStats] HTTP ${res.status} for ${spotify_track_id}`);
      }
      return null;
    }
    
    const json = await res.json();
    if (json.result !== "success") {
      return null;
    }
    
    return json as TrackStatsResponse;
  } catch (err: any) {
    console.log(`[TrackStats] Error: ${err.message}`);
    return null;
  }
}

async function upsertTrackStats(
  artist_id: string,
  company_id: string,
  track_id: string,
  spotify_track_id: string,
  statsResponse: TrackStatsResponse
) {
  const now = new Date().toISOString();
  const payload: any[] = [];
  
  // Inserer les stats par source
  if (statsResponse.stats && statsResponse.stats.length > 0) {
    for (const stat of statsResponse.stats) {
      payload.push({
        artist_id,
        company_id,
        track_id,
        spotify_track_id,
        source: stat.source,
        streams_current: stat.data?.streams_current || 0,
        streams_total: stat.data?.streams_total || 0,
        playlists_total: stat.data?.playlists_total || 0,
        charts_total: stat.data?.charts_total || 0,
        chart_peak_position: stat.data?.chart_peak_position || null,
        chart_peak_date: stat.data?.chart_peak_date || null,
        updated_at: now,
      });
    }
  }
  
  if (payload.length === 0) return;
  
  // Delete existing stats for this track
  await supabase.from("track_stats").delete()
    .eq("artist_id", artist_id)
    .eq("track_id", track_id);
  
  const { error } = await supabase.from("track_stats").insert(payload);
  
  if (error) {
    console.log(`[TrackStats] Upsert error: ${error.message}`);
  } else {
    console.log(`[TrackStats] Upserted ${payload.length} stats for track ${track_id}`);
  }
}

// ============ TRACK ACTIVITIES (via /tracks/activities) ============
// Historique des activites sur les tracks (playlists, charts, milestones)

type TrackActivity = {
  source: string;
  activity_type: string;
  timestamp: string;
  data: any;
};

type TrackActivitiesResponse = {
  result: string;
  activities?: TrackActivity[];
};

async function fetchTrackActivities(spotify_track_id: string, limit: number = 50): Promise<TrackActivity[]> {
  const url = `https://${RAPIDAPI_HOST}/tracks/activities?source=all&spotify_track_id=${encodeURIComponent(spotify_track_id)}&limit=${limit}&tier=4&albums=true&editorial=true&milestones=true`;
  
  try {
    const res = await fetch(url, {
      headers: {
        "x-rapidapi-host": RAPIDAPI_HOST,
        "x-rapidapi-key": RAPIDAPI_KEY,
      },
    });
    
    if (!res.ok) {
      if (res.status !== 404) {
        console.log(`[TrackActivities] HTTP ${res.status} for ${spotify_track_id}`);
      }
      return [];
    }
    
    const json: TrackActivitiesResponse = await res.json();
    if (json.result !== "success" || !json.activities) {
      return [];
    }
    
    return json.activities;
  } catch (err: any) {
    console.log(`[TrackActivities] Error: ${err.message}`);
    return [];
  }
}

async function upsertTrackActivities(
  artist_id: string,
  company_id: string,
  track_id: string,
  activities: TrackActivity[]
) {
  if (!activities || activities.length === 0) return;
  
  const now = new Date().toISOString();
  const payload = activities.map(act => ({
    artist_id,
    company_id,
    track_id,
    source: act.source,
    activity_type: act.activity_type,
    activity_timestamp: act.timestamp,
    activity_data: JSON.stringify(act.data),
    created_at: now,
  }));
  
  // Delete existing activities for this track to avoid duplicates
  await supabase.from("track_activities").delete()
    .eq("artist_id", artist_id)
    .eq("track_id", track_id);
  
  // Insert by batch
  for (let i = 0; i < payload.length; i += 50) {
    const batch = payload.slice(i, i + 50);
    const { error } = await supabase.from("track_activities").insert(batch);
    if (error) {
      console.log(`[TrackActivities] Insert error: ${error.message}`);
    }
  }
  
  console.log(`[TrackActivities] Upserted ${payload.length} activities for track ${track_id}`);
}

// Enrichir les stats et activites des top tracks (limite)
const TRACK_STATS_LIMIT = 20; // Top 20 tracks pour les stats detaillees

async function enrichTrackStatsAndActivities(
  artist_id: string,
  company_id: string,
  tracks: CatalogTrack[]
): Promise<number> {
  const tracksToEnrich = tracks.slice(0, TRACK_STATS_LIMIT);
  let enrichedCount = 0;
  
  console.log(`[TrackStats] Enriching ${tracksToEnrich.length} top tracks with stats/activities`);
  
  for (const track of tracksToEnrich) {
    const spotifyTrackId = getSpotifyTrackId(track.links);
    if (!spotifyTrackId) continue;
    
    await new Promise(r => setTimeout(r, RATE_DELAY_MS));
    
    // Fetch track stats
    const statsResponse = await fetchTrackStats(spotifyTrackId);
    if (statsResponse) {
      await upsertTrackStats(artist_id, company_id, track.songstats_track_id, spotifyTrackId, statsResponse);
    }
    
    await new Promise(r => setTimeout(r, RATE_DELAY_MS));
    
    // Fetch track activities
    const activities = await fetchTrackActivities(spotifyTrackId, 50);
    if (activities.length > 0) {
      await upsertTrackActivities(artist_id, company_id, track.songstats_track_id, activities);
    }
    
    enrichedCount++;
  }
  
  console.log(`[TrackStats] Enriched ${enrichedCount} tracks with stats and activities`);
  return enrichedCount;
}

// ============ SPOTIFY ALBUMS ============

// Cache pour le token Spotify
let spotifyToken: string | null = null;
let spotifyTokenExpiry = 0;

// Valider les credentials Spotify au demarrage du batch
async function validateSpotifyCredentials(): Promise<boolean> {
  if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
    console.log(`[Spotify] Missing credentials - CLIENT_ID: ${!!SPOTIFY_CLIENT_ID}, SECRET: ${!!SPOTIFY_CLIENT_SECRET}`);
    return false;
  }
  
  try {
    await getSpotifyToken();
    console.log(`[Spotify] Credentials validated successfully`);
    spotifyConfigOk = true;
    return true;
  } catch (err: any) {
    console.log(`[Spotify] Credentials validation FAILED: ${err.message}`);
    spotifyConfigOk = false;
    return false;
  }
}

async function getSpotifyToken(): Promise<string> {
  // Retourner le token cache s'il est encore valide
  if (spotifyToken && Date.now() < spotifyTokenExpiry) {
    return spotifyToken;
  }
  
  // Encoder en base64 pour Deno
  const credentials = `${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`;
  const base64Credentials = btoa(credentials);
  
  console.log(`[Spotify] Requesting new token...`);
  
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Authorization": `Basic ${base64Credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  
  if (!res.ok) {
    const errText = await res.text();
    console.log(`[Spotify] Token error: ${res.status} - ${errText}`);
    // Reset token cache on error
    spotifyToken = null;
    spotifyTokenExpiry = 0;
    throw new Error(`Spotify token error: ${res.status} - ${errText}`);
  }
  
  const json = await res.json();
  console.log(`[Spotify] Token obtained, expires in ${json.expires_in}s`);
  
  spotifyToken = json.access_token;
  spotifyTokenExpiry = Date.now() + (json.expires_in - 60) * 1000;
  
  return spotifyToken!;
}

// Extraire le Spotify ID directement des links de l'API Songstats
function extractSpotifyIdFromLinks(links: { source: string; external_id?: string | null; url?: string | null }[] | null | undefined): string | null {
  if (!links || links.length === 0) return null;
  const spotifyLink = links.find(l => l.source?.toLowerCase() === 'spotify');
  const spotifyId = spotifyLink?.external_id || null;
  if (spotifyId) {
    console.log(`[Spotify] Found ID from API links: ${spotifyId}`);
  }
  return spotifyId;
}

// Chercher le Spotify ID dans artist_links_songstats (fallback apres upsert)
async function getSpotifyIdFromDB(artist_id: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("artist_links_songstats")
    .select("external_id")
    .eq("artist_id", artist_id)
    .eq("source", "spotify")
    .single();
  
  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
    console.log(`[Spotify] DB lookup error: ${error.message}`);
  }
  
  const spotifyId = data?.external_id || null;
  if (spotifyId) {
    console.log(`[Spotify] Found ID from DB: ${spotifyId}`);
  }
  return spotifyId;
}

// Fonction combinee pour obtenir le Spotify ID de maniere fiable
async function getSpotifyId(artist_id: string, apiLinks: { source: string; external_id?: string | null; url?: string | null }[] | null | undefined): Promise<string | null> {
  // 1. Essayer d'abord depuis les links de l'API (source directe)
  const fromApi = extractSpotifyIdFromLinks(apiLinks);
  if (fromApi) return fromApi;
  
  // 2. Fallback: chercher dans la DB (apres upsert des links)
  const fromDb = await getSpotifyIdFromDB(artist_id);
  if (fromDb) return fromDb;
  
  console.log(`[Spotify] No Spotify ID found for artist ${artist_id}`);
  return null;
}

type SpotifyAlbum = {
  id: string;
  name: string;
  album_type: string;
  release_date: string;
  total_tracks: number;
  images: { url: string; width: number; height: number }[];
  external_urls: { spotify: string };
  label?: string;
  external_ids?: { upc?: string };
};

async function fetchArtistAlbums(spotify_id: string): Promise<SpotifyAlbum[]> {
  if (!spotifyConfigOk) {
    console.log(`[Albums] Skipping - Spotify not configured`);
    return [];
  }
  
  const allAlbums: SpotifyAlbum[] = [];
  let offset = 0;
  const limit = 50;
  let retryCount = 0;
  const maxRetries = 2;
  
  console.log(`[Albums] Fetching albums for Spotify ID: ${spotify_id}`);
  
  while (offset < ALBUMS_LIMIT) {
    try {
      const token = await getSpotifyToken();
      const url = `https://api.spotify.com/v1/artists/${spotify_id}/albums?include_groups=album,single,compilation&limit=${limit}&offset=${offset}`;
      
      const res = await fetch(url, {
        headers: { "Authorization": `Bearer ${token}` },
      });
      
      if (res.status === 401) {
        // Token expired, force refresh
        console.log(`[Albums] Token expired, refreshing...`);
        spotifyToken = null;
        spotifyTokenExpiry = 0;
        if (retryCount < maxRetries) {
          retryCount++;
          continue;
        }
        throw new Error("Spotify auth failed after retry");
      }
      
      if (res.status === 404) {
        console.log(`[Albums] Artist not found on Spotify: ${spotify_id}`);
        return [];
      }
      
      if (res.status === 429) {
        // Rate limited, wait and retry
        const retryAfter = parseInt(res.headers.get("Retry-After") || "5") * 1000;
        console.log(`[Albums] Rate limited, waiting ${retryAfter}ms...`);
        await new Promise(r => setTimeout(r, retryAfter));
        continue;
      }
      
      if (!res.ok) {
        const errText = await res.text();
        console.log(`[Albums] Spotify HTTP ${res.status}: ${errText}`);
        throw new Error(`Spotify API error: ${res.status}`);
      }
      
      const json = await res.json();
      const items = json.items || [];
      allAlbums.push(...items);
      
      console.log(`[Albums] Page ${Math.floor(offset/limit) + 1}: ${items.length} albums (total ${json.total})`);
      
      // Stop if we've got all albums or no more pages
      if (items.length < limit || !json.next || allAlbums.length >= json.total) {
        break;
      }
      
      offset += limit;
      retryCount = 0; // Reset retry counter on success
      await new Promise(r => setTimeout(r, 100)); // Rate limit Spotify
      
    } catch (err: any) {
      console.log(`[Albums] Error during fetch: ${err.message}`);
      if (retryCount < maxRetries) {
        retryCount++;
        await new Promise(r => setTimeout(r, 1000 * retryCount));
        continue;
      }
      throw err;
    }
  }
  
  console.log(`[Albums] Total fetched: ${allAlbums.length} albums for ${spotify_id}`);
  return allAlbums;
}

// Normalise Spotify release_date to YYYY-MM-DD format
function normalizeReleaseDate(date: string | undefined): string | null {
  if (!date) return null;
  // YYYY -> YYYY-01-01
  if (/^\d{4}$/.test(date)) return `${date}-01-01`;
  // YYYY-MM -> YYYY-MM-01
  if (/^\d{4}-\d{2}$/.test(date)) return `${date}-01`;
  // YYYY-MM-DD -> as is
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
  return null;
}

async function upsertAlbums(artist_id: string, company_id: string, albums: SpotifyAlbum[]) {
  if (!albums || albums.length === 0) {
    console.log(`[Albums] No albums to upsert for ${artist_id}`);
    return;
  }

  const payload = albums.map((a) => ({
    artist_id,
    company_id,
    album_external_id: a.id,
    source: "spotify",
    album_name: a.name,
    album_type: a.album_type,
    release_date: normalizeReleaseDate(a.release_date),
    total_tracks: a.total_tracks,
    image_url: a.images?.[0]?.url || null,
    spotify_url: a.external_urls?.spotify || null,
    label: a.label || null,
    upc: a.external_ids?.upc || null,
    retrieved_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }));

  const { error } = await supabase
    .from("artist_albums")
    .upsert(payload, { onConflict: "artist_id,album_external_id,source" });
  
  if (error) {
    console.log(`[Albums] Upsert error: ${error.message}`);
  } else {
    console.log(`[Albums] Upserted ${payload.length} albums for ${artist_id}`);
  }
}

async function upsertAll(artist_id: string, company_id: string, ai: any) {
  const norm = normalizeArtistInfo(ai);

  await supabase.from("artists").update({
    songstats_id: norm.core.songstats_id,
    avatar_url: norm.core.avatar_url,
    songstats_url: norm.core.songstats_url,
    bio: norm.core.bio,
  }).eq("id", artist_id).eq("company_id", company_id);

  if (norm.genres.length > 0) {
    const payload = norm.genres.map((g) => ({ artist_id, company_id, genre: g, updated_at: new Date().toISOString() }));
    await supabase.from("artist_genres").upsert(payload, { onConflict: "artist_id,genre" });
  }

  if ((ai.links ?? []).length > 0) {
    const payload = norm.links.map((l:any) => ({
      artist_id, company_id, source: l.source, external_id: l.external_id, url: l.url, updated_at: new Date().toISOString()
    }));
    await supabase.from("artist_links_songstats").upsert(payload, { onConflict: "artist_id,source" });
  }

  if ((ai.related_artists ?? []).length > 0) {
    const payload = norm.related.map((r:any) => ({
      artist_id, company_id, related_songstats_id: r.related_songstats_id, name: r.name, avatar: r.avatar, site_url: r.site_url,
      updated_at: new Date().toISOString()
    }));
    await supabase.from("artist_related").upsert(payload, { onConflict: "artist_id,related_songstats_id" });
  }
}

async function markDone(id: string, ok: boolean, preview?: string) {
  const patch: any = { status: ok ? "done" : "error", updated_at: new Date().toISOString() };
  if (!ok) { patch.error_preview = (preview ?? "").slice(0,200); patch.error_message = preview ?? null; }
  await supabase.from("artist_enrich_queue").update(patch).eq("id", id);
}

// ============ APPEL ENRICH-ARTIST-MULTISOURCE ============
// Enrichit avec MusicBrainz, TheAudioDB, Wikipedia, Wikidata, Discogs, Last.fm, Fanart.tv

async function callEnrichMultisource(artist_id: string): Promise<{ ok: boolean; error?: string }> {
  if (!ENABLE_MULTISOURCE || !SUPABASE_ANON_KEY) {
    console.log(`[Multisource] Skipping - disabled or no anon key`);
    return { ok: true };
  }
  
  const url = `${SUPABASE_URL}/functions/v1/enrich-artist-multisource`;
  
  try {
    console.log(`[Multisource] Calling enrich-artist-multisource for ${artist_id}...`);
    
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ artist_id }),
    });
    
    if (!res.ok) {
      const errText = await res.text();
      console.log(`[Multisource] HTTP ${res.status}: ${errText.slice(0, 200)}`);
      return { ok: false, error: `HTTP ${res.status}` };
    }
    
    const data = await res.json();
    console.log(`[Multisource] Success: ${data.sources_successful || 0}/${data.sources_processed || 0} sources`);
    return { ok: true };
    
  } catch (err: any) {
    console.log(`[Multisource] Error: ${err.message}`);
    return { ok: false, error: err.message };
  }
}

Deno.serve(async (req) => {
  // Verifier les variables d'environnement au demarrage
  if (!SUPABASE_URL || !SERVICE_KEY) {
    return new Response(JSON.stringify({ ok:false, error:"Missing SUPABASE env vars", url: !!SUPABASE_URL, key: !!SERVICE_KEY }), { status: 500 });
  }
  if (!RAPIDAPI_KEY) {
    return new Response(JSON.stringify({ ok:false, error:"Missing RAPIDAPI_KEY" }), { status: 500 });
  }
  
  try {
    const body = await req.json().catch(() => ({}));
    console.log("[Enrich] Body received:", JSON.stringify(body));
    
    const company_id = body.company_id as string;
    const batch_size = Number(body.batch_size ?? 10);
    const dry_run    = Boolean(body.dry_run ?? false);
    if (!company_id) return new Response(JSON.stringify({ ok:false, error:"company_id required" }), { status: 400 });

    // Valider les credentials Spotify UNE SEULE FOIS au debut du batch
    console.log("[Enrich] Validating Spotify credentials...");
    await validateSpotifyCredentials();
    console.log(`[Enrich] Spotify ready: ${spotifyConfigOk}`);

    console.log("[Enrich] Locking batch...");
    const batch = await lockBatch(company_id, batch_size);
    console.log(`[Enrich] Batch locked: ${batch.length} artists`);
    
    if (batch.length === 0) return new Response(JSON.stringify({ ok:true, locked:0 }), { status: 200 });

    let successCount = 0;
    let errorCount = 0;
    
    for (const item of batch) {
      try {
        console.log(`\n[Enrich] ========== ARTIST ${item.artist_id} ==========`);
        
        // 1. Recuperer le Songstats ID depuis la table artists
        const sid = await getSongstatsId(item.artist_id);
        if (!sid) { 
          console.log(`[Enrich] No songstats_id for artist ${item.artist_id}`);
          await markDone(item.id, false, "missing songstats_id"); 
          errorCount++;
          continue; 
        }
        console.log(`[Enrich] Songstats ID: ${sid}`);

        if (!dry_run) {
          // 2. Recuperer les infos artiste depuis Songstats API
          const ai = await fetchArtistInfo(sid);
          console.log(`[Enrich] Artist: ${ai?.name || 'unknown'}`);
          
          // 3. Sauvegarder les infos artiste (incluant les links) AVANT de chercher Spotify ID
          await upsertAll(item.artist_id, item.company_id, ai);
          console.log(`[Enrich] Artist data saved`);
          
          // 4. Recuperer et stocker les stats des plateformes (followers, streams, etc.)
          await new Promise(r => setTimeout(r, RATE_DELAY_MS));
          try {
            const platformStats = await fetchArtistStats(sid);
            await upsertStats(item.artist_id, item.company_id, platformStats);
          } catch (statsErr: any) {
            console.log(`[Stats] Warning - could not fetch stats: ${statsErr.message}`);
          }
          
          // 4bis. Recuperer et stocker l'audience geographique de TOUTES les sources
          await new Promise(r => setTimeout(r, RATE_DELAY_MS));
          try {
            // Obtenir le Spotify ID pour l'appel audience multi-source
            const spotifyIdForAudience = extractSpotifyIdFromLinks(ai?.links);
            const audienceAllSources = await fetchArtistAudience(sid, spotifyIdForAudience);
            await upsertAudience(item.artist_id, item.company_id, audienceAllSources);
          } catch (audienceErr: any) {
            console.log(`[Audience] Warning - could not fetch audience: ${audienceErr.message}`);
          }
          
          // 4ter. Recuperer et stocker les stats historiques (180 jours) de TOUTES les sources EN PARALLELE
          const historicSources = [
            "spotify", "deezer", "apple_music", "amazon", "tidal", "soundcloud",
            "youtube", "tiktok", "instagram", "facebook", "twitter", "beatport", "bandsintown"
          ];
          // Appels en parallele pour gagner du temps
          const historicPromises = historicSources.map(source => 
            fetchArtistHistoricStats(sid, source, 180)
              .then(stats => ({ source, stats }))
              .catch(() => ({ source, stats: [] as HistoricStatDay[] }))
          );
          const historicResults = await Promise.all(historicPromises);
          // Upsert sequentiel des resultats
          for (const { source, stats } of historicResults) {
            if (stats.length > 0) {
              await upsertHistoricStats(item.artist_id, item.company_id, stats);
              console.log(`[HistoricStats] ${source}: ${stats.length} days`);
            }
          }
          
          // 4quater. Recuperer et stocker les top playlists
          await new Promise(r => setTimeout(r, RATE_DELAY_MS));
          try {
            const topPlaylists = await fetchArtistTopPlaylists(sid, "spotify", 50);
            await upsertTopPlaylists(item.artist_id, item.company_id, topPlaylists);
          } catch (playlistErr: any) {
            console.log(`[TopPlaylists] Warning - could not fetch top playlists: ${playlistErr.message}`);
          }
          
          // 4quinquies. Recuperer et stocker les top curators
          await new Promise(r => setTimeout(r, RATE_DELAY_MS));
          try {
            const topCurators = await fetchArtistTopCurators(sid, "spotify", 30);
            await upsertTopCurators(item.artist_id, item.company_id, topCurators);
          } catch (curatorErr: any) {
            console.log(`[TopCurators] Warning - could not fetch top curators: ${curatorErr.message}`);
          }
          
          // 4sexies. Recuperer les details d'audience (charts par pays, etc.)
          await new Promise(r => setTimeout(r, RATE_DELAY_MS));
          try {
            const spotifyIdForDetails = extractSpotifyIdFromLinks(ai?.links);
            // Recuperer pour les principaux pays
            const audienceDetails = await fetchArtistAudienceDetails(sid, spotifyIdForDetails, "US");
            await upsertAudienceDetails(item.artist_id, item.company_id, audienceDetails);
          } catch (detailsErr: any) {
            console.log(`[AudienceDetails] Warning - could not fetch audience details: ${detailsErr.message}`);
          }
          
          // 4a. Recuperer et stocker les activites (Activity Feed)
          await new Promise(r => setTimeout(r, RATE_DELAY_MS));
          const activities = await fetchArtistActivities(sid);
          await upsertActivities(item.artist_id, item.company_id, activities);
          
          // 4b. Recuperer et stocker les concerts via Bandsintown
          await new Promise(r => setTimeout(r, RATE_DELAY_MS));
          try {
            const concertResult = await fetchAndStoreConcerts(item.artist_id, ai.name || "Unknown");
            console.log(`[Concerts] Result: ${concertResult.upcoming} upcoming, ${concertResult.past} past`);
          } catch (concertErr: any) {
            // Ne pas faire echouer l'enrichissement si les concerts echouent
            console.log(`[Concerts] Warning - could not fetch concerts: ${concertErr.message}`);
          }
          
          // ============================================================
          // DESACTIVE pour economiser les requetes API (limite 600/jour)
          // Les albums/singles Spotify suffisent pour la discographie
          // Reactiver si upgrade du plan RapidAPI
          // ============================================================
          // 5. Recuperer et stocker le catalog (Discographie - tracks)
          // await new Promise(r => setTimeout(r, RATE_DELAY_MS));
          // const { tracks } = await fetchArtistCatalog(sid);
          // await upsertCatalog(item.artist_id, item.company_id, tracks);
          
          // 5b. Enrichir les details des tracks (collaborateurs, liens, audio features)
          // if (tracks.length > 0) {
          //   try {
          //     await enrichTrackDetails(item.artist_id, item.company_id, tracks);
          //   } catch (trackErr: any) {
          //     console.log(`[TrackDetails] Warning - could not enrich track details: ${trackErr.message}`);
          //   }
            
          //   // 5c. Enrichir les stats et activites des top tracks
          //   try {
          //     await enrichTrackStatsAndActivities(item.artist_id, item.company_id, tracks);
          //   } catch (trackStatsErr: any) {
          //     console.log(`[TrackStats] Warning - could not enrich track stats/activities: ${trackStatsErr.message}`);
          //   }
          // }
          // ============================================================
          
          // 6. Recuperer et stocker les albums via Spotify
          // Utilise la fonction combinee: API links d'abord, puis fallback DB
          if (spotifyConfigOk) {
            const spotifyId = await getSpotifyId(item.artist_id, ai?.links);
            
            if (spotifyId) {
              try {
                await new Promise(r => setTimeout(r, RATE_DELAY_MS));
                const albums = await fetchArtistAlbums(spotifyId);
                await upsertAlbums(item.artist_id, item.company_id, albums);
              } catch (albumErr: any) {
                // Ne pas faire echouer l'enrichissement si Spotify echoue
                console.log(`[Albums] Warning - could not fetch albums: ${albumErr.message}`);
              }
            } else {
              console.log(`[Albums] No Spotify ID found - skipping album fetch`);
            }
          } else {
            console.log(`[Albums] Spotify not configured - skipping album fetch`);
          }
          
          // 7. Enrichissement multi-source (MusicBrainz, TheAudioDB, Wikipedia, etc.)
          await new Promise(r => setTimeout(r, RATE_DELAY_MS));
          try {
            await callEnrichMultisource(item.artist_id);
          } catch (msErr: any) {
            // Ne pas faire echouer l'enrichissement si multisource echoue
            console.log(`[Multisource] Warning - could not enrich: ${msErr.message}`);
          }
        }

        await markDone(item.id, true);
        successCount++;
        console.log(`[Enrich] SUCCESS for artist ${item.artist_id}`);
        await new Promise(r => setTimeout(r, RATE_DELAY_MS));
        
      } catch (e:any) {
        console.log(`[Enrich] ERROR for artist ${item.artist_id}: ${e?.message || String(e)}`);
        await markDone(item.id, false, e?.message || String(e));
        errorCount++;
      }
    }

    console.log(`\n[Enrich] ========== BATCH COMPLETE ==========`);
    console.log(`[Enrich] Success: ${successCount}, Errors: ${errorCount}`);
    
    return new Response(JSON.stringify({ 
      ok: true, 
      processed: batch.length,
      success: successCount,
      errors: errorCount,
      spotifyEnabled: spotifyConfigOk
    }), { status: 200 });
    
  } catch (e:any) {
    console.log(`[Enrich] FATAL ERROR: ${e?.message || String(e)}`);
    return new Response(JSON.stringify({ ok:false, error: e?.message || String(e) }), { status: 500 });
  }
});

