/**
 * Tableau des factures
 * Affiche la liste des factures avec filtres, tri et actions
 */

import { useState, useMemo } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  FileText,
  CreditCard,
  Eye,
  ChevronDown,
  ChevronUp,
  Search,
  Filter,
  AlertCircle,
} from 'lucide-react';
import { Table } from '@/components/aura/Table';
import { Badge } from '@/components/aura/Badge';
import { Button } from '@/components/aura/Button';
import { Input } from '@/components/aura/Input';
import { Card, CardBody } from '@/components/aura/Card';
import type {
  InvoiceWithRelations,
  InvoiceFilters,
  InvoiceSort,
  InvoiceStatus,
  CurrencyCode,
  FinanceSelectOptions,
} from '../financeTypes';
import {
  INVOICE_STATUS_LABELS,
  INVOICE_STATUS_COLORS,
} from '../financeTypes';
import { formatCurrency, formatCurrencySafe } from '../currencyUtils';

interface InvoiceTableProps {
  invoices: InvoiceWithRelations[];
  options: FinanceSelectOptions | null;
  loading?: boolean;
  onAddInvoice: (artistId?: string) => void;
  onEditInvoice: (invoice: InvoiceWithRelations) => void;
  onDeleteInvoice: (invoice: InvoiceWithRelations) => void;
  onViewPdf: (invoice: InvoiceWithRelations) => void;
  onAddPayment: (invoice: InvoiceWithRelations) => void;
  onViewPayments: (invoice: InvoiceWithRelations) => void;
  onCreateFromVirtual?: (invoice: InvoiceWithRelations) => void;
}

// Mapping des couleurs de status vers les couleurs Badge
const STATUS_BADGE_COLORS: Record<string, "gray" | "blue" | "green" | "yellow" | "red" | "violet"> = {
  gray: 'gray',
  yellow: 'yellow',
  blue: 'blue',
  orange: 'mandarine' as any,
  purple: 'violet',
  green: 'green',
  red: 'red',
};

/**
 * Badge de statut de facture
 */
function StatusBadge({ status }: { status: InvoiceStatus }) {
  const label = INVOICE_STATUS_LABELS[status] || status;
  const colorKey = INVOICE_STATUS_COLORS[status] || 'gray';
  
  // Mapping vers les couleurs du composant Badge
  const badgeColorMap: Record<string, "gray" | "blue" | "green" | "yellow" | "red" | "violet" | "menthe" | "mandarine" | "framboise"> = {
    gray: 'gray',
    yellow: 'yellow',
    blue: 'blue',
    orange: 'mandarine',
    purple: 'violet',
    green: 'menthe',
    red: 'framboise',
  };
  
  const badgeColor = badgeColorMap[colorKey] || 'gray';
  
  return <Badge color={badgeColor}>{label}</Badge>;
}

/**
 * Badge "En retard"
 */
function OverdueBadge({ dueDate, status }: { dueDate: string; status: InvoiceStatus }) {
  if (status === 'paid' || status === 'canceled') return null;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  
  if (due >= today) return null;
  
  const daysOverdue = Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
  
  return (
    <Badge color="framboise">
      <AlertCircle className="w-3 h-3 mr-1" />
      {daysOverdue}j
    </Badge>
  );
}

/**
 * Ligne de facture
 */
