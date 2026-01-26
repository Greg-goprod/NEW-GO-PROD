import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { Loader2, Globe2, Music2, CalendarDays, Link as LinkIcon, ListMusic, BarChart3, Radio, Disc3, TrendingUp, Users, Activity, Mic2 } from "lucide-react";

type SongstatsPayload = {
  stats: {
    spotify_followers?: number | null;
    spotify_monthly_listeners?: number | null;
    instagram_followers?: number | null;
    last_stats_updated_at?: string | null;
  };
  geo: { country_code: string; audience_count: number }[];
  tracks: { source: string; rank: number; name: string; track_external_id: string; popularity: number | null; updated_at: string }[];
  events: { date: string | null; city: string | null; country: string | null; venue: string | null; url: string | null; updated_at: string | null }[];
  info: { artist_spotify_id?: string | null; artist_spotify_url?: string | null; artist_name?: string | null; last_updated_any?: string | null };
  stats_all?: Record<string, Record<string, { value: number; unit: string | null; updated_at: string }>>;
  stats_list?: { source: string; metric: string; value: number; unit: string | null; updated_at: string }[];
};

type Playlist = {
  playlist_name: string | null;
  playlist_owner: string | null;
  playlist_owner_type: string | null;
  followers_count: number | null;
  position: number | null;
  playlist_url: string | null;
  source: string;
};

type ChartEntry = {
  chart_name: string;
  position: number;
  peak_position: number | null;
  weeks_on_chart: number | null;
  track_name: string | null;
  country_code: string | null;
  source: string;
};

type RadioPlay = {
  station_name: string;
  station_country: string | null;
  track_name: string | null;
  spin_count: number | null;
  reach_estimate: number | null;
};

type CatalogTrack = {
  track_name: string;
  album_name: string | null;
  release_date: string | null;
  streams_total: number | null;
  popularity: number | null;
  track_url: string | null;
};

type TopTrack = {
  track_name: string | null;
  rank: number | null;
  streams_total: number | null;
  popularity: number | null;
  playlist_count: number | null;
};

type Curator = {
  curator_name: string | null;
  curator_type: string | null;
  playlists_with_artist: number | null;
  total_followers: number | null;
};

type AudienceEntry = {
  country_code: string | null;
  city: string | null;
  listeners_count: number | null;
  percentage: number | null;
};

type ActivityEntry = {
  activity_type: string;
  activity_date: string;
  title: string | null;
  source: string | null;
  url: string | null;
};

type Collaborator = {
  collaborator_name: string | null;
  shared_tracks_count: number | null;
  total_streams: number | null;
};

type ConcertEvent = {
  event_name: string | null;
  event_date: string;
  event_time: string | null;
  venue_name: string | null;
  city: string | null;
  country: string | null;
  ticket_url: string | null;
  is_future: boolean;
  source: string;
};

