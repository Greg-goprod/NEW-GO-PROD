/**
 * Calcul APPROXIMATIF de l'impôt à la source pour les ARTISTES en Suisse
 * 
 * ⚠️ ATTENTION : Ce calcul est une approximation grossière pour du budget prévisionnel.
 * Il ne remplace PAS un calcul fiscal précis et officiel.
 * 
 * Simplifications appliquées :
 * - On ignore les frais pris en charge par l'organisateur (transport, hôtel, repas, etc.)
 * - On applique un forfait fiscal de frais d'acquisition de 50% pour les artistes
 * - Barème simplifié basé sur le canton de Vaud
 */

export type ArtistTaxInput = {
  amountOffered: number;      // montant offert (brut ou net selon isAmountNet)
  isAmountNet: boolean;       // true = net (l'artiste touche ce montant), false = brut (soumis à l'impôt)
  nbArtists?: number;         // nombre d'artistes (défaut: 1)
  nbDays?: number;            // nombre de jours (défaut: 1)
};

export type ArtistTaxResult = {
  grossAmount: number;        // prestation_brute (montant total à facturer)
  netAmount: number;          // montant net versé à l'artiste (après impôt)
  taxableNetAmount: number;   // prestation_nette_imposable (après déduction forfait 50%)
  taxAmount: number;          // montant de l'impôt à retenir
  taxRate: number;            // taux appliqué (ex: 0.15 pour 15%)
  dailyRevenue: number;       // revenu journalier moyen par artiste
  nbArtists: number;          // nombre d'artistes utilisé
  nbDays: number;             // nombre de jours utilisé
};

/**
 * Détermine le taux d'impôt à la source selon le barème simplifié
 * basé sur le revenu journalier moyen par artiste
 * 
 * Barème (ICC + IFD) :
 * - ≤ 200 CHF     → 10%
 * - 201-1000 CHF  → 15%
 * - 1001-3000 CHF → 20%
 * - > 3000 CHF    → 25%
 */
function getTaxRate(dailyRevenue: number): number {
  if (dailyRevenue <= 200) {
    return 0.10; // 10%
  } else if (dailyRevenue <= 1000) {
    return 0.15; // 15%
  } else if (dailyRevenue <= 3000) {
    return 0.20; // 20%
  } else {
    return 0.25; // 25%
  }
}

/**
 * Calcule l'impôt à la source pour un artiste
 * 
 * @param input - Paramètres du calcul
 * @returns Résultat détaillé du calcul fiscal
 */
export function calculateArtistWithholdingTax(input: ArtistTaxInput): ArtistTaxResult {
  // Valeurs par défaut
  const nbArtists = input.nbArtists || 1;
  const nbDays = input.nbDays || 1;
  const amountOffered = input.amountOffered;
  
  // Validation des entrées
  if (amountOffered <= 0) {
    return {
      grossAmount: 0,
      netAmount: 0,
      taxableNetAmount: 0,
      taxAmount: 0,
      taxRate: 0,
      dailyRevenue: 0,
      nbArtists,
      nbDays,
    };
  }

  if (input.isAmountNet) {
    // ════════════════════════════════════════════════════════════════
    // CAS 2 : MONTANT NET (l'artiste doit toucher ce montant en main)
    // ════════════════════════════════════════════════════════════════
    // On doit trouver le montant BRUT à facturer pour qu'après impôt,
    // l'artiste reçoive bien le montant_offert en NET
    
    // Méthode itérative pour converger vers le taux correct
    // (car le taux dépend du revenu journalier qui dépend du montant brut)
    let currentTaxRate = 0;
    let previousTaxRate = -1;
    let grossAmount = 0;
    let taxableNetAmount = 0;
    let iterations = 0;
    const maxIterations = 10; // Sécurité pour éviter boucle infinie
    
    // 1) Estimation initiale du taux à partir du montant net
    const estimatedDailyRevenue = amountOffered / nbArtists / nbDays;
    currentTaxRate = getTaxRate(estimatedDailyRevenue);
    
    // 2) Itération jusqu'à convergence du taux
    while (currentTaxRate !== previousTaxRate && iterations < maxIterations) {
      previousTaxRate = currentTaxRate;
      
      // Calcul du montant brut avec le taux actuel
      // Formule : prestation_brute = montant_net / (1 - 0.5 * taux)
      grossAmount = amountOffered / (1 - 0.5 * currentTaxRate);
      
      // Calcul de la prestation nette imposable
      taxableNetAmount = 0.5 * grossAmount;
      
      // Calcul du revenu journalier réel
      const realDailyRevenue = taxableNetAmount / nbArtists / nbDays;
      
      // Détermination du taux basé sur le revenu journalier réel
      currentTaxRate = getTaxRate(realDailyRevenue);
      
      iterations++;
    }
    
    // 3) Calculs finaux avec le taux convergé
    const taxAmount = taxableNetAmount * currentTaxRate;
    const netAmount = grossAmount - taxAmount;
    const dailyRevenue = taxableNetAmount / nbArtists / nbDays;
    
    return {
      grossAmount: Math.round(grossAmount * 100) / 100,
      netAmount: Math.round(netAmount * 100) / 100,
      taxableNetAmount: Math.round(taxableNetAmount * 100) / 100,
      taxAmount: Math.round(taxAmount * 100) / 100,
      taxRate: currentTaxRate,
      dailyRevenue: Math.round(dailyRevenue * 100) / 100,
      nbArtists,
      nbDays,
    };
    
  } else {
    // ════════════════════════════════════════════════════════════════
    // CAS 1 : MONTANT BRUT (l'impôt sera retenu sur ce montant)
    // ════════════════════════════════════════════════════════════════
    
    const grossAmount = amountOffered;
    
    // 1) Calcul de la prestation nette imposable (après forfait 50%)
    const forfaitaryExpenses = 0.5 * grossAmount;
    const taxableNetAmount = grossAmount - forfaitaryExpenses; // = 0.5 * grossAmount
    
    // 2) Revenu journalier moyen par artiste
    const dailyRevenue = taxableNetAmount / nbArtists / nbDays;
    
    // 3) Détermination du taux selon le barème
    const taxRate = getTaxRate(dailyRevenue);
    
    // 4) Calcul de l'impôt
    const taxAmount = taxableNetAmount * taxRate;
    
    // 5) Montant net versé à l'artiste
    const netAmount = grossAmount - taxAmount;
    
    return {
      grossAmount: Math.round(grossAmount * 100) / 100,
      netAmount: Math.round(netAmount * 100) / 100,
      taxableNetAmount: Math.round(taxableNetAmount * 100) / 100,
      taxAmount: Math.round(taxAmount * 100) / 100,
      taxRate,
      dailyRevenue: Math.round(dailyRevenue * 100) / 100,
      nbArtists,
      nbDays,
    };
  }
}

/**
 * Formate le taux en pourcentage pour l'affichage
 * @param rate - Taux décimal (ex: 0.15)
 * @returns Chaîne formatée (ex: "15%")
 */
export function formatTaxRate(rate: number): string {
  return `${(rate * 100).toFixed(0)}%`;
}

/**
 * Détermine le nombre de jours d'un artiste pour un événement
 * En se basant sur les performances programmées
 * 
 * @param performances - Liste des performances de l'artiste
 * @returns Nombre de jours uniques
 */
export function countUniqueDays(performances: Array<{ event_day_date?: string }>): number {
  const uniqueDates = new Set(
    performances
      .map(p => p.event_day_date)
      .filter((date): date is string => !!date)
  );
  return Math.max(1, uniqueDates.size); // Minimum 1 jour
}

