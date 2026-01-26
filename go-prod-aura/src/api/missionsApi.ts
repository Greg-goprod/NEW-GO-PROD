import { supabase } from '@/lib/supabaseClient';
import type { 
  Mission, 
  MissionWithRelations, 
  MissionFormData,
  GeocodingResult,
  RoutingResult 
} from '@/types/production';

// ============================================================================
// CRUD MISSIONS
// ============================================================================

/**
 * Récupérer toutes les missions d'un événement
 */
export async function fetchMissionsByEvent(eventId: string) {
  const { data, error } = await supabase
    .from('missions')
    .select(`
      *,
      artists (
        id,
        name
      ),
      crm_contacts (
        id,
        first_name,
        last_name
      ),
      drivers (
        id,
        first_name,
        last_name
      ),
      vehicles (
        id,
        brand,
        model,
        type
      ),
      travels (
        id,
        reference_number,
        travel_type
      )
    `)
    .eq('event_id', eventId)
    .order('pickup_datetime', { ascending: true });

  if (error) throw error;

  const withRelations: MissionWithRelations[] = data.map((item: any) => ({
    ...item,
    artist_name: item.artists?.name || undefined,
    contact_name: item.crm_contacts 
      ? `${item.crm_contacts.first_name} ${item.crm_contacts.last_name}`
      : undefined,
    driver_name: item.drivers
      ? `${item.drivers.first_name} ${item.drivers.last_name}`
      : undefined,
    vehicle_name: item.vehicles
      ? `${item.vehicles.brand} ${item.vehicles.model}`
      : undefined,
    travel_reference: item.travels?.reference_number || undefined
  }));

  return withRelations;
}

/**
 * Récupérer une mission spécifique
 */
export async function fetchMissionById(id: string) {
  const { data, error } = await supabase
    .from('missions')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as Mission;
}

/**
 * Créer une nouvelle mission
 */
export async function createMission(eventId: string, formData: MissionFormData) {
  const payload = {
    event_id: eventId,
    travel_id: formData.travel_id || null,
    artist_id: formData.artist_id || null,
    contact_id: formData.contact_id || null,
    pickup_location: formData.pickup_location,
    pickup_latitude: formData.pickup_latitude || null,
    pickup_longitude: formData.pickup_longitude || null,
    pickup_datetime: formData.pickup_datetime,
    dropoff_location: formData.dropoff_location,
    dropoff_latitude: formData.dropoff_latitude || null,
    dropoff_longitude: formData.dropoff_longitude || null,
    dropoff_datetime: formData.dropoff_datetime || null,
    passenger_count: formData.passenger_count || 1,
    luggage_count: formData.luggage_count || 0,
    notes: formData.notes || null,
    status: 'unplanned'
  };

  const { data, error } = await supabase
    .from('missions')
    .insert([payload])
    .select()
    .single();

  if (error) throw error;
  return data as Mission;
}

/**
 * Mettre à jour une mission existante
 */
export async function updateMission(id: string, updates: Partial<Mission>) {
  const { data, error } = await supabase
    .from('missions')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Mission;
}

/**
 * Supprimer une mission
 */
