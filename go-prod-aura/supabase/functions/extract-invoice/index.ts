// deno-lint-ignore-file no-explicit-any
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

/**
 * Edge Function: extract-invoice
 * Utilise Gemini pour extraire les donnees d'une facture PDF/Image
 * 
 * Usage: POST /functions/v1/extract-invoice
 * Body: { pdfBase64: string, mimeType?: string }
 * 
 * Retourne les donnees extraites de la facture au format JSON
 */

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";

console.log("[extract-invoice] v10 - Extraction complete avec validation stricte");

// =============================================================================
// CORS Headers
// =============================================================================
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// =============================================================================
// Types
// =============================================================================
interface ExtractRequest {
  pdfBase64: string;      // PDF encode en base64
  mimeType?: string;      // application/pdf ou image/jpeg, image/png
  language?: string;      // fr, en, de (optionnel, detection auto)
}

// Donnees bancaires specifiques par pays
interface BankingData {
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
interface SupplierData {
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
  capital_social: string | null;      // France - Capital social (ex: "200000")
  
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

interface ExtractedInvoiceData {
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
  tax_rate: number | null;            // Ex: 20, 7.7, 8.1
  tax_amount: number | null;          // Montant TVA
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
  extraction_notes: string | null;    // Anomalies detectees
  detected_country: string | null;    // Pays detecte du fournisseur
}

interface ExtractResponse {
  success: boolean;
  data?: ExtractedInvoiceData;
  error?: string;
  raw_response?: string;              // Pour debug
}

// =============================================================================
// Prompt optimise pour l'extraction de factures - Structure claire et directe
// =============================================================================

// Prompt d'analyse optimise pour l'extraction de factures - Precis et strict
const ANALYSIS_PROMPT = `You are an expert invoice data extractor. Read EVERY part of this document carefully: header, body, footer, and fine print.

=== CRITICAL RULES ===

1. IBAN vs SIRET/SIREN:
   - IBAN ALWAYS starts with 2 LETTERS + 2 DIGITS (FR76, DE89, CH93...)
   - IBAN example: FR76 1820 6004 2860 2892 5035 304
   - The numbers INSIDE an IBAN are NOT tax IDs!
   - SIRET = exactly 14 digits, labeled "SIRET"
   - SIREN = exactly 9 digits, usually after "RCS [City]"
   - If you don't see "SIRET" label, set siret to null

2. French Footer Pattern (READ CAREFULLY):
   Look for text like: "[Name] - [Legal form] au Capital de [X] euros - RCS [City] [9 digits] - APE [code] - TVA CEE [FR number]"
   Extract:
   - legal_form: SAS, SARL, SA, etc.
   - capital_social: number only (e.g., 200000)
   - rcs_city: city name after RCS (e.g., PARIS)
   - siren: 9 digits after RCS [City]
   - ape_code: 4 digits + 1 letter (e.g., 9001Z)
   - vat_number: starts with FR (e.g., FR42393556170)

3. VAT Number MUST have country prefix:
   - France: FR + 11 chars (e.g., FR42393556170)
   - Germany: DE + 9 digits
   - Belgium: BE + 10 digits
   - Switzerland: CHE-xxx.xxx.xxx
   - UK: GB + 9-12 digits
   - Pure digits alone are NOT a VAT number!

4. Currency: Look at the amounts shown (EUR, CHF, USD, GBP, €, $, £)

5. Bank Name: Look for "Domiciliation:" or "Bank:" before IBAN

6. Phone: Keep original format (e.g., 01 55 07 45 00)

7. Country Detection: 
   - Look at the address (FRANCE, Germany, etc.)
   - Look at postal code format
   - Look at phone format
   - Look at VAT number prefix

=== OUTPUT FORMAT ===
Return ONLY valid JSON (no markdown):
{
  "supplier": {
    "company_name": "Exact company name from document",
    "legal_form": "SAS/SARL/SA/GmbH/Ltd or null",
    "address_line1": "Street address",
    "address_line2": "null if not present",
    "postal_code": "Postal code",
    "city": "City name",
    "state_province": "null",
    "country": "France/Germany/etc",
    "country_code": "FR/DE/GB/CH/US",
    "email": "null if not on document",
    "phone": "Phone as shown on document or null",
    "website": "Website URL or null",
    "vat_number": "WITH FR/DE/GB prefix or null",
    "tax_id": "null",
    "siret": "14 digits ONLY if labeled SIRET, else null",
    "siren": "9 digits from RCS or null",
    "rcs_city": "City after RCS or null",
    "ape_code": "APE code or null",
    "capital_social": "Number only or null",
    "ide": "CHE-xxx.xxx.xxx or null",
    "uid": "null",
    "handelsregister": "null",
    "companies_house": "null",
    "kvk": "null",
    "abn": "null",
    "ein": "null",
    "business_number": "null",
    "banking": {
      "iban": "Full IBAN or null",
      "swift_bic": "BIC code or null",
      "bank_name": "Bank name from Domiciliation or null",
      "routing_number": "null",
      "account_number": "null",
      "institution_number": "null",
      "transit_number": "null",
      "sort_code": "null",
      "bsb_code": "null"
    }
  },
  "supplier_name": "Same as company_name",
  "supplier_address": "Full address as one string",
  "supplier_vat_number": "Same as vat_number",
  "invoice_number": "Invoice number",
  "invoice_date": "YYYY-MM-DD",
  "due_date": "YYYY-MM-DD or null",
  "payment_terms": "null",
  "currency": "EUR/CHF/USD/GBP",
  "amount_excl_tax": number or null,
  "tax_rate": number or null,
  "tax_amount": number or null,
  "amount_incl_tax": number,
  "line_items": [],
  "confidence_score": 85,
  "extraction_notes": "Any issues",
  "detected_country": "FR/DE/CH/GB/US"
}`;

// =============================================================================
// Lister les modeles disponibles
// =============================================================================
async function getAvailableModel(): Promise<string> {
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY non configuree");
  }

  console.log("[extract-invoice] Recherche d'un modele compatible...");
  
