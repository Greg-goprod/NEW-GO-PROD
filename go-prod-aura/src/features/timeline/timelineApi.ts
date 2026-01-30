import { supabase } from "../../lib/supabaseClient";

// Types
export type BookingStatus = 
  | 'idee' 
  | 'offre_a_faire' 
  | 'offre_envoyee' 
  | 'offre_acceptee'
  | 'offre_rejetee';

export interface EventDay {
  id: string;
  date: string;
  open_time: string;
  close_time: string;
}

export interface EventStage {
  id: string;
  name: string;
  type: string | null;
  capacity: number | null;
  display_order: number;
}

export interface Artist {
  id: string;
  name: string;
  company_id: string;
}

export interface Performance {
  id: string;
  artist_id: string;
  artist_name: string;
  stage_id: string;
  stage_name: string;
  event_day_id: string;
  event_day_date: string;
  performance_time: string;
  duration: number;
  fee_amount: number | null;
  fee_currency: string | null;
  commission_percentage: number | null;
  fee_is_net?: boolean | null;
  subject_to_withholding_tax?: boolean | null;
  booking_status: BookingStatus;
  rejection_reason?: string | null;
  rejection_date?: string | null;
  notes?: string | null;
  is_confirmed?: boolean;
  confirmed_at?: string | null;
  // Frais additionnels
  prod_fee_amount?: number | null;
  backline_fee_amount?: number | null;
  buyout_hotel_amount?: number | null;
  buyout_meal_amount?: number | null;
  flight_contribution_amount?: number | null;
  technical_fee_amount?: number | null;
  card_color?: string | null;
}

export interface PerformanceCreate {
  event_day_id: string;
  event_stage_id: string;
  artist_id: string;
  performance_time: string;
  duration: number;
  fee_amount?: number | null;
  fee_currency?: string | null;
  commission_percentage?: number | null;
  fee_is_net?: boolean | null;
  subject_to_withholding_tax?: boolean | null;
  booking_status?: BookingStatus;
  notes?: string | null;
  is_confirmed?: boolean;
  created_for_event_id?: string | null;
  // Frais additionnels
  prod_fee_amount?: number | null;
  backline_fee_amount?: number | null;
  buyout_hotel_amount?: number | null;
  buyout_meal_amount?: number | null;
  flight_contribution_amount?: number | null;
  technical_fee_amount?: number | null;
  card_color?: string | null;
}

export interface PerformanceUpdate {
  id: string;
  artist_id?: string;
  event_day_id?: string;
  event_stage_id?: string;
  performance_time?: string;
  duration?: number | null;
  fee_amount?: number | null;
  fee_currency?: string | null;
  commission_percentage?: number | null;
  fee_is_net?: boolean | null;
  subject_to_withholding_tax?: boolean | null;
  booking_status?: BookingStatus | null;
  rejection_reason?: string | null;
  rejection_date?: string | null;
  notes?: string | null;
  is_confirmed?: boolean | null;
  confirmed_at?: string | null;
  // Frais additionnels
  prod_fee_amount?: number | null;
  backline_fee_amount?: number | null;
  buyout_hotel_amount?: number | null;
  buyout_meal_amount?: number | null;
  flight_contribution_amount?: number | null;
  technical_fee_amount?: number | null;
  card_color?: string | null;
}

// Guards
const noEventGuard = (eventId?: string | null) => !eventId || String(eventId).trim() === "";
const noCompanyGuard = (companyId?: string | null) => !companyId || String(companyId).trim() === "";

