import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { 
  Users, TrendingUp, Globe2, Headphones, Play, Eye, Heart, 
  Music2, BarChart3, Radio, ListMusic, Disc3, Loader2, Activity
} from "lucide-react";

type StatEntry = {
  source: string;
  metric: string;
  value: number;
};

type AudienceEntry = {
  country_code: string;
  city: string | null;
  listeners_count: number;
  percentage: number | null;
};

type RelatedArtist = {
  name: string;
  avatar: string | null;
  site_url: string | null;
};

type GenreEntry = {
  genre: string;
};

type ActivitySummary = {
  activity_type: string;
  count: number;
};

// Icones par source
const SOURCE_ICONS: Record<string, React.ReactNode> = {
  spotify: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02z"/></svg>,
  apple_music: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98z"/></svg>,
  youtube: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z"/></svg>,
  instagram: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07z"/></svg>,
  tiktok: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75z"/></svg>,
  facebook: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669z"/></svg>,
  soundcloud: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M1.175 12.225c-.051 0-.094.046-.101.1l-.233 2.154.233 2.105c.007.058.05.098.101.098.05 0 .09-.04.099-.098l.255-2.105-.27-2.154c-.01-.06-.052-.1-.099-.1m-.899.828c-.06 0-.091.037-.104.094L0 14.479l.165 1.308c.014.057.045.094.09.094s.089-.037.099-.094l.21-1.308-.21-1.334c-.01-.057-.054-.094-.09-.094"/></svg>,
  deezer: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M18.81 4.16v3.03H24V4.16h-5.19zM6.27 8.38v3.027h5.189V8.38h-5.19zm12.54 0v3.027H24V8.38h-5.19zM6.27 12.594v3.027h5.189v-3.027h-5.19zm6.27 0v3.027h5.19v-3.027h-5.19zm6.27 0v3.027H24v-3.027h-5.19zM0 16.81v3.029h5.19v-3.03H0zm6.27 0v3.029h5.189v-3.03h-5.19zm6.27 0v3.029h5.19v-3.03h-5.19zm6.27 0v3.029H24v-3.03h-5.19z"/></svg>,
  shazam: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm4.826 16.025c-1.456 1.456-3.393 2.258-5.453 2.258-2.059 0-4.001-.804-5.456-2.264-1.456-1.456-2.258-3.392-2.258-5.452 0-1.35.354-2.666 1.028-3.837.108-.188.351-.252.535-.144.188.109.253.347.145.535-.598 1.038-.912 2.207-.912 3.399 0 1.824.71 3.538 2.001 4.83 1.29 1.293 3.004 2.004 4.825 2.004 1.824 0 3.538-.71 4.83-1.998.187-.188.492-.188.68 0 .188.185.188.485-.005.669z"/></svg>,
  twitter: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>,
  amazon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/></svg>,
  tidal: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12.012 3.992L8.008 7.996 4.004 3.992 0 7.996 4.004 12l4.004-4.004L12.012 12l-4.004 4.004 4.004 4.004 4.004-4.004L12.012 12l4.004-4.004-4.004-4.004zM16.042 7.996l3.979-3.979L24 7.996l-3.979 3.979z"/></svg>,
  bandsintown: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M18 4H6C4.9 4 4 4.9 4 6v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zM8 17H6v-6h2v6zm4 0h-2v-9h2v9zm4 0h-2v-4h2v4z"/></svg>,
  songkick: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M6.75 2.002l6.715 9.578L20.25 2H24l-9.344 12.69L24 22h-3.75l-6.785-7.412L6.75 22H3l9.344-7.31L3 2h3.75z"/></svg>,
  beatport: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M21.429 13.396c.009-.13.013-.261.013-.393 0-2.903-2.404-5.263-5.363-5.263-.878 0-1.705.206-2.437.571.094-.345.146-.708.146-1.083C13.788 4.47 11.658 2 9.101 2 6.543 2 4.414 4.47 4.414 7.228c0 1.11.323 2.14.873 2.978-2.195.652-3.798 2.712-3.798 5.144 0 2.956 2.335 5.35 5.217 5.35 1.648 0 3.12-.787 4.064-2.015.944 1.228 2.415 2.015 4.064 2.015 2.882 0 5.217-2.394 5.217-5.35 0-.645-.113-1.263-.318-1.836.558-.08 1.073-.338 1.453-.719l.243-.266z"/></svg>,
  traxsource: <Disc3 className="w-4 h-4" />,
  tracklist: <ListMusic className="w-4 h-4" />,
  radio: <Radio className="w-4 h-4" />,
  itunes: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M8.5 2A6.5 6.5 0 0 0 2 8.5v7A6.5 6.5 0 0 0 8.5 22h7a6.5 6.5 0 0 0 6.5-6.5v-7A6.5 6.5 0 0 0 15.5 2h-7zm5.262 3.104c.078-.004.157-.003.234.004.759.072 1.313.565 1.445 1.286.134.729-.165 1.456-.805 1.96-.543.428-1.18.581-1.849.431-.704-.158-1.144-.593-1.289-1.286-.134-.643.039-1.222.491-1.723.388-.43.908-.672 1.773-.672zm-4.91 2.078l6.298-1.09v9.196c0 .65-.384 1.11-.982 1.245-.652.147-1.335-.125-1.659-.686-.359-.621-.168-1.344.472-1.783.423-.29.911-.407 1.42-.45.083-.007.166-.01.249-.01v-4.876l-4.298.743v5.847c0 .65-.384 1.11-.982 1.245-.652.147-1.335-.125-1.659-.686-.359-.621-.168-1.344.472-1.783.423-.29.911-.407 1.42-.45.083-.007.166-.01.249-.01V7.182z"/></svg>,
};

