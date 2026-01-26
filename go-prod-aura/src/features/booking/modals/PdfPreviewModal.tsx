import { Modal } from "@/components/aura/Modal";
import { Button } from "@/components/aura/Button";
import { Download, X, Edit, Send } from "lucide-react";

interface PdfPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  pdfUrl: string | null;
  artistName?: string;
  loading?: boolean;
  onModify?: () => void;
  onReadyToSend?: () => void;
  onDownload?: () => void;
}

/**
 * Modal de prévisualisation de PDF d'offre
 * Permet de visualiser le PDF généré avant de l'envoyer
 * 
 * Actions possibles :
 * - Annuler : Ferme le modal
 * - Modifier : Retourne au formulaire pour modifications
 * - Prêt à envoyer : Valide et sauvegarde l'offre avec le PDF
 * - Télécharger : Télécharge le PDF localement
 */
export function PdfPreviewModal({
  isOpen,
  onClose,
  pdfUrl,
  artistName,
  loading = false,
  onModify,
  onReadyToSend,
  onDownload,
}: PdfPreviewModalProps) {
  const handleDownload = () => {
    if (pdfUrl && onDownload) {
      onDownload();
    } else if (pdfUrl) {
      // Téléchargement par défaut
      const link = document.createElement('a');
      link.href = pdfUrl;
      link.download = `Offre_${artistName || 'Artiste'}_${Date.now()}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleReadyToSend = () => {
    if (onReadyToSend) {
      onReadyToSend();
    }
  };

  const handleModify = () => {
    if (onModify) {
      onModify();
    } else {
      onClose();
    }
  };

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title={`Prévisualisation de l'offre ${artistName ? `- ${artistName}` : ''}`}
      widthClass="max-w-7xl"
    >
      <div className="flex flex-col h-full">
        {/* Zone de prévisualisation PDF */}
        <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden mb-4">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600 mx-auto mb-4"></div>
                <p className="text-gray-600 dark:text-gray-400">Génération du PDF en cours...</p>
              </div>
            </div>
          ) : pdfUrl ? (
            <iframe
              src={pdfUrl}
              className="w-full h-full"
              title="Prévisualisation PDF"
              style={{ minHeight: '600px' }}
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-gray-500 dark:text-gray-400">
                <p>Aucun PDF à afficher</p>
              </div>
            </div>
          )}
        </div>

        {/* Barre d'actions */}
        <div className="flex justify-between items-center gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          {/* Boutons à gauche */}
          <div className="flex gap-2">
            <Button
              variant="ghost"
              onClick={onClose}
              disabled={loading}
              className="flex items-center gap-2"
            >
              <X size={16} />
              Annuler
            </Button>
            
            {pdfUrl && (
              <Button
                variant="secondary"
                onClick={handleDownload}
                disabled={loading}
                className="flex items-center gap-2"
              >
                <Download size={16} />
                Télécharger
              </Button>
            )}
          </div>

          {/* Boutons à droite */}
          <div className="flex gap-2">
            {onModify && (
              <Button
                variant="secondary"
                onClick={handleModify}
                disabled={loading}
                className="flex items-center gap-2"
              >
                <Edit size={16} />
                Modifier
              </Button>
            )}
            
            {onReadyToSend && (
              <Button
                variant="primary"
                onClick={handleReadyToSend}
                disabled={loading || !pdfUrl}
                className="flex items-center gap-2"
              >
                <Send size={16} />
                Prêt à envoyer
              </Button>
            )}
          </div>
        </div>

        {/* Message d'information */}
        {pdfUrl && (
          <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
            <p>
              Vérifiez attentivement le contenu du PDF avant de le marquer comme "Prêt à envoyer".
              Une fois validé, l'offre sera disponible pour envoi par email.
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
}


import { Download, X, Edit, Send } from "lucide-react";

interface PdfPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  pdfUrl: string | null;
  artistName?: string;
  loading?: boolean;
  onModify?: () => void;
  onReadyToSend?: () => void;
  onDownload?: () => void;
}

/**
 * Modal de prévisualisation de PDF d'offre
 * Permet de visualiser le PDF généré avant de l'envoyer
 * 
 * Actions possibles :
 * - Annuler : Ferme le modal
 * - Modifier : Retourne au formulaire pour modifications
 * - Prêt à envoyer : Valide et sauvegarde l'offre avec le PDF
 * - Télécharger : Télécharge le PDF localement
 */
export function PdfPreviewModal({
  isOpen,
  onClose,
  pdfUrl,
  artistName,
  loading = false,
  onModify,
  onReadyToSend,
  onDownload,
}: PdfPreviewModalProps) {
  const handleDownload = () => {
    if (pdfUrl && onDownload) {
      onDownload();
    } else if (pdfUrl) {
      // Téléchargement par défaut
      const link = document.createElement('a');
      link.href = pdfUrl;
      link.download = `Offre_${artistName || 'Artiste'}_${Date.now()}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleReadyToSend = () => {
    if (onReadyToSend) {
      onReadyToSend();
    }
  };

  const handleModify = () => {
    if (onModify) {
      onModify();
    } else {
      onClose();
    }
  };

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title={`Prévisualisation de l'offre ${artistName ? `- ${artistName}` : ''}`}
      widthClass="max-w-7xl"
    >
      <div className="flex flex-col h-full">
        {/* Zone de prévisualisation PDF */}
        <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden mb-4">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600 mx-auto mb-4"></div>
                <p className="text-gray-600 dark:text-gray-400">Génération du PDF en cours...</p>
              </div>
            </div>
          ) : pdfUrl ? (
            <iframe
              src={pdfUrl}
              className="w-full h-full"
              title="Prévisualisation PDF"
              style={{ minHeight: '600px' }}
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-gray-500 dark:text-gray-400">
                <p>Aucun PDF à afficher</p>
              </div>
            </div>
          )}
        </div>

        {/* Barre d'actions */}
        <div className="flex justify-between items-center gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          {/* Boutons à gauche */}
          <div className="flex gap-2">
            <Button
              variant="ghost"
              onClick={onClose}
              disabled={loading}
              className="flex items-center gap-2"
            >
              <X size={16} />
              Annuler
            </Button>
            
            {pdfUrl && (
              <Button
                variant="secondary"
                onClick={handleDownload}
                disabled={loading}
                className="flex items-center gap-2"
              >
                <Download size={16} />
                Télécharger
              </Button>
            )}
          </div>

          {/* Boutons à droite */}
          <div className="flex gap-2">
            {onModify && (
              <Button
                variant="secondary"
                onClick={handleModify}
                disabled={loading}
                className="flex items-center gap-2"
              >
                <Edit size={16} />
                Modifier
              </Button>
            )}
            
            {onReadyToSend && (
              <Button
                variant="primary"
                onClick={handleReadyToSend}
                disabled={loading || !pdfUrl}
                className="flex items-center gap-2"
              >
                <Send size={16} />
                Prêt à envoyer
              </Button>
            )}
          </div>
        </div>

        {/* Message d'information */}
        {pdfUrl && (
          <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
            <p>
              Vérifiez attentivement le contenu du PDF avant de le marquer comme "Prêt à envoyer".
              Une fois validé, l'offre sera disponible pour envoi par email.
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
}

