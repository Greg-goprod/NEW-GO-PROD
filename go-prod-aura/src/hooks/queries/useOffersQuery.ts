import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { queryKeys } from '@/lib/queryClient';

/**
 * Types pour les offres
 */
export interface Offer {
  id: string;
  company_id: string;
  event_id: string;
  artist_id: string;
  stage_id?: string;
  status: string;
  amount_net?: number;
  amount_gross?: number;
  currency?: string;
  performance_date?: string;
  performance_time?: string;
  duration_minutes?: number;
  validity_date?: string;
  notes?: string;
  notes_financial?: string;
  contract_id?: string;
  created_at?: string;
  updated_at?: string;
  // Relations
  artist?: {
    id: string;
    name: string;
  };
  stage?: {
    id: string;
    name: string;
  };
  contract?: {
    id: string;
    status: string;
  };
}

export interface OfferFilters {
  status?: string;
  stageId?: string;
  search?: string;
}

export interface OfferSort {
  column: string;
  direction: 'asc' | 'desc';
}

/**
 * Fetch les offres d'un événement avec filtres optionnels
 */
async function fetchOffers(
  eventId: string,
  filters?: OfferFilters,
  sort?: OfferSort
): Promise<Offer[]> {
  let query = supabase
    .from('offers')
    .select(`
      *,
      artist:artists(id, name),
      stage:event_stages(id, name),
      contract:contracts(id, status)
    `)
    .eq('event_id', eventId);

  // Appliquer les filtres
  if (filters?.status && filters.status !== 'all') {
    query = query.eq('status', filters.status);
  }
  if (filters?.stageId) {
    query = query.eq('stage_id', filters.stageId);
  }

  // Appliquer le tri
  if (sort) {
    query = query.order(sort.column, { ascending: sort.direction === 'asc' });
  } else {
    query = query.order('created_at', { ascending: false });
  }

  const { data, error } = await query;
  if (error) throw error;

  // Filtre de recherche côté client (pour le nom d'artiste)
  let result = data || [];
  if (filters?.search) {
    const searchLower = filters.search.toLowerCase();
    result = result.filter((offer) =>
      offer.artist?.name?.toLowerCase().includes(searchLower)
    );
  }

  return result;
}

/**
 * Hook React Query pour les offres
 * 
 * @param eventId - ID de l'événement
 * @param filters - Filtres optionnels (status, stageId, search)
 * @param sort - Tri optionnel
 */
export function useOffersQuery(
  eventId: string | null,
  filters?: OfferFilters,
  sort?: OfferSort
) {
  return useQuery({
    queryKey: queryKeys.offers(eventId || '', { filters, sort }),
    queryFn: () => fetchOffers(eventId!, filters, sort),
    enabled: !!eventId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Hook pour créer une offre
 */
export function useCreateOffer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (offer: Partial<Offer> & { event_id: string; artist_id: string }) => {
      const { data, error } = await supabase
        .from('offers')
        .insert(offer)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      // Invalider toutes les queries d'offres pour cet événement
      queryClient.invalidateQueries({ 
        queryKey: ['offers', data.event_id],
        exact: false 
      });
    },
  });
}

/**
 * Hook pour mettre à jour une offre
 */
export function useUpdateOffer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Offer> & { id: string; event_id: string }) => {
      const { data, error } = await supabase
        .from('offers')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ 
        queryKey: ['offers', data.event_id],
        exact: false 
      });
    },
  });
}

/**
 * Hook pour supprimer une offre
 */
export function useDeleteOffer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, eventId }: { id: string; eventId: string }) => {
      const { error } = await supabase
        .from('offers')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { id, eventId };
    },
    onSuccess: ({ eventId }) => {
      queryClient.invalidateQueries({ 
        queryKey: ['offers', eventId],
        exact: false 
      });
    },
  });
}

/**
 * Hook pour invalider le cache des offres
 */
export function useInvalidateOffers() {
  const queryClient = useQueryClient();

  return (eventId: string) => {
    queryClient.invalidateQueries({ 
      queryKey: ['offers', eventId],
      exact: false 
    });
  };
}
