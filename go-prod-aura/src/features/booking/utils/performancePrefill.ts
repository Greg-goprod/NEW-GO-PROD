import { supabase } from "@/lib/supabaseClient";

type RawPerformance = {
  id: string;
  artist_id: string;
  event_stage_id: string;
  event_day_id: string;
  performance_time: string;
  duration: number | null;
  fee_amount: number | null;
  fee_currency: string | null;
  fee_is_net?: boolean | null;
  commission_percentage?: number | null;
  prod_fee_amount?: number | null;
  backline_fee_amount?: number | null;
  buyout_hotel_amount?: number | null;
  buyout_meal_amount?: number | null;
  flight_contribution_amount?: number | null;
  technical_fee_amount?: number | null;
  artists?: { name?: string | null } | null;
  event_days?: { date?: string | null } | null;
  event_stages?: { id: string; name?: string | null } | null;
};

/**
 * Récupère toutes les informations nécessaires pour pré-remplir l'OfferComposer
 * à partir d'une performance provenant de la Timeline ou du Budget Artistique.
 */
export async function fetchPerformancePrefill(performanceId?: string | null) {
  if (!performanceId) return null;

  const { data, error } = await supabase
    .from("artist_performances")
    .select(
      `
        id,
        artist_id,
        event_stage_id,
        event_day_id,
        performance_time,
        duration,
        fee_amount,
        fee_currency,
        fee_is_net,
        commission_percentage,
        prod_fee_amount,
        backline_fee_amount,
        buyout_hotel_amount,
        buyout_meal_amount,
        flight_contribution_amount,
        technical_fee_amount,
        artists ( name ),
        event_days ( date ),
        event_stages ( id, name )
      `
    )
    .eq("id", performanceId)
    .single<RawPerformance>();

  if (error) {
    throw error;
  }

  if (!data) return null;

  return {
    performance_id: data.id,
    artist_id: data.artist_id,
    artist_name: data.artists?.name ?? "",
    stage_id: data.event_stage_id,
    stage_name: data.event_stages?.name ?? "",
    event_day_date: data.event_days?.date ?? null,
    performance_time: data.performance_time,
    duration: data.duration,
    fee_amount: data.fee_amount,
    fee_currency: data.fee_currency,
    amount_is_net: data.fee_is_net ?? undefined,
    commission_percentage: data.commission_percentage ?? null,
    prod_fee_amount: data.prod_fee_amount ?? null,
    backline_fee_amount: data.backline_fee_amount ?? null,
    buyout_hotel_amount: data.buyout_hotel_amount ?? null,
    buyout_meal_amount: data.buyout_meal_amount ?? null,
    flight_contribution_amount: data.flight_contribution_amount ?? null,
    technical_fee_amount: data.technical_fee_amount ?? null,
  };
}






