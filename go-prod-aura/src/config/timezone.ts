/**
 * ⚙️ CONFIGURATION GLOBALE DES FUSEAUX HORAIRES
 * 
 * 🌍 Fuseau horaire cible : Europe/Paris (UTC+1 hiver, UTC+2 été)
 * 
 * ⚠️ RÈGLE ABSOLUE : TOUJOURS utiliser les helpers de ce fichier
 * ❌ NE JAMAIS utiliser `new Date(dateString)` directement
 * ✅ TOUJOURS utiliser les fonctions ci-dessous
 */

/**
 * Fuseau horaire principal de l'application
 */
export const APP_TIMEZONE = 'Europe/Paris';

/**
 * Locale française pour le formatage
 */
export const APP_LOCALE = 'fr-FR';

/**
 * Parse une date au format ISO (YYYY-MM-DD) en Date locale Paris
 * 
 * ⚠️ TOUJOURS utiliser cette fonction au lieu de `new Date(dateString)`
 * 
 * @param dateString - Date au format "YYYY-MM-DD"
 * @returns Date locale (fuseau Paris)
 * 
 * @example
 * const date = parseDateLocal('2025-10-30');  // ✅
 * // au lieu de
 * const date = new Date('2025-10-30');  // ❌ UTC minuit = bug timezone
 */
export function parseDateLocal(dateString: string): Date {
  if (!dateString) {
    throw new Error('Date string is required');
  }

  const [year, month, day] = dateString.split('-').map(Number);
  
  if (!year || !month || !day) {
    throw new Error(`Invalid date format: ${dateString}. Expected YYYY-MM-DD`);
  }

  // Créer la date en LOCAL (fuseau Paris)
  // Month - 1 car JavaScript compte les mois de 0 à 11
  return new Date(year, month - 1, day);
}

/**
 * Formate une Date en string ISO (YYYY-MM-DD) sans problème de timezone
 * 
 * @param date - Date à formater
 * @returns String au format "YYYY-MM-DD"
 * 
 * @example
 * const dateStr = formatDateLocal(new Date());  // "2025-10-30"
 */
export function formatDateLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

/**
 * Formate une date en français long (avec jour de la semaine)
 * 
 * @param dateString - Date au format "YYYY-MM-DD"
 * @param options - Options de formatage (optionnel)
 * @returns String formaté (ex: "vendredi 30 octobre 2025")
 * 
 * @example
 * formatDateFr('2025-10-30');  // "vendredi 30 octobre 2025"
 * formatDateFr('2025-10-30', { uppercase: true });  // "VENDREDI 30 OCTOBRE 2025"
 */
export function formatDateFr(
  dateString: string,
  options?: { 
    uppercase?: boolean;
    weekday?: 'long' | 'short' | 'narrow';
    day?: 'numeric' | '2-digit';
    month?: 'long' | 'short' | 'numeric' | '2-digit';
    year?: 'numeric' | '2-digit';
  }
): string {
  const date = parseDateLocal(dateString);
  
  const formatted = date.toLocaleDateString(APP_LOCALE, {
    weekday: options?.weekday || 'long',
    day: options?.day || 'numeric',
    month: options?.month || 'long',
    year: options?.year || 'numeric',
  });
  
  return options?.uppercase ? formatted.toUpperCase() : formatted;
}

/**
 * Formate une date en français court (sans jour de la semaine)
 * 
 * @param dateString - Date au format "YYYY-MM-DD"
 * @returns String formaté (ex: "30/10/2025")
 * 
 * @example
 * formatDateShortFr('2025-10-30');  // "30/10/2025"
 */
