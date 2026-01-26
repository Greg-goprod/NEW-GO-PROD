import type { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";
import { normalizeArtistInfo } from "../../src/lib/songstats/mapArtistInfo";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL!;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_KEY!;
const SONGSTATS_API_KEY = process.env.SONGSTATS_API_KEY!;
const RATE_DELAY_MS = Number(process.env.RATE_DELAY_MS || 600); // soft throttle

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

type QueueRow = {
  id: string;
  artist_id: string;
  company_id: string;
  priority: "low"|"normal"|"high"|"urgent";
  retries: number;
  attempts: number;
};

async function lockBatch(company_id: string, batch_size: number) {
  const { data, error } = await supabase.rpc("lock_enrich_batch", { _company_id: company_id, _limit: batch_size });
  if (error) throw error;
  return (data ?? []) as QueueRow[];
}

async function getSongstatsId(artist_id: string) {
  const { data, error } = await supabase
    .from("artists")
    .select("songstats_id")
    .eq("id", artist_id)
    .single();
  if (error) throw error;
  return data?.songstats_id as string | null;
}

async function fetchArtistInfo(songstats_id: string) {
  const url = `https://public.songstats.com/api/artist/${encodeURIComponent(songstats_id)}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${SONGSTATS_API_KEY}` } });
  if (!res.ok) throw new Error(`Songstats HTTP ${res.status}`);
  const json = await res.json();
  if (!json?.artist_info) throw new Error("artist_info missing");
  return json.artist_info;
}

async function upsertAll(artist_id: string, company_id: string, ai: any) {
  const norm = normalizeArtistInfo(ai);

  // A) artists (core fields)
  await supabase.from("artists").update({
    songstats_id: norm.core.songstats_id,
    avatar_url: norm.core.avatar_url,
    songstats_url: norm.core.songstats_url,
    bio: norm.core.bio,
    // keep existing name/country if null in payload
  }).eq("id", artist_id).eq("company_id", company_id);

  // B) genres
  if (norm.genres.length > 0) {
    const payload = norm.genres.map((g) => ({
      artist_id, company_id, genre: g, updated_at: new Date().toISOString()
    }));
    await supabase.from("artist_genres").upsert(payload, { onConflict: "artist_id,genre" });
  }

  // C) links (multi-platform)
  if ((ai.links ?? []).length > 0) {
    const payload = norm.links.map(l => ({
      artist_id, company_id,
      source: l.source, external_id: l.external_id, url: l.url,
      updated_at: new Date().toISOString()
    }));
    await supabase.from("artist_links_songstats").upsert(payload, { onConflict: "artist_id,source" });
  }

  // D) socials (write into social_media_data if your schema expects per-source columns)
  // fallback: just ensure we have rows per source metric in artist_stats_current? Here we only persist urls if table has generic fields.
  // If social_media_data is columnar per platform, you may need separate upserts. Skipping to avoid unintended schema assumptions.

  // E) related artists
  if ((ai.related_artists ?? []).length > 0) {
    const payload = norm.related.map(r => ({
      artist_id, company_id,
      related_songstats_id: r.related_songstats_id,
      name: r.name, avatar: r.avatar, site_url: r.site_url,
      updated_at: new Date().toISOString()
    }));
    await supabase.from("artist_related").upsert(payload, { onConflict: "artist_id,related_songstats_id" });
  }
}

async function markDone(id: string, ok: boolean, preview?: string) {
  const patch: any = {
    status: ok ? "done" : "error",
    updated_at: new Date().toISOString(),
  };
  if (!ok) {
    patch.error_preview = (preview ?? "").slice(0, 200);
    patch.error_message = preview ?? null;
  }
  await supabase.from("artist_enrich_queue").update(patch).eq("id", id);
}

export const handler: Handler = async (event) => {
  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const company_id = body.company_id as string;
    const batch_size = Number(body.batch_size ?? 10);
    const dry_run    = Boolean(body.dry_run ?? false);

    if (!company_id) return { statusCode: 400, body: JSON.stringify({ ok:false, error:"company_id required" }) };

    // lock
    const batch = await lockBatch(company_id, batch_size);
    if (batch.length === 0) return { statusCode: 200, body: JSON.stringify({ ok:true, locked:0 }) };

    for (const item of batch) {
      try {
        const sid = await getSongstatsId(item.artist_id);
        if (!sid) { await markDone(item.id, false, "missing songstats_id"); continue; }

        if (!dry_run) {
          const ai = await fetchArtistInfo(sid);
          await upsertAll(item.artist_id, item.company_id, ai);
        }

        await markDone(item.id, true);
        await new Promise(r => setTimeout(r, RATE_DELAY_MS));
      } catch (e:any) {
        await markDone(item.id, false, e?.message || String(e));
      }
    }

    return { statusCode: 200, body: JSON.stringify({ ok:true, processed: batch.length }) };
  } catch (e:any) {
    return { statusCode: 500, body: JSON.stringify({ ok:false, error: e?.message || String(e) }) };
  }
};

