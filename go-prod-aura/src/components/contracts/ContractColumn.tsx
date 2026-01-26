import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import cn from 'classnames';
import type { Contract, ContractStatus } from '@/types/contracts';
import { ContractCard } from './ContractCard';

interface ContractColumnProps {
  status: ContractStatus;
  title: string;
  contracts: Contract[];
  color: string;
  onView?: (contract: Contract) => void;
  onUpload?: (contract: Contract) => void;
  onSendEmail?: (contract: Contract) => void;
  onDelete?: (contract: Contract) => void;
}

// ============================================
// PALETTE AURA OFFICIELLE - Couleurs Kanban
// ============================================
// to_receive → Taupe gray (#919399)
// review → Cobalt blue (#1246A3)
// internal_sign → Resolution Blue (#021F78)
// internal_signed → Eminence (#661B7D) - Violet AURA principal
// external_sign → Purpureus (#9E61A9)

const statusColors: Record<ContractStatus, { border: string; bg: string }> = {
  to_receive: {
    border: '#919399',
    bg: '#91939915',
  },
  review: {
    border: '#1246A3',
    bg: '#1246A315',
  },
  internal_sign: {
    border: '#021F78',
    bg: '#021F7815',
  },
  internal_signed: {
    border: '#661B7D',
    bg: '#661B7D15',
  },
  external_sign: {
    border: '#9E61A9',
    bg: '#9E61A915',
  },
  finalized: {
    border: '#90EE90',
    bg: '#90EE9015',
  },
};

/**
 * Colonne droppable pour le Kanban
 * - Zone de drop pour les cartes
 * - Compteur de cartes
 * - Couleur personnalisée par statut
 */
export const ContractColumn: React.FC<ContractColumnProps> = ({
  status,
  title,
  contracts,
  color,
  onView,
  onUpload,
  onSendEmail,
  onDelete,
}) => {
  const { setNodeRef, isOver } = useDroppable({
    id: status,
    data: {
      status,
    },
  });

  const colorConfig = statusColors[status];

  return (
    <div className="flex flex-col h-full min-w-[240px] w-[calc(20%-1rem)] flex-shrink-0">
      {/* Header de la colonne */}
      <div 
        className="flex items-center justify-between p-4 rounded-t-lg border-2 border-b-0"
        style={{
          borderColor: colorConfig.border,
          backgroundColor: colorConfig.bg,
        }}
      >
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide">
          {title}
        </h3>
        <span className={cn(
          'flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold',
          'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300'
        )}>
          {contracts.length}
        </span>
      </div>

      {/* Zone de drop */}
      <div
        ref={setNodeRef}
        className={cn(
          'flex-1 p-4 space-y-3 overflow-y-auto rounded-b-lg border-2 border-t-0 transition-all',
          isOver && 'ring-4 ring-[#9E61A9] ring-opacity-50'
        )}
        style={{ 
          minHeight: '200px',
          borderColor: colorConfig.border,
          backgroundColor: colorConfig.bg,
        }}
      >
        {contracts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-center">
            <p className="text-sm text-gray-400 dark:text-gray-500">
              Aucun contrat
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              Glissez-déposez ici
            </p>
          </div>
        ) : (
          contracts.map((contract) => (
            <ContractCard
              key={contract.id}
              contract={contract}
              onView={onView}
              onUpload={onUpload}
              onSendEmail={onSendEmail}
              onDelete={onDelete}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default ContractColumn;
