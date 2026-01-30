/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback, useRef } from "react";
import { FileText, Eye, Send, DollarSign, User, FileDown, MessageSquare } from "lucide-react";
import { DraggableModal } from "../../../components/aura/DraggableModal";
import { Button } from "../../../components/aura/Button";
import { useToast } from "../../../components/aura/ToastProvider";
import { Accordion } from "../../../components/ui/Accordion";
import { DatePickerPopup } from "../../../components/ui/pickers/DatePickerPopup";
import { TimePickerPopup } from "../../../components/ui/pickers/TimePickerPopup";
import { supabase } from "../../../lib/supabaseClient";
import { generateOfferPdfAndUpload } from "../pdf/pdfFill";
import { generateOfferWordAndUpload, type OfferWordInput } from "../word/wordFill";
import { createOffer, updateOffer, createSignedOfferPdfUrl } from "../bookingApi";
import {
  listOfferClauses,
  listExclusivityPresets,
  type OfferClause,
  type ExclusivityPreset,
} from "../advancedBookingApi";

const STANDARD_DURATIONS = [60, 75, 90, 105, 120];
const getDurationMode = (duration?: number | null): "standard" | "custom" =>
  STANDARD_DURATIONS.includes(duration || 0) ? "standard" : "custom";

import {
  fetchArtists,
  fetchEventStages,
  createPerformance,
  updatePerformance,
  type Artist,
  type EventStage,
  type BookingStatus,
  type Performance,
  type PerformanceUpdate,
} from "../../timeline/timelineApi";

// =============================================================================
// TYPES
// =============================================================================

export interface Offer {
  id: string;
  event_id: string;
  company_id: string;
  artist_id?: string | null;
  stage_id?: string | null;
  agency_contact_id?: string | null;
  artist_name?: string | null;
  stage_name?: string | null;
  date_time?: string | null;
  performance_time?: string | null;
  duration?: number | null;
  duration_minutes?: number | null;
  currency?: string | null;
  amount_net?: number | null;
  amount_gross?: number | null;
  amount_is_net?: boolean | null;
  amount_gross_is_subject_to_withholding?: boolean | null;
  subject_to_withholding_tax?: boolean | null;
  withholding_note?: string | null;
  amount_display?: number | null;
  agency_commission_pct?: number | null;
  
  // Frais additionnels
  prod_fee_amount?: number | null;
  prod_fee_currency?: string | null;
  backline_fee_amount?: number | null;
  backline_fee_currency?: string | null;
  buyout_hotel_amount?: number | null;
  buyout_hotel_currency?: string | null;
  buyout_meal_amount?: number | null;
  buyout_meal_currency?: string | null;
  flight_contribution_amount?: number | null;
  flight_contribution_currency?: string | null;
  technical_fee_amount?: number | null;
  technical_fee_currency?: string | null;
  
  ready_to_send_at?: string | null;
  status: string;
  validity_date?: string | null;
  pdf_storage_path?: string | null;
  word_storage_path?: string | null;
  original_offer_id?: string | null;
  version?: number | null;
  terms_json?: any | null;
  rejection_reason?: string | null;
  updated_at?: string;
}

export interface OfferComposerProps {
  open: boolean;
  onClose: () => void;
  eventId: string;
  companyId: string;
  editingOffer?: Offer | null;
  prefilledData?: {
    performance_id?: string;
    artist_id?: string;
    artist_name?: string;
    stage_id?: string;
    stage_name?: string;
    event_day_date?: string | null;
    date_time?: string | null;
    performance_time?: string;
    duration?: number | null;
    fee_amount?: number | null;
    fee_currency?: string | null;
    amount_is_net?: boolean;
    commission_percentage?: number | null;
    amount_gross_is_subject_to_withholding?: boolean;
    withholding_note?: string | null;
    prod_fee_amount?: number | null;
    backline_fee_amount?: number | null;
    buyout_hotel_amount?: number | null;
    buyout_meal_amount?: number | null;
    flight_contribution_amount?: number | null;
    technical_fee_amount?: number | null;
    isModification?: boolean;
    originalOfferId?: string;
    originalVersion?: number;
    // Champs additionnels pour le mode modification (versioning)
    agency_contact_id?: string | null;
    booking_agency_id?: string | null;
    validity_date?: string | null;
    notes_date?: string | null;
    notes_financial?: string | null;
    note_general?: string | null;
    terms_json?: any;
    offerId?: string; // ID de l'offre pour charger les extras
  } | null;
  onSuccess: () => void;
}

interface Contact {
  id: string;
  display_name: string;
  email_primary?: string;
}

type CurrencyCode = "EUR" | "CHF" | "USD" | "GBP";

// =============================================================================
// COMPOSANT PRINCIPAL
// =============================================================================