function InvoiceRow({
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
  const isPartial = invoice.status === 'partial';

  return (
    <Table.Row
      className={isVirtual ? 'opacity-70 bg-blue-500/5 border-l-2 border-blue-500' : ''}
      hoverable
    >
      {/* Artiste */}
      <Table.Cell>
        <div className="flex items-center gap-2">
          <span className="font-medium text-white">
            {invoice.artist_name || '-'}
          </span>
        </div>
      </Table.Cell>

      {/* Référence */}
      <Table.Cell>
        <span className="text-gray-300">{invoice.reference || '-'}</span>
      </Table.Cell>

      {/* Fournisseur */}
      <Table.Cell>
        <span className="text-gray-300">{invoice.supplier_name || '-'}</span>
      </Table.Cell>

      {/* Catégorie */}
      <Table.Cell>
        <span className="text-gray-400 text-sm">{invoice.category_name || '-'}</span>
      </Table.Cell>

      {/* Montant */}
      <Table.Cell align="right">
        <div className="flex flex-col items-end">
          <span className="font-medium text-white">
            {formatCurrencySafe(invoice.amount_incl, invoice.currency)}
          </span>
          {isPartial && invoice.payments_sum !== undefined && (
            <span className="text-xs text-green-400">
              Payé: {formatCurrency(invoice.payments_sum, invoice.currency)}
            </span>
          )}
          {isPartial && invoice.outstanding_amount !== undefined && (
            <span className="text-xs text-orange-400">
              Reste: {formatCurrency(invoice.outstanding_amount, invoice.currency)}
            </span>
          )}
        </div>
      </Table.Cell>

      {/* Échéance */}
      <Table.Cell>
        <div className="flex items-center gap-2">
          <span className="text-gray-300">
            {invoice.due_date && invoice.due_date.length > 0
              ? new Date(invoice.due_date).toLocaleDateString('fr-FR')
              : '-'}
          </span>
          {invoice.due_date && invoice.due_date.length > 0 && (
            <OverdueBadge dueDate={invoice.due_date} status={invoice.status} />
          )}
        </div>
      </Table.Cell>

      {/* Statut */}
      <Table.Cell>
        <StatusBadge status={invoice.status} />
      </Table.Cell>

      {/* Actions */}
      <Table.Cell>
        {isVirtual ? (
          <div className="flex items-center gap-1">
            {/* Créer la facture à partir de l'offre */}
            <Button
              variant="secondary"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onCreateFromVirtual();
              }}
              title="Créer la facture"
            >
              <Plus className="w-4 h-4 mr-1" />
              Créer
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-1">
            {/* Éditer */}
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              title="Modifier"
            >
              <Edit2 className="w-4 h-4" />
            </Button>

            {/* Voir PDF */}
            {hasPdf && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onViewPdf();
                }}
                title="Voir la facture"
              >
                <FileText className="w-4 h-4 text-blue-400" />
              </Button>
            )}

            {/* Paiements */}
            {!isPaid ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onAddPayment();
                }}
                title="Ajouter un paiement"
              >
                <CreditCard className="w-4 h-4 text-green-400" />
              </Button>
            ) : hasPayments ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onViewPayments();
                }}
                title="Voir les paiements"
              >
                <Eye className="w-4 h-4 text-violet-400" />
              </Button>
            ) : null}

            {/* Supprimer */}
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              title="Supprimer"
              className="text-red-500 hover:text-red-600"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        )}
      </Table.Cell>
    </Table.Row>
  );
}

/**
 * Composant principal du tableau
 */
