import { supabase } from '@/lib/supabaseClient';
import type {
  CompanyType,
  ContactStatus,
  Department,
  ContactRole,
  SeniorityLevel,
  CRMLookupTable,
  CRMLookup
} from '@/types/crm';

// =============================================================================
// API pour gérer les lookups CRM (équivalent des enums éditables)
// =============================================================================

/**
 * Récupérer tous les types de sociétés
 */
export async function fetchCompanyTypes(companyId: string): Promise<CompanyType[]> {
  const { data, error } = await supabase
    .from('company_types')
    .select('*')
    .eq('company_id', companyId)
    .order('sort_order', { ascending: true })
    .order('label', { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Récupérer tous les statuts de contacts
 */
export async function fetchContactStatuses(companyId: string): Promise<ContactStatus[]> {
  const { data, error } = await supabase
    .from('contact_statuses')
    .select('*')
    .eq('company_id', companyId)
    .order('sort_order', { ascending: true })
    .order('label', { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Récupérer tous les départements
 */
export async function fetchDepartments(companyId: string): Promise<Department[]> {
  const { data, error } = await supabase
    .from('departments')
    .select('*')
    .eq('company_id', companyId)
    .order('sort_order', { ascending: true })
    .order('label', { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Récupérer tous les rôles de contacts
 */
export async function fetchContactRoles(companyId: string): Promise<ContactRole[]> {
  const { data, error } = await supabase
    .from('contact_roles')
    .select('*')
    .eq('company_id', companyId)
    .order('sort_order', { ascending: true })
    .order('label', { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Récupérer tous les niveaux de séniorité
 */
export async function fetchSeniorityLevels(companyId: string): Promise<SeniorityLevel[]> {
  const { data, error } = await supabase
    .from('seniority_levels')
    .select('*')
    .eq('company_id', companyId)
    .order('sort_order', { ascending: true })
    .order('label', { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Créer ou mettre à jour une option CRM via RPC
 */
export async function upsertCRMOption(
  table: CRMLookupTable,
  companyId: string,
  id: string | null,
  label: string,
  active: boolean = true,
  sortOrder: number = 100
): Promise<string> {
  const { data, error } = await supabase.rpc('upsert_crm_option', {
    p_table: table,
    p_company_id: companyId,
    p_id: id,
    p_label: label,
    p_active: active,
    p_sort_order: sortOrder
  });

  if (error) throw error;
  return data;
}

/**
 * Désactiver une option CRM via RPC
 */
export async function disableCRMOption(
  table: CRMLookupTable,
  companyId: string,
  id: string
): Promise<void> {
  const { error } = await supabase.rpc('disable_crm_option', {
    p_table: table,
    p_company_id: companyId,
    p_id: id
  });

  if (error) throw error;
}

/**
 * Récupérer toutes les options d'une table spécifique
 */
export async function fetchCRMLookups(
  companyId: string,
  table: CRMLookupTable
): Promise<CRMLookup[]> {
  switch (table) {
    case 'company_types':
      return fetchCompanyTypes(companyId);
    case 'contact_statuses':
      return fetchContactStatuses(companyId);
    case 'departments':
      return fetchDepartments(companyId);
    case 'contact_roles':
      return fetchContactRoles(companyId);
    case 'seniority_levels':
      return fetchSeniorityLevels(companyId);
    default:
      throw new Error(`Table ${table} non supportée`);
  }
}

/**
 * Récupérer toutes les options actives d'une table
 */
export async function fetchActiveCRMLookups(
  companyId: string,
  table: CRMLookupTable
): Promise<CRMLookup[]> {
  const allLookups = await fetchCRMLookups(companyId, table);
  return allLookups.filter(lookup => lookup.active);
}