export function OfferComposer({
  open,
  onClose,
  eventId,
  companyId,
  editingOffer,
  prefilledData,
  onSuccess,
}: OfferComposerProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const { success: toastSuccess, error: toastError } = useToast();
  
  // =============================================================================
  // ÉTATS - Données chargées
  // =============================================================================
  const [artists, setArtists] = useState<Artist[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [stages, setStages] = useState<EventStage[]>([]);
  const [bookingExtras, setBookingExtras] = useState<OfferClause[]>([]);
  const [exclusivityClauses, setExclusivityClauses] = useState<ExclusivityPreset[]>([]);
  
  // =============================================================================
  // ÉTATS - Form data principale
  // =============================================================================
  const [formData, setFormData] = useState({
    artist_id: "",
    stage_id: "",
    agency_contact_id: "",
    booking_agency_id: "", // ID de l'agence du booking agent
    date_time: "",
    performance_time: "14:00",
    duration: 60,
    currency: "EUR" as CurrencyCode,
    amount_net: null as number | null,
    amount_gross: null as number | null,
    amount_is_net: true,
    amount_gross_is_subject_to_withholding: false,
    subject_to_withholding_tax: true, // Par défaut soumis à l'impôt (sauf artistes suisses)
    withholding_note: "",
    amount_display: null as number | null,
    agency_commission_pct: null as number | null,
    validity_date: "",
    // Notes pour le document Word
    notes_date: "",
    notes_financial: "",
    note_general: "",
  });
  const [durationMode, setDurationMode] = useState<"standard" | "custom">("standard");
  const [linkedPerformanceId, setLinkedPerformanceId] = useState<string | null>(null);
  const fieldRefs = useRef<Record<string, HTMLElement | null>>({});
  
  // =============================================================================
  // ÉTATS - Frais additionnels (6 types × 2 champs = 12 états)
  // Par défaut à 0 si non renseigné
  // =============================================================================
  const [prodFeeAmount, setProdFeeAmount] = useState<number>(0);
  const [backlineFeeAmount, setBacklineFeeAmount] = useState<number>(0);
  const [buyoutHotelAmount, setBuyoutHotelAmount] = useState<number>(0);
  const [buyoutMealAmount, setBuyoutMealAmount] = useState<number>(0);
  const [flightContributionAmount, setFlightContributionAmount] = useState<number>(0);
  const [technicalFeeAmount, setTechnicalFeeAmount] = useState<number>(0);
  
  // =============================================================================
  // ÉTATS - Extras et Clauses
  // =============================================================================
  const [selectedExtras, setSelectedExtras] = useState<Record<string, "festival" | "artist">>({});
  const [exclusivityClausesSelected, setExclusivityClausesSelected] = useState<string[]>([]);
  
  // =============================================================================
  // ÉTATS - Gestion heure TBC
  // =============================================================================
  const [savedPerformanceTime, setSavedPerformanceTime] = useState<string>("20:00");
  const [isTBC, setIsTBC] = useState(false);
  
  // =============================================================================
  // ÉTATS - Validation & PDF
  // =============================================================================
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  
  // =============================================================================
  // ÉTATS - Données Budget Artistique
  // =============================================================================
  const [fieldsFromBudget, setFieldsFromBudget] = useState<Set<string>>(new Set());
  
  // =============================================================================
  // CHARGEMENT INITIAL DES DONNÉES
  // =============================================================================
  useEffect(() => {
    if (!open || !companyId) return;
    
    const loadData = async () => {
      setLoading(true);
      try {
        // Chargement parallèle de toutes les données
        const [
          artistsData,
          stagesData,
          contactsData,
          extrasData,
          clausesData,
        ] = await Promise.all([
          fetchArtists(companyId),
          fetchEventStages(eventId),
          loadContacts(companyId),
          listOfferClauses(companyId),
          listExclusivityPresets(companyId),
        ]);
        
        setArtists(artistsData);
        setStages(stagesData);
        setContacts(contactsData);
        setBookingExtras(extrasData);
        setExclusivityClauses(clausesData);
        
      } catch (error: any) {
        console.error("Erreur chargement données:", error);
        toastError(error?.message || "Erreur de chargement");
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [open, eventId, companyId, toastError]);
  
  // =============================================================================
  // CHARGEMENT CONTACTS - UNIQUEMENT BOOKING AGENTS
  // =============================================================================
  async function loadContacts(companyId: string): Promise<Contact[]> {
    try {
      const BOOKING_AGENT_ROLE_ID = "bcd6fcc3-2327-4e25-ae87-25d31605816d";
      
      // Récupérer uniquement les contacts avec rôle "Booking Agent" et leur agence
      const { data, error } = await supabase
        .from("crm_contacts")
        .select(`
          id, 
          display_name, 
          email_primary,
          crm_contact_role_links!inner(role_id),
          crm_contact_company_links(linked_company_id)
        `)
        .eq("company_id", companyId)
        .eq("crm_contact_role_links.role_id", BOOKING_AGENT_ROLE_ID)
        .order("display_name");
      
      if (error) throw error;
      
      // Transformer les données pour extraire l'agence
      const contactsWithAgency = (data || []).map(contact => ({
        ...contact,
        agency_id: contact.crm_contact_company_links?.[0]?.linked_company_id || null
      }));
      
      console.log(`[OK] ${contactsWithAgency.length} Booking Agent(s) chargé(s)`);
      return contactsWithAgency;
    } catch (error) {
      console.error("Erreur chargement booking agents:", error);
      return [];
    }
  }
  
  // =============================================================================
  // CHARGEMENT BOOKING AGENT PRINCIPAL DE L'ARTISTE
  // =============================================================================
  async function loadArtistMainBookingAgent(artistId: string): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from("crm_artist_contact_links")
        .select("contact_id")
        .eq("artist_id", artistId)
        .eq("is_main_agent", true)
        .maybeSingle();
      
      if (error) throw error;
      
      if (data?.contact_id) {
        console.log(`[OK] Booking agent principal trouvé pour artiste: ${data.contact_id}`);
        return data.contact_id;
      }
      
      return null;
    } catch (error) {
      console.error("Erreur chargement booking agent principal:", error);
      return null;
    }
  }
  
  // =============================================================================
  // CHARGEMENT DONNÉES FINANCIÈRES DEPUIS BUDGET ARTISTIQUE
  // =============================================================================
  const loadBudgetData = useCallback(async (artistId: string, eventId: string) => {
    try {
      console.log(`[BUDGET] Chargement données pour artiste ${artistId}, event ${eventId}`);
      
      const { data, error } = await supabase
        .from("artist_performances")
        .select(`
          fee_amount,
          fee_currency,
          fee_is_net,
          commission_percentage,
          prod_fee_amount,
          backline_fee_amount,
          buyout_hotel_amount,
          buyout_meal_amount,
          flight_contribution_amount,
          technical_fee_amount,
          withholding_note
        `)
        .eq("artist_id", artistId)
        .eq("event_id", eventId)
        .maybeSingle();
      
      if (error) throw error;
      
      if (data && data.fee_amount !== null) {
        console.log(`[BUDGET] Données trouvées:`, data);
        
        const newFieldsFromBudget = new Set<string>();
        
        // Pré-remplir les champs financiers
        if (data.fee_amount !== null) {
          if (data.fee_is_net) {
            setFormData(prev => ({
              ...prev,
              amount_net: data.fee_amount,
              amount_is_net: true,
              amount_gross: null,
              amount_gross_is_subject_to_withholding: false,
            }));
          } else {
            setFormData(prev => ({
              ...prev,
              amount_gross: data.fee_amount,
              amount_is_net: false,
              amount_net: null,
              amount_gross_is_subject_to_withholding: true,
            }));
          }
          newFieldsFromBudget.add("amount");
        } else {
          setFormData(prev => ({
            ...prev,
            amount_net: null,
            amount_gross: null,
            amount_gross_is_subject_to_withholding: false,
          }));
        }
        
        if (data.fee_currency) {
          setFormData(prev => ({ ...prev, currency: data.fee_currency as CurrencyCode }));
          newFieldsFromBudget.add("currency");
        }
        
        if (data.commission_percentage !== null) {
          setFormData(prev => ({ ...prev, agency_commission_pct: data.commission_percentage }));
          newFieldsFromBudget.add("commission");
        } else {
          setFormData(prev => ({ ...prev, agency_commission_pct: null }));
        }

        if (data.withholding_note) {
          setFormData(prev => ({ ...prev, withholding_note: data.withholding_note }));
          newFieldsFromBudget.add("withholding_note");
        } else {
          setFormData(prev => ({ ...prev, withholding_note: "" }));
        }

        const applyExtra = (
          value: number | null | undefined,
          setter: (val: number) => void,
          fieldName: string
        ) => {
          if (value !== null && value !== undefined && value > 0) {
            setter(value);
            newFieldsFromBudget.add(fieldName);
          } else {
            setter(0); // Par défaut à 0
          }
        };

        applyExtra(data.prod_fee_amount, setProdFeeAmount, "prod_fee_amount");
        applyExtra(data.backline_fee_amount, setBacklineFeeAmount, "backline_fee_amount");
        applyExtra(data.buyout_hotel_amount, setBuyoutHotelAmount, "buyout_hotel_amount");
        applyExtra(data.buyout_meal_amount, setBuyoutMealAmount, "buyout_meal_amount");
        applyExtra(data.flight_contribution_amount, setFlightContributionAmount, "flight_contribution_amount");
        applyExtra(data.technical_fee_amount, setTechnicalFeeAmount, "technical_fee_amount");
        
        setFieldsFromBudget(newFieldsFromBudget);
        
        toastSuccess("💰 Données financières chargées depuis le Budget Artistique");
      } else {
        console.log("[BUDGET] Aucune donnée financière trouvée - frais à 0 par défaut");
        setFieldsFromBudget(new Set());
        setProdFeeAmount(0);
        setBacklineFeeAmount(0);
        setBuyoutHotelAmount(0);
        setBuyoutMealAmount(0);
        setFlightContributionAmount(0);
        setTechnicalFeeAmount(0);
      }
    } catch (error) {
      console.error("[BUDGET] Erreur chargement:", error);
      setFieldsFromBudget(new Set());
    }
  }, [toastSuccess]);
  
  // =============================================================================
  // PRÉ-REMPLISSAGE DU FORMULAIRE (Édition ou Création depuis performance)
  // =============================================================================
  useEffect(() => {
    if (!open) {
      setLinkedPerformanceId(null);
      return;
    }
    
    console.log("[OfferComposer] useEffect - open:", open, "editingOffer:", editingOffer, "prefilledData:", prefilledData);
    
    if (editingOffer) {
      // MODE ÉDITION
      console.log("[OfferComposer] MODE ÉDITION - Chargement des données de l'offre:", editingOffer.id);
      console.log("[OfferComposer] MODE ÉDITION - agency_contact_id depuis editingOffer:", editingOffer.agency_contact_id, "booking_agency_id:", (editingOffer as any).booking_agency_id);
      setFormData({
        artist_id: editingOffer.artist_id ?? "",
        stage_id: editingOffer.stage_id ?? "",
        agency_contact_id: editingOffer.agency_contact_id || "",
        booking_agency_id: (editingOffer as any).booking_agency_id || "",
        date_time: editingOffer.date_time ? editingOffer.date_time.split("T")[0] : "",
        performance_time: editingOffer.performance_time ? editingOffer.performance_time.slice(0, 5) : "14:00",
        duration: editingOffer.duration || editingOffer.duration_minutes || 60,
        currency: (editingOffer.currency || "EUR") as CurrencyCode,
        amount_net: editingOffer.amount_net ?? null,
        amount_gross: editingOffer.amount_gross ?? null,
        amount_is_net: editingOffer.amount_is_net ?? false,
        amount_gross_is_subject_to_withholding: editingOffer.amount_gross_is_subject_to_withholding || false,
        subject_to_withholding_tax: editingOffer.subject_to_withholding_tax ?? true,
        withholding_note: editingOffer.withholding_note || "",
        amount_display: editingOffer.amount_display ?? null,
        agency_commission_pct: editingOffer.agency_commission_pct ?? null,
        validity_date: editingOffer.validity_date || "",
        // Notes
        notes_date: (editingOffer as any).notes_date || "",
        notes_financial: (editingOffer as any).notes_financial || "",
        note_general: (editingOffer as any).note_general || "",
      });
      setDurationMode(getDurationMode(editingOffer.duration || editingOffer.duration_minutes));
      
      // Frais additionnels (0 par défaut si non renseigné)
      setProdFeeAmount(editingOffer.prod_fee_amount ?? 0);
      setBacklineFeeAmount(editingOffer.backline_fee_amount ?? 0);
      setBuyoutHotelAmount(editingOffer.buyout_hotel_amount ?? 0);
      setBuyoutMealAmount(editingOffer.buyout_meal_amount ?? 0);
      setFlightContributionAmount(editingOffer.flight_contribution_amount ?? 0);
      setTechnicalFeeAmount(editingOffer.technical_fee_amount ?? 0);
      
      // Clauses d'exclusivité
      if (editingOffer.terms_json && editingOffer.terms_json.selectedClauseIds) {
        setExclusivityClausesSelected(editingOffer.terms_json.selectedClauseIds);
      } else {
        setExclusivityClausesSelected([]);
      }
      
      // Charger les extras depuis offer_extras
      const loadOfferExtras = async () => {
        try {
          const { data, error } = await supabase
            .from("offer_extras")
            .select("extra_id, charge_to")
            .eq("offer_id", editingOffer.id);
          
          if (error) {
            console.error("[EXTRAS] Erreur chargement extras:", error);
            return;
          }
          
          if (data && data.length > 0) {
            const extrasMap: Record<string, "festival" | "artist"> = {};
            data.forEach((item: { extra_id: string | null; charge_to: string | null }) => {
              if (item.extra_id && item.charge_to) {
                extrasMap[item.extra_id] = item.charge_to as "festival" | "artist";
              }
            });
            console.log("[EXTRAS] Extras chargés:", extrasMap);
            setSelectedExtras(extrasMap);
          } else {
            setSelectedExtras({});
          }
        } catch (err) {
          console.error("[EXTRAS] Erreur:", err);
        }
      };
      
      loadOfferExtras();
      
    } else if (prefilledData) {
      // MODE CRÉATION DEPUIS PERFORMANCE ou MODE MODIFICATION (versioning)
      const isModificationMode = prefilledData.isModification === true;
      
      // Charger le booking agent principal de l'artiste et son agence (si artiste pré-rempli et pas en mode modification)
      const loadMainAgent = async () => {
        // En mode modification, on utilise le booking agent de l'offre originale
        if (isModificationMode && prefilledData.agency_contact_id) {
          setFormData(prev => ({
            ...prev,
            agency_contact_id: prefilledData.agency_contact_id || "",
            booking_agency_id: prefilledData.booking_agency_id || ""
          }));
          return;
        }
        
        // Sinon, charger le booking agent principal de l'artiste
        if (prefilledData.artist_id) {
          const mainAgentId = await loadArtistMainBookingAgent(prefilledData.artist_id);
          if (mainAgentId) {
            // Récupérer l'agence du booking agent
            const { data: agencyData } = await supabase
              .from("crm_contact_company_links")
              .select("linked_company_id")
              .eq("contact_id", mainAgentId)
              .maybeSingle();
            
            setFormData(prev => ({
              ...prev,
              agency_contact_id: mainAgentId,
              booking_agency_id: agencyData?.linked_company_id || ""
            }));
          }
        }
      };
      
      // Charger les extras de l'offre originale (en mode modification)
      const loadOfferExtrasFromOriginal = async () => {
        if (!isModificationMode || !prefilledData.offerId) return;
        
        try {
          const { data, error } = await supabase
            .from("offer_extras")
            .select("extra_id, charge_to")
            .eq("offer_id", prefilledData.offerId);
          
          if (error) {
            console.error("[EXTRAS] Erreur chargement extras (modification):", error);
            return;
          }
          
          if (data && data.length > 0) {
            const extrasMap: Record<string, "festival" | "artist"> = {};
            data.forEach((item: { extra_id: string | null; charge_to: string | null }) => {
              if (item.extra_id && item.charge_to) {
                extrasMap[item.extra_id] = item.charge_to as "festival" | "artist";
              }
            });
            console.log("[EXTRAS] Extras chargés (modification):", extrasMap);
            setSelectedExtras(extrasMap);
          } else {
            setSelectedExtras({});
          }
        } catch (err) {
          console.error("[EXTRAS] Erreur:", err);
        }
      };
      
      // Charger les clauses d'exclusivité (en mode modification)
      if (isModificationMode && prefilledData.terms_json) {
        const termsJson = typeof prefilledData.terms_json === 'string' 
          ? JSON.parse(prefilledData.terms_json) 
          : prefilledData.terms_json;
        if (termsJson?.selectedClauseIds) {
          setExclusivityClausesSelected(termsJson.selectedClauseIds);
        }
      }
      
      const amountValue = prefilledData.fee_amount ?? null;
      const isNet = prefilledData.amount_is_net ?? true;
      const budgetFields = new Set<string>();
      
      setFormData({
        artist_id: prefilledData.artist_id || "",
        stage_id: prefilledData.stage_id || "",
        agency_contact_id: prefilledData.agency_contact_id || "", // Sera rempli par loadMainAgent() si vide
        booking_agency_id: prefilledData.booking_agency_id || "", // Sera rempli par loadMainAgent() si vide
        date_time: prefilledData.event_day_date || prefilledData.date_time || "",
        performance_time: prefilledData.performance_time ? prefilledData.performance_time.slice(0, 5) : "14:00",
        duration: prefilledData.duration || 60,
        currency: (prefilledData.fee_currency || "EUR") as CurrencyCode,
        amount_net: isNet ? amountValue : null,
        amount_gross: !isNet ? amountValue : null,
        amount_is_net: isNet,
        amount_gross_is_subject_to_withholding: !isNet || prefilledData.amount_gross_is_subject_to_withholding || false,
        subject_to_withholding_tax: prefilledData.amount_gross_is_subject_to_withholding ?? true, // Par défaut soumis
        withholding_note: prefilledData.withholding_note || "",
        amount_display: amountValue,
        agency_commission_pct: prefilledData.commission_percentage ?? null,
        validity_date: prefilledData.validity_date || "",
        // Notes (en mode modification)
        notes_date: prefilledData.notes_date || "",
        notes_financial: prefilledData.notes_financial || "",
        note_general: prefilledData.note_general || "",
      });
      setDurationMode(getDurationMode(prefilledData.duration));
      setLinkedPerformanceId(prefilledData.performance_id || null);

      if (amountValue !== null) budgetFields.add("amount");
      if (prefilledData.fee_currency) budgetFields.add("currency");
      if (prefilledData.commission_percentage !== null && prefilledData.commission_percentage !== undefined) {
        budgetFields.add("commission");
      }
      if (prefilledData.withholding_note) {
        budgetFields.add("withholding_note");
      }
      
      // Frais additionnels (0 par défaut si non renseigné)
      const prodFee = prefilledData.prod_fee_amount ?? 0;
      setProdFeeAmount(prodFee);
      if (prodFee > 0) budgetFields.add("prod_fee_amount");
      
      const backlineFee = prefilledData.backline_fee_amount ?? 0;
      setBacklineFeeAmount(backlineFee);
      if (backlineFee > 0) budgetFields.add("backline_fee_amount");
      
      const buyoutHotel = prefilledData.buyout_hotel_amount ?? 0;
      setBuyoutHotelAmount(buyoutHotel);
      if (buyoutHotel > 0) budgetFields.add("buyout_hotel_amount");
      
      const buyoutMeal = prefilledData.buyout_meal_amount ?? 0;
      setBuyoutMealAmount(buyoutMeal);
      if (buyoutMeal > 0) budgetFields.add("buyout_meal_amount");
      
      const flightContrib = prefilledData.flight_contribution_amount ?? 0;
      setFlightContributionAmount(flightContrib);
      if (flightContrib > 0) budgetFields.add("flight_contribution_amount");
      
      const technicalFee = prefilledData.technical_fee_amount ?? 0;
      setTechnicalFeeAmount(technicalFee);
      if (technicalFee > 0) budgetFields.add("technical_fee_amount");
      setFieldsFromBudget(budgetFields);
      
      // Charger le booking agent après setFormData
      loadMainAgent();
      
      // Charger les extras de l'offre originale (en mode modification)
      loadOfferExtrasFromOriginal();
    } else {
      setDurationMode(getDurationMode(formData.duration));
    }
  }, [open, editingOffer, prefilledData]);
  
  // =============================================================================
  // AUTO-CHARGEMENT DU BOOKING AGENT ET BUDGET QUAND L'ARTISTE CHANGE
  // =============================================================================
  useEffect(() => {
    if (!formData.artist_id || !open) return;
    
    const loadAgentForArtist = async () => {
      const mainAgentId = await loadArtistMainBookingAgent(formData.artist_id);
      if (mainAgentId) {
        console.log(`[AUTO] Booking agent auto-sélectionné: ${mainAgentId}`);
        
        // Récupérer l'agence du booking agent
        const { data: agencyData } = await supabase
          .from("crm_contact_company_links")
          .select("linked_company_id")
          .eq("contact_id", mainAgentId)
          .maybeSingle();
        
        setFormData(prev => ({
          ...prev,
          agency_contact_id: mainAgentId,
          booking_agency_id: agencyData?.linked_company_id || ""
        }));
      }
    };
    
    // Charger les données financières du Budget Artistique
    const loadBudget = async () => {
      await loadBudgetData(formData.artist_id, eventId);
    };
    
    loadAgentForArtist();
    loadBudget();
  }, [formData.artist_id, open, eventId, loadBudgetData]);
  
  // =============================================================================
  // CALCUL AUTOMATIQUE DU MONTANT D'AFFICHAGE
  // =============================================================================
  useEffect(() => {
    if (formData.amount_is_net) {
      setFormData(prev => ({ ...prev, amount_display: prev.amount_net }));
    } else {
      setFormData(prev => ({ ...prev, amount_display: prev.amount_gross }));
    }
  }, [formData.amount_is_net, formData.amount_net, formData.amount_gross]);
  
  // =============================================================================
  // GESTION BOUTON TBC
  // =============================================================================
  const handleToggleTBC = () => {
    if (isTBC) {
      // Restaurer l'heure sauvegardée
      setFormData(prev => ({ ...prev, performance_time: savedPerformanceTime }));
      setIsTBC(false);
    } else {
      // Sauvegarder l'heure actuelle et passer en TBC
      setSavedPerformanceTime(formData.performance_time);
      setFormData(prev => ({ ...prev, performance_time: "TBC" }));
      setIsTBC(true);
    }
  };
  
  // =============================================================================
  // GESTION EXTRAS (artist OU festival, mutuellement exclusif)
  // =============================================================================
  const handleExtraAssignment = (extraId: string, assignedTo: "festival" | "artist" | null) => {
    setSelectedExtras(prev => {
      const newExtras = { ...prev };
      if (assignedTo === null) {
        delete newExtras[extraId];
      } else {
        newExtras[extraId] = assignedTo;
      }
      return newExtras;
    });
  };
  
  // =============================================================================
  // GESTION CLAUSES D'EXCLUSIVITÉ
  // =============================================================================
  const handleExclusivityClauseToggle = (clauseId: string, checked: boolean) => {
    setExclusivityClausesSelected(prev =>
      checked ? [...prev, clauseId] : prev.filter(item => item !== clauseId)
    );
  };

  const buildExclusivityDetails = (preset: ExclusivityPreset): string | null => {
    const parts: string[] = [];
    if (preset.region) parts.push(preset.region);
    if (preset.perimeter_km !== null && preset.perimeter_km !== undefined) {
      parts.push(`${preset.perimeter_km} km`);
    }
    if (preset.days_before !== null && preset.days_before !== undefined) {
      parts.push(`-${preset.days_before} j`);
    }
    if (preset.days_after !== null && preset.days_after !== undefined) {
      parts.push(`+${preset.days_after} j`);
    }
    return parts.length ? parts.join(" • ") : null;
  };
  
  // =============================================================================
  // GESTION TYPE DE MONTANT (XOR)
  // =============================================================================
  const handleToggleAmountIsNet = (checked: boolean) => {
    if (checked) {
      switchAmountMode(true);
    }
  };
  
  const handleToggleGrossWithholding = (checked: boolean) => {
    if (checked) {
      switchAmountMode(false);
    }
  };
  
  // =============================================================================
  // VALIDATION DU FORMULAIRE (9 champs obligatoires)
  // =============================================================================
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    // 1. Artiste
    if (!formData.artist_id) newErrors.artist_id = "Artiste requis";
    
    // 2. Scène
    if (!formData.stage_id) newErrors.stage_id = "Scène requise";
    
    // 3. Date
    if (!formData.date_time) newErrors.date_time = "Date requise";
    
    // 4. Heure
    if (!formData.performance_time) newErrors.performance_time = "Heure requise";
    
    // 5. Durée
    if (!formData.duration || formData.duration <= 0) newErrors.duration = "Durée requise";
    
    // 6. Date de validité
    if (!formData.validity_date) newErrors.validity_date = "Date de validité requise";
    
    // 7. Au moins un montant renseigné
    const hasAmount = 
      (formData.amount_is_net && formData.amount_net) || 
      (formData.amount_gross_is_subject_to_withholding && formData.amount_gross);
    if (!hasAmount) newErrors.amount_display = "Montant requis";
    
    // 8. Au moins un type de montant sélectionné
    if (!formData.amount_is_net && !formData.amount_gross_is_subject_to_withholding) {
      newErrors.amount_type = "Type de montant requis (Net OU Brut)";
    }
    
    // 9. Devise
    if (!formData.currency) newErrors.currency = "Devise requise";
    
    setErrors(newErrors);
    const firstErrorKey = Object.keys(newErrors)[0];
    if (firstErrorKey) {
      const el = fieldRefs.current[firstErrorKey];
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        if ("focus" in el) {
          (el as HTMLElement).focus();
        }
      }
    }
    return Object.keys(newErrors).length === 0;
  };
  
  // =============================================================================
  // HELPER : Classe CSS pour champs financiers avec indicateurs visuels
  // =============================================================================
  const getFinancialFieldClassName = (fieldName: string, value: any, baseClassName: string = ""): string => {
    // Priorité 1: Erreur de validation
    if (errors[fieldName]) {
      return `${baseClassName} border-red-500 bg-red-50 dark:bg-red-900/10`.trim();
    }
    
    // Priorité 2: Pré-rempli depuis Budget (VERT)
    if (fieldsFromBudget.has(fieldName)) {
      return `${baseClassName} border-[#90EE90] bg-[#90EE9015] dark:border-[#90EE90] dark:bg-[#90EE9020]`.trim();
    }
    
    // Priorité 3: Champ vide (ROUGE clair)
    const isEmpty = value === null || value === undefined || value === '' || value === 0;
    if (isEmpty && !fieldsFromBudget.has(fieldName)) {
      return `${baseClassName} border-red-300 dark:border-red-800`.trim();
    }
    
    // Par défaut: Normal
    return baseClassName;
  };

  // Pour compatibilité avec les autres champs
  const getFieldClassName = (fieldName: string, baseClassName: string = ""): string => {
    const errorClass = errors[fieldName] ? "border-red-500 bg-red-50 dark:bg-red-900/10" : "";
    const budgetClass = fieldsFromBudget.has(fieldName) ? "border-[#90EE90] bg-[#90EE9015] dark:border-[#90EE90] dark:bg-[#90EE9020]" : "";
    return `${baseClassName} ${errorClass || budgetClass}`.trim();
  };

  const activeAmountValue = formData.amount_is_net ? formData.amount_net : formData.amount_gross;

  const handleAmountInputChange = (value: number | null) => {
    if (formData.amount_is_net) {
      setFormData(prev => ({ ...prev, amount_net: value, amount_display: value }));
    } else {
      setFormData(prev => ({ ...prev, amount_gross: value, amount_display: value }));
    }
  };

  const switchAmountMode = (toNet: boolean) => {
    setFormData(prev => {
      const currentAmount = prev.amount_is_net ? prev.amount_net : prev.amount_gross;
      if (toNet) {
        return {
          ...prev,
          amount_is_net: true,
          amount_net: currentAmount,
          amount_gross: null,
          amount_gross_is_subject_to_withholding: false,
          amount_display: currentAmount,
        };
      }
      return {
        ...prev,
        amount_is_net: false,
        amount_gross_is_subject_to_withholding: true,
        amount_gross: currentAmount,
        amount_net: null,
        amount_display: currentAmount,
      };
    });
  };
  
  // =============================================================================
  // SAUVEGARDE DE L'OFFRE
  // =============================================================================
  const handleSave = async (status: "draft" | "ready_to_send" = "draft") => {
    if (!validateForm()) {
      toastError("Veuillez remplir tous les champs obligatoires");
      return;
    }
    
    setSaving(true);
    try {
      // Construction date_time
      let dateTime = "";
      if (formData.date_time && formData.performance_time) {
        if (isTBC || formData.performance_time === "TBC") {
          dateTime = `${formData.date_time}T00:00:00`;
        } else {
          const timeFormatted = formData.performance_time.includes(":") 
            ? formData.performance_time 
            : `${formData.performance_time}:00`;
          dateTime = `${formData.date_time}T${timeFormatted}:00`;
        }
      }
      
      // Calcul montant display
      const amountDisplay = formData.amount_is_net ? formData.amount_net : formData.amount_gross;
      
      // Récupérer noms pour cache
      const artistName = artists.find(a => a.id === formData.artist_id)?.name || "";
      const stageName = stages.find(s => s.id === formData.stage_id)?.name || "";
      
      // Construction payload
      console.log("[OfferComposer] Sauvegarde - agency_contact_id:", formData.agency_contact_id, "booking_agency_id:", formData.booking_agency_id);
      const payload: any = {
        event_id: eventId,
        company_id: companyId,
        artist_id: formData.artist_id,
        stage_id: formData.stage_id,
        agency_contact_id: formData.agency_contact_id || null,
        booking_agency_id: formData.booking_agency_id || null,
        artist_name: artistName,
        stage_name: stageName,
        date_time: dateTime,
        performance_time: isTBC ? "TBC" : formData.performance_time,
        duration: formData.duration,
        duration_minutes: formData.duration,
        currency: formData.currency,
        amount_net: formData.amount_is_net ? formData.amount_net : null,
        amount_gross: formData.amount_is_net ? null : formData.amount_gross,
        amount_is_net: formData.amount_is_net,
        amount_gross_is_subject_to_withholding: formData.amount_gross_is_subject_to_withholding,
        subject_to_withholding_tax: formData.subject_to_withholding_tax,
        withholding_note: formData.withholding_note || null,
        amount_display: amountDisplay,
        agency_commission_pct: formData.agency_commission_pct,
        validity_date: formData.validity_date,
        status,
        
        // Frais additionnels (0 par défaut si non renseigné)
        prod_fee_amount: prodFeeAmount ?? 0,
        prod_fee_currency: formData.currency,
        backline_fee_amount: backlineFeeAmount ?? 0,
        backline_fee_currency: formData.currency,
        buyout_hotel_amount: buyoutHotelAmount ?? 0,
        buyout_hotel_currency: formData.currency,
        buyout_meal_amount: buyoutMealAmount ?? 0,
        buyout_meal_currency: formData.currency,
        flight_contribution_amount: flightContributionAmount ?? 0,
        flight_contribution_currency: formData.currency,
        technical_fee_amount: technicalFeeAmount ?? 0,
        technical_fee_currency: formData.currency,
        
        // Notes
        notes_date: formData.notes_date || null,
        notes_financial: formData.notes_financial || null,
        note_general: formData.note_general || null,
        
        // Clauses d'exclusivité
        terms_json: {
          selectedClauseIds: exclusivityClausesSelected,
        },
      };
      
      let offerId: string;
      
      // DÉTERMINER LE MODE (CRITIQUE)
      const isModification = prefilledData?.isModification === true;
      
      if (editingOffer) {
        // MODE ÉDITION DIRECTE (modifie l'offre existante, même ID)
        await updateOffer(editingOffer.id, payload);
        offerId = editingOffer.id;
        console.log("âœï¸ Offre éditée:", offerId);
        
      } else if (isModification && prefilledData?.originalOfferId) {
        // MODE MODIFICATION AVEC VERSIONING (crée nouvelle version)
        console.log("ðŸ”„ Création nouvelle version");
        
        // Appeler la fonction RPC create_offer_version
        const { data, error } = await supabase.rpc("create_offer_version", {
          p_original_offer_id: prefilledData.originalOfferId,
          p_new_offer_data: payload,
        });
        
        if (error) throw error;
        
        // La fonction retourne directement l'UUID de la nouvelle offre
        const newVersion = (prefilledData.originalVersion || 1) + 1;
        if (data) {
          offerId = data as string;
          console.log(`[OK] Version V${newVersion} créée: ${offerId}`);
        } else {
          throw new Error("Aucune donnée retournée par create_offer_version");
        }
        
      } else {
        // MODE CRÉATION NORMALE (nouvelle offre v1)
        const newOffer = await createOffer(payload);
        offerId = newOffer.id;
        console.log(`[OK] Nouvelle offre créée: ${offerId} (v1)`);
      }
      
      // Sauvegarder les extras
      await saveOfferExtras(offerId, selectedExtras);
      
      // Mettre à jour la performance liée (horaires + finances)
      await syncLinkedPerformance(status);
      
      // Mise à jour statut si ready_to_send
      if (status === "ready_to_send") {
        await updateOffer(offerId, {
          ready_to_send_at: new Date().toISOString(),
        });
        
        // Déclencher l'événement de changement de statut
        window.dispatchEvent(new CustomEvent("offer-status-changed"));
      }
      
      toastSuccess(editingOffer ? "Offre modifiée" : "Offre créée");
      onSuccess();
      onClose();
      
    } catch (error: any) {
      console.error("âŒ Erreur sauvegarde:", error);
      toastError(error?.message || "Erreur de sauvegarde");
    } finally {
      setSaving(false);
    }
  };
  
  // =============================================================================
  // SYNCHRONISATION DE LA PERFORMANCE LIÉE (HORAIRES + FINANCIER)
  // =============================================================================
  async function syncLinkedPerformance(offerStatus: "draft" | "ready_to_send"): Promise<void> {
    try {
      const feeAmount = formData.amount_is_net ? formData.amount_net : formData.amount_gross;
      if (!formData.artist_id || !eventId || !companyId) return;

      const normalizedPerfTime = isTBC || !formData.performance_time
        ? "00:00"
        : formData.performance_time;
      const bookingStatus: BookingStatus = offerStatus === "ready_to_send" ? "offre_envoyee" : "offre_a_faire";

      const preferedPerformanceIds = [
        linkedPerformanceId,
        prefilledData?.performance_id || null,
      ].filter((id): id is string => Boolean(id));

      let performanceId: string | null = null;
      let existingPerfData: { event_day_id: string | null; event_stage_id: string | null } | null = null;

      const fetchPerformanceById = async (perfId: string) => {
        const { data, error } = await supabase
          .from("artist_performances")
          .select("id, event_day_id, event_stage_id")
          .eq("id", perfId)
          .maybeSingle();
        if (error && error.code !== "PGRST116") throw error;
        return data || null;
      };

      for (const candidate of preferedPerformanceIds) {
        const data = await fetchPerformanceById(candidate);
        if (data) {
          performanceId = data.id;
          existingPerfData = { event_day_id: data.event_day_id, event_stage_id: data.event_stage_id };
          break;
        }
      }

      if (!performanceId) {
        const { data, error } = await supabase
          .from("artist_performances")
          .select("id, event_day_id, event_stage_id")
          .eq("artist_id", formData.artist_id)
          .eq("event_id", eventId)
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (error && error.code !== "PGRST116") throw error;
        if (data?.id) {
          performanceId = data.id;
          existingPerfData = { event_day_id: data.event_day_id, event_stage_id: data.event_stage_id };
        }
      }

      const resolveEventDayId = async (): Promise<string | null> => {
        const targetDate =
          formData.date_time ||
          prefilledData?.event_day_date ||
          null;
        if (targetDate) {
          const { data, error } = await supabase
            .from("event_days")
            .select("id")
            .eq("event_id", eventId)
            .eq("date", targetDate)
            .maybeSingle();
          if (error && error.code !== "PGRST116") throw error;
          if (data?.id) return data.id;
        }
        return existingPerfData?.event_day_id || null;
      };

      let eventDayId = await resolveEventDayId();
      if (!eventDayId) {
        const { data } = await supabase
          .from("event_days")
          .select("id")
          .eq("event_id", eventId)
          .order("date", { ascending: true })
          .limit(1)
          .maybeSingle();
        eventDayId = data?.id || null;
      }

      const stageForPerformance =
        formData.stage_id ||
        existingPerfData?.event_stage_id ||
        stages[0]?.id ||
        null;

      if (!stageForPerformance) {
        toastError("Impossible d'identifier une scène pour la performance liée");
        return;
      }

      if (!performanceId) {
        if (!eventDayId) {
          toastError("Aucun jour d'événement ne correspond à la date sélectionnée.");
          return;
        }

        const createdPerformance: Performance = await createPerformance({
          event_day_id: eventDayId,
          event_stage_id: stageForPerformance,
          artist_id: formData.artist_id,
          performance_time: normalizedPerfTime,
          duration: formData.duration || 60,
          fee_amount: feeAmount || 0,
          fee_currency: formData.currency,
          commission_percentage: formData.agency_commission_pct ?? null,
          fee_is_net: formData.amount_is_net,
          subject_to_withholding_tax: formData.subject_to_withholding_tax,
          booking_status: bookingStatus,
          prod_fee_amount: prodFeeAmount ?? null,
          backline_fee_amount: backlineFeeAmount ?? null,
          buyout_hotel_amount: buyoutHotelAmount ?? null,
          buyout_meal_amount: buyoutMealAmount ?? null,
          flight_contribution_amount: flightContributionAmount ?? null,
          technical_fee_amount: technicalFeeAmount ?? null,
        });

        performanceId = createdPerformance.id;
        existingPerfData = {
          event_day_id: createdPerformance.event_day_id,
          event_stage_id: createdPerformance.stage_id,
        };
        setLinkedPerformanceId(createdPerformance.id);
      }

      if (!performanceId) return;

      const updatePayload: PerformanceUpdate = {
        id: performanceId,
        artist_id: formData.artist_id,
        event_stage_id: stageForPerformance,
        performance_time: normalizedPerfTime,
        duration: formData.duration || 60,
        fee_amount: feeAmount || 0,
        fee_currency: formData.currency,
        commission_percentage: formData.agency_commission_pct ?? null,
        fee_is_net: formData.amount_is_net,
        subject_to_withholding_tax: formData.subject_to_withholding_tax,
        booking_status: bookingStatus,
        prod_fee_amount: prodFeeAmount ?? 0,
        backline_fee_amount: backlineFeeAmount ?? 0,
        buyout_hotel_amount: buyoutHotelAmount ?? 0,
        buyout_meal_amount: buyoutMealAmount ?? 0,
        flight_contribution_amount: flightContributionAmount ?? 0,
        technical_fee_amount: technicalFeeAmount ?? 0,
      };

      if (eventDayId) {
        updatePayload.event_day_id = eventDayId;
      }

      const updatedPerformance = await updatePerformance(updatePayload);
      setLinkedPerformanceId(updatedPerformance.id);

      console.log("[PERF] Performance synchronisée");
      window.dispatchEvent(new CustomEvent("performance-updated"));
    } catch (error) {
      console.error("[PERF] Erreur synchronisation performance:", error);
      toastError("Synchronisation Budget Artistique impossible. Merci de réessayer.");
    }
  }
  
  // =============================================================================
  // SAUVEGARDE DES EXTRAS
  // =============================================================================
  async function saveOfferExtras(
    offerId: string, 
    extras: Record<string, "festival" | "artist">
  ): Promise<void> {
    try {
      // 1. Supprimer extras existants
      await supabase
        .from("offer_extras")
        .delete()
        .eq("offer_id", offerId);

      // 2. Préparer insertions avec le label depuis bookingExtras
      const extrasToInsert = Object.entries(extras)
        .map(([extraId, chargedTo]) => {
          // Trouver le label de l'extra dans bookingExtras (type OfferClause)
          const extraDef = bookingExtras.find(e => e.id === extraId);
          if (!extraDef) return null;
          
          return {
            id: crypto.randomUUID(),
            offer_id: offerId,
            extra_id: extraId,
            charge_to: chargedTo,
            label: extraDef.title || "Extra", // OfferClause utilise 'title'
            company_id: companyId,
          };
        })
        .filter(Boolean); // Filtrer les nulls

      // 3. Insérer nouveaux extras
      if (extrasToInsert.length > 0) {
        const { error } = await supabase
          .from("offer_extras")
          .insert(extrasToInsert);
        
        if (error) throw error;
        console.log(`[OK] ${extrasToInsert.length} extras sauvegardés`);
      }
    } catch (error) {
      console.error("[ERROR] Erreur sauvegarde extras:", error);
      throw error;
    }
  }
  
  // =============================================================================
  // GÉNÉRATION COMPLÈTE (WORD + PDF)
  // =============================================================================
  const handleGenerateOffer = async () => {
    if (!validateForm()) {
      toastError("Veuillez remplir tous les champs obligatoires avant de générer l'offre");
      return;
    }
    
    setGeneratingPdf(true);
    try {
      // 1. S'assurer que l'offre est sauvegardée d'abord
      let offerId = editingOffer?.id;
      
      const selectedArtist = artists.find(a => a.id === formData.artist_id);
      const selectedStage = stages.find(s => s.id === formData.stage_id);
      
      // Construire le payload commun pour création et édition
      const payload: any = {
        company_id: companyId,
        event_id: eventId,
        artist_id: formData.artist_id || null,
        stage_id: formData.stage_id || null,
        artist_name: selectedArtist?.name || prefilledData?.artist_name || "",
        stage_name: selectedStage?.name || prefilledData?.stage_name || "",
        currency: formData.currency,
        amount_net: formData.amount_net,
        amount_gross: formData.amount_gross,
        amount_is_net: formData.amount_is_net,
        amount_display: formData.amount_is_net ? formData.amount_net : formData.amount_gross,
        agency_commission_pct: formData.agency_commission_pct,
        date_time: formData.date_time ? new Date(formData.date_time).toISOString() : null,
        performance_time: formData.performance_time || null,
        duration: formData.duration,
        validity_date: formData.validity_date || null,
        agency_contact_id: formData.agency_contact_id || null,
        booking_agency_id: formData.booking_agency_id || null,
        prod_fee_amount: prodFeeAmount ?? 0,
        backline_fee_amount: backlineFeeAmount ?? 0,
        buyout_hotel_amount: buyoutHotelAmount ?? 0,
        buyout_meal_amount: buyoutMealAmount ?? 0,
        flight_contribution_amount: flightContributionAmount ?? 0,
        technical_fee_amount: technicalFeeAmount ?? 0,
        amount_gross_is_subject_to_withholding: formData.amount_gross_is_subject_to_withholding,
        withholding_note: formData.withholding_note || null,
        // Notes
        notes_date: formData.notes_date || null,
        notes_financial: formData.notes_financial || null,
        note_general: formData.note_general || null,
        terms_json: {
          selectedClauseIds: exclusivityClausesSelected,
        },
      };
      
      console.log("[OfferComposer] Sauvegarde - agency_contact_id:", formData.agency_contact_id, "booking_agency_id:", formData.booking_agency_id);
      
      if (!offerId) {
        // MODE CRÉATION: nouvelle offre
        toastSuccess("Création de l'offre...");
        payload.status = "draft";
        const newOffer = await createOffer(payload);
        offerId = newOffer.id;
        await saveOfferExtras(offerId, selectedExtras);
      } else {
        // MODE ÉDITION: mettre à jour l'offre existante avec les modifications
        toastSuccess("Mise à jour de l'offre...");
        await updateOffer(offerId, payload);
        await saveOfferExtras(offerId, selectedExtras);
      }
      
      // 2. Récupérer le nom de l'événement
      const { data: eventData } = await supabase
        .from("events")
        .select("name")
        .eq("id", eventId)
        .single();
      
      const eventName = eventData?.name || "Événement";
      // selectedArtist et selectedStage déjà déclarés plus haut
      
      // 3. Construire les listes d'extras
      const extrasEntries = Object.entries(selectedExtras);
      const extrasFestival: string[] = [];
      const extrasArtist: string[] = [];
      
      extrasEntries.forEach(([extraId, chargedTo]) => {
        const extra = bookingExtras.find(e => e.id === extraId);
        if (extra) {
          if (chargedTo === "artist") {
            extrasArtist.push(extra.title);
          } else {
            extrasFestival.push(extra.title);
          }
        }
      });
      
      // 4. Construire la liste des clauses d'exclusivité
      const exclusivityClausesList = exclusivityClausesSelected.length > 0
        ? exclusivityClauses
            .filter(c => exclusivityClausesSelected.includes(c.id))
            .map(c => c.name)
        : [];
      
      // 5. Générer le WORD
      // Déterminer la version pour le placeholder {version}
      const offerVersion = prefilledData?.isModification 
        ? (prefilledData.originalVersion || 1) + 1 
        : (editingOffer?.version || 1);
      
      toastSuccess("Génération du document Word...");
      const wordInput: OfferWordInput = {
        event_name: eventName,
        artist_name: selectedArtist?.name || prefilledData?.artist_name || "",
        stage_name: selectedStage?.name || prefilledData?.stage_name || "",
        performance_date: formData.date_time || prefilledData?.event_day_date || "",
        performance_time: formData.performance_time || "",
        duration: formData.duration || null,
        version: offerVersion, // Version pour le placeholder {version}
        currency: formData.currency || null,
        amount_net: formData.amount_net,
        amount_gross: formData.amount_gross,
        amount_display: formData.amount_is_net ? formData.amount_net : formData.amount_gross,
        amount_is_net: formData.amount_is_net,
        amount_gross_is_subject_to_withholding: formData.amount_gross_is_subject_to_withholding,
        withholding_note: formData.withholding_note || null,
        notes_date: formData.notes_date || null,
        notes_financial: formData.notes_financial || null, // Si vide, sera généré automatiquement dans wordFill.ts
        note_general: formData.note_general || null,
        prod_fee_amount: prodFeeAmount || null,
        backline_fee_amount: backlineFeeAmount || null,
        buyout_hotel_amount: buyoutHotelAmount || null,
        buyout_meal_amount: buyoutMealAmount || null,
        flight_contribution_amount: flightContributionAmount || null,
        technical_fee_amount: technicalFeeAmount || null,
        extras_festival: extrasFestival,
        extras_artist: extrasArtist,
        note_extras: null,
        exclusivity_clauses: exclusivityClausesList,
        note_clause_exclusivite_festival: null,
        validity_date: formData.validity_date || null,
        offer_id: offerId!,
        event_id: eventId,
        company_id: companyId,
      };
      
      // Debug: vérifier les valeurs avant génération
      console.log("[OfferComposer] wordInput.notes_financial:", JSON.stringify(wordInput.notes_financial));
      console.log("[OfferComposer] wordInput.amount_is_net:", wordInput.amount_is_net);
      console.log("[OfferComposer] wordInput.amount_gross_is_subject_to_withholding:", wordInput.amount_gross_is_subject_to_withholding);
      
      const { wordPath } = await generateOfferWordAndUpload(wordInput);
      
      // 6. Convertir le Word en PDF via Edge Function
      toastSuccess("Conversion en PDF...");
      
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      // Utiliser le token utilisateur ou la clé anon comme fallback
      const authHeader = accessToken 
        ? `Bearer ${accessToken}`
        : `Bearer ${anonKey}`;
      
      let convertResult: any = { ok: false };
      
      try {
        const convertResponse = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/convert-word-to-pdf`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": authHeader,
              "apikey": anonKey,
            },
            body: JSON.stringify({
              word_storage_path: wordPath,
              offer_id: offerId,
            }),
          }
        );
        
        if (convertResponse.ok) {
          convertResult = await convertResponse.json();
        } else {
          console.warn("[Offer] Edge Function status:", convertResponse.status);
        }
      } catch (edgeFnError) {
        console.warn("[Offer] Erreur appel Edge Function:", edgeFnError);
      }
      
      let pdfPath = convertResult.pdf_storage_path;
      let signedUrl = convertResult.signed_url;
      
      // Si la conversion échoue, utiliser l'ancien système PDF comme fallback
      if (!convertResult.ok || !pdfPath) {
        console.warn("[Offer] Conversion Word->PDF échouée, utilisation du fallback PDF");
        toastSuccess("Génération PDF alternative...");
        
        const extrasSummary = extrasEntries.length > 0
          ? extrasEntries.map(([extraId, chargedTo]) => {
              const extra = bookingExtras.find(e => e.id === extraId);
              const payer = chargedTo === "artist" ? "Artiste" : "Festival";
              return `${extra?.title || "Extra"} — ${payer}`;
            }).join("\n")
          : "";
        
        const clausesSummary = exclusivityClausesList.join("\n");
        
        const pdfInput = {
          event_name: eventName,
          artist_name: selectedArtist?.name || prefilledData?.artist_name || "",
          stage_name: selectedStage?.name || prefilledData?.stage_name || "",
          performance_date: formData.date_time || prefilledData?.event_day_date || "",
          performance_time: formData.performance_time || "",
          duration: formData.duration || null,
          currency: formData.currency || null,
          amount_net: formData.amount_net,
          amount_gross: formData.amount_gross,
          amount_display: formData.amount_is_net ? formData.amount_net : formData.amount_gross,
          amount_is_net: formData.amount_is_net,
          notes: null,
          prod_fee_amount: prodFeeAmount ?? 0,
          backline_fee_amount: backlineFeeAmount ?? 0,
          buyout_hotel_amount: buyoutHotelAmount ?? 0,
          buyout_meal_amount: buyoutMealAmount ?? 0,
          flight_contribution_amount: flightContributionAmount ?? 0,
          technical_fee_amount: technicalFeeAmount ?? 0,
          extras_summary: extrasSummary,
          clauses_summary: clausesSummary,
          offer_id: offerId!,
          event_id: eventId,
          company_id: companyId,
          validity_date: formData.validity_date || null,
          agency_commission_pct: formData.agency_commission_pct || null,
        };
        
        const fallbackResult = await generateOfferPdfAndUpload(pdfInput);
        pdfPath = fallbackResult.storagePath;
        signedUrl = await createSignedOfferPdfUrl(pdfPath);
      }
      
      // 7. Mettre à jour l'offre avec les chemins ET passer le statut à "ready_to_send"
      console.log("[Offer] Mise à jour offre avec status ready_to_send, offerId:", offerId);
      try {
        const updatedOffer = await updateOffer(offerId!, {
          word_storage_path: wordPath,
          pdf_storage_path: pdfPath,
          status: "ready_to_send", // L'offre est prête à être envoyée
        });
        console.log("[Offer] Offre mise à jour avec succès:", updatedOffer?.status);
      } catch (updateError: any) {
        console.error("[Offer] Erreur mise à jour statut:", updateError);
        // Continuer même si la mise à jour du statut échoue
      }
      
      // 8. Ouvrir le PDF en popup
      if (signedUrl) {
        window.open(signedUrl, "_blank", "width=900,height=700,scrollbars=yes,resizable=yes");
      }
      
      toastSuccess("Offre generee - Prete a envoyer !");
      
      // Rafraîchir la liste des offres
      onSuccess();
      
    } catch (error: any) {
      console.error("Erreur génération offre:", error);
      toastError(error?.message || "Erreur de génération de l'offre");
    } finally {
      setGeneratingPdf(false);
    }
  };
  
  // =============================================================================
  // TÉLÉCHARGER LE WORD SEUL
  // =============================================================================
  const handleDownloadWord = async () => {
    const offerId = editingOffer?.id;
    if (!offerId) {
      toastError("Veuillez d'abord sauvegarder l'offre");
      return;
    }
    
    // Vérifier si un Word existe déjà
    const { data: offer } = await supabase
      .from("offers")
      .select("word_storage_path")
      .eq("id", offerId)
      .single();
    
    if (offer?.word_storage_path) {
      // Télécharger le Word existant
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
        toastSuccess("Document Word téléchargé !");
      }
    } else {
      toastError("Aucun document Word disponible. Générez d'abord l'offre.");
    }
  };
  
  // =============================================================================
  // TÉLÉCHARGER LE PDF SEUL
  // =============================================================================
  const handleDownloadPdf = async () => {
    const offerId = editingOffer?.id;
    if (!offerId) {
      toastError("Veuillez d'abord sauvegarder l'offre");
      return;
    }
    
    // Vérifier si un PDF existe déjà
    const { data: offer } = await supabase
      .from("offers")
      .select("pdf_storage_path")
      .eq("id", offerId)
      .single();
    
    if (offer?.pdf_storage_path) {
      const signedUrl = await createSignedOfferPdfUrl(offer.pdf_storage_path);
      if (signedUrl) {
        window.open(signedUrl, "_blank");
        toastSuccess("PDF ouvert !");
      }
    } else {
      toastError("Aucun PDF disponible. Générez d'abord l'offre.");
    }
  };
  
  // =============================================================================
  // MARQUER COMME PRÊT À ENVOYER
  // =============================================================================
  const handleReadyToSend = async () => {
    await handleSave("ready_to_send");
  };
  
  // =============================================================================
  // RESET DU FORMULAIRE À LA FERMETURE
  // =============================================================================
  useEffect(() => {
    if (!open) {
      setFormData({
        artist_id: "",
        stage_id: "",
        agency_contact_id: "",
        booking_agency_id: "",
        date_time: "",
        performance_time: "14:00",
        duration: 60,
        currency: "EUR",
        amount_net: null,
        amount_gross: null,
        amount_is_net: true,
        amount_gross_is_subject_to_withholding: false,
        subject_to_withholding_tax: true,
        withholding_note: "",
        amount_display: null,
        agency_commission_pct: null,
        validity_date: "",
        notes_date: "",
        notes_financial: "",
        note_general: "",
      });
      setErrors({});
      setShowPdfPreview(false);
      setPdfUrl(null);
      setSelectedExtras({});
      setExclusivityClausesSelected([]);
      setIsTBC(false);
      
      // Reset frais à 0 par défaut
      setProdFeeAmount(0);
      setBacklineFeeAmount(0);
      setBuyoutHotelAmount(0);
      setBuyoutMealAmount(0);
      setFlightContributionAmount(0);
      setTechnicalFeeAmount(0);
    }
  }, [open]);
  
  // =============================================================================
  // RENDER - Modal chargement
  // =============================================================================
  if (loading) {
    return (
      <DraggableModal open={open} onClose={onClose} title="Composer une offre">
        <div className="p-8 text-center">
          <div className="text-gray-500 dark:text-gray-400">Chargement...</div>
        </div>
      </DraggableModal>
    );
  }
  
  // =============================================================================
  // RENDER - Titre dynamique
  // =============================================================================
  const modalTitle = prefilledData?.isModification 
    ? `MODIFIER OFFRE (Nouvelle version ${(prefilledData.originalVersion || 1) + 1})`
    : editingOffer 
      ? "ÉDITER OFFRE"
      : "ÉTABLIR UNE OFFRE";
  
  // =============================================================================
  // RENDER - Sections Accordion
  // =============================================================================
  const accordionItems = [
    // =========================================================================
    // SECTION 1 : DONNÉES DE BASE
    // =========================================================================
    {
      id: "general",
      title: (
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-violet-400" />
          <span>Données de base</span>
        </div>
      ),
      content: (
        <div className="pt-4 space-y-4">
          {/* Alert erreurs validation */}
          {Object.keys(errors).length > 0 && (
            <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-500 rounded-lg p-4 mb-4">
              <h3 className="text-sm font-bold text-red-800 dark:text-red-300 mb-2">
                ⚠️ Champs obligatoires manquants
              </h3>
              <ul className="list-disc list-inside text-sm text-red-700 dark:text-red-400">
                {Object.entries(errors).map(([key, message]) => (
                  <li key={key}>{message}</li>
                ))}
              </ul>
            </div>
          )}
          
          <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
            {/* Artiste */}
            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                Artiste <span className="text-red-500">*</span>
              </label>
              <div className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 flex items-center">
                {artists.find(a => a.id === formData.artist_id)?.name || "Aucun artiste sélectionné"}
              </div>
              {errors.artist_id && (
                <span className="text-sm text-red-600 dark:text-red-400">{errors.artist_id}</span>
              )}
            </div>

            {/* Contact Booking */}
            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                Contact Booking
              </label>
              <select
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-violet-500 focus-border-transparent"
                value={formData.agency_contact_id}
                onChange={(e) => {
                  const contactId = e.target.value;
                  const selectedContact = contacts.find(c => c.id === contactId);
                  const agencyId = (selectedContact as any)?.agency_id || "";
                  console.log("[OfferComposer] Changement booking agent:", contactId, "agence:", agencyId);
                  setFormData(prev => ({ 
                    ...prev, 
                    agency_contact_id: contactId,
                    booking_agency_id: agencyId
                  }));
                }}
              >
                <option value="">Sélectionner un booking agent</option>
                {contacts.map(contact => (
                  <option key={contact.id} value={contact.id}>
                    {contact.display_name}
                    {contact.email_primary ? ` (${contact.email_primary})` : ""}
                    {contact.id === formData.agency_contact_id ? " [Assigné à l'artiste]" : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Date */}
            <div>
              <DatePickerPopup
                label="Date *"
                value={formData.date_time ? new Date(formData.date_time) : null}
                onChange={(date) => {
                  if (date) {
                    const year = date.getFullYear();
                    const month = String(date.getMonth() + 1).padStart(2, '0');
                    const day = String(date.getDate()).padStart(2, '0');
                    setFormData(prev => ({ ...prev, date_time: `${year}-${month}-${day}` }));
                  } else {
                    setFormData(prev => ({ ...prev, date_time: "" }));
                  }
                }}
                placeholder="Sélectionner une date"
                error={errors.date_time}
                className={getFieldClassName("date_time")}
                size="sm"
              />
            </div>

            {/* Heure */}
            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                Heure <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                <TimePickerPopup
                  value={isTBC ? null : formData.performance_time}
                  onChange={(time) => setFormData(prev => ({ ...prev, performance_time: time || "14:00" }))}
                  placeholder="Sélectionner une heure"
                  disabled={isTBC}
                  className={getFieldClassName("performance_time", "flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent")}
                  size="default"
                />
                <Button
                  variant={isTBC ? "primary" : "ghost"}
                  size="sm"
                  onClick={handleToggleTBC}
                  title="To Be Confirmed"
                >
                  TBC
                </Button>
              </div>
              {errors.performance_time && (
                <span className="text-sm text-red-600 dark:text-red-400">{errors.performance_time}</span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
            {/* Durée */}
            <div className="xl:col-span-2">
              <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                Durée (min) <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 whitespace-nowrap">Standard :</span>
                {STANDARD_DURATIONS.map((duration) => (
                  <Button
                    key={duration}
                    type="button"
                    size="sm"
                    variant={durationMode === "standard" && formData.duration === duration ? "primary" : "secondary"}
                    onClick={() => {
                      setDurationMode("standard");
                      setFormData(prev => ({ ...prev, duration }));
                    }}
                  >
                    {duration}
                  </Button>
                ))}
                <span className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 whitespace-nowrap">Personnalisée :</span>
                <input
                  type="number"
                  min="5"
                  step="5"
                  className={getFieldClassName("duration", "w-24 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent")}
                  value={formData.duration || ""}
                  onFocus={() => setDurationMode("custom")}
                  onChange={(e) => {
                    const nextValue = parseInt(e.target.value) || 0;
                    setDurationMode("custom");
                    setFormData(prev => ({ ...prev, duration: nextValue }));
                  }}
                  placeholder="min"
                />
              </div>
              {errors.duration && (
                <span className="text-sm text-red-600 dark:text-red-400">{errors.duration}</span>
              )}
            </div>

            {/* Scène */}
            <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
              Scène <span className="text-red-500">*</span>
            </label>
            <select
              className={getFieldClassName("stage_id", "w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent")}
              value={formData.stage_id}
              onChange={(e) => setFormData(prev => ({ ...prev, stage_id: e.target.value }))}
            >
              <option value="">Sélectionner une scène</option>
              {stages.map(stage => (
                <option key={stage.id} value={stage.id}>
                  {stage.name} {stage.capacity ? `(${stage.capacity} cap.)` : ""}
                </option>
              ))}
            </select>
              {errors.stage_id && (
                <span className="text-sm text-red-600 dark:text-red-400">{errors.stage_id}</span>
              )}
            </div>

            {/* Deadline */}
            <div>
            <DatePickerPopup
              label="Deadline (Date de validité) *"
              value={formData.validity_date ? new Date(formData.validity_date) : null}
              onChange={(date) => {
                if (date) {
                  const year = date.getFullYear();
                  const month = String(date.getMonth() + 1).padStart(2, '0');
                  const day = String(date.getDate()).padStart(2, '0');
                  setFormData(prev => ({ ...prev, validity_date: `${year}-${month}-${day}` }));
                } else {
                  setFormData(prev => ({ ...prev, validity_date: "" }));
                }
              }}
              placeholder="Sélectionner une deadline"
              error={errors.validity_date}
              className={getFieldClassName("validity_date")}
              size="sm"
            />
              {errors.validity_date && (
                <span className="text-sm text-red-600 dark:text-red-400">{errors.validity_date}</span>
              )}
            </div>
          </div>
        </div>
      ),
    },

    // =========================================================================
    // SECTION 2 : FINANCIER
    // =========================================================================
    {
      id: "financial",
      title: (
        <div className="flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-violet-400" />
          <span>Financier</span>
        </div>
      ),
      content: (
        <div className="pt-4 space-y-4">
          {/* Type de montant (XOR) */}
          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
              Type de montant <span className="text-red-500">*</span>
            </label>
            <div className="space-y-2">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.amount_is_net}
                  onChange={(e) => handleToggleAmountIsNet(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500 mr-2"
                />
                <span className="text-sm text-gray-900 dark:text-gray-100">
                  Montant net de taxes (le montant saisi est net)
                </span>
              </label>
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.amount_gross_is_subject_to_withholding}
                  onChange={(e) => handleToggleGrossWithholding(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500 mr-2"
                />
                <span className="text-sm text-gray-900 dark:text-gray-100">
                  Montant brut, soumis à l'impôt à la source
                </span>
              </label>
            </div>
            {errors.amount_type && (
              <span className="text-sm text-red-600 dark:text-red-400">{errors.amount_type}</span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Devise */}
            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                Devise <span className="text-red-500">*</span>
              </label>
              <select
                ref={(el) => { fieldRefs.current.currency = el; }}
                className={getFieldClassName("currency", "w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent")}
                value={formData.currency}
                onChange={(e) => setFormData(prev => ({ ...prev, currency: e.target.value as CurrencyCode }))}
              >
                <option value="EUR">EUR</option>
                <option value="CHF">CHF</option>
                <option value="USD">USD</option>
                <option value="GBP">GBP</option>
              </select>
              {errors.currency && (
                <span className="text-sm text-red-600 dark:text-red-400">{errors.currency}</span>
              )}
            </div>

            {/* Montant */}
            <div className="md:col-span-1">
              <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                Montant <span className="text-red-500">*</span>
              </label>
              <input
                ref={(el) => { fieldRefs.current.amount_display = el; }}
                type="number"
                step="0.01"
                className={getFinancialFieldClassName('amount', activeAmountValue, "w-full px-3 py-2 rounded-lg border bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent")}
                value={activeAmountValue ?? ""}
                onChange={(e) => {
                  const parsed = e.target.value === "" ? null : Number(e.target.value);
                  handleAmountInputChange(Number.isNaN(parsed) ? null : parsed);
                }}
                placeholder="0.00"
              />
              {errors.amount_display && (
                <span className="text-sm text-red-600 dark:text-red-400">{errors.amount_display}</span>
              )}
            </div>

            {/* Commission */}
            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                Commission Agence (%)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                className={getFinancialFieldClassName('commission', formData.agency_commission_pct, "w-full px-3 py-2 rounded-lg border bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent")}
                value={formData.agency_commission_pct ?? ""}
                onChange={(e) => setFormData(prev => ({ ...prev, agency_commission_pct: parseFloat(e.target.value) || null }))}
                placeholder="0.00"
              />
            </div>
          </div>

          {/* IMPÔT À LA SOURCE */}
          <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formData.subject_to_withholding_tax}
                onChange={(e) => setFormData(prev => ({ ...prev, subject_to_withholding_tax: e.target.checked }))}
                className="w-4 h-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500 mr-3"
              />
              <div>
                <span className="text-sm font-medium text-amber-800 dark:text-amber-200">
                  Soumis à l'impôt à la source
                </span>
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                  Décochez si l'artiste est suisse (non soumis à l'impôt à la source)
                </p>
              </div>
            </label>
          </div>

          {/* FRAIS ADDITIONNELS (6 types) */}
          <div className="border-t pt-4 mt-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Frais additionnels (optionnels)
            </h3>
            
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* PROD FEE */}
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  PROD FEE
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className={getFinancialFieldClassName('prod_fee_amount', prodFeeAmount, "flex-1 px-2 py-1.5 text-sm rounded border bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100")}
                    value={prodFeeAmount}
                    onChange={(e) => setProdFeeAmount(parseFloat(e.target.value) || 0)}
                  />
                  <span className="px-2 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200">
                    {formData.currency}
                  </span>
                </div>
              </div>

              {/* BACKLINE FEE */}
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  BACKLINE FEE
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className={getFinancialFieldClassName('backline_fee_amount', backlineFeeAmount, "flex-1 px-2 py-1.5 text-sm rounded border bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100")}
                    value={backlineFeeAmount}
                    onChange={(e) => setBacklineFeeAmount(parseFloat(e.target.value) || 0)}
                  />
                  <span className="px-2 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200">
                    {formData.currency}
                  </span>
                </div>
              </div>

              {/* BUY OUT HOTEL */}
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  BUY OUT HOTEL
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className={getFinancialFieldClassName('buyout_hotel_amount', buyoutHotelAmount, "flex-1 px-2 py-1.5 text-sm rounded border bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100")}
                    value={buyoutHotelAmount}
                    onChange={(e) => setBuyoutHotelAmount(parseFloat(e.target.value) || 0)}
                  />
                  <span className="px-2 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200">
                    {formData.currency}
                  </span>
                </div>
              </div>

              {/* BUY OUT MEAL */}
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  BUY OUT MEAL
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className={getFinancialFieldClassName('buyout_meal_amount', buyoutMealAmount, "flex-1 px-2 py-1.5 text-sm rounded border bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100")}
                    value={buyoutMealAmount}
                    onChange={(e) => setBuyoutMealAmount(parseFloat(e.target.value) || 0)}
                  />
                  <span className="px-2 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200">
                    {formData.currency}
                  </span>
                </div>
              </div>

              {/* FLIGHT CONTRIBUTION */}
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  FLIGHT CONTRIBUTION
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className={getFinancialFieldClassName('flight_contribution_amount', flightContributionAmount, "flex-1 px-2 py-1.5 text-sm rounded border bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100")}
                    value={flightContributionAmount}
                    onChange={(e) => setFlightContributionAmount(parseFloat(e.target.value) || 0)}
                  />
                  <span className="px-2 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200">
                    {formData.currency}
                  </span>
                </div>
              </div>

              {/* TECHNICAL FEE */}
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  TECHNICAL FEE
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className={getFinancialFieldClassName('technical_fee_amount', technicalFeeAmount, "flex-1 px-2 py-1.5 text-sm rounded border bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100")}
                    value={technicalFeeAmount}
                    onChange={(e) => setTechnicalFeeAmount(parseFloat(e.target.value) || 0)}
                  />
                  <span className="px-2 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200">
                    {formData.currency}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ),
    },

    // =========================================================================
    // SECTION 3 : EXTRAS ET CLAUSES
    // =========================================================================
    {
      id: "extras",
      title: (
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-violet-400" />
          <span>Extras et Clauses</span>
        </div>
      ),
      content: (
        <div className="pt-4 space-y-6">
          {/* EXTRAS */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
              Extras (qui paie ?)
            </h3>
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Extra
                    </th>
                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Artist
                    </th>
                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Festival
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {bookingExtras.map(extra => (
                    <tr key={extra.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-4 py-2 text-gray-900 dark:text-gray-100">
                        {extra.title}
                        {extra.body && (
                          <span className="block text-xs text-gray-500 dark:text-gray-400">
                            {extra.body}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={selectedExtras[extra.id] === "artist"}
                          onChange={(e) => 
                            handleExtraAssignment(extra.id, e.target.checked ? "artist" : null)
                          }
                          className="w-4 h-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                        />
                      </td>
                      <td className="px-4 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={selectedExtras[extra.id] === "festival"}
                          onChange={(e) => 
                            handleExtraAssignment(extra.id, e.target.checked ? "festival" : null)
                          }
                          className="w-4 h-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* CLAUSES D'EXCLUSIVITÉ */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
              Clauses d'exclusivité
            </h3>
            <div className="space-y-2 max-h-64 overflow-y-auto p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
              {exclusivityClauses.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">Aucune clause disponible</p>
              ) : (
                exclusivityClauses.map(preset => {
                  const details = buildExclusivityDetails(preset);
                  return (
                    <label key={preset.id} className="flex items-start gap-2 cursor-pointer hover:bg-white dark:hover:bg-gray-800 p-2 rounded">
                      <input
                        type="checkbox"
                        checked={exclusivityClausesSelected.includes(preset.id)}
                        onChange={(e) => handleExclusivityClauseToggle(preset.id, e.target.checked)}
                        className="mt-0.5 w-4 h-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                      />
                      <span className="text-sm text-gray-900 dark:text-gray-100">
                        <span className="font-medium">{preset.name}</span>
                        {preset.penalty_note && (
                          <span className="block text-xs text-gray-500 dark:text-gray-400">
                            {preset.penalty_note}
                          </span>
                        )}
                        {details && (
                          <span className="block text-xs text-gray-500 dark:text-gray-400">
                            {details}
                          </span>
                        )}
                      </span>
                    </label>
                  );
                })
              )}
            </div>
          </div>
        </div>
      ),
    },

    // =========================================================================
    // SECTION 4 : NOTES
    // =========================================================================
    {
      id: "notes",
      title: (
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-violet-400" />
          <span>Notes</span>
        </div>
      ),
      content: (
        <div className="pt-4 space-y-4">
          {/* Note Date */}
          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
              Note Date <span className="text-xs text-gray-500">(placeholder: {'{'}notes_date{'}'})</span>
            </label>
            <textarea
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none"
              rows={2}
              value={formData.notes_date}
              onChange={(e) => setFormData(prev => ({ ...prev, notes_date: e.target.value }))}
              placeholder="Ex: Horaire susceptible de changer, confirmation 2 semaines avant..."
            />
          </div>

          {/* Note Financière */}
          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
              Note Financière <span className="text-xs text-gray-500">(placeholder: {'{'}notes_financial{'}'})</span>
            </label>
            <textarea
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none"
              rows={2}
              value={formData.notes_financial}
              onChange={(e) => setFormData(prev => ({ ...prev, notes_financial: e.target.value }))}
              placeholder="Ex: Paiement 50% à la signature, 50% le jour du concert..."
            />
          </div>

          {/* Note Générale */}
          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
              Note Générale <span className="text-xs text-gray-500">(placeholder: {'{'}note_general{'}'})</span>
            </label>
            <textarea
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none"
              rows={3}
              value={formData.note_general}
              onChange={(e) => setFormData(prev => ({ ...prev, note_general: e.target.value }))}
              placeholder="Remarques générales concernant l'offre..."
            />
          </div>
        </div>
      ),
    },
  ];

  // =============================================================================
  // RENDER PRINCIPAL
  // =============================================================================
  return (
    <>
      <DraggableModal open={open} onClose={onClose} title={modalTitle} size="xl">
        <Accordion items={accordionItems} defaultOpenId="general" className="space-y-4" />

        {/* Actions footer */}
        <div className="flex justify-between items-center pt-6 mt-6 border-t border-gray-200 dark:border-gray-700">
          {/* Boutons de téléchargement (si offre existante avec documents) */}
          <div className="flex gap-2">
            {editingOffer?.word_storage_path && (
              <Button
                variant="ghost"
                onClick={handleDownloadWord}
                disabled={generatingPdf || saving}
                title="Télécharger le document Word"
              >
                <FileText className="w-4 h-4 mr-2" />
                Word
              </Button>
            )}
            
            {editingOffer?.pdf_storage_path && (
              <Button
                variant="ghost"
                onClick={handleDownloadPdf}
                disabled={generatingPdf || saving}
                title="Ouvrir le PDF"
              >
                <Eye className="w-4 h-4 mr-2" />
                PDF
              </Button>
            )}
          </div>
          
          {/* Boutons d'action */}
          <div className="flex gap-3">
            <Button variant="ghost" onClick={onClose} disabled={saving || generatingPdf}>
              Annuler
            </Button>
            
            {/* Bouton principal unique : Générer l'offre */}
            <Button
              variant="primary"
              onClick={handleGenerateOffer}
              disabled={generatingPdf || saving}
              className="min-w-[180px]"
            >
              {generatingPdf ? (
                <>
                  <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Génération...
                </>
              ) : (
                <>
                  <FileDown className="w-4 h-4 mr-2" />
                  {editingOffer ? "Regénérer l'offre" : "Générer l'offre"}
                </>
              )}
            </Button>
          </div>
        </div>
      </DraggableModal>

      {/* PDF Preview Modal */}
      <DraggableModal open={showPdfPreview} onClose={() => setShowPdfPreview(false)} title="Prévisualisation PDF" size="xl">
        <div className="h-96">
          {pdfUrl ? (
            <iframe
              src={pdfUrl}
              className="w-full h-full border border-gray-300 dark:border-gray-600 rounded-lg"
              title="Prévisualisation PDF"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
              Aucun PDF disponible
            </div>
          )}
        </div>
        <div className="flex justify-end gap-3 mt-4">
          <Button variant="ghost" onClick={() => setShowPdfPreview(false)}>
            Fermer
          </Button>
          {editingOffer && (
            <Button variant="primary" onClick={handleReadyToSend}>
              <Send className="w-4 h-4 mr-2" />
              Pret a envoyer
            </Button>
          )}
        </div>
      </DraggableModal>
    </>
  );
}
