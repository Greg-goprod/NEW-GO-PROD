import { supabase } from '@/lib/supabaseClient';
import type { Driver, DriverFormData } from '@/types/production';

export async function fetchAllDrivers() {
  const { data, error } = await supabase
    .from('drivers')
    .select('*')
    .order('last_name', { ascending: true });

  if (error) throw error;
  return data as Driver[];
}

export async function fetchDriverById(id: string) {
  const { data, error } = await supabase
    .from('drivers')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as Driver;
}

export async function createDriver(formData: DriverFormData) {
  const { data, error } = await supabase
    .from('drivers')
    .insert([formData])
    .select()
    .single();

  if (error) throw error;
  return data as Driver;
}

export async function updateDriver(id: string, formData: Partial<DriverFormData>) {
  const { data, error } = await supabase
    .from('drivers')
    .update(formData)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Driver;
}

export async function deleteDriver(id: string) {
  const { error } = await supabase
    .from('drivers')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function fetchAvailableDrivers() {
  const { data, error } = await supabase
    .from('drivers')
    .select('*')
    .eq('availability_status', 'AVAILABLE')
    .eq('work_status', 'ACTIVE')
    .order('last_name', { ascending: true });

  if (error) throw error;
  return data as Driver[];
}

