import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { Eye, Upload, Mail, Trash2, GripVertical } from 'lucide-react';
import cn from 'classnames';
import { Badge } from '../ui/Badge';
import type { Contract, ContractStatus } from '@/types/contracts';

interface ContractCardProps {
  contract: Contract;
  onView?: (contract: Contract) => void;
  onUpload?: (contract: Contract) => void;
  onSendEmail?: (contract: Contract) => void;
  onDelete?: (contract: Contract) => void;
}

export const ContractCard: React.FC<ContractCardProps> = ({
  contract,
  onView,
  onUpload,
  onSendEmail,
  onDelete,
}) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: contract.id,
    data: {
      contract,
    },
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  // Actions disponibles selon le statut
  const getAvailableActions = () => {
    const actions: Array<{
      icon: React.ReactNode;
      label: string;
      onClick: () => void;
      color: string;
    }> = [];

    // Toujours afficher "Voir"
    if (onView && !contract.virtual) {
      actions.push({
        icon: <Eye className="w-4 h-4" />,
        label: 'Voir',
        onClick: () => onView(contract),
        color: 'text-gray-600 dark:text-gray-400',
      });
    }

    switch (contract.status) {
      case 'review':
        if (onUpload) {
          actions.push({
            icon: <Upload className="w-4 h-4" />,
            label: 'Upload PDF annoté',
            onClick: () => onUpload(contract),
            color: 'text-violet-600',
          });
        }
        break;
      case 'internal_sign':
        if (onUpload) {
          actions.push({
            icon: <Upload className="w-4 h-4" />,
            label: 'Upload PDF signé',
            onClick: () => onUpload(contract),
            color: 'text-violet-600',
          });
        }
        if (onSendEmail) {
          actions.push({
            icon: <Mail className="w-4 h-4" />,
            label: 'Envoyer email',
            onClick: () => onSendEmail(contract),
            color: 'text-blue-600',
          });
        }
        break;
      case 'internal_signed':
        if (onSendEmail) {
          actions.push({
            icon: <Mail className="w-4 h-4" />,
            label: 'Envoyer à l\'externe',
            onClick: () => onSendEmail(contract),
            color: 'text-blue-600',
          });
        }
        break;
      case 'external_sign':
        if (onUpload) {
          actions.push({
            icon: <Upload className="w-4 h-4" />,
            label: 'Upload signé externe',
            onClick: () => onUpload(contract),
            color: 'text-violet-600',
          });
        }
        break;
    }

    return actions;
  };

  const actions = getAvailableActions();

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        'bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4',
        'hover:shadow-md transition-all duration-200 cursor-move',
        isDragging && 'opacity-50 shadow-xl ring-2 ring-violet-400',
        contract.virtual && 'border-dashed border-violet-400 bg-violet-50/50 dark:bg-violet-900/10'
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
            {contract.contract_title}
          </h4>
          {contract.virtual && (
            <span className="text-xs text-violet-600 dark:text-violet-400 italic">
              Carte virtuelle
            </span>
          )}
        </div>
        <button
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-grab active:cursor-grabbing"
          {...listeners}
        >
          <GripVertical className="w-4 h-4" />
        </button>
      </div>

      {/* Infos */}
      <div className="space-y-1 mb-3">
        <p className="text-xs text-gray-600 dark:text-gray-400">
          <span className="font-medium">Artiste:</span> {contract.artist_name || 'N/A'}
        </p>
        {contract.event_name && (
          <p className="text-xs text-gray-600 dark:text-gray-400">
            <span className="font-medium">Événement:</span> {contract.event_name}
          </p>
        )}
        <p className="text-xs text-gray-500 dark:text-gray-500">
          {new Date(contract.created_at).toLocaleDateString('fr-FR')}
        </p>
      </div>

      {/* File indicator */}
      {contract.current_version && (
        <div className="mb-3">
          <Badge variant="default" className="text-xs">
            {contract.current_version === 'original' && '📄 Original'}
            {contract.current_version === 'annotated' && '✏️ Annoté'}
            {contract.current_version === 'signed' && '✅ Signé'}
          </Badge>
        </div>
      )}

      {/* Actions */}
      {actions.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
          {actions.map((action, index) => (
            <button
              key={index}
              onClick={(e) => {
                e.stopPropagation();
                action.onClick();
              }}
              className={cn(
                'flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium transition-colors',
                'hover:bg-gray-100 dark:hover:bg-gray-700',
                action.color
              )}
              title={action.label}
            >
              {action.icon}
              <span className="hidden sm:inline">{action.label}</span>
            </button>
          ))}

          {onDelete && !contract.virtual && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(contract);
              }}
              className="flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium transition-colors hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400"
              title="Supprimer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      )}
    </div>
  );
};
