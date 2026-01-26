import { useState, useEffect } from 'react';
import { MapPin, RefreshCw, Calendar, User, Car, Check, Loader2 } from 'lucide-react';
import { useCurrentEvent } from '@/hooks/useCurrentEvent';
import { supabase } from '@/lib/supabaseClient';
import {
  fetchMissionsByEvent,
  updateMissionStatus,
  dispatchMission,
  syncTravelsToMissions,
  geocodeLocation,
  calculateRoute
} from '@/api/missionsApi';
import { fetchAvailableDrivers } from '@/api/driversApi';
import { fetchAvailableVehicles } from '@/api/vehiclesApi';
import type { Mission, MissionWithRelations } from '@/types/production';
import { Button } from '@/components/aura/Button';
import { Input } from '@/components/aura/Input';
import { Modal } from '@/components/aura/Modal';

export default function MissionsPage() {
  const { currentEvent } = useCurrentEvent();
  
  const [missions, setMissions] = useState<MissionWithRelations[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Planning Modal
  const [planningMission, setPlanningMission] = useState<Mission | null>(null);
  const [pickupSearch, setPickupSearch] = useState('');
  const [dropoffSearch, setDropoffSearch] = useState('');
  const [pickupResults, setPickupResults] = useState<any[]>([]);
  const [dropoffResults, setDropoffResults] = useState<any[]>([]);
  const [isCalculating, setIsCalculating] = useState(false);
  const [planningFormData, setPlanningFormData] = useState<Partial<Mission>>({});
  
  // Dispatch Modal
  const [dispatchingMission, setDispatchingMission] = useState<Mission | null>(null);
  const [availableDrivers, setAvailableDrivers] = useState<any[]>([]);
  const [availableVehicles, setAvailableVehicles] = useState<any[]>([]);
  const [selectedDriver, setSelectedDriver] = useState<string | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null);

  useEffect(() => {
    if (currentEvent?.id) {
      loadData();
      setupRealtimeListener();
    }
    
    return () => {
      // Cleanup subscription
    };
  }, [currentEvent?.id]);

  const loadData = async () => {
    if (!currentEvent?.id) return;
    
    setIsLoading(true);
    try {
      const missionsData = await fetchMissionsByEvent(currentEvent.id);
      setMissions(missionsData);
    } catch (error) {
      console.error('Error loading missions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Écoute Realtime sur travels
  const setupRealtimeListener = () => {
    if (!currentEvent?.id) return;

    const channel = supabase
      .channel('travels-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'travels',
          filter: `event_id=eq.${currentEvent.id}`
        },
        async (payload) => {
          console.log('🆕 Nouveau travel détecté:', payload.new);
          // Reload missions après un court délai
          setTimeout(() => {
            loadData();
          }, 1000);
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  };

  const handleSync = async () => {
    if (!currentEvent?.id || isSyncing) return;
    
    setIsSyncing(true);
    try {
      await syncTravelsToMissions(currentEvent.id);
      await loadData();
    } catch (error) {
      console.error('Error syncing:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  // Planning
  const handleOpenPlanning = (mission: Mission) => {
    setPlanningMission(mission);
    setPlanningFormData({
      pickup_location: mission.pickup_location,
      pickup_latitude: mission.pickup_latitude,
      pickup_longitude: mission.pickup_longitude,
      pickup_datetime: mission.pickup_datetime,
      dropoff_location: mission.dropoff_location,
      dropoff_latitude: mission.dropoff_latitude,
      dropoff_longitude: mission.dropoff_longitude,
      dropoff_datetime: mission.dropoff_datetime,
      passenger_count: mission.passenger_count,
      luggage_count: mission.luggage_count,
      notes: mission.notes
    });
    setPickupSearch(mission.pickup_location || '');
    setDropoffSearch(mission.dropoff_location || '');
  };

  const handleClosePlanning = () => {
    setPlanningMission(null);
    setPlanningFormData({});
    setPickupResults([]);
    setDropoffResults([]);
  };

  const handleGeocode = async (query: string, type: 'pickup' | 'dropoff') => {
    if (!query || query.length < 3) return;
    
    try {
      const results = await geocodeLocation(query);
      if (type === 'pickup') {
        setPickupResults(results);
      } else {
        setDropoffResults(results);
      }
    } catch (error) {
      console.error('Geocoding error:', error);
    }
  };

  const handleSelectLocation = (result: any, type: 'pickup' | 'dropoff') => {
    if (type === 'pickup') {
      setPlanningFormData({
        ...planningFormData,
        pickup_location: result.display_name,
        pickup_latitude: parseFloat(result.lat),
        pickup_longitude: parseFloat(result.lon)
      });
      setPickupSearch(result.display_name);
      setPickupResults([]);
    } else {
      setPlanningFormData({
        ...planningFormData,
        dropoff_location: result.display_name,
        dropoff_latitude: parseFloat(result.lat),
        dropoff_longitude: parseFloat(result.lon)
      });
      setDropoffSearch(result.display_name);
      setDropoffResults([]);
    }
  };

  const handleCalculateDuration = async () => {
    if (
      !planningFormData.pickup_latitude ||
      !planningFormData.pickup_longitude ||
      !planningFormData.dropoff_latitude ||
      !planningFormData.dropoff_longitude ||
      !planningFormData.pickup_datetime
    ) {
      return;
    }
    
    setIsCalculating(true);
    try {
      const route = await calculateRoute(
        planningFormData.pickup_latitude,
        planningFormData.pickup_longitude,
        planningFormData.dropoff_latitude,
        planningFormData.dropoff_longitude
      );
      
      if (route) {
        const pickupDate = new Date(planningFormData.pickup_datetime);
        const dropoffDate = new Date(pickupDate.getTime() + route.duration * 60 * 1000);
        
        setPlanningFormData({
          ...planningFormData,
          estimated_duration_minutes: route.duration,
          dropoff_datetime: dropoffDate.toISOString()
        });
      }
    } catch (error) {
      console.error('Routing error:', error);
    } finally {
      setIsCalculating(false);
    }
  };

  const handleSavePlanning = async () => {
    if (!planningMission?.id) return;
    
    try {
      await updateMissionStatus(planningMission.id, 'planned');
      await loadData();
      handleClosePlanning();
    } catch (error) {
      console.error('Error saving planning:', error);
    }
  };

  // Dispatch
  const handleOpenDispatch = async (mission: Mission) => {
    setDispatchingMission(mission);
    
    try {
      const [drivers, vehicles] = await Promise.all([
        fetchAvailableDrivers(),
        fetchAvailableVehicles(currentEvent?.id || '')
      ]);
      
      setAvailableDrivers(drivers);
      setAvailableVehicles(vehicles);
      
      // Pré-sélectionner si déjà assigné
      if (mission.driver_id) setSelectedDriver(mission.driver_id);
      if (mission.vehicle_id) setSelectedVehicle(mission.vehicle_id);
    } catch (error) {
      console.error('Error loading dispatch data:', error);
    }
  };

  const handleCloseDispatch = () => {
    setDispatchingMission(null);
    setSelectedDriver(null);
    setSelectedVehicle(null);
  };

  const handleSaveDispatch = async () => {
    if (!dispatchingMission?.id || !selectedDriver || !selectedVehicle) return;
    
    try {
      await dispatchMission(dispatchingMission.id, selectedDriver, selectedVehicle);
      await loadData();
      handleCloseDispatch();
    } catch (error) {
      console.error('Error dispatching mission:', error);
    }
  };

  const missionsToПлан = missions.filter(m => m.status === 'unplanned' || m.status === 'draft');
  const missionsToDispatch = missions.filter(m => m.status === 'planned' || m.status === 'dispatched');

  const getStatusBadge = (status: string) => {
    const colors = {
      unplanned: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
      draft: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      planned: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      dispatched: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
    };
    
    return colors[status as keyof typeof colors] || colors.unplanned;
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
      <header className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-violet-400" />
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
            MISSIONS
          </h1>
        </div>
        <Button
          variant="primary"
          onClick={handleSync}
          disabled={isSyncing}
        >
          {isSyncing ? (
            <>
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              Synchronisation...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4 mr-1" />
              Synchroniser travels
            </>
          )}
        </Button>
      </header>

      {/* 2 colonnes */}
      <div className="grid grid-cols-2 gap-6">
        {/* Colonne 1 : À planifier */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            À planifier ({missionsToПлан.length})
          </h2>
          
          {missionsToПлан.length === 0 ? (
            <div className="text-center text-gray-500 dark:text-gray-400 py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              Aucune mission à planifier
            </div>
          ) : (
            <div className="space-y-3">
              {missionsToПлан.map((mission) => (
                <div
                  key={mission.id}
                  className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-violet-300 dark:hover:border-violet-700 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 dark:text-white mb-1">
                        {mission.artist_name || mission.contact_name || 'Mission manuelle'}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {mission.travel_reference && (
                          <span className="mr-2">✈️ {mission.travel_reference}</span>
                        )}
                        <span>{mission.passenger_count} pax</span>
                      </div>
                    </div>
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(mission.status)}`}>
                      {mission.status}
                    </span>
                  </div>

                  <div className="space-y-2 mb-3">
                    <div className="flex items-start gap-2 text-sm">
                      <MapPin className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <div className="text-gray-900 dark:text-gray-100">
                        {mission.pickup_location}
                      </div>
                    </div>
                    <div className="flex items-start gap-2 text-sm">
                      <MapPin className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                      <div className="text-gray-900 dark:text-gray-100">
                        {mission.dropoff_location}
                      </div>
                    </div>
                    <div className="flex items-start gap-2 text-sm">
                      <Calendar className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                      <div className="text-gray-500 dark:text-gray-400">
                        {new Date(mission.pickup_datetime).toLocaleString('fr-FR', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                  </div>

                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleOpenPlanning(mission)}
                    className="w-full"
                  >
                    Planifier
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Colonne 2 : À dispatcher */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            À dispatcher ({missionsToDispatch.length})
          </h2>
          
          {missionsToDispatch.length === 0 ? (
            <div className="text-center text-gray-500 dark:text-gray-400 py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              Aucune mission à dispatcher
            </div>
          ) : (
            <div className="space-y-3">
              {missionsToDispatch.map((mission) => (
                <div
                  key={mission.id}
                  className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-violet-300 dark:hover:border-violet-700 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 dark:text-white mb-1">
                        {mission.artist_name || mission.contact_name || 'Mission manuelle'}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        <span>{mission.passenger_count} pax</span>
                        {mission.estimated_duration_minutes && (
                          <span className="ml-2">⏱️ {mission.estimated_duration_minutes} min</span>
                        )}
                      </div>
                    </div>
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(mission.status)}`}>
                      {mission.status}
                    </span>
                  </div>

                  <div className="space-y-2 mb-3">
                    <div className="flex items-start gap-2 text-sm">
                      <MapPin className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <div className="text-gray-900 dark:text-gray-100 truncate">
                        {mission.pickup_location}
                      </div>
                    </div>
                    <div className="flex items-start gap-2 text-sm">
                      <MapPin className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                      <div className="text-gray-900 dark:text-gray-100 truncate">
                        {mission.dropoff_location}
                      </div>
                    </div>
                    <div className="flex items-start gap-2 text-sm">
                      <Calendar className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                      <div className="text-gray-500 dark:text-gray-400">
                        {new Date(mission.pickup_datetime).toLocaleString('fr-FR', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                    
                    {mission.driver_name && (
                      <div className="flex items-start gap-2 text-sm">
                        <User className="w-4 h-4 text-violet-600 mt-0.5 flex-shrink-0" />
                        <div className="text-gray-900 dark:text-gray-100">
                          {mission.driver_name}
                        </div>
                      </div>
                    )}
                    
                    {mission.vehicle_name && (
                      <div className="flex items-start gap-2 text-sm">
                        <Car className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                        <div className="text-gray-900 dark:text-gray-100">
                          {mission.vehicle_name}
                        </div>
                      </div>
                    )}
                  </div>

                  <Button
                    variant={mission.status === 'dispatched' ? 'secondary' : 'primary'}
                    size="sm"
                    onClick={() => handleOpenDispatch(mission)}
                    className="w-full"
                  >
                    {mission.status === 'dispatched' ? 'Modifier' : 'Dispatcher'}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Planning Modal */}
      <Modal
        open={planningMission !== null}
        onClose={handleClosePlanning}
        title="Planifier la mission"
        widthClass="max-w-4xl"
      >
        {planningMission && (
          <div className="p-6 space-y-4">
            {/* Pickup */}
            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
                Lieu de départ
              </label>
              <Input
                type="text"
                value={pickupSearch}
                onChange={(e) => {
                  setPickupSearch(e.target.value);
                  handleGeocode(e.target.value, 'pickup');
                }}
                placeholder="Rechercher une adresse..."
              />
              {pickupResults.length > 0 && (
                <div className="mt-2 max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg">
                  {pickupResults.map((result, index) => (
                    <button
                      key={index}
                      onClick={() => handleSelectLocation(result, 'pickup')}
                      className="w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 text-sm text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700 last:border-0"
                    >
                      {result.display_name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Dropoff */}
            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
                Lieu d'arrivée
              </label>
              <Input
                type="text"
                value={dropoffSearch}
                onChange={(e) => {
                  setDropoffSearch(e.target.value);
                  handleGeocode(e.target.value, 'dropoff');
                }}
                placeholder="Rechercher une adresse..."
              />
              {dropoffResults.length > 0 && (
                <div className="mt-2 max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg">
                  {dropoffResults.map((result, index) => (
                    <button
                      key={index}
                      onClick={() => handleSelectLocation(result, 'dropoff')}
                      className="w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 text-sm text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700 last:border-0"
                    >
                      {result.display_name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Datetime */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
                  Date/heure départ
                </label>
                <Input
                  type="datetime-local"
                  value={planningFormData.pickup_datetime ? new Date(planningFormData.pickup_datetime).toISOString().slice(0, 16) : ''}
                  onChange={(e) => setPlanningFormData({ ...planningFormData, pickup_datetime: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
                  Date/heure arrivée (estimée)
                </label>
                <Input
                  type="datetime-local"
                  value={planningFormData.dropoff_datetime ? new Date(planningFormData.dropoff_datetime).toISOString().slice(0, 16) : ''}
                  onChange={(e) => setPlanningFormData({ ...planningFormData, dropoff_datetime: e.target.value })}
                  disabled
                />
              </div>
            </div>

            {/* Calculate */}
            <div className="flex justify-center">
              <Button
                variant="secondary"
                onClick={handleCalculateDuration}
                disabled={isCalculating || !planningFormData.pickup_latitude || !planningFormData.dropoff_latitude}
              >
                {isCalculating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    Calcul en cours...
                  </>
                ) : (
                  <>
                    Calculer la durée
                  </>
                )}
              </Button>
            </div>

            {planningFormData.estimated_duration_minutes && (
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="text-sm text-blue-700 dark:text-blue-300">
                  Durée estimée : {planningFormData.estimated_duration_minutes} minutes
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button variant="ghost" onClick={handleClosePlanning}>
                Annuler
              </Button>
              <Button
                variant="primary"
                onClick={handleSavePlanning}
                disabled={!planningFormData.pickup_latitude || !planningFormData.dropoff_latitude}
              >
                <Check className="w-4 h-4 mr-1" />
                Enregistrer
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Dispatch Modal */}
      <Modal
        open={dispatchingMission !== null}
        onClose={handleCloseDispatch}
        title="Dispatcher la mission"
        widthClass="max-w-3xl"
      >
        {dispatchingMission && (
          <div className="p-6 space-y-6">
            {/* Chauffeur */}
            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                Chauffeur
              </label>
              <div className="max-h-48 overflow-y-auto space-y-2 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                {availableDrivers.map((driver) => (
                  <label
                    key={driver.id}
                    className="flex items-center gap-2 p-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded cursor-pointer"
                  >
                    <input
                      type="radio"
                      name="driver"
                      checked={selectedDriver === driver.id}
                      onChange={() => setSelectedDriver(driver.id)}
                      className="w-4 h-4 border-gray-300 text-violet-600 focus:ring-violet-500"
                    />
                    <span className="text-sm text-gray-900 dark:text-gray-100">
                      {driver.first_name} {driver.last_name}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Véhicule */}
            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                Véhicule
              </label>
              <div className="max-h-48 overflow-y-auto space-y-2 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                {availableVehicles.map((vehicle) => (
                  <label
                    key={vehicle.id}
                    className="flex items-center gap-2 p-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded cursor-pointer"
                  >
                    <input
                      type="radio"
                      name="vehicle"
                      checked={selectedVehicle === vehicle.id}
                      onChange={() => setSelectedVehicle(vehicle.id)}
                      className="w-4 h-4 border-gray-300 text-violet-600 focus:ring-violet-500"
                    />
                    <span className="text-sm text-gray-900 dark:text-gray-100">
                      {vehicle.brand} {vehicle.model} ({vehicle.type})
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button variant="ghost" onClick={handleCloseDispatch}>
                Annuler
              </Button>
              <Button
                variant="primary"
                onClick={handleSaveDispatch}
                disabled={!selectedDriver || !selectedVehicle}
              >
                <Check className="w-4 h-4 mr-1" />
                Dispatcher
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}