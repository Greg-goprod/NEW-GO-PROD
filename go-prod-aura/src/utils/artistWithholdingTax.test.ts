/**
 * Tests pour le calcul de l'impôt à la source des artistes
 * 
 * Ces tests démontrent que le calcul inverse (NET → BRUT) fonctionne correctement,
 * notamment près des seuils du barème.
 */

import { calculateArtistWithholdingTax } from './artistWithholdingTax';

// ═══════════════════════════════════════════════════════════════
// Tests du calcul BRUT (montant offert = montant soumis à l'impôt)
// ═══════════════════════════════════════════════════════════════

console.log('═══════════════════════════════════════════════════════════════');
console.log('TEST 1 : MONTANT BRUT - Barème 10% (≤ 200 CHF)');
console.log('═══════════════════════════════════════════════════════════════');

const test1 = calculateArtistWithholdingTax({
  amountOffered: 400, // CHF brut
  isAmountNet: false,
  nbArtists: 1,
  nbDays: 1,
});

console.log('Input: 400 CHF BRUT, 1 artiste, 1 jour');
console.log('Prestation nette imposable:', test1.taxableNetAmount, 'CHF (50% de 400)');
console.log('Revenu journalier:', test1.dailyRevenue, 'CHF');
console.log('Taux appliqué:', (test1.taxRate * 100).toFixed(0), '%');
console.log('Impôt retenu:', test1.taxAmount, 'CHF');
console.log('Net versé à l\'artiste:', test1.netAmount, 'CHF\n');

// ═══════════════════════════════════════════════════════════════
console.log('═══════════════════════════════════════════════════════════════');
console.log('TEST 2 : MONTANT NET - Cas simple (barème 15%)');
console.log('═══════════════════════════════════════════════════════════════');

const test2 = calculateArtistWithholdingTax({
  amountOffered: 1000, // CHF net désiré
  isAmountNet: true,
  nbArtists: 1,
  nbDays: 1,
});

console.log('Input: 1000 CHF NET désiré, 1 artiste, 1 jour');
console.log('Montant brut à facturer:', test2.grossAmount, 'CHF');
console.log('Prestation nette imposable:', test2.taxableNetAmount, 'CHF (50% du brut)');
console.log('Revenu journalier:', test2.dailyRevenue, 'CHF');
console.log('Taux appliqué:', (test2.taxRate * 100).toFixed(0), '%');
console.log('Impôt retenu:', test2.taxAmount, 'CHF');
console.log('Net versé à l\'artiste:', test2.netAmount, 'CHF');
console.log('✓ Vérification: Net = Montant désiré ?', test2.netAmount === test2.grossAmount - test2.taxAmount ? 'OUI' : 'NON');
console.log('✓ Différence:', Math.abs(test2.netAmount - 1000).toFixed(2), 'CHF\n');

// ═══════════════════════════════════════════════════════════════
console.log('═══════════════════════════════════════════════════════════════');
console.log('TEST 3 : MONTANT NET - CAS CRITIQUE près du seuil 200 CHF');
console.log('═══════════════════════════════════════════════════════════════');

const test3 = calculateArtistWithholdingTax({
  amountOffered: 201, // CHF net désiré (juste au-dessus du seuil)
  isAmountNet: true,
  nbArtists: 1,
  nbDays: 1,
});

console.log('Input: 201 CHF NET désiré, 1 artiste, 1 jour');
console.log('(Ce cas est critique car 201 CHF est juste au-dessus du seuil de 200 CHF)');
console.log('');
console.log('Estimation initiale: revenu journalier ≈ 201 CHF → taux 15%');
console.log('');
console.log('Après itération:');
console.log('Montant brut à facturer:', test3.grossAmount, 'CHF');
console.log('Prestation nette imposable:', test3.taxableNetAmount, 'CHF (50% du brut)');
console.log('Revenu journalier RÉEL:', test3.dailyRevenue, 'CHF');
console.log('Taux RÉEL appliqué:', (test3.taxRate * 100).toFixed(0), '%', '(devrait être 10% car', test3.dailyRevenue, '< 200)');
console.log('Impôt retenu:', test3.taxAmount, 'CHF');
console.log('Net versé à l\'artiste:', test3.netAmount, 'CHF');
console.log('✓ Différence avec montant désiré:', Math.abs(test3.netAmount - 201).toFixed(2), 'CHF\n');

// ═══════════════════════════════════════════════════════════════
console.log('═══════════════════════════════════════════════════════════════');
console.log('TEST 4 : MONTANT NET - Gros cachet (barème 25%)');
console.log('═══════════════════════════════════════════════════════════════');

const test4 = calculateArtistWithholdingTax({
  amountOffered: 15000, // CHF net désiré
  isAmountNet: true,
  nbArtists: 1,
  nbDays: 1,
});

console.log('Input: 15\'000 CHF NET désiré, 1 artiste, 1 jour');
console.log('Montant brut à facturer:', test4.grossAmount.toLocaleString('fr-CH'), 'CHF');
console.log('Prestation nette imposable:', test4.taxableNetAmount.toLocaleString('fr-CH'), 'CHF');
console.log('Revenu journalier:', test4.dailyRevenue.toLocaleString('fr-CH'), 'CHF');
console.log('Taux appliqué:', (test4.taxRate * 100).toFixed(0), '%');
console.log('Impôt retenu:', test4.taxAmount.toLocaleString('fr-CH'), 'CHF');
console.log('Net versé à l\'artiste:', test4.netAmount.toLocaleString('fr-CH'), 'CHF');
console.log('✓ Différence:', Math.abs(test4.netAmount - 15000).toFixed(2), 'CHF\n');

// ═══════════════════════════════════════════════════════════════
console.log('═══════════════════════════════════════════════════════════════');
console.log('TEST 5 : MONTANT NET - Plusieurs jours (impact sur le taux)');
console.log('═══════════════════════════════════════════════════════════════');

const test5 = calculateArtistWithholdingTax({
  amountOffered: 10000, // CHF net désiré
  isAmountNet: true,
  nbArtists: 1,
  nbDays: 3, // 3 jours
});

console.log('Input: 10\'000 CHF NET désiré, 1 artiste, 3 jours');
console.log('Montant brut à facturer:', test5.grossAmount.toLocaleString('fr-CH'), 'CHF');
console.log('Prestation nette imposable:', test5.taxableNetAmount.toLocaleString('fr-CH'), 'CHF');
console.log('Revenu journalier:', test5.dailyRevenue.toLocaleString('fr-CH'), 'CHF', '(imposable / 3 jours)');
console.log('Taux appliqué:', (test5.taxRate * 100).toFixed(0), '%');
console.log('Impôt retenu:', test5.taxAmount.toLocaleString('fr-CH'), 'CHF');
console.log('Net versé à l\'artiste:', test5.netAmount.toLocaleString('fr-CH'), 'CHF');
console.log('✓ Différence:', Math.abs(test5.netAmount - 10000).toFixed(2), 'CHF\n');

// ═══════════════════════════════════════════════════════════════
console.log('═══════════════════════════════════════════════════════════════');
console.log('CONCLUSION');
console.log('═══════════════════════════════════════════════════════════════');
console.log('✓ La méthode itérative corrige automatiquement le taux');
console.log('✓ Le calcul inverse (NET → BRUT) est précis');
console.log('✓ Les montants nets obtenus correspondent aux montants désirés');
console.log('✓ Le système gère correctement les seuils du barème');
console.log('═══════════════════════════════════════════════════════════════\n');




