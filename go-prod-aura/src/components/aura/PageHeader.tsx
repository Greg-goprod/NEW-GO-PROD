import React from "react";
import type { LucideIcon } from "lucide-react";

export interface PageHeaderProps {
  /** Titre principal de la page */
  title: string;
  
  /** Icône de la page (optionnel) */
  icon?: LucideIcon;
  
  /** Sous-titre ou description (optionnel) */
  subtitle?: React.ReactNode;
  
  /** Actions à afficher à droite (boutons, etc.) */
  actions?: React.ReactNode;
  
  /** Afficher un badge avec le nom de l'événement actuel */
  showEventBadge?: boolean;
  
  /** Classe CSS personnalisée pour le conteneur */
  className?: string;
}

/**
 * PageHeader - Composant AURA standardisé pour les headers de page
 * 
 * Modèle standard:
 * - header avec flex items-center justify-between mb-6
 * - Icône w-5 h-5 text-violet-400
 * - Titre text-xl font-semibold text-gray-900 dark:text-white
 * - gap-2 entre les éléments
 * 
 * @example
 * ```tsx
 * <PageHeader
 *   icon={Calendar}
 *   title="BOOKING"
 *   actions={<Button>Ajouter</Button>}
 * />
 * ```
 */
export function PageHeader({
  title,
  icon: Icon,
  subtitle,
  actions,
  showEventBadge: _showEventBadge = false,
  className = "",
}: PageHeaderProps) {
  return (
    <header className={`flex items-center justify-between mb-6 ${className}`}>
      <div className="flex items-center gap-2">
        {Icon && (
          <Icon className="w-5 h-5 text-violet-400 flex-shrink-0" />
        )}
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
          {title}
        </h1>
        {subtitle && (
          <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
            — {subtitle}
          </span>
        )}
      </div>
      
      {actions && (
        <div className="flex items-center gap-2">
          {actions}
        </div>
      )}
    </header>
  );
}
