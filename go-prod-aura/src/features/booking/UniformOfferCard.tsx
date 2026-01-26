import { Card } from "@/components/aura/Card";
import { Badge } from "@/components/aura/Badge";
import type { Offer } from "./bookingTypes";

interface UniformOfferCardProps {
  offer: Offer;
  onClick?: (offer: Offer) => void;
}

/**
 * Carte d'offre uniforme pour le Kanban Board
 * Version simplifiée de OfferCard avec un design plus compact et uniforme
 * Utilisée pour un affichage cohérent dans toutes les colonnes Kanban
 */
export function UniformOfferCard({ offer, onClick }: UniformOfferCardProps) {
  const handleClick = () => {
    if (onClick) {
      onClick(offer);
    }
  };

  return (
    <div onClick={handleClick} className="cursor-pointer">
      <Card className="p-3 hover:shadow-lg transition-all border border-gray-200 dark:border-gray-700 hover:border-violet-500 dark:hover:border-violet-400">

      {/* Header compact */}
      <div className="space-y-2">
        {/* Nom artiste */}
        <div className="flex items-start justify-between gap-2">
          <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate flex-1">
            {offer.artist_name || "Artiste inconnu"}
          </h4>
          
          {/* Badge version */}
          {offer.version && offer.version > 1 && (
            <Badge color="violet">
              <span className="text-xs">V{offer.version}</span>
            </Badge>
          )}
        </div>

        {/* Scène */}
        {offer.stage_name && (
          <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
            {offer.stage_name}
          </p>
        )}

        {/* Montant */}
        {offer.amount_display && (
          <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
            <p className="text-base font-bold text-gray-900 dark:text-gray-100">
              {new Intl.NumberFormat('fr-CH').format(offer.amount_display)}{' '}
              <span className="text-xs font-normal text-gray-500 dark:text-gray-400">
                {offer.currency || 'EUR'}
              </span>
            </p>
          </div>
        )}

        {/* Date de validité */}
        {offer.validity_date && (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Valid. : {new Date(offer.validity_date).toLocaleDateString('fr-CH', { 
              day: '2-digit', 
              month: '2-digit',
              year: 'numeric'
            })}
          </p>
        )}

        {/* Date/Heure de performance */}
        {offer.date_time && (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {new Date(offer.date_time).toLocaleDateString('fr-CH', { 
              day: '2-digit', 
              month: '2-digit' 
            })}{' '}
            {offer.performance_time && `• ${offer.performance_time}`}
          </p>
        )}

        {/* Raison de rejet si applicable */}
        {offer.status === 'rejected' && offer.rejection_reason && (
          <p className="text-xs text-red-600 dark:text-red-400 italic truncate">
            {offer.rejection_reason}
          </p>
        )}
      </div>
      </Card>
    </div>
  );
}


import type { Offer } from "./bookingTypes";

interface UniformOfferCardProps {
  offer: Offer;
  onClick?: (offer: Offer) => void;
}

/**
 * Carte d'offre uniforme pour le Kanban Board
 * Version simplifiée de OfferCard avec un design plus compact et uniforme
 * Utilisée pour un affichage cohérent dans toutes les colonnes Kanban
 */
export function UniformOfferCard({ offer, onClick }: UniformOfferCardProps) {
  const handleClick = () => {
    if (onClick) {
      onClick(offer);
    }
  };

  return (
    <div onClick={handleClick} className="cursor-pointer">
      <Card className="p-3 hover:shadow-lg transition-all border border-gray-200 dark:border-gray-700 hover:border-violet-500 dark:hover:border-violet-400">

      {/* Header compact */}
      <div className="space-y-2">
        {/* Nom artiste */}
        <div className="flex items-start justify-between gap-2">
          <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate flex-1">
            {offer.artist_name || "Artiste inconnu"}
          </h4>
          
          {/* Badge version */}
          {offer.version && offer.version > 1 && (
            <Badge color="violet">
              <span className="text-xs">V{offer.version}</span>
            </Badge>
          )}
        </div>

        {/* Scène */}
        {offer.stage_name && (
          <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
            {offer.stage_name}
          </p>
        )}

        {/* Montant */}
        {offer.amount_display && (
          <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
            <p className="text-base font-bold text-gray-900 dark:text-gray-100">
              {new Intl.NumberFormat('fr-CH').format(offer.amount_display)}{' '}
              <span className="text-xs font-normal text-gray-500 dark:text-gray-400">
                {offer.currency || 'EUR'}
              </span>
            </p>
          </div>
        )}

        {/* Date de validité */}
        {offer.validity_date && (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Valid. : {new Date(offer.validity_date).toLocaleDateString('fr-CH', { 
              day: '2-digit', 
              month: '2-digit',
              year: 'numeric'
            })}
          </p>
        )}

        {/* Date/Heure de performance */}
        {offer.date_time && (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {new Date(offer.date_time).toLocaleDateString('fr-CH', { 
              day: '2-digit', 
              month: '2-digit' 
            })}{' '}
            {offer.performance_time && `• ${offer.performance_time}`}
          </p>
        )}

        {/* Raison de rejet si applicable */}
        {offer.status === 'rejected' && offer.rejection_reason && (
          <p className="text-xs text-red-600 dark:text-red-400 italic truncate">
            {offer.rejection_reason}
          </p>
        )}
      </div>
      </Card>
    </div>
  );
}

