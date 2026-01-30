// Utilitaires pour la gestion des dates et heures

export function toHHMM(date: Date): string {
  return date.toTimeString().slice(0, 5);
}

export function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}

/**
 * Sanitize un nom pour qu'il soit compatible avec Supabase Storage
 * - Remplace les accents par leurs équivalents sans accent
 * - Remplace les espaces par des underscores
 * - Supprime les caractères spéciaux non autorisés
 */
export function sanitizeForStorage(name: string): string {
  return name
    .trim()
    // Normaliser les accents (NFD décompose, puis on supprime les diacritiques)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    // Remplacer les espaces par des underscores
    .replace(/\s+/g, '_')
    // Garder seulement les caractères alphanumériques, tirets, underscores et points
    .replace(/[^a-zA-Z0-9_\-\.]/g, '')
    // Éviter les underscores multiples
    .replace(/_+/g, '_');
}

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

export function formatTime(time: string): string {
  const [hours, minutes] = time.split(':');
  return `${hours}h${minutes}`;
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function isToday(date: string | Date): boolean {
  const d = typeof date === 'string' ? new Date(date) : date;
  const today = new Date();
  return d.toDateString() === today.toDateString();
}

export function isPast(date: string | Date): boolean {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d < new Date();
}

export function formatIsoDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

export function isFuture(date: string | Date): boolean {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d > new Date();
}