-- =============================================================================
-- Désactiver RLS sur toutes les tables (MODE DEV)
-- =============================================================================
-- ATTENTION : Ce script désactive Row Level Security sur toutes les tables
-- Utiliser UNIQUEMENT en développement
-- RÉACTIVER RLS avant déploiement en production !
-- =============================================================================

DO $$
DECLARE
    rec RECORD;
    v_count INTEGER := 0;
    v_tables TEXT[] := ARRAY[]::TEXT[];
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    RAISE NOTICE '🔓 DÉSACTIVATION RLS - MODE DÉVELOPPEMENT';
    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    RAISE NOTICE '';
    
    -- Boucler sur toutes les tables avec RLS activé
    FOR rec IN 
        SELECT schemaname, tablename
        FROM pg_tables pt
        JOIN pg_class pc ON pc.relname = pt.tablename
        JOIN pg_namespace pn ON pn.oid = pc.relnamespace AND pn.nspname = pt.schemaname
        WHERE pt.schemaname = 'public'
            AND pc.relrowsecurity = true
        ORDER BY pt.tablename
    LOOP
        -- Désactiver RLS
        EXECUTE format('ALTER TABLE %I.%I DISABLE ROW LEVEL SECURITY', rec.schemaname, rec.tablename);
        v_count := v_count + 1;
        v_tables := array_append(v_tables, rec.tablename);
        RAISE NOTICE '  ✅ % (% tables désactivées)', rec.tablename, v_count;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    
    IF v_count > 0 THEN
        RAISE NOTICE '✅ RLS DÉSACTIVÉ SUR % TABLES', v_count;
        RAISE NOTICE '';
        RAISE NOTICE '⚠️  ATTENTION : Ne pas déployer en production sans réactiver RLS !';
    ELSE
        RAISE NOTICE 'ℹ️  Aucune table avec RLS activé trouvée';
    END IF;
    
    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    RAISE NOTICE '';
END $$;

-- =============================================================================
-- Vérification finale
-- =============================================================================

DO $$
DECLARE
    v_with_rls INTEGER;
    v_without_rls INTEGER;
BEGIN
    SELECT 
        COUNT(*) FILTER (WHERE pc.relrowsecurity = true),
        COUNT(*) FILTER (WHERE pc.relrowsecurity = false)
    INTO v_with_rls, v_without_rls
    FROM pg_tables pt
    JOIN pg_class pc ON pc.relname = pt.tablename
    JOIN pg_namespace pn ON pn.oid = pc.relnamespace AND pn.nspname = pt.schemaname
    WHERE pt.schemaname = 'public';
    
    RAISE NOTICE '📊 STATUT FINAL :';
    RAISE NOTICE '   • Tables avec RLS    : %', v_with_rls;
    RAISE NOTICE '   • Tables sans RLS    : %', v_without_rls;
    RAISE NOTICE '';
END $$;

-- =============================================================================
-- SCRIPT DE RÉACTIVATION POUR PRODUCTION (À UTILISER PLUS TARD)
-- =============================================================================

/*
-- ⚠️ PRODUCTION : Décommenter et exécuter avant déploiement production

DO $$
DECLARE
    rec RECORD;
    v_count INTEGER := 0;
BEGIN
    RAISE NOTICE '🔒 RÉACTIVATION RLS POUR PRODUCTION';
    
    -- Réactiver RLS sur toutes les tables avec company_id
    FOR rec IN 
        SELECT t.table_name
        FROM information_schema.tables t
        INNER JOIN information_schema.columns c 
            ON t.table_name = c.table_name 
            AND t.table_schema = c.table_schema
            AND c.column_name = 'company_id'
        WHERE t.table_schema = 'public' 
            AND t.table_type = 'BASE TABLE'
        ORDER BY t.table_name
    LOOP
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', rec.table_name);
        v_count := v_count + 1;
        RAISE NOTICE '  ✅ RLS réactivé sur %', rec.table_name;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '✅ RLS RÉACTIVÉ SUR % TABLES', v_count;
    RAISE NOTICE '🔒 Sécurité multitenant rétablie';
END $$;
*/


