import { supabase } from "@/lib/supabaseClient";

// =====================================================
// TYPES
// =====================================================

export interface OfferClause {
  id: string;
  company_id: string;
  key: string | null;
  title: string;
  body: string;
  locale: string;
  category: string | null;
  default_enabled: boolean;
  sort_order?: number | null;
  created_at?: string;
  updated_at?: string;
}

export interface ExclusivityPreset {
  id: string;
  company_id: string;
  name: string;
  region: string | null;
  perimeter_km: number | null;
  days_before: number | null;
  days_after: number | null;
  penalty_note: string | null;
  sort_order?: number | null;
  created_at?: string;
  updated_at?: string;
}

export interface OfferPayment {
  id: string;
  offer_id: string;
  label: string;
  due_offset_days: number | null;
  due_date: string | null;
  amount: number | null;
  currency?: string | null;
  percentage: number | null;
  is_milestone: boolean;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  paid_at: string | null;
  is_paid?: boolean;
  created_at?: string;
}

// =====================================================
// CLAUSES PERSONNALISÉES (offer_clauses)
// =====================================================

export async function listOfferClauses(companyId: string): Promise<OfferClause[]> {
  const buildQuery = () =>
    supabase
      .from('offer_clauses')
      .select('*')
      .eq('company_id', companyId);

  const { data, error } = await buildQuery()
    .order('sort_order', { ascending: true, nullsFirst: true })
    .order('title', { ascending: true });

  if (error) {
    if (error.code === '42703') {
      const fallback = await buildQuery()
        .order('category', { ascending: true })
        .order('title', { ascending: true });
      if (fallback.error) throw fallback.error;
      return fallback.data || [];
    }
    throw error;
  }
  return data || [];
}

export async function getOfferClause(id: string): Promise<OfferClause> {
  const { data, error } = await supabase
    .from('offer_clauses')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

export async function createOfferClause(
  companyId: string,
  payload: Omit<OfferClause, 'id' | 'company_id' | 'created_at' | 'updated_at'>
): Promise<OfferClause> {
  const { data, error } = await supabase
    .from('offer_clauses')
    .insert({
      company_id: companyId,
      ...payload,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateOfferClause(
  id: string,
  payload: Partial<Omit<OfferClause, 'id' | 'company_id' | 'created_at' | 'updated_at'>>
): Promise<OfferClause> {
  const { data, error } = await supabase
    .from('offer_clauses')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteOfferClause(id: string): Promise<void> {
  const { error } = await supabase
    .from('offer_clauses')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// =====================================================
// PRESETS D'EXCLUSIVITÉ (exclusivity_presets)
// =====================================================

export async function listExclusivityPresets(companyId: string): Promise<ExclusivityPreset[]> {
  const buildQuery = () =>
    supabase
      .from('exclusivity_presets')
      .select('*')
      .eq('company_id', companyId);

  const { data, error } = await buildQuery()
    .order('sort_order', { ascending: true, nullsFirst: true })
    .order('name', { ascending: true });

  if (error) {
    if (error.code === '42703') {
      const fallback = await buildQuery().order('name', { ascending: true });
      if (fallback.error) throw fallback.error;
      return fallback.data || [];
    }
    throw error;
  }
  return data || [];
}

export async function getExclusivityPreset(id: string): Promise<ExclusivityPreset> {
  const { data, error } = await supabase
    .from('exclusivity_presets')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

export async function createExclusivityPreset(
  companyId: string,
  payload: Omit<ExclusivityPreset, 'id' | 'company_id' | 'created_at' | 'updated_at'>
): Promise<ExclusivityPreset> {
  const { data, error } = await supabase
    .from('exclusivity_presets')
    .insert({
      company_id: companyId,
      ...payload,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateExclusivityPreset(
  id: string,
  payload: Partial<Omit<ExclusivityPreset, 'id' | 'company_id' | 'created_at' | 'updated_at'>>
): Promise<ExclusivityPreset> {
  const { data, error } = await supabase
    .from('exclusivity_presets')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteExclusivityPreset(id: string): Promise<void> {
  const { error } = await supabase
    .from('exclusivity_presets')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// =====================================================
// PAIEMENTS D'OFFRE (offer_payments)
// =====================================================

export async function listOfferPayments(offerId: string): Promise<OfferPayment[]> {
  const { data, error } = await supabase
    .from('offer_payments')
    .select('*')
    .eq('offer_id', offerId)
    .order('due_offset_days', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function createOfferPayment(
  offerId: string,
  payload: Omit<OfferPayment, 'id' | 'offer_id' | 'created_at'>
): Promise<OfferPayment> {
  const { data, error } = await supabase
    .from('offer_payments')
    .insert({
      offer_id: offerId,
      ...payload,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateOfferPayment(
  id: string,
  payload: Partial<Omit<OfferPayment, 'id' | 'offer_id' | 'created_at'>>
): Promise<OfferPayment> {
  const { data, error } = await supabase
    .from('offer_payments')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteOfferPayment(id: string): Promise<void> {
  const { error } = await supabase
    .from('offer_payments')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function markOfferPaymentAsPaid(id: string): Promise<OfferPayment> {
  const { data, error } = await supabase
    .from('offer_payments')
    .update({
      status: 'paid',
      paid_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// =====================================================
// FONCTIONS UTILITAIRES
// =====================================================

// NOTE: applyPaymentSchedulePresetToOffer has been removed as getPaymentSchedulePreset
// function was never implemented. If needed, implement the payment_schedule_presets
// table and corresponding CRUD functions first.

/**
 * Applique un preset d'exclusivité à une offre
 * @param offerId ID de l'offre
 * @param presetId ID du preset d'exclusivité
 */
export async function applyExclusivityPresetToOffer(
  offerId: string,
  presetId: string
): Promise<void> {
  // 1. Récupérer le preset
  const preset = await getExclusivityPreset(presetId);

  // 2. Créer l'exclusivité
  const { error } = await supabase
    .from('offer_exclusivities')
    .insert({
      offer_id: offerId,
      region: preset.region,
      perimeter_km: preset.perimeter_km,
      days_before: preset.days_before,
      days_after: preset.days_after,
      exclusive: true,
      penalty_note: preset.penalty_note,
    });

  if (error) throw error;
}

