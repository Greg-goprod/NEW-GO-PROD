-- Migration: Ajout des colonnes de notes pour les offres
-- Ces colonnes permettent de stocker des notes personnalisées qui seront
-- utilisées dans les placeholders Word: {notes_date}, {notes_financial}, {note_general}

-- Ajout des colonnes
ALTER TABLE offers ADD COLUMN IF NOT EXISTS notes_date TEXT DEFAULT NULL;
ALTER TABLE offers ADD COLUMN IF NOT EXISTS notes_financial TEXT DEFAULT NULL;
ALTER TABLE offers ADD COLUMN IF NOT EXISTS note_general TEXT DEFAULT NULL;

-- Mise à jour de la fonction fn_list_offers pour inclure ces colonnes
DROP FUNCTION IF EXISTS fn_list_offers(uuid, text, text[], timestamp with time zone, timestamp with time zone, text, text, integer, integer);

CREATE OR REPLACE FUNCTION fn_list_offers(
  p_event_id UUID,
  p_search TEXT DEFAULT NULL,
  p_statuses TEXT[] DEFAULT NULL,
  p_created_from TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_created_to TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_sort_field TEXT DEFAULT 'created_at',
  p_sort_dir TEXT DEFAULT 'desc',
  p_limit INTEGER DEFAULT 200,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  company_id UUID,
  event_id UUID,
  artist_id UUID,
  stage_id UUID,
  agency_contact_id UUID,
  artist_name TEXT,
  stage_name TEXT,
  date_time TIMESTAMP WITH TIME ZONE,
  performance_time TIME,
  duration INTEGER,
  duration_minutes INTEGER,
  currency TEXT,
  amount_net NUMERIC,
  amount_gross NUMERIC,
  amount_is_net BOOLEAN,
  amount_gross_is_subject_to_withholding BOOLEAN,
  withholding_note TEXT,
  amount_display NUMERIC,
  agency_commission_pct NUMERIC,
  prod_fee_amount NUMERIC,
  prod_fee_currency TEXT,
  backline_fee_amount NUMERIC,
  backline_fee_currency TEXT,
  buyout_hotel_amount NUMERIC,
  buyout_hotel_currency TEXT,
  buyout_meal_amount NUMERIC,
  buyout_meal_currency TEXT,
  flight_contribution_amount NUMERIC,
  flight_contribution_currency TEXT,
  technical_fee_amount NUMERIC,
  technical_fee_currency TEXT,
  version INTEGER,
  original_offer_id UUID,
  validity_date DATE,
  date_remark TEXT,
  exclusivity_clause_remark TEXT,
  terms_json JSONB,
  status TEXT,
  pdf_storage_path TEXT,
  word_storage_path TEXT,
  rejection_reason TEXT,
  notes_date TEXT,
  notes_financial TEXT,
  note_general TEXT,
  ready_to_send_at TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  accepted_at TIMESTAMP WITH TIME ZONE,
  rejected_at TIMESTAMP WITH TIME ZONE,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  total_count BIGINT
)
LANGUAGE plpgsql
AS $$
DECLARE v_total_count BIGINT;
BEGIN
  SELECT COUNT(*) INTO v_total_count FROM offers o
  WHERE o.event_id = p_event_id
    AND (p_search IS NULL OR (o.artist_name ILIKE '%' || p_search || '%' OR o.stage_name ILIKE '%' || p_search || '%'))
    AND (p_statuses IS NULL OR o.status::TEXT = ANY(p_statuses))
    AND (p_created_from IS NULL OR o.created_at >= p_created_from)
    AND (p_created_to IS NULL OR o.created_at <= p_created_to);

  RETURN QUERY
  SELECT o.id, o.company_id, o.event_id, o.artist_id, o.stage_id, o.agency_contact_id,
    o.artist_name, o.stage_name, o.date_time, o.performance_time, o.duration, o.duration_minutes, o.currency,
    o.amount_net, o.amount_gross, o.amount_is_net, o.amount_gross_is_subject_to_withholding, o.withholding_note,
    o.amount_display, o.agency_commission_pct,
    o.prod_fee_amount, o.prod_fee_currency, o.backline_fee_amount, o.backline_fee_currency,
    o.buyout_hotel_amount, o.buyout_hotel_currency, o.buyout_meal_amount, o.buyout_meal_currency,
    o.flight_contribution_amount, o.flight_contribution_currency,
    o.technical_fee_amount, o.technical_fee_currency,
    o.version, o.original_offer_id, o.validity_date, o.date_remark, o.exclusivity_clause_remark, o.terms_json,
    o.status::TEXT, o.pdf_storage_path, o.word_storage_path,
    o.rejection_reason,
    o.notes_date, o.notes_financial, o.note_general,
    o.ready_to_send_at, o.sent_at, o.accepted_at, o.rejected_at,
    o.created_by, o.created_at, o.updated_at, v_total_count
  FROM offers o
  WHERE o.event_id = p_event_id
    AND (p_search IS NULL OR (o.artist_name ILIKE '%' || p_search || '%' OR o.stage_name ILIKE '%' || p_search || '%'))
    AND (p_statuses IS NULL OR o.status::TEXT = ANY(p_statuses))
    AND (p_created_from IS NULL OR o.created_at >= p_created_from)
    AND (p_created_to IS NULL OR o.created_at <= p_created_to)
  ORDER BY
    CASE WHEN p_sort_field = 'created_at' AND p_sort_dir = 'asc' THEN o.created_at END ASC,
    CASE WHEN p_sort_field = 'created_at' AND p_sort_dir = 'desc' THEN o.created_at END DESC,
    CASE WHEN p_sort_field = 'date_time' AND p_sort_dir = 'asc' THEN o.date_time END ASC,
    CASE WHEN p_sort_field = 'date_time' AND p_sort_dir = 'desc' THEN o.date_time END DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;

-- Confirmation
DO $$
BEGIN
  RAISE NOTICE 'Colonnes notes_date, notes_financial et note_general ajoutées à la table offers';
END $$;
