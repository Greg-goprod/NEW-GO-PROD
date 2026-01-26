/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Download, Loader2, Plus } from "lucide-react";
import { Card } from "../components/aura/Card";
import { Button } from "../components/aura/Button";
import { EmptyState } from "../components/aura/EmptyState";
import { useToast } from "../components/aura/ToastProvider";
import { ConfirmDeleteModal } from "../components/ui/ConfirmDeleteModal";
import { Modal } from "../components/aura/Modal";
import { Select } from "../components/ui/Select";
import { useCurrentEvent } from "../hooks/useCurrentEvent";
import { getCurrentCompanyId } from "../lib/tenant";
import { supabase } from "../lib/supabaseClient";

import { TimelineGrid } from "../features/timeline/components/TimelineGrid";
import { CustomTimePicker } from "../features/timeline/components/CustomTimePicker";
import { PerformanceModal } from "../features/booking/modals/PerformanceModal";
import { ReadOnlyTimelineGrid } from "../features/timeline/components/ReadOnlyTimelineGrid";
import html2canvas from "html2canvas";
import { PDFDocument } from "pdf-lib";

const A3_LANDSCAPE_WIDTH = 1190.55; // points
const A3_LANDSCAPE_HEIGHT = 841.89; // points
const PDF_MARGIN = 18; // réduire pour maximiser la zone utile
const PDF_AVAILABLE_WIDTH = A3_LANDSCAPE_WIDTH - PDF_MARGIN * 2;
const PDF_AVAILABLE_HEIGHT = A3_LANDSCAPE_HEIGHT - PDF_MARGIN * 2;
const EXPORT_CANVAS_WIDTH_GLOBAL = 2200;
const EXPORT_CANVAS_WIDTH_DAY = 1600;

import {
  fetchEventDays,
  fetchEventStages,
  fetchPerformances,
  updatePerformance,
  deletePerformance,
  type EventDay,
  type EventStage,
  type Performance,
} from "../features/timeline/timelineApi";

