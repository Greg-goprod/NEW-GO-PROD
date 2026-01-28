import { supabase } from "@/lib/supabaseClient";

// =============================================================================
// Types
// =============================================================================
export interface OfferSettings {
  id: string;
  company_id: string;
  
  // Note pour les extras
  extras_note: string | null;
  
  // Note pour les clauses d'exclusivite
  exclusivity_note: string | null;
  
  // Transports locaux
  transport_note: string | null;
  transport_content: string | null;
  
  // Conditions de paiement
  payment_note: string | null;
  payment_content: string | null;
  
  // Validite de l'offre
  validity_text: string | null;
  
  // Clauses additionnelles
  stage_pa_lights: string | null;
  screens: string | null;
  merchandising: string | null;
  withholding_taxes: string | null;
  decibel_limit: string | null;
  tour_bus: string | null;
  catering_meals: string | null;
  artwork: string | null;
  
  // Corps HTML des emails d'offres
  email_body_html: string | null;
  
  created_at: string;
  updated_at: string;
}

export type OfferSettingsInput = Omit<OfferSettings, "id" | "created_at" | "updated_at">;

// =============================================================================
// API Functions
// =============================================================================

/**
 * Recupere les parametres d'offre pour une company
 */
export async function fetchOfferSettings(companyId: string): Promise<OfferSettings | null> {
  const { data, error } = await supabase
    .from("offer_settings")
    .select("*")
    .eq("company_id", companyId)
    .maybeSingle();

  if (error) {
    console.error("[offerSettingsApi] Erreur fetch:", error);
    throw error;
  }

  return data;
}

/**
 * Cree ou met a jour les parametres d'offre (upsert)
 */
export async function upsertOfferSettings(
  settings: Partial<OfferSettingsInput> & { company_id: string }
): Promise<OfferSettings> {
  const { data, error } = await supabase
    .from("offer_settings")
    .upsert(settings, {
      onConflict: "company_id",
    })
    .select()
    .single();

  if (error) {
    console.error("[offerSettingsApi] Erreur upsert:", error);
    throw error;
  }

  return data;
}

/**
 * Met a jour partiellement les parametres
 */
export async function updateOfferSettings(
  companyId: string,
  updates: Partial<OfferSettingsInput>
): Promise<OfferSettings> {
  const { data, error } = await supabase
    .from("offer_settings")
    .update(updates)
    .eq("company_id", companyId)
    .select()
    .single();

  if (error) {
    console.error("[offerSettingsApi] Erreur update:", error);
    throw error;
  }

  return data;
}

/**
 * Supprime les parametres d'offre
 */
export async function deleteOfferSettings(companyId: string): Promise<void> {
  const { error } = await supabase
    .from("offer_settings")
    .delete()
    .eq("company_id", companyId);

  if (error) {
    console.error("[offerSettingsApi] Erreur delete:", error);
    throw error;
  }
}
