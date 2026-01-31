/**
 * Hooks React Query centralisés
 * 
 * Ces hooks fournissent un cache automatique et une gestion optimisée
 * des requêtes API avec TanStack Query.
 * 
 * Usage:
 * - Les données sont automatiquement mises en cache
 * - Les mutations invalident automatiquement le cache
 * - Le refetch se fait automatiquement quand les données sont "stale"
 */

// Artistes
export {
  useArtistsQuery,
  useCreateArtist,
  useUpdateArtist,
  useDeleteArtist,
  type ArtistFull,
} from './useArtistsQuery';

// Données d'événement (jours, scènes, performances)
export {
  useEventDaysQuery,
  useEventStagesQuery,
  usePerformancesQuery,
  useEventDataQuery,
  useInvalidateEventData,
  type EventDay,
  type EventStage,
  type Performance,
} from './useEventDataQuery';

// Offres (booking)
export {
  useOffersQuery,
  useCreateOffer,
  useUpdateOffer,
  useDeleteOffer,
  useInvalidateOffers,
  type Offer,
  type OfferFilters,
  type OfferSort,
} from './useOffersQuery';

// Lookups (CRM et Staff)
export {
  useCRMLookupsQuery,
  useStaffLookupsQuery,
  type CRMLookup,
  type CRMLookups,
  type StaffLookup,
  type StaffLookups,
} from './useLookupsQuery';
