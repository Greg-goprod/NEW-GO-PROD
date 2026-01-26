import { supabase } from '@/lib/supabaseClient';
import type { CRMCompany, CRMCompanyInput, CRMCompanyWithRelations } from '@/types/crm';

/**
 * Récupérer toutes les sociétés d'une company
 */
export async function fetchCRMCompanies(companyId: string): Promise<CRMCompanyWithRelations[]> {
  const { data, error } = await supabase
    .from('crm_companies')
    .select(`
      *,
      company_type:company_types(id, label),
      main_contact:crm_contacts!main_contact_id(id, first_name, last_name),
      tech_contact:crm_contacts!tech_contact_id(id, first_name, last_name),
      hospitality_contact:crm_contacts!hospitality_contact_id(id, first_name, last_name),
      transport_contact:crm_contacts!transport_contact_id(id, first_name, last_name)
    `)
    .eq('company_id', companyId)
    .order('company_name', { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Récupérer une société par son ID
 */
export async function fetchCRMCompanyById(id: string): Promise<CRMCompanyWithRelations | null> {
  const { data, error } = await supabase
    .from('crm_companies')
    .select(`
      *,
      company_type:company_types(id, label),
      main_contact:crm_contacts!main_contact_id(id, first_name, last_name),
      tech_contact:crm_contacts!tech_contact_id(id, first_name, last_name),
      hospitality_contact:crm_contacts!hospitality_contact_id(id, first_name, last_name),
      transport_contact:crm_contacts!transport_contact_id(id, first_name, last_name)
    `)
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Créer une nouvelle société
 */
export async function createCRMCompany(input: CRMCompanyInput): Promise<CRMCompany> {
  const { data, error } = await supabase
    .from('crm_companies')
    .insert(input)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Mettre à jour une société
 */
export async function updateCRMCompany(id: string, input: Partial<CRMCompanyInput>): Promise<CRMCompany> {
  const { data, error } = await supabase
    .from('crm_companies')
    .update(input)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Supprimer une société
 */
export async function deleteCRMCompany(id: string): Promise<void> {
  const { error } = await supabase
    .from('crm_companies')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

