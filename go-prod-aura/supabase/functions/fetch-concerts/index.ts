// deno-lint-ignore-file no-explicit-any
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RAPIDAPI_KEY = Deno.env.get("RAPIDAPI_KEY") ?? null;
const CONCERTS_API_HOST = "concerts-artists-events-tracker.p.rapidapi.com";

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
console.log("[fetch-concerts] v13 STANDALONE");

type Concert = {
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

const apiHeaders = () => ({
  "X-RapidAPI-Key": RAPIDAPI_KEY!,
  "X-RapidAPI-Host": CONCERTS_API_HOST,
});

async function searchArtistId(artistName: string): Promise<string | null> {
  if (!RAPIDAPI_KEY) return null;
  
  const url = "https://" + CONCERTS_API_HOST + "/search?keyword=" + encodeURIComponent(artistName) + "&types=artist";
  
  try {
    const res = await fetch(url, { headers: apiHeaders() });
    if (res.ok) {
      const data = await res.json();
      const artists = data?.artists || [];
      if (artists.length > 0) {
        const match = artists.find((a: any) => a.verified) || artists[0];
        console.log("[fetch-concerts] Found artist: " + match?.name + " (ID: " + match?.id + ")");
        return match?.id ? String(match.id) : null;
      }
    }
  } catch (err: any) {
    console.error("[fetch-concerts] Search error: " + err?.message);
  }
  return null;
}

async function fetchArtistBio(artistId: string): Promise<string | null> {
  if (!RAPIDAPI_KEY) return null;
  
  const url = "https://" + CONCERTS_API_HOST + "/artist/bio?artist_id=" + artistId;
  try {
    const res = await fetch(url, { headers: apiHeaders() });
    if (res.ok) {
      const data = await res.json();
      return data?.data?.bio || null;
    }
  } catch (err: any) {
    console.warn("[fetch-concerts] Bio error: " + err?.message);
  }
  return null;
}

async function fetchUpcomingEvents(artistId: string, dbArtistId: string): Promise<Concert[]> {
  if (!RAPIDAPI_KEY) return [];
  
  const url = "https://" + CONCERTS_API_HOST + "/artist/events?artist_id=" + artistId;
  const events: Concert[] = [];
  
  try {
    const res = await fetch(url, { headers: apiHeaders() });
    if (res.ok) {
      const data = await res.json();
      const eventsList = data?.events || [];
      const venuesMap: Record<number, any> = {};
      
      if (data?.venues && Array.isArray(data.venues)) {
        for (const v of data.venues) venuesMap[v.id] = v;
      }
      
      console.log("[fetch-concerts] Found " + eventsList.length + " upcoming events");
      
      for (const e of eventsList) {
        const venue = venuesMap[e.venue_id] || {};
        const eventDate = e.starts_at?.split("T")[0] || new Date().toISOString().split("T")[0];
        const eventTime = e.starts_at?.includes("T") ? e.starts_at.split("T")[1]?.slice(0, 8) : null;
        
        events.push({
          artist_id: dbArtistId,
          source: "bandsintown",
          event_id: e.id ? String(e.id) : ("bit-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6)),
          external_id: e.id ? String(e.id) : null,
          event_name: e.title || venue.name || null,
          event_date: eventDate,
          event_time: eventTime,
          venue_name: venue.name || null,
          city: venue.city || null,
          country: venue.country || null,
          ticket_url: e.has_tickets ? ("https://www.bandsintown.com/e/" + e.id) : null,
          is_future: true,
          raw_payload: { ...e, venue_details: venue },
        });
      }
    }
  } catch (err: any) {
    console.error("[fetch-concerts] Upcoming error: " + err?.message);
  }
  
  return events;
}

async function fetchPastEvents(artistId: string, dbArtistId: string): Promise<Concert[]> {
  if (!RAPIDAPI_KEY) return [];
  
  const today = new Date().toISOString().split("T")[0];
  const url = "https://" + CONCERTS_API_HOST + "/artist/past?artist_id=" + artistId + "&before=" + today;
  const events: Concert[] = [];
  
  try {
    const res = await fetch(url, { headers: apiHeaders() });
    console.log("[fetch-concerts] Past events status: " + res.status);
    
    if (res.ok) {
      const data = await res.json();
      const eventsList = data?.events || [];
      const venuesMap: Record<number, any> = {};
      
      if (data?.venues && Array.isArray(data.venues)) {
        for (const v of data.venues) venuesMap[v.id] = v;
      }
      
      console.log("[fetch-concerts] Found " + eventsList.length + " past events");
      
      for (const e of eventsList.slice(0, 100)) {
        const venue = venuesMap[e.venue_id] || {};
        const eventDate = e.starts_at?.split("T")[0] || new Date().toISOString().split("T")[0];
        const eventTime = e.starts_at?.includes("T") ? e.starts_at.split("T")[1]?.slice(0, 8) : null;
        
        events.push({
          artist_id: dbArtistId,
          source: "bandsintown",
          event_id: e.id ? String(e.id) : ("bit-past-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6)),
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
    console.error("[fetch-concerts] Past error: " + err?.message);
  }
  
  return events;
}

export async function fetchAndStoreEvents(dbArtistId: string, artistName: string): Promise<{upcoming: number, past: number, api_artist_id: string | null, bio: string | null}> {
  console.log("[fetch-concerts] Processing: " + artistName);
  
  let apiArtistId: string | null = null;
  let bio: string | null = null;
  let apiEvents: Concert[] = [];
  
  apiArtistId = await searchArtistId(artistName);
  
  if (apiArtistId) {
    bio = await fetchArtistBio(apiArtistId);
    if (bio) {
      await supabase.from("artists").update({ bio }).eq("id", dbArtistId);
      console.log("[fetch-concerts] Updated artist bio");
    }
    
    await new Promise(r => setTimeout(r, 300));
    
    const upcoming = await fetchUpcomingEvents(apiArtistId, dbArtistId);
    apiEvents.push(...upcoming);
    
    await new Promise(r => setTimeout(r, 300));
    
    const past = await fetchPastEvents(apiArtistId, dbArtistId);
    apiEvents.push(...past);
    
    console.log("[fetch-concerts] Total events: " + apiEvents.length);
  }
  
  if (apiEvents.length > 0) {
    await supabase.from("artist_events").delete().eq("artist_id", dbArtistId).eq("source", "bandsintown");
    
    for (let i = 0; i < apiEvents.length; i += 50) {
      const batch = apiEvents.slice(i, i + 50);
      const { error } = await supabase.from("artist_events").insert(batch);
      if (error) console.error("[fetch-concerts] Insert error: " + error.message);
    }
  }
  
  const upcomingCount = apiEvents.filter(e => e.is_future).length;
  const pastCount = apiEvents.filter(e => !e.is_future).length;
  
  return { upcoming: upcomingCount, past: pastCount, api_artist_id: apiArtistId, bio };
}

Deno.serve(async (req) => {
  console.log("[fetch-concerts] v13 REQUEST");
  
  try {
    const body = await req.json().catch(() => ({}));
    const artist_id = body.artist_id as string;
    
    if (!artist_id) {
      return new Response(JSON.stringify({ ok: false, error: "artist_id required" }), { status: 400 });
    }
    
    const { data: artist } = await supabase.from("artists").select("name").eq("id", artist_id).single();
    
    if (!artist?.name) {
      return new Response(JSON.stringify({ ok: false, error: "Artist not found" }), { status: 404 });
    }
    
    const result = await fetchAndStoreEvents(artist_id, artist.name);
    
    return new Response(JSON.stringify({ 
      ok: true, 
      artist: artist.name,
      api_artist_id: result.api_artist_id,
      upcoming_events: result.upcoming,
      past_events: result.past,
      total: result.upcoming + result.past,
      bio_updated: Boolean(result.bio)
    }), { status: 200 });
    
  } catch (e: any) {
    console.error("[fetch-concerts] FATAL: " + (e?.message || String(e)));
    return new Response(JSON.stringify({ ok: false, error: e?.message }), { status: 500 });
  }
});

