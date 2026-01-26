// =============================================================================
// Edge Function: enrich-artist-multisource v3
// Description: Enrichit les artistes avec validation croisee basee sur Spotify ID
// Sources: MusicBrainz, TheAudioDB, Wikipedia, Wikidata, Discogs, Last.fm, Fanart.tv
// =============================================================================
// deno-lint-ignore-file no-explicit-any

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

// =============================================================================
// Configuration
// =============================================================================
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// API Keys (from env or defaults for free tiers)
const LASTFM_API_KEY = Deno.env.get("LASTFM_API_KEY") || ""; // Get free key at last.fm/api
const FANART_API_KEY = Deno.env.get("FANART_API_KEY") || ""; // Get free key at fanart.tv
const DISCOGS_TOKEN = Deno.env.get("DISCOGS_TOKEN") || ""; // Optional, increases rate limit

// Rate limiting delays (en ms)
const MUSICBRAINZ_DELAY = 1100;
const THEAUDIODB_DELAY = 500;
const WIKIPEDIA_DELAY = 200;
const DISCOGS_DELAY = 1000;
const LASTFM_DELAY = 200;
const FANART_DELAY = 200;

// TheAudioDB free tier key
const THEAUDIODB_API_KEY = "2";

// Wikipedia languages to search
const WIKI_LANGUAGES = ['en', 'fr', 'de', 'es', 'it', 'pt'];

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// User-Agent for APIs that require it
const USER_AGENT = 'Go-Prod-AURA/1.0 (https://goprod.app)';

// =============================================================================
// Types
// =============================================================================
interface ArtistContext {
  artist_id: string;
  canonical_name: string;
  spotify_id: string | null;
  known_ids: {
    musicbrainz?: string;
    wikidata?: string;
    theaudiodb?: string;
    discogs?: string;
    apple_music?: string;
    lastfm?: string;
  };
  aliases: string[];
  wikipedia_sitelinks?: Record<string, string>;
}

interface EnrichRequest {
  artist_id: string;
  sources?: string[];
  force?: boolean;
}

type SourceType = 'musicbrainz' | 'theaudiodb' | 'wikipedia' | 'wikidata' | 'discogs' | 'lastfm' | 'fanart';

// =============================================================================
// Step 1: Build Artist Context (Spotify = Source de Verite)
// =============================================================================
async function buildArtistContext(artist_id: string): Promise<ArtistContext> {
  console.log(`[Context] Building context for artist ${artist_id}...`);
  
  const { data: artist } = await supabase
    .from('artists')
    .select('name')
    .eq('id', artist_id)
    .single();
  
  const { data: spotifyData } = await supabase
    .from('spotify_data')
    .select('spotify_id, external_url')
    .eq('artist_id', artist_id)
    .single();
  
  const { data: knownLinks } = await supabase
    .from('artist_links_songstats')
    .select('source, external_id')
    .eq('artist_id', artist_id);
  
  const { data: enriched } = await supabase
    .from('artists_enriched')
    .select('musicbrainz_id, wikidata_id, theaudiodb_id, discogs_id')
    .eq('artist_id', artist_id)
    .single();
  
  const known_ids: ArtistContext['known_ids'] = {};
  
  // From artist_links_songstats (priority)
  for (const link of knownLinks || []) {
    if (link.source === 'musicbrainz') known_ids.musicbrainz = link.external_id;
    if (link.source === 'discogs') known_ids.discogs = link.external_id;
    if (link.source === 'apple_music') known_ids.apple_music = link.external_id;
  }
  
  // From artists_enriched (fallback)
  if (enriched?.musicbrainz_id && !known_ids.musicbrainz) {
    known_ids.musicbrainz = enriched.musicbrainz_id;
  }
  if (enriched?.wikidata_id) known_ids.wikidata = enriched.wikidata_id;
  if (enriched?.theaudiodb_id) known_ids.theaudiodb = enriched.theaudiodb_id;
  if (enriched?.discogs_id && !known_ids.discogs) known_ids.discogs = enriched.discogs_id;
  
  const canonical_name = artist?.name || 'Unknown';
  
  // Build aliases for fuzzy matching
  const aliases: string[] = [];
  if (canonical_name.includes(' ')) {
    aliases.push(canonical_name.replace(/\s+/g, ''));
  }
  if (canonical_name.toUpperCase() !== canonical_name) {
    aliases.push(canonical_name.toUpperCase());
  }
  if (canonical_name.toLowerCase() !== canonical_name) {
    aliases.push(canonical_name.toLowerCase());
  }
  
  const context: ArtistContext = {
    artist_id,
    canonical_name,
    spotify_id: spotifyData?.spotify_id || null,
    known_ids,
    aliases,
  };
  
  console.log(`[Context] Built:`, {
    name: context.canonical_name,
    spotify_id: context.spotify_id,
    known_ids: Object.keys(context.known_ids).filter(k => context.known_ids[k as keyof typeof context.known_ids]),
  });
  
  return context;
}

// =============================================================================
// API Fetchers - MusicBrainz
// =============================================================================
async function fetchMusicBrainzByMBID(mbid: string): Promise<any> {
  const url = `https://musicbrainz.org/ws/2/artist/${mbid}?inc=url-rels+aliases&fmt=json`;
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) return null;
  return await res.json();
}

