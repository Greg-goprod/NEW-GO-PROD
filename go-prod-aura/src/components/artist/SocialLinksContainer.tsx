import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";
import { 
  Users,
  Headphones,
  Play,
  ListMusic,
  ExternalLink
} from "lucide-react";

type StatEntry = {
  source: string;
  metric: string;
  value: number;
};

type SocialLink = {
  id: string;
  source: string;
  url: string;
};

// Configuration des 10 plateformes
const PLATFORMS_CONFIG = [
  {
    id: "instagram",
    name: "Instagram",
    icon: "https://static.cdninstagram.com/rsrc.php/v3/yI/r/VsNE-OHk_8a.png",
    metrics: ["followers_total", "views_total", "likes_total"],
  },
  {
    id: "tiktok",
    name: "TikTok",
    icon: "https://www.tiktok.com/favicon.ico",
    metrics: ["followers_total", "views_total", "videos_total"],
  },
  {
    id: "facebook",
    name: "Facebook",
    icon: "https://www.facebook.com/favicon.ico",
    metrics: ["followers_total", "talking_about_current"],
  },
  {
    id: "twitter",
    name: "Twitter / X",
    icon: "https://abs.twimg.com/favicons/twitter.3.ico",
    metrics: ["followers_total"],
  },
  {
    id: "spotify",
    name: "Spotify",
    icon: "https://storage.googleapis.com/pr-newsroom-wp/1/2023/05/Spotify_Primary_Logo_RGB_Green.png",
    metrics: ["followers_total", "monthly_listeners_current", "streams_total", "playlists_total"],
  },
  {
    id: "apple_music",
    name: "Apple Music",
    icon: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5f/Apple_Music_icon.svg/2048px-Apple_Music_icon.svg.png",
    metrics: ["playlists_total", "playlists_editorial_total"],
  },
  {
    id: "youtube",
    name: "YouTube",
    icon: "https://upload.wikimedia.org/wikipedia/commons/0/09/YouTube_full-color_icon_%282017%29.svg",
    metrics: ["subscribers_total", "video_views_total", "videos_total", "monthly_audience_current"],
  },
  {
    id: "deezer",
    name: "Deezer",
    icon: "https://www.deezer.com/favicon.ico",
    metrics: ["followers_total", "playlists_total"],
  },
  {
    id: "soundcloud",
    name: "SoundCloud",
    icon: "https://a-v2.sndcdn.com/assets/images/sc-icons/favicon-2cadd14b.ico",
    metrics: ["followers_total", "streams_total", "favorites_total"],
  },
  {
    id: "shazam",
    name: "Shazam",
    icon: "https://upload.wikimedia.org/wikipedia/commons/c/c0/Shazam_icon.svg",
    metrics: ["shazams_total", "charts_total", "charted_countries_total"],
  },
];

// Labels des metriques
const METRIC_LABELS: Record<string, string> = {
  followers_total: "Followers",
  subscribers_total: "Abonnes",
  monthly_listeners_current: "Auditeurs/mois",
  monthly_audience_current: "Audience/mois",
  streams_total: "Streams",
  video_views_total: "Vues video",
  views_total: "Vues",
  videos_total: "Videos",
  playlists_total: "Playlists",
  playlists_editorial_total: "Playlists edito",
  likes_total: "Likes",
  talking_about_current: "Interactions",
  favorites_total: "Favoris",
  shazams_total: "Shazams",
  charts_total: "Charts",
  charted_countries_total: "Pays charts",
};

// Icones des metriques
function getMetricIcon(metric: string): React.ReactNode {
  if (metric.includes("follower") || metric.includes("subscriber")) return <Users className="w-3 h-3" />;
  if (metric.includes("listener") || metric.includes("audience")) return <Headphones className="w-3 h-3" />;
  if (metric.includes("stream") || metric.includes("view") || metric.includes("shazam")) return <Play className="w-3 h-3" />;
  if (metric.includes("playlist")) return <ListMusic className="w-3 h-3" />;
  if (metric.includes("chart") || metric.includes("country")) return <ListMusic className="w-3 h-3" />;
  if (metric.includes("favorite")) return <Users className="w-3 h-3" />;
  return <Users className="w-3 h-3" />;
}

