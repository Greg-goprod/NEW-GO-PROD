/**
 * Page Finances - Module de facturation complet
 * Gestion des factures et paiements par événement
 */

import { useState, useEffect, useCallback } from 'react';
// useNavigate n'est plus nécessaire - les modals s'ouvrent directement
import { Wallet, RefreshCw, Plus } from 'lucide-react';
import { Badge } from '@/components/aura/Badge';
import { Button } from '@/components/aura/Button';
import { Card, CardBody } from '@/components/aura/Card';
import { PageHeader } from '@/components/aura/PageHeader';
import { useToast } from '@/components/aura/ToastProvider';
import { ConfirmDeleteModal } from '@/components/ui/ConfirmDeleteModal';
import { getCurrentCompanyId } from '@/lib/tenant';
import { supabase } from '@/lib/supabaseClient';

// Composants Finance
import {
  FinanceKpis,
  InvoicesByDay,
  InvoiceModal,
  PaymentModal,
  InvoicePdfViewer,
  PaymentListModal,
} from '@/features/finance/components';

// Modal de création/édition d'entreprise
import { CompanyFormModal } from '@/components/crm/CompanyFormModal';
import type { CRMCompanyInput } from '@/types/crm';

// API Finance
import {
  fetchInvoices,
  fetchFinanceKpis,
  fetchSelectOptions,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  createInvoiceCategory,
} from '@/features/finance/financeApi';

import {
  createPayment,
  updatePayment,
  deletePayment,
} from '@/features/finance/paymentApi';

// Types
import type {
  InvoiceWithRelations,
  InvoiceFormData,
  Payment,
  PaymentFormData,
  FinanceKpis as FinanceKpisType,
  FinanceSelectOptions,
} from '@/features/finance/financeTypes';

