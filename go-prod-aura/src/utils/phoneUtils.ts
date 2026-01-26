import { parsePhoneNumber, isValidPhoneNumber } from 'libphonenumber-js/max';
import type { CountryCode } from 'libphonenumber-js/max';

/**
 * Liste des pays principaux avec leurs codes ISO
 */
export const PRIMARY_COUNTRIES: CountryCode[] = [
  'CH', // Suisse
  'FR', // France
  'GB', // Royaume-Uni
  'US', // USA
  'DE', // Allemagne
  'IT', // Italie
  'ES', // Espagne
  'BE', // Belgique
  'NL', // Pays-Bas
  'AT', // Autriche
  'PT', // Portugal
  'SE', // Suède
  'NO', // Norvège
  'DK', // Danemark
  'FI', // Finlande
  'IE', // Irlande
  'PL', // Pologne
  'CZ', // République Tchèque
  'GR', // Grèce
  'LU', // Luxembourg
];

/**
 * Noms des pays en français
 */
export const COUNTRY_NAMES: Record<string, string> = {
  CH: '🇨🇭 Suisse',
  FR: '🇫🇷 France',
  GB: '🇬🇧 Royaume-Uni',
  US: '🇺🇸 États-Unis',
  DE: '🇩🇪 Allemagne',
  IT: '🇮🇹 Italie',
  ES: '🇪🇸 Espagne',
  BE: '🇧🇪 Belgique',
  NL: '🇳🇱 Pays-Bas',
  AT: '🇦🇹 Autriche',
  PT: '🇵🇹 Portugal',
  SE: '🇸🇪 Suède',
  NO: '🇳🇴 Norvège',
  DK: '🇩🇰 Danemark',
  FI: '🇫🇮 Finlande',
  IE: '🇮🇪 Irlande',
  PL: '🇵🇱 Pologne',
  CZ: '🇨🇿 République Tchèque',
  GR: '🇬🇷 Grèce',
  LU: '🇱🇺 Luxembourg',
  CA: '🇨🇦 Canada',
  AU: '🇦🇺 Australie',
  NZ: '🇳🇿 Nouvelle-Zélande',
  JP: '🇯🇵 Japon',
  CN: '🇨🇳 Chine',
  IN: '🇮🇳 Inde',
  BR: '🇧🇷 Brésil',
  MX: '🇲🇽 Mexique',
  AR: '🇦🇷 Argentine',
  ZA: '🇿🇦 Afrique du Sud',
};

/**
 * Nettoyer un numéro de téléphone et le convertir au format E.164
 * @param phoneNumber - Numéro brut saisi par l'utilisateur
 * @param defaultCountry - Code pays par défaut (ex: 'CH')
 * @returns Numéro au format E.164 (+41791234567) ou null si invalide
 */
export function cleanPhoneNumber(phoneNumber: string, defaultCountry: CountryCode = 'CH'): string | null {
  if (!phoneNumber || phoneNumber.trim() === '') {
    return null;
  }

  try {
    // Parser le numéro avec le pays par défaut
    const parsed = parsePhoneNumber(phoneNumber, defaultCountry);
    
    // Vérifier si le numéro est valide
    if (parsed && parsed.isValid()) {
      // Retourner le format E.164 (ex: +41791234567)
      return parsed.format('E.164');
    }
    
    return null;
  } catch (error) {
    // En cas d'erreur de parsing, retourner null
    console.warn('Erreur lors du nettoyage du numéro:', phoneNumber, error);
    return null;
  }
}

/**
 * Valider un numéro de téléphone
 * @param phoneNumber - Numéro à valider
 * @param country - Code pays optionnel
 * @returns true si le numéro est valide
 */
export function validatePhoneNumber(phoneNumber: string, country?: CountryCode): boolean {
  if (!phoneNumber || phoneNumber.trim() === '') {
    return false;
  }

  try {
    return isValidPhoneNumber(phoneNumber, country);
  } catch (error) {
    return false;
  }
}

/**
 * Formater un numéro de téléphone pour l'affichage
 * @param phoneNumber - Numéro au format E.164 ou brut
 * @param format - Format d'affichage ('INTERNATIONAL' par défaut)
 * @returns Numéro formaté pour l'affichage
 */
export function formatPhoneNumber(
  phoneNumber: string | null | undefined,
  format: 'INTERNATIONAL' | 'NATIONAL' | 'E.164' = 'INTERNATIONAL'
): string {
  if (!phoneNumber || phoneNumber.trim() === '') {
    return '';
  }

  try {
    const parsed = parsePhoneNumber(phoneNumber);
    if (parsed && parsed.isValid()) {
      return parsed.format(format);
    }
    return phoneNumber; // Retourner tel quel si parsing échoue
  } catch (error) {
    return phoneNumber; // Retourner tel quel si parsing échoue
  }
}

/**
 * Détecter le pays d'un numéro de téléphone
 * @param phoneNumber - Numéro de téléphone
 * @returns Code pays (ex: 'CH') ou null
 */
export function detectCountry(phoneNumber: string): CountryCode | null {
  if (!phoneNumber || phoneNumber.trim() === '') {
    return null;
  }

  try {
    const parsed = parsePhoneNumber(phoneNumber);
    return parsed?.country || null;
  } catch (error) {
    return null;
  }
}

/**
 * Générer un lien WhatsApp à partir d'un numéro
 * @param phoneNumber - Numéro au format E.164 ou brut
 * @returns URL WhatsApp ou null
 */
export function getWhatsAppLink(phoneNumber: string | null | undefined): string | null {
  if (!phoneNumber) {
    return null;
  }

  // Nettoyer le numéro (format E.164)
  const cleaned = cleanPhoneNumber(phoneNumber);
  if (!cleaned) {
    return null;
  }

  // Retirer le + du début pour WhatsApp
  const whatsappNumber = cleaned.replace(/^\+/, '');
  return `https://wa.me/${whatsappNumber}`;
}

/**
 * Obtenir le drapeau emoji d'un pays
 * @param countryCode - Code pays ISO (ex: 'CH')
 * @returns Emoji drapeau (ex: '🇨🇭')
 */
export function getCountryFlag(countryCode: string): string {
  if (!countryCode || countryCode.length !== 2) {
    return '🌍';
  }
  
  // Convertir le code pays en emoji drapeau
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));
  
  return String.fromCodePoint(...codePoints);
}

/**
 * Obtenir le nom d'un pays
 * @param countryCode - Code pays ISO (ex: 'CH')
 * @returns Nom du pays avec drapeau (ex: '🇨🇭 Suisse')
 */
export function getCountryName(countryCode: string): string {
  return COUNTRY_NAMES[countryCode] || `${getCountryFlag(countryCode)} ${countryCode}`;
}




