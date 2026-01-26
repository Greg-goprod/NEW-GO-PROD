import { supabase } from '@/lib/supabaseClient';
import type {
  StaffVolunteer,
  StaffVolunteerWithRelations,
  StaffVolunteerInput,
} from '@/types/staff';

/**
 * Récupérer tous les bénévoles
 */
export async function fetchVolunteers(): Promise<StaffVolunteerWithRelations[]> {
  const { data, error } = await supabase
    .from('staff_volunteers')
    .select(`
      *,
      status:staff_volunteer_statuses!staff_volunteers_status_id_fkey(*),
      departments:staff_departments(*),
      sectors:staff_sectors(*, department:staff_departments(*))
    `)
    .order('last_name', { ascending: true })
    .order('first_name', { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Récupérer un bénévole par ID
 */
export async function fetchVolunteerById(id: string): Promise<StaffVolunteerWithRelations> {
  const { data, error} = await supabase
    .from('staff_volunteers')
    .select(`
      *,
      status:staff_volunteer_statuses!staff_volunteers_status_id_fkey(*),
      departments:staff_departments(*),
      sectors:staff_sectors(*, department:staff_departments(*))
    `)
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Créer un bénévole
 */
export async function createVolunteer(input: StaffVolunteerInput): Promise<StaffVolunteer> {
  const { data, error } = await supabase
    .from('staff_volunteers')
    .insert({
      first_name: input.first_name,
      last_name: input.last_name,
      email: input.email,
      phone: input.phone || null,
      status_id: input.status_id,
      department_ids: input.department_ids || [],
      sector_ids: input.sector_ids || [],
      notes_internal: input.notes_internal || null,
      notes_public: input.notes_public || null,
      is_active: input.is_active !== undefined ? input.is_active : true,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Mettre à jour un bénévole
 */
export async function updateVolunteer(
  id: string,
  input: Partial<StaffVolunteerInput>
): Promise<StaffVolunteer> {
  const updateData: Partial<StaffVolunteer> = {};

  if (input.first_name !== undefined) updateData.first_name = input.first_name;
  if (input.last_name !== undefined) updateData.last_name = input.last_name;
  if (input.email !== undefined) updateData.email = input.email;
  if (input.phone !== undefined) updateData.phone = input.phone;
  if (input.status_id !== undefined) updateData.status_id = input.status_id;
  if (input.department_ids !== undefined) updateData.department_ids = input.department_ids;
  if (input.sector_ids !== undefined) updateData.sector_ids = input.sector_ids;
  if (input.notes_internal !== undefined) updateData.notes_internal = input.notes_internal;
  if (input.notes_public !== undefined) updateData.notes_public = input.notes_public;
  if (input.is_active !== undefined) updateData.is_active = input.is_active;

  const { data, error } = await supabase
    .from('staff_volunteers')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Supprimer un bénévole
 */
export async function deleteVolunteer(id: string): Promise<void> {
  const { error } = await supabase
    .from('staff_volunteers')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

/**
 * Recherche multi-critères
 */
export async function searchVolunteers(filters: {
  search?: string;
  status_id?: string;
  department_ids?: string[];
  sector_ids?: string[];
  is_active?: boolean;
}): Promise<StaffVolunteerWithRelations[]> {
  let query = supabase
    .from('staff_volunteers')
    .select(`
      *,
      status:staff_volunteer_statuses!staff_volunteers_status_id_fkey(*),
      departments:staff_departments(*),
      sectors:staff_sectors(*, department:staff_departments(*))
    `);

  // Recherche textuelle (nom, prénom, email)
  if (filters.search) {
    query = query.or(
      `first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`
    );
  }

  // Filtre par statut
  if (filters.status_id) {
    query = query.eq('status_id', filters.status_id);
  }

  // Filtre par état actif/inactif
  if (filters.is_active !== undefined) {
    query = query.eq('is_active', filters.is_active);
  }

  query = query.order('last_name', { ascending: true });
  query = query.order('first_name', { ascending: true });

  const { data, error } = await query;
  if (error) throw error;

  let results = data || [];

  // Filtrage côté client pour les arrays
  if (filters.department_ids && filters.department_ids.length > 0) {
    results = results.filter((v) =>
      filters.department_ids!.some((did) => v.department_ids.includes(did))
    );
  }

  if (filters.sector_ids && filters.sector_ids.length > 0) {
    results = results.filter((v) =>
      filters.sector_ids!.some((sid) => v.sector_ids.includes(sid))
    );
  }

  return results;
}

