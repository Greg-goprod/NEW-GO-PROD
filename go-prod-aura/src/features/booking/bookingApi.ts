/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from "@/lib/supabaseClient";
import type { Offer, OfferFilters, OfferSort, OfferStatus, TodoPerformance, RejectedPerformance } from "./bookingTypes";
import { generateOfferPdfAndUpload } from "./pdf/pdfFill";

// Helpers no-event: on ne jette pas d'exception, on renvoie des tableaux vides
const noEventGuard = (eventId?: string | null) => !eventId || String(eventId).trim() === "";

export async function listOffers(params: {
  eventId?: string;
  filters?: OfferFilters;
  sort?: OfferSort;
  limit?: number;
  offset?: number;
}): Promise<Offer[]> {
  const { eventId, filters, sort, limit = 200, offset = 0 } = params;
  if (noEventGuard(eventId)) return []; // no RPC
  const { data, error } = await supabase.rpc("fn_list_offers", {
    p_event_id: eventId,
    p_search: filters?.search ?? null,
    p_statuses: filters?.statuses ?? null,
    p_created_from: filters?.created_from ?? null,
    p_created_to: filters?.created_to ?? null,
    p_sort_field: sort?.field ?? "created_at",
    p_sort_dir: sort?.direction ?? "desc",
    p_limit: limit,
    p_offset: offset,
  });
  if (error) throw error;
  
  const offers = (data ?? []) as Offer[];
  
  // Enrichir avec word_storage_path si la fonction RPC ne le retourne pas
  const offerIds = offers.filter(o => o.type !== "performance" && !o.word_storage_path).map(o => o.id);
  if (offerIds.length > 0) {
    const { data: wordPaths } = await supabase
      .from("offers")
      .select("id, word_storage_path")
      .in("id", offerIds);
    
    if (wordPaths) {
      const pathMap = new Map(wordPaths.map(p => [p.id, p.word_storage_path]));
      offers.forEach(o => {
        if (pathMap.has(o.id)) {
          o.word_storage_path = pathMap.get(o.id) ?? undefined;
        }
      });
    }
  }
  
  return offers;
}

export async function moveOffer(offerId: string, newStatus: OfferStatus, rejectionReason?: string) {
  const { data, error } = await supabase.rpc('fn_move_offer', {
    p_offer_id: offerId,
    p_new_status: newStatus,
    p_rejection_reason: rejectionReason ?? null,
  });
  if (error) throw error;
  
  // Si passage en ready_to_send, on génère le PDF après update
  if (newStatus === "ready_to_send") {
    await generateOfferPdfOnStatusChange(offerId);
  }
  if (newStatus === "accepted") {
    // TODO: createContractFromAcceptedOffer(offerId) — on l'implémentera quand module Contrats sera prêt
  }
  
  return data as Offer;
}

export async function getTodoPerformances(eventId?: string): Promise<TodoPerformance[]> {
  if (noEventGuard(eventId)) return [];
  const { data, error } = await supabase.rpc("fn_booking_todo_performances", { p_event_id: eventId });
  if (error) throw error;
  return (data ?? []) as TodoPerformance[];
}

export async function getRejectedPerformances(eventId?: string): Promise<RejectedPerformance[]> {
  if (noEventGuard(eventId)) return [];
  const { data, error } = await supabase.rpc("fn_booking_rejected_performances", { p_event_id: eventId });
  if (error) throw error;
  return (data ?? []) as RejectedPerformance[];
}

export async function prepareOfferPdfPath(offerId: string): Promise<Offer> {
  const { data, error } = await supabase.rpc('fn_send_offer_prepare', { p_offer_id: offerId });
  if (error) throw error;
  return data as Offer;
}

const DEFAULT_SIGNED_EXPIRY = 7 * 24 * 60 * 60;

export async function createSignedOfferPdfUrl(pdfStoragePath?: string | null, expirySec = DEFAULT_SIGNED_EXPIRY) {
  if (!pdfStoragePath) return null;
  const { data, error } = await supabase.storage.from("offers").createSignedUrl(pdfStoragePath, expirySec);
  if (error) throw error;
  return data?.signedUrl ?? null;
}

export async function deleteOffer(offerId: string) {
  await supabase.from("offer_extras").delete().eq("offer_id", offerId);
  const { error } = await supabase.from("offers").delete().eq("id", offerId);
  if (error) throw error;
}

