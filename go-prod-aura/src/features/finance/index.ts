/**
 * Module Finance - Exports
 */

// Types (renamed to avoid conflict with FinanceKpis component)
export type { FinanceKpis as FinanceKpisData } from './financeTypes';
export {
  type CurrencyCode,
  type InvoiceStatus,
  type ExternalInvoiceStatus,
  type PaymentType,
  type TaxTreatment,
  type InvoiceFileKind,
  type InvoiceAction,
  type InvoiceCategory,
  type Invoice,
  type InvoiceWithRelations,
  type Payment,
  type InvoiceFile,
  type InvoiceActivityLog,
  type InvoiceFormData,
  type PaymentFormData,
  type InvoiceCategoryFormData,
  type DailyFinanceKpis,
  type FinanceSelectOptions,
  type InvoiceFilters,
  type InvoiceSort,
  CURRENCIES,
  CURRENCY_SYMBOLS,
  INVOICE_STATUS_LABELS,
  INVOICE_STATUS_COLORS,
  PAYMENT_TYPE_LABELS,
  TAX_TREATMENT_LABELS,
  FILE_KIND_LABELS,
} from './financeTypes';

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