  const response = await fetch(`${GEMINI_API_BASE}/models?key=${GEMINI_API_KEY}`);
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[extract-invoice] Erreur API models: ${response.status} - ${errorText}`);
    throw new Error(`Erreur lors de la liste des modeles: ${response.status}`);
  }
  
  const data = await response.json();
  
  console.log(`[extract-invoice] ${data.models?.length || 0} modeles trouves`);
  
  // Logger tous les modeles disponibles
  if (data.models) {
    data.models.forEach((model: any) => {
      console.log(`  - ${model.name} (methods: ${model.supportedGenerationMethods?.join(', ') || 'none'})`);
    });
  }
  
  // Chercher un modele qui supporte generateContent (peu importe le nom)
  const compatibleModel = data.models?.find((model: any) => 
    model.supportedGenerationMethods?.includes('generateContent')
  );
  
  if (!compatibleModel) {
    throw new Error("Aucun modele Gemini compatible trouve. Verifiez votre cle API.");
  }
  
  console.log(`[extract-invoice] Modele selectionne: ${compatibleModel.name}`);
  return compatibleModel.name;
}

// =============================================================================
// Appel a l'API Gemini - Appel unique avec prompt optimise
// =============================================================================
async function callGeminiVision(
  pdfBase64: string, 
  mimeType: string
): Promise<ExtractedInvoiceData> {
  
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY non configuree. Ajoutez-la dans les secrets Supabase.");
  }

  // Obtenir un modele compatible
  const modelName = await getAvailableModel();
  
  console.log("[extract-invoice] Extraction avec prompt optimise...");
  const startTime = Date.now();

  // Construire le prompt final avec instructions tres explicites
  const finalPrompt = ANALYSIS_PROMPT;

  const requestBody = {
    contents: [
      {
        parts: [
          {
            inline_data: {
              mime_type: mimeType,
              data: pdfBase64
            }
          },
          {
            text: finalPrompt
          }
        ]
      }
    ],
    generationConfig: {
      temperature: 0,              // Temperature 0 pour extraction deterministe
      topK: 1,                     // Reponse la plus probable
      topP: 1,
      maxOutputTokens: 8192,
    },
    safetySettings: [
      { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
    ]
  };

  const geminiUrl = `${GEMINI_API_BASE}/${modelName}:generateContent`;
  console.log(`[extract-invoice] URL: ${geminiUrl}`);

  const response = await fetch(`${geminiUrl}?key=${GEMINI_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestBody),
  });

  const elapsed = Date.now() - startTime;
  console.log(`[extract-invoice] Reponse Gemini en ${elapsed}ms`);

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[extract-invoice] Erreur Gemini:", errorText);
    throw new Error(`Erreur Gemini API: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  const textContent = result.candidates?.[0]?.content?.parts?.[0]?.text;
  
  if (!textContent) {
    console.error("[extract-invoice] Reponse vide de Gemini:", JSON.stringify(result));
    throw new Error("Reponse vide de Gemini. Le document est peut-etre illisible.");
  }

  console.log("[extract-invoice] Reponse brute (500 premiers chars):", textContent.substring(0, 500));

  // Nettoyer et parser le JSON
  const parsedData = parseGeminiResponse(textContent);
  
  // Post-traitement: extraire SIRET/TVA des textes bruts si non trouves
  const enhancedData = postProcessExtraction(parsedData);
  
  return enhancedData;
}

// =============================================================================
// Parser la reponse Gemini
// =============================================================================
function parseGeminiResponse(textContent: string): any {
  let cleanedJson = textContent
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  // Trouver le JSON dans la reponse
  const jsonMatch = cleanedJson.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    cleanedJson = jsonMatch[0];
  }

  try {
    return JSON.parse(cleanedJson);
  } catch (parseError) {
    console.error("[extract-invoice] Erreur parsing JSON:", parseError);
    console.error("[extract-invoice] JSON brut:", cleanedJson.substring(0, 1000));
    throw new Error(`Impossible de parser la reponse JSON: ${parseError}`);
  }
}

// =============================================================================
// Post-traitement: Extraction regex des identifiants fiscaux
// =============================================================================
function postProcessExtraction(data: any): ExtractedInvoiceData {
  // Collecter tous les textes de la reponse pour recherche regex
  const allText = JSON.stringify(data);
  
  // Initialiser supplier si necessaire
  if (!data.supplier) data.supplier = {};
  if (!data.supplier.banking) data.supplier.banking = {};
  
  // =========================================================================
  // CORRECTION: Detecter et supprimer les placeholders
  // =========================================================================
  const placeholderPatterns = [
    /^1234567890\d*$/,      // 12345678901234
    /^0{9,14}$/,            // 00000000000000
    /^9{9,14}$/,            // 99999999999999
    /^(12)+\d*$/,           // 121212121212
  ];
  
  const isPlaceholder = (value: string | null): boolean => {
    if (!value) return false;
    const clean = value.replace(/[\s.-]/g, '');
    return placeholderPatterns.some(p => p.test(clean));
  };
  
  if (isPlaceholder(data.supplier.siret)) {
    console.log("[extract-invoice] Suppression placeholder SIRET:", data.supplier.siret);
    data.supplier.siret = null;
  }
  if (isPlaceholder(data.supplier.siren)) {
    console.log("[extract-invoice] Suppression placeholder SIREN:", data.supplier.siren);
    data.supplier.siren = null;
  }
  if (isPlaceholder(data.supplier.vat_number)) {
    console.log("[extract-invoice] Suppression placeholder VAT:", data.supplier.vat_number);
    data.supplier.vat_number = null;
  }
  
  // =========================================================================
  // CORRECTION: Detecter si SIRET/SIREN provient de l'IBAN (erreur frequente)
  // L'IBAN contient des chiffres qui ne sont PAS des identifiants fiscaux
  // Exemple: FR76 1820 6004 2860 2892 5035 304 -> les chiffres apres FR76 ne sont PAS le SIRET
  // =========================================================================
  const ibanValue = data.supplier.banking?.iban?.replace(/\s/g, '') || '';
  const ibanDigits = ibanValue.replace(/[^0-9]/g, ''); // Extraire tous les chiffres de l'IBAN
  
  // Fonction pour verifier si une valeur provient de l'IBAN
  const isFromIban = (value: string | null): boolean => {
    if (!value || !ibanDigits) return false;
    const cleanValue = value.replace(/[\s.-]/g, '');
    // Verifier si la valeur est une sous-chaine des chiffres de l'IBAN
    // ou si les chiffres de l'IBAN contiennent cette valeur
    return ibanDigits.includes(cleanValue) || cleanValue.includes(ibanDigits.slice(-14));
  };
  
  if (data.supplier.siret) {
    const siretClean = data.supplier.siret.replace(/[\s.-]/g, '');
    if (isFromIban(siretClean)) {
      console.log("[extract-invoice] ERREUR: SIRET extrait de l'IBAN, suppression:", siretClean);
      data.supplier.siret = null;
    }
  }
  
  if (data.supplier.siren) {
    const sirenClean = data.supplier.siren.replace(/[\s.-]/g, '');
    if (isFromIban(sirenClean)) {
      console.log("[extract-invoice] ERREUR: SIREN extrait de l'IBAN, suppression:", sirenClean);
      data.supplier.siren = null;
    }
  }
  
  // =========================================================================
  // CORRECTION: Si vat_number contient 14 chiffres, c'est un SIRET mal classe
  // =========================================================================
  if (data.supplier.vat_number) {
    const vatClean = data.supplier.vat_number.replace(/[\s.-]/g, '');
    // Si c'est 14 chiffres purs (pas de prefix pays), c'est un SIRET pas une TVA
    if (/^\d{14}$/.test(vatClean)) {
      console.log("[extract-invoice] Correction: vat_number contient un SIRET, deplacement");
      if (!data.supplier.siret && !isFromIban(vatClean)) {
        data.supplier.siret = vatClean;
        data.supplier.siren = vatClean.substring(0, 9);
      }
      data.supplier.vat_number = null;
    }
    // Si c'est 9 chiffres purs, c'est un SIREN pas une TVA
    else if (/^\d{9}$/.test(vatClean)) {
      console.log("[extract-invoice] Correction: vat_number contient un SIREN, deplacement");
      if (!data.supplier.siren && !isFromIban(vatClean)) {
        data.supplier.siren = vatClean;
      }
      data.supplier.vat_number = null;
    }
  }
  
  // =========================================================================
  // CORRECTION: Si tax_id contient des chiffres de l'IBAN, supprimer
  // =========================================================================
  if (data.supplier.tax_id) {
    const taxIdClean = data.supplier.tax_id.replace(/[\s.-]/g, '');
    if (isFromIban(taxIdClean)) {
      console.log("[extract-invoice] ERREUR: tax_id extrait de l'IBAN, suppression");
      data.supplier.tax_id = null;
    } else if (/^\d{14}$/.test(taxIdClean)) {
      if (!data.supplier.siret && !isFromIban(taxIdClean)) {
        data.supplier.siret = taxIdClean;
        data.supplier.siren = taxIdClean.substring(0, 9);
      }
      data.supplier.tax_id = null;
    } else if (/^\d{9}$/.test(taxIdClean)) {
      if (!data.supplier.siren && !isFromIban(taxIdClean)) {
        data.supplier.siren = taxIdClean;
      }
      data.supplier.tax_id = null;
    }
  }
  
  // =========================================================================
  // EXTRACTION: TVA francaise avec format "TVA CEE FRxx xxxxxxxxx"
  // =========================================================================
  if (!data.supplier.vat_number) {
    const tvaCeePatterns = [
      /TVA\s*CEE\s*(FR[\s]?[A-Z0-9]{2}[\s]?\d{3}[\s]?\d{3}[\s]?\d{3})/i,
      /TVA\s*CEE\s*(FR[A-Z0-9]{2}\d{9})/i,
      /ID\s*TVA\s*(FR[\s]?[A-Z0-9]{2}[\s]?\d{3}[\s]?\d{3}[\s]?\d{3})/i,
      /TVA\s*:?\s*(FR[\s]?[A-Z0-9]{2}[\s]?\d{3}[\s]?\d{3}[\s]?\d{3})/i,
    ];
    
    for (const pattern of tvaCeePatterns) {
      const match = allText.match(pattern);
      if (match) {
        const vat = match[1].replace(/\s/g, '').toUpperCase();
        if (/^FR[A-Z0-9]{2}\d{9}$/.test(vat)) {
          console.log("[extract-invoice] TVA CEE FR trouvee:", vat);
          data.supplier.vat_number = vat;
          data.supplier.country_code = 'FR';
          break;
        }
      }
    }
  }
  
  // =========================================================================
  // EXTRACTION: RCS avec ville et numero (ex: "RCS PARIS 393 556 170")
  // =========================================================================
  const rcsMatch = allText.match(/RCS\s+([A-Z][A-Za-z\s-]+?)\s+(\d{3}[\s]?\d{3}[\s]?\d{3})/i);
  if (rcsMatch) {
    const rcsCity = rcsMatch[1].trim().toUpperCase();
    const rcsSiren = rcsMatch[2].replace(/\s/g, '');
    console.log("[extract-invoice] RCS trouve:", rcsCity, rcsSiren);
    
    // Verifier que ce n'est pas de l'IBAN
    if (!ibanValue.includes(rcsSiren)) {
      if (!data.supplier.rcs_city) {
        data.supplier.rcs_city = rcsCity;
      }
      if (!data.supplier.siren) {
        data.supplier.siren = rcsSiren;
      }
    }
  }
  
  // =========================================================================
  // EXTRACTION: Forme juridique (multilingue)
  // =========================================================================
  if (!data.supplier.legal_form) {
    const legalFormPatterns = [
      // French
      /\b(SAS|SARL|SA|EURL|SNC|SASU|SCI|SCOP|GIE)\s+au\s+[Cc]apital/i,
      /\-\s*(SAS|SARL|SA|EURL|SNC|SASU|SCI|SCOP|GIE)\s+/i,
      // German
      /\b(GmbH|AG|KG|OHG|UG|e\.K\.)\b/,
      // UK/US
      /\b(Ltd\.?|Limited|Inc\.?|Corp\.?|LLC|LLP|PLC)\b/i,
      // Swiss
      /\b(Sàrl|S\.à\.r\.l\.)\b/i,
      // Belgian/Dutch
      /\b(NV|BV|BVBA|VOF|CV)\b/,
      // Italian
      /\b(S\.?r\.?l\.?|S\.?p\.?a\.?|S\.?n\.?c\.?)\b/i,
      // Spanish
      /\b(S\.?L\.?|S\.?A\.?|S\.?L\.?U\.?)\b/,
    ];
    for (const pattern of legalFormPatterns) {
      const match = allText.match(pattern);
      if (match) {
        let form = match[1];
        // Normaliser
        form = form.replace(/\./g, '').toUpperCase();
        if (form === 'LIMITED') form = 'LTD';
        if (form === 'INCORPORATED') form = 'INC';
        console.log("[extract-invoice] Forme juridique trouvee:", form);
        data.supplier.legal_form = form;
        break;
      }
    }
  }
  
  // =========================================================================
  // EXTRACTION: Nom de la banque (multilingue)
  // =========================================================================
  if (!data.supplier.banking.bank_name) {
    const bankNamePatterns = [
      // French - Pattern specifique "Domiciliation : XXX - IBAN"
      /Domiciliation\s*:\s*([A-Z][A-Z\s]+?)(?:\s*-\s*IBAN|\s+IBAN)/i,
      /Domiciliation\s*:\s*([A-Z][A-Z\s]+?)(?=\s*-|\s*$)/i,
      /Banque\s*:\s*([A-Z][A-Za-z\s]+?)(?:\s*-|\s*IBAN|$)/i,
      // German
      /Bankverbindung\s*:\s*([A-Z][A-Za-z\s]+?)(?:\s*-|\s*IBAN|$)/i,
      /Bank\s*:\s*([A-Z][A-Za-z\s]+?)(?:\s*-|\s*IBAN|$)/i,
      // English
      /Bank\s*Name\s*:\s*([A-Z][A-Za-z\s]+?)(?:\s*-|\s*IBAN|\s*Account|$)/i,
      // French bank abbreviations
      /\b(CR\s+[A-Z][A-Z\s]+(?:DE\s+FRANCE)?|CA\s+[A-Z][A-Z\s]+|BNP\s+PARIBAS|SOCIETE\s+GENERALE|CIC|LCL|BRED|CREDIT\s+MUTUEL)\b/i,
      // Common bank names
      /\b(Credit Agricole|BNP Paribas|Societe Generale|HSBC|Barclays|Deutsche Bank|UBS|Credit Suisse|ING|Rabobank|ABN AMRO)\b/i,
    ];
    for (const pattern of bankNamePatterns) {
      const match = allText.match(pattern);
      if (match) {
        const bankName = match[1]?.trim() || match[0]?.trim();
        if (bankName && bankName.length > 2 && bankName.length < 60) {
          console.log("[extract-invoice] Nom banque trouve:", bankName);
          data.supplier.banking.bank_name = bankName;
          break;
        }
      }
    }
  }
  
  // =========================================================================
  // EXTRACTION: Forme juridique si non trouvee
  // =========================================================================
  if (!data.supplier.legal_form) {
    // Pattern pour footer français: "SAS au Capital" ou "- SAS -" ou "SARL au capital"
    const legalFormPatterns = [
      /\b(SAS|SARL|SA|EURL|SNC|SASU|SCI|SCOP)\s+au\s+[Cc]apital/i,
      /[\s\-]+(SAS|SARL|SA|EURL|SNC|SASU|SCI|SCOP)[\s\-]+/,
      /\b(GmbH|AG|KG|OHG|UG)\b/,
      /\b(Ltd\.?|Limited|Inc\.?|LLC|LLP|PLC)\b/i,
    ];
    for (const pattern of legalFormPatterns) {
      const match = allText.match(pattern);
      if (match) {
        let form = match[1].replace(/\./g, '').toUpperCase();
        console.log("[extract-invoice] Forme juridique trouvee:", form);
        data.supplier.legal_form = form;
        break;
      }
    }
  }
  
  // =========================================================================
  // EXTRACTION: Code APE/NAF (ex: "APE 9001Z")
  // =========================================================================
  if (!data.supplier.ape_code) {
    const apePatterns = [
      /(?:APE|NAF|Code\s*APE|Code\s*NAF)\s*:?\s*(\d{4}[A-Z])/i,
      /(\d{4}[A-Z])\s*(?:\(APE\)|APE|NAF)/i,
    ];
    for (const pattern of apePatterns) {
      const match = allText.match(pattern);
      if (match) {
        const ape = match[1].toUpperCase();
        console.log("[extract-invoice] Code APE trouve:", ape);
        data.supplier.ape_code = ape;
        break;
      }
    }
  }
  
  // =========================================================================
  // EXTRACTION: Capital social (ex: "Capital de 200 000 euros")
  // =========================================================================
  if (!data.supplier.capital_social) {
    const capitalPatterns = [
      /Capital\s*(?:social|de)?\s*:?\s*([\d\s]+)\s*(?:euros?|EUR|€)/i,
      /Capital\s*:?\s*([\d\s]+)\s*(?:euros?|EUR|€)/i,
    ];
    for (const pattern of capitalPatterns) {
      const match = allText.match(pattern);
      if (match) {
        const capital = match[1].replace(/\s/g, '');
        console.log("[extract-invoice] Capital social trouve:", capital);
        data.supplier.capital_social = capital;
        break;
      }
    }
  }
  
  // =========================================================================
  // CORRECTION: Devise - Detecter la vraie devise depuis le document
  // =========================================================================
  const currencyPatterns = [
    { pattern: /(?:Total|Montant|Amount|Betrag).*?(\d[\d\s,.]+)\s*(EUR|€)/i, currency: 'EUR' },
    { pattern: /(?:Total|Montant|Amount|Betrag).*?(\d[\d\s,.]+)\s*(USD|\$)/i, currency: 'USD' },
    { pattern: /(?:Total|Montant|Amount|Betrag).*?(\d[\d\s,.]+)\s*(GBP|£)/i, currency: 'GBP' },
    { pattern: /(?:Total|Montant|Amount|Betrag).*?(\d[\d\s,.]+)\s*(CHF)/i, currency: 'CHF' },
    { pattern: /(?:Total|Montant|Amount|Betrag).*?(\d[\d\s,.]+)\s*(CAD|C\$)/i, currency: 'CAD' },
    { pattern: /(?:Total|Montant|Amount|Betrag).*?(\d[\d\s,.]+)\s*(AUD|A\$)/i, currency: 'AUD' },
    { pattern: /(EUR|€)\s*(\d[\d\s,.]+)/i, currency: 'EUR' },
    { pattern: /(USD|\$)\s*(\d[\d\s,.]+)/i, currency: 'USD' },
    { pattern: /(GBP|£)\s*(\d[\d\s,.]+)/i, currency: 'GBP' },
  ];
  
  for (const { pattern, currency } of currencyPatterns) {
    if (allText.match(pattern)) {
      if (data.currency !== currency) {
        console.log(`[extract-invoice] Correction devise: ${data.currency} -> ${currency}`);
        data.currency = currency;
      }
      break;
    }
  }
  
  // =========================================================================
  // CORRECTION: Pays depuis l'adresse ou autres indices
  // =========================================================================
  if (!data.supplier.country_code) {
    const countryDetection: Record<string, { code: string; name: string }> = {
      'france': { code: 'FR', name: 'France' },
      'germany': { code: 'DE', name: 'Germany' },
      'deutschland': { code: 'DE', name: 'Germany' },
      'switzerland': { code: 'CH', name: 'Switzerland' },
      'suisse': { code: 'CH', name: 'Suisse' },
      'schweiz': { code: 'CH', name: 'Schweiz' },
      'united kingdom': { code: 'GB', name: 'United Kingdom' },
      'uk': { code: 'GB', name: 'United Kingdom' },
      'england': { code: 'GB', name: 'United Kingdom' },
      'belgium': { code: 'BE', name: 'Belgium' },
      'belgique': { code: 'BE', name: 'Belgique' },
      'netherlands': { code: 'NL', name: 'Netherlands' },
      'pays-bas': { code: 'NL', name: 'Pays-Bas' },
      'nederland': { code: 'NL', name: 'Nederland' },
      'austria': { code: 'AT', name: 'Austria' },
      'österreich': { code: 'AT', name: 'Österreich' },
      'italy': { code: 'IT', name: 'Italy' },
      'italia': { code: 'IT', name: 'Italia' },
      'spain': { code: 'ES', name: 'Spain' },
      'españa': { code: 'ES', name: 'España' },
      'portugal': { code: 'PT', name: 'Portugal' },
      'luxembourg': { code: 'LU', name: 'Luxembourg' },
      'ireland': { code: 'IE', name: 'Ireland' },
      'united states': { code: 'US', name: 'United States' },
      'usa': { code: 'US', name: 'United States' },
      'canada': { code: 'CA', name: 'Canada' },
      'australia': { code: 'AU', name: 'Australia' },
    };
    
    const textLower = allText.toLowerCase();
    for (const [keyword, info] of Object.entries(countryDetection)) {
      if (textLower.includes(keyword)) {
        data.supplier.country_code = info.code;
        if (!data.supplier.country) {
          data.supplier.country = info.name;
        }
        console.log(`[extract-invoice] Pays detecte: ${info.code}`);
        break;
      }
    }
  }
  
  // =========================================================================
  // SIRET: exactement 14 chiffres
  // Patterns: "123 456 789 01234", "12345678901234", "123-456-789-01234"
  // =========================================================================
  if (!data.supplier.siret) {
    // Pattern avec separateurs possibles (espaces, tirets, points)
    const siretPatterns = [
      /SIRET[:\s]*(\d{3}[\s.-]?\d{3}[\s.-]?\d{3}[\s.-]?\d{5})/i,
      /N[°o]\s*SIRET[:\s]*(\d{3}[\s.-]?\d{3}[\s.-]?\d{3}[\s.-]?\d{5})/i,
      /(\d{3}[\s]?\d{3}[\s]?\d{3}[\s]?\d{5})/,  // Format avec espaces
      /(\d{14})/  // Format continu
    ];
    
    for (const pattern of siretPatterns) {
      const match = allText.match(pattern);
      if (match) {
        const siret = match[1].replace(/[\s.-]/g, '');
        if (siret.length === 14 && /^\d{14}$/.test(siret)) {
          console.log("[extract-invoice] SIRET trouve par regex:", siret);
          data.supplier.siret = siret;
          data.supplier.siren = siret.substring(0, 9);
          break;
        }
      }
    }
  }
  
  // =========================================================================
  // TVA Francaise: FR + 2 caracteres + 9 chiffres = 13 caracteres total
  // Patterns: "FR12 345678901", "FR 12 345 678 901", "FR12345678901"
  // =========================================================================
  if (!data.supplier.vat_number) {
    const vatFRPatterns = [
      /TVA[:\s]*intra[a-z]*[:\s]*(FR[\s]?[A-Z0-9]{2}[\s]?\d{3}[\s]?\d{3}[\s]?\d{3})/i,
      /N[°o]\s*TVA[:\s]*(FR[\s]?[A-Z0-9]{2}[\s]?\d{3}[\s]?\d{3}[\s]?\d{3})/i,
      /TVA[:\s]*(FR[\s]?[A-Z0-9]{2}[\s]?\d{3}[\s]?\d{3}[\s]?\d{3})/i,
      /(FR[\s]?[A-Z0-9]{2}[\s]?\d{3}[\s]?\d{3}[\s]?\d{3})/i,
      /(FR[A-Z0-9]{2}\d{9})/i  // Format compact
    ];
    
    for (const pattern of vatFRPatterns) {
      const match = allText.match(pattern);
      if (match) {
        const vat = match[1].replace(/\s/g, '').toUpperCase();
        if (/^FR[A-Z0-9]{2}\d{9}$/.test(vat)) {
          console.log("[extract-invoice] TVA FR trouvee par regex:", vat);
          data.supplier.vat_number = vat;
          break;
        }
      }
    }
  }
  
  // =========================================================================
  // IDE Suisse: CHE-xxx.xxx.xxx (9 chiffres avec separateurs)
  // =========================================================================
  if (!data.supplier.ide && !data.supplier.vat_number) {
    const idePatterns = [
      /IDE[:\s]*(CHE[-\s]?\d{3}[.\s]?\d{3}[.\s]?\d{3})/i,
      /UID[:\s]*(CHE[-\s]?\d{3}[.\s]?\d{3}[.\s]?\d{3})/i,
      /(CHE[-]?\d{3}[.]?\d{3}[.]?\d{3})/i
    ];
    
    for (const pattern of idePatterns) {
      const match = allText.match(pattern);
      if (match) {
        // Normaliser au format CHE-xxx.xxx.xxx
        let ide = match[1].toUpperCase();
        const digits = ide.replace(/[^0-9]/g, '');
        if (digits.length === 9) {
          ide = `CHE-${digits.slice(0,3)}.${digits.slice(3,6)}.${digits.slice(6,9)}`;
          console.log("[extract-invoice] IDE CH trouve par regex:", ide);
          data.supplier.ide = ide;
          data.supplier.vat_number = ide;
          data.supplier.country_code = 'CH';
          break;
        }
      }
    }
  }
  
  // =========================================================================
  // TVA Allemande: DE + 9 chiffres
  // =========================================================================
  if (!data.supplier.vat_number) {
    const vatDEPatterns = [
      /USt[-.]?IdNr[.:\s]*(DE[\s]?\d{9})/i,
      /Steuernummer[:\s]*(DE[\s]?\d{9})/i,
      /(DE\d{9})/i
    ];
    
    for (const pattern of vatDEPatterns) {
      const match = allText.match(pattern);
      if (match) {
        const vat = match[1].replace(/\s/g, '').toUpperCase();
        if (/^DE\d{9}$/.test(vat)) {
          console.log("[extract-invoice] TVA DE trouvee par regex:", vat);
          data.supplier.vat_number = vat;
          data.supplier.country_code = 'DE';
          break;
        }
      }
    }
  }
  
  // =========================================================================
  // TVA Belge: BE + 10 chiffres (souvent avec 0 initial)
  // =========================================================================
  if (!data.supplier.vat_number) {
    const vatBEPatterns = [
      /TVA[:\s]*(BE[\s]?0?\d{3}[.\s]?\d{3}[.\s]?\d{3})/i,
      /BTW[:\s]*(BE[\s]?0?\d{3}[.\s]?\d{3}[.\s]?\d{3})/i,
      /(BE0\d{9})/i,
      /(BE\d{10})/i
    ];
    
    for (const pattern of vatBEPatterns) {
      const match = allText.match(pattern);
      if (match) {
        const vat = match[1].replace(/[\s.]/g, '').toUpperCase();
        if (/^BE0?\d{9,10}$/.test(vat)) {
          console.log("[extract-invoice] TVA BE trouvee par regex:", vat);
          data.supplier.vat_number = vat;
          data.supplier.country_code = 'BE';
          break;
        }
      }
    }
  }
  
  // =========================================================================
  // TVA UK: GB + 9-12 chiffres
  // =========================================================================
  if (!data.supplier.vat_number) {
    const vatGBPatterns = [
      /VAT\s*(?:No|Number|Reg)?[.:\s]*(GB[\s]?\d{9,12})/i,
      /(GB\d{9,12})/i
    ];
    for (const pattern of vatGBPatterns) {
      const match = allText.match(pattern);
      if (match) {
        const vat = match[1].replace(/\s/g, '').toUpperCase();
        if (/^GB\d{9,12}$/.test(vat)) {
          console.log("[extract-invoice] TVA GB trouvee par regex:", vat);
          data.supplier.vat_number = vat;
          data.supplier.country_code = 'GB';
          break;
        }
      }
    }
  }
  
  // =========================================================================
  // TVA Pays-Bas: NL + 9 chiffres + B + 2 chiffres
  // =========================================================================
  if (!data.supplier.vat_number) {
    const vatNLPatterns = [
      /BTW[-\s]*(?:nummer|id|nr)?[.:\s]*(NL[\s]?\d{9}B\d{2})/i,
      /OB[-\s]*nummer[.:\s]*(NL[\s]?\d{9}B\d{2})/i,
      /(NL\d{9}B\d{2})/i
    ];
    for (const pattern of vatNLPatterns) {
      const match = allText.match(pattern);
      if (match) {
        const vat = match[1].replace(/\s/g, '').toUpperCase();
        if (/^NL\d{9}B\d{2}$/.test(vat)) {
          console.log("[extract-invoice] TVA NL trouvee par regex:", vat);
          data.supplier.vat_number = vat;
          data.supplier.country_code = 'NL';
          break;
        }
      }
    }
  }
  
  // =========================================================================
  // KvK Pays-Bas: 8 chiffres
  // =========================================================================
  if (!data.supplier.kvk) {
    const kvkPatterns = [
      /KvK[-\s]*(?:nummer|nr)?[.:\s]*(\d{8})/i,
      /Handelsregister[.:\s]*(\d{8})/i
    ];
    for (const pattern of kvkPatterns) {
      const match = allText.match(pattern);
      if (match) {
        const kvk = match[1];
        if (/^\d{8}$/.test(kvk)) {
          console.log("[extract-invoice] KvK NL trouve par regex:", kvk);
          data.supplier.kvk = kvk;
          if (!data.supplier.country_code) data.supplier.country_code = 'NL';
          break;
        }
      }
    }
  }
  
  // =========================================================================
  // TVA Autriche: ATU + 8 chiffres
  // =========================================================================
  if (!data.supplier.vat_number) {
    const vatATPatterns = [
      /UID[-\s]*(?:Nummer|Nr)?[.:\s]*(ATU[\s]?\d{8})/i,
      /Umsatzsteuer[-\s]*ID[.:\s]*(ATU[\s]?\d{8})/i,
      /(ATU\d{8})/i
    ];
    for (const pattern of vatATPatterns) {
      const match = allText.match(pattern);
      if (match) {
        const vat = match[1].replace(/\s/g, '').toUpperCase();
        if (/^ATU\d{8}$/.test(vat)) {
          console.log("[extract-invoice] TVA AT trouvee par regex:", vat);
          data.supplier.vat_number = vat;
          data.supplier.uid = vat;
          data.supplier.country_code = 'AT';
          break;
        }
      }
    }
  }
  
  // =========================================================================
  // TVA Italie: IT + 11 chiffres
  // =========================================================================
  if (!data.supplier.vat_number) {
    const vatITPatterns = [
      /P\.?\s*IVA[.:\s]*(IT[\s]?\d{11})/i,
      /Partita\s*IVA[.:\s]*(IT[\s]?\d{11})/i,
      /C\.?\s*F\.?[.:\s]*(IT[\s]?\d{11})/i,
      /(IT\d{11})/i
    ];
    for (const pattern of vatITPatterns) {
      const match = allText.match(pattern);
      if (match) {
        const vat = match[1].replace(/\s/g, '').toUpperCase();
        if (/^IT\d{11}$/.test(vat)) {
          console.log("[extract-invoice] TVA IT trouvee par regex:", vat);
          data.supplier.vat_number = vat;
          data.supplier.country_code = 'IT';
          break;
        }
      }
    }
  }
  
  // =========================================================================
  // TVA Espagne: ES + lettre + 7-8 chiffres + lettre optionnelle
  // =========================================================================
  if (!data.supplier.vat_number) {
    const vatESPatterns = [
      /(?:NIF|CIF|N\.I\.F\.|C\.I\.F\.)[.:\s]*(ES[\s]?[A-Z]\d{7,8}[A-Z]?)/i,
      /IVA[.:\s]*(ES[\s]?[A-Z]\d{7,8}[A-Z]?)/i,
      /(ES[A-Z]\d{7,8}[A-Z]?)/i
    ];
    for (const pattern of vatESPatterns) {
      const match = allText.match(pattern);
      if (match) {
        const vat = match[1].replace(/\s/g, '').toUpperCase();
        if (/^ES[A-Z]\d{7,8}[A-Z]?$/.test(vat)) {
          console.log("[extract-invoice] TVA ES trouvee par regex:", vat);
          data.supplier.vat_number = vat;
          data.supplier.country_code = 'ES';
          break;
        }
      }
    }
  }
  
  // =========================================================================
  // TVA Luxembourg: LU + 8 chiffres
  // =========================================================================
  if (!data.supplier.vat_number) {
    const vatLUPatterns = [
      /TVA[.:\s]*(LU[\s]?\d{8})/i,
      /N[°o]\s*TVA[.:\s]*(LU[\s]?\d{8})/i,
      /(LU\d{8})/i
    ];
    for (const pattern of vatLUPatterns) {
      const match = allText.match(pattern);
      if (match) {
        const vat = match[1].replace(/\s/g, '').toUpperCase();
        if (/^LU\d{8}$/.test(vat)) {
          console.log("[extract-invoice] TVA LU trouvee par regex:", vat);
          data.supplier.vat_number = vat;
          data.supplier.country_code = 'LU';
          break;
        }
      }
    }
  }
  
  // =========================================================================
  // TVA Portugal: PT + 9 chiffres
  // =========================================================================
  if (!data.supplier.vat_number) {
    const vatPTPatterns = [
      /(?:NIF|NIPC)[.:\s]*(PT[\s]?\d{9})/i,
      /N[°o]\s*contribuinte[.:\s]*(PT[\s]?\d{9})/i,
      /IVA[.:\s]*(PT[\s]?\d{9})/i,
      /(PT\d{9})/i
    ];
    for (const pattern of vatPTPatterns) {
      const match = allText.match(pattern);
      if (match) {
        const vat = match[1].replace(/\s/g, '').toUpperCase();
        if (/^PT\d{9}$/.test(vat)) {
          console.log("[extract-invoice] TVA PT trouvee par regex:", vat);
          data.supplier.vat_number = vat;
          data.supplier.country_code = 'PT';
          break;
        }
      }
    }
  }
  
  // =========================================================================
  // IBAN: Code pays (2 lettres) + 2 chiffres + BBAN (jusqu'a 30 caracteres)
  // =========================================================================
  if (!data.supplier.banking.iban) {
    const ibanPatterns = [
      /IBAN[:\s]*([A-Z]{2}\d{2}[\s]?(?:[A-Z0-9]{4}[\s]?){2,7}[A-Z0-9]{1,4})/i,
      /([A-Z]{2}\d{2}[\s]?(?:[A-Z0-9]{4}[\s]?){3,7}[A-Z0-9]{0,4})/i
    ];
    
    for (const pattern of ibanPatterns) {
      const match = allText.match(pattern);
      if (match) {
        const iban = match[1].replace(/\s/g, '').toUpperCase();
        // Validation basique: 15-34 caracteres
        if (iban.length >= 15 && iban.length <= 34 && /^[A-Z]{2}\d{2}[A-Z0-9]+$/.test(iban)) {
          console.log("[extract-invoice] IBAN trouve par regex:", iban);
          data.supplier.banking.iban = iban;
          break;
        }
      }
    }
  }
  
  // =========================================================================
  // BIC/SWIFT: 8 ou 11 caracteres alphanumeriques
  // =========================================================================
  if (!data.supplier.banking.swift_bic) {
    const bicPatterns = [
      /BIC[:\s]*([A-Z]{6}[A-Z0-9]{2}(?:[A-Z0-9]{3})?)/i,
      /SWIFT[:\s]*([A-Z]{6}[A-Z0-9]{2}(?:[A-Z0-9]{3})?)/i,
      /([A-Z]{6}[A-Z0-9]{2}(?:[A-Z0-9]{3})?)/i
    ];
    
    for (const pattern of bicPatterns) {
      const match = allText.match(pattern);
      if (match) {
        const bic = match[1].toUpperCase();
        if (/^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(bic)) {
          console.log("[extract-invoice] BIC trouve par regex:", bic);
          data.supplier.banking.swift_bic = bic;
          break;
        }
      }
    }
  }
  
  // =========================================================================
  // Normalisation finale
  // =========================================================================
  
  // Normaliser SIRET (retirer espaces/tirets)
  if (data.supplier.siret) {
    data.supplier.siret = data.supplier.siret.replace(/[\s.-]/g, '');
    // Valider que c'est bien 14 chiffres
    if (!/^\d{14}$/.test(data.supplier.siret)) {
      console.log("[extract-invoice] SIRET invalide (pas 14 chiffres), suppression:", data.supplier.siret);
      data.supplier.siret = null;
    } else {
      // Extraire SIREN si pas present
      if (!data.supplier.siren) {
        data.supplier.siren = data.supplier.siret.substring(0, 9);
      }
    }
  }
  
  // Normaliser SIREN (retirer espaces)
  if (data.supplier.siren) {
    data.supplier.siren = data.supplier.siren.replace(/[\s.-]/g, '');
    // Valider que c'est bien 9 chiffres
    if (!/^\d{9}$/.test(data.supplier.siren)) {
      console.log("[extract-invoice] SIREN invalide (pas 9 chiffres), suppression:", data.supplier.siren);
      data.supplier.siren = null;
    }
  }
  
  // Valider le format TVA
  if (data.supplier.vat_number) {
    const vat = data.supplier.vat_number.replace(/\s/g, '').toUpperCase();
    // Doit commencer par 2 lettres (code pays)
    if (!/^[A-Z]{2}/.test(vat)) {
      console.log("[extract-invoice] TVA invalide (pas de prefix pays), suppression:", vat);
      data.supplier.vat_number = null;
    } else {
      data.supplier.vat_number = vat;
    }
  }
  
  // Detecter le pays depuis le SIREN/RCS si France
  if ((data.supplier.siren || data.supplier.rcs_city) && !data.supplier.country_code) {
    data.supplier.country_code = 'FR';
    data.supplier.country = 'France';
  }
  
  // Detecter le pays depuis le SIRET si France
  if (data.supplier.siret && !data.supplier.country_code) {
    data.supplier.country_code = 'FR';
    data.supplier.country = 'France';
  }
  
  // Detecter le pays depuis le numero TVA
  if (data.supplier.vat_number && !data.supplier.country_code) {
    const vatPrefix = data.supplier.vat_number.substring(0, 2).toUpperCase();
    const countryMap: Record<string, string> = {
      'FR': 'France', 'DE': 'Allemagne', 'BE': 'Belgique', 'CH': 'Suisse',
      'GB': 'Royaume-Uni', 'IT': 'Italie', 'ES': 'Espagne', 'NL': 'Pays-Bas',
      'AT': 'Autriche', 'LU': 'Luxembourg', 'PT': 'Portugal', 'IE': 'Irlande'
    };
    if (countryMap[vatPrefix]) {
      data.supplier.country_code = vatPrefix;
      data.supplier.country = countryMap[vatPrefix];
    }
  }
  
  // S'assurer que la devise est correcte (pas CHF par defaut si pays FR)
  if (data.supplier.country_code === 'FR' && data.currency === 'CHF') {
    console.log("[extract-invoice] Correction devise pour FR: CHF -> EUR");
    data.currency = 'EUR';
  }
  
  // Log final des donnees extraites
  console.log("[extract-invoice] Donnees finales:", {
    company: data.supplier.company_name,
    country: data.supplier.country_code,
    vat: data.supplier.vat_number,
    siren: data.supplier.siren,
    siret: data.supplier.siret,
    legal_form: data.supplier.legal_form,
    bank: data.supplier.banking?.bank_name,
    currency: data.currency,
  });
  
  return data as ExtractedInvoiceData;
}

// =============================================================================
// Validation des donnees extraites
// =============================================================================
function validateBankingData(data: any): BankingData {
  return {
    iban: data?.iban || null,
    swift_bic: data?.swift_bic || null,
    bank_name: data?.bank_name || null,
    routing_number: data?.routing_number || null,
    account_number: data?.account_number || null,
    institution_number: data?.institution_number || null,
    transit_number: data?.transit_number || null,
    sort_code: data?.sort_code || null,
    bsb_code: data?.bsb_code || null,
  };
}

function validateSupplierData(data: any): SupplierData {
  return {
    company_name: data?.company_name || null,
    legal_form: data?.legal_form || null,
    address_line1: data?.address_line1 || null,
    address_line2: data?.address_line2 || null,
    postal_code: data?.postal_code || null,
    city: data?.city || null,
    state_province: data?.state_province || null,
    country: data?.country || null,
    country_code: data?.country_code?.toUpperCase() || null,
    email: data?.email || null,
    phone: data?.phone || null,
    website: data?.website || null,
    vat_number: data?.vat_number || null,
    tax_id: data?.tax_id || null,
    siret: data?.siret || null,
    siren: data?.siren || null,
    rcs_city: data?.rcs_city || null,
    ape_code: data?.ape_code || null,
    capital_social: data?.capital_social || null,
    ide: data?.ide || null,
    uid: data?.uid || null,
    handelsregister: data?.handelsregister || null,
    companies_house: data?.companies_house || null,
    kvk: data?.kvk || null,
    abn: data?.abn || null,
    ein: data?.ein || null,
    business_number: data?.business_number || null,
    banking: validateBankingData(data?.banking),
  };
}

function validateExtractedData(data: any): ExtractedInvoiceData {
  // Construire le supplier depuis les nouvelles donnees ou les legacy
  const supplierData = data.supplier || {};
  const validated: ExtractedInvoiceData = {
    // Nouvelles donnees fournisseur etendues
    supplier: validateSupplierData(supplierData),
    
    // Legacy fields (pour compatibilite)
    supplier_name: data.supplier_name || supplierData.company_name || null,
    supplier_address: data.supplier_address || 
      [supplierData.address_line1, supplierData.postal_code, supplierData.city, supplierData.country]
        .filter(Boolean).join(', ') || null,
    supplier_vat_number: data.supplier_vat_number || supplierData.vat_number || null,
    
    // Facture
    invoice_number: data.invoice_number || null,
    invoice_date: data.invoice_date || null,
    due_date: data.due_date || null,
    payment_terms: data.payment_terms || null,
    
    // Montants
    currency: data.currency || 'EUR',
    amount_excl_tax: typeof data.amount_excl_tax === 'number' ? data.amount_excl_tax : null,
    tax_rate: typeof data.tax_rate === 'number' ? data.tax_rate : null,
    tax_amount: typeof data.tax_amount === 'number' ? data.tax_amount : null,
    amount_incl_tax: typeof data.amount_incl_tax === 'number' ? data.amount_incl_tax : null,
    
    // Details
    line_items: Array.isArray(data.line_items) ? data.line_items : [],
    
    // Metadonnees
    confidence_score: typeof data.confidence_score === 'number' ? data.confidence_score : 50,
    extraction_notes: data.extraction_notes || null,
    detected_country: data.detected_country || supplierData.country_code || null,
  };

  // Valider le format des dates
  if (validated.invoice_date && !/^\d{4}-\d{2}-\d{2}$/.test(validated.invoice_date)) {
    validated.invoice_date = null;
  }
  if (validated.due_date && !/^\d{4}-\d{2}-\d{2}$/.test(validated.due_date)) {
    validated.due_date = null;
  }

  // Normaliser la devise
  const validCurrencies = ['EUR', 'CHF', 'USD', 'GBP', 'CAD', 'AUD', 'SEK', 'NOK', 'DKK', 'PLN', 'CZK'];
  if (validated.currency && !validCurrencies.includes(validated.currency.toUpperCase())) {
    validated.currency = 'EUR';
  } else if (validated.currency) {
    validated.currency = validated.currency.toUpperCase();
  }

  return validated;
}

// =============================================================================
// Handler principal
// =============================================================================
Deno.serve(async (req) => {
  // Gestion CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // Seulement POST
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ success: false, error: "Methode non autorisee" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const body: ExtractRequest = await req.json();

    // Validation de l'input
    if (!body.pdfBase64) {
      return new Response(
        JSON.stringify({ success: false, error: "pdfBase64 requis" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Determiner le type MIME
    const mimeType = body.mimeType || "application/pdf";
    const validMimeTypes = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
    
    if (!validMimeTypes.includes(mimeType)) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Type MIME non supporte: ${mimeType}. Utilisez PDF, JPEG, PNG ou WebP.` 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verifier la taille (limite ~20MB en base64)
    const estimatedSize = (body.pdfBase64.length * 3) / 4;
    if (estimatedSize > 20 * 1024 * 1024) {
      return new Response(
        JSON.stringify({ success: false, error: "Fichier trop volumineux (max 20MB)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[extract-invoice] Traitement document ${mimeType}, taille ~${Math.round(estimatedSize / 1024)}KB`);

    // Appeler Gemini
    const rawData = await callGeminiVision(body.pdfBase64, mimeType);
    
    // Valider et normaliser les donnees
    const validatedData = validateExtractedData(rawData);

    console.log("[extract-invoice] Extraction reussie:", {
      supplier: validatedData.supplier_name,
      invoice_number: validatedData.invoice_number,
      amount: validatedData.amount_incl_tax,
      currency: validatedData.currency,
      confidence: validatedData.confidence_score,
    });

    const response: ExtractResponse = {
      success: true,
      data: validatedData,
    };

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("[extract-invoice] Erreur:", error);

    const response: ExtractResponse = {
      success: false,
      error: error.message || "Erreur lors de l'extraction",
    };

    return new Response(
      JSON.stringify(response),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
