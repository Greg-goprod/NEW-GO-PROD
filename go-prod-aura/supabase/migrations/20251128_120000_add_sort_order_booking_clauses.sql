-- Ajout des colonnes sort_order pour la gestion d'ordre des extras et clauses

-- =====================================================================
-- 1. offer_clauses.sort_order
-- =====================================================================
ALTER TABLE public.offer_clauses
ADD COLUMN IF NOT EXISTS sort_order INTEGER;

-- Backfill: ordre par compagnie selon created_at
WITH ranked AS (
  SELECT
    id,
    ((ROW_NUMBER() OVER (PARTITION BY company_id ORDER BY created_at, id)) * 10) AS new_sort
  FROM public.offer_clauses
)
UPDATE public.offer_clauses oc
SET sort_order = ranked.new_sort
FROM ranked
WHERE oc.id = ranked.id
  AND (oc.sort_order IS NULL OR oc.sort_order = 0);

ALTER TABLE public.offer_clauses
ALTER COLUMN sort_order SET DEFAULT 100;

CREATE INDEX IF NOT EXISTS idx_offer_clauses_company_sort
ON public.offer_clauses(company_id, sort_order);

-- =====================================================================
-- 2. exclusivity_presets.sort_order
-- =====================================================================
ALTER TABLE public.exclusivity_presets
ADD COLUMN IF NOT EXISTS sort_order INTEGER;

WITH ranked AS (
  SELECT
    id,
    ((ROW_NUMBER() OVER (PARTITION BY company_id ORDER BY created_at, id)) * 10) AS new_sort
  FROM public.exclusivity_presets
)
UPDATE public.exclusivity_presets ep
SET sort_order = ranked.new_sort
FROM ranked
WHERE ep.id = ranked.id
  AND (ep.sort_order IS NULL OR ep.sort_order = 0);

ALTER TABLE public.exclusivity_presets
ALTER COLUMN sort_order SET DEFAULT 100;

CREATE INDEX IF NOT EXISTS idx_exclusivity_presets_company_sort
ON public.exclusivity_presets(company_id, sort_order);





















