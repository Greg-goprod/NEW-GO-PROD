import {
  PDFCheckBox,
  PDFDocument,
  PDFDropdown,
  PDFOptionList,
  PDFRadioGroup,
  PDFTextField,
  StandardFonts,
} from "pdf-lib";
import { supabase } from "../../../lib/supabaseClient";
import { normalizeName, toHHMM, formatIsoDate } from "../../../services/date";
import {
  OFFER_TEMPLATE_FIELDS,
  type OfferTemplateFieldKey,
} from "../offerTemplateConstants";

export type OfferPdfInput = {
  event_name?: string;
  artist_name?: string;
  stage_name?: string;
  performance_date?: string; // ISO date
  performance_time?: string; // "HH:MM:SS"
  duration?: number | null;
  amount_net?: number | null;
  amount_gross?: number | null;
  currency?: string | null;
  amount_display?: number | null;
  notes?: string | null;
  prod_fee_amount?: number | null;
  backline_fee_amount?: number | null;
  buyout_hotel_amount?: number | null;
  buyout_meal_amount?: number | null;
  flight_contribution_amount?: number | null;
  technical_fee_amount?: number | null;
  extras_summary?: string | null;
  clauses_summary?: string | null;
  offer_id: string;
  event_id: string;
  company_id: string;
  amount_is_net?: boolean | null;
  validity_date?: string | null;
  agency_commission_pct?: number | null;
};

type OfferTemplateConfig = {
  storage_path: string;
  fields_mapping: Record<string, string> | null;
};

const OFFER_PDF_BUCKET =
  import.meta.env.VITE_SUPABASE_OFFER_PDF_BUCKET || "offers";
const OFFER_TEMPLATE_BUCKET =
  import.meta.env.VITE_SUPABASE_OFFER_TEMPLATE_BUCKET || "word-templates";
const OFFER_TEMPLATE_PATH =
  import.meta.env.VITE_SUPABASE_OFFER_TEMPLATE_PATH ||
  "templates/offer_template.pdf";

const ALLOWED_TEMPLATE_KEYS = new Set<OfferTemplateFieldKey>(
  OFFER_TEMPLATE_FIELDS.map((field) => field.value),
);

const formatDateSafe = (value?: string | null) =>
  value ? formatIsoDate(value) : "";

const formatTimeSafe = (value?: string | null) => {
  if (!value) return "";
  const [hours, minutes] = value.split(":");
  if (hours === undefined || minutes === undefined) return value;
  const date = new Date();
  date.setHours(Number(hours) || 0, Number(minutes) || 0, 0, 0);
  return toHHMM(date);
};

export async function generateOfferPdfAndUpload(
  input: OfferPdfInput,
): Promise<{ storagePath: string }> {
  const templateConfig = await fetchOfferTemplateConfig(input.company_id);
  const pdfBytes =
    (await tryFillTemplatePdf(input, templateConfig)) ??
    (await generateFallbackPdf(input));

  // Construire le nom du fichier au format: EVENEMENT - OFFRE - ARTISTE - JOUR DD.MM.YYYY.pdf
  const cleanEvent = normalizeName(input.event_name || "EVENT").toUpperCase();
  const cleanArtist = normalizeName(input.artist_name || "ARTISTE").toUpperCase();
  
  // Formater la date avec le jour en toutes lettres (format européen)
  let dateStr = "";
  if (input.performance_date) {
    const date = new Date(`${input.performance_date}T00:00:00`);
    const weekday = date.toLocaleDateString("fr-FR", { weekday: "long" }).toUpperCase();
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear();
    dateStr = `${weekday} ${day}.${month}.${year}`;
  }
  
  // Assembler le nom de fichier (remplacer les espaces par des tirets pour éviter les problèmes)
  const parts = [cleanEvent, "OFFRE", cleanArtist];
  if (dateStr) parts.push(dateStr);
  const fileName = `${parts.join(" - ")}.pdf`;
  
  // Le chemin doit commencer par company_id pour respecter la politique RLS du bucket "offers"
  const storagePath = `${input.company_id}/${input.event_id}/${input.offer_id}/${fileName}`;

  const pdfBuffer = pdfBytes.buffer.slice(
    pdfBytes.byteOffset,
    pdfBytes.byteOffset + pdfBytes.byteLength,
  ) as ArrayBuffer;

  const { error: upErr } = await supabase.storage
    .from(OFFER_PDF_BUCKET)
    .upload(
      storagePath,
      new Blob([pdfBuffer], { type: "application/pdf" }),
      {
        upsert: true,
      },
    );
  if (upErr) throw upErr;

  return { storagePath };
}

