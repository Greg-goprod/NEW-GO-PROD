-- Configuration du Cron Job pour la synchronisation quotidienne Spotify
-- À exécuter dans Supabase SQL Editor

-- ⚠️ IMPORTANT : Remplacez ces valeurs par les vôtres
-- 1. Votre URL Supabase (trouvable dans Settings > API)
-- 2. Votre Service Role Key (trouvable dans Settings > API > service_role secret)

-- Format de l'URL : https://VOTRE-PROJECT.supabase.co
-- Exemple : https://alhoefdrjbwdzijizrxc.supabase.co

SELECT cron.schedule(
  'spotify-daily-sync',                    -- Nom du job
  '0 12 * * *',                           -- Tous les jours à 12h00 UTC (13h Paris hiver, 14h été)
  $$
  SELECT net.http_post(
    url := 'https://alhoefdrjbwdzijizrxc.supabase.co/functions/v1/spotify_daily_sync',  -- ⚠️ REMPLACEZ l'URL
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'  -- ⚠️ REMPLACEZ la clé
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- Vérifier que le cron a été créé
SELECT * FROM cron.job WHERE jobname = 'spotify-daily-sync';

-- Voir l'historique d'exécution (après la première exécution)
SELECT 
  jobid,
  runid,
  job_pid,
  database,
  username,
  command,
  status,
  return_message,
  start_time,
  end_time
FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'spotify-daily-sync')
ORDER BY start_time DESC
LIMIT 5;

-- Pour tester manuellement (sans attendre 12h00)
-- Décommentez et exécutez cette ligne :
/*
SELECT net.http_post(
  url := 'https://alhoefdrjbwdzijizrxc.supabase.co/functions/v1/spotify_daily_sync',
  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
  ),
  body := '{}'::jsonb
);
*/

-- Pour supprimer le cron (si besoin)
-- SELECT cron.unschedule('spotify-daily-sync');

-- Pour modifier l'horaire du cron (si besoin)
-- SELECT cron.unschedule('spotify-daily-sync');
-- Puis recréez-le avec le nouvel horaire



