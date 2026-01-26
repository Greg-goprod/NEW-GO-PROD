# 🔧 FIX URGENT : Politiques RLS sur social_media_data

## ❌ Problème identifié

Les données des réseaux sociaux **existent** dans la base de données mais ne sont **pas retournées** par Supabase dans l'application.

### Preuve du problème

**Console navigateur** :
```
🔍 Social media data (brut): null
✅ Social media data (normalisé): null
```

**SQL direct** (fonctionne) :
```
| artist_name | instagram_url                          | youtube_url                           |
| NAZA        | https://www.instagram.com/nazaofficiel | https://youtube.com/channel/UCO...    |
```

**Cause** : Les **politiques RLS (Row Level Security)** bloquent l'accès aux données `social_media_data` depuis l'application.

---

## ✅ Solution : Corriger les politiques RLS

### Étape 1 : Aller dans Supabase

1. Ouvrir **Supabase Dashboard**
2. Sélectionner votre projet
3. Aller dans **SQL Editor** (menu de gauche)

### Étape 2 : Exécuter le script de correction

Copier-coller **tout le contenu** du fichier `sql/fix_social_media_rls.sql` dans le SQL Editor et cliquer sur **Run**.

### Script à exécuter

```sql
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
SELECT 
  smd.*
FROM public.social_media_data smd
INNER JOIN public.artists a ON a.id = smd.artist_id
WHERE LOWER(a.name) LIKE '%naza%';
```

### Étape 3 : Vérifier les résultats

À la fin du script, vous devriez voir :

**Requête 6** (politiques créées) :
```
| policyname                    | operation | roles          |
| social_media_read_policy      | SELECT    | {authenticated}|
| social_media_insert_policy    | INSERT    | {authenticated}|
| social_media_update_policy    | UPDATE    | {authenticated}|
| social_media_delete_policy    | DELETE    | {authenticated}|
```

**Requête 7** (données de Naza) :
```
| artist_id | instagram_url                          | youtube_url      |
| ...       | https://www.instagram.com/nazaofficiel | https://youtube...|
```

### Étape 4 : Tester dans l'application

1. **Recharger la page** de détail de Naza (F5)
2. **Ouvrir la console** (F12)
3. **Vérifier les logs** :

**AVANT le fix** (actuel) :
```
🔍 Social media data (brut): null
✅ Social media data (normalisé): null
```

**APRÈS le fix** (attendu) :
```
🔍 Social media data (brut): {instagram_url: "https://...", youtube_url: "https://...", ...}
✅ Social media data (normalisé): {instagram_url: "https://...", youtube_url: "https://...", ...}
```

### Étape 5 : Vérifier visuellement

Les icônes des réseaux sociaux devraient maintenant être **colorées et cliquables** :
- 🟢 **Instagram** (coloré, cliquable)
- 🟢 **Twitter/X** (coloré, cliquable)
- 🟢 **YouTube** (coloré, cliquable)
- 🟢 **SoundCloud** (coloré, cliquable)
- ⚪ **Facebook** (grisé, non cliquable - pas de lien)
- ⚪ **TikTok** (grisé, non cliquable - pas de lien)
- ⚪ **Website** (grisé, non cliquable - pas de lien)
- etc.

---

## 📊 Données confirmées pour Naza

| Réseau social | URL | Statut |
|---------------|-----|--------|
| **Instagram** | `https://www.instagram.com/nazaofficiel` | ✅ |
| **Twitter (X)** | `https://x.com/nazabomaye` | ✅ |
| **YouTube** | `https://youtube.com/channel/UCOIrnztq38O86VowvdK0X4Q` | ✅ |
| **SoundCloud** | `https://soundcloud.com/naza1-sc` | ✅ |
| Facebook | `null` | ❌ |
| TikTok | `null` | ❌ |
| Website | `null` | ❌ |
| Threads | `null` | ❌ |
| Bandcamp | `null` | ❌ |
| Wikipedia | `null` | ❌ |

---

## 🔍 Comprendre le problème

### Qu'est-ce que RLS (Row Level Security) ?

**RLS** est un système de sécurité de Supabase/PostgreSQL qui contrôle **qui peut voir/modifier quelles lignes** d'une table.

Sans politiques RLS correctes, même si les données existent, **Supabase refuse de les retourner** à l'application.

### Pourquoi ça fonctionnait en SQL direct ?

Le SQL Editor de Supabase utilise des **permissions d'administrateur** qui contournent le RLS. C'est pour ça que vous pouviez voir les données en SQL mais pas dans l'application.

### Pourquoi `spotify_data` fonctionne mais pas `social_media_data` ?

La table `spotify_data` a probablement déjà des politiques RLS correctes, créées lors de la configuration initiale. La table `social_media_data` a été créée par le backend Supabase sans politiques RLS, ou avec des politiques trop restrictives.

---

## ⚠️ Notes importantes

1. **Sécurité** : Les politiques créées permettent l'accès à **tous les utilisateurs authentifiés**. Si vous voulez plus de restrictions (par exemple, par `company_id`), modifiez la condition `USING (true)`.

2. **Multi-tenant** : Si vous voulez filtrer par entreprise :
   ```sql
   USING (
     artist_id IN (
       SELECT id FROM public.artists 
       WHERE company_id = (SELECT company_id FROM public.user_companies WHERE user_id = auth.uid())
     )
   )
   ```

3. **Pas de redémarrage nécessaire** : Les politiques RLS sont appliquées **immédiatement**, pas besoin de redémarrer Supabase ou l'application.

---

## 📁 Fichiers créés

- ✅ `sql/fix_social_media_rls.sql` - Script de correction (À EXÉCUTER MAINTENANT)
- ✅ `sql/test_social_media_access.sql` - Script de test
- ✅ `DEBUG_SOCIAL_MEDIA.md` - Documentation du debug
- ✅ `FIX_SOCIAL_MEDIA_RLS_NOW.md` - Ce fichier

---

## 🚀 Résumé ultra-rapide

1. Ouvrir **Supabase SQL Editor**
2. Copier-coller le contenu de `sql/fix_social_media_rls.sql`
3. Cliquer sur **Run**
4. Recharger la page de Naza (F5)
5. Les icônes sont maintenant colorées et cliquables ! 🎉

---

**Date** : 2025-10-24  
**Statut** : ⚠️ FIX À APPLIQUER MAINTENANT



