-- =============================================================================
-- SCRIPT DE VÉRIFICATION ARCHITECTURE MULTITENANT GO-PROD AURA
-- =============================================================================
-- Ce script vérifie :
-- 1. Que toutes les tables métier ont un company_id (partitionnement tenant)
-- 2. Que les données sont correctement liées aux événements
-- 3. Que les "pots communs" sont bien identifiés et gérés
-- =============================================================================

\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo '🔍 VÉRIFICATION ARCHITECTURE MULTITENANT GO-PROD AURA'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo ''

-- =============================================================================
-- 1️⃣ VÉRIFICATION MULTITENANT : Tables avec/sans company_id
-- =============================================================================
\echo '1️⃣ VÉRIFICATION MULTITENANT'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo ''

-- Tables SYSTÈME (normalement sans company_id)
\echo '✅ TABLES SYSTÈME (sans company_id) :'
SELECT 
    '  • ' || table_name as "Table système"
FROM information_schema.tables t
WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
    AND table_name IN (
        'companies', 
        'enrich_config',
        'enrich_webhook_log',
        'rbac_permissions',
        'rbac_resources',
        'rbac_role_permissions',
        'rbac_user_roles',
        'owner_admins'
    )
ORDER BY table_name;

\echo ''
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo ''

-- Tables MÉTIER avec company_id ✅
\echo '✅ TABLES MÉTIER avec company_id (MULTITENANT) :'
SELECT 
    '  • ' || t.table_name || ' → ' || 
    COALESCE('company_id (' || pg_get_indexdef(i.indexrelid) || ')', 'company_id') as "Table + Index"
FROM information_schema.tables t
INNER JOIN information_schema.columns c ON t.table_name = c.table_name 
    AND t.table_schema = c.table_schema
    AND c.column_name = 'company_id'
LEFT JOIN pg_indexes pi ON pi.tablename = t.table_name 
    AND pi.indexdef LIKE '%company_id%'
LEFT JOIN pg_class pc ON pc.relname = t.table_name
LEFT JOIN pg_index i ON i.indrelid = pc.oid 
    AND EXISTS (
        SELECT 1 FROM unnest(i.indkey) ik 
        JOIN pg_attribute pa ON pa.attrelid = pc.oid AND pa.attnum = ik
        WHERE pa.attname = 'company_id'
    )
WHERE t.table_schema = 'public' 
    AND t.table_type = 'BASE TABLE'
    AND t.table_name NOT IN (
        'companies', 
        'enrich_config',
        'enrich_webhook_log',
        'rbac_permissions',
        'rbac_resources',
        'rbac_role_permissions',
        'rbac_user_roles',
        'owner_admins',
        'artist_audience_geo',
        'artist_events',
        'artist_links',
        'artist_stats_history',
        'artist_tags',
        'artist_top_tracks',
        'artists_enriched',
        'social_media_data',
        'spotify_data',
        'spotify_history',
        'stg_artists_raw',
        'stg_spotify_rows',
        'event_artists',
        'event_days',
        'event_stages',
        'offer_extras'
    )
ORDER BY t.table_name;

\echo ''
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo ''

-- ⚠️ Tables MÉTIER SANS company_id (PROBLÉMATIQUE)
\echo '⚠️ TABLES MÉTIER SANS company_id (À VÉRIFIER) :'
SELECT 
    '  ⚠️ ' || t.table_name || ' → MANQUE company_id !' as "Table problématique",
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns c2 
                     WHERE c2.table_name = t.table_name 
                     AND c2.column_name LIKE '%event_id%')
        THEN 'Lié indirectement via event_id'
        ELSE '❌ PAS DE LIEN MULTITENANT'
    END as "Lien indirect?"
FROM information_schema.tables t
WHERE t.table_schema = 'public' 
    AND t.table_type = 'BASE TABLE'
    AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns c 
        WHERE c.table_name = t.table_name 
        AND c.table_schema = 'public'
        AND c.column_name = 'company_id'
    )
    AND t.table_name NOT IN (
        -- Tables système OK
        'companies', 
        'enrich_config',
        'enrich_webhook_log',
        'rbac_permissions',
        'rbac_resources',
        'rbac_role_permissions',
        'rbac_user_roles',
        'owner_admins',
        -- Tables enrichissement externes (data warehouse)
        'artist_audience_geo',
        'artist_links',
        'artist_stats_history',
        'artist_tags',
        'artist_top_tracks',
        'artists_enriched',
        'social_media_data',
        'spotify_data',
        'spotify_history',
        'stg_artists_raw',
        'stg_spotify_rows'
    )
