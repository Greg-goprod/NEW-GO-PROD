import { useState, useEffect, useMemo } from 'react';
import { Users2, ChevronDown, ChevronUp, Save } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useCurrentEvent } from '@/hooks/useCurrentEvent';
import { fetchTouringPartyByEvent, upsertTouringParty, fetchTouringPartyStats } from '@/api/touringPartyApi';
import { fetchEventArtists } from '@/api/eventsApi';
import type { ArtistTouringPartyWithDay, VehicleCount, TouringPartyStats } from '@/types/production';
import { Button } from '@/components/aura/Button';
import { PageHeader } from '@/components/aura/PageHeader';
import { Input } from '@/components/aura/Input';

const VEHICLE_TYPES = [
  { key: 'CAR', label: 'Car' },
  { key: 'VAN', label: 'Van' },
  { key: 'VAN_TRAILER', label: 'Van + Trailer' },
  { key: 'TOURBUS', label: 'Tour Bus' },
  { key: 'TOURBUS_TRAILER', label: 'Tour Bus + Trailer' },
  { key: 'TRUCK', label: 'Truck' },
  { key: 'TRUCK_TRAILER', label: 'Truck + Trailer' },
  { key: 'SEMI_TRAILER', label: 'Semi-Trailer' }
] as const;

export default function TouringPartyPage() {
  const { t } = useI18n();
  const { currentEvent } = useCurrentEvent();
  
  const [artists, setArtists] = useState<ArtistTouringPartyWithDay[]>([]);
  const [stats, setStats] = useState<TouringPartyStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDashboardOpen, setIsDashboardOpen] = useState(true);
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
  
  // Temporary state for inputs (debounce)
  const [tempValues, setTempValues] = useState<Record<string, any>>({});

  useEffect(() => {
    if (currentEvent?.id) {
      loadData();
    }
  }, [currentEvent?.id]);

  const loadData = async () => {
    if (!currentEvent?.id) return;
    
    setIsLoading(true);
    try {
      // Charger artistes programmés + touring party
      const [eventArtists, touringData, statsData] = await Promise.all([
        fetchEventArtists(currentEvent.id),
        fetchTouringPartyByEvent(currentEvent.id),
        fetchTouringPartyStats(currentEvent.id)
      ]);

      // Mapper avec performance_date depuis event_artists
      const mapped: ArtistTouringPartyWithDay[] = eventArtists.map((ea: any) => {
        const existing = touringData.find((tp: any) => tp.artist_id === ea.artist_id);
        
        return {
          id: existing?.id || `new-${ea.artist_id}`,
          event_id: currentEvent.id,
          artist_id: ea.artist_id,
          artist_name: ea.artist_name || ea.artists?.name || 'Unknown',
          group_size: existing?.group_size || 0,
          vehicles: existing?.vehicles || [],
          notes: existing?.notes || '',
          special_requirements: existing?.special_requirements || '',
          status: existing?.status || 'todo',
          performance_date: ea.performance_date || ea.event_days?.date,
          day_name: ea.event_days?.name,
          created_at: existing?.created_at || new Date().toISOString(),
          updated_at: existing?.updated_at || new Date().toISOString()
        };
      });

      setArtists(mapped);
      setStats(statsData);
    } catch (error) {
      console.error('Error loading touring party:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Grouper par jour
  const artistsByDay = useMemo(() => {
    const groups: Record<string, ArtistTouringPartyWithDay[]> = {};
    
    artists.forEach(artist => {
      const key = artist.performance_date || 'no_date';
      if (!groups[key]) groups[key] = [];
      groups[key].push(artist);
    });

    return groups;
  }, [artists]);

  // Calculer statut automatiquement
  const calculateStatus = (artist: ArtistTouringPartyWithDay): 'todo' | 'incomplete' | 'completed' => {
    const hasPersons = artist.group_size > 0;
    const hasVehicles = artist.vehicles.some((v: VehicleCount) => v.count > 0);
    
    if (hasPersons && hasVehicles) return 'completed';
    else if (hasPersons || hasVehicles) return 'incomplete';
    else return 'todo';
  };

  // Sauvegarder automatiquement
  const handleSave = async (artist: ArtistTouringPartyWithDay, updates: Partial<ArtistTouringPartyWithDay>) => {
    if (!currentEvent?.id) return;
    
    const key = `${artist.artist_id}`;
    setSavingIds(prev => new Set(prev).add(key));

    try {
      const updatedData = { ...artist, ...updates };
      const newStatus = calculateStatus(updatedData);

      await upsertTouringParty(
        currentEvent.id,
        artist.artist_id,
        {
          group_size: updatedData.group_size,
          vehicles: updatedData.vehicles,
          notes: updatedData.notes,
          special_requirements: updatedData.special_requirements,
          performance_date: artist.performance_date
        }
      );

      // Mettre à jour local
      setArtists(prev => 
        prev.map(a => 
          a.artist_id === artist.artist_id 
            ? { ...a, ...updates, status: newStatus }
            : a
        )
      );

      // Recharger stats
      const newStats = await fetchTouringPartyStats(currentEvent.id);
      setStats(newStats);
    } catch (error) {
      console.error('Error saving touring party:', error);
    } finally {
      setSavingIds(prev => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  };

  // Gérer changement group_size
  const handleGroupSizeChange = (artist: ArtistTouringPartyWithDay, value: string) => {
    const numValue = parseInt(value) || 0;
    setTempValues(prev => ({ ...prev, [`${artist.artist_id}_group_size`]: numValue }));
  };

  const handleGroupSizeBlur = (artist: ArtistTouringPartyWithDay) => {
    const key = `${artist.artist_id}_group_size`;
    const value = tempValues[key];
    
    if (value !== undefined && value !== artist.group_size) {
      handleSave(artist, { group_size: value });
    }
    
    setTempValues(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  // Gérer changement véhicule
  const handleVehicleChange = (artist: ArtistTouringPartyWithDay, vehicleType: string, value: string) => {
    const numValue = parseInt(value) || 0;
    const key = `${artist.artist_id}_vehicle_${vehicleType}`;
    setTempValues(prev => ({ ...prev, [key]: numValue }));
  };

  const handleVehicleBlur = (artist: ArtistTouringPartyWithDay, vehicleType: string) => {
    const key = `${artist.artist_id}_vehicle_${vehicleType}`;
    const value = tempValues[key];
    
    if (value !== undefined) {
      const updatedVehicles = [...artist.vehicles];
      const existingIndex = updatedVehicles.findIndex((v: VehicleCount) => v.type === vehicleType);
      
      if (existingIndex >= 0) {
        updatedVehicles[existingIndex].count = value;
      } else {
        updatedVehicles.push({ type: vehicleType as any, count: value });
      }
      
      // Filtrer les véhicules avec count > 0
      const filtered = updatedVehicles.filter((v: VehicleCount) => v.count > 0);
      
      handleSave(artist, { vehicles: filtered });
    }
    
    setTempValues(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  // Gérer notes
  const handleNotesBlur = (artist: ArtistTouringPartyWithDay, value: string) => {
    if (value !== artist.notes) {
      handleSave(artist, { notes: value });
    }
  };

  // Cycle statut
  const handleStatusClick = async (artist: ArtistTouringPartyWithDay) => {
    const statusCycle: Array<'todo' | 'incomplete' | 'completed'> = ['todo', 'incomplete', 'completed'];
    const currentIndex = statusCycle.indexOf(artist.status);
    const nextStatus = statusCycle[(currentIndex + 1) % statusCycle.length];
    
    handleSave(artist, { status: nextStatus });
  };

  // Badge statut
  const getStatusBadge = (status: string) => {
    const colors = {
      todo: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
      incomplete: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      completed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
    };
    
    return colors[status as keyof typeof colors] || colors.todo;
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500 dark:text-gray-400">Chargement...</div>
        </div>
      </div>
    );
  }

  if (!currentEvent) {
    return (
      <div className="p-6">
        <div className="text-center text-gray-500 dark:text-gray-400 py-12">
          Aucun événement sélectionné
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <PageHeader
        icon={Users2}
        title="TOURING PARTY"
        actions={
          <Button variant="secondary" onClick={loadData}>
            <Save className="w-4 h-4 mr-1" />
            Rafraîchir
          </Button>
        }
      />

      {/* Dashboard Statistiques */}
      {stats && (
        <div className="mb-6">
          <button
            onClick={() => setIsDashboardOpen(!isDashboardOpen)}
            className="w-full flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
          >
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                Statistiques Globales
              </span>
              <div className="flex gap-4 text-xs">
                <span className="text-gray-500 dark:text-gray-400">
                  {stats.total_persons} personnes
                </span>
                <span className="text-gray-500 dark:text-gray-400">
                  {stats.total_vehicles} véhicules
                </span>
                <span className="text-green-600 dark:text-green-400">
                  {stats.completed_count} complétés
                </span>
                <span className="text-yellow-600 dark:text-yellow-400">
                  {stats.incomplete_count} incomplets
                </span>
                <span className="text-gray-600 dark:text-gray-400">
                  {stats.todo_count} à faire
                </span>
              </div>
            </div>
            {isDashboardOpen ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </button>

          {isDashboardOpen && (
            <div className="mt-4 grid grid-cols-5 gap-4">
              <div className="p-4 bg-violet-50 dark:bg-violet-900/20 rounded-lg border border-violet-200 dark:border-violet-800">
                <div className="text-2xl font-bold text-violet-600 dark:text-violet-400">
                  {stats.artists_count}
                </div>
                <div className="text-sm text-violet-700 dark:text-violet-300">Artistes</div>
              </div>
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {stats.total_persons}
                </div>
                <div className="text-sm text-blue-700 dark:text-blue-300">Personnes</div>
              </div>
              <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-200 dark:border-indigo-800">
                <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                  {stats.total_vehicles}
                </div>
                <div className="text-sm text-indigo-700 dark:text-indigo-300">Véhicules</div>
              </div>
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {stats.completed_count}
                </div>
                <div className="text-sm text-green-700 dark:text-green-300">Complétés</div>
              </div>
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                  {stats.incomplete_count}
                </div>
                <div className="text-sm text-yellow-700 dark:text-yellow-300">Incomplets</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Liste artistes groupés par jour */}
      {Object.keys(artistsByDay).length === 0 ? (
        <div className="text-center text-gray-500 dark:text-gray-400 py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          Aucun artiste programmé pour cet événement
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(artistsByDay).map(([date, dayArtists]) => (
            <div key={date}>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {dayArtists[0]?.day_name || date}
              </h2>

              <div className="grid grid-cols-2 gap-4">
                {dayArtists.map((artist) => {
                  const isSaving = savingIds.has(`${artist.artist_id}`);
                  
                  return (
                    <div
                      key={artist.artist_id}
                      className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
                    >
                      {/* Header artiste */}
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-medium text-gray-900 dark:text-white">
                          {artist.artist_name}
                        </h3>
                        <button
                          onClick={() => handleStatusClick(artist)}
                          className={`px-2 py-1 text-xs font-medium rounded-full cursor-pointer transition-colors ${getStatusBadge(artist.status)}`}
                        >
                          {artist.status}
                        </button>
                      </div>

                      {/* Group size */}
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
                          Nombre de personnes
                        </label>
                        <Input
                          type="number"
                          min="0"
                          value={tempValues[`${artist.artist_id}_group_size`] ?? artist.group_size}
                          onChange={(e) => handleGroupSizeChange(artist, e.target.value)}
                          onBlur={() => handleGroupSizeBlur(artist)}
                          placeholder="0"
                        />
                      </div>

                      {/* Véhicules */}
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                          Véhicules
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          {VEHICLE_TYPES.map(({ key, label }) => {
                            const existing = artist.vehicles.find((v: VehicleCount) => v.type === key);
                            const tempKey = `${artist.artist_id}_vehicle_${key}`;
                            
                            return (
                              <div key={key}>
                                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                                  {label}
                                </label>
                                <Input
                                  type="number"
                                  min="0"
                                  value={tempValues[tempKey] ?? existing?.count ?? 0}
                                  onChange={(e) => handleVehicleChange(artist, key, e.target.value)}
                                  onBlur={() => handleVehicleBlur(artist, key)}
                                  placeholder="0"
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Notes */}
                      <div>
                        <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
                          Notes
                        </label>
                        <textarea
                          rows={2}
                          defaultValue={artist.notes || ''}
                          onBlur={(e) => handleNotesBlur(artist, e.target.value)}
                          placeholder="Notes internes..."
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                        />
                      </div>

                      {isSaving && (
                        <div className="mt-2 text-xs text-violet-600 dark:text-violet-400">
                          Sauvegarde...
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
