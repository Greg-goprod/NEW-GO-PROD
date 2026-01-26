import { PDFDocument, StandardFonts } from "pdf-lib";
import { supabase } from "../../../lib/supabaseClient";
import { normalizeName, toHHMM, formatIsoDate } from "../../../services/date";

export type OfferPdfInput = {
  event_name?: string;
  artist_name?: string;
  stage_name?: string;
  performance_date?: string;      // ISO date
  performance_time?: string;      // "HH:MM:SS"
  duration?: number | null;
  currency?: string | null;
  amount_display?: number | null;
  notes?: string | null;
  offer_id: string;
  event_id: string;
  company_id: string;
};

export async function generateOfferPdfAndUpload(input: OfferPdfInput): Promise<{ storagePath: string }> {
  // 1) Crée un PDF minimal (MVP)
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const draw = (text: string, y: number, size=12) => {
    page.drawText(text, { x: 50, y, size, font });
  };

  let y = 800;
  draw("OFFRE ARTISTE", y, 18); y -= 24;
  draw(`Évènement: ${input.event_name || "-"}`, y); y -= 18;
  draw(`Artiste: ${input.artist_name || "-"}`, y); y -= 18;
  draw(`Scène: ${input.stage_name || "-"}`, y); y -= 18;
  draw(`Date: ${formatIsoDate(input.performance_date)}  Heure: ${toHHMM(input.performance_time)}  Durée: ${input.duration || "-"}'`, y); y -= 18;
  draw(`Montant: ${input.amount_display ?? "-"} ${input.currency ?? ""}`, y); y -= 18;
  if (input.notes) { draw(`Notes: ${input.notes}`, y); y -= 18; }
  draw(`Offer ID: ${input.offer_id}`, y); y -= 18;
  draw(`Généré via Go-Prod`, y);

  const pdfBytes = await pdfDoc.save();

  // 2) Upload dans bucket 'offers'
  const cleanEvent = normalizeName(input.event_name);
  const cleanArtist = normalizeName(input.artist_name);
  const base = `OFFRE_${cleanEvent || "EVENT"}_${cleanArtist || "ARTIST"}`;
  const fileName = `${base}.pdf`;
  const storagePath = `${input.event_id}/${input.offer_id}/${fileName}`; // offers/<event>/<offer>/OFFRE_...

  // overwrite = true
  const { error: upErr } = await supabase.storage.from("offers").upload(storagePath, new Blob([pdfBytes], { type: "application/pdf" }), { upsert: true });
  if (upErr) throw upErr;

  return { storagePath };
}

