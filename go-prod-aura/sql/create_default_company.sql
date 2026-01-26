-- Script pour créer la compagnie par défaut avec l'UUID utilisé dans l'app
-- À exécuter dans le SQL Editor de Supabase

-- Créer la compagnie par défaut avec l'UUID utilisé dans l'application
INSERT INTO companies (
  id,
  name,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  'Compagnie par défaut',
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Vérifier que la compagnie a été créée
SELECT 
  id,
  name,
  created_at
FROM companies 
WHERE id = '00000000-0000-0000-0000-000000000000';

-- Afficher toutes les compagnies existantes
SELECT 
  id,
  name,
  created_at
FROM companies 
ORDER BY created_at;