export function formatDateShortFr(dateString: string): string {
  const date = parseDateLocal(dateString);
  
  return date.toLocaleDateString(APP_LOCALE, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * Récupère le jour de la semaine en français
 * 
 * @param dateString - Date au format "YYYY-MM-DD"
 * @param format - Format du jour ('long' | 'short' | 'narrow')
 * @returns Nom du jour (ex: "vendredi", "ven", "V")
 * 
 * @example
 * getWeekdayFr('2025-10-30');  // "vendredi"
 * getWeekdayFr('2025-10-30', 'short');  // "ven"
 * getWeekdayFr('2025-10-30', 'narrow');  // "V"
 */
export function getWeekdayFr(
  dateString: string,
  format: 'long' | 'short' | 'narrow' = 'long'
): string {
  const date = parseDateLocal(dateString);
  
  return date.toLocaleDateString(APP_LOCALE, {
    weekday: format,
  });
}

/**
 * Vérifie si une date est aujourd'hui (fuseau Paris)
 * 
 * @param dateString - Date au format "YYYY-MM-DD"
 * @returns true si c'est aujourd'hui
 */
export function isToday(dateString: string): boolean {
  const date = parseDateLocal(dateString);
  const today = new Date();
  
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

/**
 * Récupère la date d'aujourd'hui au format ISO (YYYY-MM-DD)
 * 
 * @returns Date du jour (fuseau Paris)
 * 
 * @example
 * const today = getTodayLocal();  // "2025-10-30"
 */
export function getTodayLocal(): string {
  return formatDateLocal(new Date());
}

/**
 * Ajoute des jours à une date
 * 
 * @param dateString - Date de départ au format "YYYY-MM-DD"
 * @param days - Nombre de jours à ajouter (peut être négatif)
 * @returns Date résultante au format "YYYY-MM-DD"
 * 
 * @example
 * addDays('2025-10-30', 2);   // "2025-11-01"
 * addDays('2025-10-30', -1);  // "2025-10-29"
 */
export function addDays(dateString: string, days: number): string {
  const date = parseDateLocal(dateString);
  date.setDate(date.getDate() + days);
  return formatDateLocal(date);
}

/**
 * Calcule la différence en jours entre deux dates
 * 
 * @param startDate - Date de début au format "YYYY-MM-DD"
 * @param endDate - Date de fin au format "YYYY-MM-DD"
 * @returns Nombre de jours (peut être négatif si endDate < startDate)
 * 
 * @example
 * diffDays('2025-10-30', '2025-11-01');  // 2
 */
export function diffDays(startDate: string, endDate: string): number {
  const start = parseDateLocal(startDate);
  const end = parseDateLocal(endDate);
  
  const diffTime = end.getTime() - start.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Génère un array de dates entre deux dates (inclusif)
 * 
 * @param startDate - Date de début au format "YYYY-MM-DD"
 * @param endDate - Date de fin au format "YYYY-MM-DD"
 * @returns Array de dates au format "YYYY-MM-DD"
 * 
 * @example
 * getDateRange('2025-10-30', '2025-11-01');
 * // ["2025-10-30", "2025-10-31", "2025-11-01"]
 */
export function getDateRange(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  let currentDate = parseDateLocal(startDate);
  const end = parseDateLocal(endDate);
  
  while (currentDate <= end) {
    dates.push(formatDateLocal(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return dates;
}

/**
 * Parse une date depuis un timestamp Unix (en millisecondes)
 * 
 * @param timestamp - Timestamp Unix en millisecondes
 * @returns Date au format "YYYY-MM-DD"
 */
export function fromTimestamp(timestamp: number): string {
  return formatDateLocal(new Date(timestamp));
}

/**
 * Convertit une date en timestamp Unix (en millisecondes)
 * 
 * @param dateString - Date au format "YYYY-MM-DD"
 * @returns Timestamp Unix en millisecondes
 */
export function toTimestamp(dateString: string): number {
  return parseDateLocal(dateString).getTime();
}

/**
 * ⏰ HELPERS POUR LES HEURES (format HH:MM)
 */

/**
 * Valide un format d'heure (HH:MM)
 * 
 * @param timeString - Heure au format "HH:MM"
 * @returns true si valide
 * 
 * @example
 * isValidTime('17:00');  // true
 * isValidTime('25:00');  // false
 * isValidTime('17:60');  // false
 */
export function isValidTime(timeString: string): boolean {
  if (!timeString || typeof timeString !== 'string') {
    return false;
  }

  const timeRegex = /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/;
  return timeRegex.test(timeString);
}

/**
 * Formate une heure en ajoutant un zéro devant si nécessaire
 * 
 * @param timeString - Heure (ex: "9:30" ou "09:30")
 * @returns Heure formatée (ex: "09:30")
 */
export function formatTime(timeString: string): string {
  if (!isValidTime(timeString)) {
    throw new Error(`Invalid time format: ${timeString}. Expected HH:MM`);
  }

  const [hours, minutes] = timeString.split(':');
  return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
}

/**
 * 📝 RÈGLES D'UTILISATION
 * 
 * 1. ✅ TOUJOURS utiliser parseDateLocal() au lieu de new Date(dateString)
 * 2. ✅ TOUJOURS utiliser formatDateLocal() pour convertir Date → string
 * 3. ✅ TOUJOURS stocker les dates au format "YYYY-MM-DD" en base
 * 4. ✅ TOUJOURS stocker les heures au format "HH:MM" en base
 * 5. ❌ NE JAMAIS utiliser toISOString() pour les dates (ajoute timezone)
 * 6. ❌ NE JAMAIS utiliser Date.parse() directement
 * 7. ❌ NE JAMAIS mélanger dates et heures (les séparer)
 * 
 * 📖 Voir TIMEZONE_GUIDE.md pour plus de détails
 */


