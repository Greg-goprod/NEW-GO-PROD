/**
 * Utilitaires pour mapper les donnees extraites d'une facture
 * vers le format attendu par le formulaire entreprise (crm_companies)
 */

import type { SupplierData, BankingData } from './invoiceExtractApi';

// Type pour les donnees du formulaire entreprise (compatible avec CRMCompanyInput)
export interface CompanyFormData {
  company_id?: string; // tenant (sera ajoute automatiquement)
  company_name: string;
  brand_name?: string;
  company_type_id?: string;
  is_supplier: boolean;
  is_client: boolean;
  status_label?: string;
  
  // Coordonnees generales
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
  
  // Donnees specifiques pays (JSONB)
  country_specific_data?: Record<string, any>;
}

// Mapping code pays vers nom de pays en francais
const COUNTRY_CODE_TO_NAME: Record<string, string> = {
  'CH': 'Suisse',
  'FR': 'France',
  'DE': 'Allemagne',
  'GB': 'Royaume-Uni',
  'US': 'États-Unis',
  'CA': 'Canada',
  'AU': 'Australie',
  'BE': 'Belgique',
  'NL': 'Pays-Bas',
  'AT': 'Autriche',
  'IT': 'Italie',
  'ES': 'Espagne',
  'PT': 'Portugal',
  'LU': 'Luxembourg',
  'IE': 'Irlande',
  'DK': 'Danemark',
  'SE': 'Suède',
  'NO': 'Norvège',
  'FI': 'Finlande',
  'PL': 'Pologne',
  'CZ': 'République tchèque',
};

/**
 * Convertit le code pays ISO en nom de pays en francais
 */
export function getCountryName(countryCode: string | null): string | undefined {
  if (!countryCode) return undefined;
  return COUNTRY_CODE_TO_NAME[countryCode.toUpperCase()] || countryCode;
}

/**
 * Extrait les donnees specifiques au pays pour le champ JSONB country_specific_data
 */
export function extractCountrySpecificData(supplier: SupplierData, banking: BankingData): Record<string, any> {
  const data: Record<string, any> = {};
  const countryCode = supplier.country_code?.toUpperCase();

  // Identifiants fiscaux specifiques par pays
  switch (countryCode) {
    case 'FR':
      if (supplier.siret) data.siret = supplier.siret;
      if (supplier.siren) data.siren = supplier.siren;
      if (supplier.rcs_city) data.rcs_city = supplier.rcs_city;
      if (supplier.ape_code) data.ape_code = supplier.ape_code;
      if (supplier.capital_social) data.capital_social = supplier.capital_social;
      break;
    case 'CH':
      if (supplier.ide) data.ide = supplier.ide;
      break;
    case 'DE':
      if (supplier.handelsregister) data.handelsregister = supplier.handelsregister;
      break;
    case 'GB':
      if (supplier.companies_house) data.companies_house = supplier.companies_house;
      if (banking.sort_code) data.sort_code = banking.sort_code;
      if (banking.account_number) data.account_number = banking.account_number;
      break;
    case 'US':
      if (supplier.ein) data.ein = supplier.ein;
      if (banking.routing_number) data.routing_number = banking.routing_number;
      if (banking.account_number) data.account_number = banking.account_number;
      break;
    case 'CA':
      if (supplier.business_number) data.business_number = supplier.business_number;
      if (banking.institution_number) data.institution_number = banking.institution_number;
      if (banking.transit_number) data.transit_number = banking.transit_number;
      if (banking.account_number) data.account_number = banking.account_number;
      break;
    case 'AU':
      if (supplier.abn) data.abn = supplier.abn;
      if (banking.bsb_code) data.bsb_code = banking.bsb_code;
      if (banking.account_number) data.account_number = banking.account_number;
      break;
    case 'NL':
      if (supplier.kvk) data.kvk = supplier.kvk;
      break;
    case 'AT':
      if (supplier.uid) data.uid = supplier.uid;
      break;
  }

  // Forme juridique si presente
  if (supplier.legal_form) {
    data.legal_form = supplier.legal_form;
  }

  // Nom de la banque si present
  if (banking.bank_name) {
    data.bank_name = banking.bank_name;
  }

  return data;
}

/**
 * Mappe les donnees extraites d'une facture vers le format du formulaire entreprise
 * @param supplier - Donnees fournisseur extraites
 * @param invoiceCurrency - Devise de la facture (optionnel)
 */
