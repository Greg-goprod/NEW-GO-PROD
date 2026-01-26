import Docxtemplater from "docxtemplater";
import PizZip from "pizzip";
import { saveAs } from "file-saver";
import { supabase } from "@/lib/supabaseClient";
import { normalizeName, formatIsoDate } from "@/services/date";
import { fetchOfferSettings, type OfferSettings } from "../offerSettingsApi";

// =============================================================================
// Types
// =============================================================================
export type OfferWordInput = {
  // Infos principales
  event_name?: string;
  artist_name?: string;
  stage_name?: string;
  performance_date?: string; // ISO date
  performance_time?: string; // "HH:MM:SS"
  duration?: number | null;
  notes_date?: string | null;
  
  // Financier
  currency?: string | null;
  amount_net?: number | null;
  amount_gross?: number | null;
  amount_display?: number | null;
  amount_is_net?: boolean | null;
  notes_financial?: string | null;
  
  // Frais additionnels
  prod_fee_amount?: number | null;
  backline_fee_amount?: number | null;
  buyout_hotel_amount?: number | null;
  buyout_meal_amount?: number | null;
  flight_contribution_amount?: number | null;
  technical_fee_amount?: number | null;
  
  // Extras (jusqu'a 8)
  extras_festival?: string[];
  extras_artist?: string[];
  note_extras?: string | null;
  
  // Clauses d'exclusivite (jusqu'a 10)
  exclusivity_clauses?: string[];
  note_clause_exclusivite_festival?: string | null;
  
  // Validite
  validity_date?: string | null;
  
  // Identifiants
  offer_id: string;
  event_id: string;
  company_id: string;
};

// Buckets Supabase
const OFFER_PDF_BUCKET = import.meta.env.VITE_SUPABASE_OFFER_PDF_BUCKET || "offers";
const WORD_TEMPLATE_BUCKET = import.meta.env.VITE_SUPABASE_OFFER_TEMPLATE_BUCKET || "word-templates";

// =============================================================================
// Helpers
// =============================================================================
const formatDateLong = (value?: string | null): string => {
  if (!value) return "";
  try {
    const date = new Date(value);
    return date.toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return value;
  }
};

const formatTime = (value?: string | null): string => {
  if (!value) return "";
  const [hours, minutes] = value.split(":");
  if (hours === undefined || minutes === undefined) return value;
  return `${hours}:${minutes}`;
};