// Helper Functions
export function minToHHMM(min: number): string {
  // Gérer les minutes négatives en les wrappant dans les 24 heures
  let totalMinutes = min;
  
  // Si négatif, ajouter des multiples de 24h jusqu'à ce que ce soit positif
  while (totalMinutes < 0) {
    totalMinutes += 24 * 60;
  }
  
  // Si >= 24h, ramener dans l'intervalle [0, 24h[
  totalMinutes = totalMinutes % (24 * 60);
  
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

export function hhmmToMin(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

export function snapTo5(minutes: number): number {
  return Math.round(minutes / 5) * 5;
}

export function toIsoTime(hhmm: string): string {
  return hhmm.length === 5 ? `${hhmm}:00` : hhmm;
}

export function minutesSinceOpen(performanceTime: string, openTime: string): number {
  const perfMin = hhmmToMin(performanceTime);
  const openMin = hhmmToMin(openTime);
  return perfMin - openMin;
}

export function calculateDayDuration(openTime: string, closeTime: string): number {
  const openMin = hhmmToMin(openTime);
  const closeMin = hhmmToMin(closeTime);
  
  // Si close < open, c'est le lendemain
  if (closeMin < openMin) {
    return (24 * 60) - openMin + closeMin;
  }
  
  return closeMin - openMin;
}

// API Functions
export async function fetchArtists(companyId?: string): Promise<Artist[]> {
  console.log("📦 fetchArtists appelé avec companyId:", companyId);
  
  if (noCompanyGuard(companyId)) {
    console.warn("⚠️ fetchArtists: companyId vide ou invalide");
    return [];
  }
  
  const { data, error } = await supabase
    .from("artists")
    .select("id, name, company_id")
    .eq("company_id", companyId)
    .order("name", { ascending: true });
  
  console.log("📦 fetchArtists résultat:", data?.length || 0, "artistes");
  
  if (error) {
    console.error("❌ fetchArtists erreur:", error);
    throw error;
  }
  
  return data || [];
}

export async function fetchEventDays(eventId?: string): Promise<EventDay[]> {
  if (noEventGuard(eventId)) return [];
  
  const { data, error } = await supabase
    .from("event_days")
    .select("id, date, open_time, close_time")
    .eq("event_id", eventId)
    .order("date", { ascending: true });
    
  if (error) throw error;
  return data || [];
}

export async function fetchEventStages(eventId?: string): Promise<EventStage[]> {
  if (noEventGuard(eventId)) return [];
  
  const { data, error } = await supabase
    .from("event_stages")
    .select("id, name, type, capacity, display_order")
    .eq("event_id", eventId)
    .order("display_order", { ascending: true });
    
  if (error) throw error;
  return data || [];
}

export async function fetchPerformances(eventId?: string): Promise<Performance[]> {
  if (noEventGuard(eventId)) return [];
  
  // Récupérer les IDs des jours de l'événement
  const { data: eventDaysData, error: daysError } = await supabase
    .from("event_days")
    .select("id")
    .eq("event_id", eventId);
  
  if (daysError) {
    console.error("❌ Erreur récupération event_days:", daysError);
    throw daysError;
  }
  
  const dayIds = eventDaysData?.map(d => d.id) || [];
  console.log("📅 fetchPerformances - eventId:", eventId, "dayIds:", dayIds);
  
  if (dayIds.length === 0) {
    console.warn("⚠️ Aucun jour trouvé pour l'événement:", eventId);
    return [];
  }
  
  const { data, error } = await supabase
    .from("artist_performances")
    .select(`
      id, artist_id, event_day_id, event_stage_id, performance_time, duration, 
      fee_amount, fee_currency, commission_percentage, fee_is_net, subject_to_withholding_tax,
      booking_status, rejection_reason, rejection_date,
      notes, is_confirmed, confirmed_at,
      prod_fee_amount, backline_fee_amount, buyout_hotel_amount, buyout_meal_amount,
      flight_contribution_amount, technical_fee_amount,
      card_color,
      artists (name),
      event_stages (name),
      event_days (date)
    `)
    .neq("booking_status", "offre_rejetee")
    .in("event_day_id", dayIds);
  
  console.log("🎭 fetchPerformances - performances trouvées:", data?.length || 0);
    
  if (error) throw error;
  
  return (data || []).map((p: any) => ({
    id: p.id,
    artist_id: p.artist_id,
    artist_name: p.artists?.name || "Artiste inconnu",
    stage_id: p.event_stage_id,
    stage_name: p.event_stages?.name || "Scène inconnue",
    event_day_id: p.event_day_id,
    event_day_date: p.event_days?.date || "",
    performance_time: p.performance_time,
    duration: p.duration,
    fee_amount: p.fee_amount,
    fee_currency: p.fee_currency,
    commission_percentage: p.commission_percentage,
    fee_is_net: p.fee_is_net,
    subject_to_withholding_tax: p.subject_to_withholding_tax,
    booking_status: p.booking_status,
    rejection_reason: p.rejection_reason,
    rejection_date: p.rejection_date,
    notes: p.notes,
    is_confirmed: p.is_confirmed,
    confirmed_at: p.confirmed_at,
    // Frais additionnels
    prod_fee_amount: p.prod_fee_amount,
    backline_fee_amount: p.backline_fee_amount,
    buyout_hotel_amount: p.buyout_hotel_amount,
    buyout_meal_amount: p.buyout_meal_amount,
    flight_contribution_amount: p.flight_contribution_amount,
    technical_fee_amount: p.technical_fee_amount,
    card_color: p.card_color,
  }));
}

export async function checkPerformanceUniqueness({
  event_day_id,
  event_stage_id,
  performance_time,
  artist_id,
  exclude_id
}: {
  event_day_id: string;
  event_stage_id: string;
  performance_time: string;
  artist_id: string;
  exclude_id?: string;
}): Promise<boolean> {
  let query = supabase
    .from("artist_performances")
    .select("id", { count: "exact" })
    .eq("event_day_id", event_day_id)
    .eq("event_stage_id", event_stage_id)
    .eq("performance_time", performance_time)
    .eq("artist_id", artist_id);
    
  if (exclude_id) {
    query = query.neq("id", exclude_id);
  }
  
  const { count, error } = await query;
  if (error) throw error;
  
  return (count || 0) === 0;
}

export async function createPerformance(input: PerformanceCreate): Promise<Performance> {
  // Récupérer l'event_id depuis event_day_id si created_for_event_id n'est pas fourni
  let eventId = input.created_for_event_id;
  if (!eventId && input.event_day_id) {
    const { data: dayData } = await supabase
      .from("event_days")
      .select("event_id")
      .eq("id", input.event_day_id)
      .single();
    eventId = dayData?.event_id;
  }

  const { data, error } = await supabase
    .from("artist_performances")
    .insert({
      event_id: eventId, // Colonne obligatoire (NOT NULL)
      event_day_id: input.event_day_id,
      event_stage_id: input.event_stage_id,
      artist_id: input.artist_id,
      performance_time: toIsoTime(input.performance_time),
      duration: input.duration,
      fee_amount: input.fee_amount,
      fee_currency: input.fee_currency,
      commission_percentage: input.commission_percentage,
      fee_is_net: input.fee_is_net,
      subject_to_withholding_tax: input.subject_to_withholding_tax ?? true, // Par défaut soumis
      booking_status: input.booking_status || "idee",
      notes: input.notes,
      is_confirmed: input.is_confirmed || false,
      created_for_event_id: eventId, // Colonne de tracking
      // Frais additionnels
      prod_fee_amount: input.prod_fee_amount,
      backline_fee_amount: input.backline_fee_amount,
      buyout_hotel_amount: input.buyout_hotel_amount,
      buyout_meal_amount: input.buyout_meal_amount,
      flight_contribution_amount: input.flight_contribution_amount,
      technical_fee_amount: input.technical_fee_amount,
      card_color: input.card_color,
    })
    .select(`
      id, artist_id, event_day_id, event_stage_id, performance_time, duration, 
      fee_amount, fee_currency, commission_percentage, fee_is_net, subject_to_withholding_tax,
      booking_status, rejection_reason, rejection_date,
      notes, is_confirmed, confirmed_at,
      prod_fee_amount, backline_fee_amount, buyout_hotel_amount, buyout_meal_amount,
      flight_contribution_amount, technical_fee_amount,
      card_color,
      artists (name),
      event_stages (name),
      event_days (date)
    `)
    .single();
    
  if (error) throw error;
  
  return {
    id: data.id,
    artist_id: data.artist_id,
    artist_name: (data.artists as any)?.name || "Artiste inconnu",
    stage_id: data.event_stage_id,
    stage_name: (data.event_stages as any)?.name || "Scène inconnue",
    event_day_id: data.event_day_id,
    event_day_date: (data.event_days as any)?.date || "",
    performance_time: data.performance_time,
    duration: data.duration,
    fee_amount: data.fee_amount,
    fee_currency: data.fee_currency,
    commission_percentage: data.commission_percentage,
    fee_is_net: data.fee_is_net,
    subject_to_withholding_tax: data.subject_to_withholding_tax,
    booking_status: data.booking_status,
    rejection_reason: data.rejection_reason,
    rejection_date: data.rejection_date,
    notes: data.notes,
    is_confirmed: data.is_confirmed,
    confirmed_at: data.confirmed_at,
    // Frais additionnels
    prod_fee_amount: data.prod_fee_amount,
    backline_fee_amount: data.backline_fee_amount,
    buyout_hotel_amount: data.buyout_hotel_amount,
    buyout_meal_amount: data.buyout_meal_amount,
    flight_contribution_amount: data.flight_contribution_amount,
    technical_fee_amount: data.technical_fee_amount,
    card_color: data.card_color,
  };
}

export async function updatePerformance(input: PerformanceUpdate): Promise<Performance> {
  const updateData: any = {};
  
  // Si event_day_id change, on doit aussi mettre à jour event_id
  if (input.event_day_id !== undefined) {
    updateData.event_day_id = input.event_day_id;
    // Récupérer l'event_id depuis le nouveau event_day_id
    const { data: dayData } = await supabase
      .from("event_days")
      .select("event_id")
      .eq("id", input.event_day_id)
      .single();
    if (dayData?.event_id) {
      updateData.event_id = dayData.event_id;
    }
  }
  
  if (input.artist_id !== undefined) updateData.artist_id = input.artist_id;
  if (input.event_stage_id !== undefined) updateData.event_stage_id = input.event_stage_id;
  if (input.performance_time !== undefined) updateData.performance_time = toIsoTime(input.performance_time);
  if (input.duration !== undefined) updateData.duration = input.duration;
  if (input.fee_amount !== undefined) updateData.fee_amount = input.fee_amount;
  if (input.fee_currency !== undefined) updateData.fee_currency = input.fee_currency;
  if (input.commission_percentage !== undefined) updateData.commission_percentage = input.commission_percentage;
  if (input.fee_is_net !== undefined) updateData.fee_is_net = input.fee_is_net;
  if (input.subject_to_withholding_tax !== undefined) updateData.subject_to_withholding_tax = input.subject_to_withholding_tax;
  if (input.booking_status !== undefined) updateData.booking_status = input.booking_status;
  if (input.rejection_reason !== undefined) updateData.rejection_reason = input.rejection_reason;
  if (input.rejection_date !== undefined) updateData.rejection_date = input.rejection_date;
  if (input.notes !== undefined) updateData.notes = input.notes;
  if (input.is_confirmed !== undefined) updateData.is_confirmed = input.is_confirmed;
  if (input.confirmed_at !== undefined) updateData.confirmed_at = input.confirmed_at;
  // Frais additionnels
  if (input.prod_fee_amount !== undefined) updateData.prod_fee_amount = input.prod_fee_amount;
  if (input.backline_fee_amount !== undefined) updateData.backline_fee_amount = input.backline_fee_amount;
  if (input.buyout_hotel_amount !== undefined) updateData.buyout_hotel_amount = input.buyout_hotel_amount;
  if (input.buyout_meal_amount !== undefined) updateData.buyout_meal_amount = input.buyout_meal_amount;
  if (input.flight_contribution_amount !== undefined) updateData.flight_contribution_amount = input.flight_contribution_amount;
  if (input.technical_fee_amount !== undefined) updateData.technical_fee_amount = input.technical_fee_amount;
  if (input.card_color !== undefined) updateData.card_color = input.card_color;
  
  updateData.updated_at = new Date().toISOString();
  
  const { data, error } = await supabase
    .from("artist_performances")
    .update(updateData)
    .eq("id", input.id)
    .select(`
      id, artist_id, event_day_id, event_stage_id, performance_time, duration, 
      fee_amount, fee_currency, commission_percentage, fee_is_net, subject_to_withholding_tax,
      booking_status, rejection_reason, rejection_date,
      notes, is_confirmed, confirmed_at,
      prod_fee_amount, backline_fee_amount, buyout_hotel_amount, buyout_meal_amount,
      flight_contribution_amount, technical_fee_amount,
      card_color,
      artists (name),
      event_stages (name),
      event_days (date)
    `)
    .single();
    
  if (error) throw error;
  
  return {
    id: data.id,
    artist_id: data.artist_id,
    artist_name: (data.artists as any)?.name || "Artiste inconnu",
    stage_id: data.event_stage_id,
    stage_name: (data.event_stages as any)?.name || "Scène inconnue",
    event_day_id: data.event_day_id,
    event_day_date: (data.event_days as any)?.date || "",
    performance_time: data.performance_time,
    duration: data.duration,
    fee_amount: data.fee_amount,
    fee_currency: data.fee_currency,
    commission_percentage: data.commission_percentage,
    fee_is_net: data.fee_is_net,
    subject_to_withholding_tax: data.subject_to_withholding_tax,
    booking_status: data.booking_status,
    rejection_reason: data.rejection_reason,
    rejection_date: data.rejection_date,
    notes: data.notes,
    is_confirmed: data.is_confirmed,
    confirmed_at: data.confirmed_at,
    // Frais additionnels
    prod_fee_amount: data.prod_fee_amount,
    backline_fee_amount: data.backline_fee_amount,
    buyout_hotel_amount: data.buyout_hotel_amount,
    buyout_meal_amount: data.buyout_meal_amount,
    flight_contribution_amount: data.flight_contribution_amount,
    technical_fee_amount: data.technical_fee_amount,
    card_color: data.card_color,
  };
}

export async function deletePerformance(id: string): Promise<void> {
  const { error } = await supabase
    .from("artist_performances")
    .delete()
    .eq("id", id);
    
  if (error) throw error;
}

/**
 * Récupère ou crée l'artiste "À définir" pour une entreprise
 * Cet artiste sert de placeholder quand aucun artiste n'est sélectionné
 */
export async function getOrCreatePlaceholderArtist(companyId: string): Promise<string> {
  if (noCompanyGuard(companyId)) {
    throw new Error("Company ID requis pour créer/récupérer l'artiste placeholder");
  }

  const PLACEHOLDER_NAME = "À définir";

  // Vérifier si l'artiste "À définir" existe déjà
  const { data: existingArtist, error: fetchError } = await supabase
    .from("artists")
    .select("id")
    .eq("company_id", companyId)
    .eq("name", PLACEHOLDER_NAME)
    .maybeSingle();

  if (fetchError) throw fetchError;

  // Si l'artiste existe, retourner son ID
  if (existingArtist) {
    return existingArtist.id;
  }

  // Sinon, créer l'artiste "À définir"
  const { data: newArtist, error: createError } = await supabase
    .from("artists")
    .insert({
      name: PLACEHOLDER_NAME,
      company_id: companyId,
    })
    .select("id")
    .single();

  if (createError) throw createError;

  return newArtist.id;
}

export async function fetchOffersLight(eventId?: string): Promise<Record<string, string>> {
  if (noEventGuard(eventId)) return {};
  
  const { data, error } = await supabase
    .from("offers")
    .select("artist_id, stage_id, event_id, status")
    .eq("event_id", eventId);
    
  if (error) throw error;
  
  const offersMap: Record<string, string> = {};
  (data || []).forEach((offer: any) => {
    const key = `${offer.artist_id}|${offer.stage_id}|${offer.event_id}`;
    offersMap[key] = offer.status;
  });
  
  return offersMap;
}
