-- =============================================================================
-- Vérification finale de la structure STAFF
-- =============================================================================

SELECT 
  '🔍 VÉRIFICATION FINALE' as diagnostic,
  '' as statut,
  '' as action

UNION ALL

SELECT '────────────────────────────────────────', '', ''

UNION ALL

-- Vérifier staff_shifts.event_id FK
SELECT 
  'staff_shifts.event_id FK' as diagnostic,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_schema = 'public'
        AND tc.table_name = 'staff_shifts'
        AND kcu.column_name = 'event_id'
        AND tc.constraint_type = 'FOREIGN KEY'
    ) THEN '✅ FK vers events existe'
    ELSE '❌ FK manquante'
  END as statut,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_schema = 'public'
        AND tc.table_name = 'staff_shifts'
        AND kcu.column_name = 'event_id'
        AND tc.constraint_type = 'FOREIGN KEY'
    ) THEN '✓ OK'
    ELSE '❌ PROBLÈME'
  END as action

UNION ALL

SELECT '────────────────────────────────────────', '', ''

UNION ALL

-- Résumé
SELECT 
  '📊 RÉSUMÉ' as diagnostic,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_schema = 'public'
        AND tc.table_name = 'staff_shifts'
        AND kcu.column_name = 'event_id'
        AND tc.constraint_type = 'FOREIGN KEY'
    ) THEN '✅ STRUCTURE CORRECTE'
    ELSE '❌ CORRECTIONS NÉCESSAIRES'
  END as statut,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_schema = 'public'
        AND tc.table_name = 'staff_shifts'
        AND kcu.column_name = 'event_id'
        AND tc.constraint_type = 'FOREIGN KEY'
    ) THEN '✅ Module STAFF opérationnel'
    ELSE '⚠️ Migration requise'
  END as action;










