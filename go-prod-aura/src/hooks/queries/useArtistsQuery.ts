import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { queryKeys } from '@/lib/queryClient';

/**
 * Types pour les artistes avec données complètes
 */
export interface ArtistFull {
  id: string;
  name: string;
  company_id: string;
  status?: 'active' | 'inactive' | 'archived';
  genres?: string[];
  country?: string;
  spotify_url?: string;
  spotify_monthly_listeners?: number;
  instagram_url?: string;
  instagram_followers?: number;
  tiktok_url?: string;
  tiktok_followers?: number;
  youtube_url?: string;
  youtube_subscribers?: number;
  notes?: string;
  created_at?: string;
  updated_at?: string;
  spotify_data?: {
    image_url?: string;
    external_url?: string;
    monthly_listeners?: number;
    followers?: number;
    popularity?: number;
  };
  social_media_data?: {
    instagram_url?: string;
    facebook_url?: string;
    twitter_url?: string;
    youtube_url?: string;
    tiktok_url?: string;
    website_url?: string;
    threads_url?: string;
    soundcloud_url?: string;
    bandcamp_url?: string;
    wikipedia_url?: string;
    instagram_followers?: number;
    tiktok_followers?: number;
    youtube_subscribers?: number;
  };
}

/**
 * Fetch tous les artistes d'une company avec données complètes
 */
async function fetchArtistsFull(companyId: string): Promise<ArtistFull[]> {
  const { data, error } = await supabase
    .from('artists')
    .select('*, spotify_data(*), social_media_data(*)')
    .eq('company_id', companyId)
    .order('name', { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Hook React Query pour les artistes
 * 
 * @param companyId - ID de la company
 * @returns Query result avec liste des artistes
 * 
 * @example
 * const { data: artists, isLoading, error } = useArtistsQuery(companyId);
 */
export function useArtistsQuery(companyId: string | null) {
  return useQuery({
    queryKey: queryKeys.artists(companyId || ''),
    queryFn: () => fetchArtistsFull(companyId!),
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook pour créer un artiste
 */
export function useCreateArtist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (artist: Partial<ArtistFull> & { name: string; company_id: string }) => {
      const { data, error } = await supabase
        .from('artists')
        .insert(artist)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      // Invalider le cache des artistes pour cette company
      queryClient.invalidateQueries({ queryKey: queryKeys.artists(data.company_id) });
    },
  });
}

/**
 * Hook pour mettre à jour un artiste
 */
export function useUpdateArtist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ArtistFull> & { id: string }) => {
      const { data, error } = await supabase
        .from('artists')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.artists(data.company_id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.artist(data.id) });
    },
  });
}

/**
 * Hook pour supprimer un artiste
 */
export function useDeleteArtist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, companyId }: { id: string; companyId: string }) => {
      const { error } = await supabase
        .from('artists')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { id, companyId };
    },
    onSuccess: ({ companyId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.artists(companyId) });
    },
  });
}