async function fetchOfferTemplateConfig(
  companyId: string,
): Promise<OfferTemplateConfig | null> {
  try {
    const { data, error } = await supabase
      .from("offer_templates")
      .select("storage_path, fields_mapping")
      .eq("company_id", companyId)
      .maybeSingle();

    if (error && error.code !== "PGRST116") throw error;
    return (data as OfferTemplateConfig) ?? null;
  } catch (error) {
    console.warn("[Booking][PDF] Impossible de charger le template:", error);
    return null;
  }
}

async function tryFillTemplatePdf(
  input: OfferPdfInput,
  templateConfig?: OfferTemplateConfig | null,
): Promise<Uint8Array | null> {
  try {
    console.log("[PDF] Début tryFillTemplatePdf");
    console.log("[PDF] Template config:", templateConfig);
    console.log("[PDF] Input data:", input);
    
    // Vérifier si le template est un PDF (pas un Word)
    const storagePath = templateConfig?.storage_path || "";
    if (storagePath.toLowerCase().endsWith(".docx") || storagePath.toLowerCase().endsWith(".doc")) {
      console.log("[PDF] Template est un fichier Word, pas un PDF - skip");
      return null;
    }
    
    const templateBytes = await downloadTemplate(templateConfig?.storage_path);
    if (!templateBytes) {
      console.warn("[PDF] Pas de template bytes, utilisation du fallback");
      return null;
    }
    
    console.log("[PDF] Template téléchargé, taille:", templateBytes.byteLength);

    const pdfDoc = await PDFDocument.load(templateBytes);
    const form = pdfDoc.getForm();
    const sanitizedMapping = sanitizeMapping(templateConfig?.fields_mapping);
    const formattedDate = formatDateSafe(input.performance_date);
    const formattedTime = formatTimeSafe(input.performance_time);
    
    console.log("[PDF] Mapping sanitisé:", sanitizedMapping);
    console.log("[PDF] Champs du formulaire PDF:", form.getFields().map(f => f.getName()));

    // Fonction pour remplacer les caracteres non supportes par WinAnsi
    const sanitizeForPdf = (str: string | undefined): string | undefined => {
      if (!str) return str;
      return str
        .replace(/\u202f/g, ' ') // Narrow no-break space -> espace normal
        .replace(/\u00a0/g, ' ') // No-break space -> espace normal
        .replace(/\u2019/g, "'") // Right single quotation mark -> apostrophe
        .replace(/\u2018/g, "'") // Left single quotation mark -> apostrophe
        .replace(/\u201c/g, '"') // Left double quotation mark -> guillemet
        .replace(/\u201d/g, '"') // Right double quotation mark -> guillemet
        .replace(/\u2013/g, '-') // En dash -> tiret
        .replace(/\u2014/g, '-') // Em dash -> tiret
        .replace(/\u2026/g, '...'); // Ellipsis -> trois points
    };

    const valueForField = (name: string): string | undefined => {
      const mappedKey = sanitizedMapping[name];
      if (mappedKey) {
        const resolved = resolveTemplateValue(mappedKey, input);
        console.log(`[PDF] Champ "${name}" -> mappedKey "${mappedKey}" -> valeur "${resolved}"`);
        if (resolved !== undefined) return sanitizeForPdf(resolved);
      }
      const heuristic = heuristicValue(name, input, formattedDate, formattedTime);
      if (heuristic) {
        console.log(`[PDF] Champ "${name}" -> heuristique -> valeur "${heuristic}"`);
      }
      return sanitizeForPdf(heuristic);
    };

    const shouldCheckField = (name: string): boolean | undefined => {
      const normalized = name.toLowerCase();
      if (normalized.includes("net") && normalized.includes("montant")) {
        return !!input.amount_is_net;
      }
      return undefined;
    };

    let filledCount = 0;
    form.getFields().forEach((field) => {
      const name = field.getName();
      const type = field.constructor.name;
      
      // Normaliser le type (PDFTextField2 -> PDFTextField, etc.)
      const normalizedType = type.replace(/\d+$/, '');

      if (normalizedType === "PDFCheckBox") {
        const value = shouldCheckField(name);
        if (value === undefined) {
          (field as PDFCheckBox).uncheck();
          return;
        }
        if (value) (field as PDFCheckBox).check();
        else (field as PDFCheckBox).uncheck();
        filledCount++;
        return;
      }

      const value = valueForField(name);
      if (value === undefined) {
        console.log(`[PDF] Champ "${name}" (${normalizedType}) -> pas de valeur`);
        return;
      }

      switch (normalizedType) {
        case "PDFTextField":
          (field as PDFTextField).setText(value);
          filledCount++;
          console.log(`[PDF] Rempli "${name}" avec "${value}"`);
          break;
        case "PDFDropdown":
          try {
            (field as PDFDropdown).select(value);
            filledCount++;
          } catch {
            (field as PDFDropdown).clear();
          }
          break;
        case "PDFOptionList":
          try {
            (field as PDFOptionList).select(value);
            filledCount++;
          } catch {
            (field as PDFOptionList).clear();
          }
          break;
        case "PDFRadioGroup":
          try {
            (field as PDFRadioGroup).select(value);
            filledCount++;
          } catch {
            // ignore
          }
          break;
        default:
          console.log(`[PDF] Type non géré: ${normalizedType} pour champ "${name}"`);
          break;
      }
    });

    console.log(`[PDF] ${filledCount} champs remplis sur ${form.getFields().length}`);
    
    form.updateFieldAppearances();
    form.flatten();

    return await pdfDoc.save();
  } catch (error) {
    console.error("[Booking][PDF] Impossible d'utiliser le template:", error);
    return null;
  }
}