async function searchMusicBrainzBySpotifyId(spotifyId: string): Promise<string | null> {
  const url = `https://musicbrainz.org/ws/2/url?resource=https://open.spotify.com/artist/${spotifyId}&fmt=json`;
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) return null;
  const data = await res.json();
  const artistRel = data['relation-list']?.find((r: any) => r['target-type'] === 'artist');
  return artistRel?.artist?.id || null;
}

async function searchMusicBrainzByName(name: string): Promise<any[]> {
  const url = `https://musicbrainz.org/ws/2/artist/?query=artist:${encodeURIComponent(name)}&fmt=json&limit=5`;
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) return [];
  const data = await res.json();
  return data.artists || [];
}

// =============================================================================
// API Fetchers - TheAudioDB
// =============================================================================
async function fetchTheAudioDBByMBID(mbid: string): Promise<any> {
  const url = `https://theaudiodb.com/api/v1/json/${THEAUDIODB_API_KEY}/artist-mb.php?i=${mbid}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  return data.artists?.[0] || null;
}

async function fetchTheAudioDBByName(name: string): Promise<any> {
  const url = `https://theaudiodb.com/api/v1/json/${THEAUDIODB_API_KEY}/search.php?s=${encodeURIComponent(name)}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  return data.artists?.[0] || null;
}

// =============================================================================
// API Fetchers - Wikidata & Wikipedia
// =============================================================================
// Note: Wikidata fetch is now inline in processWikidata with timeout support
// Note: Wikipedia fetch is now inline in processWikipedia with better error handling

// =============================================================================
// API Fetchers - Discogs
// =============================================================================
async function fetchDiscogsArtist(discogsId: string): Promise<any> {
  const headers: Record<string, string> = { 'User-Agent': USER_AGENT };
  if (DISCOGS_TOKEN) headers['Authorization'] = `Discogs token=${DISCOGS_TOKEN}`;
  
  const url = `https://api.discogs.com/artists/${discogsId}`;
  const res = await fetch(url, { headers });
  if (!res.ok) return null;
  return await res.json();
}

async function searchDiscogsArtist(name: string): Promise<any> {
  const headers: Record<string, string> = { 'User-Agent': USER_AGENT };
  if (DISCOGS_TOKEN) headers['Authorization'] = `Discogs token=${DISCOGS_TOKEN}`;
  
  const url = `https://api.discogs.com/database/search?q=${encodeURIComponent(name)}&type=artist&per_page=5`;
  const res = await fetch(url, { headers });
  if (!res.ok) return null;
  const data = await res.json();
  return data.results || [];
}

async function fetchDiscogsReleases(discogsId: string): Promise<any[]> {
  const headers: Record<string, string> = { 'User-Agent': USER_AGENT };
  if (DISCOGS_TOKEN) headers['Authorization'] = `Discogs token=${DISCOGS_TOKEN}`;
  
  const url = `https://api.discogs.com/artists/${discogsId}/releases?per_page=50&sort=year&sort_order=desc`;
  const res = await fetch(url, { headers });
  if (!res.ok) return [];
  const data = await res.json();
  return data.releases || [];
}

// =============================================================================
// API Fetchers - Last.fm
// =============================================================================
async function fetchLastfmArtistInfo(artistName: string): Promise<any> {
  if (!LASTFM_API_KEY) {
    console.log('[Last.fm] No API key configured');
    return null;
  }
  
  const url = `https://ws.audioscrobbler.com/2.0/?method=artist.getinfo&artist=${encodeURIComponent(artistName)}&api_key=${LASTFM_API_KEY}&format=json`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  return data.artist || null;
}

async function fetchLastfmSimilarArtists(artistName: string): Promise<any[]> {
  if (!LASTFM_API_KEY) return [];
  
  const url = `https://ws.audioscrobbler.com/2.0/?method=artist.getsimilar&artist=${encodeURIComponent(artistName)}&api_key=${LASTFM_API_KEY}&format=json&limit=10`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  return data.similarartists?.artist || [];
}

async function fetchLastfmTopTags(artistName: string): Promise<string[]> {
  if (!LASTFM_API_KEY) return [];
  
  const url = `https://ws.audioscrobbler.com/2.0/?method=artist.gettoptags&artist=${encodeURIComponent(artistName)}&api_key=${LASTFM_API_KEY}&format=json`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  return (data.toptags?.tag || []).slice(0, 10).map((t: any) => t.name);
}

