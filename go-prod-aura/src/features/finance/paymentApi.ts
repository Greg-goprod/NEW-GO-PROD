/**
 * API pour la gestion des paiements
 * Toutes les opérations sont filtrées par company_id et event_id
 */

import { supabase } from '@/lib/supabaseClient';
import type {
  Payment,
  PaymentFormData,
  InvoiceStatus,
} from './financeTypes';

// =============================================================================
// PAIEMENTS - CRUD
// =============================================================================

/**
 * Récupère tous les paiements pour un événement
 */
export async function fetchPayments(params: {
  companyId: string;
  eventId: string;
}): Promise<Payment[]> {
  const { companyId, eventId } = params;

  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('company_id', companyId)
    .eq('event_id', eventId)
    .order('payment_date', { ascending: false });

  if (error) {
    console.error('Erreur fetchPayments:', error);
    throw new Error(error.message);
  }

  return data || [];
}

/**
 * Récupère les paiements d'une facture spécifique
 */
export async function fetchPaymentsByInvoice(invoiceId: string): Promise<Payment[]> {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('invoice_id', invoiceId)
    .order('payment_date', { ascending: false });

  if (error) {
    console.error('Erreur fetchPaymentsByInvoice:', error);
    throw new Error(error.message);
  }

  return data || [];
}

/**
 * Crée un nouveau paiement
 */
export async function createPayment(params: {
  invoiceId: string;
  companyId: string;
  eventId: string;
  data: PaymentFormData;
}): Promise<Payment> {
  const { invoiceId, companyId, eventId, data } = params;

  // Créer le paiement
  const { data: payment, error } = await supabase
    .from('payments')
    .insert({
      invoice_id: invoiceId,
      company_id: companyId,
      event_id: eventId,
      payment_date: data.payment_date,
      amount: data.amount,
      currency: data.currency,
      payment_type: data.payment_type,
      notes: data.notes,
    })
    .select()
    .single();

  if (error) {
    console.error('Erreur createPayment:', error);
    throw new Error(error.message);
  }

  // Upload de la preuve de paiement si fournie
  if (data.pop_file && payment) {
    const popUrl = await uploadPaymentProof(payment.id, data.pop_file);
    
    // Mettre à jour le paiement avec l'URL de la preuve
    await supabase
      .from('payments')
      .update({ pop_url: popUrl })
      .eq('id', payment.id);
    
    payment.pop_url = popUrl;
  }

  // Mettre à jour le statut de la facture
  await updateInvoiceStatusAfterPayment(invoiceId);

  // Log de l'action
  await logPaymentActivity({
    invoiceId,
    companyId,
    eventId,
    action: 'payment_added',
    meta: { payment_id: payment.id, amount: data.amount },
  });

  return payment;
}

/**
 * Met à jour un paiement existant
 */
export async function updatePayment(params: {
  paymentId: string;
  invoiceId: string;
  companyId: string;
  eventId: string;
  data: Partial<PaymentFormData>;
}): Promise<Payment> {
  const { paymentId, invoiceId, companyId, eventId, data } = params;

  const updateData: Record<string, unknown> = {};
  if (data.payment_date !== undefined) updateData.payment_date = data.payment_date;
  if (data.amount !== undefined) updateData.amount = data.amount;
  if (data.currency !== undefined) updateData.currency = data.currency;
  if (data.payment_type !== undefined) updateData.payment_type = data.payment_type;
  if (data.notes !== undefined) updateData.notes = data.notes;

  const { data: payment, error } = await supabase
    .from('payments')
    .update(updateData)
    .eq('id', paymentId)
    .eq('company_id', companyId)
    .select()
    .single();

  if (error) {
    console.error('Erreur updatePayment:', error);
    throw new Error(error.message);
  }

  // Upload de la nouvelle preuve de paiement si fournie
  if (data.pop_file) {
    // Supprimer l'ancienne preuve si elle existe
    if (payment.pop_url) {
      await deletePaymentProofByUrl(payment.pop_url);
    }
    
    const popUrl = await uploadPaymentProof(paymentId, data.pop_file);
    
    await supabase
      .from('payments')
      .update({ pop_url: popUrl })
      .eq('id', paymentId);
    
    payment.pop_url = popUrl;
  }

  // Mettre à jour le statut de la facture
  await updateInvoiceStatusAfterPayment(invoiceId);

  // Log de l'action
  await logPaymentActivity({
    invoiceId,
    companyId,
    eventId,
    action: 'payment_updated',
    meta: { payment_id: paymentId, changes: Object.keys(data) },
  });

  return payment;
}

/**
 * Supprime un paiement
 */
