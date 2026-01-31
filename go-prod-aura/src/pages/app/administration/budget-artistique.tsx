import { useEffect, useState, useMemo } from "react";
import { DollarSign, TrendingUp, AlertCircle, Edit2, Trash2, RefreshCw } from "lucide-react";
import { useI18n } from "../../../lib/i18n";
import { useCurrentEvent } from "../../../hooks/useCurrentEvent";
import { Card, CardBody } from "../../../components/aura/Card";
import { EmptyState } from "../../../components/aura/EmptyState";
import { Button } from "../../../components/aura/Button";
import { PageHeader } from "../../../components/aura/PageHeader";
import { ConfirmDialog } from "../../../components/aura/ConfirmDialog";
import { useToast } from "../../../components/aura/ToastProvider";
import { DailySummaryCards } from "../../../features/timeline/components/DailySummaryCards";
import { PerformanceModal } from "../../../features/booking/modals/PerformanceModal";
import { getCurrentCompanyId } from "../../../lib/tenant";
import { supabase } from "../../../lib/supabaseClient";
import {
  fetchEventDays,
  fetchPerformances,
  deletePerformance,
  type EventDay,
  type Performance,
} from "../../../features/timeline/timelineApi";
import {
  calculateArtistWithholdingTax,
  countUniqueDays,
  type ArtistTaxResult,
} from "../../../utils/artistWithholdingTax";

interface ArtistBudget {
  artist_id: string;
  artist_name: string;
  performances_count: number;
  total_fees_by_currency: Record<string, number>; // Cachets seuls
  total_commission_by_currency: Record<string, number>; // Commissions seules
  total_duration: number;
  performances: Performance[];
  // Totaux des frais additionnels par devise
  total_prod_fee: Record<string, number>;
  total_backline_fee: Record<string, number>;
  total_buyout_hotel: Record<string, number>;
  total_buyout_meal: Record<string, number>;
  total_flight_contribution: Record<string, number>;
  total_technical_fee: Record<string, number>;
  total_all_fees: Record<string, number>; // Total incluant tout (cachet + commission + frais)
  total_in_chf: number; // Total converti en CHF
  withholding_tax_results: Record<string, ArtistTaxResult>; // Résultats du calcul d'impôt à la source par performance (clé = performance ID)
  total_withholding_tax_chf: number; // Total de l'impôt à la source en CHF
}

interface CurrencyRates {
  EUR: number;
  USD: number;
  GBP: number;
  CHF: number;
  [key: string]: number;
}

interface ExchangeRateAPIResponse {
  rates: CurrencyRates;
  time_last_update_utc?: string;
  date?: string;
  time_last_updated?: number;
}

// Fonctions utilitaires (hors composant pour éviter recréation)
// Formater avec apostrophe comme séparateur de milliers (format suisse)
const formatWithApostrophe = (amount: number) => {
  return Math.round(amount).toString().replace(/\B(?=(\d{3})+(?!\d))/g, "'");
};

const formatCurrency = (amount: number, currency: string) => {
  return `${formatWithApostrophe(amount)} ${currency}`;
};

// Formater un montant sans la devise
const formatAmount = (amount: number) => {
  return formatWithApostrophe(amount);
};

const calculateCommissionAmount = (feeAmount: number | null, commissionPercentage: number | null): number => {
  if (!feeAmount || !commissionPercentage) return 0;
  return feeAmount * (commissionPercentage / 100);
};

