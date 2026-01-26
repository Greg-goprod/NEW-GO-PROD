// =============================================================================
// API pour la gestion des communications (STAFF_COMMUNICATIONS)
// =============================================================================

import { supabase } from '../lib/supabaseClient';
import type {
  StaffCommunication,
  StaffCommunicationWithRelations,
  StaffCommunicationInput,
} from '../types/staff';

// ─────────────────────────────────────────────────────────────────────────────
// Récupérer toutes les communications
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchCommunications(): Promise<StaffCommunicationWithRelations[]> {
  const { data, error } = await supabase
    .from('staff_communications')
    .select(`
      *,
      target_event:events(id, name, start_date, end_date, status)
    `)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

// ─────────────────────────────────────────────────────────────────────────────
// Récupérer une communication par ID
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchCommunicationById(
  id: string
): Promise<StaffCommunicationWithRelations> {
  const { data, error } = await supabase
    .from('staff_communications')
    .select(`
      *,
      target_event:events(id, name, start_date, end_date, status)
    `)
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

// ─────────────────────────────────────────────────────────────────────────────
// Créer une communication
// ─────────────────────────────────────────────────────────────────────────────

export async function createCommunication(
  input: StaffCommunicationInput
): Promise<StaffCommunication> {
  const { data, error } = await supabase
    .from('staff_communications')
    .insert({
      target_event_id: input.target_event_id || null,
      title: input.title,
      content: input.content,
      template_id: input.template_id || null,
      target_type: input.target_type || 'all',
      target_ids: input.target_ids || null,
      status: input.status || 'draft',
      recipient_count: 0,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ─────────────────────────────────────────────────────────────────────────────
// Mettre à jour une communication
// ─────────────────────────────────────────────────────────────────────────────

export async function updateCommunication(
  id: string,
  input: Partial<StaffCommunicationInput>
): Promise<StaffCommunication> {
  const updateData: any = {};

  if (input.target_event_id !== undefined) updateData.target_event_id = input.target_event_id;
  if (input.title !== undefined) updateData.title = input.title;
  if (input.content !== undefined) updateData.content = input.content;
  if (input.template_id !== undefined) updateData.template_id = input.template_id;
  if (input.target_type !== undefined) updateData.target_type = input.target_type;
  if (input.target_ids !== undefined) updateData.target_ids = input.target_ids;
  if (input.status !== undefined) updateData.status = input.status;

  const { data, error } = await supabase
    .from('staff_communications')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ─────────────────────────────────────────────────────────────────────────────
// Supprimer une communication
// ─────────────────────────────────────────────────────────────────────────────

export async function deleteCommunication(id: string): Promise<void> {
  const { error } = await supabase.from('staff_communications').delete().eq('id', id);
  if (error) throw error;
}

// ─────────────────────────────────────────────────────────────────────────────
// Marquer une communication comme envoyée
// ─────────────────────────────────────────────────────────────────────────────

export async function markCommunicationAsSent(
  id: string,
  recipientCount: number
): Promise<StaffCommunication> {
  const { data, error } = await supabase
    .from('staff_communications')
    .update({
      status: 'sent',
      sent_at: new Date().toISOString(),
      recipient_count: recipientCount,
      // sent_by sera géré par un trigger ou RLS si on a accès au user_id
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}










