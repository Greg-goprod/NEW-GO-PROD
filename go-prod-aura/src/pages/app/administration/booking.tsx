/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardHeader, CardBody } from "@/components/aura/Card";
import { Button } from "@/components/aura/Button";
import { Badge } from "@/components/aura/Badge";
import { Modal } from "@/components/aura/Modal";
import { PageHeader } from "@/components/aura/PageHeader";
import { useToast } from "@/components/aura/ToastProvider";
import { ConfirmDeleteModal } from "@/components/ui/ConfirmDeleteModal";
import { Settings, Plus, Calendar, Eye } from "lucide-react";

// import { OffersKanban } from "@/features/booking/OffersKanban"; // TEMPORAIRE: Kanban supprimé
import { OffersListView } from "@/features/booking/OffersListView";
import { OfferComposer } from "@/features/booking/modals/OfferComposer";
import { SendOfferModal } from "@/features/booking/modals/SendOfferModal";
import { RejectOfferModal } from "@/features/booking/modals/RejectOfferModal";
import { PerformanceModal } from "@/features/booking/modals/PerformanceModal";

import type { Offer, OfferFilters, OfferSort, OfferStatus } from "@/features/booking/bookingTypes";
import {
  listOffers, moveOffer, getRejectedPerformances,
  prepareOfferPdfPath, createSignedOfferPdfUrl, deleteOffer, generateOfferPdfOnStatusChange
} from "@/features/booking/bookingApi";
// import { listOfferClauses } from "@/features/booking/advancedBookingApi";
// import { generateContractPdfWithClauses } from "@/features/booking/pdfGenerator";
import { sendOfferEmail } from "@/services/emailService";
import { useCompanyId } from "@/hooks/useCompanyId";
import { supabase } from "@/lib/supabaseClient";
import { fetchPerformances, fetchEventDays, type Performance, type EventDay } from "@/features/timeline/timelineApi";

// Convertit "HH:MM" ou "HH:MM:SS" en minutes depuis minuit
function timeToMinutes(time: string): number {
  const parts = time.split(":");
  const h = parseInt(parts[0], 10) || 0;
  const m = parseInt(parts[1], 10) || 0;
  return h * 60 + m;
}

// Simple error box to avoid white screen
function ErrorBox({ error }: { error: any }) {
  if (!error) return null;
  return (
    <div className="p-3 rounded-md border border-red-300 bg-red-50 text-red-800 dark:bg-red-900/30 dark:border-red-700 dark:text-red-200">
      <div className="font-semibold mb-1">Erreur d'affichage</div>
      <pre className="text-xs overflow-auto">{String(error?.message || error)}</pre>
    </div>
  );
}

// DEMO DATA (hors du composant pour éviter les re-créations)
const demoOffers: any[] = [
  { id:"o1", company_id:"c1", event_id:"e1", artist_id:"a1", stage_id:"s1", status:"draft", artist_name:"Artist Alpha", stage_name:"Main", amount_display: 2000, currency:"EUR" },
  { id:"o2", company_id:"c1", event_id:"e1", artist_id:"a2", stage_id:"s2", status:"ready_to_send", artist_name:"Bravo", stage_name:"Club", amount_display: 1500, currency:"EUR" },
  { id:"o3", company_id:"c1", event_id:"e1", artist_id:"a3", stage_id:"s1", status:"sent", artist_name:"Charlie", stage_name:"Main", amount_display: 2500, currency:"EUR" },
  { id:"o4", company_id:"c1", event_id:"e1", artist_id:"a4", stage_id:"s3", status:"accepted", artist_name:"Delta", stage_name:"Acoustic", amount_display: 1800, currency:"EUR" },
  { id:"o5", company_id:"c1", event_id:"e1", artist_id:"a5", stage_id:"s2", status:"rejected", artist_name:"Echo", stage_name:"Club", amount_display: 1200, currency:"EUR" },
];
const demoRejected: any[] = [
  { performance_id:"p2", event_day_date:"2025-08-21", performance_time:"22:00", duration:45, artist_name:"Yankee", stage_name:"Club", rejection_reason:"Budget" },
];
const demoPerformances: Performance[] = [
  {
    id: "perf_demo_1",
    artist_id: "a1",
    artist_name: "Artist Alpha",
    stage_id: "s1",
    stage_name: "Mainstage",
    event_day_id: "day_demo_1",
    event_day_date: "2025-08-20",
    performance_time: "18:00",
    duration: 60,
    fee_amount: 2000,
    fee_currency: "EUR",
    commission_percentage: null,
    booking_status: "offre_a_faire",
    rejection_reason: null,
    rejection_date: null,
    notes: null,
    is_confirmed: false,
    confirmed_at: null,
    prod_fee_amount: null,
    backline_fee_amount: null,
    buyout_hotel_amount: null,
    buyout_meal_amount: null,
    flight_contribution_amount: null,
    technical_fee_amount: null,
    card_color: null,
  },
  {
    id: "perf_demo_2",
    artist_id: "a2",
    artist_name: "Bravo",
    stage_id: "s2",
    stage_name: "Club",
    event_day_id: "day_demo_1",
    event_day_date: "2025-08-20",
    performance_time: "20:00",
    duration: 45,
    fee_amount: 1500,
    fee_currency: "EUR",
    commission_percentage: null,
    booking_status: "offre_envoyee",
    rejection_reason: null,
    rejection_date: null,
    notes: null,
    is_confirmed: false,
    confirmed_at: null,
    prod_fee_amount: null,
    backline_fee_amount: null,
    buyout_hotel_amount: null,
    buyout_meal_amount: null,
    flight_contribution_amount: null,
    technical_fee_amount: null,
    card_color: null,
  },
  {
    id: "perf_demo_3",
    artist_id: "a6",
    artist_name: "Sigma",
    stage_id: "s3",
    stage_name: "Acoustic",
    event_day_id: "day_demo_2",
    event_day_date: "2025-08-21",
    performance_time: "22:00",
    duration: 50,
    fee_amount: null,
    fee_currency: null,
    commission_percentage: null,
    booking_status: "idee",
    rejection_reason: null,
    rejection_date: null,
    notes: null,
    is_confirmed: false,
    confirmed_at: null,
    prod_fee_amount: null,
    backline_fee_amount: null,
    buyout_hotel_amount: null,
    buyout_meal_amount: null,
    flight_contribution_amount: null,
    technical_fee_amount: null,
    card_color: null,
  },
];

