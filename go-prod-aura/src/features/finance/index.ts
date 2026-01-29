/**
 * Module Finance - Exports
 */

// Types
export * from './financeTypes';

// API Factures
export {
  fetchInvoices,
  fetchInvoiceById,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  updateInvoiceStatus,
  uploadInvoiceFile,
  getInvoiceFileUrl,
  deleteInvoiceFile,
  fetchInvoiceFiles,
  fetchInvoiceCategories,
  createInvoiceCategory,
  fetchFinanceKpis,
  fetchDailyFinanceKpis,
  fetchSelectOptions,
  fetchInvoiceActivityLog,
} from './financeApi';

// API Paiements
export {
  fetchPayments,
  fetchPaymentsByInvoice,
  createPayment,
  updatePayment,
  deletePayment,
  uploadPaymentProof,
  getPaymentProofUrl,
  deletePaymentProof,
} from './paymentApi';

// Utilitaires
export {
  formatAmount,
  formatCurrency,
  formatCurrencySafe,
  formatCompact,
  parseAmount,
  calculatePercentage,
  formatPercentage,
  getAmountColorClass,
  formatAmountWithSign,
  aggregateByCurrency,
  formatMultiCurrency,
} from './currencyUtils';

// Composants
export * from './components';
