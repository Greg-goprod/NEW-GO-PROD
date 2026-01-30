import React from "react";
import { Calendar, DollarSign } from "lucide-react";
import type { EventDay, Performance } from "../timelineApi";
import {
  calculateArtistWithholdingTax,
  countUniqueDays,
} from "../../../utils/artistWithholdingTax";

interface DailySummaryCardsProps {
  days: EventDay[];
  performances: Performance[];
  totalFeesByCurrency: Record<string, number>;
  totalCommissionByCurrency: Record<string, number>;
  totalAllFeesByCurrency: Record<string, number>;
  totalNetFeesCHF?: number; // Total des cachets NETS versés aux artistes (après impôts) en CHF
  totalWithholdingTaxCHF?: number; // Total de l'impôt à la source en CHF
  currencyRates: CurrencyRates | null;
}

interface CurrencyRates {
  EUR: number;
  USD: number;
  GBP: number;
  CHF: number;
  [key: string]: number;
}

export function DailySummaryCards({ 
  days, 
  performances,
  totalFeesByCurrency,
  totalCommissionByCurrency,
  totalAllFeesByCurrency,
  totalNetFeesCHF = 0,
  totalWithholdingTaxCHF = 0,
  currencyRates
}: DailySummaryCardsProps) {
  // Calculer la commission
  const calculateCommissionAmount = (feeAmount: number | null, commissionPercentage: number | null): number => {
    if (!feeAmount || !commissionPercentage) return 0;
    return feeAmount * (commissionPercentage / 100);
  };

  // Conversion en CHF avec la même logique que budget-artistique.tsx
  const convertToCHF = React.useCallback((amount: number, currency: string): number => {
    if (!currencyRates) return amount;
    
    if (currency === 'CHF') return amount;
    
    // L'API donne les taux depuis EUR
    const rateCHF = currencyRates.CHF || 1;
    
    if (currency === 'EUR') {
      return amount * rateCHF;
    }
    
    // Pour USD, GBP, etc. : convertir d'abord en EUR puis en CHF
    const rateFromEUR = currencyRates[currency];
    if (!rateFromEUR) return amount;
    
    // Convertir en EUR puis en CHF
    const amountInEUR = amount / rateFromEUR;
    return amountInEUR * rateCHF;
  }, [currencyRates]);

  // Convertir tous les montants d'un objet vers CHF
  const convertAllToCHF = React.useCallback((amountsByCurrency: Record<string, number>): number => {
    let totalCHF = 0;
    Object.entries(amountsByCurrency).forEach(([currency, amount]) => {
      totalCHF += convertToCHF(amount, currency);
    });
    return totalCHF;
  }, [convertToCHF]);

  // Calculer les statistiques par jour
  const dayStats = React.useMemo(() => {
    return days.map(day => {
      const dayPerformances = performances.filter(p => p.event_day_id === day.id);
      
      // Grouper par devise
      const feesByCurrency: Record<string, number> = {};
      const commissionByCurrency: Record<string, number> = {};
      const additionalFeesByCurrency: Record<string, number> = {};
      
      dayPerformances.forEach(perf => {
        const currency = perf.fee_currency || 'EUR';
        
        // Cachets
        if (perf.fee_amount && perf.fee_currency) {
          feesByCurrency[perf.fee_currency] = (feesByCurrency[perf.fee_currency] || 0) + perf.fee_amount;
          
          // Commissions
          const commissionAmount = calculateCommissionAmount(perf.fee_amount, perf.commission_percentage);
          if (commissionAmount > 0) {
            commissionByCurrency[perf.fee_currency] = (commissionByCurrency[perf.fee_currency] || 0) + commissionAmount;
          }
        }
        
        // Frais additionnels
        if (perf.prod_fee_amount) {
          additionalFeesByCurrency[currency] = (additionalFeesByCurrency[currency] || 0) + perf.prod_fee_amount;
        }
        if (perf.backline_fee_amount) {
          additionalFeesByCurrency[currency] = (additionalFeesByCurrency[currency] || 0) + perf.backline_fee_amount;
        }
        if (perf.buyout_hotel_amount) {
          additionalFeesByCurrency[currency] = (additionalFeesByCurrency[currency] || 0) + perf.buyout_hotel_amount;
        }
        if (perf.buyout_meal_amount) {
          additionalFeesByCurrency[currency] = (additionalFeesByCurrency[currency] || 0) + perf.buyout_meal_amount;
        }
        if (perf.flight_contribution_amount) {
          additionalFeesByCurrency[currency] = (additionalFeesByCurrency[currency] || 0) + perf.flight_contribution_amount;
        }
        if (perf.technical_fee_amount) {
          additionalFeesByCurrency[currency] = (additionalFeesByCurrency[currency] || 0) + perf.technical_fee_amount;
        }
      });
      
      // Calculer les impôts à la source pour ce jour
      let totalWithholdingTaxCHF = 0;
      dayPerformances.forEach(perf => {
        // Ignorer si l'artiste n'est pas soumis à l'impôt à la source (ex: artistes suisses)
        if (perf.subject_to_withholding_tax === false) {
          return;
        }
        
        if (perf.fee_amount && perf.fee_amount > 0 && perf.fee_currency) {
          // Convertir en CHF
          const feeInCHF = convertToCHF(perf.fee_amount, perf.fee_currency);
          
          // Nombre de jours pour cet artiste
          const nbDays = countUniqueDays(dayPerformances.filter(p => p.artist_id === perf.artist_id));
          
          // Calculer l'impôt
          const taxResult = calculateArtistWithholdingTax({
            amountOffered: feeInCHF,
            isAmountNet: perf.fee_is_net ?? false,
            nbArtists: 1,
            nbDays: nbDays,
          });
          
          totalWithholdingTaxCHF += taxResult.taxAmount;
        }
      });
      
      return {
        day,
        performanceCount: dayPerformances.length,
        totalFees: feesByCurrency,
        totalCommission: commissionByCurrency,
        totalAdditionalFees: additionalFeesByCurrency,
        totalWithholdingTaxCHF: Math.round(totalWithholdingTaxCHF * 100) / 100,
      };
    });
  }, [days, performances, convertToCHF]);

  // Helper pour formater les montants avec apostrophe comme séparateur de milliers
  const formatCurrency = (amount: number) => {
    return Math.round(amount).toString().replace(/\B(?=(\d{3})+(?!\d))/g, "'");
  };

  // Préparer 9 colonnes : 7 jours + 2 colonnes pour totaux
  const maxDays = 7;
  const allDayCards = [];
  
  // Ajouter les jours réels (max 7)
  for (let i = 0; i < maxDays; i++) {
    if (i < dayStats.length) {
      allDayCards.push(dayStats[i]);
    } else {
      allDayCards.push(null); // Emplacement vide
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-4 mb-6">
      <div className="grid grid-cols-9 gap-3">
      {/* Colonnes 1-7 : Cartes par jour */}
      {allDayCards.map((dayStat, index) => {
        if (!dayStat) {
          // Carte vide
          return (
            <div
              key={`empty-${index}`}
              className="bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-dashed border-gray-300 dark:border-gray-700 min-h-[150px]"
            />
          );
        }

        const { day, totalFees, totalCommission, totalAdditionalFees, totalWithholdingTaxCHF } = dayStat;
        
        // Convertir en CHF
        const feesCHF = convertAllToCHF(totalFees);
        const commissionCHF = convertAllToCHF(totalCommission);
        const additionalFeesCHF = convertAllToCHF(totalAdditionalFees);
        const totalCHF = feesCHF + commissionCHF + additionalFeesCHF;
        
        return (
          <div
            key={day.id}
            className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700 shadow-sm"
          >
            {/* Header - Jour et date sur une ligne */}
            <div className="flex items-center gap-1.5 mb-2">
              <Calendar className="w-4 h-4 text-violet-600 dark:text-violet-400 shrink-0" />
              <div className="flex items-baseline gap-1.5 overflow-hidden">
                <h3 className="text-xs font-bold text-violet-600 dark:text-violet-400 uppercase whitespace-nowrap">
                  {new Date(day.date).toLocaleDateString('fr-FR', { weekday: 'long' })}
                </h3>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                  {new Date(day.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                </p>
              </div>
            </div>

            {/* Totaux en CHF par catégorie */}
            <div className="space-y-1.5">
              {/* Fee */}
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wide">Fee:</span>
                <span className="text-xs font-bold text-gray-900 dark:text-gray-100">
                  {formatCurrency(Math.round(feesCHF))} CHF
                </span>
              </div>

              {/* Commission */}
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wide">Com:</span>
                <span className="text-xs font-bold text-gray-900 dark:text-gray-100">
                  {formatCurrency(Math.round(commissionCHF))} CHF
                </span>
              </div>

              {/* Frais additionnels */}
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wide">Add:</span>
                <span className="text-xs font-bold text-gray-900 dark:text-gray-100">
                  {formatCurrency(Math.round(additionalFeesCHF))} CHF
                </span>
              </div>

              {/* Impôts à la source */}
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wide">IS:</span>
                <span className="text-xs font-bold text-gray-900 dark:text-gray-100">
                  {formatCurrency(Math.round(totalWithholdingTaxCHF || 0))} CHF
                </span>
              </div>
            </div>

            {/* Total CHF */}
            <div className="mt-2 pt-1.5 border-t border-gray-200 dark:border-gray-700">
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold text-gray-700 dark:text-gray-300 uppercase block">Total:</span>
                <span className="text-sm font-bold text-gray-900 dark:text-gray-100 block text-right">
                  {formatCurrency(Math.round(totalCHF))} CHF
                </span>
              </div>
            </div>
          </div>
        );
      })}

      {/* Colonnes 8-9 : Totaux Généraux (CHF) - occupe 2 colonnes */}
      <div className="col-span-2 bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <DollarSign className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          <h3 className="text-xs font-bold text-gray-900 dark:text-gray-100 uppercase">
            Totaux CHF
          </h3>
        </div>

        <div className="space-y-1.5">
          {/* Cachets nets (après impôts) */}
          <div className="flex justify-between items-center">
            <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wide">Cachets nets:</span>
            <span className="text-xs font-bold text-gray-900 dark:text-gray-100">
              {formatCurrency(Math.round(totalNetFeesCHF))} CHF
            </span>
          </div>

          {/* Commissions */}
          <div className="flex justify-between items-center">
            <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wide">Commissions:</span>
            <span className="text-xs font-bold text-gray-900 dark:text-gray-100">
              {formatCurrency(Math.round(convertAllToCHF(totalCommissionByCurrency)))} CHF
            </span>
          </div>

          {/* Frais additionnels */}
          <div className="flex justify-between items-center">
            <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wide">Frais add.:</span>
            <span className="text-xs font-bold text-gray-900 dark:text-gray-100">
              {formatCurrency(Math.round(
                convertAllToCHF(totalAllFeesByCurrency) - 
                convertAllToCHF(totalFeesByCurrency) - 
                convertAllToCHF(totalCommissionByCurrency)
              ))} CHF
            </span>
          </div>

          {/* Impôts à la source */}
          <div className="flex justify-between items-center">
            <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wide">Impôts source:</span>
            <span className="text-xs font-bold text-gray-900 dark:text-gray-100">
              {formatCurrency(Math.round(totalWithholdingTaxCHF))} CHF
            </span>
          </div>

          {/* Séparateur */}
          <div className="border-t border-gray-200 dark:border-gray-700 my-1.5"></div>

          {/* Total global */}
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wide">Total global:</span>
            <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
              {formatCurrency(Math.round(convertAllToCHF(totalAllFeesByCurrency)))} CHF
            </span>
          </div>
        </div>
      </div>

      </div>
    </div>
  );
}
