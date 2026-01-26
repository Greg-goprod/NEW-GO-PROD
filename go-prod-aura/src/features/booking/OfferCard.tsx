import { Card } from "@/components/aura/Card";
import { Badge } from "@/components/aura/Badge";
import { Button } from "@/components/aura/Button";
import { FileText, Send, Edit, Trash2, FileCheck } from "lucide-react";
import type { Offer } from "./bookingTypes";

interface OfferCardProps {
  offer: Offer;
  onView?: (offer: Offer) => void;
  onEdit?: (offer: Offer) => void;
  onSend?: (offer: Offer) => void;
  onDelete?: (offer: Offer) => void;
  onExportContract?: (offer: Offer) => void;
}

/**
 * Carte d'offre pour le Kanban Board
 * Affiche les informations principales d'une offre avec les actions possibles
 * 
 * Couleurs selon charte AURA:
 * - Brouillon: Mandarine (orange)
 * - Prêt à envoyer: Violet Aura
 * - Envoyé: Saphir (bleu)
 * - Accepté: Menthe (vert)
 * - Rejeté: Framboise (rouge)
 */
export function OfferCard({
  offer,
  onView,
  onEdit,
  onSend,
  onDelete,
  onExportContract,
}: OfferCardProps) {
  const statusColor = (status: string) => {
    switch (status) {
      case "idee": return "gray";                 // Gris - Idée
      case "offre_a_faire": return "mandarine";   // Mandarine - Offre à faire
      case "draft": return "mandarine";           // Mandarine - (compat: Offre à faire)
      case "ready_to_send": return "violet";      // Violet Aura - Prêt à envoyer
      case "sent": return "saphir";               // Saphir - Envoyé
      case "negotiating": return "violet";
      case "legal_review": return "taupe";
      case "management_review": return "violet";
      case "accepted": return "menthe";           // Menthe - Accepté
      case "rejected": return "framboise";        // Framboise - Rejeté
      case "expired": return "gray";
      default: return "gray";
    }
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case "idee": return "Idée";
      case "offre_a_faire": return "Offre à faire";
      case "draft": return "Offre à faire";       // Compat: affiche "Offre à faire"
      case "legal_review": return "Relecture juridique";
      case "management_review": return "Validation management";
      case "ready_to_send": return "Prêt à envoyer";
      case "sent": return "Envoyé";
      case "negotiating": return "En négociation";
      case "accepted": return "Accepté";
      case "rejected": return "Rejeté";
      case "expired": return "Expiré";
      default: return status;
    }
  };

  return (
    <Card className="p-4 hover:shadow-md transition-shadow border border-gray-200 dark:border-gray-700">
      {/* Header avec nom artiste et statut */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-gray-900 dark:text-gray-100 truncate">
            {offer.artist_name || "Artiste inconnu"}
          </h4>
          {offer.stage_name && (
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {offer.stage_name}
            </p>
          )}
        </div>
        <Badge color={statusColor(offer.status)}>
          {statusLabel(offer.status)}
        </Badge>
      </div>

      {/* Informations financières */}
      {offer.amount_display && (
        <div className="mb-3">
          <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
            {new Intl.NumberFormat('fr-CH').format(offer.amount_display)} {offer.currency || 'EUR'}
          </p>
          {offer.validity_date && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Validité : {new Date(offer.validity_date).toLocaleDateString('fr-CH')}
            </p>
          )}
        </div>
      )}

      {/* Badge version si > 1 */}
      {offer.version && offer.version > 1 && (
        <div className="mb-3">
          <Badge color="violet">
            Version {offer.version}
          </Badge>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
        {onView && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onView(offer)}
            className="flex items-center gap-1"
          >
            <FileText size={14} />
            <span className="text-xs">Voir</span>
          </Button>
        )}
        
        {onEdit && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onEdit(offer)}
            className="flex items-center gap-1"
          >
            <Edit size={14} />
            <span className="text-xs">Modifier</span>
          </Button>
        )}
        
        {onSend && offer.status === "ready_to_send" && (
          <Button
            size="sm"
            variant="primary"
            onClick={() => onSend(offer)}
            className="flex items-center gap-1"
          >
            <Send size={14} />
            <span className="text-xs">Envoyer</span>
          </Button>
        )}
        
        {onExportContract && offer.status === "accepted" && (
          <Button
            size="sm"
            variant="success"
            onClick={() => onExportContract(offer)}
            className="flex items-center gap-1"
          >
            <FileCheck size={14} />
            <span className="text-xs">Contrat</span>
          </Button>
        )}
        
        {onDelete && (offer.status === "draft" || offer.status === "offre_a_faire" || offer.status === "idee") && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onDelete(offer)}
            className="flex items-center gap-1 text-red-600 hover:text-red-700 dark:text-red-400"
          >
            <Trash2 size={14} />
            <span className="text-xs">Supprimer</span>
          </Button>
        )}
      </div>
    </Card>
  );
}
