// =============================================================================
// Types CRM pour Go-Prod AURA
// Tables: company_types, contact_statuses, departments, contact_roles, 
// seniority_levels, crm_companies, crm_contacts, crm_contact_company_links
// =============================================================================

// -----------------------------------------------------------------------------
// Lookups éditables (remplacent les enums)
// -----------------------------------------------------------------------------

export interface CompanyType {
  id: string;
  company_id: string;
  label: string;
  active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface ContactStatus {
  id: string;
  company_id: string;
  label: string;
  active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Department {
  id: string;
  company_id: string;
  label: string;
  active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface ContactRole {
  id: string;
  company_id: string;
  label: string;
  active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface SeniorityLevel {
  id: string;
  company_id: string;
  label: string;
  active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

// Type union pour les tables de lookup
export type CRMLookupTable = 
  | 'company_types' 
  | 'contact_statuses' 
  | 'departments' 
  | 'contact_roles' 
  | 'seniority_levels';

export type CRMLookup = CompanyType | ContactStatus | Department | ContactRole | SeniorityLevel;

// -----------------------------------------------------------------------------
// Sociétés (CRM Companies)
// -----------------------------------------------------------------------------

export interface CRMCompany {
  id: string;
  company_id: string; // tenant
  company_name: string;
  brand_name?: string;
  company_type_id?: string;
  is_supplier: boolean;
  is_client: boolean;
  status_label: string;
  
  // Coordonnées générales
  main_phone?: string;
  main_email?: string;
  website_url?: string;
  
  // Adresse principale
  address_line1?: string;
  address_line2?: string;
  zip_code?: string;
  city?: string;
  country?: string;
  notes_access?: string;
  
  // Facturation / juridique
  billing_name?: string;
  billing_address_line1?: string;
  billing_address_line2?: string;
  billing_zip_code?: string;
  billing_city?: string;
  billing_country?: string;
  tax_id?: string;
  registration_number?: string;
  payment_terms?: string;
  currency_preferred?: string;
  iban?: string;
  swift_bic?: string;
  finance_email?: string;
  
  // Données spécifiques pays (JSONB)
  country_specific_data?: { [key: string]: string };
  
  // Référents internes
  main_contact_id?: string;
  tech_contact_id?: string;
  hospitality_contact_id?: string;
  transport_contact_id?: string;
  
  // Réseaux sociaux / image publique
  instagram_url?: string;
  facebook_url?: string;
  tiktok_url?: string;
  youtube_url?: string;
  logo_url?: string;
  press_notes?: string;
  
  // Documents / conformité
  insurance_certificate_url?: string;
  compliance_docs_url?: string;
  contracts_urls?: string[];
  nda_signed_at?: string;
  
  // Metadata
  tags?: string[];
  rating_internal?: number;
  blacklist_reason?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

// -----------------------------------------------------------------------------
// Contacts (CRM Contacts - Personnes)
// -----------------------------------------------------------------------------

export interface CRMContact {
  id: string;
  company_id: string; // tenant
  
  // Identité
  first_name: string;
  last_name: string;
  display_name?: string;
  photo_url?: string;
  
  // Coordonnées
  email_primary?: string;
  email_secondary?: string;
  phone_mobile?: string;
  phone_whatsapp?: string;
  phone_office?: string;
  timezone?: string;
  
  // Rôle / fonction
  department_id?: string;
  seniority_level_id?: string;
  status_id?: string;
  
  // Réseaux sociaux
  instagram_url?: string;
  facebook_url?: string;
  tiktok_url?: string;
  youtube_url?: string;
  linkedin_url?: string;
  telegram_handle?: string;
  other_contact_channel?: string;
  
  // Logistique terrain
  preferred_language?: string;
  other_languages?: string[];
  access_notes?: string;
  
  // Liens opérationnels
  main_company_id?: string;
  is_primary_for_company_billing: boolean;
  is_night_contact: boolean;
  is_signatory: boolean;
  is_internal: boolean;
  
  // Statut relation
  blacklist_reason?: string;
  trust_level?: number;
  notes_internal?: string;
  
  // Metadata
  tags?: string[];
  created_by?: string;
  created_at: string;
  updated_at: string;
}

// -----------------------------------------------------------------------------
// Relation Contact ↔ Société (pivot)
// -----------------------------------------------------------------------------

export interface CRMContactCompanyLink {
  id: string;
  company_id: string; // tenant
  contact_id: string;
  linked_company_id: string;
  job_title?: string;
  department_id?: string;
  is_primary_contact: boolean;
  billing_responsible: boolean;
  contract_signatory: boolean;
  valid_from?: string;
  valid_to?: string;
  notes_relation?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

// -----------------------------------------------------------------------------
// Activity Logs
// -----------------------------------------------------------------------------

export interface CRMContactActivityLog {
  id: string;
  company_id: string;
  contact_id: string;
  event_id?: string;
  activity_type?: string;
  note?: string;
  created_by?: string;
  created_at: string;
}

export interface CRMCompanyActivityLog {
  id: string;
  company_id: string;
  target_company_id: string;
  event_id?: string;
  activity_type?: string;
  note?: string;
  created_by?: string;
  created_at: string;
}

// -----------------------------------------------------------------------------
// Lien Artiste ↔ Contact
// -----------------------------------------------------------------------------

export interface CRMArtistContactLink {
  id: string;
  company_id: string;
  artist_id: string;
  contact_id: string;
  role_for_artist?: string;
  territory?: string;
  is_main_agent: boolean;
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

// -----------------------------------------------------------------------------
// Types enrichis avec relations
// -----------------------------------------------------------------------------

export interface CRMCompanyWithRelations extends CRMCompany {
  company_type?: CompanyType;
  main_contact?: CRMContact;
  tech_contact?: CRMContact;
  hospitality_contact?: CRMContact;
  transport_contact?: CRMContact;
}

export interface CRMContactWithRelations extends CRMContact {
  department?: Department;
  seniority_level?: SeniorityLevel;
  status?: ContactStatus;
  main_company?: CRMCompany;
  roles?: ContactRole[];
  linked_companies?: CRMCompany[];
  artists?: { id: string; artist_name: string; artist_real_name?: string }[];
}

// -----------------------------------------------------------------------------
// Types pour les formulaires
// -----------------------------------------------------------------------------

export type CRMCompanyInput = Omit<CRMCompany, 'id' | 'created_at' | 'updated_at' | 'display_name'>;
export type CRMContactInput = Omit<CRMContact, 'id' | 'created_at' | 'updated_at' | 'display_name'>;
export type CRMContactCompanyLinkInput = Omit<CRMContactCompanyLink, 'id' | 'created_at' | 'updated_at'>;







