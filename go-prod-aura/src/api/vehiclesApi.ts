import { supabase } from '@/lib/supabaseClient';
import type { Vehicle, VehicleFormData } from '@/types/production';

export async function fetchVehiclesByEvent(eventId: string) {
  const { data, error } = await supabase
    .from('vehicles')
    .select('*')
    .eq('event_id', eventId)
    .order('brand', { ascending: true });

  if (error) throw error;
  return data as Vehicle[];
}

export async function fetchVehicleById(id: string) {
  const { data, error } = await supabase
    .from('vehicles')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as Vehicle;
}

export async function createVehicle(eventId: string, formData: VehicleFormData) {
  const payload = {
    event_id: eventId,
    ...formData,
    status: 'available'
  };

  const { data, error } = await supabase
    .from('vehicles')
    .insert([payload])
    .select()
    .single();

  if (error) throw error;
  return data as Vehicle;
}

export async function updateVehicle(id: string, formData: Partial<VehicleFormData>) {
  const { data, error } = await supabase
    .from('vehicles')
    .update(formData)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Vehicle;
}

export async function deleteVehicle(id: string) {
  const { error } = await supabase
    .from('vehicles')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function fetchAvailableVehicles(eventId: string) {
  const { data, error } = await supabase
    .from('vehicles')
    .select('*')
    .eq('event_id', eventId)
    .eq('status', 'available')
    .order('brand', { ascending: true });

  if (error) throw error;
  return data as Vehicle[];
}