// =============================================================================
// API Fetchers - Fanart.tv
// =============================================================================
async function fetchFanartImages(mbid: string): Promise<any> {
  if (!FANART_API_KEY) {
    console.log('[Fanart.tv] No API key configured');
    return null;
  }
  
  const url = `https://webservice.fanart.tv/v3/music/${mbid}?api_key=${FANART_API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  return await res.json();
}

// =============================================================================
// Validation & Matching
// =============================================================================
function normalizeNameForComparison(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

function calculateNameSimilarity(name1: string, name2: string): number {
  const n1 = normalizeNameForComparison(name1);
  const n2 = normalizeNameForComparison(name2);
  
  if (n1 === n2) return 1.0;
  if (n1.includes(n2) || n2.includes(n1)) return 0.8;
  
  const maxLen = Math.max(n1.length, n2.length);
  if (maxLen === 0) return 1.0;
  
  let matches = 0;
  const shorter = n1.length < n2.length ? n1 : n2;
  const longer = n1.length < n2.length ? n2 : n1;
  
  for (const char of shorter) {
    if (longer.includes(char)) matches++;
  }
  
  return matches / maxLen;
}

function validateMusicBrainzResult(mbResult: any, context: ArtistContext): number {
  let score = 0;
  
  const nameSim = calculateNameSimilarity(mbResult.name, context.canonical_name);
  score += nameSim * 50;
  
  for (const alias of mbResult.aliases || []) {
    const aliasSim = calculateNameSimilarity(alias.name, context.canonical_name);
    if (aliasSim > 0.9) score += 20;
  }
  
  const hasSpotifyLink = mbResult.relations?.some((r: any) => 
    r.url?.resource?.includes('spotify.com/artist/' + context.spotify_id)
  );
  if (hasSpotifyLink) score += 30;
  
  return Math.min(score, 100);
}

function validateDiscogsResult(result: any, context: ArtistContext): number {
  const nameSim = calculateNameSimilarity(result.title || result.name || '', context.canonical_name);
  return nameSim * 100;
}

// =============================================================================
// Source Processors
// =============================================================================

async function processMusicBrainz(context: ArtistContext, updateData: any, newPayload: any): Promise<any> {
  console.log(`[MusicBrainz] Starting...`);
  let mbData = null;
  let mbid = context.known_ids.musicbrainz;
  
  // Strategy 1: Use known MBID
  if (mbid) {
    console.log(`[MusicBrainz] Using known MBID: ${mbid}`);
    mbData = await fetchMusicBrainzByMBID(mbid);
    await new Promise(r => setTimeout(r, MUSICBRAINZ_DELAY));
  }
  
  // Strategy 2: Search by Spotify ID
  if (!mbData && context.spotify_id) {
    console.log(`[MusicBrainz] Searching by Spotify ID...`);
    mbid = await searchMusicBrainzBySpotifyId(context.spotify_id);
    if (mbid) {
      await new Promise(r => setTimeout(r, MUSICBRAINZ_DELAY));
      mbData = await fetchMusicBrainzByMBID(mbid);
    }
    await new Promise(r => setTimeout(r, MUSICBRAINZ_DELAY));
  }
  
  // Strategy 3: Search by name with validation
  if (!mbData) {
    console.log(`[MusicBrainz] Searching by name: ${context.canonical_name}`);
    const searchResults = await searchMusicBrainzByName(context.canonical_name);
    await new Promise(r => setTimeout(r, MUSICBRAINZ_DELAY));
    
    let bestMatch = null;
    let bestScore = 0;
    
    for (const result of searchResults) {
      const score = validateMusicBrainzResult(result, context);
      console.log(`[MusicBrainz] Candidate: ${result.name} (score: ${score})`);
      if (score > bestScore && score >= 50) {
        bestScore = score;
        bestMatch = result;
      }
    }
    
    if (bestMatch) {
      mbid = bestMatch.id;
      console.log(`[MusicBrainz] Best match: ${bestMatch.name} (score: ${bestScore})`);
      mbData = await fetchMusicBrainzByMBID(mbid);
      await new Promise(r => setTimeout(r, MUSICBRAINZ_DELAY));
    }
  }
  
  if (!mbData) {
    console.log(`[MusicBrainz] Not found`);
    return { success: false, reason: 'not_found' };
  }
  
  // Extract URLs from relations
  const urls: any = {};
  for (const rel of mbData.relations || []) {
    const url = rel.url?.resource;
    if (!url) continue;
    const type = rel.type?.toLowerCase();
    if (type === 'wikidata') {
      urls.wikidata = url;
      const match = url.match(/\/wiki\/(Q\d+)/);
      if (match) urls.wikidata_id = match[1];
    } else if (type === 'wikipedia') {
      if (url.includes('en.wikipedia')) urls.wikipedia_en = url;
      else if (url.includes('fr.wikipedia')) urls.wikipedia_fr = url;
    } else if (type === 'discogs') {
      urls.discogs = url;
      const match = url.match(/\/artist\/(\d+)/);
      if (match) urls.discogs_id = match[1];
    } else if (type === 'allmusic') urls.allmusic = url;
    else if (type === 'last.fm' || type === 'lastfm') urls.lastfm = url;
  }
  
  // Parse dates
  const beginDate = mbData['life-span']?.begin;
  const birthYear = beginDate ? parseInt(beginDate.substring(0, 4)) : null;
  
  updateData.musicbrainz_id = mbid;
  if (urls.wikidata_id) {
    updateData.wikidata_id = urls.wikidata_id;
    context.known_ids.wikidata = urls.wikidata_id;
  }
  if (urls.discogs_id && !context.known_ids.discogs) {
    updateData.discogs_id = urls.discogs_id;
    context.known_ids.discogs = urls.discogs_id;
  }
  
  if (birthYear && !isNaN(birthYear)) {
    if (mbData.type === 'Group') {
      updateData.formed_year = birthYear;
    } else {
      updateData.born_year = birthYear;
    }
  }
  if (mbData.area?.name) updateData.country_name = mbData.area.name;
  if (mbData['begin-area']?.name) updateData.city = mbData['begin-area'].name;
  if (mbData.type) updateData.artist_type = mbData.type;
  if (mbData.gender) updateData.gender = mbData.gender;
  if (mbData.disambiguation) updateData.disambiguation = mbData.disambiguation;
  
  updateData.url_musicbrainz = `https://musicbrainz.org/artist/${mbid}`;
  
  newPayload.musicbrainz = {
    mbid,
    name: mbData.name,
    type: mbData.type,
    gender: mbData.gender,
    country: mbData.country,
    area: mbData.area,
    begin_area: mbData['begin-area'],
    life_span: mbData['life-span'],
    disambiguation: mbData.disambiguation,
    aliases: mbData.aliases?.slice(0, 10),
    urls,
    fetched_at: new Date().toISOString(),
  };
  
  console.log(`[MusicBrainz] Success: ${mbData.name} (${mbData.type})`);
  return { success: true, mbid, name: mbData.name, type: mbData.type };
}

