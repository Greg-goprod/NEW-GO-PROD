-- ============================================================
-- SCRIPT COMPLET : Activer pg_cron + Configurer Cron Job
-- ============================================================
-- À exécuter dans Supabase SQL Editor

-- ============================================================
-- ÉTAPE 1 : ACTIVER L'EXTENSION PG_CRON
-- ============================================================

-- Créer l'extension si elle n'existe pas
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Vérifier que l'extension est activée
SELECT 
    extname as "Extension",
    extversion as "Version",
    'Extension pg_cron activée avec succès ✅' as "Status"
FROM pg_extension 
WHERE extname = 'pg_cron';

-- ============================================================
-- ÉTAPE 2 : CONFIGURER LE CRON JOB
-- ============================================================

-- ⚠️ IMPORTANT : REMPLACEZ CES 2 VALEURS AVANT D'EXÉCUTER ⚠️
--
-- 1. Ligne 42 : Remplacez VOTRE-PROJECT par votre vrai ID de projet Supabase
--    Trouvable dans : Settings > API > Project URL
--    Exemple : alhoefdrjbwdzijizrxc
--
-- 2. Ligne 45 : Remplacez VOTRE-SERVICE-ROLE-KEY par votre vraie clé
--    Trouvable dans : Settings > API > service_role secret (cliquez "Reveal")
--    Exemple : eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6...

SELECT cron.schedule(
  'spotify-daily-sync',                           -- Nom du job
  '0 12 * * *',                                   -- Horaire : tous les jours à 12h00 UTC
  $$
  SELECT net.http_post(
    url := 'https://VOTRE-PROJECT.supabase.co/functions/v1/spotify_daily_sync',  -- ⚠️ LIGNE À REMPLACER
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer VOTRE-SERVICE-ROLE-KEY'                            -- ⚠️ LIGNE À REMPLACER
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- ============================================================
-- ÉTAPE 3 : VÉRIFIER LA CONFIGURATION
-- ============================================================

-- Afficher le cron job créé
SELECT 
    jobid as "Job ID",
    jobname as "Nom",
    schedule as "Horaire",
    'Cron job configuré avec succès ✅' as "Status"
FROM cron.job 
WHERE jobname = 'spotify-daily-sync';

-- ============================================================
-- ÉTAPE 4 : TEST MANUEL (OPTIONNEL)
-- ============================================================

-- Pour tester immédiatement sans attendre 12h00 :
-- Décommentez les lignes ci-dessous (supprimez les --) et exécutez

/*
DO $$
DECLARE
    result RECORD;
BEGIN
    -- Appeler la fonction de synchronisation
    SELECT net.http_post(
        url := 'https://VOTRE-PROJECT.supabase.co/functions/v1/spotify_daily_sync',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer VOTRE-SERVICE-ROLE-KEY'
        ),
        body := '{}'::jsonb
    ) INTO result;
    
    RAISE NOTICE 'Test de synchronisation lancé. Résultat: %', result;
END $$;

-- Attendre quelques secondes puis vérifier les données
SELECT 
    COUNT(*) as "Nombre d'entrées",
    MAX(recorded_at)::date as "Dernière sync",
    'Synchronisation testée avec succès ✅' as "Status"
FROM spotify_history;
*/

-- ============================================================
-- COMMANDES UTILES
-- ============================================================

-- Voir l'historique d'exécution du cron (après la première exécution)
/*
SELECT 
    runid,
    status,
    return_message,
    start_time,
    end_time,
    end_time - start_time as duration
FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'spotify-daily-sync')
ORDER BY start_time DESC
LIMIT 5;
*/

-- Pour supprimer le cron job (si besoin de reconfigurer)
/*
SELECT cron.unschedule('spotify-daily-sync');
*/

-- Pour modifier l'horaire (supprimer puis recréer avec nouvel horaire)
/*
SELECT cron.unschedule('spotify-daily-sync');
-- Puis réexécuter le SELECT cron.schedule(...) avec le nouvel horaire
*/

-- ============================================================
-- HORAIRES DISPONIBLES (format cron)
-- ============================================================
/*
'0 12 * * *'   → Tous les jours à 12h00 UTC (13h Paris hiver, 14h été)
'0 6 * * *'    → Tous les jours à 06h00 UTC (07h Paris hiver, 08h été)
'0 0 * * *'    → Tous les jours à minuit UTC
'30 14 * * *'  → Tous les jours à 14h30 UTC
'0 12 * * 1'   → Tous les lundis à 12h00 UTC
'0 12 1 * *'   → Le 1er de chaque mois à 12h00 UTC
*/

-- ============================================================
-- FIN DU SCRIPT
-- ============================================================
-- 
-- ✅ CHECKLIST :
-- [ ] Extension pg_cron activée
-- [ ] URL Supabase remplacée (ligne 42)
-- [ ] Service Role Key remplacée (ligne 45)
-- [ ] Cron job créé et visible dans la vérification
-- [ ] Test manuel effectué (optionnel)
--
-- Le système est maintenant opérationnel ! 🚀
-- La prochaine synchronisation aura lieu demain à 12h00 UTC.
-- ============================================================