export async function generateOfferPdfOnStatusChange(offerId: string) {
  // 0) si déjà PDF, ne rien faire
  const { data: existing, error: e1 } = await supabase
    .from("offers")
    .select(`
      id, event_id, company_id, artist_id, stage_id,
      artist_name, stage_name,
      amount_display, amount_net, amount_gross, currency, amount_is_net,
      prod_fee_amount, backline_fee_amount, buyout_hotel_amount, buyout_meal_amount,
      flight_contribution_amount, technical_fee_amount,
      notes, terms_json,
      pdf_storage_path, date_time, performance_time, duration
    `)
    .eq("id", offerId)
    .single();
  if (e1) throw e1;
  if (existing?.pdf_storage_path) return; // déjà généré

  // 1) récupérer info événement + artiste
  let eventName = "Event";
  if (existing?.event_id) {
    const ev = await supabase.from("events").select("name").eq("id", existing.event_id).single();
    eventName = ev.data?.name || eventName;
  }
  let artistName = existing?.artist_name || "Artiste";
  if (!artistName && existing?.artist_id) {
    const ar = await supabase.from("artists").select("name").eq("id", existing.artist_id).single();
    artistName = ar.data?.name || artistName;
  }

  // 2) durée/perf_time : si manquants, tenter via artist_performances
  let perfTime = existing?.performance_time || null;
  let perfDate = existing?.date_time || null;
  let duration = existing?.duration || null;
  if (!perfTime || !perfDate || !duration) {
    const perf = await supabase.from("artist_performances").select(`
      performance_time, duration,
      event_days ( date )
    `)
      .eq("artist_id", existing?.artist_id || "")
      .eq("event_stage_id", existing?.stage_id || "")
      .limit(1).maybeSingle();
    perfTime = perf.data?.performance_time || perfTime;
    perfDate = (Array.isArray(perf.data?.event_days) && perf.data.event_days[0]?.date) || perfDate;
    duration = perf.data?.duration || duration;
  }

  const extrasSummary = await buildExtrasSummary(offerId);
  const clausesSummary = await buildClausesSummary(existing?.terms_json);

  // 3) Construire payload et générer+uploader
  const pdfPayload = {
    event_name: eventName,
    artist_name: artistName,
    stage_name: existing?.stage_name || "",
    performance_date: perfDate || existing?.date_time || "",
    performance_time: perfTime || "",
    duration: duration || null,
    currency: existing?.currency || null,
    amount_display: existing?.amount_display || null,
    amount_net: existing?.amount_net || null,
    amount_gross: existing?.amount_gross || null,
    notes: existing?.notes || null,
    prod_fee_amount: existing?.prod_fee_amount || null,
    backline_fee_amount: existing?.backline_fee_amount || null,
    buyout_hotel_amount: existing?.buyout_hotel_amount || null,
    buyout_meal_amount: existing?.buyout_meal_amount || null,
    flight_contribution_amount: existing?.flight_contribution_amount || null,
    technical_fee_amount: existing?.technical_fee_amount || null,
    extras_summary: extrasSummary,
    clauses_summary: clausesSummary,
    offer_id: offerId,
    event_id: existing?.event_id,
    company_id: existing?.company_id,
    amount_is_net: existing?.amount_is_net ?? null,
  } as any;

  const { storagePath } = await generateOfferPdfAndUpload(pdfPayload);

  // 4) Mettre à jour l'offre
  const { error: e2 } = await supabase.from("offers").update({ pdf_storage_path: storagePath, updated_at: new Date().toISOString() }).eq("id", offerId);
  if (e2) throw e2;
  return;
}

async function buildExtrasSummary(offerId: string) {
  type ExtraRow = {
    charge_to: string | null;
    booking_extras?: { name?: string | null } | null;
  };
  try {
    const { data, error } = await supabase
      .from("offer_extras")
      .select("charge_to, booking_extras(name)")
      .eq("offer_id", offerId)
      .order("created_at", { ascending: true });
    if (error) throw error;
    const extras = (data as ExtraRow[]) ?? [];
    if (!extras.length) return "";
    return extras
      .map((row) => {
        const name = row.booking_extras?.name || "Extra";
        const payer =
          row.charge_to === "artist"
            ? "Artiste"
            : row.charge_to === "festival"
              ? "Festival"
              : "";
        return payer ? `${name} — ${payer}` : name;
      })
      .join("\n");
  } catch (error) {
    console.warn("[Booking][PDF] Impossible de récupérer les extras:", error);
    return "";
  }
}

async function buildClausesSummary(termsJson?: Record<string, any> | null) {
  try {
    const selectedIds = Array.isArray(termsJson?.selectedClauseIds)
      ? termsJson?.selectedClauseIds
      : [];
    if (!selectedIds || selectedIds.length === 0) return "";
    const { data, error } = await supabase
      .from("exclusivity_clauses")
      .select("id, text")
      .in("id", selectedIds);
    if (error) throw error;
    return (
      data?.map((clause) => `• ${clause.text || clause.id}`).join("\n") || ""
    );
  } catch (error) {
    console.warn("[Booking][PDF] Impossible de récupérer les clauses:", error);
    return "";
  }
}

// Nouvelles fonctions pour les modaux
export async function createOffer(payload: any): Promise<Offer> {
  const { data, error } = await supabase
    .from("offers")
    .insert({
      ...payload,
      status: payload.status || "draft",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();
    
  if (error) throw error;
  return data as Offer;
}

export async function updateOffer(id: string, payload: any): Promise<Offer> {
  const { data, error } = await supabase
    .from("offers")
    .update({
      ...payload,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();
    
  if (error) throw error;
  return data as Offer;
}

export async function createOfferVersion(originalOfferId: string, basePayload: any): Promise<Offer> {
  // Récupérer la version actuelle
  const { data: original, error: e1 } = await supabase
    .from("offers")
    .select("version")
    .eq("id", originalOfferId)
    .single();
    
  if (e1) throw e1;
  
  const nextVersion = (original?.version || 0) + 1;
  
  const { data, error } = await supabase
    .from("offers")
    .insert({
      ...basePayload,
      original_offer_id: originalOfferId,
      version: nextVersion,
      status: "draft",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();
    
  if (error) throw error;
  return data as Offer;
}

export async function getNextOfferVersion(originalOfferId: string): Promise<number> {
  const { data, error } = await supabase
    .from("offers")
    .select("version")
    .or(`id.eq.${originalOfferId},original_offer_id.eq.${originalOfferId}`)
    .order("version", { ascending: false })
    .limit(1)
    .single();
    
  if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
  return (data?.version || 0) + 1;
}
