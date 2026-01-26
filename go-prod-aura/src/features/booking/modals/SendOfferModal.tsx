import React, { useState } from "react";
import { Send, FileText } from "lucide-react";
import { Modal } from "../../../components/aura/Modal";
import { Button } from "../../../components/aura/Button";
import { Input } from "../../../components/aura/Input";
import { useToast } from "../../../components/aura/ToastProvider";
import { sendOfferEmail } from "../../../services/emailService";

export interface SendOfferModalProps {
  open: boolean;
  onClose: () => void;
  offer: {
    id: string;
    artist_name: string;
    stage_name: string;
    amount_display: number | null;
    currency: string | null;
    pdf_storage_path: string | null;
  };
  onSuccess: () => void;
}

export function SendOfferModal({ open, onClose, offer, onSuccess }: SendOfferModalProps) {
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const { success: toastSuccess, error: toastError } = useToast();

  // Préremplir le sujet et le message
  React.useEffect(() => {
    if (open && offer) {
      setSubject(`Offre de contrat - ${offer.artist_name}`);
      setMessage(`Bonjour,\n\nVeuillez trouver ci-joint notre offre de contrat pour ${offer.artist_name}.\n\nCordialement`);
    }
  }, [open, offer]);

  const handleSend = async () => {
    if (!email.trim()) {
      toastError("Veuillez saisir une adresse email");
      return;
    }

    if (!offer.pdf_storage_path) {
      toastError("Aucun PDF disponible pour cette offre");
      return;
    }

    setSending(true);
    try {
      await sendOfferEmail({
        to: email.trim(),
        subject: subject.trim() || `Offre de contrat - ${offer.artist_name}`,
        message: message.trim(),
        pdfPath: offer.pdf_storage_path,
        offerData: {
          artist_name: offer.artist_name,
          stage_name: offer.stage_name,
          amount_display: offer.amount_display,
          currency: offer.currency,
        }
      });

      toastSuccess("Offre envoyée par email");
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error("Erreur envoi email:", error);
      toastError(error?.message || "Erreur d'envoi");
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Envoyer l'offre" widthClass="max-w-lg">
      <div className="space-y-4">
        {/* Informations de l'offre */}
        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Détails de l'offre</h3>
          <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
            <div><strong>Artiste:</strong> {offer.artist_name}</div>
            <div><strong>Scène:</strong> {offer.stage_name}</div>
            {offer.amount_display && (
              <div><strong>Montant:</strong> {offer.amount_display} {offer.currency}</div>
            )}
            <div className="flex items-center mt-2">
              <FileText size={16} className="mr-2 text-green-600" />
              <span className="text-green-600">PDF généré</span>
            </div>
          </div>
        </div>

        {/* Formulaire d'envoi */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Adresse email <span className="text-red-500">*</span>
            </label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="agent@artiste.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Sujet
            </label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Sujet de l'email"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Message
            </label>
            <textarea
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Message personnalisé..."
            />
          </div>
        </div>

        {/* Boutons */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <Button variant="ghost" onClick={onClose} disabled={sending}>
            Annuler
          </Button>
          <Button variant="primary" onClick={handleSend} disabled={sending}>
            <Send size={16} className="mr-2" />
            {sending ? "Envoi..." : "Envoyer"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}