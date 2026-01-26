import React, { useState } from 'react';
import { DndContext, DragOverlay, closestCorners } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import type { Contract, ContractStatus } from '@/types/contracts';
import { ContractColumn } from './ContractColumn';
import { ContractCard } from './ContractCard';

interface ContractsKanbanProps {
  contracts: Contract[];
  onStatusChange: (contractId: string, newStatus: ContractStatus) => void;
  onView?: (contract: Contract) => void;
  onUpload?: (contract: Contract) => void;
  onSendEmail?: (contract: Contract) => void;
  onDelete?: (contract: Contract) => void;
}

// Configuration des colonnes Kanban (5 colonnes - palette AURA)
const columns: Array<{ status: ContractStatus; title: string; color: string }> = [
  { status: 'to_receive', title: 'À recevoir', color: 'gray' },
  { status: 'review', title: 'En relecture', color: 'blue' },
  { status: 'internal_sign', title: 'Signature interne', color: 'resolution' },
  { status: 'internal_signed', title: 'Signé interne', color: 'violet' },
  { status: 'external_sign', title: 'Signature externe', color: 'purple' },
];

export const ContractsKanban: React.FC<ContractsKanbanProps> = ({
  contracts,
  onStatusChange,
  onView,
  onUpload,
  onSendEmail,
  onDelete,
}) => {
  const [activeId, setActiveId] = useState<string | null>(null);

  const handleDragStart = (event: any) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) {
      setActiveId(null);
      return;
    }

    const contractId = active.id as string;
    const newStatus = over.id as ContractStatus;

    // Ne pas changer si c'est la même colonne
    const contract = contracts.find(c => c.id === contractId);
    if (contract && contract.status !== newStatus) {
      onStatusChange(contractId, newStatus);
    }

    setActiveId(null);
  };

  const handleDragCancel = () => {
    setActiveId(null);
  };

  const activeContract = activeId ? contracts.find(c => c.id === activeId) : null;

  return (
    <DndContext
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
      collisionDetection={closestCorners}
    >
      <div className="flex gap-4 h-[600px] pb-4">
        {columns.map((column) => (
          <ContractColumn
            key={column.status}
            status={column.status}
            title={column.title}
            color={column.color}
            contracts={contracts.filter(c => c.status === column.status)}
            onView={onView}
            onUpload={onUpload}
            onSendEmail={onSendEmail}
            onDelete={onDelete}
          />
        ))}
      </div>

      <DragOverlay>
        {activeContract ? (
          <div className="rotate-3">
            <ContractCard contract={activeContract} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};
