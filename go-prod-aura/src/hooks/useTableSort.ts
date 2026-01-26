import { useState, useMemo } from 'react';

/**
 * Hook personnalisé pour gérer le tri des tables AURA
 * 
 * @param data - Tableau de données à trier
 * @param initialColumn - Colonne de tri initiale
 * @param initialDirection - Direction de tri initiale
 * @returns Objet contenant les données triées, l'état de tri et la fonction de tri
 * 
 * Utilisation:
 * const { sortedData, sortColumn, sortDirection, handleSort } = useTableSort(
 *   contacts,
 *   'name',
 *   'asc'
 * );
 */

export interface SortConfig {
  sortColumn: string;
  sortDirection: 'asc' | 'desc';
}

export interface UseTableSortReturn<T> {
  sortedData: T[];
  sortColumn: string;
  sortDirection: 'asc' | 'desc';
  handleSort: (column: string, customSortFn?: (a: T, b: T) => number) => void;
  getSortState: (column: string) => 'asc' | 'desc' | null;
}

export function useTableSort<T extends Record<string, any>>(
  data: T[],
  initialColumn: string = '',
  initialDirection: 'asc' | 'desc' = 'asc'
): UseTableSortReturn<T> {
  const [sortColumn, setSortColumn] = useState<string>(initialColumn);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(initialDirection);

  /**
   * Fonction de tri par défaut
   * Compare deux valeurs en tenant compte des types
   */
  const defaultSort = (a: T, b: T, column: string): number => {
    const aVal = a[column];
    const bVal = b[column];

    // Gestion des valeurs nulles/undefined
    if (aVal == null && bVal == null) return 0;
    if (aVal == null) return 1;
    if (bVal == null) return -1;

    // Comparaison de strings (insensible à la casse)
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return aVal.toLowerCase().localeCompare(bVal.toLowerCase());
    }

    // Comparaison de nombres
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return aVal - bVal;
    }

    // Comparaison par défaut (conversion en string)
    return String(aVal).localeCompare(String(bVal));
  };

  /**
   * Données triées calculées à partir des données sources
   */
  const sortedData = useMemo(() => {
    if (!sortColumn) return data;

    return [...data].sort((a, b) => {
      const comparison = defaultSort(a, b, sortColumn);
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [data, sortColumn, sortDirection]);

  /**
   * Fonction pour gérer le changement de tri
   * @param column - Nom de la colonne à trier
   * @param customSortFn - Fonction de tri personnalisée (optionnelle)
   */
  const handleSort = (column: string, customSortFn?: (a: T, b: T) => number) => {
    if (sortColumn === column) {
      // Toggle direction si même colonne
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Nouvelle colonne, démarrer en asc
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  /**
   * Retourne l'état de tri pour une colonne donnée
   * Utile pour afficher les indicateurs visuels (chevrons)
   */
  const getSortState = (column: string): 'asc' | 'desc' | null => {
    return sortColumn === column ? sortDirection : null;
  };

  return {
    sortedData,
    sortColumn,
    sortDirection,
    handleSort,
    getSortState,
  };
}