// Couleurs par source
const SOURCE_COLORS: Record<string, string> = {
  spotify: "#1DB954",
  apple_music: "#FA243C",
  youtube: "#FF0000",
  instagram: "#E1306C",
  tiktok: "#000000",
  facebook: "#1877F2",
  soundcloud: "#FF5500",
  deezer: "#FEAA2D",
  shazam: "#0088FF",
  twitter: "#000000",
  amazon: "#FF9900",
  tidal: "#000000",
  bandsintown: "#00CEC8",
  songkick: "#F80046",
  beatport: "#94D500",
  traxsource: "#00B4D8",
  tracklist: "#FF6B00",
  radio: "#8B5CF6",
  itunes: "#EA4CC0",
};

// Formater les grands nombres
function formatNumber(n: number | null | undefined): string {
  if (n == null) return "—";
  if (n >= 1e9) return (n / 1e9).toFixed(1) + "B";
  if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(1) + "K";
  return n.toLocaleString();
}

// Icone par metrique
function getMetricIcon(metric: string): React.ReactNode {
  const m = metric.toLowerCase();
  if (m.includes("follower")) return <Users className="w-4 h-4" />;
  if (m.includes("listener")) return <Headphones className="w-4 h-4" />;
  if (m.includes("view") || m.includes("play")) return <Play className="w-4 h-4" />;
  if (m.includes("like")) return <Heart className="w-4 h-4" />;
  if (m.includes("stream")) return <BarChart3 className="w-4 h-4" />;
  if (m.includes("popularity")) return <TrendingUp className="w-4 h-4" />;
  return <Eye className="w-4 h-4" />;
}