export async function deleteMission(id: string) {
  const { error } = await supabase
    .from('missions')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

/**
 * Mettre à jour le statut d'une mission
 */
export async function updateMissionStatus(
  id: string, 
  status: 'unplanned' | 'draft' | 'planned' | 'dispatched'
) {
  return updateMission(id, { status });
}

/**
 * Dispatcher une mission (assigner driver + vehicle)
 */
export async function dispatchMission(
  id: string,
  driverId: string,
  vehicleId: string
) {
  const updates = {
    driver_id: driverId,
    vehicle_id: vehicleId,
    status: 'dispatched' as const
  };

  return updateMission(id, updates);
}

// ============================================================================
// SYNC TRAVELS → MISSIONS
// ============================================================================

/**
 * Extraire le nom de ville d'une localisation complète
 */
export function extractCityFromLocation(location: string): string {
  // Détection de codes aéroports
  const airportMatch = location.match(/\b(GVA|ZRH|ZUR|BSL|BRN)\b/i);
  if (airportMatch) {
    const code = airportMatch[1].toUpperCase();
    const cityMap: Record<string, string> = {
      'GVA': 'Genève Aéroport',
      'ZRH': 'Zurich Aéroport',
      'ZUR': 'Zurich Aéroport',
      'BSL': 'Basel Aéroport',
      'BRN': 'Bern Aéroport'
    };
    return cityMap[code] || location;
  }

  // Extraction de ville depuis format "Ville, Pays" ou "Ville"
  const parts = location.split(',');
  return parts[0].trim() || location;
}

/**
 * Nettoyer les missions en doublon (basé sur travel_id)
 */
export async function cleanupDuplicateMissions(eventId: string) {
  try {
    // Récupérer toutes les missions avec travel_id
    const { data: missions, error } = await supabase
      .from('missions')
      .select('id, travel_id, created_at')
      .eq('event_id', eventId)
      .not('travel_id', 'is', null)
      .order('created_at', { ascending: true });

    if (error) throw error;
    if (!missions || missions.length === 0) return;

    // Grouper par travel_id
    const grouped = missions.reduce((acc: Record<string, any[]>, mission: any) => {
      const key = mission.travel_id;
      if (!acc[key]) acc[key] = [];
      acc[key].push(mission);
      return acc;
    }, {});

    // Supprimer les doublons (garder le plus ancien)
    const toDelete: string[] = [];
    for (const travelId in grouped) {
      const duplicates = grouped[travelId];
      if (duplicates.length > 1) {
        // Garder le premier, supprimer les autres
        toDelete.push(...duplicates.slice(1).map((m: any) => m.id));
      }
    }

    if (toDelete.length > 0) {
      const { error: deleteError } = await supabase
        .from('missions')
        .delete()
        .in('id', toDelete);

      if (deleteError) throw deleteError;
      console.log(`✅ Supprimé ${toDelete.length} mission(s) en doublon`);
    }
  } catch (err) {
    console.error('Erreur cleanup doublons:', err);
  }
}

/**
 * Synchroniser travels suisses → missions
 */
export async function syncTravelsToMissions(eventId: string) {
  try {
    // 1. Cleanup doublons
    await cleanupDuplicateMissions(eventId);

    // 2. Codes suisses pour filtrage
    const swissCodes = [
      'GVA', 'Geneva', 'Genève', 'Geneve',
      'ZUR', 'Zurich', 'ZRH',
      'BSL', 'Basel', 'Bâle', 'Bale',
      'Lausanne', 'gare', 'Vallorbe',
      'Bern', 'Berne', 'Sion', 'Fribourg'
    ];

    // 3. Récupérer tous les travels de l'événement
    const { data: travels, error: travelsError } = await supabase
      .from('travels')
      .select('*')
      .eq('event_id', eventId);

    if (travelsError) throw travelsError;
    if (!travels || travels.length === 0) return [];

    // 4. Filtrer travels suisses
    const swissTravels = travels.filter((travel: any) => {
      const searchLocation = travel.is_arrival
        ? (travel.arrival_location || '')
        : (travel.departure_location || '');
      
      return swissCodes.some(code => 
        searchLocation.toUpperCase().includes(code.toUpperCase())
      );
    });

    // 5. Récupérer missions existantes avec travel_id
    const { data: existingMissions, error: missionsError } = await supabase
      .from('missions')
      .select('travel_id')
      .not('travel_id', 'is', null);

    if (missionsError) throw missionsError;

    const existingTravelIds = new Set(
      (existingMissions || []).map((m: any) => m.travel_id)
    );

    // 6. Créer missions manquantes
    const createdMissions: Mission[] = [];

    for (const travel of swissTravels) {
      if (existingTravelIds.has(travel.id)) continue;

      // Double vérification (race condition)
      const { data: check } = await supabase
        .from('missions')
        .select('id')
        .eq('travel_id', travel.id)
        .limit(1);

      if (check && check.length > 0) continue;

      const isPickupMission = travel.is_arrival;

      const missionData = {
        event_id: eventId,
        travel_id: travel.id,
        artist_id: travel.artist_id || null,
        contact_id: travel.contact_id || null,
        pickup_location: isPickupMission
          ? extractCityFromLocation(travel.arrival_location || '')
          : 'Base',
        pickup_datetime: travel.scheduled_datetime,
        dropoff_location: !isPickupMission
          ? extractCityFromLocation(travel.departure_location || '')
          : 'Destination',
        dropoff_datetime: travel.scheduled_datetime,
        passenger_count: Math.max(1, Math.floor(travel.passenger_count || 1)),
        luggage_count: 0,
        status: 'unplanned' as const,
        notes: `Généré depuis travel: ${travel.travel_type}`
      };

      const { data: created, error: insertError } = await supabase
        .from('missions')
        .insert([missionData])
        .select()
        .single();

      if (!insertError && created) {
        createdMissions.push(created as Mission);
      }
    }

    console.log(`✅ Synchronisation: ${createdMissions.length} nouvelle(s) mission(s) créée(s)`);
    return createdMissions;
  } catch (err) {
    console.error('Erreur sync travels→missions:', err);
    throw err;
  }
}

// ============================================================================
// GEOCODING & ROUTING (APIs EXTERNES)
// ============================================================================

/**
 * Geocoder une adresse via Nominatim (OpenStreetMap)
 */
export async function geocodeLocation(query: string): Promise<GeocodingResult[]> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&countrycodes=ch&accept-language=fr`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'GoProduction/1.0'
      }
    });

    if (!response.ok) {
      throw new Error('Geocoding failed');
    }

    const data = await response.json();
    
    return data.map((item: any) => ({
      display_name: item.display_name,
      lat: item.lat,
      lon: item.lon,
      type: item.type,
      importance: item.importance
    }));
  } catch (err) {
    console.error('Geocoding error:', err);
    return [];
  }
}

/**
 * Calculer l'itinéraire et la durée via OpenRouteService
 */
export async function calculateRoute(
  startLat: number,
  startLon: number,
  endLat: number,
  endLon: number
): Promise<RoutingResult | null> {
  try {
    const API_KEY = '5b3ce3597851110001cf6248a77a8a7fa3b54de5b7af4b8b9e3b8b0f';
    const url = `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${API_KEY}&start=${startLon},${startLat}&end=${endLon},${endLat}`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error('Routing failed');
    }

    const data = await response.json();

    if (!data.features || data.features.length === 0) {
      return null;
    }

    const summary = data.features[0].properties.summary;

    return {
      duration: Math.ceil(summary.duration / 60), // minutes
      distance: Math.round(summary.distance / 1000 * 10) / 10 // km
    };
  } catch (err) {
    console.error('Routing error:', err);
    return null;
  }
}

/**
 * Planifier une mission (géocodage + calcul durée)
 */
export async function planMission(
  missionId: string,
  pickupLocation: string,
  dropoffLocation: string,
  pickupDatetime: string
) {
  try {
    // Geocoder pickup
    const pickupResults = await geocodeLocation(pickupLocation);
    if (pickupResults.length === 0) {
      throw new Error('Impossible de géocoder le point de départ');
    }

    const pickupGeo = pickupResults[0];

    // Geocoder dropoff
    const dropoffResults = await geocodeLocation(dropoffLocation);
    if (dropoffResults.length === 0) {
      throw new Error('Impossible de géocoder le point d\'arrivée');
    }

    const dropoffGeo = dropoffResults[0];

    // Calculer itinéraire
    const route = await calculateRoute(
      parseFloat(pickupGeo.lat),
      parseFloat(pickupGeo.lon),
      parseFloat(dropoffGeo.lat),
      parseFloat(dropoffGeo.lon)
    );

    if (!route) {
      throw new Error('Impossible de calculer l\'itinéraire');
    }

    // Calculer dropoff_datetime
    const pickupDate = new Date(pickupDatetime);
    const dropoffDate = new Date(pickupDate.getTime() + route.duration * 60 * 1000);

    // Mettre à jour la mission
    const updates = {
      pickup_location: pickupGeo.display_name,
      pickup_latitude: parseFloat(pickupGeo.lat),
      pickup_longitude: parseFloat(pickupGeo.lon),
      dropoff_location: dropoffGeo.display_name,
      dropoff_latitude: parseFloat(dropoffGeo.lat),
      dropoff_longitude: parseFloat(dropoffGeo.lon),
      dropoff_datetime: dropoffDate.toISOString(),
      estimated_duration_minutes: route.duration,
      status: 'planned' as const
    };

    return updateMission(missionId, updates);
  } catch (err) {
    console.error('Erreur planification mission:', err);
    throw err;
  }
}