async function downloadTemplate(
  storagePath?: string,
): Promise<ArrayBuffer | null> {
  const pathToUse = storagePath || OFFER_TEMPLATE_PATH;
  if (!OFFER_TEMPLATE_BUCKET || !pathToUse) return null;
  try {
    const { data, error } = await supabase.storage
      .from(OFFER_TEMPLATE_BUCKET)
      .download(pathToUse);
    if (error || !data) return null;
    return await data.arrayBuffer();
  } catch (error) {
    console.warn("[Booking][PDF] Téléchargement template échoué:", error);
    return null;
  }
}

// Sanitize text for PDF (remove non-WinAnsi characters)
function sanitizeTextForPdf(text: string): string {
  return text
    .replace(/\u202f/g, ' ')  // Narrow no-break space -> espace normal
    .replace(/\u00a0/g, ' ')  // No-break space -> espace normal
    .replace(/\u2019/g, "'")  // Right single quotation mark -> apostrophe
    .replace(/\u2018/g, "'")  // Left single quotation mark -> apostrophe
    .replace(/\u201c/g, '"')  // Left double quotation mark -> guillemet
    .replace(/\u201d/g, '"')  // Right double quotation mark -> guillemet
    .replace(/\u2013/g, '-')  // En dash -> tiret
    .replace(/\u2014/g, '-')  // Em dash -> tiret
    .replace(/\u2026/g, '...') // Ellipsis -> trois points
    .replace(/[^\x00-\x7F]/g, (char) => {
      // Remplacer les caractères accentués courants
      const map: Record<string, string> = {
        'é': 'e', 'è': 'e', 'ê': 'e', 'ë': 'e',
        'à': 'a', 'â': 'a', 'ä': 'a',
        'ù': 'u', 'û': 'u', 'ü': 'u',
        'î': 'i', 'ï': 'i',
        'ô': 'o', 'ö': 'o',
        'ç': 'c',
        'É': 'E', 'È': 'E', 'Ê': 'E', 'Ë': 'E',
        'À': 'A', 'Â': 'A', 'Ä': 'A',
        'Ù': 'U', 'Û': 'U', 'Ü': 'U',
        'Î': 'I', 'Ï': 'I',
        'Ô': 'O', 'Ö': 'O',
        'Ç': 'C',
      };
      return map[char] || '';
    });
}

