import React, { useState } from 'react';
import { Eye, Upload, Mail, Trash2 } from 'lucide-react';
import { Badge } from '../ui/Badge';
import type { Contract, ContractStatus } from '@/types/contracts';
import { Table } from '../aura/Table';

interface ContractsListViewProps {
  contracts: Contract[];
  onView?: (contract: Contract) => void;
  onUpload?: (contract: Contract) => void;
  onSendEmail?: (contract: Contract) => void;
  onDelete?: (contract: Contract) => void;
}

type SortField = 'contract_title' | 'artist_name' | 'status' | 'created_at';
type SortDirection = 'asc' | 'desc';

// Configuration des labels de statut
const statusLabels: Record<ContractStatus, string> = {
  to_receive: 'À recevoir',
  review: 'En relecture',
  internal_sign: 'Signature interne',
  internal_signed: 'Signé interne',
  external_sign: 'Signature externe',
  finalized: 'Finalisé',
};

// Configuration des couleurs de badges par statut
const statusVariants: Record<ContractStatus, 'gray' | 'green' | 'yellow' | 'red'> = {
  to_receive: 'gray',
  review: 'yellow',
  internal_sign: 'gray',
  internal_signed: 'green',
  external_sign: 'yellow',
  finalized: 'green',
};

/**
 * Vue liste des contrats avec tableau AURA
 * - Tri par colonnes
 * - Affichage des versions de fichiers
 * - Actions contextuelles
 */
export const ContractsListView: React.FC<ContractsListViewProps> = ({
  contracts,
  onView,
  onUpload,
  onSendEmail,
  onDelete,
}) => {
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortState = (field: SortField): 'asc' | 'desc' | null => {
    return sortField === field ? sortDirection : null;
  };

  const sortedContracts = [...contracts].sort((a, b) => {
    const direction = sortDirection === 'asc' ? 1 : -1;

    switch (sortField) {
      case 'contract_title':
        return direction * a.contract_title.localeCompare(b.contract_title);
      case 'artist_name':
        return direction * (a.artist_name || '').localeCompare(b.artist_name || '');
      case 'status':
        return direction * a.status.localeCompare(b.status);
      case 'created_at':
        return direction * (new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      default:
        return 0;
    }
  });

  if (contracts.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Aucun contrat à afficher
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <Table.Head>
          <Table.Row hoverable={false}>
            <Table.HeaderCell
              sortable
              sorted={getSortState('contract_title')}
              onClick={() => handleSort('contract_title')}
            >
              Titre
            </Table.HeaderCell>
            <Table.HeaderCell
              sortable
              sorted={getSortState('artist_name')}
              onClick={() => handleSort('artist_name')}
            >
              Artiste
            </Table.HeaderCell>
            <Table.HeaderCell>Événement</Table.HeaderCell>
            <Table.HeaderCell
              sortable
              sorted={getSortState('status')}
              onClick={() => handleSort('status')}
            >
              Statut
            </Table.HeaderCell>
            <Table.HeaderCell>Version</Table.HeaderCell>
            <Table.HeaderCell
              sortable
              sorted={getSortState('created_at')}
              onClick={() => handleSort('created_at')}
            >
              Date création
            </Table.HeaderCell>
            <Table.HeaderCell align="right">Actions</Table.HeaderCell>
          </Table.Row>
        </Table.Head>
        <Table.Body>
          {sortedContracts.map((contract) => (
            <Table.Row key={contract.id}>
              <Table.Cell>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900 dark:text-white">
                    {contract.contract_title}
                  </span>
                  {contract.virtual && (
                    <Badge color="gray" className="text-xs">
                      Virtuel
                    </Badge>
                  )}
                </div>
              </Table.Cell>
              <Table.Cell>{contract.artist_name || 'N/A'}</Table.Cell>
              <Table.Cell>{contract.event_name || '-'}</Table.Cell>
              <Table.Cell>
                <Badge color={statusVariants[contract.status]}>
                  {statusLabels[contract.status]}
                </Badge>
              </Table.Cell>
              <Table.Cell>
                {contract.current_version ? (
                  <span className="text-xs text-gray-600 dark:text-gray-400">
                    {contract.current_version === 'original' && '📄 Original'}
                    {contract.current_version === 'annotated' && '✏️ Annoté'}
                    {contract.current_version === 'signed' && '✅ Signé'}
                  </span>
                ) : (
                  <span className="text-xs text-gray-400">-</span>
                )}
              </Table.Cell>
              <Table.Cell>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {new Date(contract.created_at).toLocaleDateString('fr-FR')}
                </span>
              </Table.Cell>
              <Table.Cell align="right">
                <div className="flex items-center justify-end gap-2">
                  {onView && !contract.virtual && (
                    <button
                      onClick={() => onView(contract)}
                      className="p-1.5 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                      title="Voir"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  )}
                  {onUpload && ['review', 'internal_sign', 'external_sign'].includes(contract.status) && (
                    <button
                      onClick={() => onUpload(contract)}
                      className="p-1.5 text-violet-600 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300 hover:bg-violet-50 dark:hover:bg-violet-900/20 rounded transition-colors"
                      title="Upload"
                    >
                      <Upload className="w-4 h-4" />
                    </button>
                  )}
                  {onSendEmail && ['internal_sign', 'internal_signed'].includes(contract.status) && (
                    <button
                      onClick={() => onSendEmail(contract)}
                      className="p-1.5 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                      title="Envoyer email"
                    >
                      <Mail className="w-4 h-4" />
                    </button>
                  )}
                  {onDelete && !contract.virtual && (
                    <button
                      onClick={() => onDelete(contract)}
                      className="p-1.5 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                      title="Supprimer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>
    </div>
  );
};
