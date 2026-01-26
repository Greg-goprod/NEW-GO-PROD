import React from 'react';

/**
 * Composant Table AURA
 * Design system unifié pour toutes les tables de l'application
 * 
 * Utilisation:
 * <Table>
 *   <Table.Head>
 *     <Table.Row>
 *       <Table.HeaderCell>Nom</Table.HeaderCell>
 *       <Table.HeaderCell sortable onClick={() => handleSort('email')}>
 *         Email
 *       </Table.HeaderCell>
 *     </Table.Row>
 *   </Table.Head>
 *   <Table.Body>
 *     <Table.Row>
 *       <Table.Cell>John Doe</Table.Cell>
 *       <Table.Cell>john@example.com</Table.Cell>
 *     </Table.Row>
 *   </Table.Body>
 * </Table>
 */

interface TableProps {
  children: React.ReactNode;
  className?: string;
}

interface TableHeaderCellProps {
  children: React.ReactNode;
  className?: string;
  sortable?: boolean;
  sorted?: 'asc' | 'desc' | null;
  onClick?: () => void;
  align?: 'left' | 'center' | 'right';
}

interface TableCellProps {
  children: React.ReactNode;
  className?: string;
  align?: 'left' | 'center' | 'right';
  colSpan?: number;
}

interface TableRowProps {
  children: React.ReactNode;
  className?: string;
  hoverable?: boolean;
  onClick?: () => void;
}

// Container principal de la table avec border, shadow et background
export const Table: React.FC<TableProps> & {
  Head: typeof TableHead;
  Body: typeof TableBody;
  Row: typeof TableRow;
  HeaderCell: typeof TableHeaderCell;
  Cell: typeof TableCell;
} = ({ children, className = '' }) => {
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden border border-gray-200 dark:border-gray-700 ${className}`}>
      <table className="w-full">
        {children}
      </table>
    </div>
  );
};

// En-tête de la table
const TableHead: React.FC<TableProps> = ({ children, className = '' }) => {
  return (
    <thead className={`bg-gray-50 dark:bg-gray-900 ${className}`}>
      {children}
    </thead>
  );
};

// Corps de la table
const TableBody: React.FC<TableProps> = ({ children, className = '' }) => {
  return (
    <tbody className={`divide-y divide-gray-200 dark:divide-gray-700 ${className}`}>
      {children}
    </tbody>
  );
};

// Ligne de la table
const TableRow: React.FC<TableRowProps> = ({ 
  children, 
  className = '', 
  hoverable = true,
  onClick 
}) => {
  const hoverStyles = hoverable
    ? {
        style: { transition: 'background 0.15s ease' } as React.CSSProperties,
        onMouseEnter: (e: React.MouseEvent<HTMLTableRowElement>) => 
          (e.currentTarget.style.background = 'var(--color-hover-row)'),
        onMouseLeave: (e: React.MouseEvent<HTMLTableRowElement>) => 
          (e.currentTarget.style.background = ''),
      }
    : {};

  return (
    <tr 
      className={`${onClick ? 'cursor-pointer' : ''} ${className}`}
      onClick={onClick}
      {...hoverStyles}
    >
      {children}
    </tr>
  );
};

// Cellule d'en-tête avec tri optionnel
const TableHeaderCell: React.FC<TableHeaderCellProps> = ({ 
  children, 
  className = '', 
  sortable = false,
  sorted = null,
  onClick,
  align = 'left'
}) => {
  const alignClass = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  }[align];

  const sortableClass = sortable 
    ? 'cursor-pointer hover:text-violet-400 transition-colors select-none' 
    : '';

  const content = sortable ? (
    <div className="flex items-center gap-2">
      {children}
      <span className={sorted ? 'text-violet-400' : 'text-gray-400 dark:text-gray-500'}>
        {sorted && sorted === 'asc' ? '▲' : '▼'}
      </span>
    </div>
  ) : children;

  return (
    <th 
      className={`px-4 py-3 ${alignClass} text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider ${sortableClass} ${className}`}
      onClick={sortable ? onClick : undefined}
    >
      {content}
    </th>
  );
};

// Cellule de données
const TableCell: React.FC<TableCellProps> = ({ 
  children, 
  className = '', 
  align = 'left',
  colSpan
}) => {
  const alignClass = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  }[align];

  return (
    <td 
      className={`px-4 py-3 whitespace-nowrap ${alignClass} ${className}`}
      colSpan={colSpan}
    >
      {children}
    </td>
  );
};

// Attacher les sous-composants
Table.Head = TableHead;
Table.Body = TableBody;
Table.Row = TableRow;
Table.HeaderCell = TableHeaderCell;
Table.Cell = TableCell;

export default Table;

