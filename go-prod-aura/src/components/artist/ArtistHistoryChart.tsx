import { useEffect, useState, useMemo } from "react";
import { supabase } from "../../lib/supabaseClient";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp, Calendar, Loader2, Check } from "lucide-react";

interface HistoryData {
  source: string;
  metric: string;
  ts: string;
  value: number | string;
}

interface ChartDataPoint {
  date: string;
  [key: string]: string | number;
}

// Couleurs par plateforme (optimisees pour contraste)
const PLATFORM_COLORS: Record<string, string> = {
  spotify: "#1DB954",
  instagram: "#E4405F",
  facebook: "#1877F2",
  tiktok: "#69C9D0",
  youtube: "#FF0000",
  twitter: "#1DA1F2",
  deezer: "#FEAA2D",
  soundcloud: "#FF5500",
  bandsintown: "#00CEC8",
  apple_music: "#FA243C",
  amazon: "#FF9900",
  tidal: "#00FFFF",
  beatport: "#94D500",
};

// Noms affichables
const PLATFORM_NAMES: Record<string, string> = {
  spotify: "Spotify",
  instagram: "Instagram",
  facebook: "Facebook",
  tiktok: "TikTok",
  youtube: "YouTube",
  twitter: "Twitter/X",
  deezer: "Deezer",
  soundcloud: "SoundCloud",
  bandsintown: "Bandsintown",
  apple_music: "Apple Music",
  amazon: "Amazon Music",
  tidal: "Tidal",
  beatport: "Beatport",
};

const DURATION_OPTIONS = [
  { value: 30, label: "1 mois" },
  { value: 90, label: "3 mois" },
  { value: 180, label: "6 mois" },
];

const METRIC_OPTIONS = [
  { value: "followers_total", label: "Followers" },
  { value: "monthly_listeners", label: "Auditeurs / mois" },
  { value: "streams_total", label: "Streams" },
  { value: "views_total", label: "Vues" },
  { value: "subscribers_total", label: "Abonnés" },
  { value: "playlist_reach", label: "Reach playlists" },
  { value: "playlists_count", label: "Playlists" },
  { value: "popularity", label: "Popularité" },
];

interface Props {
  artistId: string;
}

