/**
 * API pour l'extraction automatique des donnees de factures via IA (Gemini)
 * Utilise la Edge Function extract-invoice
 * 
 * V2: Support etendu des donnees entreprise et bancaires par pays
 */

import { supabase } from '@/lib/supabaseClient';

// =============================================================================
// Types
// =============================================================================

// Donnees bancaires specifiques par pays
export interface BankingData {
  // Commun Europe (SEPA)
  iban: string | null;
  swift_bic: string | null;
  bank_name: string | null;
  
  // USA
  routing_number: string | null;      // ABA Routing Number
  account_number: string | null;      // Bank account number
  
  // Canada
  institution_number: string | null;  // 3 digits
  transit_number: string | null;      // 5 digits
  
  // UK
  sort_code: string | null;           // 6 digits (XX-XX-XX)
  
  // Australie
  bsb_code: string | null;            // 6 digits (XXX-XXX)
}

// Donnees fournisseur etendues
export interface SupplierData {
  // Identification
  company_name: string | null;
  legal_form: string | null;          // SA, SARL, SAS, GmbH, Ltd, etc.
  
  // Adresse
  address_line1: string | null;
  address_line2: string | null;
  postal_code: string | null;
  city: string | null;
  state_province: string | null;
  country: string | null;
  country_code: string | null;        // ISO 2 lettres (FR, CH, US, etc.)
  
  // Contact
  email: string | null;
  phone: string | null;
  website: string | null;
  
  // Identifiants fiscaux/legaux par pays
  vat_number: string | null;          // N TVA (format EU: XX123456789)
  tax_id: string | null;              // IDE/EIN/TIN generique
  
  // Identifiants specifiques France
  siret: string | null;               // France (14 chiffres)
  siren: string | null;               // France (9 chiffres)
  rcs_city: string | null;            // France - Ville RCS (ex: "PARIS")
  ape_code: string | null;            // France - Code APE/NAF (ex: "9001Z")
  capital_social: string | null;      // France - Capital social
  
  // Identifiants specifiques autres pays
  ide: string | null;                 // Suisse (CHE-123.456.789)
  uid: string | null;                 // Autriche (ATU12345678)
  handelsregister: string | null;     // Allemagne (HRB 12345)
  companies_house: string | null;     // UK (12345678)
  kvk: string | null;                 // Pays-Bas (12345678)
  abn: string | null;                 // Australie (12 345 678 901)
  ein: string | null;                 // USA (12-3456789)
  business_number: string | null;     // Canada (123456789RC0001)
  
  // Coordonnees bancaires
  banking: BankingData;
}

export interface ExtractedInvoiceData {
  // Fournisseur (donnees etendues)
  supplier: SupplierData;
  
  // Legacy fields (pour compatibilite)
  supplier_name: string | null;
  supplier_address: string | null;
  supplier_vat_number: string | null;
  
  // Facture
  invoice_number: string | null;
  invoice_date: string | null;        // YYYY-MM-DD
  due_date: string | null;            // YYYY-MM-DD
  payment_terms: string | null;       // Ex: "30 jours", "Net 60"
  
  // Montants
  currency: 'EUR' | 'CHF' | 'USD' | 'GBP' | 'CAD' | 'AUD' | string;
  amount_excl_tax: number | null;     // HT
  tax_rate: number | null;
  tax_amount: number | null;
  amount_incl_tax: number | null;     // TTC
  
  // Lignes de detail
  line_items: {
    description: string;
    quantity: number | null;
    unit_price: number | null;
    total: number;
  }[];
  
  // Metadonnees
  confidence_score: number;           // 0-100
  extraction_notes: string | null;
  detected_country: string | null;    // Code ISO du pays detecte
}

export interface ExtractResult {
  success: boolean;
  data?: ExtractedInvoiceData;
  error?: string;
}

// =============================================================================
// Fonctions utilitaires
// =============================================================================

/**
 * Convertit un fichier en base64
 */
export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      // Retirer le prefix "data:application/pdf;base64,"
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
}

/**
 * Determine le type MIME d'un fichier
 */
export function getFileMimeType(file: File): string {
  const mimeType = file.type;
  
  // Types supportes par Gemini Vision
  const supportedTypes = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
  ];
  
  if (supportedTypes.includes(mimeType)) {
    return mimeType;
  }
  
  // Fallback basé sur l'extension
  const extension = file.name.split('.').pop()?.toLowerCase();
  switch (extension) {
    case 'pdf':
      return 'application/pdf';
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'webp':
      return 'image/webp';
    default:
      return 'application/pdf';
  }
}

// =============================================================================
// API principale
// =============================================================================

/**
 * Extrait les donnees d'une facture via l'IA Gemini
 * 
 * @param file - Fichier PDF ou image de la facture
 * @returns Les donnees extraites ou une erreur
 */
export async function extractInvoiceData(file: File): Promise<ExtractResult> {
  try {
    // Verifier la taille du fichier (max 20MB)
    const maxSize = 20 * 1024 * 1024;
    if (file.size > maxSize) {
      return {
        success: false,
        error: `Fichier trop volumineux (${Math.round(file.size / 1024 / 1024)}MB). Maximum: 20MB`,
      };
    }

    // Convertir en base64
    console.log('[extractInvoiceData] Conversion en base64...');
    const base64 = await fileToBase64(file);
    const mimeType = getFileMimeType(file);

    console.log(`[extractInvoiceData] Fichier: ${file.name}, Type: ${mimeType}, Taille: ${Math.round(file.size / 1024)}KB`);

    // Appeler la Edge Function
    console.log('[extractInvoiceData] Appel Edge Function extract-invoice...');
    const startTime = Date.now();

    const { data, error } = await supabase.functions.invoke('extract-invoice', {
      body: {
        pdfBase64: base64,
        mimeType: mimeType,
      },
    });

    const elapsed = Date.now() - startTime;
    console.log(`[extractInvoiceData] Reponse en ${elapsed}ms`);

    if (error) {
      console.error('[extractInvoiceData] Erreur Supabase:', error);
      return {
        success: false,
        error: error.message || 'Erreur lors de l\'appel au service d\'extraction',
      };
    }

    if (!data.success) {
      console.error('[extractInvoiceData] Erreur extraction:', data.error);
      return {
        success: false,
        error: data.error || 'Erreur lors de l\'extraction des donnees',
      };
    }

    console.log('[extractInvoiceData] Extraction reussie:', {
      supplier: data.data?.supplier_name,
      amount: data.data?.amount_incl_tax,
      confidence: data.data?.confidence_score,
    });

    return {
      success: true,
      data: data.data,
    };

  } catch (error: any) {
    console.error('[extractInvoiceData] Erreur:', error);
    return {
      success: false,
      error: error.message || 'Erreur inattendue lors de l\'extraction',
    };
  }
}

/**
 * Valide si un fichier est supporté pour l'extraction
 */
export function isFileSupported(file: File): { valid: boolean; error?: string } {
  const supportedExtensions = ['pdf', 'jpg', 'jpeg', 'png', 'webp'];
  const extension = file.name.split('.').pop()?.toLowerCase();
  
  if (!extension || !supportedExtensions.includes(extension)) {
    return {
      valid: false,
      error: `Format non supporté. Utilisez: ${supportedExtensions.join(', ')}`,
    };
  }

  const maxSize = 20 * 1024 * 1024;
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `Fichier trop volumineux (max 20MB)`,
    };
  }

  return { valid: true };
}
