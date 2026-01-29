/**
 * API pour gérer les champs spécifiques par pays
 */

import { supabase } from '@/lib/supabaseClient';
import type { CountryFieldConfig } from '@/types/countryFields';

/**
 * Cache en mémoire pour éviter les requêtes répétées
 */
const fieldsCache: { [countryCode: string]: CountryFieldConfig[] } = {};

/**
 * Récupère les champs configurés pour un pays donné
 */
export async function fetchCountryFields(countryCode: string): Promise<CountryFieldConfig[]> {
  console.log('[countryFieldsApi] fetchCountryFields called with:', countryCode);
  
  // Vérifier le cache
  if (fieldsCache[countryCode]) {
    console.log('[countryFieldsApi] Returning cached fields for:', countryCode, fieldsCache[countryCode]);
    return fieldsCache[countryCode];
  }

  console.log('[countryFieldsApi] Fetching from Supabase for:', countryCode);
  const { data, error } = await supabase
    .from('country_business_fields')
    .select('*')
    .eq('country_code', countryCode)
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('[countryFieldsApi] Erreur lors du chargement des champs pays:', error);
    return [];
  }

  console.log('[countryFieldsApi] Data received from Supabase:', data);

  // Mettre en cache
  fieldsCache[countryCode] = data || [];
  
  return data || [];
}

/**
 * Récupère tous les champs configurés pour tous les pays
 */
export async function fetchAllCountryFields(): Promise<{ [countryCode: string]: CountryFieldConfig[] }> {
  const { data, error } = await supabase
    .from('country_business_fields')
    .select('*')
    .order('country_code', { ascending: true })
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('Erreur lors du chargement de tous les champs pays:', error);
    return {};
  }

  // Grouper par pays
  const grouped: { [countryCode: string]: CountryFieldConfig[] } = {};
  data?.forEach((field) => {
    if (!grouped[field.country_code]) {
      grouped[field.country_code] = [];
    }
    grouped[field.country_code].push(field);
  });

  // Mettre en cache
  Object.assign(fieldsCache, grouped);

  return grouped;
}

/**
 * Précharge les champs pour les pays principaux
 */
export async function preloadMainCountriesFields(): Promise<void> {
  const mainCountries = [
    'CH', 'FR', 'GB', 'US', 'CA', 'AU',  // Pays prioritaires
    'DE', 'BE', 'NL', 'AT', 'LU', 'IT', 'ES', 'PT',  // Europe de l'Ouest
    'DK', 'SE', 'NO', 'FI', 'IE',  // Pays nordiques + Irlande
    'PL', 'CZ'  // Europe de l'Est
  ];
  
  await Promise.all(
    mainCountries.map(async (code) => {
      if (!fieldsCache[code]) {
        await fetchCountryFields(code);
      }
    })
  );
}

/**
 * Valide les données spécifiques d'un pays
 */
export function validateCountryData(
  _countryCode: string,
  data: { [key: string]: string },
  fields: CountryFieldConfig[]
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  fields.forEach((field) => {
    const value = data[field.field_key];

    // Vérifier les champs requis
    if (field.is_required && (!value || value.trim() === '')) {
      errors.push(`${field.field_label} est requis`);
      return;
    }

    // Vérifier la validation regex
    if (value && field.validation_regex) {
      const regex = new RegExp(field.validation_regex);
      if (!regex.test(value)) {
        errors.push(`${field.field_label} : format invalide`);
      }
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Nettoie le cache (utile pour les tests ou le refresh)
 */
export function clearCountryFieldsCache(): void {
  Object.keys(fieldsCache).forEach((key) => delete fieldsCache[key]);
}



