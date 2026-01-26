/**
 * Design System AURA - Constantes et helpers
 * 
 * Ce fichier centralise les standards du design system pour garantir l'uniformité
 */

// Tailles d'icônes standards
export const ICON_SIZES = {
  xs: 14,  // 3.5 × 3.5 Tailwind
  sm: 16,  // 4 × 4 Tailwind
  md: 20,  // 5 × 5 Tailwind
  lg: 24,  // 6 × 6 Tailwind
} as const;

// Couleurs d'actions standards
export const ACTION_COLORS = {
  edit: {
    base: '#3B82F6',      // blue-500
    hover: '#2563EB',     // blue-600
    bg: {
      light: '#EFF6FF',   // blue-50
      dark: '#1E3A8A20',  // blue-900/20
    }
  },
  delete: {
    base: '#EF4444',      // red-500
    hover: '#DC2626',     // red-600
    bg: {
      light: '#FEF2F2',   // red-50
      dark: '#7F1D1D20',  // red-900/20
    }
  },
  validate: {
    base: '#22C55E',      // green-500
    hover: '#16A34A',     // green-600
    bg: {
      light: '#F0FDF4',   // green-50
      dark: '#14532D20',  // green-900/20
    }
  },
  cancel: {
    base: '#6B7280',      // gray-500
    hover: '#4B5563',     // gray-600
    bg: {
      light: '#F9FAFB',   // gray-50
      dark: '#1F293720',  // gray-900/20
    }
  }
} as const;

// Icônes standards pour chaque action
export const ACTION_ICONS = {
  add: 'Plus',
  edit: 'Edit2',
  delete: 'Trash2',
  close: 'X',
  search: 'Search',
  filter: 'Filter',
  download: 'Download',
  back: 'ArrowLeft',
  validate: 'Check',
  cancel: 'X',
} as const;

// Icônes standards pour chaque entité
export const ENTITY_ICONS = {
  artists: 'Music',
  contacts: 'Users',
  companies: 'Building2',
  staff: 'Users',
  events: 'Calendar',
  vehicles: 'Truck',
  bookings: 'FileText',
} as const;

// Classes Tailwind standards pour les hovers de lignes
export const TABLE_ROW_HOVER = {
  style: {
    transition: 'background 0.15s ease',
  },
  onMouseEnter: (e: React.MouseEvent<HTMLTableRowElement>) => {
    e.currentTarget.style.background = 'var(--color-hover-row)';
  },
  onMouseLeave: (e: React.MouseEvent<HTMLTableRowElement>) => {
    e.currentTarget.style.background = '';
  },
} as const;

// Classes Tailwind standards pour les actions inline
export const ACTION_BUTTON_CLASSES = {
  edit: 'text-blue-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20',
  delete: 'text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20',
} as const;

// Classes Tailwind standards pour les actions hover sur cartes
export const CARD_ACTION_CLASSES = {
  edit: 'p-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors',
  delete: 'p-1.5 bg-red-500 hover:bg-red-600 text-white rounded transition-colors',
} as const;

/**
 * Helper pour appliquer le hover standard sur les lignes de table
 * 
 * @example
 * <tr {...getTableRowHoverProps()} key={item.id}>
 *   ...
 * </tr>
 */
export function getTableRowHoverProps() {
  return TABLE_ROW_HOVER;
}

/**
 * Helper pour obtenir la taille d'icône standard
 * 
 * @example
 * <Plus size={getIconSize('sm')} />
 */
export function getIconSize(size: keyof typeof ICON_SIZES = 'sm') {
  return ICON_SIZES[size];
}

/**
 * Helper pour obtenir la classe Tailwind de l'icône
 * 
 * @example
 * <Edit2 className={getIconClassName('sm')} />
 */
export function getIconClassName(size: keyof typeof ICON_SIZES = 'sm') {
  const map = {
    xs: 'w-3.5 h-3.5',
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };
  return map[size];
}










