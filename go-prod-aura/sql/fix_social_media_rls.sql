-- Script pour corriger les politiques RLS sur social_media_data

-- 1. Vérifier si RLS est activé sur social_media_data
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'social_media_data';

-- 2. Voir les politiques existantes
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'social_media_data';

-- 3. Supprimer les anciennes politiques si elles existent
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.social_media_data;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.social_media_data;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.social_media_data;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.social_media_data;

-- 4. Créer de nouvelles politiques RLS pour social_media_data
-- Policy READ : permettre la lecture pour tous les utilisateurs authentifiés
CREATE POLICY "social_media_read_policy"
ON public.social_media_data
FOR SELECT
TO authenticated
USING (true);

-- Policy INSERT : permettre l'insertion pour tous les utilisateurs authentifiés
CREATE POLICY "social_media_insert_policy"
ON public.social_media_data
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Policy UPDATE : permettre la mise à jour pour tous les utilisateurs authentifiés
CREATE POLICY "social_media_update_policy"
ON public.social_media_data
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Policy DELETE : permettre la suppression pour tous les utilisateurs authentifiés
CREATE POLICY "social_media_delete_policy"
ON public.social_media_data
FOR DELETE
TO authenticated
USING (true);

-- 5. S'assurer que RLS est activé
ALTER TABLE public.social_media_data ENABLE ROW LEVEL SECURITY;

-- 6. Vérifier que les politiques sont bien créées
SELECT 
  policyname,
  cmd as operation,
  roles
FROM pg_policies 
WHERE tablename = 'social_media_data';

-- 7. Test : Vérifier qu'on peut lire les données de Naza
-- (Cette requête devrait maintenant fonctionner)
SELECT 
  smd.*
FROM public.social_media_data smd
INNER JOIN public.artists a ON a.id = smd.artist_id
WHERE LOWER(a.name) LIKE '%naza%';



