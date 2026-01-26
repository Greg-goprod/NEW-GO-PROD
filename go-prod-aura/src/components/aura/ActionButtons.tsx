import { Edit2, Trash2 } from 'lucide-react';
import { Button } from './Button';

interface ActionButtonsProps {
  onEdit?: () => void;
  onDelete?: () => void;
  variant?: 'inline' | 'hover';
  size?: 'sm' | 'xs';
  editTitle?: string;
  deleteTitle?: string;
}

/**
 * Composant standardisé pour les actions Edit/Delete
 * 
 * @example
 * // Dans une table (actions inline)
 * <ActionButtons 
 *   onEdit={() => handleEdit(item)} 
 *   onDelete={() => handleDelete(item)} 
 * />
 * 
 * @example
 * // Sur une carte (actions au hover)
 * <ActionButtons 
 *   variant="hover"
 *   size="xs"
 *   onEdit={() => handleEdit(item)} 
 *   onDelete={() => handleDelete(item)} 
 * />
 */
export function ActionButtons({ 
  onEdit, 
  onDelete, 
  variant = 'inline',
  size = 'sm',
  editTitle = 'Modifier',
  deleteTitle = 'Supprimer'
}: ActionButtonsProps) {
  const iconSize = size === 'xs' ? 'w-3.5 h-3.5' : 'w-4 h-4';
  
  // Variante hover (sur les cartes)
  if (variant === 'hover') {
    return (
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
        {onEdit && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="p-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors"
            title={editTitle}
          >
            <Edit2 className={iconSize} />
          </button>
        )}
        {onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-1.5 bg-red-500 hover:bg-red-600 text-white rounded transition-colors"
            title={deleteTitle}
          >
            <Trash2 className={iconSize} />
          </button>
        )}
      </div>
    );
  }

  // Variante inline (dans les tables)
  return (
    <div className="flex gap-2">
      {onEdit && (
        <Button 
          variant="ghost" 
          size="sm"
          onClick={onEdit}
          className="text-blue-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
          title={editTitle}
        >
          <Edit2 className={iconSize} />
        </Button>
      )}
      {onDelete && (
        <Button 
          variant="ghost" 
          size="sm"
          onClick={onDelete}
          className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
          title={deleteTitle}
        >
          <Trash2 className={iconSize} />
        </Button>
      )}
    </div>
  );
}










