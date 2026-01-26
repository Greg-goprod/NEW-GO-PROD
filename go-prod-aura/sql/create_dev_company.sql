-- Script pour créer l'entreprise de développement
-- À exécuter dans le SQL Editor de Supabase

-- Créer l'entreprise de développement avec UUID fixe
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

-- Vérifier que l'entreprise a été créée
SELECT 
  id,
  name,
  slug,
  created_at
FROM companies 
WHERE id = '11111111-1111-1111-1111-111111111111';
