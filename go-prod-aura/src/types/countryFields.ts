/**
 * Types pour les champs spécifiques par pays
 */

export interface CountryFieldConfig {
  id: string;
  country_code: string;
  field_key: string;
  field_label: string;
  field_type: 'text' | 'number' | 'select' | 'iban';
  is_required: boolean;
  validation_regex: string | null;
  placeholder: string | null;
  help_text: string | null;
  sort_order: number;
  select_options: string[] | null;
}

export interface CountrySpecificData {
  [key: string]: string;
}

export interface CountryFieldsCache {
  [countryCode: string]: CountryFieldConfig[];
}







