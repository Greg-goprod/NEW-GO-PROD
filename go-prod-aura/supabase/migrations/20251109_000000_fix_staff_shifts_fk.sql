-- =============================================================================
-- Go-Prod AURA • Module STAFF - Correction FK staff_shifts
-- =============================================================================
-- Ajoute la foreign key manquante staff_shifts.event_id → events
-- =============================================================================

DO $$
DECLARE
  v_orphan_count INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '🔧 Correction FK staff_shifts.event_id → events';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '';

  -- Vérifier si la table staff_shifts existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'staff_shifts'
  ) THEN
    RAISE NOTICE '⚠️  Table staff_shifts n''existe pas encore';
    RAISE NOTICE '   → Rien à corriger';
    RETURN;
  END IF;

  -- Vérifier si la colonne event_id existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
      AND table_name = 'staff_shifts'
      AND column_name = 'event_id'
  ) THEN
    RAISE NOTICE '⚠️  Colonne event_id n''existe pas dans staff_shifts';
    RAISE NOTICE '   → Rien à corriger';
    RETURN;
  END IF;

  -- Vérifier s'il y a des event_id orphelins AVANT de créer la FK
  SELECT COUNT(DISTINCT s.event_id) INTO v_orphan_count
  FROM public.staff_shifts s
  LEFT JOIN public.events e ON s.event_id = e.id
  WHERE e.id IS NULL;

  IF v_orphan_count > 0 THEN
    RAISE NOTICE '⚠️  ATTENTION: % event_id orphelins détectés', v_orphan_count;
    RAISE NOTICE '';
    RAISE NOTICE '💡 Shifts référencent des événements qui n''existent pas.';
    RAISE NOTICE '   La création de la FK va échouer.';
    RAISE NOTICE '';
    RAISE NOTICE '👉 Vous devez soit:';
    RAISE NOTICE '   1. Créer les événements manquants';
    RAISE NOTICE '   2. Supprimer/corriger les shifts orphelins';
    RAISE NOTICE '';
    RAISE EXCEPTION 'event_id orphelins détectés - impossible de créer la FK';
  END IF;

  -- Supprimer l'ancienne FK si elle existe (au cas où)
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'staff_shifts'
      AND constraint_name = 'staff_shifts_event_id_fkey'
  ) THEN
    RAISE NOTICE '🗑️  Suppression de l''ancienne FK...';
    ALTER TABLE public.staff_shifts
      DROP CONSTRAINT staff_shifts_event_id_fkey;
    RAISE NOTICE '   ✅ Ancienne FK supprimée';
  END IF;

  -- Créer la nouvelle FK vers events
  RAISE NOTICE '🔗 Création de la FK staff_shifts.event_id → events...';
  
  ALTER TABLE public.staff_shifts
    ADD CONSTRAINT staff_shifts_event_id_fkey
    FOREIGN KEY (event_id) 
    REFERENCES public.events(id) 
    ON DELETE CASCADE;
  
  RAISE NOTICE '   ✅ FK créée avec succès';
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '✅ ✅ ✅ CORRECTION TERMINÉE';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Les shifts sont maintenant liés à la table events';
  RAISE NOTICE '';

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '';
    RAISE NOTICE '❌ ERREUR lors de la création de la FK:';
    RAISE NOTICE '   %', SQLERRM;
    RAISE NOTICE '';
    RAISE;
END $$;