export function ArtistHistoryChart({ artistId }: Props) {
  const [loading, setLoading] = useState(true);
  const [rawData, setRawData] = useState<HistoryData[]>([]);
  const [availablePlatforms, setAvailablePlatforms] = useState<string[]>([]);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [duration, setDuration] = useState(180);
  const [metric, setMetric] = useState("followers_total");
  const [allAvailableMetrics, setAllAvailableMetrics] = useState<string[]>([]);

  // Charger les metriques disponibles une seule fois - par pages pour tout recuperer
  useEffect(() => {
    const fetchAvailableMetrics = async () => {
      const allMetrics = new Set<string>();
      let offset = 0;
      const pageSize = 1000;
      let hasMore = true;
      
      while (hasMore) {
        const { data } = await supabase
          .from("artist_stats_history")
          .select("metric")
          .eq("artist_id", artistId)
          .range(offset, offset + pageSize - 1);
        
        if (data && data.length > 0) {
          data.forEach(d => allMetrics.add(d.metric));
          offset += pageSize;
          hasMore = data.length === pageSize;
        } else {
          hasMore = false;
        }
        
        // Securite : max 20 pages
        if (offset >= 20000) hasMore = false;
      }
      
      const uniqueMetrics = Array.from(allMetrics);
      console.log("Metriques disponibles:", uniqueMetrics);
      setAllAvailableMetrics(uniqueMetrics);
    };
    fetchAvailableMetrics();
  }, [artistId]);

  useEffect(() => {
    fetchHistoryData();
  }, [artistId, metric]);

  const fetchHistoryData = async () => {
    setLoading(true);
    try {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      const cutoffISO = sixMonthsAgo.toISOString();
      
      const allData: any[] = [];
      let offset = 0;
      const pageSize = 1000;
      let hasMore = true;
      
      while (hasMore) {
        const { data, error } = await supabase
          .from("artist_stats_history")
          .select("source, metric, ts, value")
          .eq("artist_id", artistId)
          .eq("metric", metric)
          .gte("ts", cutoffISO)
          .order("ts", { ascending: true })
          .range(offset, offset + pageSize - 1);

        if (error) throw error;
        
        if (data && data.length > 0) {
          allData.push(...data);
          offset += pageSize;
          hasMore = data.length === pageSize;
        } else {
          hasMore = false;
        }
        
        if (offset >= 5000) hasMore = false;
      }
      
      const converted = (allData || []).map(d => ({
        ...d,
        value: Number(d.value) || 0
      }));
      
      setRawData(converted);

      const platforms = [...new Set(converted.map((d) => d.source))];
      setAvailablePlatforms(platforms);

      if (selectedPlatforms.length === 0) {
        const latestValues = platforms.map((p) => {
          const platformData = converted.filter((d) => d.source === p);
          const latest = platformData[0];
          return { platform: p, value: latest?.value || 0 };
        });
        latestValues.sort((a, b) => b.value - a.value);
        const top3 = latestValues.slice(0, 3).map((v) => v.platform);
        setSelectedPlatforms(top3);
      }
    } catch (err) {
      console.error("Error fetching history:", err);
    } finally {
      setLoading(false);
    }
  };

  const chartData = useMemo(() => {
    if (rawData.length === 0) return [];

    const now = new Date();
    const cutoffDate = new Date(now.getTime() - duration * 24 * 60 * 60 * 1000);

    const filtered = rawData.filter((d) => {
      const dateObj = new Date(d.ts);
      return d.metric === metric && selectedPlatforms.includes(d.source) && dateObj >= cutoffDate;
    });

    // Group by date
    const byDate = new Map<string, ChartDataPoint>();

    for (const d of filtered) {
      const dateStr = new Date(d.ts).toISOString().split("T")[0];
      if (!byDate.has(dateStr)) {
        byDate.set(dateStr, { date: dateStr });
      }
      const point = byDate.get(dateStr)!;
      point[d.source] = Number(d.value) || 0;
    }

    // Fill missing dates to ensure continuous lines
    const sortedDates = Array.from(byDate.keys()).sort();
    if (sortedDates.length > 1) {
      const startDate = new Date(sortedDates[0]);
      const endDate = new Date(sortedDates[sortedDates.length - 1]);
      
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split("T")[0];
        if (!byDate.has(dateStr)) {
          byDate.set(dateStr, { date: dateStr });
        }
      }
    }

    return Array.from(byDate.values()).sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }, [rawData, selectedPlatforms, duration, metric]);

  const availableMetrics = useMemo(() => {
    const metricsSet = new Set(allAvailableMetrics);
    return METRIC_OPTIONS.filter((m) => metricsSet.has(m.value));
  }, [allAvailableMetrics]);

  // Calculer le domaine Y dynamique pour plus de precision
  const yDomain = useMemo(() => {
    if (chartData.length === 0) return [0, 100];
    
    let min = Infinity;
    let max = -Infinity;
    
    for (const point of chartData) {
      for (const platform of selectedPlatforms) {
        const value = point[platform];
        if (typeof value === "number" && value > 0) {
          min = Math.min(min, value);
          max = Math.max(max, value);
        }
      }
    }
    
    if (min === Infinity || max === -Infinity) return [0, 100];
    
    // Ajouter une marge de 10% pour mieux voir les variations
    const range = max - min;
    const margin = range * 0.1;
    
    // Si la variation est tres faible (< 5%), zoomer davantage
    const variationPercent = range / max * 100;
    if (variationPercent < 5 && min > 0) {
      // Zoom agressif : centrer sur les donnees avec 20% de marge
      const centerMargin = range * 0.5;
      return [
        Math.max(0, min - centerMargin),
        max + centerMargin
      ];
    }
    
    return [
      Math.max(0, min - margin),
      max + margin
    ];
  }, [chartData, selectedPlatforms]);

  const togglePlatform = (platform: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platform)
        ? prev.filter((p) => p !== platform)
        : [...prev, platform]
    );
  };

  const formatNumber = (value: number) => {
    if (value >= 1000000) return (value / 1000000).toFixed(1) + "M";
    if (value >= 1000) return (value / 1000).toFixed(1) + "K";
    return value.toString();
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 p-6 rounded-xl flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
      </div>
    );
  }

  // Toujours afficher le conteneur, meme sans donnees
  const hasData = rawData.length > 0;

  return (
    <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 p-6 rounded-xl space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-violet-100 dark:bg-violet-500/20">
          <TrendingUp className="w-5 h-5 text-violet-600 dark:text-violet-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
            Evolution des statistiques
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Historique sur {duration} jours
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-end gap-6 pb-4 border-b border-slate-200 dark:border-slate-700">
        {/* Duration selector */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            Periode
          </label>
          <div className="flex gap-1.5">
            {DURATION_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setDuration(opt.value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  duration === opt.value
                    ? "bg-violet-600 text-white shadow-md shadow-violet-500/25"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Metric selector */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
            Metrique
          </label>
          <select
            value={metric}
            onChange={(e) => setMetric(e.target.value)}
            className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent cursor-pointer"
          >
            {availableMetrics.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Platform selector */}
      {hasData ? (
        <div className="space-y-3">
          <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
            Plateformes
          </label>
          <div className="flex flex-wrap gap-2">
            {availablePlatforms.map((platform) => {
              const isSelected = selectedPlatforms.includes(platform);
              const color = PLATFORM_COLORS[platform] || "#8B5CF6";
              return (
                <button
                  key={platform}
                  onClick={() => togglePlatform(platform)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    isSelected
                      ? "text-white shadow-md"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                  }`}
                  style={{
                    backgroundColor: isSelected ? color : undefined,
                  }}
                >
                  {isSelected && <Check className="w-3.5 h-3.5" />}
                  {!isSelected && (
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                  )}
                  {PLATFORM_NAMES[platform] || platform}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* Chart */}
      {!hasData ? (
        <div className="h-[280px] flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800/30 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700">
          <TrendingUp className="w-12 h-12 mb-3 opacity-30" />
          <p className="text-sm font-medium">Aucune donnee historique disponible</p>
          <p className="text-xs mt-1 opacity-70">Les statistiques apparaitront apres la premiere synchronisation</p>
        </div>
      ) : chartData.length > 0 ? (
        <div className="h-[320px] w-full pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 10, right: 20, left: 10, bottom: 10 }}
            >
              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke="#E2E8F0" 
                className="dark:stroke-slate-700"
                vertical={false}
              />
              <XAxis
                dataKey="date"
                tickFormatter={formatDate}
                stroke="#94A3B8"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                dy={10}
              />
              <YAxis
                tickFormatter={formatNumber}
                stroke="#94A3B8"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                width={55}
                dx={-5}
                domain={yDomain}
                allowDataOverflow={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(255, 255, 255, 0.98)",
                  border: "1px solid #E2E8F0",
                  borderRadius: "12px",
                  boxShadow: "0 10px 40px -10px rgba(0, 0, 0, 0.15)",
                  padding: "12px 16px",
                }}
                labelStyle={{ 
                  color: "#1E293B", 
                  fontWeight: 600,
                  marginBottom: "8px",
                  fontSize: "13px",
                }}
                itemStyle={{ 
                  color: "#64748B",
                  fontSize: "12px",
                  padding: "2px 0",
                }}
                labelFormatter={(label) =>
                  new Date(label).toLocaleDateString("fr-FR", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  })
                }
                formatter={(value: number, name: string) => [
                  formatNumber(value),
                  PLATFORM_NAMES[name] || name,
                ]}
              />
              {selectedPlatforms.map((platform) => (
                <Line
                  key={platform}
                  type="monotone"
                  dataKey={platform}
                  name={platform}
                  stroke={PLATFORM_COLORS[platform] || "#8B5CF6"}
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ 
                    r: 5, 
                    strokeWidth: 2,
                    stroke: "#fff",
                    fill: PLATFORM_COLORS[platform] || "#8B5CF6",
                  }}
                  connectNulls={true}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="h-[280px] flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800/30 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700">
          <TrendingUp className="w-12 h-12 mb-3 opacity-30" />
          <p className="text-sm font-medium">Selectionnez au moins une plateforme</p>
        </div>
      )}

      {/* Stats summary */}
      {hasData && selectedPlatforms.length > 0 && chartData.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
          {selectedPlatforms.slice(0, 4).map((platform) => {
            const platformData = chartData.filter(
              (d) => d[platform] !== undefined && d[platform] !== null
            );
            if (platformData.length < 2) return null;

            const first = Number(platformData[0][platform]) || 0;
            const last = Number(platformData[platformData.length - 1][platform]) || 0;
            const change = first > 0 ? ((last - first) / first) * 100 : 0;
            const isPositive = change >= 0;
            const color = PLATFORM_COLORS[platform] || "#8B5CF6";

            return (
              <div
                key={platform}
                className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 space-y-2"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    {PLATFORM_NAMES[platform]}
                  </span>
                </div>
                <div className="text-xl font-bold text-slate-900 dark:text-white">
                  {formatNumber(last)}
                </div>
                <div
                  className={`text-xs font-semibold flex items-center gap-1 ${
                    isPositive ? "text-emerald-500" : "text-red-500"
                  }`}
                >
                  <span>{isPositive ? "+" : ""}{change.toFixed(1)}%</span>
                  <span className="text-slate-400 dark:text-slate-500 font-normal">
                    sur {duration}j
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
