/**
 * Modal liste des paiements d'une facture
 * Affiche tous les paiements avec possibilité de voir les preuves
 */

import { useState, useEffect } from 'react';
import {
  CreditCard,
  Eye,
  Edit2,
  Trash2,
  Loader2,
  FileText,
  Image,
  ExternalLink,
} from 'lucide-react';
import { Modal } from '@/components/aura/Modal';
import { Button } from '@/components/aura/Button';
import { Badge } from '@/components/aura/Badge';
import { Card, CardBody } from '@/components/aura/Card';
import type { Payment, InvoiceWithRelations } from '../financeTypes';
import { PAYMENT_TYPE_LABELS } from '../financeTypes';
import { formatCurrency } from '../currencyUtils';
import { fetchPaymentsByInvoice, getPaymentProofUrl } from '../paymentApi';

interface PaymentListModalProps {
  open: boolean;
  onClose: () => void;
  invoice: InvoiceWithRelations | null;
  onEditPayment?: (payment: Payment) => void;
  onDeletePayment?: (payment: Payment) => void;
}

export function PaymentListModal({
  open,
  onClose,
  invoice,
  onEditPayment,
  onDeletePayment,
}: PaymentListModalProps) {
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [viewingPop, setViewingPop] = useState<string | null>(null);
  const [popLoading, setPopLoading] = useState(false);

  // Charger les paiements
  useEffect(() => {
    if (open && invoice) {
      setLoading(true);
      fetchPaymentsByInvoice(invoice.id)
        .then(setPayments)
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [open, invoice]);

  // Voir la preuve de paiement
  const handleViewPop = async (payment: Payment) => {
    if (!payment.pop_url) return;

    setPopLoading(true);
    try {
      const url = await getPaymentProofUrl(payment.pop_url);
      setViewingPop(url);
    } catch (err) {
      console.error('Erreur chargement POP:', err);
    } finally {
      setPopLoading(false);
    }
  };

  // Fermer le viewer POP
  const closePop = () => setViewingPop(null);

  // Calculer les totaux
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const remaining = invoice ? invoice.amount_incl - totalPaid : 0;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Paiements - ${invoice?.reference || ''}`}
      size="lg"
    >
      {/* Info facture */}
      {invoice && (
        <div className="mb-4 p-3 bg-gray-800/50 rounded-lg border border-gray-700">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-400">Fournisseur</p>
              <p className="font-medium text-white">{invoice.supplier_name}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-400">Montant facture</p>
              <p className="font-medium text-white">
                {formatCurrency(invoice.amount_incl, invoice.currency)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Liste des paiements */}
      <div className="space-y-3 max-h-[50vh] overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 text-violet-400 animate-spin" />
          </div>
        ) : payments.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <CreditCard className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p>Aucun paiement enregistré</p>
          </div>
        ) : (
          payments.map((payment) => (
            <Card key={payment.id}>
              <CardBody className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-500/10 rounded-lg">
                      <CreditCard className="w-5 h-5 text-green-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-white">
                          {formatCurrency(payment.amount, payment.currency as any)}
                        </span>
                        <Badge color="gray">
                          {PAYMENT_TYPE_LABELS[payment.payment_type] || payment.payment_type}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-400">
                        {new Date(payment.payment_date).toLocaleDateString('fr-FR')}
                        {payment.notes && ` - ${payment.notes}`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    {/* Voir POP */}
                    {payment.pop_url && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewPop(payment)}
                        title="Voir la preuve"
                        disabled={popLoading}
                      >
                        {popLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Eye className="w-4 h-4 text-violet-400" />
                        )}
                      </Button>
                    )}

                    {/* Éditer */}
                    {onEditPayment && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEditPayment(payment)}
                        title="Modifier"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                    )}

                    {/* Supprimer */}
                    {onDeletePayment && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDeletePayment(payment)}
                        title="Supprimer"
                        className="text-red-500 hover:text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardBody>
            </Card>
          ))
        )}
      </div>

      {/* Résumé */}
      {payments.length > 0 && invoice && (
        <div className="mt-4 pt-4 border-t border-gray-700">
          <div className="flex justify-between items-center">
            <span className="text-gray-400">Total payé</span>
            <span className="font-medium text-green-400">
              {formatCurrency(totalPaid, invoice.currency)}
            </span>
          </div>
          <div className="flex justify-between items-center mt-1">
            <span className="text-gray-400">Reste à payer</span>
            <span
              className={`font-medium ${
                remaining <= 0 ? 'text-green-400' : 'text-orange-400'
              }`}
            >
              {remaining <= 0
                ? 'Soldé'
                : formatCurrency(remaining, invoice.currency)}
            </span>
          </div>
        </div>
      )}

      {/* Modal viewer POP */}
      {viewingPop && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-[1200]"
          onClick={closePop}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] w-full m-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Barre d'outils */}
            <div className="absolute top-0 right-0 flex gap-2 p-2 z-10">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => window.open(viewingPop, '_blank')}
              >
                <ExternalLink className="w-4 h-4 mr-1" />
                Ouvrir
              </Button>
              <Button variant="secondary" size="sm" onClick={closePop}>
                Fermer
              </Button>
            </div>

            {/* Contenu */}
            {viewingPop.includes('.pdf') || viewingPop.includes('application/pdf') ? (
              <iframe
                src={viewingPop}
                className="w-full h-[80vh] rounded-lg bg-white"
                title="Preuve de paiement"
              />
            ) : (
              <img
                src={viewingPop}
                alt="Preuve de paiement"
                className="max-w-full max-h-[80vh] mx-auto rounded-lg"
              />
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}

export default PaymentListModal;
