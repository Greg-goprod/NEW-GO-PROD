import { useState, useEffect } from "react";
import Modal, { ModalFooter, ModalButton } from "../../../components/ui/Modal";
import { Button } from "../../../components/aura/Button";
import { TimePickerPopup } from "../../../components/ui/pickers/TimePickerPopup";
import { RejectOfferModal } from "./RejectOfferModal";
import AddArtistModal from "../../../pages/app/artistes/partials/AddArtistModal";
import { useToast } from "../../../components/aura/ToastProvider";
import { FileText, CreditCard, Check } from "lucide-react";
import { supabase } from "../../../lib/supabaseClient";

import {
  fetchArtists,
  fetchEventDays,
  fetchEventStages,
  checkPerformanceUniqueness,
  createPerformance,
  updatePerformance,
  getOrCreatePlaceholderArtist,
  type Artist,
  type EventDay,
  type EventStage,
  type BookingStatus,
  type PerformanceUpdate,
} from "../../timeline/timelineApi";

export interface PerformanceModalProps {
  open: boolean;
  onClose: () => void;
  initialData?: {
    eventId: string;
    companyId: string;
    performanceId?: string;
    // préremplissages (facultatifs)
    artist_id?: string;
    event_day_id?: string;
    event_stage_id?: string;
    performance_time?: string; // "HH:MM:SS"
    duration?: number;         // défaut 60
    fee_amount?: number | null;
    fee_currency?: string;
    commission_percentage?: number | null;
    fee_is_net?: boolean;
    booking_status?: BookingStatus;
    notes?: string;
    // Frais additionnels
    prod_fee_amount?: number | null;
    backline_fee_amount?: number | null;
    buyout_hotel_amount?: number | null;
    buyout_meal_amount?: number | null;
    flight_contribution_amount?: number | null;
    technical_fee_amount?: number | null;
  };
  onSuccess: () => void; // reload timeline/booking
  financesOnly?: boolean; // Afficher uniquement la section finances
}

// Utilitaires pour formatage des nombres
const formatNumber = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return "";
  return value.toLocaleString('fr-CH', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
};

const parseNumber = (value: string): number => {
  if (!value || value.trim() === "") return 0;
  // Supprimer les espaces et remplacer virgule par point
  const cleaned = value.replace(/\s/g, '').replace(',', '.');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
};

// Les couleurs des cartes sont désormais déterminées automatiquement par le statut
// Voir PerformanceCard.tsx pour le mapping statut -> couleur

