// =============================================================================
// API pour la gestion des shifts (STAFF_SHIFTS)
// =============================================================================

import { supabase } from '../lib/supabaseClient';
import type {
  StaffShift,
  StaffShiftWithRelations,
  StaffShiftInput,
  StaffShiftAssignment,
  StaffShiftAssignmentInput,
  StaffShiftAssignmentWithRelations,
} from '../types/staff';

// ─────────────────────────────────────────────────────────────────────────────
// Récupérer tous les shifts
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchShifts(): Promise<StaffShiftWithRelations[]> {
  const { data, error } = await supabase
    .from('staff_shifts')
    .select(`
      *,
      event:events(id, name, start_date, end_date, status),
      department:staff_departments(*),
      sector:staff_sectors(*),
      category:staff_categories(*)
    `)
    .order('shift_date', { ascending: true })
    .order('start_time', { ascending: true });

  if (error) throw error;
  return data || [];
}

// ─────────────────────────────────────────────────────────────────────────────
// Récupérer les shifts d'un événement
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchShiftsByEvent(eventId: string): Promise<StaffShiftWithRelations[]> {
  const { data, error } = await supabase
    .from('staff_shifts')
    .select(`
      *,
      event:events(id, name, start_date, end_date, status),
      department:staff_departments(*),
      sector:staff_sectors(*),
      category:staff_categories(*)
    `)
    .eq('event_id', eventId)
    .order('shift_date', { ascending: true })
    .order('start_time', { ascending: true });

  if (error) throw error;
  return data || [];
}

