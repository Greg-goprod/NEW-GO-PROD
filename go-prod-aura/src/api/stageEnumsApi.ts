import { supabase } from '@/lib/supabaseClient';
import type { StageType, StageSpecificity } from '@/types/event';

// Re-export des types pour faciliter les imports
export type { StageType, StageSpecificity };

/**
 * Récupérer tous les types de scènes d'une company
 */
export async function fetchStageTypes(companyId: string): Promise<StageType[]> {
  console.log('📡 API: Récupération stage_types pour company:', companyId);
  const { data, error } = await supabase
    .from('stage_types')
    .select('*')
    .eq('company_id', companyId)
    .order('display_order', { ascending: true });

  if (error) {
    console.error('❌ Erreur Supabase stage_types:', error);
    throw error;
  }
  console.log('✅ stage_types data:', data);
  return data || [];
}

/**
 * Récupérer toutes les spécificités de scènes d'une company
 */
export async function fetchStageSpecificities(companyId: string): Promise<StageSpecificity[]> {
  console.log('📡 API: Récupération stage_specificities pour company:', companyId);
  const { data, error } = await supabase
    .from('stage_specificities')
    .select('*')
    .eq('company_id', companyId)
    .order('display_order', { ascending: true });

  if (error) {
    console.error('❌ Erreur Supabase stage_specificities:', error);
    throw error;
  }
  console.log('✅ stage_specificities data:', data);
  return data || [];
}

/**
 * Créer un nouveau type de scène
 */
export async function createStageType(
  companyId: string,
  value: string,
  label: string,
  displayOrder?: number
): Promise<StageType> {
  const { data, error } = await supabase
    .from('stage_types')
    .insert({
      company_id: companyId,
      value: value.toLowerCase().replace(/\s+/g, '_'),
      label,
      display_order: displayOrder ?? 999,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Créer une nouvelle spécificité de scène
 */
export async function createStageSpecificity(
  companyId: string,
  value: string,
  label: string,
  displayOrder?: number
): Promise<StageSpecificity> {
  const { data, error } = await supabase
    .from('stage_specificities')
    .insert({
      company_id: companyId,
      value: value.toLowerCase().replace(/\s+/g, '_'),
      label,
      display_order: displayOrder ?? 999,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Mettre à jour un type de scène
 */
export async function updateStageType(
  id: string,
  label: string
): Promise<StageType> {
  const { data, error } = await supabase
    .from('stage_types')
    .update({ label })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Supprimer un type de scène
 */
export async function deleteStageType(id: string): Promise<void> {
  const { error } = await supabase
    .from('stage_types')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

/**
 * Mettre à jour une spécificité de scène
 */
export async function updateStageSpecificity(
  id: string,
  label: string
): Promise<StageSpecificity> {
  const { data, error } = await supabase
    .from('stage_specificities')
    .update({ label })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Supprimer une spécificité de scène
 */
export async function deleteStageSpecificity(id: string): Promise<void> {
  const { error } = await supabase
    .from('stage_specificities')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

/**
 * Mettre a jour l'ordre d'affichage des types de scenes
 */
export async function updateStageTypesOrder(
  orderedIds: string[]
): Promise<void> {
  const updates = orderedIds.map((id, index) => ({
    id,
    display_order: index,
  }));

  for (const update of updates) {
    const { error } = await supabase
      .from('stage_types')
      .update({ display_order: update.display_order })
      .eq('id', update.id);
    if (error) throw error;
  }
}

/**
 * Mettre a jour l'ordre d'affichage des specificites de scenes
 */
export async function updateStageSpecificitiesOrder(
  orderedIds: string[]
): Promise<void> {
  const updates = orderedIds.map((id, index) => ({
    id,
    display_order: index,
  }));

  for (const update of updates) {
    const { error } = await supabase
      .from('stage_specificities')
      .update({ display_order: update.display_order })
      .eq('id', update.id);
    if (error) throw error;
  }
}

/**
 * Initialiser les enums par défaut pour une company
 */
export async function initializeStageEnumsForCompany(companyId: string): Promise<void> {
  const { error } = await supabase.rpc('initialize_stage_enums_for_company', {
    p_company_id: companyId,
  });

  if (error) throw error;
}