export default function BudgetArtistiquePage() {
  const { t } = useI18n();
  const { currentEvent } = useCurrentEvent();
  const eventId = currentEvent?.id || "";
  const hasEvent = Boolean(eventId);
  const { success: toastSuccess, error: toastError } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [demoMode, setDemoMode] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);
  
  // Mettre à jour demoMode quand hasEvent change
  useEffect(() => {
    if (hasEvent) {
      setDemoMode(false);
    }
  }, [hasEvent]);
  
  // Données
  const [days, setDays] = useState<EventDay[]>([]);
  const [performances, setPerformances] = useState<Performance[]>([]);
  
  // Modal et suppression
  const [showPerformanceModal, setShowPerformanceModal] = useState(false);
  const [selectedPerformance, setSelectedPerformance] = useState<Performance | null>(null);
  const [deletingPerformance, setDeletingPerformance] = useState<Performance | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Taux de change
  const [currencyRates, setCurrencyRates] = useState<CurrencyRates | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);

  // Récupération du company_id
  useEffect(() => {
    (async () => {
      try {
        const cid = await getCurrentCompanyId(supabase);
        setCompanyId(cid);
      } catch (error) {
        console.error("Erreur récupération company_id:", error);
      }
    })();
  }, []);

  // Charger les taux de change avec cache LocalStorage (actualisation quotidienne)
  useEffect(() => {
    const fetchExchangeRates = async () => {
      try {
        // Vérifier le cache LocalStorage
        const cachedRates = localStorage.getItem('exchangeRates_budget');
        const cachedTime = localStorage.getItem('exchangeRatesTime_budget');
        const cachedUpdate = localStorage.getItem('exchangeRatesUpdate_budget');
        
        if (cachedRates && cachedTime) {
          const cacheAge = Date.now() - parseInt(cachedTime);
          const oneDay = 24 * 60 * 60 * 1000; // 24 heures en millisecondes
          
          if (cacheAge < oneDay) {
            // Cache valide (< 24h) - Utiliser les données en cache
            console.log('✅ Utilisation du cache des taux de change (< 24h)');
            setCurrencyRates(JSON.parse(cachedRates));
            setLastUpdate(cachedUpdate);
            return;
          }
        }
        
        // Cache invalide ou absent → Appel API
        console.log('🔄 Actualisation des taux de change depuis l\'API...');
        const response = await fetch('https://api.exchangerate-api.com/v4/latest/EUR');
        const data: ExchangeRateAPIResponse = await response.json();
        setCurrencyRates(data.rates);
        
        // Extraire la date de mise à jour
        let updateDate = null;
        if (data.time_last_update_utc) {
          updateDate = data.time_last_update_utc;
        } else if (data.time_last_updated) {
          updateDate = new Date(data.time_last_updated * 1000).toUTCString();
        } else if (data.date) {
          updateDate = new Date(data.date).toUTCString();
        }
        
        setLastUpdate(updateDate);
        
        // Sauvegarder dans le cache
        localStorage.setItem('exchangeRates_budget', JSON.stringify(data.rates));
        localStorage.setItem('exchangeRatesTime_budget', Date.now().toString());
        if (updateDate) {
          localStorage.setItem('exchangeRatesUpdate_budget', updateDate);
        }
        console.log('✅ Taux de change mis en cache pour 24h');
        
      } catch (error) {
        console.error('❌ Erreur chargement taux de change:', error);
        // Fallback : taux fixes
        setCurrencyRates({
          EUR: 1,
          CHF: 0.940,
          USD: 1.241,
          GBP: 0.926
        });
        console.log('⚠️ Utilisation des taux fixes (fallback)');
      }
    };

    fetchExchangeRates();
  }, []);

  // Charger les données
  const loadData = async () => {
    if (demoMode) {
      setDays([]);
      setPerformances([]);
      return;
    }
    
    // Ne pas effacer les données si pas d'event (peut être temporaire au rechargement)
    if (!hasEvent || !eventId) {
      return;
    }

    setLoading(true);
    try {
      const [daysData, performancesData] = await Promise.all([
        fetchEventDays(eventId),
        fetchPerformances(eventId),
      ]);

      setDays(daysData);
      setPerformances(performancesData);
    } catch (error) {
      console.error("Erreur chargement données budget:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (eventId) {
      loadData();
    }
  }, [eventId, demoMode]);

  // Rafraîchir les données quand la page redevient visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && eventId && !demoMode) {
        console.log('📊 Page Budget visible - Rafraîchissement des données...');
        loadData();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [eventId, demoMode]);

  // Gérer l'édition d'une performance (finances uniquement)
  const handleEditFinances = (performance: Performance) => {
    if (!companyId) {
      toastError("Company ID manquant");
      return;
    }
    setSelectedPerformance(performance);
    setShowPerformanceModal(true);
  };

  // Gérer la suppression d'une performance
  const handleDeletePerformance = async () => {
    if (!deletingPerformance) return;
    
    setDeleting(true);
    try {
      await deletePerformance(deletingPerformance.id);
      toastSuccess("Performance supprimée");
      setDeletingPerformance(null);
      loadData(); // Recharger les données
    } catch (error: any) {
      console.error("Erreur suppression performance:", error);
      toastError(error?.message || "Erreur lors de la suppression");
    } finally {
      setDeleting(false);
    }
  };

  // Fonctions de conversion avec taux dynamiques
  const convertToCHF = (amount: number, currency: string): number => {
    if (!currencyRates) return amount; // Si pas de taux, retourner le montant tel quel
    
    if (currency === 'CHF') return amount;
    
    // L'API donne les taux depuis EUR
    // Pour convertir vers CHF : montant * taux_de_la_devise_vers_EUR * taux_EUR_vers_CHF
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
  };

  const convertAllToCHF = (amountsByCurrency: Record<string, number>): number => {
    let totalCHF = 0;
    Object.entries(amountsByCurrency).forEach(([currency, amount]) => {
      totalCHF += convertToCHF(amount, currency);
    });
    return totalCHF;
  };

  // Calculer les budgets par artiste
  const artistsBudgets = useMemo(() => {
    const budgetsMap: Record<string, ArtistBudget> = {};

    performances.forEach((perf) => {
      const currency = perf.fee_currency || 'EUR';
      
      if (!budgetsMap[perf.artist_id]) {
        budgetsMap[perf.artist_id] = {
          artist_id: perf.artist_id,
          artist_name: perf.artist_name,
          performances_count: 0,
          total_fees_by_currency: {},
          total_commission_by_currency: {},
          total_duration: 0,
          performances: [],
          total_prod_fee: {},
          total_backline_fee: {},
          total_buyout_hotel: {},
          total_buyout_meal: {},
          total_flight_contribution: {},
          total_technical_fee: {},
          total_all_fees: {},
          total_in_chf: 0,
          withholding_tax_results: {},
          total_withholding_tax_chf: 0,
        };
      }

      const budget = budgetsMap[perf.artist_id];
      budget.performances_count++;
      budget.total_duration += perf.duration || 0;
      budget.performances.push(perf);

      // Cachet principal
      if (perf.fee_amount && perf.fee_currency) {
        budget.total_fees_by_currency[perf.fee_currency] =
          (budget.total_fees_by_currency[perf.fee_currency] || 0) + perf.fee_amount;
        budget.total_all_fees[perf.fee_currency] =
          (budget.total_all_fees[perf.fee_currency] || 0) + perf.fee_amount;
        
        // Commission
        const commissionAmount = calculateCommissionAmount(perf.fee_amount, perf.commission_percentage);
        if (commissionAmount > 0) {
          budget.total_commission_by_currency[perf.fee_currency] =
            (budget.total_commission_by_currency[perf.fee_currency] || 0) + commissionAmount;
          budget.total_all_fees[perf.fee_currency] =
            (budget.total_all_fees[perf.fee_currency] || 0) + commissionAmount;
        }
      }

      // Frais additionnels
      if (perf.prod_fee_amount) {
        budget.total_prod_fee[currency] = (budget.total_prod_fee[currency] || 0) + perf.prod_fee_amount;
        budget.total_all_fees[currency] = (budget.total_all_fees[currency] || 0) + perf.prod_fee_amount;
      }
      if (perf.backline_fee_amount) {
        budget.total_backline_fee[currency] = (budget.total_backline_fee[currency] || 0) + perf.backline_fee_amount;
        budget.total_all_fees[currency] = (budget.total_all_fees[currency] || 0) + perf.backline_fee_amount;
      }
      if (perf.buyout_hotel_amount) {
        budget.total_buyout_hotel[currency] = (budget.total_buyout_hotel[currency] || 0) + perf.buyout_hotel_amount;
        budget.total_all_fees[currency] = (budget.total_all_fees[currency] || 0) + perf.buyout_hotel_amount;
      }
      if (perf.buyout_meal_amount) {
        budget.total_buyout_meal[currency] = (budget.total_buyout_meal[currency] || 0) + perf.buyout_meal_amount;
        budget.total_all_fees[currency] = (budget.total_all_fees[currency] || 0) + perf.buyout_meal_amount;
      }
      if (perf.flight_contribution_amount) {
        budget.total_flight_contribution[currency] = (budget.total_flight_contribution[currency] || 0) + perf.flight_contribution_amount;
        budget.total_all_fees[currency] = (budget.total_all_fees[currency] || 0) + perf.flight_contribution_amount;
      }
      if (perf.technical_fee_amount) {
        budget.total_technical_fee[currency] = (budget.total_technical_fee[currency] || 0) + perf.technical_fee_amount;
        budget.total_all_fees[currency] = (budget.total_all_fees[currency] || 0) + perf.technical_fee_amount;
      }
    });

    // Calculer le total en CHF et l'impôt à la source pour chaque artiste
    Object.values(budgetsMap).forEach((budget) => {
      budget.total_in_chf = convertAllToCHF(budget.total_all_fees);
      
      // Calcul de l'impôt à la source pour chaque performance
      budget.withholding_tax_results = {};
      let totalTaxInCHF = 0;
      
      budget.performances.forEach((perf) => {
        // Ignorer si l'artiste n'est pas soumis à l'impôt à la source (ex: artistes suisses)
        if (perf.subject_to_withholding_tax === false) {
          return;
        }
        
        // On ne calcule l'impôt que si un cachet est renseigné
        if (perf.fee_amount && perf.fee_amount > 0 && perf.fee_currency) {
          // Convertir le montant en CHF pour le calcul
          const feeInCHF = convertToCHF(perf.fee_amount, perf.fee_currency);
          
          // Nombre de jours pour cet artiste (on compte les jours uniques)
          const nbDays = countUniqueDays(budget.performances);
          
          const isAmountNet = perf.fee_is_net ?? false;
          
          if (isAmountNet) {
            // Si offre NETTE : le montant offert est ce que l'artiste touche
            // L'impôt est payé EN PLUS par l'organisateur
            
            // Calculer l'impôt à la source (payé en plus)
            const taxResult = calculateArtistWithholdingTax({
              amountOffered: feeInCHF,
              isAmountNet: true,
              nbArtists: 1,
              nbDays: nbDays,
            });
            
            // On stocke le résultat avec l'ID de la performance comme clé
            budget.withholding_tax_results[perf.id] = {
              ...taxResult,
              netAmount: feeInCHF, // Forcer le montant net = montant offert
            };
            totalTaxInCHF += taxResult.taxAmount;
            
          } else {
            // Si offre BRUTE : l'impôt est déduit du montant brut
            const taxResult = calculateArtistWithholdingTax({
              amountOffered: feeInCHF,
              isAmountNet: false,
              nbArtists: 1,
              nbDays: nbDays,
            });
            
            // On stocke le résultat avec l'ID de la performance comme clé
            budget.withholding_tax_results[perf.id] = taxResult;
            totalTaxInCHF += taxResult.taxAmount;
          }
        }
      });
      
      budget.total_withholding_tax_chf = Math.round(totalTaxInCHF * 100) / 100;
    });

    return Object.values(budgetsMap).sort((a, b) => a.artist_name.localeCompare(b.artist_name));
  }, [performances, currencyRates]);

  // Map des event_days pour acceder a open_time
  const eventDaysMap = useMemo(() => {
    const map = new Map<string, EventDay>();
    days.forEach((d) => map.set(d.id, d));
    return map;
  }, [days]);

  // Convertir "HH:MM" ou "HH:MM:SS" en minutes depuis minuit
  const timeToMinutes = (time: string): number => {
    const parts = time.split(":");
    const h = parseInt(parts[0], 10) || 0;
    const m = parseInt(parts[1], 10) || 0;
    return h * 60 + m;
  };

  // Calculer la date calendaire reelle (si performance apres minuit)
  const computeRealDate = (eventDayDate: string | null | undefined, eventDayId: string | null | undefined, performanceTime: string | null | undefined) => {
    if (!eventDayDate) return null;
    if (!performanceTime) return eventDayDate;

    const day = eventDayId ? eventDaysMap.get(eventDayId) : null;
    if (!day || !day.open_time) return eventDayDate;

    const openMinutes = timeToMinutes(day.open_time);
    const perfMinutes = timeToMinutes(performanceTime);

    // Si l'heure de passage est avant l'heure d'ouverture, c'est le lendemain
    if (perfMinutes < openMinutes) {
      const d = new Date(eventDayDate);
      d.setDate(d.getDate() + 1);
      return d.toISOString().slice(0, 10);
    }

    return eventDayDate;
  };

  // Normaliser l'heure au format HH:MM
  const normalizeTime = (value?: string | null) => {
    if (!value) return "";
    const str = String(value);
    if (str.length >= 5 && str.includes(":")) return str.slice(0, 5);
    return str.padStart(5, "0");
  };

  // Formater la date en format long
  const formatDisplayDateLong = (value: string) => {
    if (!value) return "—";
    const date = new Date(`${value}T00:00:00`);
    return date.toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "2-digit",
      month: "long",
    });
  };

  // Grouper les performances par jour d'evenement et trier par heure
  const performancesByDay = useMemo(() => {
    // Enrichir chaque performance avec les donnees de budget et la date reelle
    const enrichedPerformances = performances.map((perf) => {
      const budget = artistsBudgets.find(b => b.artist_id === perf.artist_id);
      const realDate = computeRealDate(perf.event_day_date, perf.event_day_id, perf.performance_time);
      
      return {
        ...perf,
        budget,
        real_date: realDate,
      };
    });

    // Trier par date puis par heure
    const sorted = [...enrichedPerformances].sort((a, b) => {
      const dateA = a.event_day_date || "";
      const dateB = b.event_day_date || "";
      if (dateA !== dateB) return dateA.localeCompare(dateB);
      const timeA = normalizeTime(a.performance_time);
      const timeB = normalizeTime(b.performance_time);
      return timeA.localeCompare(timeB);
    });

    // Créer un map des performances par date
    const perfsByDate = new Map<string, typeof sorted>();
    sorted.forEach((perf) => {
      const eventDay = perf.event_day_date || "";
      if (!perfsByDate.has(eventDay)) {
        perfsByDate.set(eventDay, []);
      }
      perfsByDate.get(eventDay)!.push(perf);
    });

    // Utiliser tous les jours de l'événement (même sans performances)
    if (days.length > 0) {
      return days
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((day) => ({
          date: day.date,
          items: perfsByDate.get(day.date) || [],
        }));
    }

    // Fallback: grouper par les performances existantes seulement
    const groups: { date: string; items: typeof sorted }[] = [];
    let currentDate = "";
    let currentGroup: typeof sorted = [];

    sorted.forEach((perf) => {
      const eventDay = perf.event_day_date || "";
      if (eventDay !== currentDate) {
        if (currentGroup.length > 0) {
          groups.push({ date: currentDate, items: currentGroup });
        }
        currentDate = eventDay;
        currentGroup = [perf];
      } else {
        currentGroup.push(perf);
      }
    });

    if (currentGroup.length > 0) {
      groups.push({ date: currentDate, items: currentGroup });
    }

    return groups;
  }, [performances, artistsBudgets, eventDaysMap, days]);

  // Calculer les statistiques globales
  const globalStats = useMemo(() => {
    const totalArtists = artistsBudgets.length;
    const totalPerformances = performances.length;
    const totalDuration = performances.reduce((sum, p) => sum + (p.duration || 0), 0);
    
    const totalFeesByCurrency: Record<string, number> = {};
    const totalCommissionByCurrency: Record<string, number> = {};
    const totalAllFeesByCurrency: Record<string, number> = {};
    const totalAdditionalFeesByCurrency: Record<string, number> = {};
    
    // Cachets Net et Brut en CHF
    let totalNetFeesCHF = 0;
    let totalBrutFeesCHF = 0;
    
    // Impôts sur Net et sur Brut
    let totalWithholdingTaxOnNet = 0;
    let totalWithholdingTaxOnBrut = 0;
    
    performances.forEach(perf => {
      const currency = perf.fee_currency || 'EUR';
      
      // Cachet principal
      if (perf.fee_amount && perf.fee_currency) {
        totalFeesByCurrency[perf.fee_currency] = (totalFeesByCurrency[perf.fee_currency] || 0) + perf.fee_amount;
        totalAllFeesByCurrency[perf.fee_currency] = (totalAllFeesByCurrency[perf.fee_currency] || 0) + perf.fee_amount;
        
        // Commission
        const commissionAmount = calculateCommissionAmount(perf.fee_amount, perf.commission_percentage);
        if (commissionAmount > 0) {
          totalCommissionByCurrency[perf.fee_currency] = (totalCommissionByCurrency[perf.fee_currency] || 0) + commissionAmount;
          totalAllFeesByCurrency[perf.fee_currency] = (totalAllFeesByCurrency[perf.fee_currency] || 0) + commissionAmount;
        }
      }
      
      // Frais additionnels
      if (perf.prod_fee_amount) {
        totalAllFeesByCurrency[currency] = (totalAllFeesByCurrency[currency] || 0) + perf.prod_fee_amount;
        totalAdditionalFeesByCurrency[currency] = (totalAdditionalFeesByCurrency[currency] || 0) + perf.prod_fee_amount;
      }
      if (perf.backline_fee_amount) {
        totalAllFeesByCurrency[currency] = (totalAllFeesByCurrency[currency] || 0) + perf.backline_fee_amount;
        totalAdditionalFeesByCurrency[currency] = (totalAdditionalFeesByCurrency[currency] || 0) + perf.backline_fee_amount;
      }
      if (perf.buyout_hotel_amount) {
        totalAllFeesByCurrency[currency] = (totalAllFeesByCurrency[currency] || 0) + perf.buyout_hotel_amount;
        totalAdditionalFeesByCurrency[currency] = (totalAdditionalFeesByCurrency[currency] || 0) + perf.buyout_hotel_amount;
      }
      if (perf.buyout_meal_amount) {
        totalAllFeesByCurrency[currency] = (totalAllFeesByCurrency[currency] || 0) + perf.buyout_meal_amount;
        totalAdditionalFeesByCurrency[currency] = (totalAdditionalFeesByCurrency[currency] || 0) + perf.buyout_meal_amount;
      }
      if (perf.flight_contribution_amount) {
        totalAllFeesByCurrency[currency] = (totalAllFeesByCurrency[currency] || 0) + perf.flight_contribution_amount;
        totalAdditionalFeesByCurrency[currency] = (totalAdditionalFeesByCurrency[currency] || 0) + perf.flight_contribution_amount;
      }
      if (perf.technical_fee_amount) {
        totalAllFeesByCurrency[currency] = (totalAllFeesByCurrency[currency] || 0) + perf.technical_fee_amount;
        totalAdditionalFeesByCurrency[currency] = (totalAdditionalFeesByCurrency[currency] || 0) + perf.technical_fee_amount;
      }
    });

    // Calculer les totaux Net/Brut (montants offerts) et les impôts par budget
    artistsBudgets.forEach(budget => {
      budget.performances.forEach((perf) => {
        // On ne traite que les performances avec un cachet
        if (perf.fee_amount && perf.fee_amount > 0 && perf.fee_currency) {
          const feeInCHF = convertToCHF(perf.fee_amount, perf.fee_currency);
          // Accéder au taxResult via l'ID de la performance
          const taxResult = budget.withholding_tax_results[perf.id];
          const isNet = perf.fee_is_net ?? false;
          
          if (isNet) {
            // Performance NET : le montant offert est le montant net
            totalNetFeesCHF += feeInCHF;
            if (taxResult) {
              totalWithholdingTaxOnNet += taxResult.taxAmount;
            }
          } else {
            // Performance BRUT : le montant offert est le montant brut
            totalBrutFeesCHF += feeInCHF;
            if (taxResult) {
              totalWithholdingTaxOnBrut += taxResult.taxAmount;
            }
          }
        }
      });
    });

    const totalInCHF = convertAllToCHF(totalAllFeesByCurrency);
    const totalCommissionCHF = convertAllToCHF(totalCommissionByCurrency);
    const totalAdditionalFeesCHF = convertAllToCHF(totalAdditionalFeesByCurrency);
    const totalWithholdingTaxCHF = totalWithholdingTaxOnNet + totalWithholdingTaxOnBrut;
    const totalFeesCHF = totalNetFeesCHF + totalBrutFeesCHF;

    return {
      totalArtists,
      totalPerformances,
      totalDuration,
      totalFeesByCurrency,
      totalCommissionByCurrency,
      totalAllFeesByCurrency,
      totalAdditionalFeesByCurrency,
      totalInCHF,
      totalCommissionCHF,
      totalAdditionalFeesCHF,
      totalWithholdingTaxCHF,
      totalWithholdingTaxOnNet,
      totalWithholdingTaxOnBrut,
      totalNetFeesCHF,
      totalBrutFeesCHF,
      totalFeesCHF,
    };
  }, [artistsBudgets, performances]);

  if (!hasEvent && !demoMode) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
        <div className="flex-1 flex items-center justify-center p-6">
          <EmptyState
            title="Aucun événement sélectionné"
            description="Sélectionnez un événement pour accéder au budget artistique."
            action={
              <Button onClick={() => setDemoMode(true)}>
                Activer le mode démo
              </Button>
            }
          />
        </div>
      </div>
    );
  }
  
  return (
    <div className="p-6">
      <PageHeader
        icon={DollarSign}
        title={t('artistic_budget').toUpperCase()}
        actions={
          <Button
            variant="secondary"
            onClick={() => {
              toastSuccess("Actualisation des données...");
              loadData();
            }}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
        }
      />

      {/* Statistiques globales */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6">
        {/* Container 1: Total des cachets en CHF */}
        <Card>
          <CardBody className="flex flex-col h-full">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                <DollarSign className="w-5 h-5 text-gray-700 dark:text-gray-100" />
              </div>
              <p className="text-sm font-bold text-gray-900 dark:text-gray-100 uppercase">Cachets CHF</p>
            </div>
            <div className="space-y-1 flex-1">
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500 dark:text-gray-400">Total Net:</span>
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {formatCurrency(Math.round(globalStats.totalNetFeesCHF), 'CHF')}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500 dark:text-gray-400">Total Brut:</span>
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {formatCurrency(Math.round(globalStats.totalBrutFeesCHF), 'CHF')}
                </span>
              </div>
            </div>
            <div className="pt-2 mt-2 border-t border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-gray-700 dark:text-gray-300">TOTAL:</span>
                <span className="text-base font-bold text-blue-900 dark:text-blue-100 text-right">
                  {formatCurrency(Math.round(globalStats.totalFeesCHF), 'CHF')}
                </span>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Container 2: Total des commissions */}
        <Card>
          <CardBody className="flex flex-col h-full">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                <TrendingUp className="w-5 h-5 text-gray-700 dark:text-gray-100" />
              </div>
              <p className="text-sm font-bold text-gray-900 dark:text-gray-100 uppercase">Commissions</p>
            </div>
            <div className="space-y-1 flex-1">
              {['EUR', 'USD', 'GBP', 'CHF'].map((currency) => (
                <div key={currency} className="flex justify-between items-center">
                  <span className="text-xs text-gray-500 dark:text-gray-400">Com {currency}:</span>
                  <span className="text-xs font-semibold text-gray-900 dark:text-gray-100">
                    {formatCurrency(Math.round(globalStats.totalCommissionByCurrency[currency] || 0), currency)}
                  </span>
                </div>
              ))}
            </div>
            <div className="pt-2 mt-2 border-t border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-gray-700 dark:text-gray-300">TOTAL COM:</span>
                <span className="text-base font-bold text-violet-900 dark:text-violet-100 text-right">
                  {formatCurrency(Math.round(globalStats.totalCommissionCHF), 'CHF')}
                </span>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Container 3: Add Fees */}
        <Card>
          <CardBody className="flex flex-col h-full">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                <AlertCircle className="w-5 h-5 text-gray-700 dark:text-gray-100" />
              </div>
              <p className="text-sm font-bold text-gray-900 dark:text-gray-100 uppercase">Add Fee</p>
            </div>
            <div className="space-y-1 flex-1">
              {['EUR', 'USD', 'GBP', 'CHF'].map((currency) => (
                <div key={currency} className="flex justify-between items-center">
                  <span className="text-xs text-gray-500 dark:text-gray-400">Add {currency}:</span>
                  <span className="text-xs font-semibold text-gray-900 dark:text-gray-100">
                    {formatCurrency(Math.round(globalStats.totalAdditionalFeesByCurrency[currency] || 0), currency)}
                  </span>
                </div>
              ))}
            </div>
            <div className="pt-2 mt-2 border-t border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-gray-700 dark:text-gray-300">TOTAL ADD:</span>
                <span className="text-base font-bold text-orange-900 dark:text-orange-100 text-right">
                  {formatCurrency(Math.round(globalStats.totalAdditionalFeesCHF), 'CHF')}
                </span>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Container 4: Impôts à la source */}
        <Card>
          <CardBody className="flex flex-col h-full">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                <AlertCircle className="w-5 h-5 text-gray-700 dark:text-gray-100" />
              </div>
              <p className="text-sm font-bold text-gray-900 dark:text-gray-100 uppercase">Impôts Source</p>
            </div>
            <div className="space-y-1 flex-1">
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500 dark:text-gray-400">Sur Net:</span>
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {formatCurrency(Math.round(globalStats.totalWithholdingTaxOnNet), 'CHF')}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500 dark:text-gray-400">Sur Brut:</span>
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {formatCurrency(Math.round(globalStats.totalWithholdingTaxOnBrut), 'CHF')}
                </span>
              </div>
            </div>
            <div className="pt-2 mt-2 border-t border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-gray-700 dark:text-gray-300">TOTAL IS:</span>
                <span className="text-base font-bold text-red-900 dark:text-red-100 text-right">
                  {formatCurrency(Math.round(globalStats.totalWithholdingTaxCHF), 'CHF')}
                </span>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Container 5: Budget total */}
        <Card>
          <CardBody className="flex flex-col h-full">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                <DollarSign className="w-5 h-5 text-gray-700 dark:text-gray-100" />
              </div>
              <p className="text-sm font-bold text-gray-900 dark:text-gray-100 uppercase">Budget Total</p>
            </div>
            <div className="space-y-1 flex-1">
              {Object.entries(globalStats.totalAllFeesByCurrency).map(([currency, amount]) => (
                <p key={currency} className="text-xs font-semibold text-gray-900 dark:text-gray-100">
                  {formatCurrency(Math.round(amount), currency)}
                </p>
              ))}
              {Object.keys(globalStats.totalAllFeesByCurrency).length === 0 && (
                <p className="text-xs text-gray-500 dark:text-gray-400">-</p>
              )}
            </div>
            <div className="pt-2 mt-2 border-t border-gray-200 dark:border-gray-700">
              <p className="text-lg font-bold text-green-900 dark:text-green-100 text-right">
                {formatCurrency(Math.round(globalStats.totalInCHF), 'CHF')}
              </p>
            </div>
          </CardBody>
        </Card>

        {/* Container 6: Taux de change - Style violet */}
        <div className="rounded-xl border border-violet-100 dark:border-violet-800/50 bg-gradient-to-r from-violet-50 to-violet-100/50 dark:from-violet-900/30 dark:to-violet-800/20 overflow-hidden shadow-sm">
          <div className="p-4 flex flex-col h-full">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 bg-violet-100 dark:bg-violet-800/50 rounded-lg">
                <DollarSign className="w-5 h-5 text-violet-700 dark:text-violet-300" />
              </div>
              <p className="text-sm font-bold text-violet-700 dark:text-violet-300 uppercase">Taux de change</p>
            </div>
            <div className="space-y-1 flex-1">
              {currencyRates ? (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-violet-600 dark:text-violet-400">1 EUR =</span>
                    <span className="text-xs font-semibold text-violet-900 dark:text-violet-100">
                      {currencyRates.CHF.toFixed(3)} CHF
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-violet-600 dark:text-violet-400">1 USD =</span>
                    <span className="text-xs font-semibold text-violet-900 dark:text-violet-100">
                      {(currencyRates.CHF / currencyRates.USD).toFixed(3)} CHF
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-violet-600 dark:text-violet-400">1 GBP =</span>
                    <span className="text-xs font-semibold text-violet-900 dark:text-violet-100">
                      {(currencyRates.CHF / currencyRates.GBP).toFixed(3)} CHF
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-violet-600 dark:text-violet-400">1 CHF =</span>
                    <span className="text-xs font-semibold text-violet-900 dark:text-violet-100">
                      1.000 CHF
                    </span>
                  </div>
                </>
              ) : (
                <p className="text-xs text-violet-500 dark:text-violet-400">Chargement...</p>
              )}
            </div>
            <div className="pt-2 mt-2 border-t border-violet-200 dark:border-violet-700">
              <div className="text-xs text-violet-500 dark:text-violet-400 text-right">
                {lastUpdate ? (
                  <>Maj: {new Date(lastUpdate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</>
                ) : (
                  <>En temps reel</>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Dashboard avec les 9 containers */}
      <DailySummaryCards 
        days={days} 
        performances={performances}
        totalFeesByCurrency={globalStats.totalFeesByCurrency}
        totalCommissionByCurrency={globalStats.totalCommissionByCurrency}
        totalAllFeesByCurrency={globalStats.totalAllFeesByCurrency}
        totalNetFeesCHF={globalStats.totalNetFeesCHF}
        totalWithholdingTaxCHF={globalStats.totalWithholdingTaxCHF}
        currencyRates={currencyRates}
      />

      {/* Liste des performances par jour - Style Aura */}
      {loading ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          Chargement...
        </div>
      ) : days.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          Aucun jour configure pour cet evenement
        </div>
      ) : (
        <div className="space-y-6">
          {performancesByDay.map((group) => (
            <div
              key={group.date}
              className="rounded-2xl border border-violet-100 dark:border-violet-800/50 bg-white dark:bg-gray-900 overflow-hidden shadow-sm"
            >
              {/* Header du jour */}
              <div className="px-5 py-3 bg-gradient-to-r from-violet-50 to-violet-100/50 dark:from-violet-900/30 dark:to-violet-800/20 border-b border-violet-100 dark:border-violet-800/50">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-violet-700 dark:text-violet-400">
                  {formatDisplayDateLong(group.date)}
                </h3>
                <span className="text-xs text-violet-500 dark:text-violet-500">
                  {group.items.length} artiste{group.items.length > 1 ? "s" : ""}
                </span>
              </div>

              {/* Table header */}
              <div className="overflow-x-auto">
                <div className="min-w-[1200px]">
                  {/* Header row */}
                  <div className="px-5 py-2 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3 text-sm font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    <div className="flex-[2] min-w-[180px]">Artiste</div>
                    <div className="w-16 text-center">Devise</div>
                    <div className="flex-1 min-w-[80px] text-right">Cachet</div>
                    <div className="flex-1 min-w-[100px] text-right">Commission</div>
                    <div className="w-20 text-right">Prod</div>
                    <div className="w-20 text-right">Backline</div>
                    <div className="w-20 text-right">Hotel</div>
                    <div className="w-20 text-right">Meal</div>
                    <div className="w-20 text-right">Vol</div>
                    <div className="w-20 text-right">Tech</div>
                    <div className="flex-1 min-w-[100px] text-right bg-violet-100/50 dark:bg-violet-900/30 px-2 py-1 rounded">Total</div>
                    <div className="flex-1 min-w-[90px] text-right">Impots</div>
                    <div className="flex-1 min-w-[100px] text-right bg-green-100/50 dark:bg-green-900/30 px-2 py-1 rounded">Total HT</div>
                    <div className="w-16 text-center">Actions</div>
                  </div>

                  {/* Liste des performances du jour */}
                  <div className="divide-y divide-gray-100 dark:divide-gray-800">
                    {group.items.length === 0 ? (
                      <div className="px-5 py-4 text-center text-sm text-gray-400 dark:text-gray-500 italic">
                        Aucune performance pour ce jour
                      </div>
                    ) : group.items.map((perf) => {
                      const budget = perf.budget;
                      const feeType = perf.fee_is_net ? 'net' : 'brut';
                      const commissionAmount = calculateCommissionAmount(perf.fee_amount, perf.commission_percentage);
                      
                      // Calculer l'impot pour cette performance
                      // Accéder au taxResult via l'ID de la performance
                      const taxResult = budget?.withholding_tax_results[perf.id] || null;

                      // Calculer le total pour cette performance
                      let perfTotal = 0;
                      if (perf.fee_amount) perfTotal += perf.fee_amount;
                      if (commissionAmount) perfTotal += commissionAmount;
                      if (perf.prod_fee_amount) perfTotal += perf.prod_fee_amount;
                      if (perf.backline_fee_amount) perfTotal += perf.backline_fee_amount;
                      if (perf.buyout_hotel_amount) perfTotal += perf.buyout_hotel_amount;
                      if (perf.buyout_meal_amount) perfTotal += perf.buyout_meal_amount;
                      if (perf.flight_contribution_amount) perfTotal += perf.flight_contribution_amount;
                      if (perf.technical_fee_amount) perfTotal += perf.technical_fee_amount;

                      // Convertir en CHF
                      const perfTotalCHF = convertToCHF(perfTotal, perf.fee_currency || 'EUR');

                      return (
                        <div
                          key={perf.id}
                          className="px-5 py-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                        >
                          {/* Artiste */}
                          <div className="flex-[2] min-w-[180px] flex items-center gap-2">
                            <button
                              onClick={() => handleEditFinances(perf)}
                              className="p-1 text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 transition-colors flex-shrink-0"
                              title="Modifier finances"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                                {perf.artist_name?.toUpperCase()}
                              </div>
                            </div>
                          </div>

                          {/* Devise */}
                          <div className="w-16 text-center">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              {perf.fee_currency || "-"}
                            </span>
                          </div>

                          {/* Cachet */}
                          <div className="flex-1 min-w-[80px] text-right">
                            {perf.fee_amount ? (
                              <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                {formatAmount(perf.fee_amount)} <span className="text-xs text-gray-400">({feeType})</span>
                              </span>
                            ) : (
                              <span className="text-sm text-gray-400">-</span>
                            )}
                          </div>

                          {/* Commission */}
                          <div className="flex-1 min-w-[100px] text-right">
                            {perf.commission_percentage && perf.commission_percentage > 0 ? (
                              <span className="text-sm font-semibold text-violet-700 dark:text-violet-300">
                                {perf.commission_percentage}% - {formatAmount(commissionAmount)}
                              </span>
                            ) : (
                              <span className="text-sm text-gray-400">-</span>
                            )}
                          </div>

                          {/* Prod */}
                          <div className="w-20 text-right">
                            <span className="text-sm text-gray-900 dark:text-gray-100">
                              {perf.prod_fee_amount ? formatAmount(perf.prod_fee_amount) : "-"}
                            </span>
                          </div>

                          {/* Backline */}
                          <div className="w-20 text-right">
                            <span className="text-sm text-gray-900 dark:text-gray-100">
                              {perf.backline_fee_amount ? formatAmount(perf.backline_fee_amount) : "-"}
                            </span>
                          </div>

                          {/* Hotel */}
                          <div className="w-20 text-right">
                            <span className="text-sm text-gray-900 dark:text-gray-100">
                              {perf.buyout_hotel_amount ? formatAmount(perf.buyout_hotel_amount) : "-"}
                            </span>
                          </div>

                          {/* Meal */}
                          <div className="w-20 text-right">
                            <span className="text-sm text-gray-900 dark:text-gray-100">
                              {perf.buyout_meal_amount ? formatAmount(perf.buyout_meal_amount) : "-"}
                            </span>
                          </div>

                          {/* Vol */}
                          <div className="w-20 text-right">
                            <span className="text-sm text-gray-900 dark:text-gray-100">
                              {perf.flight_contribution_amount ? formatAmount(perf.flight_contribution_amount) : "-"}
                            </span>
                          </div>

                          {/* Tech */}
                          <div className="w-20 text-right">
                            <span className="text-sm text-gray-900 dark:text-gray-100">
                              {perf.technical_fee_amount ? formatAmount(perf.technical_fee_amount) : "-"}
                            </span>
                          </div>

                          {/* Total */}
                          <div className="flex-1 min-w-[100px] text-right bg-violet-50 dark:bg-violet-900/20 px-2 py-1 rounded">
                            <span className="text-sm font-bold text-violet-700 dark:text-violet-300">
                              {perfTotal > 0 ? formatCurrency(perfTotal, perf.fee_currency || 'EUR') : "-"}
                            </span>
                          </div>

                          {/* Impots */}
                          <div className="flex-1 min-w-[90px] text-right">
                            {taxResult ? (
                              <span className="text-xs italic text-gray-500 dark:text-gray-400" title={`Taux: ${(taxResult.taxRate * 100).toFixed(0)}%`}>
                                {formatCurrency(taxResult.taxAmount, 'CHF')}
                              </span>
                            ) : (
                              <span className="text-sm text-gray-400">-</span>
                            )}
                          </div>

                          {/* Total CHF */}
                          <div className="flex-1 min-w-[100px] text-right bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded">
                            <span className="text-sm font-bold text-green-700 dark:text-green-300">
                              {perfTotalCHF > 0 ? formatCurrency(perfTotalCHF, 'CHF') : "-"}
                            </span>
                          </div>

                          {/* Actions */}
                          <div className="w-16 flex items-center justify-center gap-1">
                            <button
                              onClick={() => setDeletingPerformance(perf)}
                              className="p-1 text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                              title="Supprimer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de modification des finances */}
      {showPerformanceModal && selectedPerformance && companyId && eventId && (
        <PerformanceModal
          open={showPerformanceModal}
          onClose={() => {
            setShowPerformanceModal(false);
            setSelectedPerformance(null);
          }}
          initialData={{
            eventId: eventId,
            companyId: companyId,
            performanceId: selectedPerformance.id,
            artist_id: selectedPerformance.artist_id,
            event_day_id: selectedPerformance.event_day_id,
            event_stage_id: selectedPerformance.stage_id,
            performance_time: selectedPerformance.performance_time,
            duration: selectedPerformance.duration,
            fee_amount: selectedPerformance.fee_amount,
            fee_currency: selectedPerformance.fee_currency ?? undefined,
            commission_percentage: selectedPerformance.commission_percentage,
            fee_is_net: selectedPerformance.fee_is_net ?? undefined,
            subject_to_withholding_tax: selectedPerformance.subject_to_withholding_tax ?? true,
            booking_status: selectedPerformance.booking_status,
            notes: selectedPerformance.notes ?? undefined,
            prod_fee_amount: selectedPerformance.prod_fee_amount,
            backline_fee_amount: selectedPerformance.backline_fee_amount,
            buyout_hotel_amount: selectedPerformance.buyout_hotel_amount,
            buyout_meal_amount: selectedPerformance.buyout_meal_amount,
            flight_contribution_amount: selectedPerformance.flight_contribution_amount,
            technical_fee_amount: selectedPerformance.technical_fee_amount,
          }}
          onSuccess={() => {
            setShowPerformanceModal(false);
            setSelectedPerformance(null);
            loadData();
          }}
          financesOnly={true}
        />
      )}

      {/* Confirmation de suppression */}
      <ConfirmDialog
        open={!!deletingPerformance}
        onClose={() => setDeletingPerformance(null)}
        onConfirm={handleDeletePerformance}
        title="Supprimer la performance"
        message={`Êtes-vous sûr de vouloir supprimer cette performance ?${deletingPerformance ? `\n\nArtiste : ${deletingPerformance.artist_name}\nScène : ${deletingPerformance.stage_name}\nDate : ${new Date(deletingPerformance.event_day_date).toLocaleDateString('fr-FR')} à ${deletingPerformance.performance_time?.slice(0, 5)}` : ''}`}
        confirmText="Supprimer"
        variant="danger"
        loading={deleting}
      />
    </div>
  );
}
