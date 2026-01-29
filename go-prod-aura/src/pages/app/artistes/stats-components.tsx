/**
 * Composants pour la page Stats Artistes
 * Affichage des données Songstats (playlists, charts, radios, social)
 */

import { 
  ListMusic, Trophy, Radio, Share2, Eye, MessageCircle,
  TrendingUp, MapPin, Users, Heart
} from "lucide-react";
import { Bar, Line } from 'react-chartjs-2';
import type { PlaylistEntry, ChartEntry, RadioPlay, SocialStats, StatsHistoryPoint } from "../../../lib/songstats/api";

// ========================================================================
// PLAYLISTS SECTION
// ========================================================================

export function PlaylistsSection({ playlists }: { playlists: PlaylistEntry[] }) {
  // Grouper par type de playlist
  const editorial = playlists.filter(p => p.type === 'editorial');
  const algorithmic = playlists.filter(p => p.type === 'algorithmic');
  const userCurated = playlists.filter(p => p.type === 'user');

  return (
    <div className="bg-white dark:bg-slate-950/40 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2 mb-4">
        <ListMusic className="w-5 h-5 text-violet-500" />
        Playlists ({playlists.length})
      </h3>

      <div className="space-y-6">
        {/* Playlists éditoriales */}
        {editorial.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-yellow-500" />
              Éditoriales ({editorial.length})
            </h4>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {editorial.slice(0, 10).map((playlist, idx) => (
                <PlaylistCard key={idx} playlist={playlist} />
              ))}
            </div>
          </div>
        )}

        {/* Playlists algorithmiques */}
        {algorithmic.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-500" />
              Algorithmiques ({algorithmic.length})
            </h4>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {algorithmic.slice(0, 10).map((playlist, idx) => (
                <PlaylistCard key={idx} playlist={playlist} />
              ))}
            </div>
          </div>
        )}

        {/* Playlists utilisateurs */}
        {userCurated.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
              <Users className="w-4 h-4 text-green-500" />
              Curateurs indépendants ({userCurated.length})
            </h4>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {userCurated.slice(0, 10).map((playlist, idx) => (
                <PlaylistCard key={idx} playlist={playlist} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PlaylistCard({ playlist }: { playlist: PlaylistEntry }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 hover:border-violet-300 dark:hover:border-violet-700 transition-colors">
      {playlist.position && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-violet-500 flex items-center justify-center text-white font-bold text-sm">
          #{playlist.position}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
          {playlist.playlist_name}
        </p>
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-1">
          <span>{playlist.owner}</span>
          <span>•</span>
          <span>{playlist.followers.toLocaleString('fr-FR')} followers</span>
          <span>•</span>
          <span className="capitalize">{playlist.platform}</span>
        </div>
        {playlist.added_at && (
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
            Ajouté le {new Date(playlist.added_at).toLocaleDateString('fr-FR')}
          </p>
        )}
      </div>
    </div>
  );
}

// ========================================================================
// CHARTS SECTION
// ========================================================================

export function ChartsSection({ charts }: { charts: ChartEntry[] }) {
  // Grouper les charts par pays
  const chartsByCountry: Record<string, ChartEntry[]> = {};
  charts.forEach(chart => {
    if (!chartsByCountry[chart.country]) {
      chartsByCountry[chart.country] = [];
    }
    chartsByCountry[chart.country].push(chart);
  });

  return (
    <div className="bg-white dark:bg-slate-950/40 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2 mb-4">
        <Trophy className="w-5 h-5 text-yellow-500" />
        Classements Charts ({charts.length})
      </h3>

      <div className="space-y-4">
        {Object.entries(chartsByCountry).map(([country, countryCharts]) => (
          <div key={country}>
            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              {country}
            </h4>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {countryCharts.map((chart, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800"
                >
                  <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center text-white font-bold">
                    #{chart.position}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                      {chart.chart_name}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {chart.peak_position && (
                        <>
                          <span>Pic: #{chart.peak_position}</span>
                          <span>•</span>
                        </>
                      )}
                      {chart.weeks_on_chart && (
                        <span>{chart.weeks_on_chart} semaine{chart.weeks_on_chart > 1 ? 's' : ''}</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                      {new Date(chart.date).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ========================================================================
// RADIO SECTION
// ========================================================================

export function RadioSection({ radios }: { radios: RadioPlay[] }) {
  // Trier par nombre de diffusions
  const sortedRadios = [...radios].sort((a, b) => b.plays - a.plays);
  
  // Top 10 radios pour le graphique
  const topRadios = sortedRadios.slice(0, 10);
  
  const chartData = {
    labels: topRadios.map(r => r.station),
    datasets: [{
      label: 'Diffusions',
      data: topRadios.map(r => r.plays),
      backgroundColor: 'rgba(139, 92, 246, 0.8)',
      borderColor: 'rgba(139, 92, 246, 1)',
      borderWidth: 1,
    }],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y' as const,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        padding: 12,
        titleColor: '#f1f5f9',
        bodyColor: '#cbd5e1',
      },
    },
    scales: {
      x: {
        ticks: {
          color: '#94a3b8',
        },
        grid: {
          color: 'rgba(148, 163, 184, 0.1)',
        },
      },
      y: {
        ticks: {
          color: '#94a3b8',
        },
        grid: {
          color: 'rgba(148, 163, 184, 0.1)',
        },
      },
    },
  };

  // Grouper par pays
  const radiosByCountry: Record<string, RadioPlay[]> = {};
  radios.forEach(radio => {
    if (!radiosByCountry[radio.country]) {
      radiosByCountry[radio.country] = [];
    }
    radiosByCountry[radio.country].push(radio);
  });

  return (
    <div className="space-y-6">
      {/* Graphique top radios */}
      <div className="bg-white dark:bg-slate-950/40 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2 mb-4">
          <Radio className="w-5 h-5 text-violet-500" />
          Top 10 Radios ({radios.length} total)
        </h3>
        <div className="h-80">
          <Bar data={chartData} options={chartOptions} />
        </div>
      </div>

      {/* Liste détaillée par pays */}
      <div className="bg-white dark:bg-slate-950/40 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2 mb-4">
          <MapPin className="w-5 h-5 text-violet-500" />
          Diffusions par pays
        </h3>
        <div className="space-y-4">
          {Object.entries(radiosByCountry).map(([country, countryRadios]) => {
            const totalPlays = countryRadios.reduce((sum, r) => sum + r.plays, 0);
            return (
              <div key={country}>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    {country}
                  </h4>
                  <span className="text-sm text-violet-600 dark:text-violet-400 font-semibold">
                    {totalPlays.toLocaleString('fr-FR')} diffusions
                  </span>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                  {countryRadios.slice(0, 10).map((radio, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800"
                    >
                      <span className="text-sm text-slate-900 dark:text-slate-100">{radio.station}</span>
                      <span className="text-sm font-semibold text-violet-600 dark:text-violet-400">
                        {radio.plays.toLocaleString('fr-FR')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ========================================================================
// SOCIAL MEDIA SECTION
// ========================================================================

export function SocialMediaSection({ social }: { social: SocialStats[] }) {
  return (
    <div className="bg-white dark:bg-slate-950/40 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2 mb-4">
        <Share2 className="w-5 h-5 text-violet-500" />
        Réseaux sociaux détaillés
      </h3>

      <div className="space-y-6">
        {social.map((platform, idx) => (
          <div key={idx} className="border-b border-slate-200 dark:border-slate-800 pb-6 last:border-0">
            <h4 className="text-md font-semibold text-slate-800 dark:text-slate-200 mb-3 capitalize">
              {platform.platform}
            </h4>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              {platform.followers && (
                <div className="text-center p-3 rounded-lg bg-slate-50 dark:bg-slate-900/60">
                  <div className="flex items-center justify-center gap-2 text-slate-600 dark:text-slate-400 text-sm mb-1">
                    <Users className="w-4 h-4" />
                    Followers
                  </div>
                  <div className="text-lg font-bold text-slate-900 dark:text-slate-100">
                    {platform.followers.toLocaleString('fr-FR')}
                  </div>
                </div>
              )}
              
              {platform.engagement_rate !== undefined && (
                <div className="text-center p-3 rounded-lg bg-slate-50 dark:bg-slate-900/60">
                  <div className="flex items-center justify-center gap-2 text-slate-600 dark:text-slate-400 text-sm mb-1">
                    <Heart className="w-4 h-4" />
                    Engagement
                  </div>
                  <div className="text-lg font-bold text-slate-900 dark:text-slate-100">
                    {(platform.engagement_rate * 100).toFixed(2)}%
                  </div>
                </div>
              )}
              
              {platform.reach && (
                <div className="text-center p-3 rounded-lg bg-slate-50 dark:bg-slate-900/60">
                  <div className="flex items-center justify-center gap-2 text-slate-600 dark:text-slate-400 text-sm mb-1">
                    <Eye className="w-4 h-4" />
                    Reach
                  </div>
                  <div className="text-lg font-bold text-slate-900 dark:text-slate-100">
                    {platform.reach.toLocaleString('fr-FR')}
                  </div>
                </div>
              )}
              
              {platform.posts && (
                <div className="text-center p-3 rounded-lg bg-slate-50 dark:bg-slate-900/60">
                  <div className="flex items-center justify-center gap-2 text-slate-600 dark:text-slate-400 text-sm mb-1">
                    <MessageCircle className="w-4 h-4" />
                    Posts
                  </div>
                  <div className="text-lg font-bold text-slate-900 dark:text-slate-100">
                    {platform.posts.toLocaleString('fr-FR')}
                  </div>
                </div>
              )}
            </div>

            {/* Répartition géographique */}
            {platform.country_breakdown && platform.country_breakdown.length > 0 && (
              <div>
                <h5 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Répartition par pays
                </h5>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {platform.country_breakdown.slice(0, 8).map((country, cidx) => (
                    <div
                      key={cidx}
                      className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800"
                    >
                      <span className="text-sm text-slate-900 dark:text-slate-100">{country.country}</span>
                      <span className="text-sm font-semibold text-violet-600 dark:text-violet-400">
                        {country.count.toLocaleString('fr-FR')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ========================================================================
// CATALOG SECTION
// ========================================================================

export function CatalogSection({ catalog }: { catalog: any[] }) {
  return (
    <div className="bg-white dark:bg-slate-950/40 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2 mb-4">
        <ListMusic className="w-5 h-5 text-violet-500" />
        Catalogue ({catalog.length} morceaux)
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {catalog.slice(0, 12).map((track, idx) => (
          <div
            key={idx}
            className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 hover:border-violet-300 dark:hover:border-violet-700 transition-colors"
          >
            {track.image_url ? (
              <img
                src={track.image_url}
                alt={track.name}
                className="w-12 h-12 rounded object-cover"
              />
            ) : (
              <div className="w-12 h-12 rounded bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                <ListMusic className="w-6 h-6 text-white" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                {track.name}
              </p>
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-1">
                {track.release_date && (
                  <span>{new Date(track.release_date).getFullYear()}</span>
                )}
                {track.popularity && (
                  <>
                    <span>•</span>
                    <span>{track.popularity}/100</span>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ========================================================================
// EVOLUTION CHARTS (avec données réelles)
// ========================================================================

export function EvolutionCharts({ 
  history, 
  period, 
  onPeriodChange 
}: { 
  history: StatsHistoryPoint[];
  period: 7 | 30 | 90 | 180;
  onPeriodChange: (p: 7 | 30 | 90 | 180) => void;
}) {
  // Filtrer l'historique selon la période
  const now = new Date();
  const startDate = new Date(now.getTime() - period * 24 * 60 * 60 * 1000);
  
  const filteredHistory = history.filter(h => {
    const date = new Date(h.date);
    return date >= startDate && date <= now;
  });

  // Organiser les données par métriques
  const metricsMap: Record<string, { date: string; value: number; platform?: string }[]> = {};
  filteredHistory.forEach(point => {
    const key = point.platform ? `${point.metric}_${point.platform}` : point.metric;
    if (!metricsMap[key]) {
      metricsMap[key] = [];
    }
    metricsMap[key].push(point);
  });

  // Créer un dataset pour chaque métrique
  const datasets = Object.entries(metricsMap).map(([key, data], idx) => {
    const colors = [
      'rgb(139, 92, 246)',
      'rgb(236, 72, 153)',
      'rgb(59, 130, 246)',
      'rgb(16, 185, 129)',
      'rgb(245, 158, 11)',
      'rgb(239, 68, 68)',
    ];
    
    const color = colors[idx % colors.length];
    
    return {
      label: key,
      data: data.map(d => ({ x: d.date, y: d.value })),
      borderColor: color,
      backgroundColor: color.replace('rgb', 'rgba').replace(')', ', 0.1)'),
      tension: 0.4,
      fill: true,
    };
  });

  const chartData = {
    datasets,
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: '#94a3b8',
          usePointStyle: true,
          padding: 15,
        },
      },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        padding: 12,
        titleColor: '#f1f5f9',
        bodyColor: '#cbd5e1',
      },
    },
    scales: {
      x: {
        type: 'time' as const,
        time: {
          unit: 'day' as const,
        },
        ticks: {
          color: '#94a3b8',
        },
        grid: {
          color: 'rgba(148, 163, 184, 0.1)',
        },
      },
      y: {
        ticks: {
          color: '#94a3b8',
          callback: (value: any) => value.toLocaleString('fr-FR'),
        },
        grid: {
          color: 'rgba(148, 163, 184, 0.1)',
        },
      },
    },
  };

  return (
    <div className="bg-white dark:bg-slate-950/40 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-violet-500" />
          Évolution historique
        </h3>
        
        {/* Sélecteur de période */}
        <div className="flex gap-2">
          {[7, 30, 90, 180].map(p => (
            <button
              key={p}
              onClick={() => onPeriodChange(p as any)}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                period === p
                  ? 'bg-violet-500 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {p}j
            </button>
          ))}
        </div>
      </div>

      <div className="h-80">
        {filteredHistory.length > 0 ? (
          <Line data={chartData} options={options} />
        ) : (
          <div className="h-full flex items-center justify-center text-slate-500 dark:text-slate-400">
            Aucune donnée historique disponible pour cette période
          </div>
        )}
      </div>
    </div>
  );
}