// ─────────────────────────────────────────────────────────────────────────────
// Récupérer un shift par ID
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchShiftById(id: string): Promise<StaffShiftWithRelations> {
  const { data, error } = await supabase
    .from('staff_shifts')
    .select(`
      *,
      event:events(id, name, start_date, end_date, status),
      department:staff_departments(*),
      sector:staff_sectors(*),
      category:staff_categories(*)
    `)
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

// ─────────────────────────────────────────────────────────────────────────────
// Créer un shift
// ─────────────────────────────────────────────────────────────────────────────

export async function createShift(input: StaffShiftInput): Promise<StaffShift> {
  const { data, error } = await supabase
    .from('staff_shifts')
    .insert({
      event_id: input.event_id,
      department_id: input.department_id,
      sector_id: input.sector_id || null,
      category_id: input.category_id || null,
      title: input.title,
      description: input.description || null,
      location: input.location || null,
      color: input.color || '#713DFF',
      shift_date: input.shift_date.toISOString().split('T')[0],
      start_time: input.start_time,
      end_time: input.end_time,
      places_total: input.places_total || 0,
      places_filled: 0,
      unlimited_places: input.unlimited_places || false,
      notes_public: input.notes_public || null,
      notes_internal: input.notes_internal || null,
      is_active: input.is_active !== undefined ? input.is_active : true,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ─────────────────────────────────────────────────────────────────────────────
// Mettre à jour un shift
// ─────────────────────────────────────────────────────────────────────────────

export async function updateShift(
  id: string,
  input: Partial<StaffShiftInput>
): Promise<StaffShift> {
  const updateData: any = {};

  if (input.department_id !== undefined) updateData.department_id = input.department_id;
  if (input.sector_id !== undefined) updateData.sector_id = input.sector_id;
  if (input.category_id !== undefined) updateData.category_id = input.category_id;
  if (input.title !== undefined) updateData.title = input.title;
  if (input.description !== undefined) updateData.description = input.description;
  if (input.location !== undefined) updateData.location = input.location;
  if (input.color !== undefined) updateData.color = input.color;
  if (input.shift_date !== undefined) {
    updateData.shift_date = input.shift_date.toISOString().split('T')[0];
  }
  if (input.start_time !== undefined) updateData.start_time = input.start_time;
  if (input.end_time !== undefined) updateData.end_time = input.end_time;
  if (input.places_total !== undefined) updateData.places_total = input.places_total;
  if (input.unlimited_places !== undefined) updateData.unlimited_places = input.unlimited_places;
  if (input.notes_public !== undefined) updateData.notes_public = input.notes_public;
  if (input.notes_internal !== undefined) updateData.notes_internal = input.notes_internal;
  if (input.is_active !== undefined) updateData.is_active = input.is_active;

  const { data, error } = await supabase
    .from('staff_shifts')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ─────────────────────────────────────────────────────────────────────────────
// Supprimer un shift
// ─────────────────────────────────────────────────────────────────────────────

export async function deleteShift(id: string): Promise<void> {
  const { error } = await supabase
    .from('staff_shifts')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// ═════════════════════════════════════════════════════════════════════════════
// AFFECTATIONS DE SHIFTS
// ═════════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────────
// Récupérer les affectations d'un shift
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchShiftAssignments(
  shiftId: string
): Promise<StaffShiftAssignmentWithRelations[]> {
  const { data, error } = await supabase
    .from('staff_shift_assignments')
    .select(`
      *,
      shift:staff_shifts(*),
      volunteer:staff_volunteers(*)
    `)
    .eq('shift_id', shiftId)
    .order('assigned_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

// ─────────────────────────────────────────────────────────────────────────────
// Récupérer toutes les affectations d'un bénévole
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchVolunteerAssignments(
  volunteerId: string
): Promise<StaffShiftAssignmentWithRelations[]> {
  const { data, error } = await supabase
    .from('staff_shift_assignments')
    .select(`
      *,
      shift:staff_shifts(*, event:events(id, name, start_date, end_date, status)),
      volunteer:staff_volunteers(*)
    `)
    .eq('volunteer_id', volunteerId)
    .order('assigned_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

// ─────────────────────────────────────────────────────────────────────────────
// Créer une affectation
// ─────────────────────────────────────────────────────────────────────────────

export async function createShiftAssignment(
  input: StaffShiftAssignmentInput
): Promise<StaffShiftAssignment> {
  // 1. Creer l'affectation
  const { data, error } = await supabase
    .from('staff_shift_assignments')
    .insert({
      shift_id: input.shift_id,
      volunteer_id: input.volunteer_id,
      status: input.status || 'assigned',
      notes: input.notes || null,
    })
    .select()
    .single();

  if (error) throw error;

  // 2. Incrementer places_filled si le statut est 'confirmed'
  if (data.status === 'confirmed') {
    await incrementShiftPlacesFilled(input.shift_id);
  }

  return data;
}

// ─────────────────────────────────────────────────────────────────────────────
// Mettre à jour une affectation
// ─────────────────────────────────────────────────────────────────────────────

export async function updateShiftAssignment(
  id: string,
  input: Partial<StaffShiftAssignmentInput>
): Promise<StaffShiftAssignment> {
  // Récupérer l'ancien statut
  const { data: oldData } = await supabase
    .from('staff_shift_assignments')
    .select('status, shift_id')
    .eq('id', id)
    .single();

  const updateData: any = {};
  if (input.status !== undefined) updateData.status = input.status;
  if (input.notes !== undefined) updateData.notes = input.notes;

  const { data, error } = await supabase
    .from('staff_shift_assignments')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;

  // Gérer les changements de statut et places_filled
  if (oldData && input.status !== undefined && input.status !== oldData.status) {
    const oldStatus = oldData.status;
    const newStatus = input.status;

    if (oldStatus !== 'confirmed' && newStatus === 'confirmed') {
      // Passage à confirmed : incrémenter
      await incrementShiftPlacesFilled(oldData.shift_id);
    } else if (oldStatus === 'confirmed' && newStatus !== 'confirmed') {
      // Sortie de confirmed : décrémenter
      await decrementShiftPlacesFilled(oldData.shift_id);
    }
  }

  return data;
}

// ─────────────────────────────────────────────────────────────────────────────
// Supprimer une affectation
// ─────────────────────────────────────────────────────────────────────────────

export async function deleteShiftAssignment(id: string): Promise<void> {
  // Récupérer le statut avant suppression pour décrémenter si nécessaire
  const { data: assignment } = await supabase
    .from('staff_shift_assignments')
    .select('status, shift_id')
    .eq('id', id)
    .single();

  const { error } = await supabase
    .from('staff_shift_assignments')
    .delete()
    .eq('id', id);

  if (error) throw error;

  // Décrémenter si l'affectation était confirmée
  if (assignment && assignment.status === 'confirmed') {
    await decrementShiftPlacesFilled(assignment.shift_id);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers pour gérer places_filled
// ─────────────────────────────────────────────────────────────────────────────

async function incrementShiftPlacesFilled(shiftId: string): Promise<void> {
  const { error } = await supabase.rpc('increment_shift_places_filled', {
    shift_id: shiftId,
  });

  if (error) {
    // Si la fonction RPC n'existe pas, on fait un UPDATE manuel
    const { data: shift } = await supabase
      .from('staff_shifts')
      .select('places_filled')
      .eq('id', shiftId)
      .single();

    if (shift) {
      await supabase
        .from('staff_shifts')
        .update({ places_filled: shift.places_filled + 1 })
        .eq('id', shiftId);
    }
  }
}

async function decrementShiftPlacesFilled(shiftId: string): Promise<void> {
  const { error } = await supabase.rpc('decrement_shift_places_filled', {
    shift_id: shiftId,
  });

  if (error) {
    // Si la fonction RPC n'existe pas, on fait un UPDATE manuel
    const { data: shift } = await supabase
      .from('staff_shifts')
      .select('places_filled')
      .eq('id', shiftId)
      .single();

    if (shift && shift.places_filled > 0) {
      await supabase
        .from('staff_shifts')
        .update({ places_filled: shift.places_filled - 1 })
        .eq('id', shiftId);
    }
  }
}