export default function FinancesPage() {
  const { success: toastSuccess, error: toastError } = useToast();

  // IDs contextuels
  const [companyId, setCompanyId] = useState<string | null>(null);
  const eventId = localStorage.getItem('selected_event_id') || localStorage.getItem('current_event_id') || '';

  // États des données
  const [invoices, setInvoices] = useState<InvoiceWithRelations[]>([]);
  const [kpis, setKpis] = useState<FinanceKpisType | null>(null);
  const [options, setOptions] = useState<FinanceSelectOptions | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // États des modales
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<InvoiceWithRelations | null>(null);
  const [defaultArtistId, setDefaultArtistId] = useState<string | null>(null);

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentInvoice, setPaymentInvoice] = useState<InvoiceWithRelations | null>(null);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);

  const [showPdfViewer, setShowPdfViewer] = useState(false);
  const [viewingInvoice, setViewingInvoice] = useState<InvoiceWithRelations | null>(null);

  // État pour le modal de création/édition d'entreprise (fournisseur)
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [companyPrefillData, setCompanyPrefillData] = useState<Partial<CRMCompanyInput> | null>(null);
  const [editingCompanyId, setEditingCompanyId] = useState<string | null>(null);
  const [newSupplierId, setNewSupplierId] = useState<string | null>(null);

  const [showPaymentList, setShowPaymentList] = useState(false);
  const [paymentListInvoice, setPaymentListInvoice] = useState<InvoiceWithRelations | null>(null);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingInvoice, setDeletingInvoice] = useState<InvoiceWithRelations | null>(null);

  const [showDeletePaymentConfirm, setShowDeletePaymentConfirm] = useState(false);
  const [deletingPayment, setDeletingPayment] = useState<Payment | null>(null);

  // Données pré-remplies pour créer une facture à partir d'une offre virtuelle
  const [virtualInvoiceData, setVirtualInvoiceData] = useState<{
    booking_id?: string;
    artist_id?: string;
    amount_incl?: number;
    currency?: string;
  } | null>(null);

  // Récupération du company_id
  useEffect(() => {
    (async () => {
      try {
        const cid = await getCurrentCompanyId(supabase);
        setCompanyId(cid);
      } catch (e) {
        console.error('Erreur récupération company_id:', e);
        toastError("Impossible de récupérer l'ID de l'entreprise");
      }
    })();
  }, [toastError]);

  // Chargement des données
  const loadData = useCallback(async (showRefresh = false) => {
    if (!eventId || !companyId) return;

    if (showRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const [invoicesData, kpisData, optionsData] = await Promise.all([
        fetchInvoices({ companyId, eventId }),
        fetchFinanceKpis({ companyId, eventId }),
        fetchSelectOptions({ companyId, eventId }),
      ]);

      setInvoices(invoicesData);
      setKpis(kpisData);
      setOptions(optionsData);
    } catch (e: any) {
      console.error('Erreur chargement données:', e);
      toastError(e.message || 'Erreur de chargement');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [eventId, companyId, toastError]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // === HANDLERS FACTURES ===

  const handleAddInvoice = (artistId?: string) => {
    setEditingInvoice(null);
    setDefaultArtistId(artistId || null);
    setShowInvoiceModal(true);
  };

  const handleEditInvoice = (invoice: InvoiceWithRelations) => {
    setEditingInvoice(invoice);
    setDefaultArtistId(null);
    setShowInvoiceModal(true);
  };

  // Créer une vraie facture à partir d'une ligne virtuelle (offre acceptée)
  const handleCreateFromVirtual = (virtualInvoice: InvoiceWithRelations) => {
    // Pré-remplir le formulaire avec les données de l'offre
    setEditingInvoice(null);
    setDefaultArtistId(virtualInvoice.artist_id || null);
    // On stocke les données de l'offre pour les passer à la modal
    setVirtualInvoiceData({
      booking_id: virtualInvoice.booking_id || undefined,
      artist_id: virtualInvoice.artist_id || undefined,
      amount_incl: virtualInvoice.amount_incl,
      currency: virtualInvoice.currency,
    });
    setShowInvoiceModal(true);
  };

  const handleDeleteInvoice = (invoice: InvoiceWithRelations) => {
    setDeletingInvoice(invoice);
    setShowDeleteConfirm(true);
  };

  const handleViewPdf = (invoice: InvoiceWithRelations) => {
    setViewingInvoice(invoice);
    setShowPdfViewer(true);
  };

  const handleSubmitInvoice = async (data: InvoiceFormData, file?: File | null) => {
    if (!companyId || !eventId) return;

    try {
      if (editingInvoice) {
        await updateInvoice({
          invoiceId: editingInvoice.id,
          companyId,
          eventId,
          data,
        });
        toastSuccess('Facture mise à jour');
      } else {
        await createInvoice({
          companyId,
          eventId,
          data,
          file,
        });
        toastSuccess('Facture créée');
      }
      await loadData(true);
    } catch (e: any) {
      toastError(e.message || 'Erreur lors de la sauvegarde');
      throw e;
    }
  };

  const handleConfirmDeleteInvoice = async () => {
    if (!deletingInvoice || !companyId || !eventId) return;

    try {
      await deleteInvoice({
        invoiceId: deletingInvoice.id,
        companyId,
        eventId,
      });
      toastSuccess('Facture supprimée');
      setShowDeleteConfirm(false);
      setDeletingInvoice(null);
      await loadData(true);
    } catch (e: any) {
      toastError(e.message || 'Erreur lors de la suppression');
    }
  };

  // === HANDLERS FOURNISSEURS ===

  const handleCreateSupplier = useCallback((formData: any, rawData: any) => {
    console.log('[finances] handleCreateSupplier - Ouverture modal avec donnees:', formData);
    // Ouvrir le modal de création d'entreprise par-dessus le modal facture
    setCompanyPrefillData(formData);
    setEditingCompanyId(null);
    setShowCompanyModal(true);
  }, []);

  const handleUpdateSupplier = useCallback((supplierId: string, formData: any, rawData: any) => {
    console.log('[finances] handleUpdateSupplier - Ouverture modal pour ID:', supplierId);
    // Ouvrir le modal de modification d'entreprise par-dessus le modal facture
    setCompanyPrefillData(formData);
    setEditingCompanyId(supplierId);
    setShowCompanyModal(true);
  }, []);

  // Callback appelé après création/mise à jour réussie d'une entreprise
  const handleCompanySuccess = useCallback(async (newCompanyId: string, companyName: string) => {
    console.log('[finances] handleCompanySuccess - Entreprise créée/mise à jour:', newCompanyId, companyName);
    // Recharger les options (fournisseurs) pour mettre à jour la liste dans le modal facture
    if (companyId && eventId) {
      try {
        const newOptions = await fetchSelectOptions(companyId, eventId);
        setOptions(newOptions);
        // Selectionner automatiquement le nouveau fournisseur dans le modal facture
        setNewSupplierId(newCompanyId);
      } catch (e) {
        console.error('[finances] Erreur rechargement options:', e);
      }
    }
  }, [companyId, eventId]);

  // === HANDLERS PAIEMENTS ===

  const handleAddPayment = (invoice: InvoiceWithRelations) => {
    setPaymentInvoice(invoice);
    setEditingPayment(null);
    setShowPaymentModal(true);
  };

  const handleViewPayments = (invoice: InvoiceWithRelations) => {
    setPaymentListInvoice(invoice);
    setShowPaymentList(true);
  };

  const handleEditPayment = (payment: Payment) => {
    // Trouver la facture associée
    const invoice = invoices.find((inv) => inv.id === payment.invoice_id);
    if (invoice) {
      setPaymentInvoice(invoice);
      setEditingPayment(payment);
      setShowPaymentList(false);
      setShowPaymentModal(true);
    }
  };

  const handleDeletePayment = (payment: Payment) => {
    setDeletingPayment(payment);
    setShowDeletePaymentConfirm(true);
  };

  const handleSubmitPayment = async (data: PaymentFormData) => {
    if (!paymentInvoice || !companyId || !eventId) return;

    try {
      if (editingPayment) {
        await updatePayment({
          paymentId: editingPayment.id,
          invoiceId: paymentInvoice.id,
          companyId,
          eventId,
          data,
        });
        toastSuccess('Paiement mis à jour');
      } else {
        await createPayment({
          invoiceId: paymentInvoice.id,
          companyId,
          eventId,
          data,
        });
        toastSuccess('Paiement enregistré');
      }
      await loadData(true);
    } catch (e: any) {
      toastError(e.message || 'Erreur lors de la sauvegarde');
      throw e;
    }
  };

  const handleConfirmDeletePayment = async () => {
    if (!deletingPayment || !companyId || !eventId) return;

    try {
      await deletePayment({
        paymentId: deletingPayment.id,
        invoiceId: deletingPayment.invoice_id,
        companyId,
        eventId,
      });
      toastSuccess('Paiement supprimé');
      setShowDeletePaymentConfirm(false);
      setDeletingPayment(null);
      await loadData(true);
    } catch (e: any) {
      toastError(e.message || 'Erreur lors de la suppression');
    }
  };

  // === RENDU ===

  // Pas d'événement sélectionné
  if (!eventId) {
    return (
      <div className="p-6">
        <PageHeader icon={Wallet} title="FINANCES" />
        <Card>
          <CardBody>
            <p className="text-gray-400">
              Veuillez sélectionner un événement pour accéder aux données financières.
            </p>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        icon={Wallet}
        title="FINANCES"
        actions={
          <div className="flex items-center gap-2">
            <Badge color="violet">{invoices.length} factures</Badge>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => loadData(true)}
              disabled={refreshing}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Actualiser
            </Button>
            <Button onClick={() => handleAddInvoice()}>
              <Plus className="w-4 h-4 mr-2" />
              Nouvelle facture
            </Button>
          </div>
        }
      />

      {/* KPIs */}
      <FinanceKpis kpis={kpis} loading={loading} />

      {/* Factures par jour */}
      <InvoicesByDay
        invoices={invoices}
        options={options}
        eventId={eventId}
        loading={loading}
        onAddInvoice={handleAddInvoice}
        onEditInvoice={handleEditInvoice}
        onDeleteInvoice={handleDeleteInvoice}
        onViewPdf={handleViewPdf}
        onAddPayment={handleAddPayment}
        onViewPayments={handleViewPayments}
        onCreateFromVirtual={handleCreateFromVirtual}
      />

      {/* Modal création/édition facture */}
      <InvoiceModal
        open={showInvoiceModal}
        onClose={() => {
          setShowInvoiceModal(false);
          setEditingInvoice(null);
          setDefaultArtistId(null);
          setVirtualInvoiceData(null);
          setNewSupplierId(null);
        }}
        onSubmit={handleSubmitInvoice}
        invoice={editingInvoice}
        options={options}
        defaultArtistId={defaultArtistId}
        prefillData={virtualInvoiceData}
        onCreateSupplier={handleCreateSupplier}
        onUpdateSupplier={handleUpdateSupplier}
        newSupplierId={newSupplierId}
      />

      {/* Modal création/édition paiement */}
      <PaymentModal
        open={showPaymentModal}
        onClose={() => {
          setShowPaymentModal(false);
          setPaymentInvoice(null);
          setEditingPayment(null);
        }}
        onSubmit={handleSubmitPayment}
        payment={editingPayment}
        invoice={paymentInvoice}
      />

      {/* Visualiseur PDF */}
      <InvoicePdfViewer
        open={showPdfViewer}
        onClose={() => {
          setShowPdfViewer(false);
          setViewingInvoice(null);
        }}
        invoice={viewingInvoice}
      />

      {/* Liste des paiements */}
      <PaymentListModal
        open={showPaymentList}
        onClose={() => {
          setShowPaymentList(false);
          setPaymentListInvoice(null);
        }}
        invoice={paymentListInvoice}
        onEditPayment={handleEditPayment}
        onDeletePayment={handleDeletePayment}
      />

      {/* Confirmation suppression facture */}
      <ConfirmDeleteModal
        open={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setDeletingInvoice(null);
        }}
        onConfirm={handleConfirmDeleteInvoice}
        title="Supprimer la facture"
        message={`Êtes-vous sûr de vouloir supprimer la facture "${deletingInvoice?.reference}" ? Cette action est irréversible et supprimera également tous les paiements associés.`}
      />

      {/* Confirmation suppression paiement */}
      <ConfirmDeleteModal
        open={showDeletePaymentConfirm}
        onClose={() => {
          setShowDeletePaymentConfirm(false);
          setDeletingPayment(null);
        }}
        onConfirm={handleConfirmDeletePayment}
        title="Supprimer le paiement"
        message="Êtes-vous sûr de vouloir supprimer ce paiement ? Cette action est irréversible."
      />

      {/* Modal création/édition d'entreprise (fournisseur) - Par-dessus le modal facture */}
      {companyId && (
        <CompanyFormModal
          open={showCompanyModal}
          onClose={() => {
            setShowCompanyModal(false);
            setCompanyPrefillData(null);
            setEditingCompanyId(null);
          }}
          onSuccess={handleCompanySuccess}
          prefillData={companyPrefillData}
          editingCompanyId={editingCompanyId}
          companyId={companyId}
          zIndex={600}
        />
      )}
    </div>
  );
}
