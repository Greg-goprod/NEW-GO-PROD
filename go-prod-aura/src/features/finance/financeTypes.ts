/**
 * Types pour le module de facturation
 * Compatible multi-tenant (company_id + event_id)
 */

// =============================================================================
// TYPES DE BASE
// =============================================================================

export type CurrencyCode = 'EUR' | 'CHF' | 'USD' | 'GBP';

export type InvoiceStatus = 
  | 'to_receive' 
  | 'to_pay' 
  | 'partial' 
  | 'paid' 
  | 'canceled';

export type ExternalInvoiceStatus = 'approved' | 'pending' | 'rejected';

export type PaymentType = 
  | 'virement_bancaire' 
  | 'cash' 
  | 'carte' 
  | 'cheque' 
  | 'other';

export type TaxTreatment = 'net' | 'subject_to_tax';

export type InvoiceFileKind = 'invoice' | 'credit' | 'receipt' | 'other';

export type InvoiceAction = 
  | 'created' 
  | 'updated' 
  | 'deleted' 
  | 'payment_added' 
  | 'payment_updated' 
  | 'payment_deleted' 
  | 'file_uploaded' 
  | 'file_deleted' 
  | 'status_changed';

// =============================================================================
// INTERFACES PRINCIPALES
// =============================================================================

/**
 * Catégorie de facture
 */
export interface InvoiceCategory {
  id: string;
  company_id: string;
  name: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

/**
 * Facture
 */
export interface Invoice {
  id: string;
  company_id: string;
  event_id: string;
  supplier_id: string;
  reference: string;
  amount_excl?: number | null;
  amount_incl: number;
  currency: CurrencyCode;
  due_date: string; // Format YYYY-MM-DD
  tax_treatment: TaxTreatment;
  artist_id?: string | null;
  booking_id?: string | null;
  category_id?: string | null;
  notes?: string | null;
  status: InvoiceStatus;
  external_status?: ExternalInvoiceStatus | null;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
}

/**
 * Facture avec données jointes (pour affichage)
 */
export interface InvoiceWithRelations extends Invoice {
  // Données jointes
  supplier_name?: string;
  artist_name?: string | null;
  booking_name?: string | null;
  category_name?: string | null;
  
  // Données calculées
  payments_sum?: number;
  outstanding_amount?: number;
  has_invoice_file?: boolean;
  
  // Pour les lignes virtuelles (artistes sans facture)
  virtual?: boolean;
  
  // Date de l'offre liée (pour groupement par jour)
  offer_date?: string | null; // Format YYYY-MM-DD
}

/**
 * Paiement
 */
export interface Payment {
  id: string;
  invoice_id: string;
  company_id: string;
  event_id?: string | null;
  payment_date: string; // Format YYYY-MM-DD
  amount: number;
  currency: CurrencyCode;
  payment_type: PaymentType;
  notes?: string | null;
  pop_url?: string | null;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
}

/**
 * Fichier attaché à une facture
 */
export interface InvoiceFile {
  id: string;
  invoice_id: string;
  kind: InvoiceFileKind;
  file_path: string;
  created_at?: string;
}

/**
 * Log d'activité sur une facture
 */
export interface InvoiceActivityLog {
  id: string;
  invoice_id: string;
  company_id: string;
  event_id: string;
  action: InvoiceAction;
  meta?: Record<string, unknown> | null;
  created_by?: string | null;
  created_at?: string;
}

// =============================================================================
// INTERFACES POUR FORMULAIRES
// =============================================================================

/**
 * Données pour créer/modifier une facture
 */
export interface InvoiceFormData {
  supplier_id: string;
  reference: string;
  amount_excl?: number | null;
  amount_incl: number;
  currency: CurrencyCode;
  due_date: string;
  tax_treatment: TaxTreatment;
  artist_id?: string | null;
  booking_id?: string | null;
  category_id?: string | null;
  notes?: string | null;
  status?: InvoiceStatus;
  external_status?: ExternalInvoiceStatus | null;
}

/**
 * Données pour créer/modifier un paiement
 */
export interface PaymentFormData {
  payment_date: string;
  amount: number;
  currency: CurrencyCode;
  payment_type: PaymentType;
  notes?: string | null;
  has_pop?: boolean;
  pop_file?: File | null;
}

/**
 * Données pour créer/modifier une catégorie
 */
export interface InvoiceCategoryFormData {
  name: string;
  is_active?: boolean;
}

// =============================================================================
// INTERFACES POUR KPIs
// =============================================================================

/**
 * KPIs globaux
 */
export interface FinanceKpis {
  // Compteurs
  toReceiveCount: number;
  paidCount: number;
  toPayCount: number;
  partialCount: number;
  overdueCount: number;
  
