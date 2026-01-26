-- =============================================================================
-- Désactiver toutes les RLS de toutes les tables
-- ⚠️ À UTILISER UNIQUEMENT EN DÉVELOPPEMENT ⚠️
-- =============================================================================

-- Option 1: Générer les commandes SQL (pour voir ce qui va être exécuté)
-- Décommentez cette section pour voir les commandes avant de les exécuter

/*
SELECT 
  'ALTER TABLE ' || schemaname || '.' || tablename || ' DISABLE ROW LEVEL SECURITY;' as disable_command
FROM pg_tables
WHERE schemaname = 'public'
  AND rowsecurity = true
ORDER BY tablename;
*/

-- Option 2: Exécuter automatiquement la désactivation
DO $$
DECLARE
  r RECORD;
  v_count INTEGER := 0;
BEGIN
  -- Parcourir toutes les tables avec RLS activé
  FOR r IN 
    SELECT schemaname, tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND rowsecurity = true
    ORDER BY tablename
  LOOP
    -- Désactiver RLS pour chaque table
    EXECUTE format('ALTER TABLE %I.%I DISABLE ROW LEVEL SECURITY', r.schemaname, r.tablename);
    v_count := v_count + 1;
    RAISE NOTICE 'RLS désactivé pour: %.%', r.schemaname, r.tablename;
  END LOOP;

  -- Afficher le résumé
  IF v_count = 0 THEN
    RAISE NOTICE '✅ Aucune table avec RLS activé trouvée';
  ELSE
    RAISE NOTICE '✅ RLS désactivé pour % table(s)', v_count;
  END IF;
END $$;

-- Vérification finale : lister les tables avec RLS encore activé
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND rowsecurity = true
ORDER BY tablename;













