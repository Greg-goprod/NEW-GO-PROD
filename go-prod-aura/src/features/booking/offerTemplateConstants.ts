export const OFFER_TEMPLATE_FIELDS = [
  // Données de base
  { value: "event_name", label: "Nom de l'événement" },
  { value: "artist_name", label: "Nom de l'artiste" },
  { value: "stage_name", label: "Scène / Salle" },
  { value: "performance_date_long", label: "Date (format lisible)" },
  { value: "performance_date_iso", label: "Date (ISO)" },
  { value: "performance_time", label: "Heure" },
  { value: "duration_minutes", label: "Durée (minutes)" },
  { value: "validity_date", label: "Date de validité" },
  
  // Financier - Montants principaux
  { value: "amount_display", label: "Montant affiché" },
  { value: "amount_net", label: "Montant net" },
  { value: "amount_gross", label: "Montant brut" },
  { value: "currency", label: "Devise" },
  { value: "amount_is_net_label", label: "Statut montant (Net/Brut)" },
  { value: "agency_commission_pct", label: "Commission agence (%)" },
  
  // Financier - Frais additionnels
  { value: "prod_fee_amount", label: "Frais prod (montant)" },
  { value: "backline_fee_amount", label: "Backline (montant)" },
  { value: "buyout_hotel_amount", label: "Buyout hôtel" },
  { value: "buyout_meal_amount", label: "Buyout repas" },
  { value: "flight_contribution_amount", label: "Contribution vols" },
  { value: "technical_fee_amount", label: "Frais techniques" },
  
  // Notes et extras
  { value: "notes", label: "Notes" },
  { value: "extras_summary", label: "Liste des extras" },
  { value: "clauses_summary", label: "Clauses d'exclusivité" },
  
  // Identifiants
  { value: "offer_id", label: "ID de l'offre" },
  { value: "company_id", label: "ID de l'entreprise" },
] as const;

export type OfferTemplateFieldKey =
  (typeof OFFER_TEMPLATE_FIELDS)[number]["value"];