async function generateFallbackPdf(input: OfferPdfInput): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const draw = (text: string, y: number, size = 12) => {
    page.drawText(sanitizeTextForPdf(text), { x: 50, y, size, font });
  };

  let y = 800;
  draw("OFFRE ARTISTE", y, 18);
  y -= 24;
  draw(`Evenement: ${input.event_name || "-"}`, y);
  y -= 18;
  draw(`Artiste: ${input.artist_name || "-"}`, y);
  y -= 18;
  draw(`Scene: ${input.stage_name || "-"}`, y);
  y -= 18;
  draw(
    `Date: ${formatDateSafe(input.performance_date)}  Heure: ${formatTimeSafe(input.performance_time)}  Duree: ${input.duration || "-"}'`,
    y,
  );
  y -= 18;
  draw(`Montant: ${formatAmount(input.amount_display, input.currency)}`, y);
  y -= 18;
  if (input.notes) {
    draw(`Notes: ${input.notes}`, y);
    y -= 18;
  }
  draw(`Offer ID: ${input.offer_id}`, y);
  y -= 18;
  draw(`Genere via Go-Prod`, y);

  return pdfDoc.save();
}

function formatAmount(amount?: number | null, currency?: string | null) {
  if (amount == null) return "-";
  try {
    const formatter = new Intl.NumberFormat("fr-CH", {
      style: currency ? "currency" : "decimal",
      currency: currency || undefined,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return formatter.format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency ?? ""}`.trim();
  }
}

function sanitizeMapping(
  mapping?: Record<string, string> | null,
): Record<string, OfferTemplateFieldKey> {
  if (!mapping) return {};
  const entries: Array<[string, OfferTemplateFieldKey]> = [];
  for (const [field, value] of Object.entries(mapping)) {
    if (!value) continue;
    if (ALLOWED_TEMPLATE_KEYS.has(value as OfferTemplateFieldKey)) {
      entries.push([field, value as OfferTemplateFieldKey]);
    }
  }
  return Object.fromEntries(entries);
}

function resolveTemplateValue(
  key: OfferTemplateFieldKey,
  input: OfferPdfInput,
): string {
  switch (key) {
    case "event_name":
      return input.event_name ?? "";
    case "artist_name":
      return input.artist_name ?? "";
    case "stage_name":
      return input.stage_name ?? "";
    case "performance_date_long":
      return formatDateSafe(input.performance_date);
    case "performance_date_iso":
      return input.performance_date ?? "";
    case "performance_time":
      return formatTimeSafe(input.performance_time);
    case "duration_minutes":
      return input.duration != null ? `${input.duration}` : "";
    case "amount_display":
      return formatAmount(input.amount_display, input.currency);
    case "amount_net":
      return formatAmount(input.amount_net, input.currency);
    case "amount_gross":
      return formatAmount(input.amount_gross, input.currency);
    case "currency":
      return input.currency ?? "";
    case "amount_is_net_label":
      return input.amount_is_net ? "Montant net" : "Montant brut";
    case "notes":
      return input.notes ?? "";
    case "prod_fee_amount":
      return formatAmount(input.prod_fee_amount, input.currency);
    case "backline_fee_amount":
      return formatAmount(input.backline_fee_amount, input.currency);
    case "buyout_hotel_amount":
      return formatAmount(input.buyout_hotel_amount, input.currency);
    case "buyout_meal_amount":
      return formatAmount(input.buyout_meal_amount, input.currency);
    case "flight_contribution_amount":
      return formatAmount(input.flight_contribution_amount, input.currency);
    case "technical_fee_amount":
      return formatAmount(input.technical_fee_amount, input.currency);
    case "extras_summary":
      return input.extras_summary ?? "";
    case "clauses_summary":
      return input.clauses_summary ?? "";
    case "offer_id":
      return input.offer_id;
    case "company_id":
      return input.company_id;
    case "validity_date":
      return input.validity_date ? formatDateSafe(input.validity_date) : "";
    case "agency_commission_pct":
      return input.agency_commission_pct != null ? `${input.agency_commission_pct}%` : "";
    default:
      return "";
  }
}

function heuristicValue(
  fieldName: string,
  input: OfferPdfInput,
  formattedDate: string,
  formattedTime: string,
) {
  const normalized = fieldName.toLowerCase();
  if (
    normalized.includes("event") ||
    normalized.includes("evenement") ||
    normalized.includes("évènement") ||
    normalized.includes("festival")
  ) {
    return input.event_name || "";
  }
  if (normalized.includes("artist") || normalized.includes("artiste")) {
    return input.artist_name || "";
  }
  if (normalized.includes("scene") || normalized.includes("stage")) {
    return input.stage_name || "";
  }
  if (normalized.includes("date")) {
    return formattedDate;
  }
  if (normalized.includes("heure") || normalized.includes("time")) {
    return formattedTime;
  }
  if (
    normalized.includes("duree") ||
    normalized.includes("durée") ||
    normalized.includes("duration")
  ) {
    return input.duration != null ? `${input.duration} min` : "";
  }
  if (
    normalized.includes("montant") ||
    normalized.includes("amount") ||
    normalized.includes("cachet")
  ) {
    return formatAmount(input.amount_display, input.currency);
  }
  if (normalized.includes("net")) {
    return formatAmount(input.amount_net, input.currency);
  }
  if (normalized.includes("brut") || normalized.includes("gross")) {
    return formatAmount(input.amount_gross, input.currency);
  }
  if (normalized.includes("prod")) {
    return formatAmount(input.prod_fee_amount, input.currency);
  }
  if (normalized.includes("backline")) {
    return formatAmount(input.backline_fee_amount, input.currency);
  }
  if (normalized.includes("hotel")) {
    return formatAmount(input.buyout_hotel_amount, input.currency);
  }
  if (normalized.includes("repas") || normalized.includes("meal")) {
    return formatAmount(input.buyout_meal_amount, input.currency);
  }
  if (normalized.includes("vol") || normalized.includes("flight")) {
    return formatAmount(input.flight_contribution_amount, input.currency);
  }
  if (normalized.includes("tech")) {
    return formatAmount(input.technical_fee_amount, input.currency);
  }
  if (normalized.includes("extra")) {
    return input.extras_summary || "";
  }
  if (normalized.includes("clause") || normalized.includes("exclu")) {
    return input.clauses_summary || "";
  }
  if (normalized.includes("currency") || normalized.includes("devise")) {
    return input.currency || "";
  }
  if (normalized.includes("notes") || normalized.includes("remarque")) {
    return input.notes || "";
  }
  if (normalized.includes("offre") && normalized.includes("id")) {
    return input.offer_id;
  }
  if (normalized.includes("company")) {
    return input.company_id;
  }
  return undefined;
}
