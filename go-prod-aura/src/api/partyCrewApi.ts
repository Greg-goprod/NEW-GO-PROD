import { supabase } from '@/lib/supabaseClient';
import type { PartyCrew } from '@/types/production';

export async function fetchAllPartyCrew() {
  const { data, error } = await supabase
    .from('party_crew')
    .select('*')
    .eq('is_active', true)
    .order('last_name', { ascending: true });

  if (error) throw error;
  return data as PartyCrew[];
}

export async function fetchPartyCrewById(id: string) {
  const { data, error } = await supabase
    .from('party_crew')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as PartyCrew;
}

export async function createPartyCrew(crewData: Omit<PartyCrew, 'id' | 'created_at' | 'updated_at'>) {
  const payload = {
    ...crewData,
    currency: crewData.currency || 'CHF',
    is_active: true
  };

  const { data, error } = await supabase
    .from('party_crew')
    .insert([payload])
    .select()
    .single();

  if (error) throw error;
  return data as PartyCrew;
}

export async function updatePartyCrew(id: string, updates: Partial<PartyCrew>) {
  const { data, error } = await supabase
    .from('party_crew')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as PartyCrew;
}

export async function deletePartyCrew(id: string) {
  const { error } = await supabase
    .from('party_crew')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function fetchPartyCrewByRole(role: string) {
  const { data, error } = await supabase
    .from('party_crew')
    .select('*')
    .eq('role', role)
    .eq('is_active', true)
    .order('last_name', { ascending: true });

  if (error) throw error;
  return data as PartyCrew[];
}

