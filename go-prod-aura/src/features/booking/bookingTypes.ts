export type OfferStatus = 'idee' | 'offre_a_faire' | 'draft' | 'ready_to_send' | 'sent' | 'accepted' | 'rejected' | 'negotiating' | 'expired';

export interface Offer {
  id: string;
  company_id: string;
  event_id: string;
  artist_id: string | null;
  stage_id: string | null;
  status: OfferStatus;

  artist_name?: string | null;
  stage_name?: string | null;

  currency?: string | null;
  amount_net?: number | null;
  amount_gross?: number | null;
  amount_is_net?: boolean | null;
  amount_display?: number | null;
  agency_commission_pct?: number | null;

  prod_fee_amount?: number | null;
  prod_fee_currency?: string | null;
  backline_fee_amount?: number | null;
  backline_fee_currency?: string | null;
  buyout_hotel_amount?: number | null;
  buyout_hotel_currency?: string | null;
  buyout_meal_amount?: number | null;
  buyout_meal_currency?: string | null;
  flight_contribution_amount?: number | null;
  flight_contribution_currency?: string | null;
  technical_fee_amount?: number | null;
  technical_fee_currency?: string | null;

  date_time?: string | null;
  performance_time?: string | null;
  duration?: number | null;

  validity_date?: string | null;
  date_remark?: string | null;
  exclusivity_clause_remark?: string | null;
  withholding_note?: string | null;
  amount_gross_is_subject_to_withholding?: boolean | null;
  terms_json?: any | null;

  original_offer_id?: string | null;
  version?: number | null;
  agency_contact_id?: string | null;

  pdf_storage_path?: string | null;
  rejection_reason?: string | null;

  created_at?: string;
  updated_at?: string;
  total_count?: number;
}

export type OfferFilters = {
  search?: string;
  statuses?: OfferStatus[];
  created_from?: string;
  created_to?: string;
};

export type OfferSort = {
  field: 'created_at' | 'updated_at' | 'status' | 'artist_name' | 'stage_name' | 'amount_display';
  direction: 'asc' | 'desc';
};

export type TodoPerformance = {
  id: string;
  artist_id: string;
  stage_id: string;
  event_day_id: string;
  event_day_date: string;
  performance_time: string;
  duration: number | null;
  fee_amount: number | null;
  fee_currency: string | null;
  artist_name: string;
  stage_name: string;
  booking_status: string;
};

export type RejectedPerformance = TodoPerformance & {
  rejection_reason: string | null;
  rejection_date: string | null;
};

// Types pour les modaux
export type PerformanceStatus = 'idee' | 'offre_a_faire' | 'offre_rejetee';

export interface PerformanceCreate {
  event_day_id: string;
  event_stage_id: string;
  artist_id: string;
  performance_time: string;
  duration: number;
  fee_amount?: number | null;
  fee_currency?: string | null;
  booking_status?: PerformanceStatus;
}

export interface PerformanceUpdate {
  id: string;
  event_day_id?: string;
  event_stage_id?: string;
  performance_time?: string;
  duration?: number | null;
  fee_amount?: number | null;
  fee_currency?: string | null;
  booking_status?: string | null;
  rejection_reason?: string | null;
  rejection_date?: string | null;
}

export interface OfferCreate {
  event_id: string;
  company_id: string;
  artist_id: string;
  stage_id: string;
  artist_name: string;
  stage_name: string;
  date_time: string;
  performance_time: string;
  duration: number | null;
  currency: string | null;
  amount_net: number | null;
  amount_gross: number | null;
  amount_is_net: boolean;
  amount_display: number | null;
  agency_commission_pct: number | null;
  validity_date: string | null;
  status: OfferStatus;
  terms_json: string;
}

export interface OfferUpdate {
  artist_id?: string;
  stage_id?: string;
  artist_name?: string;
  stage_name?: string;
  date_time?: string;
  performance_time?: string;
  duration?: number | null;
  currency?: string | null;
  amount_net?: number | null;
  amount_gross?: number | null;
  amount_is_net?: boolean;
  amount_display?: number | null;
  agency_commission_pct?: number | null;
  validity_date?: string | null;
  status?: OfferStatus;
  terms_json?: string;
  pdf_storage_path?: string | null;
  ready_to_send_at?: string | null;
  rejection_reason?: string | null;
}