export function mapSupplierToCompanyForm(supplier: SupplierData, invoiceCurrency?: string): CompanyFormData {
  const banking = supplier.banking || {} as BankingData;
  
  const formData: CompanyFormData = {
    company_name: supplier.company_name || '',
    is_supplier: true, // Par defaut, c'est un fournisseur si detecte depuis une facture
    is_client: false,
    status_label: 'actif',
  };

  // Contact
  if (supplier.email) formData.main_email = supplier.email;
  if (supplier.phone) formData.main_phone = supplier.phone;
  if (supplier.website) formData.website_url = supplier.website;

  // Adresse principale
  if (supplier.address_line1) formData.address_line1 = supplier.address_line1;
  if (supplier.address_line2) formData.address_line2 = supplier.address_line2;
  if (supplier.postal_code) formData.zip_code = supplier.postal_code;
  if (supplier.city) formData.city = supplier.city;
  
  // Pays: preferer le nom en francais
  let countryName: string | undefined;
  if (supplier.country_code) {
    countryName = getCountryName(supplier.country_code);
    formData.country = countryName;
  } else if (supplier.country) {
    countryName = supplier.country;
    formData.country = supplier.country;
  }

  // ==========================================================================
  // Facturation: copier les memes infos par defaut
  // ==========================================================================
  if (supplier.company_name) formData.billing_name = supplier.company_name;
  if (supplier.address_line1) formData.billing_address_line1 = supplier.address_line1;
  if (supplier.address_line2) formData.billing_address_line2 = supplier.address_line2;
  if (supplier.postal_code) formData.billing_zip_code = supplier.postal_code;
  if (supplier.city) formData.billing_city = supplier.city;
  if (countryName) formData.billing_country = countryName;

  // Identifiant fiscal generique (TVA ou autre)
  if (supplier.vat_number) {
    formData.tax_id = supplier.vat_number;
  } else if (supplier.tax_id) {
    formData.tax_id = supplier.tax_id;
  }

  // Coordonnees bancaires SEPA
  if (banking.iban) formData.iban = banking.iban;
  if (banking.swift_bic) formData.swift_bic = banking.swift_bic;
  
  // Email finance (meme que email principal si pas d'autre)
  if (supplier.email) formData.finance_email = supplier.email;
  
  // Devise preferee: utiliser la devise de la facture
  if (invoiceCurrency) {
    formData.currency_preferred = invoiceCurrency;
  }

  // Donnees specifiques au pays
  const countrySpecificData = extractCountrySpecificData(supplier, banking);
  if (Object.keys(countrySpecificData).length > 0) {
    formData.country_specific_data = countrySpecificData;
  }

  return formData;
}

/**
 * Compare les donnees extraites avec un fournisseur existant
 * Retourne la liste des champs qui pourraient etre mis a jour
 */
export function getUpdatableFieldsForExistingSupplier(
  extractedData: SupplierData,
  existingData: Partial<CompanyFormData>
): { field: string; label: string; newValue: any }[] {
  const updates: { field: string; label: string; newValue: any }[] = [];
  const banking = extractedData.banking || {} as BankingData;

  // Helper pour ajouter un champ si la valeur extraite existe et differe
  const checkField = (
    field: keyof CompanyFormData | string,
    label: string,
    extractedValue: any,
    existingValue: any
  ) => {
    if (extractedValue && (!existingValue || existingValue !== extractedValue)) {
      updates.push({ field, label, newValue: extractedValue });
    }
  };

  // Contact
  checkField('main_email', 'Email', extractedData.email, existingData.main_email);
  checkField('main_phone', 'Telephone', extractedData.phone, existingData.main_phone);
  checkField('website_url', 'Site web', extractedData.website, existingData.website_url);

  // Adresse
  checkField('address_line1', 'Adresse', extractedData.address_line1, existingData.address_line1);
  checkField('zip_code', 'Code postal', extractedData.postal_code, existingData.zip_code);
  checkField('city', 'Ville', extractedData.city, existingData.city);

  // Fiscal
  const vatNumber = extractedData.vat_number || extractedData.tax_id;
  checkField('tax_id', 'N TVA/ID fiscal', vatNumber, existingData.tax_id);

  // Bancaire
  checkField('iban', 'IBAN', banking.iban, existingData.iban);
  checkField('swift_bic', 'BIC/SWIFT', banking.swift_bic, existingData.swift_bic);

  return updates;
}

/**
 * Type pour les donnees a passer a l'event de creation/update supplier
 */
export interface SupplierActionEvent {
  type: 'create' | 'update';
  supplierId?: string;  // Pour update
  formData: CompanyFormData;
  extractedData: SupplierData;
}
