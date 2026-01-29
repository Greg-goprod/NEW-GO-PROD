/**
 * Modal de création/édition de paiement
 * Avec zone de drag & drop pour preuve de paiement (POP)
 */

import { useState, useEffect, useCallback } from 'react';
import { Upload, X, FileText, Image, Loader2 } from 'lucide-react';
import { Modal } from '@/components/aura/Modal';
import { Button } from '@/components/aura/Button';
import { Input } from '@/components/aura/Input';
import { DatePickerPopup } from '@/components/ui/pickers/DatePickerPopup';
import type {
  Payment,
  PaymentFormData,
  InvoiceWithRelations,
  CurrencyCode,
  PaymentType,
} from '../financeTypes';
import { CURRENCIES, PAYMENT_TYPE_LABELS } from '../financeTypes';
import { formatCurrency } from '../currencyUtils';

interface PaymentModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: PaymentFormData) => Promise<void>;
  payment?: Payment | null;
  invoice: InvoiceWithRelations | null;
}

/**
 * Zone de drag & drop pour fichier (PDF ou image)
 */
function PopDropZone({
  file,
  onFileSelect,
  onFileClear,
  existingUrl,
}: {
  file: File | null;
  onFileSelect: (file: File) => void;
  onFileClear: () => void;
  existingUrl?: string | null;
}) {
  const [isDragging, setIsDragging] = useState(false);

  const acceptedTypes = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
  ];

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile && acceptedTypes.includes(droppedFile.type)) {
        onFileSelect(droppedFile);
      }
    },
    [onFileSelect]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0];
      if (selectedFile) {
        onFileSelect(selectedFile);
      }
    },
    [onFileSelect]
  );

  const isImage = file?.type.startsWith('image/');

  if (file) {
    return (
      <div className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg border border-gray-700">
        {isImage ? (
          <Image className="w-8 h-8 text-green-400" />
        ) : (
          <FileText className="w-8 h-8 text-violet-400" />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">{file.name}</p>
          <p className="text-xs text-gray-400">
            {(file.size / 1024 / 1024).toFixed(2)} MB
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={onFileClear}>
          <X className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  return (
    <div
      className={`relative border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
        isDragging
          ? 'border-violet-500 bg-violet-500/10'
          : 'border-gray-600 hover:border-gray-500'
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,.webp"
        onChange={handleFileInput}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
      />
      <Upload className="w-6 h-6 mx-auto mb-2 text-gray-400" />
      <p className="text-sm text-gray-300">
        PDF ou image <span className="text-violet-400">(optionnel)</span>
      </p>
      {existingUrl && (
        <p className="text-xs text-green-400 mt-1">
          Une preuve existe déjà
        </p>
      )}
    </div>
  );
}

/**
 * Composant principal de la modal
 */
export function PaymentModal({
  open,
  onClose,
  onSubmit,
  payment,
  invoice,
}: PaymentModalProps) {
  const isEdit = !!payment;

  // État du formulaire
  const [formData, setFormData] = useState<PaymentFormData>({
    payment_date: new Date().toISOString().split('T')[0],
    amount: 0,
    currency: 'EUR',
    payment_type: 'virement_bancaire',
    notes: null,
    has_pop: false,
    pop_file: null,
  });

  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Initialiser le formulaire
  useEffect(() => {
    if (open) {
      if (payment) {
        // Mode édition
        setFormData({
          payment_date: payment.payment_date,
          amount: payment.amount,
          currency: payment.currency as CurrencyCode,
          payment_type: payment.payment_type,
          notes: payment.notes ?? null,
          has_pop: !!payment.pop_url,
          pop_file: null,
        });
      } else if (invoice) {
        // Mode création - pré-remplir avec le restant à payer
        const outstanding = invoice.outstanding_amount ?? invoice.amount_incl;
        setFormData({
          payment_date: new Date().toISOString().split('T')[0],
          amount: outstanding,
          currency: invoice.currency,
          payment_type: 'virement_bancaire',
          notes: null,
          has_pop: false,
          pop_file: null,
        });
      }
      setFile(null);
      setErrors({});
    }
  }, [open, payment, invoice]);

  // Validation
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.payment_date) {
      newErrors.payment_date = 'La date est requise';
    }
    if (!formData.amount || formData.amount <= 0) {
      newErrors.amount = 'Le montant doit être supérieur à 0';
    }
    if (!formData.payment_type) {
      newErrors.payment_type = 'Le type de paiement est requis';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Soumission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setLoading(true);
    try {
      await onSubmit({
        ...formData,
        pop_file: file,
      });
      onClose();
    } catch (err: any) {
      setErrors({ submit: err.message || 'Erreur lors de la sauvegarde' });
    } finally {
      setLoading(false);
    }
  };

  // Mise à jour d'un champ
  const updateField = <K extends keyof PaymentFormData>(
    field: K,
    value: PaymentFormData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // Calculer le restant après ce paiement
  const remainingAfterPayment = invoice
    ? (invoice.outstanding_amount ?? invoice.amount_incl) - formData.amount
    : 0;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Modifier le paiement' : 'Nouveau paiement'}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Info facture */}
        {invoice && (
          <div className="p-3 bg-gray-800/50 rounded-lg border border-gray-700">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-gray-400">Facture</p>
                <p className="font-medium text-white">{invoice.reference}</p>
                <p className="text-sm text-gray-400">{invoice.supplier_name}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-400">Montant total</p>
                <p className="font-medium text-white">
                  {formatCurrency(invoice.amount_incl, invoice.currency)}
                </p>
                {invoice.payments_sum !== undefined && invoice.payments_sum > 0 && (
                  <p className="text-xs text-green-400">
                    Déjà payé: {formatCurrency(invoice.payments_sum, invoice.currency)}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Ligne 1: Date + Montant */}
        <div className="grid grid-cols-2 gap-4">
          <DatePickerPopup
            label="Date du paiement *"
            value={formData.payment_date ? new Date(formData.payment_date) : null}
            onChange={(date) => updateField('payment_date', date ? date.toISOString().split('T')[0] : '')}
            error={errors.payment_date}
          />

          <div>
            <Input
              label="Montant *"
              type="number"
              step="0.01"
              min="0"
              value={formData.amount || ''}
              onChange={(e) =>
                updateField('amount', parseFloat(e.target.value) || 0)
              }
              error={errors.amount}
            />
            {invoice && remainingAfterPayment !== 0 && (
              <p
                className={`text-xs mt-1 ${
                  remainingAfterPayment < 0 ? 'text-orange-400' : 'text-gray-400'
                }`}
              >
                {remainingAfterPayment > 0
                  ? `Restera: ${formatCurrency(remainingAfterPayment, invoice.currency)}`
                  : remainingAfterPayment < 0
                  ? `Trop-perçu: ${formatCurrency(Math.abs(remainingAfterPayment), invoice.currency)}`
                  : 'Facture soldée'}
              </p>
            )}
          </div>
        </div>

        {/* Ligne 2: Devise + Type */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Devise
            </label>
            <select
              value={formData.currency}
              onChange={(e) => updateField('currency', e.target.value as CurrencyCode)}
              className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Type de paiement *
            </label>
            <select
              value={formData.payment_type}
              onChange={(e) => updateField('payment_type', e.target.value as PaymentType)}
              className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              {Object.entries(PAYMENT_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            {errors.payment_type && (
              <p className="text-sm text-red-400 mt-1">{errors.payment_type}</p>
            )}
          </div>
        </div>

        {/* Preuve de paiement */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Preuve de paiement (POP)
          </label>
          <PopDropZone
            file={file}
            onFileSelect={setFile}
            onFileClear={() => setFile(null)}
            existingUrl={payment?.pop_url}
          />
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Notes
          </label>
          <textarea
            value={formData.notes ?? ''}
            onChange={(e) => updateField('notes', e.target.value || null)}
            rows={2}
            className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
            placeholder="Référence virement, commentaire..."
          />
        </div>

        {/* Erreur générale */}
        {errors.submit && (
          <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg">
            <p className="text-sm text-red-400">{errors.submit}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-700">
          <Button type="button" variant="secondary" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {isEdit ? 'Enregistrer' : 'Ajouter le paiement'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default PaymentModal;
