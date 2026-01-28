import { useEffect, useMemo, useState, useCallback } from "react";
import { Card, CardHeader, CardBody } from "@/components/aura/Card";
import { Button } from "@/components/aura/Button";
import { Badge } from "@/components/aura/Badge";
import { Modal } from "@/components/aura/Modal";
import { PageHeader } from "@/components/aura/PageHeader";
import { useToast } from "@/components/aura/ToastProvider";
import { ConfirmDeleteModal } from "@/components/ui/ConfirmDeleteModal";

import { KanbanBoard } from "@/features/booking/KanbanBoard";
import { OffersListView } from "@/features/booking/OffersListView";
import { OfferComposer } from "@/features/booking/modals/OfferComposer";
import { SendOfferModal } from "@/features/booking/modals/SendOfferModal";
import { RejectOfferModal } from "@/features/booking/modals/RejectOfferModal";
import { PerformanceModal } from "@/features/booking/modals/PerformanceModal";

import type { Offer, OfferFilters, OfferSort, OfferStatus } from "@/features/booking/bookingTypes";
import {
  listOffers, moveOffer, getTodoPerformances, getRejectedPerformances,
  prepareOfferPdfPath, createSignedOfferPdfUrl, deleteOffer, generateOfferPdfOnStatusChange
} from "@/features/booking/bookingApi";
import { sendOfferEmail } from "@/services/emailService";
import { getCurrentCompanyId } from "@/lib/tenant";
import { supabase } from "@/lib/supabaseClient";
import { fetchPerformancePrefill } from "@/features/booking/utils/performancePrefill";

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
const demoTodo: any[] = [
  { performance_id:"p1", event_day_date:"2025-08-20", performance_time:"20:30", duration:60, artist_name:"Zeta", stage_name:"Main" },
];
const demoRejected: any[] = [
  { performance_id:"p2", event_day_date:"2025-08-21", performance_time:"22:00", duration:45, artist_name:"Yankee", stage_name:"Club", rejection_reason:"Budget" },
];

