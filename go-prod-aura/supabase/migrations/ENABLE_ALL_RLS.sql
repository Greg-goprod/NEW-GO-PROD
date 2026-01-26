-- =============================================================================
-- Réactiver toutes les RLS de toutes les tables
-- Pour remettre la sécurité après le développement
-- =============================================================================

-- Option 1: Générer les commandes SQL (pour voir ce qui va être exécuté)
-- Décommentez cette section pour voir les commandes avant de les exécuter

/*
SELECT 
  'ALTER TABLE ' || schemaname || '.' || tablename || ' ENABLE ROW LEVEL SECURITY;' as enable_command
FROM pg_tables
WHERE schemaname = 'public'
  AND rowsecurity = false
ORDER BY tablename;
*/

-- Option 2: Exécuter automatiquement la réactivation
DO $$
DECLARE
  r RECORD;
  v_count INTEGER := 0;
BEGIN
  -- Parcourir toutes les tables sans RLS
  FOR r IN 
    SELECT schemaname, tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND rowsecurity = false
    ORDER BY tablename
  LOOP
    -- Activer RLS pour chaque table
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', r.schemaname, r.tablename);
    v_count := v_count + 1;
    RAISE NOTICE 'RLS activé pour: %.%', r.schemaname, r.tablename;
  END LOOP;

  -- Afficher le résumé
  IF v_count = 0 THEN
    RAISE NOTICE '✅ Toutes les tables ont déjà RLS activé';
  ELSE
    RAISE NOTICE '✅ RLS activé pour % table(s)', v_count;
  END IF;
END $$;

-- Vérification finale : lister les tables avec RLS désactivé
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND rowsecurity = false
ORDER BY tablename;













