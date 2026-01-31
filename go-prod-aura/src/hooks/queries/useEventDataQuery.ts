import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { queryKeys } from '@/lib/queryClient';

/**
 * Types pour les données d'événement
 */
export interface EventDay {
  id: string;
  event_id: string;
  date: string;
  open_time?: string;
  close_time?: string;
  is_closing_day?: boolean;
  notes?: string;
}

export interface EventStage {
  id: string;
  event_id: string;
  name: string;
  type?: string;
  specificity?: string;
  capacity?: number;
  display_order?: number;
}

export interface Performance {
  id: string;
  event_id: string;
  artist_id: string;
  stage_id: string;
  day_id: string;
  start_time: string;
  end_time: string;
  status?: string;
  notes?: string;
  artist?: {
    id: string;
    name: string;
  };
  stage?: {
    id: string;
    name: string;
  };
  day?: {
    id: string;
    date: string;
  };
}

/**
 * Fetch les jours d'un événement
 */
async function fetchEventDays(eventId: string): Promise<EventDay[]> {
  const { data, error } = await supabase
    .from('event_days')
    .select('*')
    .eq('event_id', eventId)
    .order('date', { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Fetch les scènes d'un événement
 */
async function fetchEventStages(eventId: string): Promise<EventStage[]> {
  const { data, error } = await supabase
    .from('event_stages')
    .select('*')
    .eq('event_id', eventId)
    .order('display_order', { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Fetch les performances d'un événement
 */
async function fetchPerformances(eventId: string): Promise<Performance[]> {
  const { data, error } = await supabase
    .from('performances')
    .select(`
      *,
      artist:artists(id, name),
      stage:event_stages(id, name),
      day:event_days(id, date)
    `)
    .eq('event_id', eventId)
    .order('start_time', { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Fetch toutes les données d'un événement en une seule requête
 */
async function fetchEventData(eventId: string) {
  const [days, stages, performances] = await Promise.all([
    fetchEventDays(eventId),
    fetchEventStages(eventId),
    fetchPerformances(eventId),
  ]);

  return { days, stages, performances };
}

/**
 * Hook pour les jours d'un événement
 */
export function useEventDaysQuery(eventId: string | null) {
  return useQuery({
    queryKey: queryKeys.eventDays(eventId || ''),
    queryFn: () => fetchEventDays(eventId!),
    enabled: !!eventId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook pour les scènes d'un événement
 */
export function useEventStagesQuery(eventId: string | null) {
  return useQuery({
    queryKey: queryKeys.eventStages(eventId || ''),
    queryFn: () => fetchEventStages(eventId!),
    enabled: !!eventId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook pour les performances d'un événement
 */
export function usePerformancesQuery(eventId: string | null) {
  return useQuery({
    queryKey: queryKeys.performances(eventId || ''),
    queryFn: () => fetchPerformances(eventId!),
    enabled: !!eventId,
    staleTime: 2 * 60 * 1000, // 2 minutes car plus dynamique
  });
}

/**
 * Hook combiné pour toutes les données d'un événement
 * Utile pour les pages qui ont besoin de tout (booking, timeline)
 */
export function useEventDataQuery(eventId: string | null) {
  return useQuery({
    queryKey: queryKeys.eventData(eventId || ''),
    queryFn: () => fetchEventData(eventId!),
    enabled: !!eventId,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Hook pour invalider les données d'un événement
 * Utile après des mutations
 */
export function useInvalidateEventData() {
  const queryClient = useQueryClient();

  return (eventId: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.eventData(eventId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.eventDays(eventId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.eventStages(eventId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.performances(eventId) });
  };
}