export default function BookingPage() {
  // TOUS les hooks DOIVENT être appelés dans le même ordre à chaque render
  const { success: toastSuccess, error: toastError } = useToast();
  
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [demoMode, setDemoMode] = useState(false);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [todoPerfs, setTodoPerfs] = useState<any[]>([]);
  const [rejectedPerfs, setRejectedPerfs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<OfferFilters>({});
  const [sort, setSort] = useState<OfferSort>({ field: "created_at", direction: "desc" });
  const [showComposer, setShowComposer] = useState(false);
  const [prefilledOfferData, setPrefilledOfferData] = useState<any>(null);
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

  // Récupération du company_id
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
                          "00000000-0000-0000-0000-000000000000";
        console.log("🏢 Company ID fallback:", fallbackId);
        setCompanyId(fallbackId);
      }
    })();
  }, []);

  // Fonction pour charger les offres
  const loadOffers = useCallback(async () => {
    if (demoMode) {
      // Pas d'appels RPC en mode démo
      setOffers(demoOffers as any);
      setTodoPerfs(demoTodo as any);
      setRejectedPerfs(demoRejected as any);
      return;
    }
    if (!hasEvent) return;

    try {
      setRenderError(null);
      setLoading(true);
      const [o, t, r] = await Promise.all([
        listOffers({ eventId, filters, sort, limit: 300, offset: 0 }),
        getTodoPerformances(eventId),
        getRejectedPerformances(eventId),
      ]);
      setOffers(o || []);
      setTodoPerfs(t || []);
      setRejectedPerfs(r || []);
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

  const offreAFaireItems = useMemo(() => {
    return (todoPerfs || []).map((perf: any) => ({
      id: `perf_${perf.performance_id}`,
      type: "performance",
      artist_name: perf.artist_name,
      stage_name: perf.stage_name,
      date_time: perf.event_day_date,
      performance_time: perf.performance_time,
      duration: perf.duration,
      status: "offre_a_faire",
      ready_to_send: false,
    }));
  }, [todoPerfs]);

  const rejectedPerfItems = useMemo(() => {
    return (rejectedPerfs || []).map((perf: any) => ({
      id: `perf_${perf.performance_id}`,
      type: "performance",
      artist_name: perf.artist_name,
      stage_name: perf.stage_name,
      date_time: perf.event_day_date,
      performance_time: perf.performance_time,
      duration: perf.duration,
      rejection_reason: perf.rejection_reason,
      status: "offre_rejetee",
      ready_to_send: false,
    }));
  }, [rejectedPerfs]);

  const kanbanColumns = useMemo(() => {
    const draftOffers = offers.filter((o) => o.status === "draft");
    const ready = offers.filter((o) => o.status === "ready_to_send");
    const sent = offers.filter((o) => o.status === "sent");
    const accepted = offers.filter((o) => o.status === "accepted");
    const rejected = [
      ...offers.filter((o) => o.status === "rejected"),
      ...(rejectedPerfItems as any[]),
    ];
    return [
      { id: "draft_and_todo", title: "Brouillon / À faire", offers: [...(offreAFaireItems as any[]), ...draftOffers] },
      { id: "ready_to_send", title: "Prêt à envoyer", offers: ready },
      { id: "sent", title: "Envoyé", offers: sent },
      { id: "accepted", title: "Accepté", offers: accepted },
      { id: "rejected", title: "Rejeté", offers: rejected },
    ] as any;
  }, [offers, offreAFaireItems, rejectedPerfItems]);

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

  async function handleQuickAction(action: "create_offer", item: any) {
    if (action !== "create_offer") return;
    try {
      const performanceId =
        item.performance_id ||
        (typeof item.id === "string" && item.id.startsWith("perf_") ? item.id.replace("perf_", "") : null);

      if (performanceId) {
        const prefill = await fetchPerformancePrefill(performanceId);
        if (prefill) {
          setPrefilledOfferData(prefill);
          setShowComposer(true);
          return;
        }
      }

      // Fallback minimal si pas de performance associée
      setPrefilledOfferData({
        artist_name: item.artist_name,
        stage_name: item.stage_name,
        performance_time: item.performance_time,
        duration: item.duration,
        fee_amount: item.fee_amount,
        fee_currency: item.fee_currency,
      });
      setShowComposer(true);
    } catch (error: any) {
      console.error("[ERROR] Prefill offre (BookingPage):", error);
      toastError(error?.message || "Impossible de récupérer la performance");
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

  function handleDelete(offerId: string) {
    const offer = offers.find(o => o.id === offerId);
    if (offer) {
      setDeletingOffer(offer);
    }
  }

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

  async function handleSendOfferEmail(data: {
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

      // 3. Envoyer email
      const subject = `Offre artiste - ${selectedOffer.artist_name || 'Artiste'} - ${selectedOffer.event_name || 'Événement'}`;
      const htmlContent = `
        <h2>Offre artiste</h2>
        <p>Bonjour ${data.recipientFirstName || ''},</p>
        <p>Veuillez trouver ci-joint l'offre pour ${selectedOffer.artist_name || 'l\'artiste'}.</p>
        ${data.customMessage ? `<p>${data.customMessage}</p>` : ''}
        <p>Valable jusqu'au: ${data.validityDate || 'Non précisé'}</p>
        <p><a href="${pdfUrl}" target="_blank">Télécharger l'offre PDF</a></p>
        <p>Cordialement,<br>${data.sender.name}</p>
      `;

      await sendOfferEmail({
        toEmail: data.email,
        toName: data.recipientFirstName,
        ccEmails: data.ccEmails,
        sender: data.sender,
        subject,
        htmlContent,
        pdfUrl,
        pdfFileName: `Offre_${selectedOffer.artist_name || 'Artiste'}.pdf`,
        artistName: selectedOffer.artist_name,
        eventName: selectedOffer.event_name,
        validityDate: data.validityDate,
        customMessage: data.customMessage,
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
      await moveOffer(selectedOffer.id, "rejected", reason);
      setOffers(prev => prev.map(o => o.id === selectedOffer.id ? { ...o, status: "rejected", rejection_reason: reason } : o));
      toastSuccess("Offre rejetée");
      setShowRejectModal(false);
      setSelectedOffer(null);
    } catch (e: any) {
      console.error("Erreur rejet:", e);
      toastError(e?.message || "Erreur rejet offre");
    }
  }

  async function handleSavePerformance(perf: any) {
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
        title="Booking"
        subtitle={
          <span>
            {demoMode ? "Mode démo" : "Mode production"} • {offers.length} offres
          </span>
        }
        actions={
          <>
            <Button
              variant="primary"
              onClick={() => handlePerformanceModal()}
            >
              ➕ Ajouter une performance
            </Button>
            <Button
              onClick={() => window.open('/app/lineup/timeline', '_blank')}
            >
              📅 Timeline
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
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-900 dark:text-gray-100">Kanban Booking</span>
                <Badge color="blue">{offers.length} offres</Badge>
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Dataset • offers:{offers.length} • todo:{(todoPerfs||[]).length} • rejPerf:{(rejectedPerfs||[]).length}
              </div>
            </CardHeader>
            <CardBody>
              {loading ? (
                <div className="text-gray-600 dark:text-gray-300">Chargement…</div>
              ) : (
                <KanbanBoard
                  columns={kanbanColumns}
                  onMove={handleMove}
                  onQuickAction={handleQuickAction}
                  onSendOffer={handleSendOffer}
                  onModifyOffer={() => setShowComposer(true)}
                  onValidateOffer={(o) => handleMove(o.id, "accepted")}
                  onRejectOffer={(o) => handleRejectOfferModal(o)}
                  onDeleteOffer={handleDelete}
                />
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <div className="font-semibold text-gray-900 dark:text-gray-100">Vue Liste des Offres</div>
            </CardHeader>
            <CardBody>
              {loading ? (
                <div className="text-gray-600 dark:text-gray-300">Chargement…</div>
              ) : (
                <OffersListView
                  offers={[...offers, ...(offreAFaireItems as any[]), ...(rejectedPerfItems as any[])]}
                  onViewPdf={handleViewPdf}
                  onSendOffer={handleSendOffer}
                  onModify={(offer) => {
                    // Versioning UNIQUEMENT si l'offre a déjà été envoyée (sent, accepted, rejected)
                    const offerStatus = offer.status || (offer as any).booking_status;
                    const needsVersioning = offerStatus === "sent" || offerStatus === "accepted" || offerStatus === "rejected";
                    
                    if (needsVersioning) {
                      // Mode versioning: crée une nouvelle version
                      setPrefilledOfferData({
                        isModification: true,
                        originalOfferId: (offer as any).original_offer_id || offer.id,
                        originalVersion: (offer as any).version || 1,
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
                      });
                    } else {
                      // Mode édition directe: modifie l'offre existante
                      setPrefilledOfferData({
                        isModification: false,
                        editingOfferId: offer.id,
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
                      });
                    }
                    setShowComposer(true);
                  }}
                  onMove={handleMove}
                  onDelete={(o) => handleDelete(o.id)}
                  onValidateOffer={(o) => handleMove(o.id, "accepted")}
                  onRejectOffer={(o) => handleRejectOfferModal(o)}
                />
              )}
            </CardBody>
          </Card>
        </>
      )}

      <OfferComposer
        isOpen={showComposer}
        onClose={() => { setShowComposer(false); setPrefilledOfferData(null); }}
        prefilledData={prefilledOfferData}
        onSave={async () => { setShowComposer(false); toastSuccess("Offre enregistrée (MVP)"); }}
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
        offer={selectedOffer || {
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
        itemName={deletingOffer?.artist_name}
        loading={deleting}
      />
    </div>
  );
}