ORDER BY t.table_name;

\echo ''
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo ''

-- =============================================================================
-- 2️⃣ VÉRIFICATION RELATIONS ÉVÉNEMENTIELLES
-- =============================================================================
\echo '2️⃣ VÉRIFICATION RELATIONS ÉVÉNEMENTIELLES'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo ''

-- Tables avec event_id (doivent être liées à un événement)
\echo '📅 TABLES LIÉES AUX ÉVÉNEMENTS (via event_id) :'
SELECT 
    '  • ' || c.table_name || ' → ' || 
    string_agg(DISTINCT c.column_name, ', ') as "Colonnes event_id"
FROM information_schema.columns c
WHERE c.table_schema = 'public'
    AND c.column_name LIKE '%event_id%'
    AND c.table_name NOT LIKE 'stg_%'
GROUP BY c.table_name
ORDER BY c.table_name;

\echo ''
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo ''

-- =============================================================================
-- 3️⃣ IDENTIFICATION DES "POTS COMMUNS" (Ressources mutualisées)
-- =============================================================================
\echo '3️⃣ POTS COMMUNS (Ressources mutualisées entre événements)'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo ''

\echo '🗂️ RESSOURCES MUTUALISÉES PAR TENANT (company_id SANS event_id obligatoire) :'
SELECT 
    '  • ' || t.table_name || ' → ' ||
    CASE t.table_name
        WHEN 'staff_volunteers' THEN 'Bénévoles mutualités sur tous événements'
        WHEN 'artists' THEN 'Artistes mutualités (optionnellement liés à un événement)'
        WHEN 'crm_contacts' THEN 'Contacts CRM mutualités'
        WHEN 'crm_companies' THEN 'Entreprises CRM mutualités'
        WHEN 'profiles' THEN 'Utilisateurs du tenant'
        WHEN 'rbac_roles' THEN 'Rôles RBAC du tenant'
        WHEN 'departments' THEN 'Départements du tenant'
        WHEN 'seniority_levels' THEN 'Niveaux de séniorité du tenant'
        WHEN 'company_types' THEN 'Types d''entreprise du tenant'
        WHEN 'contact_roles' THEN 'Rôles contacts du tenant'
        WHEN 'contact_statuses' THEN 'Statuts contacts du tenant'
        WHEN 'tags' THEN 'Tags du tenant'
        WHEN 'stage_types' THEN 'Types de scènes du tenant'
        WHEN 'stage_specificities' THEN 'Spécificités de scènes du tenant'
        WHEN 'artist_genres' THEN 'Genres musicaux du tenant'
        WHEN 'staff_volunteer_statuses' THEN 'Statuts bénévoles du tenant'
        WHEN 'staff_volunteer_groups' THEN 'Groupes bénévoles du tenant'
        WHEN 'staff_volunteer_skills' THEN 'Compétences bénévoles du tenant'
        ELSE 'Ressource mutualisée'
    END as "Description"
FROM information_schema.tables t
WHERE t.table_schema = 'public'
    AND t.table_type = 'BASE TABLE'
    AND EXISTS (
        SELECT 1 FROM information_schema.columns c
        WHERE c.table_name = t.table_name 
        AND c.table_schema = 'public'
        AND c.column_name = 'company_id'
    )
    AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns c2
        WHERE c2.table_name = t.table_name 
        AND c2.table_schema = 'public'
        AND c2.column_name = 'event_id'
        AND c2.is_nullable = 'NO'  -- event_id NON NULL = obligatoire
    )
    AND t.table_name NOT LIKE 'staff_shift%'
    AND t.table_name NOT LIKE '%_activity_log'
ORDER BY t.table_name;

\echo ''
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo ''

-- =============================================================================
-- 4️⃣ VÉRIFICATION INTÉGRITÉ DES DONNÉES
-- =============================================================================
\echo '4️⃣ VÉRIFICATION INTÉGRITÉ DES DONNÉES'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo ''

-- Vérifier que les event_id référencent bien des events du même tenant
\echo '🔗 VÉRIFICATION INTÉGRITÉ company_id <-> event_id :'
\echo ''