export function PerformanceModal({
  open,
  onClose,
  initialData,
  onSuccess,
  financesOnly = false,
}: PerformanceModalProps) {
  const { success: toastSuccess, error: toastError } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Données chargées
  const [artists, setArtists] = useState<Artist[]>([]);
  const [days, setDays] = useState<EventDay[]>([]);
  const [stages, setStages] = useState<EventStage[]>([]);
  
  // Form data
  const [formData, setFormData] = useState({
    artist_id: "",
    event_day_id: "",
    event_stage_id: "",
    performance_time: "00:00",
    duration: 60,
    duration_type: "standard" as "standard" | "custom",
    fee_amount: null as number | null,
    fee_currency: "EUR",
    commission_percentage: null as number | null,
    fee_is_net: false, // false = brut, true = net
    booking_status: "idee" as BookingStatus,
    notes: "",
    // Frais additionnels - par défaut 0
    prod_fee_amount: 0,
    backline_fee_amount: 0,
    buyout_hotel_amount: 0,
    buyout_meal_amount: 0,
    flight_contribution_amount: 0,
    technical_fee_amount: 0,
  });
  
  // États des modaux
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showAddArtistModal, setShowAddArtistModal] = useState(false);
  
  // Erreurs de validation
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Chargement des données initiales
  useEffect(() => {
    if (!open || !initialData) {
      console.log("❌ Modal fermé ou pas de données initiales");
      return;
    }
    
    const loadData = async () => {
      setLoading(true);
      try {
        console.log("🔍 Chargement des données...");
        console.log("   - companyId:", initialData.companyId);
        console.log("   - eventId:", initialData.eventId);
        
        const [artistsData, daysData, stagesData] = await Promise.all([
          fetchArtists(initialData.companyId),
          fetchEventDays(initialData.eventId),
          fetchEventStages(initialData.eventId),
        ]);
        
        console.log("✅ Artistes chargés:", artistsData.length, artistsData);
        console.log("✅ Jours chargés:", daysData.length);
        console.log("✅ Scènes chargées:", stagesData.length);
        
        setArtists(artistsData);
        setDays(daysData);
        setStages(stagesData);
        
        // Préremplir le formulaire avec TOUTES les données de la performance
        console.log("📝 Pré-remplissage du formulaire avec initialData:");
        console.log("   - event_day_id:", initialData.event_day_id);
        console.log("   - event_stage_id:", initialData.event_stage_id);
        console.log("   - performance_time:", initialData.performance_time);
        console.log("   - duration:", initialData.duration);
        
        setFormData(prev => ({
          ...prev,
          artist_id: initialData.artist_id || "",
          event_day_id: initialData.event_day_id || "",
          event_stage_id: initialData.event_stage_id || "",
          performance_time: initialData.performance_time ? initialData.performance_time.slice(0, 5) : "14:00",
          duration: initialData.duration || 60,
          duration_type: initialData.duration && ![60, 75, 90, 105, 120].includes(initialData.duration) ? "custom" : "standard",
          fee_amount: initialData.fee_amount ?? null,
          fee_currency: initialData.fee_currency || "EUR",
          commission_percentage: initialData.commission_percentage ?? null,
          fee_is_net: initialData.fee_is_net ?? false,
          booking_status: initialData.booking_status || "idee",
          notes: initialData.notes || "",
          // Frais additionnels - utiliser 0 par défaut au lieu de null
          prod_fee_amount: initialData.prod_fee_amount ?? 0,
          backline_fee_amount: initialData.backline_fee_amount ?? 0,
          buyout_hotel_amount: initialData.buyout_hotel_amount ?? 0,
          buyout_meal_amount: initialData.buyout_meal_amount ?? 0,
          flight_contribution_amount: initialData.flight_contribution_amount ?? 0,
          technical_fee_amount: initialData.technical_fee_amount ?? 0,
        }));
        
        // Si édition, charger la performance existante
        if (initialData.performanceId) {
          // TODO: Implémenter fetchPerformanceById si nécessaire
          // Pour l'instant, on utilise les données préremplies
        }
        
      } catch (error: any) {
        console.error("❌ Erreur chargement données:", error);
        toastError(error?.message || "Erreur de chargement");
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [open, initialData, toastError]);

  // Validation du formulaire
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    // Artiste est maintenant optionnel
    if (!formData.event_day_id) newErrors.event_day_id = "Jour requis";
    if (!formData.event_stage_id) newErrors.event_stage_id = "Scène requise";
    if (!formData.performance_time) newErrors.performance_time = "Heure requise";
    if (!formData.duration || formData.duration <= 0) newErrors.duration = "Durée requise";
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Vérification d'unicité
  const checkUniqueness = async (): Promise<boolean> => {
    if (!formData.artist_id || !formData.event_day_id || !formData.event_stage_id || !formData.performance_time) {
      return true; // Validation déjà faite
    }
    
    try {
      const isUnique = await checkPerformanceUniqueness({
        event_day_id: formData.event_day_id,
        event_stage_id: formData.event_stage_id,
        performance_time: formData.performance_time,
        artist_id: formData.artist_id,
        exclude_id: initialData?.performanceId,
      });
      
      if (!isUnique) {
        setErrors(prev => ({ ...prev, performance_time: "Cette performance existe déjà" }));
        return false;
      }
      
      return true;
    } catch (error: any) {
      console.error("Erreur vérification unicité:", error);
      toastError("Erreur de vérification");
      return false;
    }
  };

  // Sauvegarde
  const handleSave = async () => {
    if (!validateForm()) return;
    
    // Résoudre l'artist_id (créer "À définir" si nécessaire)
    let finalArtistId = formData.artist_id;
    if (!finalArtistId && initialData?.companyId) {
      try {
        finalArtistId = await getOrCreatePlaceholderArtist(initialData.companyId);
      } catch (error: any) {
        console.error("Erreur création artiste placeholder:", error);
        toastError("Erreur lors de la création de l'artiste par défaut");
        return;
      }
    }
    
    const isUnique = await checkUniqueness();
    if (!isUnique) return;
    
    // Récupérer les données de rejet si disponibles
    const rejectionData = (window as any).__rejectionData;
    
    setSaving(true);
    try {
      if (initialData?.performanceId) {
        // Édition - inclure TOUS les champs modifiables
        const updateData: any = {
          id: initialData.performanceId,
          artist_id: finalArtistId, // Inclure l'artiste dans la mise à jour
          event_day_id: formData.event_day_id,
          event_stage_id: formData.event_stage_id,
          performance_time: formData.performance_time,
          duration: formData.duration,
          fee_amount: formData.fee_amount,
          fee_currency: formData.fee_currency,
          commission_percentage: formData.commission_percentage,
          fee_is_net: formData.fee_is_net,
          booking_status: formData.booking_status,
          notes: formData.notes || null,
          // Frais additionnels
          prod_fee_amount: formData.prod_fee_amount,
          backline_fee_amount: formData.backline_fee_amount,
          buyout_hotel_amount: formData.buyout_hotel_amount,
          buyout_meal_amount: formData.buyout_meal_amount,
          flight_contribution_amount: formData.flight_contribution_amount,
          technical_fee_amount: formData.technical_fee_amount,
        };
        
        console.log("🔄 Mise à jour de la performance:", updateData);
        
        // Ajouter les données de rejet si le statut est "rejetée"
        if (formData.booking_status === "offre_rejetee" && rejectionData) {
          updateData.rejection_reason = rejectionData.rejection_reason;
          updateData.rejection_date = rejectionData.rejection_date;
        }
        
        await updatePerformance(updateData);
        console.log("✅ Performance mise à jour avec succès");
        toastSuccess("Performance modifiée");
      } else {
        // Création
        const createData: any = {
          event_day_id: formData.event_day_id,
          event_stage_id: formData.event_stage_id,
          artist_id: finalArtistId,
          performance_time: formData.performance_time,
          duration: formData.duration,
          fee_amount: formData.fee_amount,
          fee_currency: formData.fee_currency,
          commission_percentage: formData.commission_percentage,
          fee_is_net: formData.fee_is_net,
          booking_status: formData.booking_status,
          notes: formData.notes || null,
          created_for_event_id: initialData?.eventId,
          // Frais additionnels
          prod_fee_amount: formData.prod_fee_amount,
          backline_fee_amount: formData.backline_fee_amount,
          buyout_hotel_amount: formData.buyout_hotel_amount,
          buyout_meal_amount: formData.buyout_meal_amount,
          flight_contribution_amount: formData.flight_contribution_amount,
          technical_fee_amount: formData.technical_fee_amount,
        };
        
        // Ajouter les données de rejet si le statut est "rejetée"
        if (formData.booking_status === "offre_rejetee" && rejectionData) {
          createData.rejection_reason = rejectionData.rejection_reason;
          createData.rejection_date = rejectionData.rejection_date;
        }
        
        await createPerformance(createData);
        toastSuccess("Performance créée");
      }
      
      // Nettoyer les données temporaires
      delete (window as any).__rejectionData;
      
      onSuccess();
      onClose();
      
    } catch (error: any) {
      console.error("Erreur sauvegarde:", error);
      toastError(error?.message || "Erreur de sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  // Gestion du rejet - sauvegarde immédiate + synchronisation offre liée
  const handleReject = async (reason: string) => {
    if (!initialData?.performanceId) {
      toastError("Impossible de rejeter : performance non identifiée");
      return;
    }
    
    setSaving(true);
    try {
      const rejectionDate = new Date().toISOString();
      
      // 1. Mise à jour de la performance avec le statut rejeté
      const updateData: PerformanceUpdate = {
        id: initialData.performanceId,
        booking_status: "offre_rejetee",
        rejection_reason: reason,
        rejection_date: rejectionDate,
      };
      
      console.log("🚫 Rejet de la performance:", updateData);
      await updatePerformance(updateData);
      
      // 2. Synchroniser avec l'offre liée si elle existe (même artiste, même événement)
      if (initialData.eventId && formData.artist_id) {
        try {
          const { data: linkedOffers } = await supabase
            .from("offers")
            .select("id, status")
            .eq("event_id", initialData.eventId)
            .eq("artist_id", formData.artist_id)
            .neq("status", "rejected");
          
          if (linkedOffers && linkedOffers.length > 0) {
            console.log("🔗 Offres liées trouvées:", linkedOffers.length);
            // Rejeter toutes les offres liées
            for (const offer of linkedOffers) {
              await supabase
                .from("offers")
                .update({
                  status: "rejected",
                  rejection_reason: reason,
                  rejected_at: rejectionDate,
                  updated_at: rejectionDate,
                })
                .eq("id", offer.id);
              console.log("🚫 Offre liée rejetée:", offer.id);
            }
          }
        } catch (syncError) {
          console.warn("⚠️ Erreur sync offre (non bloquant):", syncError);
        }
      }
      
      toastSuccess("Performance rejetée");
      setShowRejectModal(false);
      onSuccess(); // Rafraîchir la liste
      onClose();   // Fermer le modal
    } catch (error: any) {
      console.error("❌ Erreur rejet:", error);
      toastError(error?.message || "Erreur lors du rejet");
    } finally {
      setSaving(false);
    }
  };

  // Gestion de l'ajout d'artiste via le modal complet
  const handleArtistAdded = async () => {
    // Recharger la liste des artistes
    try {
      console.log("🔄 Rechargement de la liste des artistes...");
      const artistsData = await fetchArtists(initialData?.companyId);
      console.log("✅ Artistes rechargés:", artistsData.length, artistsData);
      setArtists(artistsData);
      toastSuccess("Artiste ajouté avec succès");
    } catch (error) {
      console.error("❌ Erreur rechargement artistes:", error);
      toastError("Erreur lors du rechargement des artistes");
    }
  };

  // Gestion du time picker
  const handleTimeChange = (time: string | null) => {
    if (time) {
      setFormData(prev => ({
        ...prev,
        performance_time: time,
      }));
    }
  };

  // Reset du formulaire à la fermeture
  useEffect(() => {
    if (!open) {
      setFormData({
        artist_id: "",
        event_day_id: "",
        event_stage_id: "",
        performance_time: "00:00",
        duration: 60,
        duration_type: "standard",
        fee_amount: null,
        fee_currency: "EUR",
        commission_percentage: null,
        fee_is_net: false,
        booking_status: "idee",
        notes: "",
        // Frais additionnels - par défaut 0
        prod_fee_amount: 0,
        backline_fee_amount: 0,
        buyout_hotel_amount: 0,
        buyout_meal_amount: 0,
        flight_contribution_amount: 0,
        technical_fee_amount: 0,
      });
      setErrors({});
    }
  }, [open]);

  // Vérifier si on a les données nécessaires
  if (open && !initialData) {
    return (
      <Modal isOpen={open} onClose={onClose} title="Performance">
        <div className="p-8 text-center">
          <div className="text-red-600 dark:text-red-400">
            Erreur : Données manquantes (companyId ou eventId)
          </div>
        </div>
      </Modal>
    );
  }

  if (loading) {
    return (
      <Modal isOpen={open} onClose={onClose} title="Performance">
        <div className="p-8 text-center">
          <div className="text-gray-500 dark:text-gray-400">Chargement...</div>
        </div>
      </Modal>
    );
  }

  return (
    <>
      <Modal
        isOpen={open}
        onClose={onClose}
        title={
          financesOnly 
            ? "Données financières" 
            : (initialData?.performanceId ? "Modifier la performance" : "Ajouter une performance")
        }
        size="xl"
        draggable={true}
        footer={
          <ModalFooter>
            <ModalButton variant="secondary" onClick={onClose} disabled={saving}>
              Annuler
            </ModalButton>
            <ModalButton
              variant="primary"
              onClick={handleSave}
              disabled={saving}
              loading={saving}
            >
              Enregistrer
            </ModalButton>
          </ModalFooter>
        }
      >
        {/* Section Informations générales */}
        {!financesOnly && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-5 h-5 text-violet-400" />
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">INFORMATIONS GÉNÉRALES</h3>
          </div>
          
          <div className="grid grid-cols-5 gap-4">
                {/* Artiste */}
                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                    ARTISTE
                  </label>
                  <select
                    className={`w-full h-11 px-3 py-2 rounded-lg border ${
                      errors.artist_id ? "border-red-500" : "border-gray-300 dark:border-gray-600"
                    } bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100`}
                    value={formData.artist_id}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === "__add_new__") {
                        setFormData(prev => ({ ...prev, artist_id: "" }));
                        setShowAddArtistModal(true);
                      } else {
                        setFormData(prev => ({ ...prev, artist_id: value }));
                      }
                    }}
                  >
                    <option value="">Aucun artiste (optionnel)</option>
                    <option value="__add_new__">+ Ajouter un artiste</option>
                    {artists.map(artist => (
                      <option key={artist.id} value={artist.id}>{artist.name}</option>
                    ))}
                  </select>
                  {errors.artist_id && (
                    <span className="text-sm text-red-600 dark:text-red-400">{errors.artist_id}</span>
                  )}
                </div>

                {/* Jour */}
                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                    JOUR <span className="text-red-500">*</span>
                  </label>
                  <select
                    className={`w-full h-11 px-3 py-2 rounded-lg border ${
                      errors.event_day_id ? "border-red-500" : "border-gray-300 dark:border-gray-600"
                    } bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100`}
                    value={formData.event_day_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, event_day_id: e.target.value }))}
                  >
                    <option value="">Sélectionner un jour</option>
                    {days.map(day => (
                      <option key={day.id} value={day.id}>
                        {new Date(day.date).toLocaleDateString('fr-FR', { 
                          weekday: 'long', 
                          day: '2-digit', 
                          month: '2-digit' 
                        })}
                      </option>
                    ))}
                  </select>
                  {errors.event_day_id && (
                    <span className="text-sm text-red-600 dark:text-red-400">{errors.event_day_id}</span>
                  )}
                </div>

                {/* Scène */}
                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                    SCÈNE <span className="text-red-500">*</span>
                  </label>
                  <select
                    className={`w-full h-11 px-3 py-2 rounded-lg border ${
                      errors.event_stage_id ? "border-red-500" : "border-gray-300 dark:border-gray-600"
                    } bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100`}
                    value={formData.event_stage_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, event_stage_id: e.target.value }))}
                  >
                    <option value="">Sélectionner une scène</option>
                    {stages.map(stage => (
                      <option key={stage.id} value={stage.id}>{stage.name}</option>
                    ))}
                  </select>
                  {errors.event_stage_id && (
                    <span className="text-sm text-red-600 dark:text-red-400">{errors.event_stage_id}</span>
                  )}
                </div>

                {/* Heure de début */}
                <div>
                  <TimePickerPopup
                    value={formData.performance_time}
                    onChange={handleTimeChange}
                    label="HEURE DE DÉBUT *"
                    placeholder="Sélectionner l'heure"
                    error={errors.performance_time}
                    size="sm"
                  />
                </div>

                {/* Statut */}
                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                    STATUT
                  </label>
                  <select
                    className="w-full h-11 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    value={formData.booking_status}
                    onChange={(e) => {
                      const newStatus = e.target.value as BookingStatus;
                      // Si on sélectionne "Rejeté", ouvrir le modal de justification
                      if (newStatus === "offre_rejetee") {
                        setShowRejectModal(true);
                      } else {
                        // Nettoyer les données de rejet si on change de statut
                        delete (window as any).__rejectionData;
                        setFormData(prev => ({ ...prev, booking_status: newStatus }));
                      }
                    }}
                  >
                    <option value="idee">Idée</option>
                    <option value="offre_a_faire">Offre à faire</option>
                    <option value="offre_rejetee">Rejeté</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-5 gap-4 mt-4">
                {/* Durée standard/personnalisée */}
                <div className="col-span-5">
                  <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                    DURÉE (MIN) <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center gap-4">
                    {/* Durée standard */}
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="duration_type"
                        checked={formData.duration_type === "standard"}
                        onChange={() => setFormData(prev => ({ ...prev, duration_type: "standard" }))}
                        className="w-4 h-4"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">Standard:</span>
                      {[60, 75, 90, 105, 120].map(duration => (
                        <Button
                          key={duration}
                          variant={formData.duration === duration && formData.duration_type === "standard" ? "primary" : "secondary"}
                          size="sm"
                          onClick={() => setFormData(prev => ({ ...prev, duration, duration_type: "standard" }))}
                        >
                          {duration}
                        </Button>
                      ))}
                    </div>

                    {/* Durée personnalisée */}
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="duration_type"
                        checked={formData.duration_type === "custom"}
                        onChange={() => setFormData(prev => ({ ...prev, duration_type: "custom" }))}
                        className="w-4 h-4"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">Personnalisée:</span>
                      <input
                        type="number"
                        min="5"
                        step="5"
                        className={`w-24 h-11 px-3 py-2 rounded-lg border ${
                          errors.duration ? "border-red-500" : "border-gray-300 dark:border-gray-600"
                        } bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100`}
                        value={formData.duration}
                        onChange={(e) => setFormData(prev => ({ ...prev, duration: parseInt(e.target.value) || 0, duration_type: "custom" }))}
                        placeholder="min"
                        disabled={formData.duration_type !== "custom"}
                      />
                    </div>

                  </div>
                  {errors.duration && (
                    <span className="text-sm text-red-600 dark:text-red-400">{errors.duration}</span>
                  )}
                </div>
              </div>
        </div>
        )}

        {/* Séparateur */}
        {!financesOnly && (
          <div className="my-6 border-t border-gray-200 dark:border-gray-700"></div>
        )}

        {/* Section Finances */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <CreditCard className="w-5 h-5 text-violet-400" />
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">FINANCES</h3>
          </div>

          {/* Première ligne: Devise, Montant, Commission */}
          <div className="grid grid-cols-6 gap-4 mb-4">
                {/* Devise */}
                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                    DEVISE
                  </label>
                  <select
                    className="w-full h-11 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    value={formData.fee_currency}
                    onChange={(e) => setFormData(prev => ({ ...prev, fee_currency: e.target.value }))}
                  >
                    <option value="EUR">EUR</option>
                    <option value="CHF">CHF</option>
                    <option value="USD">USD</option>
                    <option value="GBP">GBP</option>
                  </select>
                </div>

                {/* Montant */}
                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                    MONTANT
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="decimal"
                      className="w-full h-11 px-3 py-2 pr-12 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                      value={formData.fee_amount === null ? "" : formatNumber(formData.fee_amount)}
                      onChange={(e) => {
                        const value = e.target.value;
                        setFormData(prev => ({ 
                          ...prev, 
                          fee_amount: value === "" ? null : parseNumber(value)
                        }));
                      }}
                      placeholder="0"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 dark:text-gray-400">
                      {formData.fee_currency}
                    </span>
                  </div>
                </div>

                {/* Commission */}
                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                    COMMISSION (%)
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    className="w-full h-11 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    value={formData.commission_percentage === null ? "" : formatNumber(formData.commission_percentage)}
                    onChange={(e) => {
                      const value = e.target.value;
                      setFormData(prev => ({ 
                        ...prev, 
                        commission_percentage: value === "" ? null : parseNumber(value)
                      }));
                    }}
                    placeholder="0"
                  />
                </div>

                {/* Type de montant (Net/Brut) */}
                <div className="col-span-3">
                  <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                    TYPE DE MONTANT
                  </label>
                  <div className="flex items-center gap-6 h-11">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="fee_type"
                        checked={!formData.fee_is_net}
                        onChange={() => setFormData(prev => ({ ...prev, fee_is_net: false }))}
                        className="w-4 h-4 text-violet-600 focus:ring-violet-500"
                      />
                      <span className="text-sm text-gray-900 dark:text-gray-100">Montant brut</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="fee_type"
                        checked={formData.fee_is_net}
                        onChange={() => setFormData(prev => ({ ...prev, fee_is_net: true }))}
                        className="w-4 h-4 text-violet-600 focus:ring-violet-500"
                      />
                      <span className="text-sm text-gray-900 dark:text-gray-100">Montant net</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Frais additionnels */}
              <div className="mt-6">
                <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  FRAIS ADDITIONNELS (EN {formData.fee_currency})
                </h5>
                <div className="grid grid-cols-6 gap-4">
                  {/* PROD FEE */}
                  <div>
                    <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                      PROD FEE
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        inputMode="decimal"
                        className="w-full h-11 px-3 py-2 pr-12 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                        value={formatNumber(formData.prod_fee_amount)}
                        onChange={(e) => {
                          const value = e.target.value;
                          setFormData(prev => ({ 
                            ...prev, 
                            prod_fee_amount: parseNumber(value)
                          }));
                        }}
                        placeholder="0"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 dark:text-gray-400">
                        {formData.fee_currency}
                      </span>
                    </div>
                  </div>

                  {/* BACKLINE FEE */}
                  <div>
                    <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                      BACKLINE FEE
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        inputMode="decimal"
                        className="w-full h-11 px-3 py-2 pr-12 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                        value={formatNumber(formData.backline_fee_amount)}
                        onChange={(e) => {
                          const value = e.target.value;
                          setFormData(prev => ({ 
                            ...prev, 
                            backline_fee_amount: parseNumber(value)
                          }));
                        }}
                        placeholder="0"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 dark:text-gray-400">
                        {formData.fee_currency}
                      </span>
                    </div>
                  </div>

                  {/* BUY OUT HOTEL */}
                  <div>
                    <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                      BUY OUT HOTEL
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        inputMode="decimal"
                        className="w-full h-11 px-3 py-2 pr-12 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                        value={formatNumber(formData.buyout_hotel_amount)}
                        onChange={(e) => {
                          const value = e.target.value;
                          setFormData(prev => ({ 
                            ...prev, 
                            buyout_hotel_amount: parseNumber(value)
                          }));
                        }}
                        placeholder="0"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 dark:text-gray-400">
                        {formData.fee_currency}
                      </span>
                    </div>
                  </div>

                  {/* BUY OUT MEAL */}
                  <div>
                    <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                      BUY OUT MEAL
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        inputMode="decimal"
                        className="w-full h-11 px-3 py-2 pr-12 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                        value={formatNumber(formData.buyout_meal_amount)}
                        onChange={(e) => {
                          const value = e.target.value;
                          setFormData(prev => ({ 
                            ...prev, 
                            buyout_meal_amount: parseNumber(value)
                          }));
                        }}
                        placeholder="0"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 dark:text-gray-400">
                        {formData.fee_currency}
                      </span>
                    </div>
                  </div>

                  {/* FLIGHT CONTRIBUTION */}
                  <div>
                    <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                      FLIGHT CONTRIBUTION
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        inputMode="decimal"
                        className="w-full h-11 px-3 py-2 pr-12 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                        value={formatNumber(formData.flight_contribution_amount)}
                        onChange={(e) => {
                          const value = e.target.value;
                          setFormData(prev => ({ 
                            ...prev, 
                            flight_contribution_amount: parseNumber(value)
                          }));
                        }}
                        placeholder="0"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 dark:text-gray-400">
                        {formData.fee_currency}
                      </span>
                    </div>
                  </div>

                  {/* TECHNICAL FEE */}
                  <div>
                    <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                      TECHNICAL FEE
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        inputMode="decimal"
                        className="w-full h-11 px-3 py-2 pr-12 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                        value={formatNumber(formData.technical_fee_amount)}
                        onChange={(e) => {
                          const value = e.target.value;
                          setFormData(prev => ({ 
                            ...prev, 
                            technical_fee_amount: parseNumber(value)
                          }));
                        }}
                        placeholder="0"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 dark:text-gray-400">
                        {formData.fee_currency}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
        </div>

        {/* Séparateur */}
        <div className="my-6 border-t border-gray-200 dark:border-gray-700"></div>

        {/* Notes internes */}
        <div>
          <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
            NOTES INTERNES
          </label>
          <textarea
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-vertical"
            rows={3}
            value={formData.notes}
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            placeholder="Notes internes pour l'équipe..."
          />
        </div>
      </Modal>

      {/* Reject Modal */}
      <RejectOfferModal
        open={showRejectModal}
        onClose={() => {
          setShowRejectModal(false);
          // Annuler la sélection "Offre rejetée" si l'utilisateur ferme le modal sans raison
          if (formData.booking_status === "offre_rejetee" && !(window as any).__rejectionData) {
            setFormData(prev => ({ ...prev, booking_status: "idee" }));
          }
        }}
        onReject={handleReject}
      />

      {/* Modal d'ajout d'artiste */}
      {showAddArtistModal && initialData?.companyId && initialData?.eventId && (
        <AddArtistModal
          companyId={initialData.companyId}
          eventId={initialData.eventId}
          onClose={() => setShowAddArtistModal(false)}
          onSaved={() => {
            setShowAddArtistModal(false);
            handleArtistAdded();
          }}
        />
      )}
    </>
  );
}