/**
 * Composant d'affichage des factures groupees par jour d'evenement
 * Design identique a la page Contrats avec EventDaysContainer
 */

import { useState, useMemo, useEffect } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  FileText,
  CreditCard,
  Eye,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  Upload,
} from 'lucide-react';
import { Button } from '@/components/aura/Button';
import { Input } from '@/components/aura/Input';
import { fetchEventDays, type EventDay } from '@/features/timeline/timelineApi';
import type {
  InvoiceWithRelations,
  InvoiceStatus,
  FinanceSelectOptions,
} from '../financeTypes';
import { INVOICE_STATUS_LABELS } from '../financeTypes';
import { formatCurrencySafe } from '../currencyUtils';

interface InvoicesByDayProps {
  invoices: InvoiceWithRelations[];
  options: FinanceSelectOptions | null;
  eventId: string;
  loading?: boolean;
  onAddInvoice: (artistId?: string) => void;
  onEditInvoice: (invoice: InvoiceWithRelations) => void;
  onDeleteInvoice: (invoice: InvoiceWithRelations) => void;
  onViewPdf: (invoice: InvoiceWithRelations) => void;
  onAddPayment: (invoice: InvoiceWithRelations) => void;
  onViewPayments: (invoice: InvoiceWithRelations) => void;
  onCreateFromVirtual?: (invoice: InvoiceWithRelations) => void;
}

/**
 * Formater la date pour l'affichage du header
 */
function formatDisplayDateLong(value: string) {
  if (!value) return '—';
  const date = new Date(`${value}T00:00:00`);
  return date.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  });
}

/**
 * Badge de statut stylise comme la page Contrats
 */
function StatusBadgeInline({ status, virtual }: { status: InvoiceStatus; virtual?: boolean }) {
  const label = INVOICE_STATUS_LABELS[status] || status;
  
  // Couleurs selon le statut
  const getColors = () => {
    if (virtual || status === 'to_receive') {
      return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
    }
    if (status === 'paid') {
      return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
    }
    if (status === 'partial') {
      return 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400';
    }
    if (status === 'to_pay') {
      return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
    }
    if (status === 'canceled') {
      return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400';
    }
    return 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400';
  };

  return (
    <span className={`inline-block px-3 py-1.5 text-sm font-medium rounded-lg w-full text-center ${getColors()}`}>
      {label}
    </span>
  );
}

/**
 * Ligne de facture dans le style Contrats
 */