-- Offres avec event_id qui ne match pas le company_id
\echo '  📋 Vérification table OFFERS :'
SELECT 
    CASE 
        WHEN COUNT(*) = 0 THEN '    ✅ Toutes les offres ont un event_id du même tenant'
        ELSE '    ❌ ' || COUNT(*) || ' offres avec event_id de tenant différent!'
    END as "Statut"
FROM offers o
LEFT JOIN events e ON o.event_id = e.id
WHERE o.company_id != e.company_id;

\echo ''

-- Staff shifts avec event_id qui ne match pas le company_id
\echo '  👥 Vérification table STAFF_SHIFTS :'
SELECT 
    CASE 
        WHEN COUNT(*) = 0 THEN '    ✅ Tous les shifts ont un event_id du même tenant'
        ELSE '    ❌ ' || COUNT(*) || ' shifts avec event_id de tenant différent!'
    END as "Statut"
FROM staff_shifts ss
LEFT JOIN staff_events se ON ss.event_id = se.id
WHERE ss.company_id != se.company_id;

\echo ''

-- Staff campaigns avec target_event_id qui ne match pas le company_id
\echo '  📢 Vérification table STAFF_CAMPAIGNS :'
SELECT 
    CASE 
        WHEN COUNT(*) = 0 THEN '    ✅ Toutes les campagnes ont un target_event_id du même tenant (ou NULL)'
        ELSE '    ❌ ' || COUNT(*) || ' campagnes avec target_event_id de tenant différent!'
    END as "Statut"
FROM staff_campaigns sc
LEFT JOIN staff_events se ON sc.target_event_id = se.id
WHERE sc.target_event_id IS NOT NULL 
    AND sc.company_id != se.company_id;

\echo ''

-- Artist performances avec event_id qui ne match pas le tenant via artists
\echo '  🎤 Vérification table ARTIST_PERFORMANCES :'
SELECT 
    CASE 
        WHEN COUNT(*) = 0 THEN '    ✅ Toutes les performances ont un event_id cohérent'
        ELSE '    ⚠️ ' || COUNT(*) || ' performances avec event_id sans lien tenant direct (normal si artist mutualisé)'
    END as "Statut"
FROM artist_performances ap
LEFT JOIN events e ON ap.event_id = e.id
WHERE ap.event_id IS NOT NULL AND e.id IS NULL;

\echo ''

-- Artistes avec created_for_event_id qui ne match pas le company_id
\echo '  🎵 Vérification table ARTISTS :'
SELECT 
    CASE 
        WHEN COUNT(*) = 0 THEN '    ✅ Tous les artistes ont un created_for_event_id du même tenant (ou NULL)'
        ELSE '    ❌ ' || COUNT(*) || ' artistes avec created_for_event_id de tenant différent!'
    END as "Statut"
FROM artists a
LEFT JOIN events e ON a.created_for_event_id = e.id
WHERE a.created_for_event_id IS NOT NULL 
    AND a.company_id != e.company_id;

\echo ''
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo ''

-- =============================================================================
-- 5️⃣ VÉRIFICATION RLS (Row Level Security)
-- =============================================================================
\echo '5️⃣ VÉRIFICATION RLS (Row Level Security)'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo ''

-- Tables avec company_id mais SANS RLS activé
\echo '🔒 VÉRIFICATION RLS SUR TABLES MULTITENANT :'
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables t
            INNER JOIN information_schema.columns c ON t.table_name = c.table_name 
                AND t.table_schema = c.table_schema
                AND c.column_name = 'company_id'
            LEFT JOIN pg_class pc ON pc.relname = t.table_name
            LEFT JOIN pg_namespace pn ON pn.oid = pc.relnamespace AND pn.nspname = 'public'
            WHERE t.table_schema = 'public' 
                AND t.table_type = 'BASE TABLE'
                AND NOT pc.relrowsecurity
                AND t.table_name NOT IN (
                    'companies',
                    'enrich_config',
                    'enrich_webhook_log',
                    'rbac_permissions',
                    'rbac_resources',
                    'rbac_role_permissions',
                    'rbac_user_roles',
                    'owner_admins'
                )
        ) THEN '  ❌ Certaines tables multitenant n''ont PAS RLS activé!'
        ELSE '  ✅ Toutes les tables multitenant ont RLS activé'
    END as "Statut RLS";

