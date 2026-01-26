import { supabase } from '@/lib/supabaseClient';

/**
 * Récupérer les IDs des entreprises associées à un contact
 */
export async function fetchContactCompanyIds(contactId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('crm_contact_company_links')
    .select('linked_company_id')
    .eq('contact_id', contactId);

  if (error) throw error;
  
  return data?.map(link => link.linked_company_id) || [];
}

/**
 * Récupérer les IDs des contacts associés à une entreprise
 */
export async function fetchCompanyContactIds(companyCrmId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('crm_contact_company_links')
    .select('contact_id')
    .eq('linked_company_id', companyCrmId);

  if (error) throw error;
  
  return data?.map(link => link.contact_id) || [];
}

/**
 * Associer des entreprises à un contact
 */
export async function linkContactToCompanies(
  contactId: string,
  companyId: string, // tenant ID
  companyCrmIds: string[]
): Promise<void> {
  // Supprimer les anciennes associations
  const { error: deleteError } = await supabase
    .from('crm_contact_company_links')
    .delete()
    .eq('contact_id', contactId);

  if (deleteError) throw deleteError;

  // Créer les nouvelles associations
  if (companyCrmIds.length > 0) {
    const links = companyCrmIds.map(companyCrmId => ({
      contact_id: contactId,
      linked_company_id: companyCrmId,
      company_id: companyId // tenant
    }));

    const { error: insertError } = await supabase
      .from('crm_contact_company_links')
      .insert(links);

    if (insertError) throw insertError;
  }
}

/**
 * Associer des contacts à une entreprise
 */
export async function linkCompanyToContacts(
  companyCrmId: string,
  companyId: string, // tenant ID
  contactIds: string[]
): Promise<void> {
  // Supprimer les anciennes associations
  const { error: deleteError } = await supabase
    .from('crm_contact_company_links')
    .delete()
    .eq('linked_company_id', companyCrmId);

  if (deleteError) throw deleteError;

  // Créer les nouvelles associations
  if (contactIds.length > 0) {
    const links = contactIds.map(contactId => ({
      contact_id: contactId,
      linked_company_id: companyCrmId,
      company_id: companyId // tenant
    }));

    const { error: insertError } = await supabase
      .from('crm_contact_company_links')
      .insert(links);

    if (insertError) throw insertError;
  }
}


