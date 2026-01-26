-- Script pour associer tous les artistes existants à l'entreprise de développement
-- À exécuter dans le SQL Editor de Supabase

-- D'abord, créer l'entreprise de développement si elle n'existe pas
INSERT INTO companies (
  id,
  name,
  slug,
  created_at,
  updated_at
) VALUES (
  '11111111-1111-1111-1111-111111111111',
  'GC Entertainment (Dev)',
  'gc-entertainment-dev',
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Associer tous les artistes existants à l'entreprise de développement
UPDATE artists 
SET company_id = '11111111-1111-1111-1111-111111111111'
WHERE company_id IS NULL 
   OR company_id = '00000000-0000-0000-0000-000000000000'
   OR company_id NOT IN (SELECT id FROM companies);

-- Vérifier le résultat
SELECT 
  COUNT(*) as total_artists,
  COUNT(CASE WHEN company_id = '11111111-1111-1111-1111-111111111111' THEN 1 END) as artists_in_dev_company
FROM artists;

-- Afficher quelques exemples d'artistes associés
SELECT 
  id,
  name,
  company_id,
  created_at
FROM artists 
WHERE company_id = '11111111-1111-1111-1111-111111111111'
LIMIT 10;


