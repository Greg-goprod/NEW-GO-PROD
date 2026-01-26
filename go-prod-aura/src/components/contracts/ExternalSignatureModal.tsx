import React, { useState } from 'react';
import { Send, Paperclip } from 'lucide-react';
import Modal from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import type { Contract } from '@/types/contracts';

interface ExternalSignatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: (data: { email: string; returnEmail: string; message: string }) => Promise<void>;
  contract: Contract;
  defaultEmail?: string;
  pdfAttachment?: string;
}

export const ExternalSignatureModal: React.FC<ExternalSignatureModalProps> = ({
  isOpen,
  onClose,
  onSend,
  contract,
  defaultEmail = '',
  pdfAttachment,
}) => {
  const [email, setEmail] = useState(defaultEmail);
  const [returnEmail, setReturnEmail] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !returnEmail) return;

    try {
      setSending(true);
      await onSend({ email, returnEmail, message });
      onClose();
    } catch (error) {
      console.error('Erreur envoi email:', error);
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Envoyer pour signature externe"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Envoyez le contrat signé en interne à l'artiste/management : <strong>{contract.contract_title}</strong>
          </p>

          {pdfAttachment && (
            <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <Paperclip className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span className="text-sm text-blue-700 dark:text-blue-300">
                PDF signé en pièce jointe
              </span>
            </div>
          )}
        </div>

        <Input
          label="Email du destinataire"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="artiste@example.com"
          helperText="Email de l'artiste ou du management"
          required
        />

        <Input
          label="Email de retour"
          type="email"
          value={returnEmail}
          onChange={(e) => setReturnEmail(e.target.value)}
          placeholder="votre-email@example.com"
          helperText="L'artiste renverra le contrat signé à cette adresse"
          required
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Instructions supplémentaires (optionnel)
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
            placeholder="Instructions pour l'artiste..."
          />
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={sending}
          >
            Annuler
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={!email || !returnEmail || sending}
            leftIcon={<Send className="w-4 h-4" />}
          >
            {sending ? 'Envoi...' : 'Envoyer'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
