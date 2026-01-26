-- Script pour nettoyer l'entreprise de développement créée précédemment
-- À exécuter dans le SQL Editor de Supabase

-- 1. Vérifier l'entreprise Go-Prod HQ existante
SELECT 
  id,
  name,
  slug,
  plan,
  created_at
FROM companies 
WHERE id = '06f6c960-3f90-41cb-b0d7-46937eaf90a8';

-- 2. Compter les artistes associés à Go-Prod HQ
SELECT 
  COUNT(*) as artists_in_goprod_hq
FROM artists 
WHERE company_id = '06f6c960-3f90-41cb-b0d7-46937eaf90a8';

-- 3. Supprimer l'entreprise de développement si elle existe
DELETE FROM companies 
WHERE id = '11111111-1111-1111-1111-111111111111';

-- 4. Vérifier qu'il n'y a plus d'artistes orphelins
SELECT 
  COUNT(*) as total_artists,
  COUNT(CASE WHEN company_id = '06f6c960-3f90-41cb-b0d7-46937eaf90a8' THEN 1 END) as artists_in_goprod_hq,
  COUNT(CASE WHEN company_id IS NULL THEN 1 END) as artists_without_company,
  COUNT(CASE WHEN company_id = '00000000-0000-0000-0000-000000000000' THEN 1 END) as artists_with_default_company
FROM artists;

-- 5. Afficher quelques artistes de Go-Prod HQ
SELECT 
  id,
  name,
  company_id,
  status,
  created_at
FROM artists 
WHERE company_id = '06f6c960-3f90-41cb-b0d7-46937eaf90a8'
ORDER BY created_at DESC
LIMIT 10;


