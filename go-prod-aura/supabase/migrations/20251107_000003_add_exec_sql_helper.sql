-- =============================================================================
-- Helper function pour exécution SQL générique (admin uniquement)
-- Utilisé par les scripts de vérification
-- =============================================================================

-- Créer une fonction pour exécuter du SQL générique (admin uniquement)
CREATE OR REPLACE FUNCTION public.exec_sql(query TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  -- Vérifier que l'utilisateur est un super admin
  -- (à adapter selon votre système de permissions)
  
  -- Exécuter la requête
  EXECUTE format('SELECT json_agg(row_to_json(t)) FROM (%s) t', query) INTO result;
  
  RETURN COALESCE(result, '[]'::json);
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Erreur SQL: %', SQLERRM;
END;
$$;

COMMENT ON FUNCTION public.exec_sql IS 'Fonction helper pour exécuter du SQL générique (scripts de vérification)';

-- Restreindre l'accès à cette fonction (seulement pour service_role)
REVOKE ALL ON FUNCTION public.exec_sql(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.exec_sql(TEXT) FROM anon;
REVOKE ALL ON FUNCTION public.exec_sql(TEXT) FROM authenticated;

-- Note : Cette fonction doit être utilisée uniquement avec le service_role key
-- Ne jamais l'exposer aux utilisateurs finaux

\echo '✅ Fonction exec_sql créée (pour scripts de vérification uniquement)'













