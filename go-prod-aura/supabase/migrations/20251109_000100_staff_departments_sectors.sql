-- =============================================================================
-- Go-Prod AURA • Module STAFF - Départements & Secteurs
-- =============================================================================
-- Transformation : Groupes → Secteurs + ajout Départements
-- Suppression : Compétences
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Créer la table DÉPARTEMENTS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.staff_departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 999,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.staff_departments IS 'Départements du module STAFF (ex: Infrastructures, Logistique, Accueil)';
COMMENT ON COLUMN public.staff_departments.company_id IS 'Tenant isolation - company_id';
COMMENT ON COLUMN public.staff_departments.name IS 'Nom du département';
COMMENT ON COLUMN public.staff_departments.description IS 'Description du département';
COMMENT ON COLUMN public.staff_departments.is_active IS 'Département actif ou archivé';
COMMENT ON COLUMN public.staff_departments.display_order IS 'Ordre d''affichage dans les listes';

-- Index
CREATE INDEX IF NOT EXISTS idx_staff_departments_company_id ON public.staff_departments(company_id);
CREATE INDEX IF NOT EXISTS idx_staff_departments_is_active ON public.staff_departments(is_active);

-- Trigger updated_at
CREATE TRIGGER trg_staff_departments_updated_at
  BEFORE UPDATE ON public.staff_departments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE public.staff_departments ENABLE ROW LEVEL SECURITY;

CREATE POLICY staff_departments_isolation_policy ON public.staff_departments
  USING (company_id = auth_company_id());

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Transformer GROUPES → SECTEURS (avec department_id)
-- ─────────────────────────────────────────────────────────────────────────────

-- Ajouter la colonne department_id
ALTER TABLE public.staff_volunteer_groups 
  ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES public.staff_departments(id) ON DELETE CASCADE;

-- Renommer la table
ALTER TABLE public.staff_volunteer_groups RENAME TO staff_sectors;

-- Mettre à jour les commentaires
COMMENT ON TABLE public.staff_sectors IS 'Secteurs du module STAFF, rattachés à un département (ex: Constructions, Montage, Transport)';
COMMENT ON COLUMN public.staff_sectors.department_id IS 'Département parent de ce secteur';

-- Index pour department_id
CREATE INDEX IF NOT EXISTS idx_staff_sectors_department_id ON public.staff_sectors(department_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Supprimer les COMPÉTENCES
-- ─────────────────────────────────────────────────────────────────────────────

-- Supprimer skill_ids des bénévoles
ALTER TABLE public.staff_volunteers DROP COLUMN IF EXISTS skill_ids;

-- Supprimer la table des compétences
DROP TABLE IF EXISTS public.staff_volunteer_skills CASCADE;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Renommer group_ids → sector_ids dans staff_volunteers
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.staff_volunteers RENAME COLUMN group_ids TO sector_ids;

-- Ajouter department_ids
ALTER TABLE public.staff_volunteers 
  ADD COLUMN IF NOT EXISTS department_ids UUID[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.staff_volunteers.department_ids IS 'IDs des départements auxquels appartient le bénévole';
COMMENT ON COLUMN public.staff_volunteers.sector_ids IS 'IDs des secteurs auxquels appartient le bénévole';

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Ajouter department_id et sector_id aux SHIFTS
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.staff_shifts 
  ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES public.staff_departments(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS sector_id UUID REFERENCES public.staff_sectors(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.staff_shifts.department_id IS 'Département auquel appartient ce shift (obligatoire)';
COMMENT ON COLUMN public.staff_shifts.sector_id IS 'Secteur auquel appartient ce shift (optionnel)';

-- Index
CREATE INDEX IF NOT EXISTS idx_staff_shifts_department_id ON public.staff_shifts(department_id);
CREATE INDEX IF NOT EXISTS idx_staff_shifts_sector_id ON public.staff_shifts(sector_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Fonction de validation : pas de shifts simultanés
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION check_no_overlapping_shift_assignments()
RETURNS TRIGGER AS $$
DECLARE
  v_shift_date DATE;
  v_shift_start_time TIME;
  v_shift_end_time TIME;
  v_overlap_count INTEGER;
BEGIN
  -- Récupérer les infos du shift
  SELECT shift_date, start_time, end_time
  INTO v_shift_date, v_shift_start_time, v_shift_end_time
  FROM public.staff_shifts
  WHERE id = NEW.shift_id;

  -- Vérifier les chevauchements pour ce bénévole
  SELECT COUNT(*)
  INTO v_overlap_count
  FROM public.staff_shift_assignments ssa
  JOIN public.staff_shifts ss ON ssa.shift_id = ss.id
  WHERE ssa.volunteer_id = NEW.volunteer_id
    AND ssa.id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::UUID)
    AND ssa.status = 'confirmed'
    AND ss.shift_date = v_shift_date
    AND (
      -- Chevauchement d'horaires
      (ss.start_time, ss.end_time) OVERLAPS (v_shift_start_time, v_shift_end_time)
    );

  IF v_overlap_count > 0 THEN
    RAISE EXCEPTION 'Ce bénévole a déjà un shift confirmé à ces horaires';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger sur les affectations
DROP TRIGGER IF EXISTS trg_check_overlapping_shifts ON public.staff_shift_assignments;
CREATE TRIGGER trg_check_overlapping_shifts
  BEFORE INSERT OR UPDATE ON public.staff_shift_assignments
  FOR EACH ROW
  WHEN (NEW.status = 'confirmed')
  EXECUTE FUNCTION check_no_overlapping_shift_assignments();

-- ─────────────────────────────────────────────────────────────────────────────
-- Logs
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '✅ Migration STAFF - Départements & Secteurs';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Table staff_departments créée';
  RAISE NOTICE '✅ staff_volunteer_groups → staff_sectors (+ department_id)';
  RAISE NOTICE '✅ staff_volunteer_skills supprimée';
  RAISE NOTICE '✅ staff_volunteers : group_ids → sector_ids + department_ids';
  RAISE NOTICE '✅ staff_shifts : +department_id +sector_id';
  RAISE NOTICE '✅ Validation : pas de shifts simultanés';
  RAISE NOTICE '';
END $$;

