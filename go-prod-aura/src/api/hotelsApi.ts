import { supabase } from '@/lib/supabaseClient';
import type { 
  Hotel, 
  HotelReservation, 
  HotelReservationWithRelations,
  HotelReservationFormData 
} from '@/types/production';

// ============================================================================
// HOTELS
// ============================================================================

export async function fetchAllHotels() {
  const { data, error } = await supabase
    .from('hotels')
    .select('*')
    .eq('is_active', true)
    .order('name', { ascending: true });

  if (error) throw error;
  return data as Hotel[];
}

export async function fetchHotelById(id: string) {
  const { data, error } = await supabase
    .from('hotels')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as Hotel;
}

export async function createHotel(hotelData: Omit<Hotel, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase
    .from('hotels')
    .insert([hotelData])
    .select()
    .single();

  if (error) throw error;
  return data as Hotel;
}

export async function updateHotel(id: string, updates: Partial<Hotel>) {
  const { data, error } = await supabase
    .from('hotels')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Hotel;
}

export async function deleteHotel(id: string) {
  const { error } = await supabase
    .from('hotels')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// ============================================================================
// RESERVATIONS
// ============================================================================

export async function fetchReservationsByEvent(eventId: string) {
  const { data, error } = await supabase
    .from('hotel_reservations')
    .select(`
      *,
      hotels (
        id,
        name,
        city
      ),
      artists (
        id,
        name
      ),
      crm_contacts (
        id,
        first_name,
        last_name
      ),
      hotel_room_types (
        id,
        category
      )
    `)
    .eq('event_id', eventId)
    .order('check_in_date', { ascending: true });

  if (error) throw error;

  const withRelations: HotelReservationWithRelations[] = data.map((item: any) => ({
    ...item,
    hotel_name: item.hotels?.name || undefined,
    artist_name: item.artists?.name || undefined,
    contact_name: item.crm_contacts
      ? `${item.crm_contacts.first_name} ${item.crm_contacts.last_name}`
      : undefined,
    room_category: item.hotel_room_types?.category || undefined
  }));

  return withRelations;
}

export async function fetchReservationById(id: string) {
  const { data, error } = await supabase
    .from('hotel_reservations')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as HotelReservation;
}

export async function createReservation(
  eventId: string,
  formData: HotelReservationFormData
) {
  if (!formData.artist_id && !formData.contact_id) {
    throw new Error('Either artist_id or contact_id must be provided');
  }

  const payload = {
    event_id: eventId,
    ...formData,
    status: 'pending'
  };

  const { data, error } = await supabase
    .from('hotel_reservations')
    .insert([payload])
    .select()
    .single();

  if (error) throw error;
  return data as HotelReservation;
}

export async function updateReservation(
  id: string,
  updates: Partial<HotelReservationFormData>
) {
  const { data, error } = await supabase
    .from('hotel_reservations')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as HotelReservation;
}

export async function deleteReservation(id: string) {
  const { error } = await supabase
    .from('hotel_reservations')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function confirmReservation(id: string) {
  const updates = {
    status: 'confirmed' as const,
    confirmed_at: new Date().toISOString()
  };

  return updateReservation(id, updates);
}