export default function LineupTimelinePage() {
  const navigate = useNavigate();
  const { currentEvent } = useCurrentEvent();
  const eventId = currentEvent?.id || "";
  const hasEvent = Boolean(eventId);
  const { success: toastSuccess, error: toastError } = useToast();
  
  // State local pour companyId
  const [companyId, setCompanyId] = useState<string | null>(null);
  
  const [demoMode, setDemoMode] = useState(!hasEvent);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true); // Empêche le flash au chargement
  
  // Données
  const [days, setDays] = useState<EventDay[]>([]);
  const [stages, setStages] = useState<EventStage[]>([]);
  const [performances, setPerformances] = useState<Performance[]>([]);
  
  // Modaux
  const [showPerformanceModal, setShowPerformanceModal] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedPerformance, setSelectedPerformance] = useState<Performance | null>(null);
  const [performanceModalData, setPerformanceModalData] = useState<any>(null);
  const [deletingPerformance, setDeletingPerformance] = useState<Performance | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportScope, setExportScope] = useState<"global" | "day">("global");
  const [exportDayId, setExportDayId] = useState<string>("");
  const [exportingTimeline, setExportingTimeline] = useState(false);
  const exportContainerRef = useRef<HTMLDivElement>(null);

  // Données démo
  const demoDays: EventDay[] = [
    {
      id: "demo-day-1",
      date: new Date().toISOString().split('T')[0],
      open_time: "10:00:00",
      close_time: "02:00:00",
    },
    {
      id: "demo-day-2", 
      date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      open_time: "10:00:00",
      close_time: "02:00:00",
    },
  ];

  const demoStages: EventStage[] = [
    { id: "demo-stage-1", name: "Scène principale", display_order: 1, type: "main", capacity: 5000 },
    { id: "demo-stage-2", name: "Scène secondaire", display_order: 2, type: "secondary", capacity: 2000 },
    { id: "demo-stage-3", name: "Scène acoustique", display_order: 3, type: "acoustic", capacity: 500 },
  ];

  // Charger le companyId au démarrage
  useEffect(() => {
    (async () => {
      try {
        const cid = await getCurrentCompanyId(supabase);
        console.log("🏢 Company ID récupéré:", cid);
        setCompanyId(cid);
      } catch (e) {
        console.error('❌ Erreur récupération company_id:', e);
        // Fallback vers localStorage si getCurrentCompanyId échoue
        const fallbackId = localStorage.getItem("company_id") || 
                          localStorage.getItem("auth_company_id") || 
                          null;
        console.log("🏢 Company ID fallback:", fallbackId);
        setCompanyId(fallbackId);
      }
    })();
  }, []);

  const demoPerformances: Performance[] = [
    {
      id: "demo-perf-1",
      artist_id: "demo-artist-1",
      artist_name: "Artiste Demo 1",
      stage_id: "demo-stage-1",
      stage_name: "Scène principale",
      event_day_id: "demo-day-1",
      event_day_date: demoDays[0].date,
      performance_time: "14:00",
      duration: 60,
      fee_amount: 5000,
      fee_currency: "EUR",
      commission_percentage: 15,
      booking_status: "offre_a_faire",
    },
    {
      id: "demo-perf-2",
      artist_id: "demo-artist-2", 
      artist_name: "Artiste Demo 2",
      stage_id: "demo-stage-2",
      stage_name: "Scène secondaire",
      event_day_id: "demo-day-1",
      event_day_date: demoDays[0].date,
      performance_time: "16:00",
      duration: 45,
      fee_amount: 3000,
      fee_currency: "EUR",
      commission_percentage: 10,
      booking_status: "offre_envoyee",
    },
    {
      id: "demo-perf-3",
      artist_id: "demo-artist-3",
      artist_name: "Artiste Demo 3", 
      stage_id: "demo-stage-1",
      stage_name: "Scène principale",
      event_day_id: "demo-day-2",
      event_day_date: demoDays[1].date,
      performance_time: "20:00",
      duration: 90,
      fee_amount: 8000,
      fee_currency: "EUR",
      commission_percentage: 20,
      booking_status: "idee",
    },
  ];

  // Chargement des données (mémorisé)
  const loadData = React.useCallback(async () => {
    console.log('📊 LoadData appelé - eventId:', eventId, 'demoMode:', demoMode, 'hasEvent:', hasEvent);
    
    if (demoMode) {
      console.log('🎭 Mode démo activé');
      setDays(demoDays);
      setStages(demoStages);
      setPerformances(demoPerformances);
      setInitializing(false); // Données démo prêtes
      return;
    }

    if (!hasEvent || !eventId) {
      console.log('⚠️ Pas d\'événement sélectionné');
      setInitializing(false);
      return;
    }

    setLoading(true);
    console.log('🔄 Chargement des données pour l\'événement:', eventId);
    
    try {
      const [daysData, stagesData, performancesData] = await Promise.all([
        fetchEventDays(eventId),
        fetchEventStages(eventId),
        fetchPerformances(eventId),
      ]);

      console.log('✅ Données chargées:', {
        jours: daysData.length,
        scènes: stagesData.length,
        performances: performancesData.length
      });

      setDays(daysData);
      setStages(stagesData);
      setPerformances(performancesData);
      setInitializing(false); // Données réelles prêtes
    } catch (error: any) {
      console.error("❌ Erreur chargement timeline:", error);
      toastError(error?.message || "Erreur de chargement");
      setInitializing(false); // Même en cas d'erreur, arrêter l'initialisation
    } finally {
      setLoading(false);
    }
  }, [eventId, demoMode, hasEvent, toastError]);

  // Chargement initial et rechargement sur changement d'événement
  useEffect(() => {
    console.log('🎯 UseEffect principal déclenché - eventId:', eventId);
    
    // Activer l'état de chargement initial pour bloquer l'affichage
    setInitializing(true);
    
    // Vider les données pour éviter le flash de l'ancienne timeline
    setDays([]);
    setStages([]);
    setPerformances([]);
    
    if (!hasEvent) {
      console.log('⚠️ Pas d\'événement, activation mode démo');
      setDemoMode(true);
    } else {
      console.log('✅ Événement trouvé, désactivation mode démo');
      setDemoMode(false);
    }
    
    // loadData() mettra initializing à false une fois les données prêtes
    loadData();
  }, [eventId, hasEvent, loadData]);

  useEffect(() => {
    if (days.length && !exportDayId) {
      setExportDayId(days[0].id);
    }
  }, [days, exportDayId]);

  const selectedExportDay = useMemo(() => {
    if (exportScope === "day") {
      return days.find((day) => day.id === exportDayId) ?? days[0] ?? null;
    }
    return null;
  }, [days, exportDayId, exportScope]);

  const exportDays = useMemo(() => {
    if (exportScope === "day") {
      return selectedExportDay ? [selectedExportDay] : [];
    }
    return days;
  }, [days, exportScope, selectedExportDay]);

  const exportPerformances = useMemo(() => {
    if (exportScope === "day") {
      const dayId = selectedExportDay?.id;
      if (!dayId) return [];
      return performances.filter((perf) => perf.event_day_id === dayId);
    }
    return performances;
  }, [exportScope, performances, selectedExportDay]);

  const exportSubtitle =
    exportScope === "global"
      ? "Vue globale de la timeline"
      : selectedExportDay
      ? `Jour : ${new Date(selectedExportDay.date).toLocaleDateString("fr-FR", {
          weekday: "long",
          day: "numeric",
          month: "long",
        })}`
      : "Jour non sélectionné";

  const exportCanvasWidth =
    exportScope === "global" ? EXPORT_CANVAS_WIDTH_GLOBAL : EXPORT_CANVAS_WIDTH_DAY;

  const handleOpenExportModal = () => {
    if (!days.length || !stages.length) {
      toastError("Aucune timeline à exporter.");
      return;
    }
    setExportModalOpen(true);
  };

  const handleGenerateTimelinePdf = async () => {
    if (exportScope === "day" && !selectedExportDay) {
      toastError("Sélectionnez un jour à exporter.");
      return;
    }
    if (!exportDays.length || !stages.length) {
      toastError("Données insuffisantes pour exporter.");
      return;
    }
    if (!exportContainerRef.current) {
      toastError("Préparation du rendu en cours, réessayez dans un instant.");
      return;
    }

    setExportingTimeline(true);
    try {
      // Laisser le temps au DOM invisible de se mettre à jour
      await new Promise((resolve) => setTimeout(resolve, 80));
      const canvas = await html2canvas(exportContainerRef.current, {
        scale: window.devicePixelRatio < 2 ? 2 : window.devicePixelRatio,
        backgroundColor: "#ffffff",
        useCORS: true,
      });
      const dataUrl = canvas.toDataURL("image/png");
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([A3_LANDSCAPE_WIDTH, A3_LANDSCAPE_HEIGHT]);
      const pngImage = await pdfDoc.embedPng(dataUrl);
      const availableWidth = A3_LANDSCAPE_WIDTH - PDF_MARGIN * 2;
      const availableHeight = A3_LANDSCAPE_HEIGHT - PDF_MARGIN * 2;
      const scale = Math.min(availableWidth / canvas.width, availableHeight / canvas.height);
      const drawWidth = canvas.width * scale;
      const drawHeight = canvas.height * scale;
      const offsetX = (A3_LANDSCAPE_WIDTH - drawWidth) / 2;
      const offsetY = (A3_LANDSCAPE_HEIGHT - drawHeight) / 2;

      page.drawImage(pngImage, {
        x: offsetX,
        y: offsetY,
        width: drawWidth,
        height: drawHeight,
      });
      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const normalizedEventName = (currentEvent?.name || "timeline").replace(/\s+/g, "_");
      const dayLabel =
        exportScope === "global"
          ? "vue_globale"
          : selectedExportDay
          ? `jour_${new Date(selectedExportDay.date).toLocaleDateString("fr-FR")}`
          : "jour";
      link.href = url;
      link.download = `${normalizedEventName}_${dayLabel}.pdf`.toLowerCase();
      link.click();
      URL.revokeObjectURL(url);
      toastSuccess("Timeline exportée en PDF.");
      setExportModalOpen(false);
    } catch (error) {
      console.error("❌ Erreur export PDF timeline:", error);
      toastError("Impossible de générer le PDF.");
    } finally {
      setExportingTimeline(false);
    }
  };

  // Écoute des changements d'offres
  useEffect(() => {
    const handleOfferStatusChanged = () => {
      console.log('📢 Offre changée, rechargement...');
      if (hasEvent && !demoMode) {
        loadData();
      }
    };

    window.addEventListener('offer-status-changed', handleOfferStatusChanged);
    return () => window.removeEventListener('offer-status-changed', handleOfferStatusChanged);
  }, [hasEvent, demoMode, loadData]);

  // Écoute des changements d'événement (custom event)
  useEffect(() => {
    const handleEventChanged = () => {
      console.log("🔄 Event-changed event détecté, rechargement timeline...");
      if (eventId) {
        setDemoMode(false);
        loadData();
      }
    };

    window.addEventListener('event-changed', handleEventChanged);
    return () => window.removeEventListener('event-changed', handleEventChanged);
  }, [eventId, loadData]);

  // Handlers
  const handleCellCreate = (data: { event_day_id: string; stage_id: string; default_time: string; default_duration: number }) => {
    console.log("🎭 Création performance");
    console.log("   - companyId:", companyId);
    console.log("   - eventId:", eventId);
    
    if (!companyId) {
      toastError("Company ID manquant. Impossible d'ouvrir le modal.");
      return;
    }
    
    if (!eventId) {
      toastError("Aucun événement sélectionné. Impossible d'ouvrir le modal.");
      return;
    }
    
    const day = days.find(d => d.id === data.event_day_id);
    const stage = stages.find(s => s.id === data.stage_id);
    
    setPerformanceModalData({
      event_day_id: data.event_day_id,
      event_stage_id: data.stage_id,
      performance_time: data.default_time,
      duration: data.default_duration,
      dayName: day ? new Date(day.date).toLocaleDateString('fr-FR') : '',
      stageName: stage?.name || '',
    });
    setShowPerformanceModal(true);
  };

  const handleCardEdit = (performance: Performance) => {
    console.log("✏️ Édition performance");
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
    
    setSelectedPerformance(performance);
    // Mapper les champs de Performance vers les champs attendus par le modal
    setPerformanceModalData({
      artist_id: performance.artist_id,
      event_day_id: performance.event_day_id,
      event_stage_id: performance.stage_id, // stage_id -> event_stage_id
      performance_time: performance.performance_time,
      duration: performance.duration,
      fee_amount: performance.fee_amount,
      fee_currency: performance.fee_currency,
      commission_percentage: performance.commission_percentage,
      booking_status: performance.booking_status,
      notes: performance.notes,
      card_color: performance.card_color || null,
      dayName: new Date(performance.event_day_date).toLocaleDateString('fr-FR'),
    });
    setShowPerformanceModal(true);
  };

  const handleCardDelete = (performance: Performance) => {
    setDeletingPerformance(performance);
  };

  const handleConfirmDeletePerformance = async () => {
    if (!deletingPerformance) return;

    setDeleting(true);
    try {
      if (demoMode) {
        setPerformances(prev => prev.filter(p => p.id !== deletingPerformance.id));
        toastSuccess("Performance supprimée (démo)");
      } else {
        await deletePerformance(deletingPerformance.id);
        await loadData();
        toastSuccess("Performance supprimée");
      }
      setDeletingPerformance(null);
    } catch (error: any) {
      console.error("Erreur suppression:", error);
      toastError(error?.message || "Erreur de suppression");
    } finally {
      setDeleting(false);
    }
  };

  const handleCardDrop = async (data: { id: string; event_day_id: string; event_stage_id: string; performance_time: string }) => {
    // Sauvegarde de l'ancienne valeur pour rollback en cas d'erreur
    const oldPerformances = [...performances];
    
    try {
      // Mise à jour optimiste immédiate pour la fluidité
      setPerformances(prev => prev.map(p => 
        p.id === data.id 
          ? { 
              ...p, 
              event_day_id: data.event_day_id, 
              stage_id: data.event_stage_id, 
              // Assurer le format HH:MM:SS pour la cohérence
              performance_time: data.performance_time.length === 5 ? `${data.performance_time}:00` : data.performance_time
            }
          : p
      ));
      
      if (demoMode) {
        toastSuccess("Performance déplacée");
      } else {
        // Appel API en arrière-plan SANS recharger toute la page
        updatePerformance(data).then(() => {
          // Succès silencieux - pas de rechargement
          console.log("✅ Performance mise à jour en base");
        }).catch((error) => {
          console.error("Erreur mise à jour:", error);
          // Rollback uniquement en cas d'erreur
          setPerformances(oldPerformances);
          toastError(error?.message || "Erreur de déplacement");
        });
        
        // Toast immédiat sans attendre l'API
        toastSuccess("Performance déplacée");
      }
    } catch (error: any) {
      console.error("Erreur déplacement:", error);
      // Rollback en cas d'erreur
      setPerformances(oldPerformances);
      toastError(error?.message || "Erreur de déplacement");
    }
  };

  const handleOpenTimePicker = (performance: Performance) => {
    setSelectedPerformance(performance);
    setShowTimePicker(true);
  };

  const handleTimePickerConfirm = async (data: { performance_time: string; duration: number }) => {
    if (!selectedPerformance) return;

    const oldPerformances = [...performances];
    
    try {
      // Mise à jour optimiste immédiate
      setPerformances(prev => prev.map(p => 
        p.id === selectedPerformance.id 
          ? { ...p, performance_time: data.performance_time, duration: data.duration }
          : p
      ));
      
      setShowTimePicker(false);
      setSelectedPerformance(null);
      
      if (demoMode) {
        toastSuccess("Horaire modifié");
      } else {
        // API en arrière-plan SANS recharger
        updatePerformance({
          id: selectedPerformance.id,
          performance_time: data.performance_time,
          duration: data.duration,
        }).then(() => {
          console.log("✅ Horaire mis à jour en base");
          toastSuccess("Horaire modifié");
        }).catch((error) => {
          console.error("Erreur modification horaire:", error);
          setPerformances(oldPerformances);
          toastError(error?.message || "Erreur de modification");
        });
      }
    } catch (error: any) {
      console.error("Erreur modification horaire:", error);
      setPerformances(oldPerformances);
      toastError(error?.message || "Erreur de modification");
    }
  };

  const handleCreatePerformance = () => {
    setSelectedPerformance(null);
    setPerformanceModalData({
      dayName: days[0] ? new Date(days[0].date).toLocaleDateString('fr-FR') : '',
      stageName: stages[0]?.name || '',
    });
    setShowPerformanceModal(true);
  };

  // Mode sans événement
  if (!hasEvent && !demoMode) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
        {/* Contenu */}
        <div className="flex-1 flex items-center justify-center p-6">
          <EmptyState
            title="Aucun événement sélectionné"
            description="Sélectionnez un événement pour accéder à la timeline des performances."
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
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header Timeline avec bouton retour */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Bouton retour */}
            <Button
              onClick={() => {
                // Si ouvert dans un nouvel onglet, fermer l'onglet
                if (window.history.length <= 1 || document.referrer === '') {
                  window.close();
                } else {
                  // Sinon, retour en arrière
                  navigate(-1);
                }
              }}
              className="gap-2"
            >
              <ArrowLeft size={16} />
              Retour Booking
            </Button>
            
            {/* Titre */}
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Timeline Booking
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {currentEvent ? (
                  <>
                    <span className="font-medium" style={{ color: currentEvent.color_hex }}>
                      {currentEvent.name}
                    </span>
                    {" • "}
                  </>
                ) : null}
                {initializing ? "Chargement..." : `${performances.length} performances`}
              </p>
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              onClick={handleOpenExportModal}
              disabled={initializing || days.length === 0}
              className="gap-2"
            >
              <Download size={16} />
              Exporter PDF
            </Button>
            <Button 
              onClick={handleCreatePerformance} 
              disabled={initializing || (!hasEvent && !demoMode)} 
              className="gap-2"
            >
              <Plus size={16} />
              Performance
            </Button>
          </div>
        </div>
      </div>

      {/* Contenu principal - FULL WIDTH */}
      <div className="flex-1 p-6 space-y-4">
        {/* Grille timeline */}
        <Card className="p-0 overflow-x-auto">
          {initializing || (loading && days.length === 0) ? (
            <div className="p-8 text-center">
              <div className="text-gray-500 dark:text-gray-400">Chargement...</div>
            </div>
          ) : (
            <TimelineGrid
              days={days}
              stages={stages}
              performances={performances}
              onCellCreate={handleCellCreate}
              onCardEdit={handleCardEdit}
              onCardDelete={handleCardDelete}
              onCardDrop={handleCardDrop}
              onOpenTimePicker={handleOpenTimePicker}
            />
          )}
        </Card>
      </div>

      {/* Rendu caché utilisé pour la capture PDF */}
      <div
        style={{
          position: "fixed",
          top: -10000,
          left: -10000,
          pointerEvents: "none",
          opacity: 0,
          zIndex: -1,
        }}
      >
        <div
          ref={exportContainerRef}
          style={{
            width: exportCanvasWidth,
            backgroundColor: "#ffffff",
          }}
          className="p-8 space-y-4 text-gray-900"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {currentEvent?.name || "Timeline Booking"}
              </p>
              <p className="text-sm text-gray-600">{exportSubtitle}</p>
            </div>
            <div className="text-sm text-gray-500 text-right">
              <p>{new Date().toLocaleDateString("fr-FR")}</p>
              <p>{new Date().toLocaleTimeString("fr-FR")}</p>
            </div>
          </div>
          <Card className="shadow-none border border-gray-200">
            <ReadOnlyTimelineGrid
              key={`${exportScope}-${selectedExportDay?.id ?? "all"}-${exportPerformances.length}`}
              days={exportDays}
              stages={stages}
              performances={exportPerformances}
            />
          </Card>
        </div>
      </div>

      {/* Modaux */}
      {hasEvent && (
        <PerformanceModal
          open={showPerformanceModal}
          onClose={() => {
            setShowPerformanceModal(false);
            setSelectedPerformance(null);
            setPerformanceModalData(null);
          }}
          initialData={performanceModalData && companyId && eventId ? {
            eventId: eventId,
            companyId: companyId,
            performanceId: selectedPerformance?.id,
            artist_id: performanceModalData.artist_id,
            event_day_id: performanceModalData.event_day_id,
            event_stage_id: performanceModalData.event_stage_id,
            performance_time: performanceModalData.performance_time,
            duration: performanceModalData.duration,
            fee_amount: performanceModalData.fee_amount,
            fee_currency: performanceModalData.fee_currency,
            commission_percentage: performanceModalData.commission_percentage,
            booking_status: performanceModalData.booking_status,
            notes: performanceModalData.notes,
            card_color: performanceModalData.card_color,
          } : {
            eventId: eventId,
            companyId: companyId || "",
          }}
          onSuccess={() => {
            setShowPerformanceModal(false);
            setSelectedPerformance(null);
            setPerformanceModalData(null);
            loadData();
          }}
        />
      )}

      <CustomTimePicker
        open={showTimePicker}
        onClose={() => {
          setShowTimePicker(false);
          setSelectedPerformance(null);
        }}
        onConfirm={handleTimePickerConfirm}
        performance={selectedPerformance}
      />

      <ConfirmDeleteModal
        isOpen={!!deletingPerformance}
        onClose={() => setDeletingPerformance(null)}
        onConfirm={handleConfirmDeletePerformance}
        title="Supprimer la performance"
        message="Êtes-vous sûr de vouloir supprimer cette performance ?"
        itemName={deletingPerformance?.artist_name}
        loading={deleting}
      />

      <Modal
        open={exportModalOpen}
        title="Exporter la timeline"
        onClose={() => {
          if (exportingTimeline) return;
          setExportModalOpen(false);
        }}
        widthClass="max-w-xl"
      >
        <div className="space-y-6">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Choisissez le périmètre à exporter puis générez un PDF haute résolution fidèle à la grille Aura.
            </p>
            <div className="grid grid-cols-2 gap-3 mt-4">
              <Button
                variant={exportScope === "global" ? "primary" : "secondary"}
                onClick={() => setExportScope("global")}
                disabled={exportingTimeline}
                className="w-full"
              >
                Vue globale
              </Button>
              <Button
                variant={exportScope === "day" ? "primary" : "secondary"}
                onClick={() => setExportScope("day")}
                disabled={exportingTimeline || days.length === 0}
                className="w-full"
              >
                Un jour précis
              </Button>
            </div>
          </div>

          {exportScope === "day" && (
            <Select
              label="Jour à exporter"
              value={selectedExportDay?.id || exportDayId}
              onChange={(event) => setExportDayId(event.target.value)}
              options={[
                { label: "Sélectionnez un jour", value: "" },
                ...days.map((day) => ({
                  label: new Date(day.date).toLocaleDateString("fr-FR", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  }),
                  value: day.id,
                })),
              ]}
              disabled={days.length === 0 || exportingTimeline}
            />
          )}

          <div className="flex items-center justify-end gap-3">
            <Button
              variant="ghost"
              onClick={() => {
                if (!exportingTimeline) setExportModalOpen(false);
              }}
            >
              Annuler
            </Button>
            <Button
              onClick={handleGenerateTimelinePdf}
              disabled={
                exportingTimeline ||
                days.length === 0 ||
                (exportScope === "day" && !selectedExportDay)
              }
              className="gap-2"
            >
              {exportingTimeline ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Génération...
                </>
              ) : (
                <>
                  <Download size={16} />
                  Exporter en PDF
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
