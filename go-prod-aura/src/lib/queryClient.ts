import { QueryClient } from '@tanstack/react-query';

/**
 * Configuration du QueryClient pour TanStack Query
 * 
 * staleTime: Durée pendant laquelle les données sont considérées "fraîches"
 *            Pendant ce temps, pas de refetch automatique
 * 
 * gcTime: Durée de conservation en cache après que le composant soit démonté
 *         (anciennement cacheTime)
 * 
 * refetchOnWindowFocus: Refetch quand l'utilisateur revient sur l'onglet
 * 
 * retry: Nombre de tentatives en cas d'erreur
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Données fraîches pendant 2 minutes
      staleTime: 2 * 60 * 1000,
      
      // Cache conservé 10 minutes après démontage
      gcTime: 10 * 60 * 1000,
      
      // Refetch quand l'utilisateur revient sur l'onglet
      refetchOnWindowFocus: true,
      
      // 1 seul retry en cas d'erreur
      retry: 1,
      
      // Pas de refetch au montage si données encore fraîches
      refetchOnMount: true,
    },
  },
});

/**
 * Clés de cache standardisées
 * Utiliser ces clés pour assurer la cohérence du cache
 */
export const queryKeys = {
  // Artistes
  artists: (companyId: string) => ['artists', companyId] as const,
  artist: (artistId: string) => ['artist', artistId] as const,
  
  // Événements
  events: (companyId: string) => ['events', companyId] as const,
  eventData: (eventId: string) => ['eventData', eventId] as const,
  eventDays: (eventId: string) => ['eventDays', eventId] as const,
  eventStages: (eventId: string) => ['eventStages', eventId] as const,
  
  // Booking
  offers: (eventId: string, filters?: object) => ['offers', eventId, filters] as const,
  performances: (eventId: string) => ['performances', eventId] as const,
  
  // Lookups
  crmLookups: (companyId: string) => ['crmLookups', companyId] as const,
  staffLookups: (companyId: string) => ['staffLookups', companyId] as const,
  
  // Finances
  invoices: (eventId: string) => ['invoices', eventId] as const,
  financeKpis: (eventId: string) => ['financeKpis', eventId] as const,
  
  // Production
  touringParty: (eventId: string) => ['touringParty', eventId] as const,
  travels: (eventId: string) => ['travels', eventId] as const,
  missions: (eventId: string) => ['missions', eventId] as const,
  
  // Contrats
  contracts: (eventId: string) => ['contracts', eventId] as const,
} as const;
