// =============================================================================
// API pour la gestion des campagnes de recrutement (STAFF_CAMPAIGNS)
// =============================================================================

import { supabase } from '../lib/supabaseClient';
import type {
  StaffCampaign,
  StaffCampaignWithRelations,
  StaffCampaignInput,
  StaffCampaignApplication,
  StaffCampaignApplicationWithRelations,
} from '../types/staff';

// ─────────────────────────────────────────────────────────────────────────────
// Récupérer toutes les campagnes
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchCampaigns(): Promise<StaffCampaignWithRelations[]> {
  const { data, error } = await supabase
    .from('staff_campaigns')
    .select(`
      *,
      target_event:events(id, name, start_date, end_date, status)
    `)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

// ─────────────────────────────────────────────────────────────────────────────
// Récupérer une campagne par ID
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchCampaignById(id: string): Promise<StaffCampaignWithRelations> {
  const { data, error } = await supabase
    .from('staff_campaigns')
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
// Créer une campagne
// ─────────────────────────────────────────────────────────────────────────────

export async function createCampaign(input: StaffCampaignInput): Promise<StaffCampaign> {
  const { data, error } = await supabase
    .from('staff_campaigns')
    .insert({
      target_event_id: input.target_event_id || null,
      title: input.title,
      description: input.description || null,
      status: input.status || 'draft',
      start_date: input.start_date ? input.start_date.toISOString() : null,
      end_date: input.end_date ? input.end_date.toISOString() : null,
      custom_questions: input.custom_questions || null,
      is_public: input.is_public !== undefined ? input.is_public : false,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ─────────────────────────────────────────────────────────────────────────────
// Mettre à jour une campagne
// ─────────────────────────────────────────────────────────────────────────────

export async function updateCampaign(
  id: string,
  input: Partial<StaffCampaignInput>
): Promise<StaffCampaign> {
  const updateData: any = {};

  if (input.target_event_id !== undefined) updateData.target_event_id = input.target_event_id;
  if (input.title !== undefined) updateData.title = input.title;
  if (input.description !== undefined) updateData.description = input.description;
  if (input.status !== undefined) updateData.status = input.status;
  if (input.start_date !== undefined) {
    updateData.start_date = input.start_date ? input.start_date.toISOString() : null;
  }
  if (input.end_date !== undefined) {
    updateData.end_date = input.end_date ? input.end_date.toISOString() : null;
  }
  if (input.custom_questions !== undefined) updateData.custom_questions = input.custom_questions;
  if (input.is_public !== undefined) updateData.is_public = input.is_public;

  const { data, error } = await supabase
    .from('staff_campaigns')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ─────────────────────────────────────────────────────────────────────────────
// Supprimer une campagne
// ─────────────────────────────────────────────────────────────────────────────

export async function deleteCampaign(id: string): Promise<void> {
  const { error } = await supabase.from('staff_campaigns').delete().eq('id', id);
  if (error) throw error;
}

// ═════════════════════════════════════════════════════════════════════════════
// CANDIDATURES AUX CAMPAGNES
// ═════════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────────
// Récupérer toutes les candidatures d'une campagne
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchCampaignApplications(
  campaignId: string
): Promise<StaffCampaignApplicationWithRelations[]> {
  const { data, error } = await supabase
    .from('staff_campaign_applications')
    .select(`
      *,
      campaign:staff_campaigns(*),
      volunteer:staff_volunteers(*)
    `)
    .eq('campaign_id', campaignId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

// ─────────────────────────────────────────────────────────────────────────────
// Mettre à jour le statut d'une candidature
// ─────────────────────────────────────────────────────────────────────────────

export async function updateApplicationStatus(
  id: string,
  status: 'pending' | 'approved' | 'rejected',
  notes?: string
): Promise<StaffCampaignApplication> {
  const { data, error } = await supabase
    .from('staff_campaign_applications')
    .update({
      status,
      notes: notes || null,
      reviewed_at: new Date().toISOString(),
      // reviewed_by sera géré par un trigger ou RLS si on a accès au user_id
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}