function InvoiceRowStyled({
  invoice,
  onEdit,
  onDelete,
  onViewPdf,
  onAddPayment,
  onViewPayments,
  onCreateFromVirtual,
}: {
  invoice: InvoiceWithRelations;
  onEdit: () => void;
  onDelete: () => void;
  onViewPdf: () => void;
  onAddPayment: () => void;
  onViewPayments: () => void;
  onCreateFromVirtual: () => void;
}) {
  const isVirtual = invoice.virtual;
  const hasPdf = invoice.has_invoice_file;
  const hasPayments = (invoice.payments_sum || 0) > 0;
  const isPaid = invoice.status === 'paid';

  return (
    <div className="px-5 py-3 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
      {/* Colonne Statut - largeur fixe */}
      <div className="w-28 flex-shrink-0">
        <StatusBadgeInline status={invoice.status} virtual={isVirtual} />
      </div>

      {/* Colonne Action facture - entre statut et artiste */}
      <div className="w-32 flex-shrink-0">
        {isVirtual ? (
          <button
            onClick={onCreateFromVirtual}
            className="w-full px-3 py-1.5 text-sm font-medium rounded-lg flex items-center justify-center gap-1 transition-colors bg-violet-100 text-violet-700 hover:bg-violet-200 dark:bg-violet-900/30 dark:text-violet-400 dark:hover:bg-violet-900/50"
          >
            + Facture
          </button>
        ) : null}
      </div>

      {/* Nom de l'artiste */}
      <div className="w-32 flex-shrink-0">
        <p className="font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>
          {invoice.artist_name || '-'}
        </p>
        {invoice.supplier_name && (
          <p className="text-xs truncate" style={{ color: 'var(--color-text-secondary)' }}>
            {invoice.supplier_name}
          </p>
        )}
      </div>

      {/* Reference */}
      <div className="w-32 flex-shrink-0">
        <p className="text-sm truncate" style={{ color: 'var(--color-text-secondary)' }}>
          {invoice.reference || '-'}
        </p>
      </div>

      {/* Montant */}
      <div className="w-32 flex-shrink-0 text-right">
        <p className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          {formatCurrencySafe(invoice.amount_incl, invoice.currency)}
        </p>
        {invoice.status === 'partial' && invoice.outstanding_amount !== undefined && (
          <p className="text-xs text-orange-600 dark:text-orange-400">
            Reste: {formatCurrencySafe(invoice.outstanding_amount, invoice.currency)}
          </p>
        )}
      </div>

      {/* Echeance */}
      <div className="flex-1">
        {invoice.due_date && invoice.due_date.length > 0 ? (
          <span 
            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md"
            style={{
              background: 'var(--color-bg-surface)',
              color: 'var(--color-text-secondary)',
            }}
          >
            Ech. {new Date(invoice.due_date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
          </span>
        ) : null}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {!isVirtual && (
          <>
            {/* Ajouter paiement */}
            {!isPaid && (
              <button
                onClick={onAddPayment}
                className="min-w-[140px] px-3 py-1.5 text-sm font-medium rounded-lg flex items-center justify-center gap-2 transition-colors bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50"
              >
                <CreditCard className="w-4 h-4" />
                Paiement
              </button>
            )}

            {/* Voir paiements */}
            {hasPayments && (
              <button
                onClick={onViewPayments}
                className="p-1.5 rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
                style={{ color: 'var(--color-text-secondary)' }}
                title="Voir les paiements"
              >
                <Eye className="w-4 h-4" />
              </button>
            )}

            {/* Voir PDF */}
            {hasPdf && (
              <button
                onClick={onViewPdf}
                className="p-1.5 rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
                style={{ color: 'var(--color-text-secondary)' }}
                title="Voir la facture"
              >
                <FileText className="w-4 h-4" />
              </button>
            )}

            {/* Editer */}
            <button
              onClick={onEdit}
              className="p-1.5 rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
              style={{ color: 'var(--color-text-secondary)' }}
              title="Modifier"
            >
              <Edit2 className="w-4 h-4" />
            </button>

            {/* Supprimer */}
            <button
              onClick={onDelete}
              className="p-1.5 rounded-lg transition-colors hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500"
              title="Supprimer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/**
 * En-tetes de colonnes
 */
function ColumnHeaders() {
  return (
    <div 
      className="px-5 py-2 flex items-center gap-4 text-xs font-medium uppercase tracking-wide border-b"
      style={{ 
        color: 'var(--color-text-tertiary)',
        borderColor: 'var(--color-border)',
        background: 'var(--color-bg-surface)',
      }}
    >
      <div className="w-28 flex-shrink-0">Statut</div>
      <div className="w-32 flex-shrink-0"></div>
      <div className="w-32 flex-shrink-0">Artiste</div>
      <div className="w-32 flex-shrink-0">Reference</div>
      <div className="w-32 flex-shrink-0 text-right">Montant</div>
      <div className="flex-1">Echeance</div>
      <div className="w-[200px]">Actions</div>
    </div>
  );
}

/**
 * Composant principal - Factures groupees par jour
 */
export function InvoicesByDay({
  invoices,
  options,
  eventId,
  loading = false,
  onAddInvoice,
  onEditInvoice,
  onDeleteInvoice,
  onViewPdf,
  onAddPayment,
  onViewPayments,
  onCreateFromVirtual,
}: InvoicesByDayProps) {
  const [days, setDays] = useState<EventDay[]>([]);
  const [daysLoading, setDaysLoading] = useState(true);

  // Etats des filtres
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'all'>('all');
  const [showFilters, setShowFilters] = useState(false);

  // Charger les jours de l'evenement
  useEffect(() => {
    if (!eventId) {
      setDays([]);
      setDaysLoading(false);
      return;
    }

    setDaysLoading(true);
    fetchEventDays(eventId)
      .then((data) => setDays(data || []))
      .catch((err) => {
        console.error('Erreur chargement jours:', err);
        setDays([]);
      })
      .finally(() => setDaysLoading(false));
  }, [eventId]);

  // Filtrer les factures
  const filteredInvoices = useMemo(() => {
    let result = [...invoices];

    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter(
        (inv) =>
          inv.reference?.toLowerCase().includes(searchLower) ||
          inv.supplier_name?.toLowerCase().includes(searchLower) ||
          inv.artist_name?.toLowerCase().includes(searchLower)
      );
    }

    if (statusFilter !== 'all') {
      result = result.filter((inv) => inv.status === statusFilter);
    }

    return result;
  }, [invoices, search, statusFilter]);

  // Grouper les factures par date (offer_date)
  const getInvoicesForDay = (dayDate: string) => {
    return filteredInvoices.filter((invoice) => {
      // Utiliser offer_date pour le groupement
      return invoice.offer_date === dayDate;
    });
  };

  // Factures sans jour specifique (pas de offer_date)
  const invoicesWithoutDay = useMemo(() => {
    return filteredInvoices.filter((invoice) => !invoice.offer_date);
  }, [filteredInvoices]);

  if (loading || daysLoading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse space-y-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
              <div className="h-12" style={{ background: 'var(--color-bg-surface)' }} />
              <div className="p-4 space-y-3">
                <div className="h-10" style={{ background: 'var(--color-bg-surface)' }} />
                <div className="h-10" style={{ background: 'var(--color-bg-surface)' }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Barre d'outils */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--color-text-tertiary)' }} />
          <Input
            type="text"
            placeholder="Rechercher une facture..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="w-4 h-4 mr-2" />
            Filtres
            {showFilters ? <ChevronUp className="w-4 h-4 ml-2" /> : <ChevronDown className="w-4 h-4 ml-2" />}
          </Button>
          <Button onClick={() => onAddInvoice()}>
            <Plus className="w-4 h-4 mr-2" />
            Nouvelle facture
          </Button>
        </div>
      </div>

      {/* Filtres depliables */}
      {showFilters && (
        <div 
          className="rounded-xl p-4"
          style={{ 
            background: 'var(--color-bg-surface)',
            border: '1px solid var(--color-border)',
          }}
        >
          <div className="flex flex-wrap gap-4 items-end">
            <div className="min-w-[200px]">
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                Statut
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as InvoiceStatus | 'all')}
                className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                style={{
                  background: 'var(--color-bg-input, var(--color-bg-elevated))',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text-primary)',
                }}
              >
                <option value="all">Tous les statuts</option>
                <option value="to_receive">A recevoir</option>
                <option value="to_pay">A payer</option>
                <option value="partial">Partiel</option>
                <option value="paid">Payee</option>
                <option value="canceled">Annulee</option>
              </select>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearch('');
                setStatusFilter('all');
              }}
            >
              Reinitialiser
            </Button>
          </div>
        </div>
      )}

      {/* Titre de section */}
      <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
        Factures par jour
      </h2>

      {/* Factures groupees par jour - meme style que Contrats */}
      {days.length > 0 ? (
        <div className="space-y-6">
          {days.map((day) => {
            // Recuperer les factures pour ce jour via offer_date
            const dayInvoices = getInvoicesForDay(day.date);

            return (
              <div
                key={day.id}
                className="rounded-2xl overflow-hidden shadow-sm"
                style={{
                  background: 'var(--color-bg-elevated)',
                  border: '1px solid var(--color-border-violet, rgba(139, 92, 246, 0.2))',
                }}
              >
                {/* Header du jour */}
                <div 
                  className="px-5 py-3"
                  style={{
                    background: 'linear-gradient(to right, rgba(139, 92, 246, 0.1), rgba(139, 92, 246, 0.05))',
                    borderBottom: '1px solid var(--color-border-violet, rgba(139, 92, 246, 0.2))',
                  }}
                >
                  <h3 
                    className="text-sm font-semibold uppercase tracking-wide"
                    style={{ color: 'var(--color-primary, #8b5cf6)' }}
                  >
                    {formatDisplayDateLong(day.date)}
                  </h3>
                </div>

                {/* En-tetes de colonnes */}
                <ColumnHeaders />

                {/* Contenu du jour */}
                <div style={{ borderTop: '1px solid var(--color-border)' }}>
                  {dayInvoices.length === 0 ? (
                    <div 
                      className="px-5 py-4 text-center text-sm italic"
                      style={{ color: 'var(--color-text-tertiary)' }}
                    >
                      Aucune facture pour ce jour
                    </div>
                  ) : (
                    <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
                      {dayInvoices.map((invoice) => (
                        <InvoiceRowStyled
                          key={invoice.id}
                          invoice={invoice}
                          onEdit={() => onEditInvoice(invoice)}
                          onDelete={() => onDeleteInvoice(invoice)}
                          onViewPdf={() => onViewPdf(invoice)}
                          onAddPayment={() => onAddPayment(invoice)}
                          onViewPayments={() => onViewPayments(invoice)}
                          onCreateFromVirtual={() => onCreateFromVirtual?.(invoice)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Section pour les factures sans date assignee */}
          {invoicesWithoutDay.length > 0 && (
            <div
              className="rounded-2xl overflow-hidden shadow-sm"
              style={{
                background: 'var(--color-bg-elevated)',
                border: '1px solid var(--color-border)',
              }}
            >
              {/* Header */}
              <div 
                className="px-5 py-3"
                style={{
                  background: 'var(--color-bg-surface)',
                  borderBottom: '1px solid var(--color-border)',
                }}
              >
                <h3 
                  className="text-sm font-semibold uppercase tracking-wide"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  Factures sans date assignee
                </h3>
              </div>

              {/* En-tetes de colonnes */}
              <ColumnHeaders />

              {/* Contenu */}
              <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
                {invoicesWithoutDay.map((invoice) => (
                  <InvoiceRowStyled
                    key={invoice.id}
                    invoice={invoice}
                    onEdit={() => onEditInvoice(invoice)}
                    onDelete={() => onDeleteInvoice(invoice)}
                    onViewPdf={() => onViewPdf(invoice)}
                    onAddPayment={() => onAddPayment(invoice)}
                    onViewPayments={() => onViewPayments(invoice)}
                    onCreateFromVirtual={() => onCreateFromVirtual?.(invoice)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Affichage sans jours configures - toutes les factures dans un seul container */
        <div
          className="rounded-2xl overflow-hidden shadow-sm"
          style={{
            background: 'var(--color-bg-elevated)',
            border: '1px solid var(--color-border-violet, rgba(139, 92, 246, 0.2))',
          }}
        >
          {/* Header */}
          <div 
            className="px-5 py-3"
            style={{
              background: 'linear-gradient(to right, rgba(139, 92, 246, 0.1), rgba(139, 92, 246, 0.05))',
              borderBottom: '1px solid var(--color-border-violet, rgba(139, 92, 246, 0.2))',
            }}
          >
            <h3 
              className="text-sm font-semibold uppercase tracking-wide"
              style={{ color: 'var(--color-primary, #8b5cf6)' }}
            >
              Toutes les factures
            </h3>
          </div>

          {/* En-tetes de colonnes */}
          <ColumnHeaders />

          {/* Contenu */}
          <div>
            {filteredInvoices.length === 0 ? (
              <div 
                className="px-5 py-8 text-center text-sm"
                style={{ color: 'var(--color-text-tertiary)' }}
              >
                {invoices.length === 0
                  ? 'Aucune facture pour cet evenement'
                  : 'Aucune facture ne correspond aux filtres'}
              </div>
            ) : (
              <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
                {filteredInvoices.map((invoice) => (
                  <InvoiceRowStyled
                    key={invoice.id}
                    invoice={invoice}
                    onEdit={() => onEditInvoice(invoice)}
                    onDelete={() => onDeleteInvoice(invoice)}
                    onViewPdf={() => onViewPdf(invoice)}
                    onAddPayment={() => onAddPayment(invoice)}
                    onViewPayments={() => onViewPayments(invoice)}
                    onCreateFromVirtual={() => onCreateFromVirtual?.(invoice)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Compteur */}
      <div className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>
        {filteredInvoices.length} facture{filteredInvoices.length > 1 ? 's' : ''} affichee{filteredInvoices.length > 1 ? 's' : ''}
        {filteredInvoices.length !== invoices.length && ` sur ${invoices.length}`}
      </div>
    </div>
  );
}

export default InvoicesByDay;
