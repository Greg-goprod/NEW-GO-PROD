import { supabase } from '@/lib/supabaseClient';

export interface Artist {
  id: string;
  name: string;
  company_id: string;
}

interface ContactArtistLink {
  artist_id: string;
  artists: Artist;
}

/**
 * Récupérer tous les artistes d'une company
 */
export async function fetchArtists(companyId: string): Promise<Artist[]> {
  const { data, error } = await supabase
    .from('artists')
    .select('id, name, company_id')
    .eq('company_id', companyId)
    .order('name', { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Récupérer tous les artistes de la company de l'utilisateur connecté
 */
export async function fetchAllArtists(): Promise<Artist[]> {
  const { data, error } = await supabase
    .from('artists')
    .select('id, name, company_id')
    .order('name', { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Récupérer les artistes associés à un contact
 */
export async function fetchContactArtists(contactId: string): Promise<Artist[]> {
  const { data, error } = await supabase
    .from('crm_artist_contact_links')
    .select(`
      artist_id,
      artists!inner(id, name, company_id)
    `)
    .eq('contact_id', contactId);

  if (error) throw error;
  
  return ((data as unknown) as ContactArtistLink[] | null)?.map(link => link.artists).filter(Boolean) || [];
}

/**
 * Associer des artistes à un contact
 */
export async function linkContactToArtists(
  contactId: string,
  companyId: string,
  artistIds: string[]
): Promise<void> {
  // Supprimer les anciennes associations
  const { error: deleteError } = await supabase
    .from('crm_artist_contact_links')
    .delete()
    .eq('contact_id', contactId);

  if (deleteError) throw deleteError;

  // Créer les nouvelles associations
  if (artistIds.length > 0) {
    const links = artistIds.map(artistId => ({
      contact_id: contactId,
      artist_id: artistId,
      company_id: companyId
    }));

    const { error: insertError } = await supabase
      .from('crm_artist_contact_links')
      .insert(links);

    if (insertError) throw insertError;
  }
}










