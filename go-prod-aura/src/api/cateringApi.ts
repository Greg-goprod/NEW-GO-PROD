import { supabase } from '@/lib/supabaseClient';
import type { 
  CateringRequirement, 
  CateringRequirementWithArtist,
  CateringVoucher,
  CateringVoucherWithRelations,
  MealType 
} from '@/types/production';

// ============================================================================
// CATERING REQUIREMENTS
// ============================================================================

export async function fetchCateringRequirementsByEvent(eventId: string) {
  const { data, error } = await supabase
    .from('catering_requirements')
    .select(`
      *,
      artists (
        id,
        name
      )
    `)
    .eq('event_id', eventId)
    .order('meal_type', { ascending: true });

  if (error) throw error;

  const withArtists: CateringRequirementWithArtist[] = data.map((item: any) => ({
    ...item,
    artist_name: item.artists?.name || 'Unknown Artist'
  }));

  return withArtists;
}

export async function createCateringRequirement(
  eventId: string,
  artistId: string,
  mealType: MealType,
  count: number,
  specialDiet?: string[],
  notes?: string
) {
  const payload = {
    event_id: eventId,
    artist_id: artistId,
    meal_type: mealType,
    count,
    special_diet: specialDiet || [],
    notes: notes || null,
    status: 'pending'
  };

  const { data, error } = await supabase
    .from('catering_requirements')
    .insert([payload])
    .select()
    .single();

  if (error) throw error;
  return data as CateringRequirement;
}

export async function updateCateringRequirement(
  id: string,
  updates: Partial<CateringRequirement>
) {
  const { data, error } = await supabase
    .from('catering_requirements')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as CateringRequirement;
}

export async function deleteCateringRequirement(id: string) {
  const { error } = await supabase
    .from('catering_requirements')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// ============================================================================
// CATERING VOUCHERS
// ============================================================================

export async function fetchVouchersByEvent(eventId: string) {
  const { data, error } = await supabase
    .from('catering_vouchers')
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
    .order('created_at', { ascending: false });

  if (error) throw error;

  const withRelations: CateringVoucherWithRelations[] = data.map((item: any) => ({
    ...item,
    artist_name: item.artists?.name || undefined,
    contact_name: item.crm_contacts
      ? `${item.crm_contacts.first_name} ${item.crm_contacts.last_name}`
      : undefined
  }));

  return withRelations;
}

export async function createVoucher(
  eventId: string,
  code: string,
  artistId?: string,
  contactId?: string,
  mealType?: string,
  value?: number
) {
  const payload = {
    event_id: eventId,
    code,
    artist_id: artistId || null,
    contact_id: contactId || null,
    meal_type: mealType || null,
    value: value || null,
    is_used: false
  };

  const { data, error } = await supabase
    .from('catering_vouchers')
    .insert([payload])
    .select()
    .single();

  if (error) throw error;
  return data as CateringVoucher;
}

export async function markVoucherAsUsed(id: string, scannedBy?: string) {
  const updates = {
    is_used: true,
    used_at: new Date().toISOString(),
    scanned_by: scannedBy || null
  };

  const { data, error } = await supabase
    .from('catering_vouchers')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as CateringVoucher;
}

export async function deleteVoucher(id: string) {
  const { error } = await supabase
    .from('catering_vouchers')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