async function processTheAudioDB(context: ArtistContext, updateData: any, newPayload: any): Promise<any> {
  await new Promise(r => setTimeout(r, THEAUDIODB_DELAY));
  console.log(`[TheAudioDB] Starting...`);
  
  let tadbData = null;
  
  // Strategy 1: Use MusicBrainz ID
  const mbid = updateData.musicbrainz_id || context.known_ids.musicbrainz;
  if (mbid) {
    console.log(`[TheAudioDB] Searching by MBID: ${mbid}`);
    tadbData = await fetchTheAudioDBByMBID(mbid);
  }
  
  // Strategy 2: Search by name
  if (!tadbData) {
    console.log(`[TheAudioDB] Searching by name: ${context.canonical_name}`);
    tadbData = await fetchTheAudioDBByName(context.canonical_name);
    
    if (!tadbData && context.aliases.length > 0) {
      for (const alias of context.aliases) {
        console.log(`[TheAudioDB] Trying alias: ${alias}`);
        tadbData = await fetchTheAudioDBByName(alias);
        if (tadbData) break;
        await new Promise(r => setTimeout(r, THEAUDIODB_DELAY));
      }
    }
  }
  
  if (!tadbData) {
    console.log(`[TheAudioDB] Not found`);
    return { success: false, reason: 'not_found' };
  }
  
  updateData.theaudiodb_id = tadbData.idArtist;
  
  // Biography (prefer if not already set)
  if (tadbData.strBiographyEN && !updateData.biography_en) {
    updateData.biography_en = tadbData.strBiographyEN;
    updateData.biography_source = 'theaudiodb';
  }
  if (tadbData.strBiographyFR) updateData.biography_fr = tadbData.strBiographyFR;
  if (tadbData.strBiographyDE) updateData.biography_de = tadbData.strBiographyDE;
  if (tadbData.strBiographyES) updateData.biography_es = tadbData.strBiographyES;
  if (tadbData.strBiographyIT) updateData.biography_it = tadbData.strBiographyIT;
  if (tadbData.strBiographyPT) updateData.biography_pt = tadbData.strBiographyPT;
  
  if (tadbData.strStyle) updateData.style = tadbData.strStyle;
  if (tadbData.strMood) updateData.mood = tadbData.strMood;
  if (tadbData.strGenre) {
    updateData.genres = tadbData.strGenre.split('/').map((g: string) => g.trim());
  }
  if (tadbData.intFormedYear && !updateData.formed_year) {
    updateData.formed_year = parseInt(tadbData.intFormedYear) || null;
  }
  if (tadbData.intBornYear && !updateData.born_year) {
    updateData.born_year = parseInt(tadbData.intBornYear) || null;
  }
  if (tadbData.strCountry && !updateData.country_name) {
    updateData.country_name = tadbData.strCountry;
  }
  
  // Images
  if (tadbData.strArtistThumb) updateData.image_thumb = tadbData.strArtistThumb;
  if (tadbData.strArtistBanner) updateData.image_banner = tadbData.strArtistBanner;
  if (tadbData.strArtistLogo) updateData.image_logo = tadbData.strArtistLogo;
  if (tadbData.strArtistFanart) updateData.image_fanart1 = tadbData.strArtistFanart;
  if (tadbData.strArtistFanart2) updateData.image_fanart2 = tadbData.strArtistFanart2;
  if (tadbData.strArtistFanart3) updateData.image_fanart3 = tadbData.strArtistFanart3;
  if (tadbData.strArtistClearart) updateData.image_clearart = tadbData.strArtistClearart;
  
  updateData.url_theaudiodb = `https://www.theaudiodb.com/artist/${tadbData.idArtist}`;
  
  newPayload.theaudiodb = {
    id: tadbData.idArtist,
    name: tadbData.strArtist,
    style: tadbData.strStyle,
    mood: tadbData.strMood,
    genre: tadbData.strGenre,
    country: tadbData.strCountry,
    formed_year: tadbData.intFormedYear,
    born_year: tadbData.intBornYear,
    images: {
      thumb: tadbData.strArtistThumb,
      banner: tadbData.strArtistBanner,
      fanart: tadbData.strArtistFanart,
      logo: tadbData.strArtistLogo,
      clearart: tadbData.strArtistClearart,
    },
    fetched_at: new Date().toISOString(),
  };
  
  console.log(`[TheAudioDB] Success: ${tadbData.strArtist}`);
  return { success: true, id: tadbData.idArtist, name: tadbData.strArtist, has_biography: !!tadbData.strBiographyEN };
}

