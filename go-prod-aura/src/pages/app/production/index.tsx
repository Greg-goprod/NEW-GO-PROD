import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { 
  Clapperboard, 
  UserRound, 
  Bus, 
  Hotel, 
  UtensilsCrossed, 
  Users, 
  Calendar, 
  TrendingUp,
  MapPin,
  Clock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { useCurrentEvent } from '@/hooks/useCurrentEvent';
import { PageHeader } from '@/components/aura/PageHeader';
import { fetchTouringPartyByEvent } from '@/api/touringPartyApi';
import { fetchTravelsByEvent } from '@/api/travelsApi';
import { fetchMissionsByEvent } from '@/api/missionsApi';
import { fetchVehiclesByEvent } from '@/api/vehiclesApi';
import { fetchReservationsByEvent } from '@/api/hotelsApi';
import { fetchCateringRequirementsByEvent } from '@/api/cateringApi';

interface StatCard {
  title: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  trend?: string;
}

interface ModuleCard {
  title: string;
  description: string;
  icon: React.ElementType;
  path: string;
  color: string;
}

export default function ProductionPage() {
  const { currentEvent } = useCurrentEvent();
  
  const [stats, setStats] = useState<StatCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadStats = useCallback(async () => {
    if (!currentEvent?.id) return;
    setIsLoading(true);
    try {
      const [
        touringParties,
        travels,
        missions,
        vehicles,
        reservations,
        catering
      ] = await Promise.all([
        fetchTouringPartyByEvent(currentEvent.id),
        fetchTravelsByEvent(currentEvent.id),
        fetchMissionsByEvent(currentEvent.id),
        fetchVehiclesByEvent(currentEvent.id),
        fetchReservationsByEvent(currentEvent.id),
        fetchCateringRequirementsByEvent(currentEvent.id)
      ]);

      const confirmedMissions = missions.filter(m => m.status === 'dispatched').length;
      const confirmedReservations = reservations.filter(r => r.status === 'confirmed').length;
      const totalCatering = catering.reduce((sum, c) => sum + c.count, 0);

      setStats([
        {
          title: 'Artistes',
          value: touringParties.length,
          icon: Users,
          color: 'violet'
        },
        {
          title: 'Transports',
          value: `${missions.length} missions`,
          icon: MapPin,
          color: 'blue',
          trend: `${confirmedMissions} confirmées`
        },
        {
          title: 'Véhicules',
          value: vehicles.length,
          icon: Bus,
          color: 'green'
        },
        {
          title: 'Réservations Hôtels',
          value: reservations.length,
          icon: Hotel,
          color: 'orange',
          trend: `${confirmedReservations} confirmées`
        },
        {
          title: 'Catering',
          value: `${totalCatering} repas`,
          icon: UtensilsCrossed,
          color: 'pink'
        },
        {
          title: 'Voyages',
          value: travels.length,
          icon: Clock,
          color: 'indigo'
        }
      ]);
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentEvent?.id]);

  useEffect(() => {
    if (currentEvent?.id) {
      loadStats();
    }
  }, [currentEvent?.id, loadStats]);

  const modules: ModuleCard[] = [
    {
      title: 'Touring Party',
      description: 'Gestion des groupes d\'artistes, véhicules requis et organisation',
      icon: Users,
      path: '/app/production/touring-party',
      color: 'violet'
    },
    {
      title: 'Travels',
      description: 'Planification des voyages pour artistes et contacts',
      icon: Calendar,
      path: '/app/production/travels',
      color: 'blue'
    },
    {
      title: 'Missions',
      description: 'Coordination des transports, chauffeurs et véhicules',
      icon: MapPin,
      path: '/app/production/missions',
      color: 'indigo'
    },
    {
      title: 'Chauffeurs',
      description: 'Base de données des chauffeurs et leur disponibilité',
      icon: UserRound,
      path: '/app/production/ground/chauffeurs',
      color: 'green'
    },
    {
      title: 'Véhicules',
      description: 'Gestion de la flotte de véhicules pour l\'événement',
      icon: Bus,
      path: '/app/production/ground/vehicules',
      color: 'emerald'
    },
    {
      title: 'Hôtels',
      description: 'Réservations et hébergement pour artistes et équipe',
      icon: Hotel,
      path: '/app/production/hospitality/hotels',
      color: 'orange'
    },
    {
      title: 'Catering',
      description: 'Gestion des besoins en restauration',
      icon: UtensilsCrossed,
      path: '/app/production/hospitality/catering',
      color: 'pink'
    },
    {
      title: 'Party Crew',
      description: 'Équipe événementielle, techniciens et personnel',
      icon: Users,
      path: '/app/production/partycrew',
      color: 'purple'
    }
  ];

  const getColorClasses = (color: string) => {
    const colors: Record<string, { bg: string; text: string; icon: string; hover: string }> = {
      violet: {
        bg: 'bg-violet-50 dark:bg-violet-900/20',
        text: 'text-violet-900 dark:text-violet-200',
        icon: 'text-violet-500',
        hover: 'hover:bg-violet-100 dark:hover:bg-violet-900/30'
      },
      blue: {
        bg: 'bg-blue-50 dark:bg-blue-900/20',
        text: 'text-blue-900 dark:text-blue-200',
        icon: 'text-blue-500',
        hover: 'hover:bg-blue-100 dark:hover:bg-blue-900/30'
      },
      indigo: {
        bg: 'bg-indigo-50 dark:bg-indigo-900/20',
        text: 'text-indigo-900 dark:text-indigo-200',
        icon: 'text-indigo-500',
        hover: 'hover:bg-indigo-100 dark:hover:bg-indigo-900/30'
      },
      green: {
        bg: 'bg-green-50 dark:bg-green-900/20',
        text: 'text-green-900 dark:text-green-200',
        icon: 'text-green-500',
        hover: 'hover:bg-green-100 dark:hover:bg-green-900/30'
      },
      emerald: {
        bg: 'bg-emerald-50 dark:bg-emerald-900/20',
        text: 'text-emerald-900 dark:text-emerald-200',
        icon: 'text-emerald-500',
        hover: 'hover:bg-emerald-100 dark:hover:bg-emerald-900/30'
      },
      orange: {
        bg: 'bg-orange-50 dark:bg-orange-900/20',
        text: 'text-orange-900 dark:text-orange-200',
        icon: 'text-orange-500',
        hover: 'hover:bg-orange-100 dark:hover:bg-orange-900/30'
      },
      pink: {
        bg: 'bg-pink-50 dark:bg-pink-900/20',
        text: 'text-pink-900 dark:text-pink-200',
        icon: 'text-pink-500',
        hover: 'hover:bg-pink-100 dark:hover:bg-pink-900/30'
      },
      purple: {
        bg: 'bg-purple-50 dark:bg-purple-900/20',
        text: 'text-purple-900 dark:text-purple-200',
        icon: 'text-purple-500',
        hover: 'hover:bg-purple-100 dark:hover:bg-purple-900/30'
      }
    };
    return colors[color] || colors.violet;
  };

  if (!currentEvent) {
    return (
      <div className="p-6">
      <PageHeader icon={Clapperboard} title="PRODUCTION" />

        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-2">
            <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-500" />
            <h3 className="font-semibold text-yellow-900 dark:text-yellow-200">
              Aucun événement sélectionné
            </h3>
          </div>
          <p className="text-sm text-yellow-800 dark:text-yellow-300">
            Veuillez sélectionner un événement pour accéder aux fonctionnalités de production.
          </p>
        </div>

        <div className="mt-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Modules disponibles
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {modules.map((module) => {
              const colors = getColorClasses(module.color);
              const Icon = module.icon;
              return (
                <div
                  key={module.path}
                  className={`${colors.bg} ${colors.text} p-6 rounded-lg border border-gray-200 dark:border-gray-700 opacity-50 cursor-not-allowed`}
                >
                  <Icon className={`w-8 h-8 ${colors.icon} mb-3`} />
                  <h3 className="font-semibold mb-1">{module.title}</h3>
                  <p className="text-xs opacity-75">{module.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <PageHeader
        icon={Clapperboard}
        title="PRODUCTION"
        actions={
          <div className="flex items-center gap-2 px-3 py-1 bg-violet-100 dark:bg-violet-900/20 text-violet-800 dark:text-violet-300 rounded-full text-sm font-medium">
            <CheckCircle2 className="w-4 h-4" />
            {currentEvent.name}
          </div>
        }
      />

      {/* Statistiques */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 animate-pulse">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-3"></div>
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          {stats.map((stat, index) => {
            const colors = getColorClasses(stat.color);
            const Icon = stat.icon;
            return (
              <div
                key={index}
                className={`${colors.bg} rounded-lg p-4 border border-gray-200 dark:border-gray-700`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-xs font-medium ${colors.text}`}>{stat.title}</span>
                  <Icon className={`w-4 h-4 ${colors.icon}`} />
                </div>
                <div className={`text-2xl font-bold ${colors.text}`}>{stat.value}</div>
                {stat.trend && (
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {stat.trend}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modules */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Modules de production
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {modules.map((module) => {
            const colors = getColorClasses(module.color);
            const Icon = module.icon;
            return (
              <Link
                key={module.path}
                to={module.path}
                className={`${colors.bg} ${colors.text} ${colors.hover} p-6 rounded-lg border border-gray-200 dark:border-gray-700 transition-all hover:shadow-lg hover:scale-105`}
              >
                <Icon className={`w-8 h-8 ${colors.icon} mb-3`} />
                <h3 className="font-semibold mb-1">{module.title}</h3>
                <p className="text-xs opacity-75">{module.description}</p>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Informations supplémentaires */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-3">
            <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h3 className="font-semibold text-blue-900 dark:text-blue-200">
              Workflow Production
            </h3>
          </div>
          <ol className="space-y-2 text-sm text-blue-800 dark:text-blue-300">
            <li>1. Définir le Touring Party (nombre de personnes, véhicules)</li>
            <li>2. Planifier les Travels (vols, trains, arrivées/départs)</li>
            <li>3. Créer les Missions de transport (sync automatique)</li>
            <li>4. Assigner les Chauffeurs et Véhicules</li>
            <li>5. Réserver les Hôtels</li>
            <li>6. Organiser le Catering</li>
            <li>7. Coordonner la Party Crew</li>
          </ol>
        </div>

        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-3">
            <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
            <h3 className="font-semibold text-green-900 dark:text-green-200">
              Fonctionnalités automatisées
            </h3>
          </div>
          <ul className="space-y-2 text-sm text-green-800 dark:text-green-300">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>Synchronisation Travels → Missions en temps réel</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>Géolocalisation automatique (Nominatim API)</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>Calcul des itinéraires et durées (OpenRouteService)</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>Protection contre les doublons (3 niveaux)</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>Notifications temps réel (Supabase Realtime)</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
