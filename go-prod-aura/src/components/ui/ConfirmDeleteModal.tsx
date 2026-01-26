import { AlertTriangle } from "lucide-react";
import Modal, { ModalFooter, ModalButton } from "./Modal";

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  itemName?: string;
  loading?: boolean;
}

export function ConfirmDeleteModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  itemName,
  loading = false
}: ConfirmDeleteModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      draggable={true}
      footer={
        <ModalFooter>
          <ModalButton variant="secondary" onClick={onClose} disabled={loading}>
            Annuler
          </ModalButton>
          <ModalButton 
            variant="danger" 
            onClick={onConfirm} 
            loading={loading}
          >
            Supprimer
          </ModalButton>
        </ModalFooter>
      }
    >
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
          <div 
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{
              background: 'color-mix(in oklab, var(--color-error) 15%, transparent)'
            }}
          >
            <AlertTriangle className="w-5 h-5" style={{ color: 'var(--color-error)' }} />
          </div>
        </div>
        <div className="flex-1">
          <p className="text-sm mb-3" style={{ color: 'var(--color-text-primary)' }}>
            {message}
          </p>
          {itemName && itemName.toLowerCase() !== 'à définir' && itemName.trim() !== '' && (
            <div 
              className="my-4 p-3 rounded-lg"
              style={{
                background: 'var(--color-bg-surface)',
                border: '1px solid var(--color-border)'
              }}
            >
              <p className="text-base font-bold" style={{ color: 'var(--color-text-primary)' }}>
                {itemName}
              </p>
            </div>
          )}
          <p 
            className="text-sm font-bold uppercase tracking-wider mt-4"
            style={{ color: 'var(--color-error)' }}
          >
            Cette action est irréversible
          </p>
        </div>
      </div>
    </Modal>
  );
}

export default ConfirmDeleteModal;