export async function deletePayment(params: {
  paymentId: string;
  invoiceId: string;
  companyId: string;
  eventId: string;
}): Promise<void> {
  const { paymentId, invoiceId, companyId, eventId } = params;

  // Récupérer le paiement pour supprimer la preuve de paiement
  const { data: payment } = await supabase
    .from('payments')
    .select('pop_url')
    .eq('id', paymentId)
    .single();

  // Supprimer la preuve de paiement si elle existe
  if (payment?.pop_url) {
    await deletePaymentProofByUrl(payment.pop_url);
  }

  const { error } = await supabase
    .from('payments')
    .delete()
    .eq('id', paymentId)
    .eq('company_id', companyId);

  if (error) {
    console.error('Erreur deletePayment:', error);
    throw new Error(error.message);
  }

  // Mettre à jour le statut de la facture
  await updateInvoiceStatusAfterPayment(invoiceId);

  // Log de l'action
  await logPaymentActivity({
    invoiceId,
    companyId,
    eventId,
    action: 'payment_deleted',
    meta: { payment_id: paymentId },
  });
}

// =============================================================================
// PREUVES DE PAIEMENT (POP)
// =============================================================================

/**
 * Upload une preuve de paiement
 */
export async function uploadPaymentProof(
  paymentId: string,
  file: File
): Promise<string> {
  const fileExt = file.name.split('.').pop();
  const fileName = `${paymentId}/pop_${Date.now()}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from('payment-proofs')
    .upload(fileName, file);

  if (uploadError) {
    console.error('Erreur upload preuve de paiement:', uploadError);
    throw new Error(uploadError.message);
  }

  return fileName;
}

/**
 * Récupère l'URL signée d'une preuve de paiement
 */
export async function getPaymentProofUrl(filePath: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from('payment-proofs')
    .createSignedUrl(filePath, 3600); // 1 heure

  if (error) {
    throw new Error(error.message);
  }

  return data.signedUrl;
}

/**
 * Supprime une preuve de paiement par son chemin
 */
export async function deletePaymentProof(filePath: string): Promise<void> {
  const { error } = await supabase.storage
    .from('payment-proofs')
    .remove([filePath]);

  if (error) {
    console.error('Erreur suppression preuve de paiement:', error);
  }
}

/**
 * Supprime une preuve de paiement par son URL
 */
async function deletePaymentProofByUrl(url: string): Promise<void> {
  // L'URL peut être soit un chemin direct, soit une URL signée
  // On extrait le chemin du fichier
  const filePath = url.includes('payment-proofs/')
    ? url.split('payment-proofs/')[1]?.split('?')[0]
    : url;

  if (filePath) {
    await deletePaymentProof(filePath);
  }
}

// =============================================================================
// MISE A JOUR AUTOMATIQUE DU STATUT FACTURE
// =============================================================================

/**
 * Met à jour le statut de la facture après un changement de paiement
 * Logique:
 * - Si total payé >= montant facture -> 'paid'
 * - Si total payé > 0 mais < montant facture -> 'partial'
 * - Si total payé = 0 -> 'to_pay'
 */
async function updateInvoiceStatusAfterPayment(invoiceId: string): Promise<void> {
  // Récupérer la facture et ses paiements
  const { data: invoice } = await supabase
    .from('invoices')
    .select('amount_incl, status')
    .eq('id', invoiceId)
    .single();

  if (!invoice) return;

  const { data: payments } = await supabase
    .from('payments')
    .select('amount')
    .eq('invoice_id', invoiceId);

  const totalPaid = (payments || []).reduce(
    (sum, p) => sum + (p.amount || 0),
    0
  );
  const invoiceAmount = invoice.amount_incl || 0;

  let newStatus: InvoiceStatus;
  if (totalPaid >= invoiceAmount) {
    newStatus = 'paid';
  } else if (totalPaid > 0) {
    newStatus = 'partial';
  } else {
    newStatus = 'to_pay';
  }

  // Ne mettre à jour que si le statut change
  if (newStatus !== invoice.status) {
    await supabase
      .from('invoices')
      .update({ status: newStatus })
      .eq('id', invoiceId);
  }
}

// =============================================================================
// ACTIVITY LOG
// =============================================================================

/**
 * Enregistre une action de paiement dans le journal d'activité
 */
async function logPaymentActivity(params: {
  invoiceId: string;
  companyId: string;
  eventId: string;
  action: string;
  meta?: Record<string, unknown>;
}): Promise<void> {
  const { invoiceId, companyId, eventId, action, meta } = params;

  try {
    await supabase.from('invoice_activity_log').insert({
      invoice_id: invoiceId,
      company_id: companyId,
      event_id: eventId,
      action,
      meta,
    });
  } catch (err) {
    // Log silencieux - ne pas bloquer l'opération principale
    console.error('Erreur log activité paiement:', err);
  }
}
