import { supabase } from '@/lib/supabaseClient';

/**
 * Récupérer les IDs des rôles associés à un contact
 */
export async function fetchContactRoleIds(contactId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('crm_contact_role_links')
    .select('role_id')
    .eq('contact_id', contactId);

  if (error) throw error;
  
  return data?.map(link => link.role_id) || [];
}

/**
 * Associer des rôles à un contact
 */
export async function linkContactToRoles(
  contactId: string,
  companyId: string, // tenant ID
  roleIds: string[]
): Promise<void> {
  // Supprimer les anciennes associations
  const { error: deleteError } = await supabase
    .from('crm_contact_role_links')
    .delete()
    .eq('contact_id', contactId);

  if (deleteError) throw deleteError;

  // Créer les nouvelles associations
  if (roleIds.length > 0) {
    const links = roleIds.map(roleId => ({
      contact_id: contactId,
      role_id: roleId,
      company_id: companyId // tenant
    }));

    const { error: insertError } = await supabase
      .from('crm_contact_role_links')
      .insert(links);

    if (insertError) throw insertError;
  }
}