\echo ''

-- Lister les tables avec company_id sans RLS
\echo '  📋 TABLES avec company_id SANS RLS (détail) :'
SELECT 
    '    ⚠️ ' || t.table_name || ' → RLS DÉSACTIVÉ' as "Table sans RLS"
FROM information_schema.tables t
INNER JOIN information_schema.columns c ON t.table_name = c.table_name 
    AND t.table_schema = c.table_schema
    AND c.column_name = 'company_id'
LEFT JOIN pg_class pc ON pc.relname = t.table_name
LEFT JOIN pg_namespace pn ON pn.oid = pc.relnamespace AND pn.nspname = 'public'
WHERE t.table_schema = 'public' 
    AND t.table_type = 'BASE TABLE'
    AND NOT pc.relrowsecurity
    AND t.table_name NOT IN (
        'companies',
        'enrich_config',
        'enrich_webhook_log',
        'rbac_permissions',
        'rbac_resources',
        'rbac_role_permissions',
        'rbac_user_roles',
        'owner_admins'
    )
ORDER BY t.table_name;

\echo ''
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo ''

-- =============================================================================
-- 6️⃣ STATISTIQUES GÉNÉRALES
-- =============================================================================
\echo '6️⃣ STATISTIQUES GÉNÉRALES'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo ''

-- Nombre de tenants (companies)
\echo '📊 Nombre de tenants (companies) :'
SELECT '  → ' || COUNT(*) || ' tenants' as "Total tenants" FROM companies;

\echo ''

-- Nombre d'événements par tenant
\echo '📅 Nombre d''événements par tenant (TOP 5) :'
SELECT 
    '  → ' || c.name || ' : ' || COUNT(e.id) || ' événements' as "Tenant → Événements"
FROM companies c
LEFT JOIN events e ON e.company_id = c.id
GROUP BY c.id, c.name
ORDER BY COUNT(e.id) DESC
LIMIT 5;

\echo ''

-- Nombre total de tables
\echo '🗂️ Statistiques tables :'
SELECT 
    '  • Total tables : ' || COUNT(*) as "Statistique"
FROM information_schema.tables 
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
UNION ALL
SELECT 
    '  • Tables avec company_id : ' || COUNT(DISTINCT t.table_name)
FROM information_schema.tables t
INNER JOIN information_schema.columns c ON t.table_name = c.table_name 
    AND t.table_schema = c.table_schema
    AND c.column_name = 'company_id'
WHERE t.table_schema = 'public' AND t.table_type = 'BASE TABLE'
UNION ALL
SELECT 
    '  • Tables avec event_id : ' || COUNT(DISTINCT t.table_name)
FROM information_schema.tables t
INNER JOIN information_schema.columns c ON t.table_name = c.table_name 
    AND t.table_schema = c.table_schema
    AND c.column_name LIKE '%event_id%'
WHERE t.table_schema = 'public' AND t.table_type = 'BASE TABLE'
UNION ALL
SELECT 
    '  • Tables "pots communs" : ' || COUNT(DISTINCT t.table_name)
FROM information_schema.tables t
WHERE t.table_schema = 'public'
    AND t.table_type = 'BASE TABLE'
    AND EXISTS (
        SELECT 1 FROM information_schema.columns c
        WHERE c.table_name = t.table_name 
        AND c.table_schema = 'public'
        AND c.column_name = 'company_id'
    )
    AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns c2
        WHERE c2.table_name = t.table_name 
        AND c2.table_schema = 'public'
        AND c2.column_name = 'event_id'
        AND c2.is_nullable = 'NO'
    );

\echo ''
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo ''

-- =============================================================================
-- 7️⃣ RÉSUMÉ FINAL
-- =============================================================================
\echo '7️⃣ RÉSUMÉ FINAL'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo ''

DO $$
DECLARE
    v_tables_sans_tenant INTEGER;
    v_tables_avec_tenant INTEGER;
    v_tables_rls_manquant INTEGER;
    v_violations_integrite INTEGER;
