-- Script pour vérifier et créer des données de test
-- À exécuter dans le SQL Editor de Supabase

-- 1. Vérifier si l'entreprise de développement existe
SELECT 
  id,
  name,
  slug,
  created_at
FROM companies 
WHERE id = '11111111-1111-1111-1111-111111111111';

-- 2. Compter les artistes existants
SELECT 
  COUNT(*) as total_artists,
  COUNT(CASE WHEN company_id = '11111111-1111-1111-1111-111111111111' THEN 1 END) as artists_in_dev_company,
  COUNT(CASE WHEN company_id IS NULL THEN 1 END) as artists_without_company,
  COUNT(CASE WHEN company_id = '00000000-0000-0000-0000-000000000000' THEN 1 END) as artists_with_default_company
FROM artists;

-- 3. Afficher quelques artistes existants
SELECT 
  id,
  name,
  company_id,
  status,
  created_at
FROM artists 
ORDER BY created_at DESC
LIMIT 10;

-- 4. Si aucun artiste n'existe, en créer quelques-uns pour les tests
INSERT INTO artists (
  id,
  name,
  slug,
  company_id,
  status,
  created_at,
  updated_at
) VALUES 
  (
    gen_random_uuid(),
    'Test Artist 1',
    'test-artist-1',
    '11111111-1111-1111-1111-111111111111',
    'active',
    NOW(),
    NOW()
  ),
  (
    gen_random_uuid(),
    'Test Artist 2',
    'test-artist-2',
    '11111111-1111-1111-1111-111111111111',
    'active',
    NOW(),
    NOW()
  ),
  (
    gen_random_uuid(),
    'Test Artist 3',
    'test-artist-3',
    '11111111-1111-1111-1111-111111111111',
    'inactive',
    NOW(),
    NOW()
  )
ON CONFLICT (id) DO NOTHING;

-- 5. Vérifier le résultat final
SELECT 
  COUNT(*) as total_artists,
  COUNT(CASE WHEN company_id = '11111111-1111-1111-1111-111111111111' THEN 1 END) as artists_in_dev_company
FROM artists;

-- 6. Afficher les artistes de l'entreprise de développement
SELECT 
  id,
  name,
  company_id,
  status,
  created_at
FROM artists 
WHERE company_id = '11111111-1111-1111-1111-111111111111'
ORDER BY created_at DESC;


