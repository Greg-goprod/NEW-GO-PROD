/**
 * Systeme de statuts unifie pour les performances et les offres
 * 
 * Les statuts sont partages entre:
 * - artist_performances.booking_status (enum PostgreSQL)
 * - offers.status (enum PostgreSQL)
 * 
 * Flux des statuts:
 * - idee -> Idee (debut du processus)
 * - offre_a_faire -> Offre a faire (offre en cours de creation)
 * - draft -> Mappe vers offre_a_faire (compatibilite)
 * - ready_to_send -> Pret a envoyer (offre finalisee)
 * - sent -> Envoye
 * - negotiating -> En negociation
 * - legal_review -> Revue juridique
 * - management_review -> Revue management
 * - accepted -> Accepte
 * - rejected -> Rejete
 * - expired -> Expire
 */

export type UnifiedStatus =
  // Statuts performance (avant offre)
  | "idee"
  | "offre_a_faire"
  // Statuts offre
  | "draft"
  | "ready_to_send"
  | "sent"
  | "negotiating"
  | "legal_review"
  | "management_review"
  | "accepted"
  | "rejected"
  | "expired"
  // Anciens statuts performance (pour compatibilite)
  | "offre_envoyee"
  | "offre_acceptee"
  | "offre_rejetee";

export interface StatusConfig {
  key: UnifiedStatus;
  label: string;
  /** Couleur semantique basee sur la charte graphique AURA */
  color: "gray" | "mandarine" | "violet-aura" | "saphir" | "menthe" | "framboise" | "orange" | "purple";
  /** Disponible dans le selecteur de performance */
  availableForPerformance: boolean;
  /** Disponible dans le selecteur d'offre */
  availableForOffer: boolean;
  /** Ordre d'affichage */
  sortOrder: number;
}

export const UNIFIED_STATUSES: StatusConfig[] = [
  // === Statuts initiaux (performances et offres) ===
  {
    key: "idee",
    label: "Idee",
    color: "gray",
    availableForPerformance: true,
    availableForOffer: true,
    sortOrder: 1,
  },
  {
    key: "offre_a_faire",
    label: "Offre a faire",
    color: "mandarine",  // Orange AURA - remplace "Brouillon"
    availableForPerformance: true,
    availableForOffer: true,
    sortOrder: 2,
  },

  // === Statuts offre (compatibilite - mappe vers offre_a_faire) ===
  {
    key: "draft",
    label: "Offre a faire",  // Affiche "Offre a faire" au lieu de "Brouillon"
    color: "mandarine",  // Orange AURA
    availableForPerformance: false,
    availableForOffer: false,  // Non selectionnable, juste pour compatibilite
    sortOrder: 2,
  },
  {
    key: "ready_to_send",
    label: "Pret a envoyer",
    color: "violet-aura",  // Violet principal AURA
    availableForPerformance: false,
    availableForOffer: true,
    sortOrder: 4,
  },
  {
    key: "sent",
    label: "Envoye",
    color: "saphir",  // Bleu AURA
    availableForPerformance: false,
    availableForOffer: true,
    sortOrder: 5,
  },
  {
    key: "negotiating",
    label: "En negociation",
    color: "purple",
    availableForPerformance: false,
    availableForOffer: true,
    sortOrder: 6,
  },
  {
    key: "legal_review",
    label: "Revue juridique",
    color: "purple",
    availableForPerformance: false,
    availableForOffer: true,
    sortOrder: 7,
  },
  {
    key: "management_review",
    label: "Revue management",
    color: "purple",
    availableForPerformance: false,
    availableForOffer: true,
    sortOrder: 8,
  },
  {
    key: "accepted",
    label: "Accepte",
    color: "menthe",  // Vert menthe AURA
    availableForPerformance: false,
    availableForOffer: true,
    sortOrder: 9,
  },
  {
    key: "rejected",
    label: "Rejete",
    color: "framboise",  // Rouge framboise AURA
    availableForPerformance: false,
    availableForOffer: true,
    sortOrder: 10,
  },
  {
    key: "expired",
    label: "Expire",
    color: "gray",
    availableForPerformance: false,
    availableForOffer: true,
    sortOrder: 11,
  },

  // === Anciens statuts performance (compatibilite, non selectionnables) ===
  {
    key: "offre_envoyee",
    label: "Envoye",
    color: "saphir",
    availableForPerformance: false,
    availableForOffer: false,
    sortOrder: 5,
  },
  {
    key: "offre_acceptee",
    label: "Accepte",
    color: "menthe",
    availableForPerformance: false,
    availableForOffer: false,
    sortOrder: 9,
  },
  {
    key: "offre_rejetee",
    label: "Rejete",
    color: "framboise",
    availableForPerformance: false,
    availableForOffer: false,
    sortOrder: 10,
  },
];

/** Map pour acces rapide par cle */
export const STATUS_MAP = new Map<string, StatusConfig>(
  UNIFIED_STATUSES.map((s) => [s.key, s])
);

/** Obtenir la config d'un statut */
export function getStatusConfig(status: string | null | undefined): StatusConfig {
  if (!status) {
    return UNIFIED_STATUSES[0]; // Default: idee
  }
  return STATUS_MAP.get(status) || UNIFIED_STATUSES[0];
}

/** Obtenir le label d'un statut */
export function getStatusLabel(status: string | null | undefined): string {
  return getStatusConfig(status).label;
}

/** Obtenir la couleur d'un statut */
export function getStatusColor(status: string | null | undefined): StatusConfig["color"] {
  return getStatusConfig(status).color;
}

/** Statuts disponibles pour le selecteur de performance */
export const PERFORMANCE_STATUSES = UNIFIED_STATUSES.filter(
  (s) => s.availableForPerformance
);

/** Statuts disponibles pour le selecteur d'offre */
export const OFFER_STATUSES = UNIFIED_STATUSES.filter(
  (s) => s.availableForOffer
);

/** Normaliser un statut (mapper les anciens vers les nouveaux) */
export function normalizeStatus(status: string | null | undefined): UnifiedStatus {
  if (!status) return "idee";
  
  // Mapping des anciens statuts vers les nouveaux
  const mapping: Record<string, UnifiedStatus> = {
    draft: "offre_a_faire",  // Brouillon -> Offre a faire
    offre_envoyee: "sent",
    offre_acceptee: "accepted",
    offre_rejetee: "rejected",
  };
  
  return (mapping[status] || status) as UnifiedStatus;
}