export function InvoiceTable({
  invoices,
  options,
  loading = false,
  onAddInvoice,
  onEditInvoice,
  onDeleteInvoice,
  onViewPdf,
  onAddPayment,
  onViewPayments,
  onCreateFromVirtual,
}: InvoiceTableProps) {
  // État des filtres
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'all'>('all');
  const [artistFilter, setArtistFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  // État du tri
  const [sort, setSort] = useState<InvoiceSort>({
    field: 'due_date',
    direction: 'asc',
  });

  // Filtrer et trier les factures
  const filteredInvoices = useMemo(() => {
    let result = [...invoices];

    // Recherche
    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter(
        (inv) =>
          inv.reference?.toLowerCase().includes(searchLower) ||
          inv.supplier_name?.toLowerCase().includes(searchLower) ||
          inv.artist_name?.toLowerCase().includes(searchLower) ||
          inv.notes?.toLowerCase().includes(searchLower)
      );
    }

    // Filtre par statut
    if (statusFilter !== 'all') {
      result = result.filter((inv) => inv.status === statusFilter);
    }

    // Filtre par artiste
    if (artistFilter !== 'all') {
      result = result.filter((inv) => inv.artist_id === artistFilter);
    }

    // Tri
    result.sort((a, b) => {
      let aVal: any = a[sort.field as keyof InvoiceWithRelations];
      let bVal: any = b[sort.field as keyof InvoiceWithRelations];

      // Gestion des nulls
      if (aVal === null || aVal === undefined) aVal = '';
      if (bVal === null || bVal === undefined) bVal = '';

      // Comparaison
      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = (bVal as string).toLowerCase();
      }

      if (aVal < bVal) return sort.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sort.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [invoices, search, statusFilter, artistFilter, sort]);

  // Toggle tri
  const handleSort = (field: InvoiceSort['field']) => {
    setSort((prev) => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  // Rendu du skeleton de chargement
  if (loading) {
    return (
      <Card>
        <CardBody className="p-0">
          <div className="animate-pulse">
            <div className="h-12 bg-gray-700 mb-2" />
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-800 border-t border-gray-700" />
            ))}
          </div>
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Barre d'outils */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        {/* Recherche */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Rechercher une facture..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="w-4 h-4 mr-2" />
            Filtres
            {showFilters ? (
              <ChevronUp className="w-4 h-4 ml-2" />
            ) : (
              <ChevronDown className="w-4 h-4 ml-2" />
            )}
          </Button>
          <Button onClick={() => onAddInvoice()}>
            <Plus className="w-4 h-4 mr-2" />
            Nouvelle facture
          </Button>
        </div>
      </div>

      {/* Filtres dépliables */}
      {showFilters && (
        <Card>
          <CardBody className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Filtre statut */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Statut
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as InvoiceStatus | 'all')}
                  className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                >
                  <option value="all">Tous les statuts</option>
                  <option value="to_receive">À recevoir</option>
                  <option value="to_pay">À payer</option>
                  <option value="partial">Partiel</option>
                  <option value="paid">Payée</option>
                  <option value="canceled">Annulée</option>
                </select>
              </div>

              {/* Filtre artiste */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Artiste
                </label>
                <select
                  value={artistFilter}
                  onChange={(e) => setArtistFilter(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                >
                  <option value="all">Tous les artistes</option>
                  {options?.artists.map((artist) => (
                    <option key={artist.id} value={artist.id}>
                      {artist.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Reset filtres */}
              <div className="flex items-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearch('');
                    setStatusFilter('all');
                    setArtistFilter('all');
                  }}
                >
                  Réinitialiser
                </Button>
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Tableau */}
      <Table>
        <Table.Head>
          <Table.Row hoverable={false}>
            <Table.HeaderCell
              sortable
              sorted={sort.field === 'artist_name' ? sort.direction : null}
              onClick={() => handleSort('artist_name')}
            >
              Artiste
            </Table.HeaderCell>
            <Table.HeaderCell
              sortable
              sorted={sort.field === 'reference' ? sort.direction : null}
              onClick={() => handleSort('reference')}
            >
              Référence
            </Table.HeaderCell>
            <Table.HeaderCell
              sortable
              sorted={sort.field === 'supplier_name' ? sort.direction : null}
              onClick={() => handleSort('supplier_name')}
            >
              Fournisseur
            </Table.HeaderCell>
            <Table.HeaderCell>Catégorie</Table.HeaderCell>
            <Table.HeaderCell
              align="right"
              sortable
              sorted={sort.field === 'amount_incl' ? sort.direction : null}
              onClick={() => handleSort('amount_incl')}
            >
              Montant
            </Table.HeaderCell>
            <Table.HeaderCell
              sortable
              sorted={sort.field === 'due_date' ? sort.direction : null}
              onClick={() => handleSort('due_date')}
            >
              Échéance
            </Table.HeaderCell>
            <Table.HeaderCell
              sortable
              sorted={sort.field === 'status' ? sort.direction : null}
              onClick={() => handleSort('status')}
            >
              Statut
            </Table.HeaderCell>
            <Table.HeaderCell>Actions</Table.HeaderCell>
          </Table.Row>
        </Table.Head>
        <Table.Body>
          {filteredInvoices.length === 0 ? (
            <Table.Row hoverable={false}>
              <Table.Cell colSpan={8}>
                <div className="text-center py-8 text-gray-400">
                  {invoices.length === 0
                    ? 'Aucune facture pour cet événement'
                    : 'Aucune facture ne correspond aux filtres'}
                </div>
              </Table.Cell>
            </Table.Row>
          ) : (
            filteredInvoices.map((invoice) => (
              <InvoiceRow
                key={invoice.id}
                invoice={invoice}
                onEdit={() => onEditInvoice(invoice)}
                onDelete={() => onDeleteInvoice(invoice)}
                onViewPdf={() => onViewPdf(invoice)}
                onAddPayment={() => onAddPayment(invoice)}
                onViewPayments={() => onViewPayments(invoice)}
                onCreateFromVirtual={() => onCreateFromVirtual?.(invoice)}
              />
            ))
          )}
        </Table.Body>
      </Table>

      {/* Compteur */}
      <div className="text-sm text-gray-400">
        {filteredInvoices.length} facture{filteredInvoices.length > 1 ? 's' : ''} affichée{filteredInvoices.length > 1 ? 's' : ''}
        {filteredInvoices.length !== invoices.length && ` sur ${invoices.length}`}
      </div>
    </div>
  );
}

export default InvoiceTable;