BEGIN
    -- Compter tables sans company_id (métier uniquement)
    SELECT COUNT(*) INTO v_tables_sans_tenant
    FROM information_schema.tables t
    WHERE t.table_schema = 'public' 
        AND t.table_type = 'BASE TABLE'
        AND NOT EXISTS (
            SELECT 1 FROM information_schema.columns c 
            WHERE c.table_name = t.table_name 
            AND c.table_schema = 'public'
            AND c.column_name = 'company_id'
        )
        AND t.table_name NOT IN (
            'companies', 'enrich_config', 'enrich_webhook_log',
            'rbac_permissions', 'rbac_resources', 'rbac_role_permissions',
            'rbac_user_roles', 'owner_admins',
            'artist_audience_geo', 'artist_links', 'artist_stats_history',
            'artist_tags', 'artist_top_tracks', 'artists_enriched',
            'social_media_data', 'spotify_data', 'spotify_history',
            'stg_artists_raw', 'stg_spotify_rows'
        );
    
    -- Compter tables avec company_id
    SELECT COUNT(DISTINCT t.table_name) INTO v_tables_avec_tenant
    FROM information_schema.tables t
    INNER JOIN information_schema.columns c ON t.table_name = c.table_name 
        AND t.table_schema = c.table_schema
        AND c.column_name = 'company_id'
    WHERE t.table_schema = 'public' AND t.table_type = 'BASE TABLE';
    
    -- Compter tables avec company_id sans RLS
    SELECT COUNT(DISTINCT t.table_name) INTO v_tables_rls_manquant
    FROM information_schema.tables t
    INNER JOIN information_schema.columns c ON t.table_name = c.table_name 
        AND t.table_schema = c.table_schema
        AND c.column_name = 'company_id'
    LEFT JOIN pg_class pc ON pc.relname = t.table_name
    LEFT JOIN pg_namespace pn ON pn.oid = pc.relnamespace AND pn.nspname = 'public'
    WHERE t.table_schema = 'public' 
        AND t.table_type = 'BASE TABLE'
        AND NOT pc.relrowsecurity;
    
    -- Compter violations d'intégrité
    SELECT 
        (SELECT COUNT(*) FROM offers o 
         LEFT JOIN events e ON o.event_id = e.id 
         WHERE o.company_id != e.company_id)
        +
        (SELECT COUNT(*) FROM staff_shifts ss 
         LEFT JOIN staff_events se ON ss.event_id = se.id 
         WHERE ss.company_id != se.company_id)
        +
        (SELECT COUNT(*) FROM staff_campaigns sc 
         LEFT JOIN staff_events se ON sc.target_event_id = se.id 
         WHERE sc.target_event_id IS NOT NULL AND sc.company_id != se.company_id)
        +
        (SELECT COUNT(*) FROM artists a 
         LEFT JOIN events e ON a.created_for_event_id = e.id 
         WHERE a.created_for_event_id IS NOT NULL AND a.company_id != e.company_id)
    INTO v_violations_integrite;
    
    -- Afficher le résumé
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════════════════';
    
    IF v_tables_sans_tenant = 0 AND v_tables_rls_manquant = 0 AND v_violations_integrite = 0 THEN
        RAISE NOTICE '✅ ARCHITECTURE MULTITENANT PARFAITE !';
        RAISE NOTICE '';
        RAISE NOTICE '  • % tables avec company_id (multitenancy OK)', v_tables_avec_tenant;
        RAISE NOTICE '  • 0 table métier sans company_id';
        RAISE NOTICE '  • 0 table sans RLS';
        RAISE NOTICE '  • 0 violation d''intégrité référentielle';
    ELSE
        RAISE NOTICE '⚠️ PROBLÈMES DÉTECTÉS DANS L''ARCHITECTURE';
        RAISE NOTICE '';
        RAISE NOTICE '  • % tables avec company_id (multitenancy)', v_tables_avec_tenant;
        
        IF v_tables_sans_tenant > 0 THEN
            RAISE NOTICE '  ❌ % table(s) métier SANS company_id', v_tables_sans_tenant;
        END IF;
        
        IF v_tables_rls_manquant > 0 THEN
            RAISE NOTICE '  ❌ % table(s) avec company_id SANS RLS', v_tables_rls_manquant;
        END IF;
        
        IF v_violations_integrite > 0 THEN
            RAISE NOTICE '  ❌ % violation(s) d''intégrité référentielle', v_violations_integrite;
        END IF;
    END IF;
    
    RAISE NOTICE '═══════════════════════════════════════════════════════════════════════════';
    RAISE NOTICE '';
END $$;

\echo ''
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo '✅ Vérification terminée'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'