// Formater les grands nombres
function formatNumber(num: number | null | undefined): string {
  if (num == null || num === 0) return "-";
  if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(1) + "B";
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + "M";
  if (num >= 1_000) return (num / 1_000).toFixed(1) + "K";
  return num.toLocaleString();
}

export function SocialLinksContainer({ artistId }: { artistId: string }) {
  const [stats, setStats] = useState<StatEntry[]>([]);
  const [links, setLinks] = useState<SocialLink[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      
      // Fetch stats et liens en parallele
      const [statsRes, linksRes] = await Promise.all([
        supabase
          .from("artist_stats_current")
          .select("source, metric, value")
          .eq("artist_id", artistId),
        supabase
          .from("artist_links_songstats")
          .select("id, source, url")
          .eq("artist_id", artistId),
      ]);
      
      setStats(statsRes.data || []);
      setLinks(linksRes.data || []);
      setLoading(false);
    };
    
    fetchData();
  }, [artistId]);

  // Organiser les stats par source
  const statsBySource: Record<string, Record<string, number>> = {};
  stats.forEach(s => {
    if (!statsBySource[s.source]) statsBySource[s.source] = {};
    statsBySource[s.source][s.metric] = s.value;
  });

  // Trouver le lien pour une plateforme
  const getLinkForPlatform = (platformId: string): string | null => {
    const link = links.find(l => l.source.toLowerCase() === platformId);
    return link?.url || null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-semibold text-slate-600 dark:text-slate-400 uppercase">
        Plateformes & Reseaux Sociaux
      </h4>
      
      {/* Grille 5 colonnes x 2 lignes */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {PLATFORMS_CONFIG.map((platform) => {
          const platformStats = statsBySource[platform.id] || {};
          const hasData = Object.keys(platformStats).length > 0;
          const linkUrl = getLinkForPlatform(platform.id);
          
          return (
            <div
              key={platform.id}
              className={`relative rounded-xl border overflow-hidden transition-all bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-700 ${
                hasData ? "shadow-sm hover:shadow-md" : "opacity-50"
              }`}
            >
              {/* Header avec logo, nom et followers */}
              <div className="flex items-center gap-2 p-3 border-b border-slate-100 dark:border-slate-800">
                <img 
                  src={platform.icon} 
                  alt={platform.name}
                  className="w-6 h-6 object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate uppercase">
                  {platform.name}
                </span>
                
                {/* Nombre de followers en millions */}
                {(() => {
                  const followers = platformStats.followers_total || platformStats.subscribers_total;
                  if (followers && followers > 0) {
                    const formatted = followers >= 1_000_000 
                      ? (followers / 1_000_000).toFixed(1) + "M"
                      : followers >= 1_000 
                        ? (followers / 1_000).toFixed(0) + "K"
                        : followers.toLocaleString();
                    return (
                      <span className="ml-auto text-lg font-bold text-slate-900 dark:text-white">
                        {formatted}
                      </span>
                    );
                  }
                  return null;
                })()}
                
                {/* Lien externe */}
                {linkUrl && (
                  <a
                    href={linkUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`text-slate-400 hover:text-violet-500 transition-colors ${
                      !(platformStats.followers_total || platformStats.subscribers_total) ? "ml-auto" : "ml-2"
                    }`}
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>
              
              {/* Metriques */}
              <div className="px-3 py-2 space-y-1.5">
                {platform.metrics.map((metric) => {
                  const value = platformStats[metric];
                  return (
                    <div key={metric} className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                        {getMetricIcon(metric)}
                        <span className="truncate">{METRIC_LABELS[metric] || metric}</span>
                      </span>
                      <span className="font-semibold text-slate-700 dark:text-slate-200">
                        {formatNumber(value)}
                      </span>
                    </div>
                  );
                })}
                
                {/* Message si pas de donnees */}
                {!hasData && (
                  <p className="text-[10px] text-center text-slate-400 pt-1">
                    Aucune donnee
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

