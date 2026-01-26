import { supabase } from '@/lib/supabaseClient';
import type { CRMContact, CRMContactInput, CRMContactWithRelations } from '@/types/crm';

/**
 * Récupérer tous les contacts d'une company
 */
export async function fetchContacts(companyId: string): Promise<CRMContactWithRelations[]> {
  const { data, error } = await supabase
    .from('crm_contacts')
    .select(`
      *,
      department:departments(id, label),
      seniority_level:seniority_levels(id, label),
      status:contact_statuses(id, label),
      main_company:crm_companies!main_company_id(
        id, 
        company_name,
        company_type_id,
        main_phone,
        main_email,
        website_url,
        address_line1,
        address_line2,
        zip_code,
        city,
        country,
        iban,
        swift_bic,
        finance_email,
        tax_id
      )
    `)
    .eq('company_id', companyId)
    .order('last_name', { ascending: true })
    .order('first_name', { ascending: true });

  if (error) throw error;
  
  const contacts = data || [];
  
  // Charger les rôles et entreprises associées pour tous les contacts
  if (contacts.length > 0) {
    const contactIds = contacts.map(c => c.id);
    
    // Charger les rôles
    const { data: rolesData } = await supabase
      .from('crm_contact_role_links')
      .select(`
        contact_id,
        role:contact_roles(id, label)
      `)
      .in('contact_id', contactIds);
    
    // Charger les entreprises associées
    const { data: companiesData } = await supabase
      .from('crm_contact_company_links')
      .select(`
        contact_id,
        company:crm_companies!linked_company_id(
          id, 
          company_name,
          company_type_id,
          main_phone,
          main_email,
          website_url,
          address_line1,
          address_line2,
          zip_code,
          city,
          country,
          iban,
          swift_bic,
          finance_email,
          tax_id
        )
      `)
      .in('contact_id', contactIds);
    
    // Charger les artistes associés
    const { data: artistsData } = await supabase
      .from('crm_artist_contact_links')
      .select(`
        contact_id,
        artist:artists(id, artist_name, artist_real_name)
      `)
      .in('contact_id', contactIds);
    
    // Ajouter les rôles à chaque contact
    if (rolesData) {
      const rolesMap = new Map<string, any[]>();
      rolesData.forEach(link => {
        if (!rolesMap.has(link.contact_id)) {
          rolesMap.set(link.contact_id, []);
        }
        if (link.role) {
          rolesMap.get(link.contact_id)!.push(link.role);
        }
      });
      
      contacts.forEach(contact => {
        (contact as any).roles = rolesMap.get(contact.id) || [];
      });
    }
    
    // Ajouter les entreprises associées à chaque contact
    if (companiesData) {
      const companiesMap = new Map<string, any[]>();
      companiesData.forEach(link => {
        if (!companiesMap.has(link.contact_id)) {
          companiesMap.set(link.contact_id, []);
        }
        if (link.company) {
          companiesMap.get(link.contact_id)!.push(link.company);
        }
      });
      
      contacts.forEach(contact => {
        (contact as any).linked_companies = companiesMap.get(contact.id) || [];
      });
    }
    
    // Ajouter les artistes associés à chaque contact
    if (artistsData) {
      const artistsMap = new Map<string, any[]>();
      artistsData.forEach(link => {
        if (!artistsMap.has(link.contact_id)) {
          artistsMap.set(link.contact_id, []);
        }
        if (link.artist) {
          artistsMap.get(link.contact_id)!.push(link.artist);
        }
      });
      
      contacts.forEach(contact => {
        (contact as any).artists = artistsMap.get(contact.id) || [];
      });
    }
  }
  
  return contacts;
}

/**
 * Récupérer tous les contacts de la company de l'utilisateur connecté (via RLS)
 */
export async function fetchCRMContacts(): Promise<CRMContactWithRelations[]> {
  const { data, error } = await supabase
    .from('crm_contacts')
    .select(`
      *,
      main_company:crm_companies!main_company_id(id, company_name)
    `)
    .order('last_name', { ascending: true })
    .order('first_name', { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Récupérer un contact par son ID
 */
export async function fetchContactById(id: string): Promise<CRMContactWithRelations | null> {
  const { data, error } = await supabase
    .from('crm_contacts')
    .select(`
      *,
      department:departments(id, label),
      seniority_level:seniority_levels(id, label),
      status:contact_statuses(id, label),
      main_company:crm_companies!main_company_id(id, company_name)
    `)
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Créer un nouveau contact
 */
export async function createContact(input: CRMContactInput): Promise<CRMContact> {
  const { data, error } = await supabase
    .from('crm_contacts')
    .insert(input)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Mettre à jour un contact
 */
export async function updateContact(id: string, input: Partial<CRMContactInput>): Promise<CRMContact> {
  const { data, error } = await supabase
    .from('crm_contacts')
    .update(input)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Supprimer un contact
 */
export async function deleteContact(id: string): Promise<void> {
  const { error } = await supabase
    .from('crm_contacts')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