const formatCurrency = (amount?: number | null, currency?: string | null): string => {
  if (amount === null || amount === undefined) return "";
  const curr = currency || "EUR";
  return new Intl.NumberFormat("fr-CH", {
    style: "currency",
    currency: curr,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
};

const formatAmount = (amount?: number | null): string => {
  if (amount === null || amount === undefined) return "";
  return new Intl.NumberFormat("fr-CH", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
};

// =============================================================================
// Fonctions principales
// =============================================================================

/**
 * Telecharge le template Word depuis Supabase Storage
 */
async function downloadWordTemplate(companyId: string): Promise<ArrayBuffer | null> {
  try {
    // Chercher le template configure pour cette company
    const { data: templateConfig } = await supabase
      .from("offer_templates")
      .select("storage_path")
      .eq("company_id", companyId)
      .maybeSingle();

    if (!templateConfig?.storage_path) {
      console.warn("[Word] Aucun template configure pour cette company");
      return null;
    }

    // Telecharger le fichier
    const { data, error } = await supabase.storage
      .from(WORD_TEMPLATE_BUCKET)
      .download(templateConfig.storage_path);

    if (error) {
      console.error("[Word] Erreur telechargement template:", error);
      return null;
    }

    return await data.arrayBuffer();
  } catch (error) {
    console.error("[Word] Erreur lors du telechargement du template:", error);
    return null;
  }
}

/**
 * Construit l'objet de donnees pour le template Word
 */
function buildTemplateData(
  input: OfferWordInput,
  settings: OfferSettings | null
): Record<string, string> {
  const data: Record<string, string> = {};

  // Infos principales
  data.artist_name = input.artist_name || "";
  data.event_name = input.event_name || "";
  data.stage_name = input.stage_name || "";
  data.performance_date_long = formatDateLong(input.performance_date);
  data.performance_time = formatTime(input.performance_time);
  data.duration_minutes = input.duration ? `${input.duration} min` : "";
  data.validity_date = input.validity_date ? formatIsoDate(input.validity_date) : "";
  data.notes_date = input.notes_date || "";

  // Financier
  data.currency = input.currency || "EUR";
  data.amount_display = formatAmount(input.amount_display);
  data.amount_net = input.amount_is_net ? `NET: ${formatCurrency(input.amount_net, input.currency)}` : "";
  data.amount_gross = !input.amount_is_net ? `BRUT: ${formatCurrency(input.amount_gross, input.currency)}` : "";
  data.notes_financial = input.notes_financial || "";

  // Frais additionnels
  data.prod_fee = formatAmount(input.prod_fee_amount);
  data.backline_fee = formatAmount(input.backline_fee_amount);
  data.buyout_hotel = formatAmount(input.buyout_hotel_amount);
  data.buyout_meal = formatAmount(input.buyout_meal_amount);
  data.technical_fee = formatAmount(input.technical_fee_amount);
  data.flight_contribution = formatAmount(input.flight_contribution_amount);

  // Extras - {extras_festival_1} contient TOUS les extras festival (un par ligne)
  //          {extras_artist_1} contient TOUS les extras artiste (un par ligne)
  const extrasFestival = input.extras_festival || [];
  const extrasArtist = input.extras_artist || [];
  
  // Placeholder principal avec tout le contenu multi-lignes
  data.extras_festival_1 = extrasFestival.filter(e => e).join("\n");
  data.extras_artist_1 = extrasArtist.filter(e => e).join("\n");
  console.log("[Word] extras_festival_1 =", data.extras_festival_1);
  console.log("[Word] extras_artist_1 =", data.extras_artist_1);
  
  // Vider les autres slots (au cas où le template les utiliserait)
  for (let i = 2; i <= 8; i++) {
    data[`extras_festival_${i}`] = "";
    data[`extras_artist_${i}`] = "";
  }
  data.note_extras = input.note_extras || "";

  // Clauses d'exclusivite - {clause_exclusivite_festival_1} contient TOUTES les clauses (une par ligne)
  const clauses = input.exclusivity_clauses || [];
  
  // Placeholder principal avec tout le contenu multi-lignes
  data.clause_exclusivite_festival_1 = clauses.filter(c => c).join("\n");
  console.log("[Word] clause_exclusivite_festival_1 =", data.clause_exclusivite_festival_1);
  
  // Vider les autres slots (au cas où le template les utiliserait)
  for (let i = 2; i <= 10; i++) {
    data[`clause_exclusivite_festival_${i}`] = "";
  }
  data.note_clause_exclusivite_festival = input.note_clause_exclusivite_festival || "";

  // Parametres depuis offer_settings (nouvelle structure simplifiee)
  if (settings) {
    // Notes pour extras et exclusivite (si pas fournies dans input)
    if (!data.note_extras && settings.extras_note) {
      data.note_extras = settings.extras_note;
    }
    if (!data.note_clause_exclusivite_festival && settings.exclusivity_note) {
      data.note_clause_exclusivite_festival = settings.exclusivity_note;
    }
    
    // Transports - note et contenu (tout le contenu dans un seul placeholder)
    data.note_transports_festival_1 = settings.transport_note || "";
    // Le template n'a qu'un seul placeholder {transports_festival_1}, donc on met tout le contenu dedans
    data.transports_festival_1 = settings.transport_content || "";
    console.log("[Word] transports_festival_1 =", data.transports_festival_1);
    // Remplir les autres slots au cas où le template en aurait plusieurs
    for (let i = 2; i <= 10; i++) {
      data[`transports_festival_${i}`] = "";
    }
    data.note_transports_festival_2 = "";
    data.note_transports_festival_3 = "";

    // Paiements - note et contenu (tout le contenu dans un seul placeholder)
    data.note_paiements_festival_1 = settings.payment_note || "";
    // Le template n'a qu'un seul placeholder {paiements_festival_1}, donc on met tout le contenu dedans
    data.paiements_festival_1 = settings.payment_content || "";
    console.log("[Word] paiements_festival_1 =", data.paiements_festival_1);
    // Remplir les autres slots au cas où le template en aurait plusieurs
    for (let i = 2; i <= 10; i++) {
      data[`paiements_festival_${i}`] = "";
    }

    // Validite texte
    data.validite_offre_festival_4 = settings.validity_text || "";

    // Clauses additionnelles
    data.stagepalight_festival_1 = settings.stage_pa_lights || "";
    data.screen_festival_1 = settings.screens || "";
    // Le template a un espace: {merchandising _festival_1}
    data["merchandising _festival_1"] = settings.merchandising || "";
    data.merchandising_festival_1 = settings.merchandising || ""; // Au cas où corrigé
    data.taxes_festival_1 = settings.withholding_taxes || "";
    data.db_festival_1 = settings.decibel_limit || "";
    data.tourbus_festival_1 = settings.tour_bus || "";
    data["catering-meal_festival_1"] = settings.catering_meals || "";
    data.artwork_festival_1 = settings.artwork || "";
  }

  return data;
}

/**
 * Genere le document Word rempli
 */
export async function generateOfferWord(
  input: OfferWordInput
): Promise<Blob | null> {
  try {
    console.log("[Word] Debut generation document Word");
    
    // Telecharger le template
    const templateBuffer = await downloadWordTemplate(input.company_id);
    if (!templateBuffer) {
      console.error("[Word] Impossible de telecharger le template");
      return null;
    }

    // Charger les parametres de l'offre
    console.log("[Word] Chargement des settings pour company_id:", input.company_id);
    const settings = await fetchOfferSettings(input.company_id);
    console.log("[Word] Settings charges:", settings ? "oui" : "non");
    if (settings) {
      console.log("[Word] Settings - transport_note:", settings.transport_note);
      console.log("[Word] Settings - transport_content:", settings.transport_content);
      console.log("[Word] Settings - payment_note:", settings.payment_note);
      console.log("[Word] Settings - payment_content:", settings.payment_content);
    }

    // Charger le document avec PizZip
    const zip = new PizZip(templateBuffer);
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      delimiters: { start: "{", end: "}" },
    });

    // Construire les donnees
    const templateData = buildTemplateData(input, settings);
    console.log("[Word] Donnees du template:", Object.keys(templateData).length, "champs");

    // Remplir le template
    doc.render(templateData);

    // Generer le blob
    const out = doc.getZip().generate({
      type: "blob",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });

    console.log("[Word] Document genere avec succes");
    return out;
  } catch (error) {
    console.error("[Word] Erreur generation document:", error);
    throw error;
  }
}

/**
 * Genere et uploade le document Word + PDF
 */
export async function generateOfferWordAndUpload(
  input: OfferWordInput
): Promise<{ wordPath: string; pdfPath: string | null }> {
  // Generer le document Word
  const wordBlob = await generateOfferWord(input);
  if (!wordBlob) {
    throw new Error("Impossible de generer le document Word");
  }

  // Construire le nom du fichier: OFFRE - nom evenement - nom artiste - date performance
  const cleanEvent = normalizeName(input.event_name || "EVENT");
  const cleanArtist = normalizeName(input.artist_name || "ARTIST");
  
  // Formater la date de performance (YYYY-MM-DD -> DD-MM-YYYY)
  let dateStr = "";
  if (input.performance_date) {
    const dateParts = input.performance_date.split("T")[0].split("-");
    if (dateParts.length === 3) {
      dateStr = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`; // DD-MM-YYYY
    }
  }
  
  const base = `OFFRE - ${cleanEvent} - ${cleanArtist}${dateStr ? ` - ${dateStr}` : ""}`;
  const wordFileName = `${base}.docx`;
  const basePath = `${input.company_id}/${input.event_id}/${input.offer_id}`;
  const wordPath = `${basePath}/${wordFileName}`;

  // Upload du Word
  const { error: wordError } = await supabase.storage
    .from(OFFER_PDF_BUCKET)
    .upload(wordPath, wordBlob, { upsert: true });

  if (wordError) {
    console.error("[Word] Erreur upload Word:", wordError);
    throw wordError;
  }

  console.log("[Word] Document Word uploade:", wordPath);

  // Pour le PDF, on ne peut pas le generer cote client sans serveur
  // On retourne null pour le PDF - il faudra une Edge Function ou un service externe
  return { wordPath, pdfPath: null };
}

/**
 * Telecharge le document Word genere localement
 */
export async function downloadGeneratedWord(input: OfferWordInput): Promise<void> {
  const wordBlob = await generateOfferWord(input);
  if (!wordBlob) {
    throw new Error("Impossible de generer le document Word");
  }

  // Construire le nom du fichier: OFFRE - nom evenement - nom artiste - date performance
  const cleanEvent = normalizeName(input.event_name || "EVENT");
  const cleanArtist = normalizeName(input.artist_name || "ARTIST");
  
  // Formater la date de performance (YYYY-MM-DD -> DD-MM-YYYY)
  let dateStr = "";
  if (input.performance_date) {
    const dateParts = input.performance_date.split("T")[0].split("-");
    if (dateParts.length === 3) {
      dateStr = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`; // DD-MM-YYYY
    }
  }
  
  const fileName = `OFFRE - ${cleanEvent} - ${cleanArtist}${dateStr ? ` - ${dateStr}` : ""}.docx`;

  saveAs(wordBlob, fileName);
}
