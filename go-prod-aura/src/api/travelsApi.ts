import { supabase } from '@/lib/supabaseClient';
import type { Travel, TravelWithRelations, TravelFormData } from '@/types/production';

/**
 * Récupérer tous les travels d'un événement
 */
export async function fetchTravelsByEvent(eventId: string) {
  const { data, error } = await supabase
    .from('travels')
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
      )
    `)
    .eq('event_id', eventId)
    .order('scheduled_datetime', { ascending: true });

  if (error) throw error;

  const withRelations: TravelWithRelations[] = data.map((item: any) => ({
    ...item,
    artist_name: item.artists?.name || undefined,
    contact_name: item.crm_contacts 
      ? `${item.crm_contacts.first_name} ${item.crm_contacts.last_name}`
      : undefined
  }));

  return withRelations;
}

/**
 * Récupérer un travel spécifique
 */
export async function fetchTravelById(id: string) {
  const { data, error } = await supabase
    .from('travels')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as Travel;
}

/**
 * Créer un nouveau travel
 */
export async function createTravel(eventId: string, formData: TravelFormData) {
  // Validation : artist_id OU contact_id doit être renseigné
  if (!formData.artist_id && !formData.contact_id) {
    throw new Error('Either artist_id or contact_id must be provided');
  }

  const payload = {
    event_id: eventId,
    artist_id: formData.artist_id || null,
    contact_id: formData.contact_id || null,
    is_arrival: formData.is_arrival,
    travel_type: formData.travel_type,
    scheduled_datetime: formData.scheduled_datetime,
    departure_location: formData.departure_location || null,
    arrival_location: formData.arrival_location || null,
    reference_number: formData.reference_number || null,
    passenger_count: formData.passenger_count || 1,
    notes: formData.notes || null,
    status: 'planned'
  };

  const { data, error } = await supabase
    .from('travels')
    .insert([payload])
    .select()
    .single();

  if (error) throw error;
  return data as Travel;
}

/**
 * Mettre à jour un travel existant
 */
export async function updateTravel(id: string, formData: Partial<TravelFormData>) {
  const payload: any = {};

  if (formData.artist_id !== undefined) payload.artist_id = formData.artist_id || null;
  if (formData.contact_id !== undefined) payload.contact_id = formData.contact_id || null;
  if (formData.is_arrival !== undefined) payload.is_arrival = formData.is_arrival;
  if (formData.travel_type) payload.travel_type = formData.travel_type;
  if (formData.scheduled_datetime) payload.scheduled_datetime = formData.scheduled_datetime;
  if (formData.departure_location !== undefined) payload.departure_location = formData.departure_location || null;
  if (formData.arrival_location !== undefined) payload.arrival_location = formData.arrival_location || null;
  if (formData.reference_number !== undefined) payload.reference_number = formData.reference_number || null;
  if (formData.passenger_count !== undefined) payload.passenger_count = formData.passenger_count;
  if (formData.notes !== undefined) payload.notes = formData.notes || null;

  const { data, error } = await supabase
    .from('travels')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Travel;
}

/**
 * Supprimer un travel
 */
export async function deleteTravel(id: string) {
  const { error } = await supabase
    .from('travels')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

/**
 * Marquer un travel comme effectué (actual_datetime)
 */
export async function markTravelAsCompleted(id: string, actualDatetime: string) {
  const { data, error } = await supabase
    .from('travels')
    .update({ 
      actual_datetime: actualDatetime,
      status: 'completed'
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Travel;
}

/**
 * Récupérer les travels "suisses" (utilisés pour sync missions)
 */
export async function fetchSwissTravels(eventId: string) {
  const swissCodes = ['GVA', 'Geneva', 'Genève', 'ZUR', 'Zurich', 'ZRH', 'BSL', 'Basel', 'Bâle', 'Lausanne', 'gare', 'Vallorbe', 'Bern', 'Berne', 'Sion'];

  const { data, error } = await supabase
    .from('travels')
    .select('*')
    .eq('event_id', eventId);

  if (error) throw error;

  // Filtrer côté client pour recherche flexible
  const filtered = (data as Travel[]).filter((travel) => {
    const searchLocation = travel.is_arrival 
      ? (travel.arrival_location || '')
      : (travel.departure_location || '');
    
    return swissCodes.some(code => 
      searchLocation.toUpperCase().includes(code.toUpperCase())
    );
  });

  return filtered;
}