async function processWikidata(context: ArtistContext, updateData: any, newPayload: any): Promise<any> {
  try {
    const wikidataId = updateData.wikidata_id || context.known_ids.wikidata;
    if (!wikidataId) {
      console.log(`[Wikidata] No ID available, skipping`);
      return { success: false, reason: 'no_id' };
    }
    
    console.log(`[Wikidata] Fetching ${wikidataId}...`);
    
    // Use Wikidata API instead of Special:EntityData for better compatibility
    const url = `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${wikidataId}&format=json&props=labels|descriptions|sitelinks`;
    console.log(`[Wikidata] URL: ${url}`);
    
    const res = await fetch(url, { 
      headers: { 
        'User-Agent': USER_AGENT,
        'Accept': 'application/json'
      }
    });
    
    if (!res.ok) {
      const errorText = await res.text();
      console.log(`[Wikidata] HTTP ${res.status}: ${errorText.substring(0, 200)}`);
      return { success: false, reason: `http_${res.status}` };
    }
    
    const responseText = await res.text();
    console.log(`[Wikidata] Response length: ${responseText.length} chars`);
    
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseErr) {
      console.error(`[Wikidata] JSON parse error: ${parseErr}`);
      return { success: false, reason: 'json_parse_error' };
    }
    
    const wdEntity = data.entities?.[wikidataId];
    console.log(`[Wikidata] Entity found: ${!!wdEntity}`);
    
    if (!wdEntity) {
      console.log(`[Wikidata] Entity not found in response`);
      return { success: false, reason: 'not_found' };
    }
    
    await new Promise(r => setTimeout(r, WIKIPEDIA_DELAY));
    
    // Extract Wikipedia sitelinks
    const sitelinks: Record<string, string> = {};
    if (wdEntity.sitelinks) {
      for (const [site, info] of Object.entries(wdEntity.sitelinks as Record<string, any>)) {
        const match = site.match(/^(\w{2,3})wiki$/);
        if (match && info?.title) {
          sitelinks[match[1]] = info.title;
        }
      }
    }
    
    context.wikipedia_sitelinks = sitelinks;
    updateData.url_wikidata = `https://www.wikidata.org/wiki/${wikidataId}`;
    
    // Safely extract labels and descriptions
    const labels: Record<string, string> = {};
    const descriptions: Record<string, string> = {};
    
    if (wdEntity.labels) {
      for (const [lang, labelData] of Object.entries(wdEntity.labels as Record<string, any>).slice(0, 10)) {
        if (labelData?.value) labels[lang] = labelData.value;
      }
    }
    
    if (wdEntity.descriptions) {
      for (const [lang, descData] of Object.entries(wdEntity.descriptions as Record<string, any>).slice(0, 10)) {
        if (descData?.value) descriptions[lang] = descData.value;
      }
    }
    
    newPayload.wikidata = {
      id: wikidataId,
      labels,
      descriptions,
      wikipedia_pages: sitelinks,
      fetched_at: new Date().toISOString(),
    };
    
    console.log(`[Wikidata] Success: ${Object.keys(sitelinks).length} Wikipedia pages found (${Object.keys(sitelinks).join(', ')})`);
    return { success: true, id: wikidataId, wikipedia_pages: Object.keys(sitelinks) };
    
  } catch (err: any) {
    console.error(`[Wikidata] Exception: ${err.message}`);
    return { success: false, reason: 'exception', error: err.message };
  }
}

