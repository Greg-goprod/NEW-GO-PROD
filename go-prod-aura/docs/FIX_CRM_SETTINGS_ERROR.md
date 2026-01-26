# Correction : Erreur lors de la création de rôles de contact

## Problème
Erreur lors de la création d'options CRM (rôles, départements, etc.) sur `/app/settings/contacts`.

## Cause
Les fonctions RPC `upsert_crm_option` et `disable_crm_option` avaient deux problèmes :
1. Elles essayaient de récupérer le `company_id` depuis le JWT token avec `auth_company_id()`, mais ce champ n'est pas présent dans le token
2. Elles faisaient référence à une table `users` qui n'existe pas dans la base de données

## Solution
Modifier les fonctions RPC pour accepter explicitement le `company_id` en paramètre.

## Instructions d'application

### 1. Ouvrir la console Supabase
1. Allez sur [https://supabase.com](https://supabase.com)
2. Sélectionnez votre projet
3. Allez dans **SQL Editor**

### 2. Copier et exécuter le script SQL

⚠️ **IMPORTANT** : Utilisez le script **VERSION 2** ci-dessous (corrige le problème de la table `users` manquante).

Copiez et collez le contenu du fichier `supabase/migrations/20251107_000001_fix_upsert_crm_option_v2.sql` dans l'éditeur SQL et exécutez-le.

**Ou copiez directement ce script :**

```sql
-- Migration pour corriger les fonctions RPC CRM - Version 2 (sans référence à table users)

-- 1) Recréer upsert_crm_option avec company_id en paramètre
DROP FUNCTION IF EXISTS public.upsert_crm_option(text, uuid, text, boolean, int);
DROP FUNCTION IF EXISTS public.upsert_crm_option(text, uuid, uuid, text, boolean, int);

CREATE OR REPLACE FUNCTION public.upsert_crm_option(
  p_table text,
  p_company_id uuid,
  p_id uuid,
  p_label text,
  p_active boolean DEFAULT true,
  p_sort_order int DEFAULT 100
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_sql text;
  v_return_id uuid;
BEGIN
  -- Vérifier que l'utilisateur est authentifié
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: user not authenticated';
  END IF;

  -- Vérifier que la table est autorisée
  IF p_table NOT IN ('company_types','contact_statuses','departments','contact_roles','seniority_levels') THEN
    RAISE EXCEPTION 'Table not allowed: %', p_table;
  END IF;

  -- Insertion ou mise à jour
  IF p_id IS NULL THEN
    -- Insertion
    v_sql := format($f$
      INSERT INTO public.%I (company_id, label, active, sort_order)
      VALUES ($1, $2, $3, $4)
      RETURNING id
    $f$, p_table);
    EXECUTE v_sql USING p_company_id, p_label, p_active, p_sort_order INTO v_return_id;
  ELSE
    -- Mise à jour
    v_sql := format($f$
      UPDATE public.%I
         SET label = $2,
             active = $3,
             sort_order = $4,
             updated_at = timezone('utc', now())
       WHERE id = $1 AND company_id = $5
       RETURNING id
    $f$, p_table);
    EXECUTE v_sql USING p_id, p_label, p_active, p_sort_order, p_company_id INTO v_return_id;

    IF v_return_id IS NULL THEN
      RAISE EXCEPTION 'Not found or forbidden: id=%, table=%', p_id, p_table;
    END IF;
  END IF;

  RETURN v_return_id;
END;
$$;

-- Permissions
GRANT EXECUTE ON FUNCTION public.upsert_crm_option(text, uuid, uuid, text, boolean, int) TO authenticated;

COMMENT ON FUNCTION public.upsert_crm_option IS 'Crée ou met à jour une option CRM (lookup table). Requiert une authentification.';

-- 2) Recréer disable_crm_option avec company_id en paramètre
DROP FUNCTION IF EXISTS public.disable_crm_option(text, uuid);
DROP FUNCTION IF EXISTS public.disable_crm_option(text, uuid, uuid);

CREATE OR REPLACE FUNCTION public.disable_crm_option(
  p_table text,
  p_company_id uuid,
  p_id uuid
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_sql text;
  v_affected int;
BEGIN
  -- Vérifier que l'utilisateur est authentifié
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: user not authenticated';
  END IF;

  -- Vérifier que la table est autorisée
  IF p_table NOT IN ('company_types','contact_statuses','departments','contact_roles','seniority_levels') THEN
    RAISE EXCEPTION 'Table not allowed: %', p_table;
  END IF;

  -- Désactiver
  v_sql := format($f$
    UPDATE public.%I
       SET active = false,
           updated_at = timezone('utc', now())
     WHERE id = $1 AND company_id = $2
  $f$, p_table);
  
  EXECUTE v_sql USING p_id, p_company_id;
  
  GET DIAGNOSTICS v_affected = ROW_COUNT;
  
  IF v_affected = 0 THEN
    RAISE EXCEPTION 'Not found or forbidden: id=%, table=%', p_id, p_table;
  END IF;
END;
$$;

-- Permissions
GRANT EXECUTE ON FUNCTION public.disable_crm_option(text, uuid, uuid) TO authenticated;

COMMENT ON FUNCTION public.disable_crm_option IS 'Désactive une option CRM (lookup table). Requiert une authentification.';
```

### 3. Vérifier que la migration a réussi

Exécutez cette requête pour vérifier :

```sql
SELECT 
  p.proname as function_name,
  pg_get_function_arguments(p.oid) as arguments
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN ('upsert_crm_option', 'disable_crm_option')
ORDER BY p.proname;
```

Vous devriez voir :
- `upsert_crm_option` avec 6 paramètres dont `p_company_id uuid`
- `disable_crm_option` avec 3 paramètres dont `p_company_id uuid`

### 4. Tester

1. Retournez sur `/app/settings/contacts`
2. Essayez de créer un nouveau rôle de contact
3. L'opération devrait maintenant réussir !

## Fichiers modifiés

- ✅ `supabase/migrations/20251107_000000_fix_upsert_crm_option.sql` - Migration SQL
- ✅ `src/api/crmLookupsApi.ts` - API mise à jour pour passer `companyId`
- ✅ `src/hooks/useCRMLookups.ts` - Hook mis à jour pour utiliser `companyId`

## Changements techniques

### Avant
```typescript
await supabase.rpc('upsert_crm_option', {
  p_table: table,
  p_id: id,
  p_label: label,
  p_active: active,
  p_sort_order: sortOrder
});
```

### Après
```typescript
await supabase.rpc('upsert_crm_option', {
  p_table: table,
  p_company_id: companyId,  // ← NOUVEAU
  p_id: id,
  p_label: label,
  p_active: active,
  p_sort_order: sortOrder
});
```

Le `companyId` est maintenant passé explicitement depuis le frontend au lieu d'être extrait du JWT token.

