/**
 * Utilitaires de formatage des montants et devises
 * Format suisse avec apostrophe comme séparateur de milliers
 */

import type { CurrencyCode } from './financeTypes';
import { CURRENCY_SYMBOLS } from './financeTypes';

/**
 * Formate un montant en format suisse (apostrophe pour les milliers)
 * Exemple: 1234567.89 -> "1'234'567.89"
 */
export function formatAmount(amount: number, decimals = 2): string {
  const fixed = amount.toFixed(decimals);
  const [integer, decimal] = fixed.split('.');
  const formattedInteger = integer.replace(/\B(?=(\d{3})+(?!\d))/g, "'");
  return decimal ? `${formattedInteger}.${decimal}` : formattedInteger;
}

/**
 * Formate un montant avec sa devise
 * Exemple: 1234.56, 'EUR' -> "1'234.56 €"
 */
export function formatCurrency(amount: number, currency: CurrencyCode): string {
  const formattedAmount = formatAmount(amount);
  const symbol = CURRENCY_SYMBOLS[currency] || currency;
  
  // Pour CHF, le symbole est après le montant
  // Pour les autres devises aussi (format européen)
  return `${formattedAmount} ${symbol}`;
}

/**
 * Formate un montant avec devise, gère les valeurs null/undefined
 */
export function formatCurrencySafe(
  amount: number | null | undefined,
  currency: CurrencyCode | null | undefined,
  fallback = '-'
): string {
  if (amount === null || amount === undefined) return fallback;
  return formatCurrency(amount, currency || 'EUR');
}

/**
 * Formate un montant compact (K, M pour les grands nombres)
 * Exemple: 1234567 -> "1.23M"
 */
export function formatCompact(amount: number, currency?: CurrencyCode): string {
  const symbol = currency ? CURRENCY_SYMBOLS[currency] || currency : '';
  
  if (Math.abs(amount) >= 1000000) {
    return `${(amount / 1000000).toFixed(2).replace(/\.?0+$/, '')}M ${symbol}`.trim();
  }
  if (Math.abs(amount) >= 1000) {
    return `${(amount / 1000).toFixed(1).replace(/\.?0+$/, '')}K ${symbol}`.trim();
  }
  return `${formatAmount(amount, 0)} ${symbol}`.trim();
}

/**
 * Parse un montant depuis une chaîne (supporte les formats avec apostrophe ou espace)
 * Exemple: "1'234.56" -> 1234.56
 */
export function parseAmount(value: string): number {
  const cleaned = value
    .replace(/['\s]/g, '') // Supprimer apostrophes et espaces
    .replace(',', '.'); // Remplacer virgule par point
  
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Calcule le pourcentage
 */
export function calculatePercentage(part: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((part / total) * 100);
}

/**
 * Formate un pourcentage
 */
export function formatPercentage(value: number): string {
  return `${value}%`;
}

/**
 * Retourne la classe de couleur pour un montant (positif/négatif)
 */
export function getAmountColorClass(amount: number): string {
  if (amount > 0) return 'text-green-500';
  if (amount < 0) return 'text-red-500';
  return 'text-gray-500';
}

/**
 * Formate un montant avec signe (+/-)
 */
export function formatAmountWithSign(amount: number, currency: CurrencyCode): string {
  const sign = amount >= 0 ? '+' : '';
  return `${sign}${formatCurrency(amount, currency)}`;
}

/**
 * Agrège les montants par devise
 */
export function aggregateByCurrency(
  items: { amount: number; currency: CurrencyCode }[]
): Partial<Record<CurrencyCode, number>> {
  return items.reduce((acc, item) => {
    acc[item.currency] = (acc[item.currency] || 0) + item.amount;
    return acc;
  }, {} as Partial<Record<CurrencyCode, number>>);
}

/**
 * Formate plusieurs montants par devise en une chaîne
 * Exemple: { EUR: 1000, CHF: 500 } -> "1'000 € | 500 CHF"
 */
export function formatMultiCurrency(
  totals: Partial<Record<CurrencyCode, number>>,
  separator = ' | '
): string {
  const entries = Object.entries(totals) as [CurrencyCode, number][];
  
  if (entries.length === 0) return '-';
  
  return entries
    .filter(([, amount]) => amount !== 0)
    .map(([currency, amount]) => formatCurrency(amount, currency))
    .join(separator);
}