const demoEventDays: EventDay[] = [
  { id: "day_demo_1", date: "2025-08-20", open_time: "17:00", close_time: "03:00" },
  { id: "day_demo_2", date: "2025-08-21", open_time: "17:00", close_time: "03:00" },
];

export default function AdminBookingPage() {
  // TOUS les hooks DOIVENT être appelés dans le même ordre à chaque render
  const { success: toastSuccess, error: toastError } = useToast();
  const navigate = useNavigate();
  
  // Utiliser le hook pour le company_id (synchrone depuis localStorage)
  const { companyId } = useCompanyId();
  
  const [demoMode, setDemoMode] = useState(false);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [performances, setPerformances] = useState<Performance[]>([]);
  const [eventDays, setEventDays] = useState<EventDay[]>([]);
  const [rejectedPerfs, setRejectedPerfs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<OfferFilters>({});
  const [sort, setSort] = useState<OfferSort>({ field: "created_at", direction: "desc" });
  const [showComposer, setShowComposer] = useState(false);
  const [prefilledOfferData, setPrefilledOfferData] = useState<any>(null);
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [showSendModal, setShowSendModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showPerformanceModal, setShowPerformanceModal] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [selectedPerformance, setSelectedPerformance] = useState<any>(null);
  const [deletingOffer, setDeletingOffer] = useState<Offer | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [renderError, setRenderError] = useState<any>(null);

  // Valeurs calculées directement (PAS de hooks conditionnels)
  const eventId =
    localStorage.getItem("selected_event_id") ||
    localStorage.getItem("current_event_id") ||
    "";
  const hasEvent = Boolean(eventId);

  // Initialiser demoMode au premier render
  useEffect(() => {
    if (!hasEvent) {
      setDemoMode(true);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Fonction pour charger les offres
  const loadOffers = useCallback(async () => {
    if (demoMode) {
      // Pas d'appels RPC en mode démo
      setOffers(demoOffers as any);
      setRejectedPerfs(demoRejected as any);
      setPerformances(demoPerformances);
      setEventDays(demoEventDays);
      return;
    }
    if (!hasEvent) return;

    try {
      setRenderError(null);
      setLoading(true);
      const [o, r, p, d] = await Promise.all([
        listOffers({ eventId, filters, sort, limit: 300, offset: 0 }),
        getRejectedPerformances(eventId),
        fetchPerformances(eventId),
        fetchEventDays(eventId),
      ]);
      setOffers(o || []);
      setRejectedPerfs(r || []);
      setPerformances(p || []);
      setEventDays(d || []);
    } catch (e:any) {
      console.error("[Booking] load error", e);
      toastError(e?.message || "Erreur de chargement Booking");
      setRenderError(e);
    } finally {
      setLoading(false);
    }
  }, [demoMode, hasEvent, eventId, filters, sort, toastError]);

  useEffect(() => {
    loadOffers();
  }, [loadOffers]);

  // 🔄 Rafraîchissement automatique au retour sur la page
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('[REFRESH] Page visible - Rechargement des données...');
        loadOffers();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [loadOffers]);

  // 🔴 SUPABASE REALTIME - Écoute des changements en temps réel
  useEffect(() => {
    if (!eventId || demoMode) return;

    console.log('[REALTIME] REALTIME activé pour event:', eventId);

    const channel = supabase
      .channel(`booking-realtime-${eventId}`)
      // Écouter les changements sur artist_performances
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'artist_performances',
          filter: `event_id=eq.${eventId}`,
        },
        (payload) => {
          console.log('[REALTIME] [performances] -', payload.eventType, payload);
          loadOffers();
        }
      )
      // Écouter les changements sur offers
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'offers',
          filter: `event_id=eq.${eventId}`,
        },
        (payload) => {
          console.log('[REALTIME] [offers] -', payload.eventType, payload);
          loadOffers();
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[REALTIME] Connecté');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[REALTIME] Erreur de connexion');
        }
      });

    // Cleanup au unmount
    return () => {
      console.log('[REALTIME] Désinscription');
      supabase.removeChannel(channel);
    };
  }, [eventId, demoMode, loadOffers]);

  const rejectedPerfItems = useMemo(() => {
    return (rejectedPerfs || []).map((perf: any) => ({
      id: perf.id, // Déjà préfixé avec 'perf_' par la fonction RPC
      type: "performance",
      artist_id: perf.artist_id,
      artist_name: perf.artist_name,
      stage_id: perf.stage_id,
      stage_name: perf.stage_name,
      date_time: perf.date_time,
      performance_time: perf.performance_time,
      duration: perf.duration,
      rejection_reason: perf.rejection_reason,
      rejected_at: perf.rejection_date, // Mapper rejection_date vers rejected_at pour l'affichage
      status: "offre_rejetee",
      ready_to_send: false,
    }));
  }, [rejectedPerfs]);

  const acceptedOffers = useMemo(() => {
    return offers.filter((o) => o.status === "accepted");
  }, [offers]);

  const rejectedOffers = useMemo(() => {
    const rejectedOffersList = offers.filter((o) => o.status === "rejected");
    const rejectedPerfsList = rejectedPerfItems as any[];
    
    // Dédupliquer par artist_id : priorité à l'offre (qui a plus d'infos comme le montant)
    const seenArtistIds = new Set<string>();
    const deduped: any[] = [];
    
    // D'abord ajouter les offres rejetées (prioritaires car elles ont le montant)
    for (const offer of rejectedOffersList) {
      if (offer.artist_id) {
        seenArtistIds.add(offer.artist_id);
      }
      deduped.push(offer);
    }
    
    // Ensuite ajouter les performances rejetées SEULEMENT si l'artiste n'a pas déjà une offre rejetée
    for (const perf of rejectedPerfsList) {
      if (perf.artist_id && !seenArtistIds.has(perf.artist_id)) {
        seenArtistIds.add(perf.artist_id);
        deduped.push(perf);
      }
    }
    
    return deduped;
  }, [offers, rejectedPerfItems]);

  // Map event_day_id -> EventDay pour accéder à open_time
  const eventDaysMap = useMemo(() => {
    const map = new Map<string, EventDay>();
    eventDays.forEach((d) => map.set(d.id, d));
    return map;
  }, [eventDays]);

  // Utilitaire : calcule la date calendaire réelle en tenant compte de la plage horaire
  // Si performance_time < open_time du jour, c'est le lendemain calendaire
  const computeRealDate = useCallback((eventDayDate: string | null | undefined, eventDayId: string | null | undefined, performanceTime: string | null | undefined) => {
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
  }, [eventDaysMap]);

  const offersListRows = useMemo(() => {
    const normalizeTime = (value?: string | null) => {
      if (!value) return null;
      return String(value).slice(0, 5);
    };

    const buildKey = (artistId?: string | null, stageId?: string | null, time?: string | null) => {
      if (!artistId) return null;
      return `${artistId}__${stageId || "no-stage"}__${normalizeTime(time) || "no-time"}`;
    };

    const offersByKey = new Map<string, Offer>();
    offers.forEach((offer) => {
      const key = buildKey(offer.artist_id, offer.stage_id, offer.performance_time || offer.date_time);
      if (key) {
        offersByKey.set(key, offer);
      }
    });

    const matchedOfferIds = new Set<string>();

    const performanceRows = performances.map((perf) => {
      const key = buildKey(perf.artist_id, perf.stage_id, perf.performance_time);
      const linkedOffer = key ? offersByKey.get(key) : undefined;

      const rawDate = perf.event_day_date ||
        (linkedOffer as any)?.event_day_date ||
        (linkedOffer?.date_time ? linkedOffer.date_time.slice(0, 10) : null);

      const realDate = computeRealDate(rawDate, perf.event_day_id, perf.performance_time || linkedOffer?.performance_time);

      if (linkedOffer) {
        matchedOfferIds.add(linkedOffer.id);
        return {
          ...linkedOffer,
          // IMPORTANT: Garder l'ID de la performance pour pouvoir charger les finances
          performance_id: perf.id,
          artist_name: linkedOffer.artist_name || perf.artist_name,
          stage_name: linkedOffer.stage_name || perf.stage_name,
          performance_time: linkedOffer.performance_time || perf.performance_time,
          duration: linkedOffer.duration ?? perf.duration,
          booking_status: (linkedOffer as any).booking_status || perf.booking_status,
          event_day_date: rawDate,
          real_date: realDate,
          event_day_id: perf.event_day_id,
          // Donnees financieres de la performance (SOURCE UNIQUE)
          fee_amount: perf.fee_amount,
          fee_currency: perf.fee_currency,
          fee_is_net: perf.fee_is_net,
          commission_percentage: perf.commission_percentage,
          subject_to_withholding_tax: perf.subject_to_withholding_tax,
          prod_fee_amount: perf.prod_fee_amount,
          backline_fee_amount: perf.backline_fee_amount,
          buyout_hotel_amount: perf.buyout_hotel_amount,
          buyout_meal_amount: perf.buyout_meal_amount,
          flight_contribution_amount: perf.flight_contribution_amount,
          technical_fee_amount: perf.technical_fee_amount,
        };
      }

      return {
        id: `perf_${perf.id}`,
        type: "performance",
        // IMPORTANT: Garder l'ID de la performance pour pouvoir charger les finances
        performance_id: perf.id,
        artist_id: perf.artist_id,
        artist_name: perf.artist_name,
        stage_id: perf.stage_id,
        stage_name: perf.stage_name,
        performance_time: perf.performance_time,
        duration: perf.duration,
        booking_status: perf.booking_status,
        event_day_date: rawDate,
        real_date: realDate,
        event_day_id: perf.event_day_id,
        // Donnees financieres de la performance
        fee_amount: perf.fee_amount,
        fee_currency: perf.fee_currency,
        fee_is_net: perf.fee_is_net,
        commission_percentage: perf.commission_percentage,
        subject_to_withholding_tax: perf.subject_to_withholding_tax,
        prod_fee_amount: perf.prod_fee_amount,
        backline_fee_amount: perf.backline_fee_amount,
        buyout_hotel_amount: perf.buyout_hotel_amount,
        buyout_meal_amount: perf.buyout_meal_amount,
        flight_contribution_amount: perf.flight_contribution_amount,
        technical_fee_amount: perf.technical_fee_amount,
      };
    });

    const unmatchedOffers = offers
      .filter((offer) => !matchedOfferIds.has(offer.id))
      .map((offer) => {
        const rawDate = (offer as any).event_day_date ||
          (offer.date_time ? offer.date_time.slice(0, 10) : null);
        const realDate = computeRealDate(rawDate, (offer as any).event_day_id, offer.performance_time);
        return {
          ...offer,
          event_day_date: rawDate,
          real_date: realDate,
        };
      });

    // Filtrer les offres acceptées et rejetées (elles sont affichées dans leurs sections respectives)
    const allRows = [...performanceRows, ...unmatchedOffers];
    const filteredRows = allRows.filter((row) => {
      const status = (row as any).status || (row as any).booking_status;
      return status !== "accepted" && status !== "rejected";
    });
    
    // Dédupliquer par artiste + scène + heure + jour pour éviter les doublons
    const seen = new Set<string>();
    return filteredRows.filter((row) => {
      const key = `${(row as any).artist_id}__${(row as any).stage_id || ''}__${normalizeTime((row as any).performance_time)}__${(row as any).event_day_date || ''}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }, [offers, performances, computeRealDate]);

  async function handleMove(offerId: string, newStatus: OfferStatus | "draft_and_todo") {
    try {
      if (newStatus === "draft_and_todo") return;
      if (demoMode) {
        setOffers(prev => prev.map(o => o.id === offerId ? { ...o, status: newStatus as OfferStatus } : o));
        return;
      }
      const updated = await moveOffer(offerId, newStatus as OfferStatus);
      setOffers((prev) => prev.map((o) => (o.id === updated.id ? { ...o, status: updated.status, rejection_reason: updated.rejection_reason } : o)));
      toastSuccess("Statut mis à jour");
    } catch (e:any) {
      console.error(e);
      toastError(e?.message || "Transition non autorisée");
    }
  }

  async function handleSendOffer(offer: Offer) {
    // Ouvrir le modal d'envoi au lieu de marquer directement
    handleSendOfferModal(offer);
  }

  async function handleViewPdf(offer: Offer) {
    try {
      if (demoMode) { toastError("PDF indisponible en mode démo"); return; }
      let target = offer;
      if (!offer.pdf_storage_path) target = await prepareOfferPdfPath(offer.id);
      const url = await createSignedOfferPdfUrl(target.pdf_storage_path);
      if (!url) return toastError("Aucun PDF disponible");
      setPdfUrl(url);
      setShowPdfModal(true);
    } catch (e:any) {
      console.error(e);
      toastError(e?.message || "Impossible d'ouvrir le PDF");
    }
  }

  async function handleDownloadWord(offer: Offer) {
    try {
      if (demoMode) { toastError("Word indisponible en mode démo"); return; }
      if (!offer.word_storage_path) {
        toastError("Aucun document Word disponible");
        return;
      }
      const { data: signedUrlData } = await supabase.storage
        .from("offers")
        .createSignedUrl(offer.word_storage_path, 300);
      
      if (signedUrlData?.signedUrl) {
        const link = document.createElement("a");
        link.href = signedUrlData.signedUrl;
        link.download = offer.word_storage_path.split("/").pop() || "offre.docx";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toastSuccess("Document Word telecharge");
      } else {
        toastError("Impossible de telecharger le Word");
      }
    } catch (e:any) {
      console.error(e);
      toastError(e?.message || "Impossible de telecharger le Word");
    }
  }

  void function _handleDelete(_offerId: string) { void _offerId; };

  async function handleConfirmDeleteOffer() {
    if (!deletingOffer) return;

    setDeleting(true);
    try {
      if (demoMode) {
        setOffers(prev => prev.filter(o => o.id !== deletingOffer.id));
        toastSuccess("Offre supprimée (démo)");
      } else {
        await deleteOffer(deletingOffer.id);
        setOffers((prev) => prev.filter((o) => o.id !== deletingOffer.id));
        toastSuccess("Offre supprimée");
      }
      setDeletingOffer(null);
    } catch (e:any) {
      console.error(e);
      toastError(e?.message || "Erreur suppression");
    } finally {
      setDeleting(false);
    }
  }

  // Nouveaux handlers pour les modaux
  async function handleSendOfferModal(offer: Offer) {
    // Ajouter company_id à l'offre pour le modal d'envoi
    setSelectedOffer({ ...offer, company_id: companyId } as Offer);
    setShowSendModal(true);
  }

  async function handleRejectOfferModal(offer: Offer) {
    setSelectedOffer(offer);
    setShowRejectModal(true);
  }

  async function handlePerformanceModal(performance?: any) {
    console.log("🎭 Ouverture modal performance");
    console.log("   - companyId:", companyId);
    console.log("   - eventId:", eventId);
    console.log("   - performance:", performance);
    
    if (!companyId) {
      toastError("Company ID manquant. Impossible d'ouvrir le modal.");
      return;
    }
    
    if (!eventId) {
      toastError("Aucun événement sélectionné. Impossible d'ouvrir le modal.");
      return;
    }
    
    setSelectedPerformance(performance || null);
    setShowPerformanceModal(true);
  }

  // Handler pour ouvrir OfferComposer avec les donnees pre-remplies depuis une performance
  function handleCreateOfferFromPerformance(performanceData: any) {
    console.log("📝 Ouverture OfferComposer depuis performance:", performanceData);
    
    if (!companyId) {
      toastError("Company ID manquant. Impossible d'ouvrir le modal.");
      return;
    }
    
    if (!eventId) {
      toastError("Aucun événement sélectionné. Impossible d'ouvrir le modal.");
      return;
    }

    // Utiliser directement performance_id (ajoute dans offersListRows)
    // Fallback: extraire depuis id si prefixe "perf_" present
    const performanceId = performanceData.performance_id 
      || (performanceData.id?.startsWith("perf_") ? performanceData.id.slice(5) : null);
    
    console.log("   - Performance ID extrait:", performanceId);

    // Preparer les donnees pre-remplies pour OfferComposer
    const prefilled = {
      performance_id: performanceId,
      artist_id: performanceData.artist_id,
      artist_name: performanceData.artist_name,
      stage_id: performanceData.stage_id,
      stage_name: performanceData.stage_name,
      event_day_date: performanceData.event_day_date,
      performance_time: performanceData.performance_time,
      duration: performanceData.duration,
      fee_amount: performanceData.fee_amount,
      fee_currency: performanceData.fee_currency,
      amount_is_net: performanceData.fee_is_net ?? true,
      commission_percentage: performanceData.commission_percentage,
      prod_fee_amount: performanceData.prod_fee_amount,
      backline_fee_amount: performanceData.backline_fee_amount,
      buyout_hotel_amount: performanceData.buyout_hotel_amount,
      buyout_meal_amount: performanceData.buyout_meal_amount,
      flight_contribution_amount: performanceData.flight_contribution_amount,
      technical_fee_amount: performanceData.technical_fee_amount,
    };

    console.log("   - Prefilled data:", prefilled);
    
    setPrefilledOfferData(prefilled);
    setShowComposer(true);
  }

  // TODO: Implement email sending functionality
  // @ts-expect-error - Fonction TODO non utilisée pour le moment
  // eslint-disable-next-line no-unused-vars
  async function _handleSendOfferEmail(data: {
    email: string; ccEmails?: string[]; sender: { name:string; email:string; label?:string };
    recipientFirstName?: string; validityDate?: string; customMessage?: string;
  }) {
    if (!selectedOffer) return;
    
    try {
      // 1. Générer PDF si nécessaire
      if (!selectedOffer.pdf_storage_path) {
        await generateOfferPdfOnStatusChange(selectedOffer.id);
        // Recharger l'offre pour avoir le pdf_storage_path
        const updatedOffers = await listOffers({ eventId, filters, sort });
        const updatedOffer = updatedOffers.find(o => o.id === selectedOffer.id);
        if (updatedOffer) setSelectedOffer(updatedOffer);
      }

      // 2. Créer URL signée
      const pdfUrl = await createSignedOfferPdfUrl(selectedOffer.pdf_storage_path);
      if (!pdfUrl) throw new Error("Impossible de générer l'URL du PDF");

      // 3. Envoyer email (API simplifiée)
      const subject = `Offre artiste - ${selectedOffer.artist_name || 'Artiste'}`;
      const message = `
Bonjour ${data.recipientFirstName || ''},

Veuillez trouver ci-joint l'offre pour ${selectedOffer.artist_name || 'l\'artiste'}.
${data.customMessage || ''}

Valable jusqu'au: ${data.validityDate || 'Non précisé'}

Télécharger l'offre: ${pdfUrl}

Cordialement,
${data.sender.name}
      `.trim();

      await sendOfferEmail({
        toEmail: data.email,
        subject,
        customMessage: message,
        artistName: selectedOffer.artist_name || 'Artiste',
      });

      // 4. Marquer comme envoyé
      await moveOffer(selectedOffer.id, "sent");
      setOffers(prev => prev.map(o => o.id === selectedOffer.id ? { ...o, status: "sent" } : o));
      
      toastSuccess("Offre envoyée par email");
      setShowSendModal(false);
      setSelectedOffer(null);
    } catch (e: any) {
      console.error("Erreur envoi email:", e);
      toastError(e?.message || "Erreur envoi email");
    }
  }

  async function handleRejectOffer(reason: string) {
    if (!selectedOffer) return;
    
    try {
      const rejectionDate = new Date().toISOString();
      
      // 1. Rejeter l'offre
      await moveOffer(selectedOffer.id, "rejected", reason);
      setOffers(prev => prev.map(o => o.id === selectedOffer.id ? { ...o, status: "rejected", rejection_reason: reason } : o));
      
      // 2. Synchroniser avec la performance liée (même artiste, même événement)
      if (selectedOffer.artist_id && eventId) {
        try {
          // Trouver les performances liées à cet artiste pour cet événement
          const { data: linkedPerfs } = await supabase
            .from("artist_performances")
            .select("id, booking_status")
            .eq("artist_id", selectedOffer.artist_id)
            .neq("booking_status", "offre_rejetee")
            .in("event_day_id", 
              (await supabase.from("event_days").select("id").eq("event_id", eventId)).data?.map(d => d.id) || []
            );
          
          if (linkedPerfs && linkedPerfs.length > 0) {
            console.log("🔗 Performances liées trouvées:", linkedPerfs.length);
            // Rejeter toutes les performances liées
            for (const perf of linkedPerfs) {
              await supabase
                .from("artist_performances")
                .update({
                  booking_status: "offre_rejetee",
                  rejection_reason: reason,
                  rejection_date: rejectionDate,
                  updated_at: rejectionDate,
                })
                .eq("id", perf.id);
              console.log("🚫 Performance liée rejetée:", perf.id);
            }
          }
        } catch (syncError) {
          console.warn("⚠️ Erreur sync performance (non bloquant):", syncError);
        }
      }
      
      toastSuccess("Offre rejetée");
      setShowRejectModal(false);
      setSelectedOffer(null);
      loadOffers(); // Rafraîchir pour mettre à jour la timeline
    } catch (e: any) {
      console.error("Erreur rejet:", e);
      toastError(e?.message || "Erreur rejet offre");
    }
  }

  // TODO: Implement performance save functionality
  // @ts-expect-error - Fonction TODO non utilisée pour le moment
  // eslint-disable-next-line no-unused-vars
  async function _handleSavePerformance(perf: any) {
    try {
      // TODO: Implémenter la sauvegarde de performance
      console.log("Sauvegarde performance:", perf);
      toastSuccess("Performance sauvegardée");
      setShowPerformanceModal(false);
      setSelectedPerformance(null);
    } catch (e: any) {
      console.error("Erreur sauvegarde:", e);
      toastError(e?.message || "Erreur sauvegarde performance");
    }
  }
  
  return (
    <div className="p-6 space-y-6">
      <PageHeader
        icon={Calendar}
        title="BOOKING"
        actions={
          <>
            <Button
              variant="ghost"
              onClick={() => navigate('/app/settings/admin')}
            >
              <Settings className="w-4 h-4 mr-1" />
              Paramètres
            </Button>
            <Button
              variant="primary"
              onClick={() => handlePerformanceModal()}
            >
              <Plus className="w-4 h-4 mr-1" />
              Ajouter une performance
            </Button>
            <Button
              onClick={() => window.open('/app/booking/timeline', '_blank')}
            >
              <Calendar className="w-4 h-4 mr-1" />
              Timeline
            </Button>
            <input
              className="px-3 py-2 rounded border dark:bg-gray-900 dark:border-gray-800 dark:text-gray-100"
              placeholder="Recherche (artiste, scène)"
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value || undefined }))}
            />
            <select
              className="px-3 py-2 rounded border dark:bg-gray-900 dark:border-gray-800 dark:text-gray-100"
              defaultValue="desc"
              onChange={(e) => setSort((s) => ({ ...s, direction: e.target.value as "asc" | "desc" }))}
            >
              <option value="desc">Plus récent</option>
              <option value="asc">Plus ancien</option>
            </select>
            <Button variant={demoMode ? "success" : "secondary"} onClick={() => setDemoMode(d => !d)}>
              {demoMode ? "Mode Démo ON" : "Mode Démo OFF"}
            </Button>
          </>
        }
      />

      {!hasEvent && !demoMode && (
        <Card>
          <CardBody>
            <div className="text-gray-700 dark:text-gray-300">
              Aucun événement sélectionné. Tu peux soit activer le <b>Mode Démo</b> (bouton en haut), soit définir un <code>selected_event_id</code>.
            </div>
            <div className="mt-2 text-xs text-gray-500">
              DevTools:&nbsp;<code>localStorage.setItem("selected_event_id","UUID-EVENT")</code>
            </div>
          </CardBody>
        </Card>
      )}

      {renderError && <ErrorBox error={renderError} />}

      {(demoMode || hasEvent) && (
        <>
          <Card>
            <CardHeader>
              <div className="font-semibold text-gray-900 dark:text-gray-100">OFFRES EN COURS</div>
            </CardHeader>
            <CardBody>
              {loading ? (
                <div className="text-gray-600 dark:text-gray-300">Chargement…</div>
              ) : (
                <OffersListView
                  offers={offersListRows}
                  days={eventDays}
                  onViewPdf={handleViewPdf}
                  onDownloadWord={handleDownloadWord}
                  onSendOffer={handleSendOffer}
                  onModify={(offer) => {
                    // Versioning UNIQUEMENT si l'offre a déjà été envoyée (sent)
                    const offerStatus = offer.status || (offer as any).booking_status;
                    const needsVersioning = offerStatus === "sent" || offerStatus === "accepted" || offerStatus === "rejected";
                    
                    if (needsVersioning) {
                      // Mode versioning: crée une nouvelle version (V2, V3, etc.)
                      setEditingOffer(null);
                      setPrefilledOfferData({
                        isModification: true,
                        originalOfferId: offer.original_offer_id || offer.id,
                        originalVersion: offer.version || 1,
                        performance_id: (offer as any).performance_id,
                        artist_id: offer.artist_id,
                        artist_name: offer.artist_name,
                        stage_id: offer.stage_id,
                        stage_name: offer.stage_name,
                        event_day_date: (offer as any).event_day_date || (offer.date_time ? offer.date_time.slice(0, 10) : null),
                        performance_time: offer.performance_time,
                        duration: offer.duration || (offer as any).duration_minutes,
                        fee_amount: offer.amount_is_net ? offer.amount_net : offer.amount_gross,
                        fee_currency: offer.currency,
                        amount_is_net: offer.amount_is_net,
                        commission_percentage: offer.agency_commission_pct,
                        amount_gross_is_subject_to_withholding: offer.amount_gross_is_subject_to_withholding,
                        withholding_note: offer.withholding_note,
                        prod_fee_amount: offer.prod_fee_amount,
                        backline_fee_amount: offer.backline_fee_amount,
                        buyout_hotel_amount: offer.buyout_hotel_amount,
                        buyout_meal_amount: offer.buyout_meal_amount,
                        flight_contribution_amount: offer.flight_contribution_amount,
                        technical_fee_amount: offer.technical_fee_amount,
                        // Champs additionnels pour reprendre toutes les données
                        agency_contact_id: offer.agency_contact_id,
                        booking_agency_id: (offer as any).booking_agency_id,
                        validity_date: offer.validity_date,
                        notes_date: (offer as any).notes_date,
                        notes_financial: (offer as any).notes_financial,
                        note_general: (offer as any).note_general,
                        terms_json: offer.terms_json,
                        // ID de l'offre pour charger les extras
                        offerId: offer.id,
                      });
                    } else {
                      // Mode édition directe: modifie l'offre existante (draft, ready_to_send)
                      setPrefilledOfferData(null);
                      setEditingOffer(offer as Offer);
                    }
                    setShowComposer(true);
                  }}
                  onCreateOffer={handleCreateOfferFromPerformance}
                  onValidateOffer={(offer) => handleMove(offer.id, "accepted")}
                  onRejectOffer={(offer) => handleRejectOfferModal(offer)}
                />
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader className="bg-green-50 dark:bg-green-900/20">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-green-800 dark:text-green-200">OFFRES ACCEPTÉES</span>
                <Badge color="lightgreen">{acceptedOffers.length}</Badge>
              </div>
              <div className="text-sm text-green-600 dark:text-green-400">
                OFFRES ACCEPTÉES PAR LES ARTISTES
              </div>
            </CardHeader>
            <CardBody>
              {loading ? (
                <div className="text-gray-600 dark:text-gray-300">Chargement…</div>
              ) : acceptedOffers.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  Aucune offre
                </div>
              ) : (
                <OffersListView
                  offers={acceptedOffers}
                  onViewPdf={handleViewPdf}
                  onDownloadWord={handleDownloadWord}
                  onSendOffer={handleSendOffer}
                  onModify={(offer) => {
                    // Pour les offres acceptées: toujours versioning
                    setEditingOffer(null);
                    setPrefilledOfferData({
                      isModification: true,
                      originalOfferId: offer.original_offer_id || offer.id,
                      originalVersion: offer.version || 1,
                      performance_id: (offer as any).performance_id,
                      artist_id: offer.artist_id,
                      artist_name: offer.artist_name,
                      stage_id: offer.stage_id,
                      stage_name: offer.stage_name,
                      event_day_date: (offer as any).event_day_date || (offer.date_time ? offer.date_time.slice(0, 10) : null),
                      performance_time: offer.performance_time,
                      duration: offer.duration || (offer as any).duration_minutes,
                      fee_amount: offer.amount_is_net ? offer.amount_net : offer.amount_gross,
                      fee_currency: offer.currency,
                      amount_is_net: offer.amount_is_net,
                      commission_percentage: offer.agency_commission_pct,
                      amount_gross_is_subject_to_withholding: offer.amount_gross_is_subject_to_withholding,
                      withholding_note: offer.withholding_note,
                      prod_fee_amount: offer.prod_fee_amount,
                      backline_fee_amount: offer.backline_fee_amount,
                      buyout_hotel_amount: offer.buyout_hotel_amount,
                      buyout_meal_amount: offer.buyout_meal_amount,
                      flight_contribution_amount: offer.flight_contribution_amount,
                      technical_fee_amount: offer.technical_fee_amount,
                      // Champs additionnels pour reprendre toutes les données
                      agency_contact_id: offer.agency_contact_id,
                      booking_agency_id: (offer as any).booking_agency_id,
                      validity_date: offer.validity_date,
                      notes_date: (offer as any).notes_date,
                      notes_financial: (offer as any).notes_financial,
                      note_general: (offer as any).note_general,
                      terms_json: offer.terms_json,
                      // ID de l'offre pour charger les extras
                      offerId: offer.id,
                    });
                    setShowComposer(true);
                  }}
                  onCreateOffer={handleCreateOfferFromPerformance}
                  onValidateOffer={(offer) => handleMove(offer.id, "accepted")}
                  onRejectOffer={(offer) => handleRejectOfferModal(offer)}
                />
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader className="bg-red-50 dark:bg-red-900/20">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-red-800 dark:text-red-200">PERFORMANCES ET OFFRES REJETÉES</span>
                <Badge color="framboise">{rejectedOffers.length}</Badge>
              </div>
              <div className="text-sm text-red-600 dark:text-red-400">
                ARTISTES REFUSÉS OU NON RETENUS
              </div>
            </CardHeader>
            <CardBody>
              {loading ? (
                <div className="text-gray-600 dark:text-gray-300">Chargement…</div>
              ) : rejectedOffers.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  Aucune offre rejetée
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700">
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900 dark:text-gray-100">
                          Artiste
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900 dark:text-gray-100">
                          Montant
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900 dark:text-gray-100">
                          Raison
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900 dark:text-gray-100">
                          Date rejet
                        </th>
                        <th className="text-right py-3 px-4 text-sm font-semibold text-gray-900 dark:text-gray-100">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {rejectedOffers.map((item: any) => (
                        <tr
                          key={item.id}
                          className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                        >
                          <td className="py-3 px-4">
                            <div className="font-medium text-gray-900 dark:text-gray-100">
                              {item.artist_name}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            {(item.amount_display || item.amount_gross) ? (
                              <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                {Math.round(item.amount_display || item.amount_gross).toString().replace(/\B(?=(\d{3})+(?!\d))/g, "'")} {item.currency}
                              </div>
                            ) : (
                              <span className="text-sm text-gray-400">—</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <div className="text-sm text-gray-600 dark:text-gray-400 max-w-xs truncate">
                              {item.rejection_reason || "Non précisé"}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            {item.rejected_at ? (
                              <div className="text-xs text-gray-500 dark:text-gray-500">
                                {new Date(item.rejected_at).toLocaleDateString('fr-FR')}
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400">—</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex gap-2 justify-end">
                              {item.type !== "performance" && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleViewPdf(item)}
                                >
                                  <Eye className="w-3 h-3 mr-1" />
                                  Voir
                                </Button>
                              )}
                              {item.type === "performance" && (
                                <Badge color="taupe">Performance</Badge>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardBody>
          </Card>
        </>
      )}

      <OfferComposer
        open={showComposer}
        onClose={() => { 
          setShowComposer(false); 
          setPrefilledOfferData(null); 
          setEditingOffer(null);
        }}
        eventId={eventId}
        companyId={companyId || ""}
        editingOffer={editingOffer}
        prefilledData={prefilledOfferData}
        onSuccess={() => { 
          setShowComposer(false); 
          setPrefilledOfferData(null);
          setEditingOffer(null);
          loadOffers();
          toastSuccess(editingOffer ? "Offre modifiée avec succès" : "Offre créée avec succès"); 
        }}
      />

      <Modal open={showPdfModal} onClose={() => setShowPdfModal(false)} title="PDF de l'offre">
        {pdfUrl ? (
          <>
            <iframe src={pdfUrl} className="w-full h-[70vh] border border-gray-200 dark:border-gray-800 rounded" title="Offer PDF" />
            <div className="mt-3 text-right">
              <a className="px-3 py-1.5 rounded bg-blue-600 text-white hover:bg-blue-700" href={pdfUrl} target="_blank" rel="noreferrer">
                Ouvrir dans un onglet
              </a>
            </div>
          </>
        ) : (
          <div className="text-gray-500">Aucun PDF.</div>
        )}
      </Modal>

      {/* Nouveaux modaux */}
      <SendOfferModal
        open={showSendModal}
        onClose={() => {
          setShowSendModal(false);
          setSelectedOffer(null);
        }}
        offer={selectedOffer as any || {
          id: "",
          artist_name: "",
          stage_name: "",
          amount_display: null,
          currency: null,
          pdf_storage_path: null,
        }}
        onSuccess={() => {
          setShowSendModal(false);
          setSelectedOffer(null);
          loadOffers();
        }}
      />

      <RejectOfferModal
        open={showRejectModal}
        onClose={() => {
          setShowRejectModal(false);
          setSelectedOffer(null);
        }}
        onReject={handleRejectOffer}
      />

      <PerformanceModal
        open={showPerformanceModal}
        onClose={() => {
          setShowPerformanceModal(false);
          setSelectedPerformance(null);
        }}
        initialData={
          companyId && eventId
            ? selectedPerformance
              ? {
                  eventId: eventId,
                  companyId: companyId,
                  performanceId: selectedPerformance.id,
                }
              : {
                  eventId: eventId,
                  companyId: companyId,
                }
            : undefined
        }
        onSuccess={() => {
          setShowPerformanceModal(false);
          setSelectedPerformance(null);
          loadOffers();
        }}
      />

      <ConfirmDeleteModal
        isOpen={!!deletingOffer}
        onClose={() => setDeletingOffer(null)}
        onConfirm={handleConfirmDeleteOffer}
        title="Supprimer l'offre"
        message="Êtes-vous sûr de vouloir supprimer cette offre ?"
        itemName={deletingOffer?.artist_name || undefined}
        loading={deleting}
      />
    </div>
  );
}
