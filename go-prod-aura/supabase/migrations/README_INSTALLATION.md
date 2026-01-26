# 📦 Guide d'installation des migrations CRM

## 🎯 Vue d'ensemble

Ce guide vous explique comment installer le module CRM complet dans votre base de données Supabase.

---

## 📋 Ordre d'exécution des migrations

Exécutez les migrations **dans cet ordre exact** :

### 1️⃣ **Structure CRM** (OBLIGATOIRE)
```sql
-- Fichier: 20251104_140000_crm_core.sql
-- Crée toutes les tables CRM, les RLS, et les fonctions RPC
```
✅ Crée : tables, lookups, RLS policies, fonctions

---

### 2️⃣ **Désactivation RLS** (OPTIONNEL - pour dev/debug)
```sql
-- Fichier: DISABLE_ALL_RLS.sql
-- Désactive temporairement les RLS pour faciliter l'import
```
⚠️ À utiliser UNIQUEMENT en développement !

---

### 3️⃣ **Import des sociétés** (OPTIONNEL)
```sql
-- Fichier: 20251104_160000_import_companies_csv.sql
-- Importe 23 sociétés depuis l'ancienne base
```
📊 Importe : 23 sociétés (fournisseurs)

---

### 4️⃣ **Import des contacts** (OPTIONNEL)
```sql
-- Fichier: 20251104_150000_import_contacts_csv.sql
-- Importe 56 contacts depuis l'ancienne base
```
📊 Importe : 56 contacts (personnes)

---

### 5️⃣ **Correction des company_id** (OBLIGATOIRE si imports faits)
```sql
-- Fichier: 20251104_170000_fix_contacts_company_id.sql
-- Met à jour tous les contacts/sociétés avec le bon tenant (Go-Prod HQ)
```
🔧 Corrige : les company_id pour qu'ils correspondent à votre tenant

---

### 6️⃣ **Réactivation RLS** (OBLIGATOIRE si désactivé)
```sql
-- Fichier: ENABLE_ALL_RLS.sql
-- Réactive les RLS après l'import
```
🔒 Sécurise : réactive la sécurité RLS

---

## 🚀 Procédure d'installation complète

### **Option A : Installation avec données existantes**

1. Ouvrir le **SQL Editor** dans Supabase
2. Exécuter dans l'ordre :
   ```
   1. 20251104_140000_crm_core.sql        ← Structure
   2. DISABLE_ALL_RLS.sql                  ← Désactiver sécurité (temporaire)
   3. 20251104_160000_import_companies_csv.sql ← Importer sociétés
   4. 20251104_150000_import_contacts_csv.sql  ← Importer contacts
   5. 20251104_170000_fix_contacts_company_id.sql ← Corriger IDs
   6. ENABLE_ALL_RLS.sql                   ← Réactiver sécurité
   ```

### **Option B : Installation structure seule (nouvelle installation)**

1. Ouvrir le **SQL Editor** dans Supabase
2. Exécuter uniquement :
   ```
   1. 20251104_140000_crm_core.sql        ← Structure complète
   ```

---

## ✅ Vérification post-installation

### Vérifier que les tables existent :
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE 'crm_%'
ORDER BY table_name;
```

**Résultat attendu :**
```
crm_companies
crm_companies_activity_log
crm_artist_contact_links
crm_contacts
crm_contacts_activity_log
crm_contact_company_links
```

### Vérifier les données importées :
```sql
-- Compter les contacts
SELECT count(*) as nb_contacts FROM crm_contacts;

-- Compter les sociétés
SELECT count(*) as nb_companies FROM crm_companies;

-- Vérifier les company_id
SELECT 
  'crm_contacts' as table_name,
  company_id,
  count(*) as count
FROM crm_contacts
GROUP BY company_id
UNION ALL
SELECT 
  'crm_companies' as table_name,
  company_id,
  count(*) as count
FROM crm_companies
GROUP BY company_id
ORDER BY table_name, count DESC;
```

**Résultat attendu :**
```
crm_contacts  | 06f6c960-3f90-41cb-b0d7-46937eaf90a8 | 56
crm_companies | 06f6c960-3f90-41cb-b0d7-46937eaf90a8 | 23
```

### Vérifier les RLS :
```sql
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename LIKE 'crm_%'
ORDER BY tablename;
```

**Résultat attendu (en production) :**
Toutes les tables doivent avoir `rls_enabled = true`

---

## 🔧 Dépannage

### ❌ Problème : "Aucun contact n'apparaît"

**Cause :** Les `company_id` des contacts ne correspondent pas au tenant actuel

**Solution :** Exécuter la migration `20251104_170000_fix_contacts_company_id.sql`

---

### ❌ Problème : "Could not embed because more than one relationship"

**Cause :** PostgREST ne sait pas quelle relation utiliser

**Solution :** Déjà corrigé dans `crmContactsApi.ts` et `crmCompaniesApi.ts` avec la syntaxe `!column_name`

---

### ❌ Problème : "Permission denied for table crm_contacts"

**Cause :** RLS activées mais pas de policies appropriées

**Solution :** 
1. Vérifier que vous êtes owner/admin
2. Temporairement désactiver RLS : `ALTER TABLE crm_contacts DISABLE ROW LEVEL SECURITY;`
3. Déboguer les policies RLS

---

## 📚 Documentation

- **Tables CRM** : `20251104_140000_crm_core.sql` (voir commentaires)
- **Types TypeScript** : `src/types/crm.ts`
- **API Functions** : `src/api/crmContactsApi.ts`, `src/api/crmCompaniesApi.ts`
- **Hooks React** : `src/hooks/useCRMLookups.ts`

---

## 🎉 Terminé !

Une fois toutes les migrations exécutées, votre module CRM est opérationnel :

✅ Gestion des contacts (personnes)  
✅ Gestion des sociétés (entreprises)  
✅ Options CRM configurables  
✅ Sécurité multi-tenant (RLS)  
✅ Logs d'activité  

Rendez-vous sur :
- `/app/contacts/personnes` → Gérer les contacts
- `/app/contacts/entreprises` → Gérer les sociétés
- `/app/settings/contacts` → Configurer les options











