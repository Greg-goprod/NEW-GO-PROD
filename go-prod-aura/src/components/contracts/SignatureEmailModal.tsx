import React, { useState } from 'react';
import { Send } from 'lucide-react';
import { Modal } from '../aura/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import type { Contract } from '@/types/contracts';

interface SignatureEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: (data: { email: string; message: string }) => Promise<void>;
  contract: Contract;
  defaultEmail?: string;
}

export const SignatureEmailModal: React.FC<SignatureEmailModalProps> = ({
  isOpen,
  onClose,
  onSend,
  contract,
  defaultEmail = '',
}) => {
  const [email, setEmail] = useState(defaultEmail);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) return;

    try {
      setSending(true);
      await onSend({ email, message });
      onClose();
    } catch (error) {
      console.error('Erreur envoi email:', error);
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title="Envoyer pour signature interne"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Envoyez un lien de signature sécurisé pour le contrat : <strong>{contract.contract_title}</strong>
          </p>
        </div>

        <Input
          label="Email du destinataire"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="email@example.com"
          required
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Message personnalisé (optionnel)
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
            placeholder="Ajoutez un message personnel..."
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
            disabled={!email || sending}
            leftIcon={<Send className="w-4 h-4" />}
          >
            {sending ? 'Envoi...' : 'Envoyer'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