export function ContainerSongstats({ companyId, artistId }: { companyId: string; artistId: string }) {
  const [data, setData] = useState<SongstatsPayload | null>(null);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [charts, setCharts] = useState<ChartEntry[]>([]);
  const [radios, setRadios] = useState<RadioPlay[]>([]);
  const [catalog, setCatalog] = useState<CatalogTrack[]>([]);
  const [topTracks, setTopTracks] = useState<TopTrack[]>([]);
  const [curators, setCurators] = useState<Curator[]>([]);
  const [audience, setAudience] = useState<AudienceEntry[]>([]);
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [concerts, setConcerts] = useState<ConcertEvent[]>([]);
  const [loadingConcerts, setLoadingConcerts] = useState(false);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr(null);
      
      // Fetch main songstats data
      const { data: payload, error } = await supabase.rpc("rpc_artist_songstats_full", {
        _company_id: companyId, _artist_id: artistId, _top_geo_limit: 10, _top_tracks_limit: 10, _events_limit: 15,
      });
      if (error) setErr(error.message); else setData(payload as SongstatsPayload);
      
      // Fetch playlists
      const { data: playlistsData } = await supabase
        .from("artist_playlists")
        .select("playlist_name, playlist_owner, playlist_owner_type, followers_count, position, playlist_url, source")
        .eq("artist_id", artistId)
        .order("followers_count", { ascending: false, nullsFirst: false })
        .limit(10);
      setPlaylists(playlistsData || []);
      
      // Fetch charts
      const { data: chartsData } = await supabase
        .from("artist_charts")
        .select("chart_name, position, peak_position, weeks_on_chart, track_name, country_code, source")
        .eq("artist_id", artistId)
        .order("position", { ascending: true })
        .limit(10);
      setCharts(chartsData || []);
      
      // Fetch radios
      const { data: radiosData } = await supabase
        .from("artist_radios")
        .select("station_name, station_country, track_name, spin_count, reach_estimate")
        .eq("artist_id", artistId)
        .order("spin_count", { ascending: false, nullsFirst: false })
        .limit(10);
      setRadios(radiosData || []);
      
      // Fetch catalog
      const { data: catalogData } = await supabase
        .from("artist_catalog")
        .select("track_name, album_name, release_date, streams_total, popularity, track_url")
        .eq("artist_id", artistId)
        .order("streams_total", { ascending: false, nullsFirst: false })
        .limit(15);
      setCatalog(catalogData || []);
      
      // Fetch top tracks
      const { data: topTracksData } = await supabase
        .from("artist_top_tracks_songstats")
        .select("track_name, rank, streams_total, popularity, playlist_count")
        .eq("artist_id", artistId)
        .order("rank", { ascending: true })
        .limit(10);
      setTopTracks(topTracksData || []);
      
      // Fetch curators
      const { data: curatorsData } = await supabase
        .from("artist_curators")
        .select("curator_name, curator_type, playlists_with_artist, total_followers")
        .eq("artist_id", artistId)
        .order("total_followers", { ascending: false, nullsFirst: false })
        .limit(10);
      setCurators(curatorsData || []);
      
      // Fetch audience
      const { data: audienceData } = await supabase
        .from("artist_audience")
        .select("country_code, city, listeners_count, percentage")
        .eq("artist_id", artistId)
        .order("listeners_count", { ascending: false, nullsFirst: false })
        .limit(15);
      setAudience(audienceData || []);
      
      // Fetch activities
      const { data: activitiesData } = await supabase
        .from("artist_activities")
        .select("activity_type, activity_date, title, source, url")
        .eq("artist_id", artistId)
        .order("activity_date", { ascending: false })
        .limit(10);
      setActivities(activitiesData || []);
      
      // Fetch collaborators (songshare)
      const { data: collabsData } = await supabase
        .from("artist_songshare")
        .select("collaborator_name, shared_tracks_count, total_streams")
        .eq("artist_id", artistId)
        .order("shared_tracks_count", { ascending: false, nullsFirst: false })
        .limit(10);
      setCollaborators(collabsData || []);
      
      // Fetch concerts/events
      const { data: concertsData } = await supabase
        .from("artist_events")
        .select("event_name, event_date, event_time, venue_name, city, country, ticket_url, is_future, source")
        .eq("artist_id", artistId)
        .order("event_date", { ascending: true });
      setConcerts(concertsData || []);
      
      setLoading(false);
    })();
  }, [companyId, artistId]);

  if (loading) {
    return <div className="rounded-2xl bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 p-4 text-slate-600 dark:text-slate-300 flex items-center gap-2"><Loader2 className="animate-spin" /> <span>Chargement Songstats…</span></div>;
  }
  if (err) return <div className="rounded-2xl bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 p-4 text-red-600 dark:text-red-300">Erreur Songstats : {err}</div>;
  if (!data) return null;

  const s = data.stats || {};
  const geo = Array.isArray(data.geo) ? data.geo : [];
  const tracks = Array.isArray(data.tracks) ? data.tracks : [];
  const events = Array.isArray(data.events) ? data.events : [];
  const info = data.info || {};

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/40">
      <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div className="text-slate-800 dark:text-slate-200 font-medium">Songstats</div>
        {info.artist_spotify_url && (
          <a href={info.artist_spotify_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 transition-colors">
            <LinkIcon size={14} /> Spotify
          </a>
        )}
      </div>

      <div className="p-4 grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* KPIs */}
        <div className="xl:col-span-1 space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 p-3">
              <div className="text-xs text-slate-500 dark:text-slate-400">Spotify followers</div>
              <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">{s.spotify_followers?.toLocaleString?.() ?? "—"}</div>
            </div>
            <div className="rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 p-3">
              <div className="text-xs text-slate-500 dark:text-slate-400">Monthly listeners</div>
              <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">{s.spotify_monthly_listeners?.toLocaleString?.() ?? "—"}</div>
            </div>
            <div className="rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 p-3">
              <div className="text-xs text-slate-500 dark:text-slate-400">Instagram</div>
              <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">{s.instagram_followers?.toLocaleString?.() ?? "—"}</div>
            </div>
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">Dernière MAJ stats : {s.last_stats_updated_at ? new Date(s.last_stats_updated_at).toLocaleString() : "—"}</div>
        </div>

        {/* Audience GEO */}
        <div className="xl:col-span-1 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 p-3">
          <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 mb-2"><Globe2 size={16} /><span className="text-sm font-medium">Audience (Top pays)</span></div>
          {geo.length === 0 ? <div className="text-sm text-slate-500 dark:text-slate-400">Aucune donnée d'audience.</div> : (
            <div className="flex flex-wrap gap-2">
              {geo.map((g, i) => (
                <span key={i} className="text-xs px-2 py-1 rounded-full bg-slate-200 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200">
                  {g.country_code} · {g.audience_count?.toLocaleString?.() ?? g.audience_count}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Top Tracks */}
        <div className="xl:col-span-1 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 p-3">
          <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 mb-2"><Music2 size={16} /><span className="text-sm font-medium">Top tracks</span></div>
          {tracks.length === 0 ? <div className="text-sm text-slate-500 dark:text-slate-400">Aucune track disponible.</div> : (
            <ul className="space-y-1">
              {tracks.map((t, i) => (
                <li key={i} className="text-sm text-slate-800 dark:text-slate-200">#{t.rank} — {t.name}{t.popularity != null ? <span className="text-slate-500 dark:text-slate-400"> · pop {t.popularity}</span> : null}</li>
              ))}
            </ul>
          )}
        </div>

        {/* Toutes les métriques (Songstats) */}
        <div className="xl:col-span-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 p-3">
          <div className="text-slate-700 dark:text-slate-300 mb-2 text-sm font-medium">Toutes les métriques (Songstats)</div>
          {!data.stats_all || Object.keys(data.stats_all).length === 0 ? (
            <div className="text-sm text-slate-500 dark:text-slate-400">Aucune métrique enregistrée.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {Object.entries(data.stats_all).map(([source, metrics]) => (
                <div key={source} className="rounded-lg border border-slate-200 dark:border-slate-800 p-2 bg-slate-100 dark:bg-slate-950/40">
                  <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">{source}</div>
                  <ul className="space-y-1">
                    {Object.entries(metrics).map(([metric, obj]) => (
                      <li key={metric} className="text-sm text-slate-800 dark:text-slate-200 flex items-center justify-between gap-2">
                        <span className="truncate">{metric}</span>
                        <span className="text-slate-900 dark:text-slate-100">{(obj as any).value?.toLocaleString?.() ?? (obj as any).value}{(obj as any).unit ? <span className="text-slate-500 dark:text-slate-400 text-xs"> {(obj as any).unit}</span> : null}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Events (full width) - from rpc */}
        {events.length > 0 && (
        <div className="xl:col-span-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 p-3">
            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 mb-2"><CalendarDays size={16} /><span className="text-sm font-medium">Evenements (Songstats)</span></div>
            <ul className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
              {events.map((e, i) => (
                <li key={i} className="text-sm text-slate-800 dark:text-slate-200 rounded-lg border border-slate-200 dark:border-slate-800 p-2 bg-white dark:bg-slate-900/40">
                  <div className="text-slate-900 dark:text-slate-100">{e.date ?? "TBA"}</div>
                  <div className="text-slate-700 dark:text-slate-300">{e.city ?? "—"}, {e.country ?? "—"} {e.venue ? `· ${e.venue}` : ""}</div>
                  {e.url && <a href={e.url} target="_blank" rel="noreferrer" className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors">Ouvrir</a>}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Concerts / Tour Dates (full width) */}
        {concerts.length > 0 && (
          <div className="xl:col-span-3 rounded-xl border-2 border-violet-500/30 bg-gradient-to-br from-violet-500/5 to-purple-600/5 p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
                <CalendarDays size={20} className="text-violet-500" />
                <span className="font-semibold">Concerts & Tournee ({concerts.length})</span>
              </div>
            </div>
            
            {/* Future concerts */}
            {concerts.filter(c => c.is_future).length > 0 && (
              <div className="mb-6">
                <h4 className="text-sm font-medium text-green-600 dark:text-green-400 mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                  Concerts a venir ({concerts.filter(c => c.is_future).length})
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {concerts.filter(c => c.is_future).sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime()).map((c, i) => (
                    <div key={i} className="rounded-xl border border-green-500/30 bg-white dark:bg-slate-900/60 p-3 hover:border-green-500/50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="text-lg font-bold text-violet-600 dark:text-violet-400">
                            {new Date(c.event_date).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                          </div>
                          {c.event_time && <div className="text-xs text-slate-500 dark:text-slate-400">{c.event_time}</div>}
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[10px] bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300">
                          A venir
                        </span>
                      </div>
                      <div className="mt-2">
                        {c.event_name && <div className="text-slate-800 dark:text-slate-200 font-medium">{c.event_name}</div>}
                        <div className="text-sm text-slate-600 dark:text-slate-400">{c.venue_name || "Lieu TBA"}</div>
                        <div className="text-sm text-slate-600 dark:text-slate-400 flex items-center gap-1">
                          <Globe2 size={12} />
                          {c.city}{c.country ? `, ${c.country}` : ""}
                        </div>
                      </div>
                      {c.ticket_url && (
                        <a href={c.ticket_url} target="_blank" rel="noreferrer" 
                           className="mt-2 inline-flex items-center gap-1 text-xs text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 transition-colors">
                          <LinkIcon size={12} /> Billetterie
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Past concerts */}
            {concerts.filter(c => !c.is_future).length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-3">
                  Concerts passes ({concerts.filter(c => !c.is_future).length})
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2">
                  {concerts.filter(c => !c.is_future).sort((a, b) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime()).map((c, i) => (
                    <div key={i} className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/40 p-2 opacity-70">
                      <div className="text-sm font-medium text-slate-600 dark:text-slate-400">
                        {new Date(c.event_date).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                      </div>
                      {c.event_name && <div className="text-sm text-slate-700 dark:text-slate-300 truncate">{c.event_name}</div>}
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {c.venue_name ? `${c.venue_name} - ` : ""}{c.city}{c.country ? `, ${c.country}` : ""}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Playlists - seulement si donnees valides */}
        {playlists.filter(p => p.playlist_name && p.playlist_name !== "Unknown" && (p.followers_count ?? 0) > 0).length > 0 && (
          <div className="xl:col-span-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 p-3">
            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 mb-2"><ListMusic size={16} /><span className="text-sm font-medium">Playlists</span></div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
              {playlists.filter(p => p.playlist_name && p.playlist_name !== "Unknown" && (p.followers_count ?? 0) > 0).map((p, i) => (
                <div key={i} className="text-sm rounded-lg border border-slate-200 dark:border-slate-800 p-2 bg-white dark:bg-slate-900/40">
                  <div className="text-slate-900 dark:text-slate-100 font-medium truncate">{p.playlist_name}</div>
                  <div className="text-slate-600 dark:text-slate-400 text-xs">
                    {p.playlist_owner && <span>{p.playlist_owner}</span>}
                    {p.playlist_owner_type && <span className="ml-1 px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-[10px]">{p.playlist_owner_type}</span>}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {p.followers_count != null && <span>{p.followers_count.toLocaleString()} followers</span>}
                    {p.position != null && <span>#{p.position}</span>}
                  </div>
                  {p.playlist_url && <a href={p.playlist_url} target="_blank" rel="noreferrer" className="text-xs text-blue-500 hover:text-blue-400">Ouvrir</a>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Charts - seulement si donnees valides */}
        {charts.filter(c => c.chart_name && c.position > 0).length > 0 && (
          <div className="xl:col-span-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 p-3">
            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 mb-2"><BarChart3 size={16} /><span className="text-sm font-medium">Charts</span></div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500 dark:text-slate-400 text-xs">
                    <th className="pb-2">Chart</th>
                    <th className="pb-2">Position</th>
                    <th className="pb-2">Peak</th>
                    <th className="pb-2">Semaines</th>
                    <th className="pb-2">Track</th>
                    <th className="pb-2">Pays</th>
                  </tr>
                </thead>
                <tbody>
                  {charts.filter(c => c.chart_name && c.position > 0).map((c, i) => (
                    <tr key={i} className="border-t border-slate-200 dark:border-slate-800">
                      <td className="py-2 text-slate-800 dark:text-slate-200">{c.chart_name}</td>
                      <td className="py-2 font-semibold text-slate-900 dark:text-slate-100">#{c.position}</td>
                      <td className="py-2 text-slate-600 dark:text-slate-400">{c.peak_position != null ? `#${c.peak_position}` : "—"}</td>
                      <td className="py-2 text-slate-600 dark:text-slate-400">{c.weeks_on_chart ?? "—"}</td>
                      <td className="py-2 text-slate-700 dark:text-slate-300 truncate max-w-[150px]">{c.track_name || "—"}</td>
                      <td className="py-2 text-slate-600 dark:text-slate-400">{c.country_code || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Radio Plays - seulement si donnees valides */}
        {radios.filter(r => r.station_name && (r.spin_count ?? 0) > 0).length > 0 && (
          <div className="xl:col-span-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 p-3">
            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 mb-2"><Radio size={16} /><span className="text-sm font-medium">Diffusions Radio</span></div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
              {radios.filter(r => r.station_name && (r.spin_count ?? 0) > 0).map((r, i) => (
                <div key={i} className="text-sm rounded-lg border border-slate-200 dark:border-slate-800 p-2 bg-white dark:bg-slate-900/40">
                  <div className="text-slate-900 dark:text-slate-100 font-medium">{r.station_name}</div>
                  {r.station_country && <div className="text-slate-600 dark:text-slate-400 text-xs">{r.station_country}</div>}
                  <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {r.spin_count != null && <span>{r.spin_count} diffusions</span>}
                    {r.reach_estimate != null && <span>{r.reach_estimate.toLocaleString()} reach</span>}
                  </div>
                  {r.track_name && <div className="text-xs text-slate-600 dark:text-slate-300 mt-1 truncate">{r.track_name}</div>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Catalogue - seulement si donnees valides */}
        {catalog.filter(t => t.track_name).length > 0 && (
          <div className="xl:col-span-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 p-3">
            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 mb-2"><Disc3 size={16} /><span className="text-sm font-medium">Catalogue</span></div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500 dark:text-slate-400 text-xs">
                    <th className="pb-2">Titre</th>
                    <th className="pb-2">Album</th>
                    <th className="pb-2">Sortie</th>
                    <th className="pb-2">Streams</th>
                    <th className="pb-2">Pop.</th>
                    <th className="pb-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {catalog.filter(t => t.track_name).map((t, i) => (
                    <tr key={i} className="border-t border-slate-200 dark:border-slate-800">
                      <td className="py-2 text-slate-800 dark:text-slate-200 font-medium truncate max-w-[180px]">{t.track_name}</td>
                      <td className="py-2 text-slate-600 dark:text-slate-400 truncate max-w-[150px]">{t.album_name || "—"}</td>
                      <td className="py-2 text-slate-600 dark:text-slate-400">{t.release_date ? new Date(t.release_date).toLocaleDateString() : "—"}</td>
                      <td className="py-2 text-slate-700 dark:text-slate-300">{t.streams_total?.toLocaleString() ?? "—"}</td>
                      <td className="py-2 text-slate-600 dark:text-slate-400">{t.popularity ?? "—"}</td>
                      <td className="py-2">{t.track_url && <a href={t.track_url} target="_blank" rel="noreferrer" className="text-xs text-blue-500 hover:text-blue-400">Ouvrir</a>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Top Tracks (from Songstats) */}
        {topTracks.length > 0 && (
          <div className="xl:col-span-1 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 p-3">
            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 mb-2"><TrendingUp size={16} /><span className="text-sm font-medium">Top Tracks (Songstats)</span></div>
            <ul className="space-y-1">
              {topTracks.map((t, i) => (
                <li key={i} className="text-sm text-slate-800 dark:text-slate-200 flex items-center justify-between">
                  <span className="truncate">#{t.rank ?? i+1} {t.track_name || "Track"}</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">{t.streams_total?.toLocaleString() ?? ""}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Curators */}
        {curators.length > 0 && (
          <div className="xl:col-span-1 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 p-3">
            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 mb-2"><Users size={16} /><span className="text-sm font-medium">Top Curators</span></div>
            <ul className="space-y-1">
              {curators.map((c, i) => (
                <li key={i} className="text-sm text-slate-800 dark:text-slate-200">
                  <div className="font-medium truncate">{c.curator_name || "Curator"}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 flex gap-2">
                    {c.curator_type && <span className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700">{c.curator_type}</span>}
                    {c.playlists_with_artist && <span>{c.playlists_with_artist} playlists</span>}
                    {c.total_followers && <span>{c.total_followers.toLocaleString()} followers</span>}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Audience (geo details) */}
        {audience.length > 0 && (
          <div className="xl:col-span-1 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 p-3">
            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 mb-2"><Globe2 size={16} /><span className="text-sm font-medium">Audience detaillee</span></div>
            <ul className="space-y-1">
              {audience.map((a, i) => (
                <li key={i} className="text-sm text-slate-800 dark:text-slate-200 flex items-center justify-between">
                  <span>{a.country_code}{a.city ? ` - ${a.city}` : ""}</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {a.listeners_count?.toLocaleString() ?? "—"}
                    {a.percentage ? ` (${a.percentage.toFixed(1)}%)` : ""}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Activities (timeline) */}
        {activities.length > 0 && (
          <div className="xl:col-span-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 p-3">
            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 mb-2"><Activity size={16} /><span className="text-sm font-medium">Activites recentes ({activities.length})</span></div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
              {activities.map((a, i) => {
                const typeColors: Record<string, string> = {
                  radio: "bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300",
                  video: "bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300",
                  playlist: "bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300",
                  editorial_playlist: "bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300",
                  album_chart: "bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300",
                  track_chart: "bg-violet-100 dark:bg-violet-900/50 text-violet-700 dark:text-violet-300",
                  milestone: "bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-300",
                  comment: "bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300",
                  repost: "bg-pink-100 dark:bg-pink-900/50 text-pink-700 dark:text-pink-300",
                };
                const typeColor = typeColors[a.activity_type] || "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300";
                
                return (
                  <div key={i} className="text-sm rounded-lg border border-slate-200 dark:border-slate-800 p-2 bg-white dark:bg-slate-900/40">
                    <div className="flex items-center justify-between">
                      <span className={`px-1.5 py-0.5 rounded text-xs ${typeColor}`}>{a.activity_type.replace("_", " ")}</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">{new Date(a.activity_date).toLocaleDateString()}</span>
                    </div>
                    {a.title && <div className="text-slate-800 dark:text-slate-200 mt-1 truncate">{a.title}</div>}
                    {a.source && <div className="text-xs text-slate-500 dark:text-slate-400">{a.source}</div>}
                    {a.url && <a href={a.url} target="_blank" rel="noreferrer" className="text-xs text-blue-500 hover:text-blue-400">Voir</a>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Collaborators (songshare) */}
        {collaborators.length > 0 && (
          <div className="xl:col-span-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 p-3">
            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 mb-2"><Mic2 size={16} /><span className="text-sm font-medium">Collaborations</span></div>
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-2">
              {collaborators.map((c, i) => (
                <div key={i} className="text-sm rounded-lg border border-slate-200 dark:border-slate-800 p-2 bg-white dark:bg-slate-900/40 text-center">
                  <div className="text-slate-800 dark:text-slate-200 font-medium truncate">{c.collaborator_name || "Artiste"}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {c.shared_tracks_count && <span>{c.shared_tracks_count} tracks</span>}
                    {c.total_streams && <span> · {(c.total_streams / 1e6).toFixed(1)}M streams</span>}
                  </div>
                </div>
              ))}
            </div>
        </div>
        )}

        <div className="xl:col-span-3 text-xs text-slate-400 dark:text-slate-500">Derniere MAJ globale : {info.last_updated_any ? new Date(info.last_updated_any).toLocaleString() : "—"}</div>
      </div>
    </div>
  );
}