async function processWikipedia(context: ArtistContext, updateData: any, newPayload: any): Promise<any> {
  try {
    console.log(`[Wikipedia] Starting multi-language search...`);
    console.log(`[Wikipedia] Sitelinks from Wikidata:`, context.wikipedia_sitelinks || 'none');
    
    const wikiResults: any = { languages: {} };
    const sitelinks = context.wikipedia_sitelinks || {};
    let foundCount = 0;
    
    for (const lang of WIKI_LANGUAGES) {
      try {
        await new Promise(r => setTimeout(r, WIKIPEDIA_DELAY));
        
        // Use known title from Wikidata, or search
        let title = sitelinks[lang];
        
        if (!title) {
          // Search Wikipedia for the artist
          const searchUrl = `https://${lang}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(context.canonical_name)}&format=json&srlimit=1&origin=*`;
          console.log(`[Wikipedia ${lang.toUpperCase()}] Searching: ${context.canonical_name}`);
          
          const searchRes = await fetch(searchUrl, {
            headers: { 'User-Agent': USER_AGENT }
          });
          
          if (searchRes.ok) {
            const searchData = await searchRes.json();
            title = searchData.query?.search?.[0]?.title;
            if (title) {
              console.log(`[Wikipedia ${lang.toUpperCase()}] Search found: ${title}`);
            }
          }
        } else {
          console.log(`[Wikipedia ${lang.toUpperCase()}] Using Wikidata sitelink: ${title}`);
        }
        
        if (title) {
          // Fetch Wikipedia summary - replace spaces with underscores for Wikipedia URLs
          const wikiTitle = title.replace(/ /g, '_');
          const summaryUrl = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(wikiTitle)}`;
          console.log(`[Wikipedia ${lang.toUpperCase()}] Fetching: ${summaryUrl}`);
          
          const summaryRes = await fetch(summaryUrl, {
            headers: { 'User-Agent': USER_AGENT }
          });
          
          if (summaryRes.ok) {
            const wikiData = await summaryRes.json();
            
            if (wikiData && wikiData.extract) {
              foundCount++;
              wikiResults.languages[lang] = {
                title: wikiData.title,
                description: wikiData.description,
                extract: wikiData.extract,
                thumbnail: wikiData.thumbnail?.source,
                url: wikiData.content_urls?.desktop?.page,
              };
              
              console.log(`[Wikipedia ${lang.toUpperCase()}] Found: ${wikiData.title} (${wikiData.extract?.length || 0} chars)`);
              
              // Store biographies per language
              const biographyField = `biography_${lang}`;
              if (!updateData[biographyField]) {
                updateData[biographyField] = wikiData.extract;
              }
              
              // Store URLs
              if (lang === 'en') {
                updateData.url_wikipedia_en = wikiData.content_urls?.desktop?.page;
              } else if (lang === 'fr') {
                updateData.url_wikipedia_fr = wikiData.content_urls?.desktop?.page;
              }
              
              // Use image from first found Wikipedia
              if (!updateData.image_wikipedia && wikiData.thumbnail?.source) {
                updateData.image_wikipedia = wikiData.thumbnail.source;
              }
            }
          } else {
            console.log(`[Wikipedia ${lang.toUpperCase()}] Summary fetch failed: ${summaryRes.status}`);
          }
        } else {
          console.log(`[Wikipedia ${lang.toUpperCase()}] No title found`);
        }
      } catch (langErr: any) {
        console.error(`[Wikipedia ${lang.toUpperCase()}] Error: ${langErr.message}`);
      }
    }
  
    newPayload.wikipedia = {
      ...wikiResults,
      languages_found: Object.keys(wikiResults.languages),
      fetched_at: new Date().toISOString(),
    };
    
    const foundLangs = Object.keys(wikiResults.languages);
    console.log(`[Wikipedia] Found ${foundLangs.length} languages: ${foundLangs.join(', ')}`);
    return foundLangs.length > 0 
      ? { success: true, languages_found: foundLangs, count: foundCount }
      : { success: false, reason: 'not_found' };
      
  } catch (err: any) {
    console.error(`[Wikipedia] Exception: ${err.message}`);
    return { success: false, reason: 'exception', error: err.message };
  }
}

async function processDiscogs(context: ArtistContext, updateData: any, newPayload: any): Promise<any> {
  await new Promise(r => setTimeout(r, DISCOGS_DELAY));
  console.log(`[Discogs] Starting...`);
  
  let discogsData = null;
  let discogsId = context.known_ids.discogs || updateData.discogs_id;
  
  // Strategy 1: Use known Discogs ID
  if (discogsId) {
    console.log(`[Discogs] Using known ID: ${discogsId}`);
    discogsData = await fetchDiscogsArtist(discogsId);
  }
  
  // Strategy 2: Search by name
  if (!discogsData) {
    console.log(`[Discogs] Searching by name: ${context.canonical_name}`);
    const searchResults = await searchDiscogsArtist(context.canonical_name);
    await new Promise(r => setTimeout(r, DISCOGS_DELAY));
    
    if (searchResults && searchResults.length > 0) {
      // Find best match
      let bestMatch = null;
      let bestScore = 0;
      
      for (const result of searchResults.slice(0, 5)) {
        const score = validateDiscogsResult(result, context);
        console.log(`[Discogs] Candidate: ${result.title} (score: ${score})`);
        if (score > bestScore && score >= 70) {
          bestScore = score;
          bestMatch = result;
        }
      }
      
      if (bestMatch) {
        discogsId = bestMatch.id.toString();
        console.log(`[Discogs] Best match: ${bestMatch.title} (score: ${bestScore})`);
        discogsData = await fetchDiscogsArtist(discogsId);
      }
    }
  }
  
  if (!discogsData) {
    console.log(`[Discogs] Not found`);
    return { success: false, reason: 'not_found' };
  }
  
  updateData.discogs_id = discogsId;
  if (discogsData.profile) updateData.discogs_profile = discogsData.profile;
  updateData.url_discogs = discogsData.uri || `https://www.discogs.com/artist/${discogsId}`;
  
  // Get releases count
  let releases: any[] = [];
  let labels: string[] = [];
  try {
    await new Promise(r => setTimeout(r, DISCOGS_DELAY));
    releases = await fetchDiscogsReleases(discogsId);
    updateData.discogs_releases_count = releases.length;
    
    // Extract unique labels
    const labelSet = new Set<string>();
    for (const release of releases.slice(0, 50)) {
      if (release.label) labelSet.add(release.label);
    }
    labels = Array.from(labelSet).slice(0, 20);
    if (labels.length > 0) updateData.discogs_labels = labels;
  } catch (e) {
    console.log(`[Discogs] Could not fetch releases`);
  }
  
  newPayload.discogs = {
    id: discogsId,
    name: discogsData.name,
    profile: discogsData.profile?.substring(0, 500),
    real_name: discogsData.realname,
    images: discogsData.images?.slice(0, 5).map((img: any) => ({
      uri: img.uri,
      width: img.width,
      height: img.height,
    })),
    urls: discogsData.urls,
    members: discogsData.members?.slice(0, 10),
    releases_count: releases.length,
    labels: labels,
    fetched_at: new Date().toISOString(),
  };
  
  console.log(`[Discogs] Success: ${discogsData.name} (${releases.length} releases)`);
  return { success: true, id: discogsId, name: discogsData.name, releases_count: releases.length };
}

async function processLastfm(context: ArtistContext, updateData: any, newPayload: any): Promise<any> {
  if (!LASTFM_API_KEY) {
    console.log(`[Last.fm] No API key configured, skipping`);
    return { success: false, reason: 'no_api_key' };
  }
  
  await new Promise(r => setTimeout(r, LASTFM_DELAY));
  console.log(`[Last.fm] Starting...`);
  
  const artistInfo = await fetchLastfmArtistInfo(context.canonical_name);
  
  if (!artistInfo) {
    // Try with aliases
    for (const alias of context.aliases) {
      const aliasInfo = await fetchLastfmArtistInfo(alias);
      if (aliasInfo) {
        console.log(`[Last.fm] Found via alias: ${alias}`);
        return processLastfmData(aliasInfo, context, updateData, newPayload);
      }
      await new Promise(r => setTimeout(r, LASTFM_DELAY));
    }
    console.log(`[Last.fm] Not found`);
    return { success: false, reason: 'not_found' };
  }
  
  return processLastfmData(artistInfo, context, updateData, newPayload);
}

async function processLastfmData(artistInfo: any, context: ArtistContext, updateData: any, newPayload: any): Promise<any> {
  updateData.lastfm_url = artistInfo.url;
  updateData.lastfm_listeners = parseInt(artistInfo.stats?.listeners) || null;
  updateData.lastfm_playcount = parseInt(artistInfo.stats?.playcount) || null;
  updateData.url_lastfm = artistInfo.url;
  
  // Get top tags
  await new Promise(r => setTimeout(r, LASTFM_DELAY));
  const tags = await fetchLastfmTopTags(context.canonical_name);
  if (tags.length > 0) updateData.lastfm_tags = tags;
  
  // Get similar artists
  await new Promise(r => setTimeout(r, LASTFM_DELAY));
  const similar = await fetchLastfmSimilarArtists(context.canonical_name);
  if (similar.length > 0) {
    updateData.similar_artists = similar.slice(0, 10).map((s: any) => ({
      name: s.name,
      match: parseFloat(s.match),
      url: s.url,
    }));
  }
  
  // Use bio if not already set
  if (artistInfo.bio?.content && !updateData.biography_en) {
    // Clean Last.fm bio (remove "Read more on Last.fm" link)
    const bioClean = artistInfo.bio.content
      .replace(/<a href=".*">Read more on Last\.fm<\/a>\.?/gi, '')
      .trim();
    if (bioClean.length > 100) {
      updateData.biography_en = bioClean;
      updateData.biography_source = 'lastfm';
    }
  }
  
  newPayload.lastfm = {
    name: artistInfo.name,
    mbid: artistInfo.mbid,
    url: artistInfo.url,
    listeners: parseInt(artistInfo.stats?.listeners) || 0,
    playcount: parseInt(artistInfo.stats?.playcount) || 0,
    bio_summary: artistInfo.bio?.summary?.substring(0, 500),
    tags: tags,
    similar_artists: similar.slice(0, 5).map((s: any) => s.name),
    fetched_at: new Date().toISOString(),
  };
  
  console.log(`[Last.fm] Success: ${artistInfo.name} (${artistInfo.stats?.listeners} listeners)`);
  return { 
    success: true, 
    name: artistInfo.name, 
    listeners: parseInt(artistInfo.stats?.listeners) || 0,
    playcount: parseInt(artistInfo.stats?.playcount) || 0,
    tags: tags.slice(0, 5),
  };
}

async function processFanart(context: ArtistContext, updateData: any, newPayload: any): Promise<any> {
  if (!FANART_API_KEY) {
    console.log(`[Fanart.tv] No API key configured, skipping`);
    return { success: false, reason: 'no_api_key' };
  }
  
  const mbid = updateData.musicbrainz_id || context.known_ids.musicbrainz;
  if (!mbid) {
    console.log(`[Fanart.tv] No MusicBrainz ID available, skipping`);
    return { success: false, reason: 'no_mbid' };
  }
  
  await new Promise(r => setTimeout(r, FANART_DELAY));
  console.log(`[Fanart.tv] Fetching images for MBID: ${mbid}...`);
  
  const fanartData = await fetchFanartImages(mbid);
  
  if (!fanartData) {
    console.log(`[Fanart.tv] Not found`);
    return { success: false, reason: 'not_found' };
  }
  
  // Extract images by type
  const backgrounds = (fanartData.artistbackground || []).slice(0, 5).map((img: any) => img.url);
  const thumbs = (fanartData.artistthumb || []).slice(0, 5).map((img: any) => img.url);
  const logos = (fanartData.musiclogo || []).slice(0, 3).map((img: any) => img.url);
  const hdlogos = (fanartData.hdmusiclogo || []).slice(0, 3).map((img: any) => img.url);
  const banners = (fanartData.musicbanner || []).slice(0, 3).map((img: any) => img.url);
  
  if (backgrounds.length > 0) updateData.fanart_backgrounds = backgrounds;
  if (thumbs.length > 0) updateData.fanart_thumbs = thumbs;
  if (logos.length > 0) updateData.fanart_logos = logos;
  if (hdlogos.length > 0) updateData.fanart_hdlogos = hdlogos;
  if (banners.length > 0) updateData.fanart_banners = banners;
  
  newPayload.fanart = {
    mbid,
    backgrounds: backgrounds.length,
    thumbs: thumbs.length,
    logos: logos.length,
    hdlogos: hdlogos.length,
    banners: banners.length,
    all_images: {
      backgrounds,
      thumbs,
      logos,
      hdlogos,
      banners,
    },
    fetched_at: new Date().toISOString(),
  };
  
  const totalImages = backgrounds.length + thumbs.length + logos.length + hdlogos.length + banners.length;
  console.log(`[Fanart.tv] Success: ${totalImages} images found`);
  return { success: true, total_images: totalImages };
}

// =============================================================================
// Main Enrichment Logic
// =============================================================================
const ALL_SOURCES: SourceType[] = ['musicbrainz', 'theaudiodb', 'wikidata', 'wikipedia', 'discogs', 'lastfm', 'fanart'];

async function enrichArtist(request: EnrichRequest): Promise<any> {
  const { artist_id, sources = ALL_SOURCES, force = false } = request;
  
  // Build context with known IDs
  const context = await buildArtistContext(artist_id);
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`[ENRICH v3] Starting: ${context.canonical_name}`);
  console.log(`[ENRICH v3] Spotify ID: ${context.spotify_id}`);
  console.log(`[ENRICH v3] Known IDs:`, context.known_ids);
  console.log(`[ENRICH v3] Sources: ${sources.join(', ')}`);
  console.log(`${'='.repeat(60)}\n`);
  
  const updateData: any = {
    artist_id,
    last_update: new Date().toISOString(),
    enriched_at: new Date().toISOString(),
  };
  
  const newPayload: any = {};
  const results: Record<string, any> = {};
  
  // Process each source in order
  if (sources.includes('musicbrainz')) {
    try {
      results.musicbrainz = await processMusicBrainz(context, updateData, newPayload);
    } catch (err: any) {
      console.error(`[MusicBrainz] Error:`, err.message);
      results.musicbrainz = { success: false, error: err.message };
    }
  }
  
  if (sources.includes('theaudiodb')) {
    try {
      results.theaudiodb = await processTheAudioDB(context, updateData, newPayload);
    } catch (err: any) {
      console.error(`[TheAudioDB] Error:`, err.message);
      results.theaudiodb = { success: false, error: err.message };
    }
  }
  
  if (sources.includes('wikidata')) {
    try {
      results.wikidata = await processWikidata(context, updateData, newPayload);
    } catch (err: any) {
      console.error(`[Wikidata] Error:`, err.message);
      results.wikidata = { success: false, error: err.message };
    }
  }
  
  if (sources.includes('wikipedia')) {
    try {
      results.wikipedia = await processWikipedia(context, updateData, newPayload);
    } catch (err: any) {
      console.error(`[Wikipedia] Error:`, err.message);
      results.wikipedia = { success: false, error: err.message };
    }
  }
  
  if (sources.includes('discogs')) {
    try {
      results.discogs = await processDiscogs(context, updateData, newPayload);
    } catch (err: any) {
      console.error(`[Discogs] Error:`, err.message);
      results.discogs = { success: false, error: err.message };
    }
  }
  
  if (sources.includes('lastfm')) {
    try {
      results.lastfm = await processLastfm(context, updateData, newPayload);
    } catch (err: any) {
      console.error(`[Last.fm] Error:`, err.message);
      results.lastfm = { success: false, error: err.message };
    }
  }
  
  if (sources.includes('fanart')) {
    try {
      results.fanart = await processFanart(context, updateData, newPayload);
    } catch (err: any) {
      console.error(`[Fanart.tv] Error:`, err.message);
      results.fanart = { success: false, error: err.message };
    }
  }
  
  // Store sources used
  updateData.sources_used = {};
  for (const [source, result] of Object.entries(results)) {
    updateData.sources_used[source] = {
      success: result.success,
      timestamp: new Date().toISOString(),
    };
  }
  
  // Store raw data
  updateData.raw_data = newPayload;
  
  // Save to database
  console.log(`\n[DB] Saving enriched data...`);
  
  const { error: upsertError } = await supabase
    .from('artists_enriched')
    .upsert(updateData, { onConflict: 'artist_id' });
  
  if (upsertError) {
    console.error(`[DB] Error:`, upsertError);
    throw new Error(`Database error: ${upsertError.message}`);
  }
  
  // Count successes
  const successCount = Object.values(results).filter((r: any) => r.success).length;
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`[ENRICH v3] Completed: ${context.canonical_name}`);
  console.log(`[ENRICH v3] Success: ${successCount}/${Object.keys(results).length} sources`);
  console.log(`${'='.repeat(60)}\n`);
  
  return {
    status: 'enriched',
    artist_id,
    artist_name: context.canonical_name,
    spotify_id: context.spotify_id,
    sources_processed: Object.keys(results).length,
    sources_successful: successCount,
    results,
    updated_fields: Object.keys(updateData).filter(k => !['artist_id', 'raw_data', 'sources_used'].includes(k)),
  };
}

// =============================================================================
// HTTP Handler
// =============================================================================
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  
  try {
    const body = await req.json();
    
    // Batch mode
    if (body.batch && Array.isArray(body.artist_ids)) {
      const results = [];
      for (const artist_id of body.artist_ids) {
        try {
          const result = await enrichArtist({ artist_id, sources: body.sources, force: body.force });
          results.push(result);
        } catch (err: any) {
          results.push({ status: 'error', artist_id, error: err.message });
        }
      }
      return new Response(
        JSON.stringify({ ok: true, results }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Single artist mode
    const { artist_id, sources, force } = body;
    
    if (!artist_id) {
      return new Response(
        JSON.stringify({ error: 'artist_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const result = await enrichArtist({ artist_id, sources, force });
    
    return new Response(
      JSON.stringify({ ok: true, ...result }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('Error:', err);
    return new Response(
      JSON.stringify({ ok: false, error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
