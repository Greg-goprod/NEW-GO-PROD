/**
 * Types centralisés pour le module événements
 * Utilisés par toutes les APIs et composants du système événementiel
 */

/**
 * Représentation complète d'un événement (row database)
 */
export interface EventRow {
  id: string;
  company_id: string;
  name: string;
  slug: string | null;
  color_hex: string;
  start_date: string | null;
  end_date: string | null;
  starts_at: string | null;
  ends_at: string | null;
  notes: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  logo_url: string | null;
  contact_artist_id?: string | null;
  contact_tech_id?: string | null;
  contact_press_id?: string | null;
}

/**
 * Représentation minimale d'un événement (core fields)
 * Utilisé pour les stores et les vues simplifiées
 */
export interface EventCore {
  id: string;
  company_id: string;
  name: string;
  slug: string | null;
  color_hex: string;
  start_date: string | null;
  end_date: string | null;
  notes?: string | null;
  logo_url?: string | null;
  contact_artist_id?: string | null;
  contact_tech_id?: string | null;
  contact_press_id?: string | null;
}

/**
 * Événement avec compteurs (depuis vue v_events_selector)
 */
export interface EventWithCounts extends EventCore {
  days_count: number;
  stages_count: number;
}

/**
 * Input pour créer/modifier un jour d'événement
 */
export interface EventDayInput {
  date: string | null;
  open_time: string | null;
  close_time: string | null;
  is_closing_day: boolean;
  notes: string | null;
}

/**
 * Représentation complète d'un jour d'événement (row database)
 */
export interface EventDayRow extends EventDayInput {
  id: string;
  event_id: string;
  display_order: number;
  created_at: string;
}

/**
 * Type de scène (enum par company)
 */
export interface StageType {
  id: string;
  company_id: string;
  value: string;
  label: string;
  display_order: number;
  created_at: string;
}

/**
 * Spécificité de scène (enum par company)
 */
export interface StageSpecificity {
  id: string;
  company_id: string;
  value: string;
  label: string;
  display_order: number;
  created_at: string;
}

/**
 * Input pour créer/modifier une scène d'événement
 */
export interface EventStageInput {
  name: string;
  type?: string | null;
  specificity?: string | null;
  capacity: number | null;
  display_order?: number;
}

/**
 * Représentation complète d'une scène d'événement (row database)
 */
export interface EventStageRow extends EventStageInput {
  id: string;
  event_id: string;
  display_order: number;
  created_at: string;
}

/**
 * Événement complet avec ses jours et scènes
 */
export interface FullEvent {
  event: EventRow;
  days: EventDayRow[];
  stages: EventStageRow[];
}

/**
 * Payload pour créer un événement avec enfants
 */
export interface CreateEventPayload {
  company_id: string;
  name: string;
  slug?: string;
  color_hex?: string;
  start_date?: string | null;
  end_date?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
  notes?: string | null;
  status?: string;
  contact_artist_id?: string | null;
  contact_tech_id?: string | null;
  contact_press_id?: string | null;
  days?: EventDayInput[];
  stages?: EventStageInput[];
}

/**
 * Payload pour mettre à jour un événement
 */
export interface UpdateEventPayload {
  name?: string;
  slug?: string;
  color_hex?: string;
  start_date?: string | null;
  end_date?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
  notes?: string | null;
  status?: string;
  contact_artist_id?: string | null;
  contact_tech_id?: string | null;
  contact_press_id?: string | null;
}