export function ArtistStatsOverview({ artistId }: { artistId: string }) {
  const [stats, setStats] = useState<StatEntry[]>([]);
  const [audience, setAudience] = useState<AudienceEntry[]>([]);
  const [related, setRelated] = useState<RelatedArtist[]>([]);
  const [genres, setGenres] = useState<GenreEntry[]>([]);
  const [activitySummary, setActivitySummary] = useState<ActivitySummary[]>([]);
  const [linksCount, setLinksCount] = useState<number>(0);
  const [playlistsCount, setPlaylistsCount] = useState<number>(0);
  const [catalogCount, setCatalogCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [artistId]);

  const fetchData = async () => {
    setLoading(true);

    // Fetch all data in parallel
    const [statsRes, audienceRes, relatedRes, genresRes, linksRes, playlistsRes, catalogRes] = await Promise.all([
      supabase.from("artist_stats_current").select("source, metric, value").eq("artist_id", artistId),
      supabase.from("artist_audience").select("country_code, city, listeners_count, percentage").eq("artist_id", artistId).order("listeners_count", { ascending: false }).limit(10),
      supabase.from("artist_related").select("name, avatar, site_url").eq("artist_id", artistId).limit(12),
      supabase.from("artist_genres").select("genre").eq("artist_id", artistId),
      supabase.from("artist_links_songstats").select("source", { count: "exact" }).eq("artist_id", artistId),
      supabase.from("artist_playlists").select("id", { count: "exact" }).eq("artist_id", artistId),
      supabase.from("artist_catalog").select("id", { count: "exact" }).eq("artist_id", artistId),
    ]);

    // Fetch activity summary (peut echouer si la fonction n'existe pas encore)
    let activitiesData: ActivitySummary[] = [];
    try {
      const { data } = await supabase.rpc("get_artist_activity_summary", { _artist_id: artistId });
      activitiesData = data || [];
    } catch (e) {
      console.log("Activity summary RPC not available:", e);
    }
    
    setStats(statsRes.data || []);
    setAudience(audienceRes.data || []);
    setRelated(relatedRes.data || []);
    setGenres(genresRes.data || []);
    setActivitySummary(activitiesData);
    setLinksCount(linksRes.count || 0);
    setPlaylistsCount(playlistsRes.count || 0);
    setCatalogCount(catalogRes.count || 0);
    setLoading(false);
  };

  // Grouper les stats par source
  const statsBySource: Record<string, StatEntry[]> = {};
  stats.forEach(s => {
    if (!statsBySource[s.source]) statsBySource[s.source] = [];
    statsBySource[s.source].push(s);
  });

  // Calculer le total followers toutes plateformes
  const totalFollowers = stats
    .filter(s => s.metric.toLowerCase().includes("follower"))
    .reduce((sum, s) => sum + (s.value || 0), 0);

  // Calculer total monthly listeners
  const totalListeners = stats
    .filter(s => s.metric.toLowerCase().includes("listener"))
    .reduce((sum, s) => sum + (s.value || 0), 0);

  if (loading) {
    return (
      <div className="card-surface p-6 rounded-xl flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-violet-400" />
      </div>
    );
  }

  // Ne rien afficher si pas de donnees
  if (stats.length === 0 && audience.length === 0 && related.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">

      {/* Stats globales */}
      {stats.length > 0 && (
        <div className="card-surface p-6 rounded-xl">
          <h3 className="text-sm font-semibold text-slate-600 dark:text-gray-400 uppercase mb-4">Statistiques Multi-Plateformes</h3>
          
          {/* KPIs principaux */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {totalFollowers > 0 && (
              <div className="bg-gradient-to-br from-violet-100 to-purple-100 dark:from-violet-500/20 dark:to-purple-600/20 border border-violet-300 dark:border-violet-500/30 rounded-xl p-4">
                <div className="flex items-center gap-2 text-violet-600 dark:text-violet-400 mb-1">
                  <Users className="w-4 h-4" />
                  <span className="text-xs uppercase">Total Followers</span>
                </div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{formatNumber(totalFollowers)}</p>
              </div>
            )}
            {totalListeners > 0 && (
              <div className="bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-500/20 dark:to-emerald-600/20 border border-green-300 dark:border-green-500/30 rounded-xl p-4">
                <div className="flex items-center gap-2 text-green-600 dark:text-green-400 mb-1">
                  <Headphones className="w-4 h-4" />
                  <span className="text-xs uppercase">Monthly Listeners</span>
                </div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{formatNumber(totalListeners)}</p>
              </div>
            )}
          </div>

          {/* Stats par plateforme */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {Object.entries(statsBySource).map(([source, sourceStats]) => (
              <div 
                key={source} 
                className="rounded-xl border border-slate-200 dark:border-gray-700/50 p-4 bg-slate-50 dark:bg-gray-800/30"
                style={{ borderLeftColor: SOURCE_COLORS[source] || "#666", borderLeftWidth: "3px" }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <span style={{ color: SOURCE_COLORS[source] || "#666" }}>
                    {SOURCE_ICONS[source] || <Music2 className="w-4 h-4" />}
                  </span>
                  <span className="text-sm font-medium text-slate-900 dark:text-white capitalize">{source.replace("_", " ")}</span>
                </div>
                <div className="space-y-2">
                  {sourceStats.map((s, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className="text-slate-500 dark:text-gray-400 flex items-center gap-1.5">
                        {getMetricIcon(s.metric)}
                        <span className="capitalize">{s.metric.replace(/_/g, " ")}</span>
                      </span>
                      <span className="text-slate-900 dark:text-white font-medium">{formatNumber(s.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Audience geographique - seulement si donnees valides */}
      {audience.filter(a => a.listeners_count > 0 && a.country_code).length > 0 && (
        <div className="card-surface p-6 rounded-xl">
          <h3 className="text-sm font-semibold text-slate-600 dark:text-gray-400 uppercase mb-4 flex items-center gap-2">
            <Globe2 className="w-4 h-4" /> Audience par Pays
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {audience.filter(a => a.listeners_count > 0 && a.country_code).map((a, i) => (
              <div key={i} className="bg-slate-100 dark:bg-gray-800/50 rounded-lg p-3 text-center">
                <div className="text-2xl mb-1">{getFlagEmoji(a.country_code)}</div>
                <div className="text-sm text-slate-900 dark:text-white font-medium">{a.country_code}</div>
                <div className="text-xs text-slate-500 dark:text-gray-400">{formatNumber(a.listeners_count)}</div>
                {a.percentage && (
                  <div className="text-xs text-violet-600 dark:text-violet-400">{a.percentage.toFixed(1)}%</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Genres */}
      {genres.length > 0 && (
        <div className="card-surface p-6 rounded-xl">
          <h3 className="text-sm font-semibold text-slate-600 dark:text-gray-400 uppercase mb-4 flex items-center gap-2">
            <Disc3 className="w-4 h-4" /> Genres
          </h3>
          <div className="flex flex-wrap gap-2">
            {genres.map((g, i) => (
              <span key={i} className="px-3 py-1.5 rounded-full bg-violet-100 dark:bg-violet-500/20 border border-violet-300 dark:border-violet-500/30 text-violet-700 dark:text-violet-300 text-sm">
                {g.genre}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Artistes similaires */}
      {related.length > 0 && (
        <div className="card-surface p-6 rounded-xl">
          <h3 className="text-sm font-semibold text-slate-600 dark:text-gray-400 uppercase mb-4 flex items-center gap-2">
            <Users className="w-4 h-4" /> Artistes Similaires
          </h3>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
            {related.map((r, i) => (
              <a 
                key={i} 
                href={r.site_url || "#"} 
                target="_blank" 
                rel="noreferrer"
                className="text-center group"
              >
                <div className="w-16 h-16 mx-auto rounded-full overflow-hidden bg-slate-200 dark:bg-gray-700 mb-2 ring-2 ring-transparent group-hover:ring-violet-500 transition-all">
                  {r.avatar ? (
                    <img src={r.avatar} alt={r.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Music2 className="w-6 h-6 text-slate-400 dark:text-gray-500" />
                    </div>
                  )}
                </div>
                <p className="text-xs text-slate-700 dark:text-gray-300 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors truncate">
                  {r.name}
                </p>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Donnees Songstats - Compteurs */}
      {(linksCount > 0 || playlistsCount > 0 || catalogCount > 0) && (
        <div className="card-surface p-6 rounded-xl">
          <h3 className="text-sm font-semibold text-slate-600 dark:text-gray-400 uppercase mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4" /> Donnees Songstats
          </h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-500/20 dark:to-cyan-600/20 border border-blue-300 dark:border-blue-500/30 rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-slate-900 dark:text-white mb-1">{linksCount}</div>
              <div className="text-xs text-blue-600 dark:text-blue-400 uppercase">Liens Plateformes</div>
            </div>
            <div className="bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-500/20 dark:to-emerald-600/20 border border-green-300 dark:border-green-500/30 rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-slate-900 dark:text-white mb-1">{playlistsCount}</div>
              <div className="text-xs text-green-600 dark:text-green-400 uppercase">Playlists</div>
            </div>
            <div className="bg-gradient-to-br from-purple-100 to-violet-100 dark:from-purple-500/20 dark:to-violet-600/20 border border-purple-300 dark:border-purple-500/30 rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-slate-900 dark:text-white mb-1">{catalogCount}</div>
              <div className="text-xs text-purple-600 dark:text-purple-400 uppercase">Tracks Catalog</div>
            </div>
          </div>
        </div>
      )}

      {/* Activites Resume */}
      {activitySummary.length > 0 && (
        <div className="card-surface p-6 rounded-xl">
          <h3 className="text-sm font-semibold text-slate-600 dark:text-gray-400 uppercase mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4" /> Resume des Activites
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-3">
            {activitySummary.map((a, i) => {
              const typeColors: Record<string, { bgLight: string; bgDark: string; textLight: string; textDark: string }> = {
                radio: { bgLight: "bg-orange-100", bgDark: "dark:bg-orange-500/20", textLight: "text-orange-600", textDark: "dark:text-orange-400" },
                video: { bgLight: "bg-red-100", bgDark: "dark:bg-red-500/20", textLight: "text-red-600", textDark: "dark:text-red-400" },
                playlist: { bgLight: "bg-green-100", bgDark: "dark:bg-green-500/20", textLight: "text-green-600", textDark: "dark:text-green-400" },
                editorial_playlist: { bgLight: "bg-emerald-100", bgDark: "dark:bg-emerald-500/20", textLight: "text-emerald-600", textDark: "dark:text-emerald-400" },
                album_chart: { bgLight: "bg-purple-100", bgDark: "dark:bg-purple-500/20", textLight: "text-purple-600", textDark: "dark:text-purple-400" },
                track_chart: { bgLight: "bg-violet-100", bgDark: "dark:bg-violet-500/20", textLight: "text-violet-600", textDark: "dark:text-violet-400" },
                milestone: { bgLight: "bg-yellow-100", bgDark: "dark:bg-yellow-500/20", textLight: "text-yellow-600", textDark: "dark:text-yellow-400" },
                comment: { bgLight: "bg-blue-100", bgDark: "dark:bg-blue-500/20", textLight: "text-blue-600", textDark: "dark:text-blue-400" },
              };
              const colors = typeColors[a.activity_type] || { bgLight: "bg-gray-100", bgDark: "dark:bg-gray-500/20", textLight: "text-gray-600", textDark: "dark:text-gray-400" };
              
              return (
                <div key={i} className={`${colors.bgLight} ${colors.bgDark} rounded-lg p-3 text-center border border-slate-200 dark:border-gray-700/30`}>
                  <div className={`text-2xl font-bold ${colors.textLight} ${colors.textDark}`}>{a.count}</div>
                  <div className="text-xs text-slate-500 dark:text-gray-400 capitalize">{a.activity_type.replace("_", " ")}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// Helper pour obtenir le flag emoji
function getFlagEmoji(countryCode: string): string {
  if (!countryCode || countryCode.length !== 2) return "🌍";
  const codePoints = countryCode
    .toUpperCase()
    .split("")
    .map(char => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

