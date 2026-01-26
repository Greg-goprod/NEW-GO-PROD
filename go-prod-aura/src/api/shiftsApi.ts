import { supabase } from '@/lib/supabaseClient';
import type { Shift, ShiftDriver, ShiftWithDrivers } from '@/types/production';

export async function fetchShiftsByEvent(eventId: string) {
  const { data, error } = await supabase
    .from('shifts')
    .select('*')
    .eq('event_id', eventId)
    .order('start_datetime', { ascending: true });

  if (error) throw error;
  return data as Shift[];
}

export async function fetchShiftById(id: string) {
  const { data, error } = await supabase
    .from('shifts')
    .select(`
      *,
      shift_drivers (
        id,
        driver_id,
        drivers (
          id,
          first_name,
          last_name,
          email,
          phone
        )
      )
    `)
    .eq('id', id)
    .single();

  if (error) throw error;
  
  const shift = data as any;
  const withDrivers: ShiftWithDrivers = {
    ...shift,
    drivers: (shift.shift_drivers || []).map((sd: any) => sd.drivers)
  };

  return withDrivers;
}

export async function createShift(eventId: string, shiftData: {
  name: string;
  start_datetime: string;
  end_datetime: string;
  color?: string;
}) {
  const payload = {
    event_id: eventId,
    ...shiftData
  };

  const { data, error } = await supabase
    .from('shifts')
    .insert([payload])
    .select()
    .single();

  if (error) throw error;
  return data as Shift;
}

export async function updateShift(id: string, updates: Partial<Shift>) {
  const { data, error } = await supabase
    .from('shifts')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Shift;
}

export async function deleteShift(id: string) {
  const { error } = await supabase
    .from('shifts')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function assignDriverToShift(shiftId: string, driverId: string) {
  const { data, error } = await supabase
    .from('shift_drivers')
    .insert([{ shift_id: shiftId, driver_id: driverId }])
    .select()
    .single();

  if (error) throw error;
  return data as ShiftDriver;
}

export async function removeDriverFromShift(shiftId: string, driverId: string) {
  const { error } = await supabase
    .from('shift_drivers')
    .delete()
    .eq('shift_id', shiftId)
    .eq('driver_id', driverId);

  if (error) throw error;
}

