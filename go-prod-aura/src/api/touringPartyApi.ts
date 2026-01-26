import { supabase } from '@/lib/supabaseClient';
import type { 
  ArtistTouringParty, 
  ArtistTouringPartyWithArtist,
  TouringPartyFormData,
  VehicleCount 
} from '@/types/production';

/**
 * Récupérer la touring party complète d'un événement
 */
export async function fetchTouringPartyByEvent(eventId: string) {
  const { data, error } = await supabase
    .from('artist_touring_party')
    .select(`
      *,
      artists (
        id,
        name
      )
    `)
    .eq('event_id', eventId)
    .order('performance_date', { ascending: true });

  if (error) throw error;

  const withArtists: ArtistTouringPartyWithArtist[] = data.map((item: any) => ({
    ...item,
    artist_name: item.artists?.name || 'Unknown Artist',
    vehicles: Array.isArray(item.vehicles) ? item.vehicles : []
  }));

  return withArtists;
}

/**
 * Récupérer une entrée touring party spécifique
 */
export async function fetchTouringPartyById(id: string) {
  const { data, error } = await supabase
    .from('artist_touring_party')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as ArtistTouringParty;
}

/**
 * Upsert (créer ou mettre à jour) une entrée touring party
 */
export async function upsertTouringParty(
  eventId: string,
  artistId: string,
  data: Partial<TouringPartyFormData> & { performance_date?: string }
) {
  // Calculer le statut automatiquement
  const hasPersons = (data.group_size || 0) > 0;
  const hasVehicles = (data.vehicles || []).some((v: VehicleCount) => v.count > 0);
  
  let status: 'todo' | 'incomplete' | 'completed';
  if (hasPersons && hasVehicles) {
    status = 'completed';
  } else if (hasPersons || hasVehicles) {
    status = 'incomplete';
  } else {
    status = 'todo';
  }

  const payload = {
    event_id: eventId,
    artist_id: artistId,
    group_size: data.group_size ?? 1,
    vehicles: JSON.stringify(data.vehicles ?? []),
    notes: data.notes ?? null,
    special_requirements: data.special_requirements ?? null,
    status,
    performance_date: data.performance_date ?? null
  };

  const { data: result, error } = await supabase
    .from('artist_touring_party')
    .upsert(payload, {
      onConflict: 'event_id,artist_id'
    })
    .select()
    .single();

  if (error) throw error;
  return result as ArtistTouringParty;
}

/**
 * Mettre à jour le statut d'une entrée touring party
 */
export async function updateTouringPartyStatus(
  id: string,
  status: 'todo' | 'incomplete' | 'completed'
) {
  const { data, error } = await supabase
    .from('artist_touring_party')
    .update({ status })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as ArtistTouringParty;
}

/**
 * Supprimer une entrée touring party
 */
export async function deleteTouringParty(id: string) {
  const { error } = await supabase
    .from('artist_touring_party')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

/**
 * Récupérer les statistiques touring party pour un événement
 */
export async function fetchTouringPartyStats(eventId: string) {
  const { data, error } = await supabase
    .from('artist_touring_party')
    .select('group_size, vehicles, status')
    .eq('event_id', eventId);

  if (error) throw error;

  const stats = {
    total_persons: 0,
    total_vehicles: 0,
    completed_count: 0,
    incomplete_count: 0,
    todo_count: 0,
    artists_count: data.length
  };

  data.forEach((item: any) => {
    stats.total_persons += item.group_size || 0;
    
    const vehicles = Array.isArray(item.vehicles) ? item.vehicles : [];
    vehicles.forEach((v: VehicleCount) => {
      stats.total_vehicles += v.count || 0;
    });

    if (item.status === 'completed') stats.completed_count++;
    else if (item.status === 'incomplete') stats.incomplete_count++;
    else stats.todo_count++;
  });

  return stats;
}