  // Totaux par devise
  totalsByCurrency: Partial<Record<CurrencyCode, number>>;
  toReceiveTotalsByCurrency: Partial<Record<CurrencyCode, number>>;
  paidTotalsByCurrency: Partial<Record<CurrencyCode, number>>;
  toPayTotalsByCurrency: Partial<Record<CurrencyCode, number>>;
  overdueTotalsByCurrency: Partial<Record<CurrencyCode, number>>;
}

/**
 * KPIs par jour d'événement
 */
export interface DailyFinanceKpis {
  date: string;
  dayName: string;
  artistCount: number;
  invoiceCount: number;
  paidTotal: number;
  toPayTotal: number;
  totalAmount: number;
  overdueTotal: number;
  currency: CurrencyCode;
}

// =============================================================================
// INTERFACES POUR SELECTS/OPTIONS
// =============================================================================

/**
 * Options pour les selects dans les formulaires
 */
export interface FinanceSelectOptions {
  suppliers: { id: string; name: string }[];
  artists: { id: string; name: string }[];
  bookings: { id: string; name: string; artist_name?: string }[];
  categories: { id: string; name: string }[];
  currencies: CurrencyCode[];
}

// =============================================================================
// INTERFACES POUR FILTRES
// =============================================================================

/**
 * Filtres pour la liste des factures
 */
export interface InvoiceFilters {
  status?: InvoiceStatus | 'all';
  artist_id?: string | 'all';
  supplier_id?: string | 'all';
  category_id?: string | 'all';
  currency?: CurrencyCode | 'all';
  overdue_only?: boolean;
  search?: string;
}

/**
 * Tri pour la liste des factures
 */
export interface InvoiceSort {
  field: 'due_date' | 'amount_incl' | 'reference' | 'supplier_name' | 'artist_name' | 'status' | 'created_at';
  direction: 'asc' | 'desc';
}

// =============================================================================
// CONSTANTES
// =============================================================================

export const CURRENCIES: CurrencyCode[] = ['EUR', 'CHF', 'USD', 'GBP'];

export const CURRENCY_SYMBOLS: Record<CurrencyCode, string> = {
  EUR: '€',
  CHF: 'CHF',
  USD: '$',
  GBP: '£',
};

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  to_receive: 'À recevoir',
  to_pay: 'À payer',
  partial: 'Partiel',
  paid: 'Payée',
  canceled: 'Annulée',
};

export const INVOICE_STATUS_COLORS: Record<InvoiceStatus, string> = {
  to_receive: 'blue',
  to_pay: 'orange',
  partial: 'purple',
  paid: 'green',
  canceled: 'red',
};

export const PAYMENT_TYPE_LABELS: Record<PaymentType, string> = {
  virement_bancaire: 'Virement bancaire',
  cash: 'Espèces',
  carte: 'Carte bancaire',
  cheque: 'Chèque',
  other: 'Autre',
};

export const TAX_TREATMENT_LABELS: Record<TaxTreatment, string> = {
  net: 'Net (exonéré)',
  subject_to_tax: 'Soumis à TVA',
};

export const FILE_KIND_LABELS: Record<InvoiceFileKind, string> = {
  invoice: 'Facture',
  credit: 'Avoir',
  receipt: 'Reçu',
  other: 'Autre',
};
