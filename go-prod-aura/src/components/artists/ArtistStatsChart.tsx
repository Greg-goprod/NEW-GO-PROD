import { useEffect, useState } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { supabase } from '../../lib/supabaseClient';

// Enregistrer les composants Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

type HistoryData = {
  recorded_at: string;
  followers: number;
  popularity: number;
};

type Props = {
  artistId: string;
  artistName: string;
};

type Period = 7 | 30 | 90 | 180 | 365 | 730 | 'all';

export function ArtistStatsChart({ artistId }: Props) {
  const [selectedPeriod, setSelectedPeriod] = useState<Period>(30);
  const [history, setHistory] = useState<HistoryData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, [artistId, selectedPeriod]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('spotify_history')
        .select('recorded_at, followers, popularity')
        .eq('artist_id', artistId)
        .order('recorded_at', { ascending: true });

      // Appliquer le filtre de période
      if (selectedPeriod !== 'all') {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - selectedPeriod);
        query = query.gte('recorded_at', startDate.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;
      setHistory(data || []);
    } catch (err) {
      console.error('Error fetching history:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500"></div>
      </div>
    );
  }

  if (!history.length) {
    return (
      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
        <p>Aucune donnée historique disponible</p>
        <p className="text-sm mt-2">Les données seront disponibles après la première synchronisation quotidienne</p>
      </div>
    );
  }

  if (history.length === 1) {
    return (
      <div className="text-center py-12">
        <p className="text-lg font-medium text-gray-300 mb-2">🎯 Première mesure enregistrée !</p>
        <p className="text-gray-400">
          {history[0].followers?.toLocaleString('fr-FR')} followers · Popularité {history[0].popularity}/100
        </p>
        <p className="text-sm mt-4 text-gray-500">
          Le graphique s'affichera dès demain après la prochaine synchronisation (12h00 UTC)
        </p>
      </div>
    );
  }

  // Préparer les données pour les graphiques
  const labels = history.map(h => 
    new Date(h.recorded_at).toLocaleDateString('fr-FR', { 
      day: '2-digit', 
      month: 'short' 
    })
  );

  const followersData = history.map(h => h.followers);
  const popularityData = history.map(h => h.popularity);

  // Configuration du graphique Followers (non utilisé pour l'instant)
  // const followersChartData = {
  //   labels,
  //   datasets: [
  //     {
  //       label: 'Followers',
  //       data: followersData,
  //       borderColor: 'rgb(139, 92, 246)',
  //       backgroundColor: 'rgba(139, 92, 246, 0.1)',
  //       fill: true,
  //       tension: 0.4,
  //       pointRadius: 4,
  //       pointHoverRadius: 6,
  //     },
  //   ],
  // };

  // Configuration du graphique Popularity (non utilisé pour l'instant)
  // const popularityChartData = {
  //   labels,
  //   datasets: [
  //     {
  //       label: 'Popularité',
  //       data: popularityData,
  //       borderColor: 'rgb(236, 72, 153)',
  //       backgroundColor: 'rgba(236, 72, 153, 0.1)',
  //       fill: true,
  //       tension: 0.4,
  //       pointRadius: 4,
  //       pointHoverRadius: 6,
  //     },
  //   ],
  // };

  // Configuration du graphique combiné
  const combinedChartData = {
    labels,
    datasets: [
      {
        label: 'Followers',
        data: followersData,
        borderColor: 'rgb(139, 92, 246)',
        backgroundColor: 'rgba(139, 92, 246, 0.1)',
        fill: true,
        tension: 0.4,
        yAxisID: 'y',
      },
      {
        label: 'Popularité',
        data: popularityData,
        borderColor: 'rgb(236, 72, 153)',
        backgroundColor: 'rgba(236, 72, 153, 0.1)',
        fill: true,
        tension: 0.4,
        yAxisID: 'y1',
      },
    ],
  };

  // Options pour le graphique Followers (non utilisé pour l'instant)
  // const followersOptions = {
  //   responsive: true,
  //   maintainAspectRatio: false,
  //   plugins: {
  //     legend: {
  //       display: false,
  //     },
  //     title: {
  //       display: true,
  //       text: 'Évolution des Followers',
  //       color: '#9ca3af',
  //       font: { size: 14, weight: 'normal' as const },
  //     },
  //     tooltip: {
  //       callbacks: {
  //         label: (context: any) => {
  //           return `${context.parsed.y.toLocaleString('fr-FR')} followers`;
  //         },
  //       },
  //     },
  //   },
  //   scales: {
  //     y: {
  //       beginAtZero: false,
  //       ticks: {
  //         callback: (value: any) => value.toLocaleString('fr-FR'),
  //         color: '#9ca3af',
  //       },
  //       grid: {
  //         color: 'rgba(156, 163, 175, 0.1)',
  //       },
  //     },
  //     x: {
  //       ticks: { color: '#9ca3af' },
  //       grid: {
  //         color: 'rgba(156, 163, 175, 0.1)',
  //       },
  //     },
  //   },
  // };

  // Options pour le graphique Popularity (non utilisé pour l'instant)
  // const popularityOptions = {
  //   responsive: true,
  //   maintainAspectRatio: false,
  //   plugins: {
  //     legend: {
  //       display: false,
  //     },
  //     title: {
  //       display: true,
  //       text: 'Évolution de la Popularité',
  //       color: '#9ca3af',
  //       font: { size: 14, weight: 'normal' as const },
  //     },
  //     tooltip: {
  //       callbacks: {
  //         label: (context: any) => {
  //           return `Popularité: ${context.parsed.y}/100`;
  //         },
  //       },
  //     },
  //   },
  //   scales: {
  //     y: {
  //       beginAtZero: true,
  //       max: 100,
  //       ticks: {
  //         color: '#9ca3af',
  //       },
  //       grid: {
  //         color: 'rgba(156, 163, 175, 0.1)',
  //       },
  //     },
  //     x: {
  //       ticks: { color: '#9ca3af' },
  //       grid: {
  //         color: 'rgba(156, 163, 175, 0.1)',
  //       },
  //     },
  //   },
  // };

  const combinedOptions = {
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
          color: '#9ca3af',
        },
      },
      title: {
        display: true,
        text: 'Évolution Followers & Popularité',
        color: '#9ca3af',
        font: { size: 14, weight: 'normal' as const },
      },
    },
    scales: {
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        title: {
          display: true,
          text: 'Followers',
          color: '#9ca3af',
        },
        ticks: {
          callback: (value: any) => value.toLocaleString('fr-FR'),
          color: '#9ca3af',
        },
        grid: {
          color: 'rgba(156, 163, 175, 0.1)',
        },
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        title: {
          display: true,
          text: 'Popularité',
          color: '#9ca3af',
        },
        max: 100,
        ticks: {
          color: '#9ca3af',
        },
        grid: {
          drawOnChartArea: false,
        },
      },
      x: {
        ticks: { color: '#9ca3af' },
        grid: {
          color: 'rgba(156, 163, 175, 0.1)',
        },
      },
    },
  };

  const periods: { value: Period; label: string }[] = [
    { value: 7, label: '7 jours' },
    { value: 30, label: '1 mois' },
    { value: 90, label: '3 mois' },
    { value: 180, label: '6 mois' },
    { value: 365, label: '1 an' },
    { value: 730, label: '2 ans' },
    { value: 'all', label: 'Tout' },
  ];

  return (
    <div className="space-y-4">
      {/* Sélecteur de période */}
      <div className="flex flex-wrap gap-2 justify-center">
        {periods.map((period) => (
          <button
            key={period.value}
            onClick={() => setSelectedPeriod(period.value)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              selectedPeriod === period.value
                ? 'bg-violet-500 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {period.label}
          </button>
        ))}
      </div>

      {/* Graphique avec 2 lignes */}
      <div style={{ height: '350px' }}>
        <Line data={combinedChartData} options={combinedOptions} />
      </div>
    </div>
  );
}

