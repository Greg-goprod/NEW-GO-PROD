# 🔍 Scripts de Vérification Architecture Multitenant

## 📋 Description

Ce dossier contient les scripts de vérification de l'architecture multitenant de **Go-Prod AURA**.

### Objectifs des scripts

1. **Vérifier le multitenancy** : S'assurer que toutes les tables métier ont un `company_id`
2. **Vérifier les relations événementielles** : Confirmer que les données dans les tenants sont correctement liées aux événements
3. **Identifier les "pots communs"** : Lister les ressources mutualisées (bénévoles, artistes, contacts CRM, etc.)
4. **Vérifier l'intégrité référentielle** : Contrôler que les `event_id` référencent bien des événements du même tenant
5. **Vérifier RLS** : S'assurer que toutes les tables multitenant ont Row Level Security activé

---

## 🚀 Utilisation

### Script SQL Complet

```bash
# Via psql (local)
psql -U postgres -d postgres -f supabase/scripts/verify_multitenant_architecture.sql

# Via Supabase CLI
supabase db execute -f supabase/scripts/verify_multitenant_architecture.sql
```

### Script de Vérification JSON (Programmatique)

```bash
# Exécuter et obtenir un rapport JSON
node supabase/scripts/verify_multitenant_architecture.js
```

---

## 📊 Interprétation des Résultats

### ✅ Architecture Parfaite

```
✅ ARCHITECTURE MULTITENANT PARFAITE !

  • 45 tables avec company_id (multitenancy OK)
  • 0 table métier sans company_id
  • 0 table sans RLS
  • 0 violation d'intégrité référentielle
```

### ⚠️ Problèmes Détectés

```
⚠️ PROBLÈMES DÉTECTÉS DANS L'ARCHITECTURE

  • 45 tables avec company_id (multitenancy)
  ❌ 3 table(s) métier SANS company_id
  ❌ 2 table(s) avec company_id SANS RLS
  ❌ 5 violation(s) d'intégrité référentielle
```

---

## 🗂️ Catégories de Tables

### 1️⃣ Tables Système (sans `company_id`)

Ces tables sont **communes à tous les tenants** :

- `companies` : Liste des tenants
- `enrich_config` : Configuration enrichissement données
- `rbac_permissions` : Permissions système RBAC
- `rbac_resources` : Ressources système RBAC
- `owner_admins` : Super-admins plateforme

### 2️⃣ Tables Multitenant (avec `company_id`)

Toutes les tables métier doivent avoir un `company_id` pour le partitionnement par tenant :

- `events`, `offers`, `artists`, `profiles`
- `crm_contacts`, `crm_companies`
- `staff_volunteers`, `staff_events`, `staff_shifts`
- Toutes les tables de lookups/référentiels

### 3️⃣ Tables "Pots Communs" (mutualisation)

Ressources partagées entre événements **d'un même tenant** :

| Table | Description |
|-------|-------------|
| `staff_volunteers` | Bénévoles mutualités sur tous événements du tenant |
| `artists` | Artistes mutualités (optionnellement liés à un événement via `created_for_event_id`) |
| `crm_contacts` | Contacts CRM mutualités |
| `crm_companies` | Entreprises CRM mutualités |
| `profiles` | Utilisateurs du tenant |
| `tags` | Tags métier du tenant |
| Toutes les tables `*_statuses`, `*_types`, `*_roles` | Référentiels/lookups du tenant |

### 4️⃣ Tables Liées aux Événements (avec `event_id`)

Ces tables doivent **obligatoirement** être liées à un événement :

| Table | Colonne(s) event_id |
|-------|---------------------|
| `offers` | `event_id` (NOT NULL) |
| `staff_shifts` | `event_id` (NOT NULL) |
| `event_artists` | `event_id` (NOT NULL) |
| `event_days` | `event_id` (NOT NULL) |
| `event_stages` | `event_id` (NOT NULL) |
| `artist_performances` | `event_id`, `created_for_event_id` |
| `staff_events` | `parent_event_id` (NULLABLE - événement staff indépendant possible) |
| `staff_campaigns` | `target_event_id` (NULLABLE - campagne générale possible) |

---

## 🔒 Règles RLS (Row Level Security)

### Principe

Toutes les tables avec `company_id` doivent avoir RLS activé avec des policies basées sur :

```sql
USING (company_id = auth_company_id())
WITH CHECK (company_id = auth_company_id())
```

### Vérification

Le script vérifie automatiquement que toutes les tables multitenant ont RLS activé.

---

## ✅ Checklist de Vérification

### Avant de déployer une nouvelle table

- [ ] La table métier a-t-elle un `company_id` ?
- [ ] Le `company_id` a-t-il un index ?
- [ ] Le `company_id` a-t-il une contrainte `ON DELETE CASCADE` vers `companies(id)` ?
- [ ] RLS est-il activé sur la table ?
- [ ] Des policies RLS basées sur `auth_company_id()` sont-elles créées ?
- [ ] Si la table doit être liée à un événement, a-t-elle un `event_id` ?
- [ ] Les foreign keys `event_id` vérifient-elles l'intégrité du tenant ?

### Après modification du schéma

```bash
# Exécuter le script de vérification
supabase db execute -f supabase/scripts/verify_multitenant_architecture.sql

# Vérifier qu'il n'y a aucune erreur
```

---

## 🛠️ Actions Correctives

### Table métier sans `company_id`

```sql
-- Ajouter la colonne
ALTER TABLE ma_table 
ADD COLUMN company_id UUID REFERENCES companies(id) ON DELETE CASCADE;

-- Ajouter un index
CREATE INDEX idx_ma_table_company ON ma_table(company_id);

-- Activer RLS
ALTER TABLE ma_table ENABLE ROW LEVEL SECURITY;

-- Créer les policies
CREATE POLICY "Users can view items of their company"
ON ma_table FOR SELECT
USING (company_id = auth_company_id());

CREATE POLICY "Users can insert items for their company"
ON ma_table FOR INSERT
WITH CHECK (company_id = auth_company_id());

CREATE POLICY "Users can update items of their company"
ON ma_table FOR UPDATE
USING (company_id = auth_company_id())
WITH CHECK (company_id = auth_company_id());

CREATE POLICY "Users can delete items of their company"
ON ma_table FOR DELETE
USING (company_id = auth_company_id());
```

### Violation d'intégrité référentielle

```sql
-- Exemple : Une offre référence un event_id d'un autre tenant
-- Correction manuelle nécessaire ou suppression des données incohérentes

-- Identifier les violations
SELECT o.id, o.company_id, o.event_id, e.company_id as event_company_id
FROM offers o
LEFT JOIN events e ON o.event_id = e.id
WHERE o.company_id != e.company_id;

-- Corriger ou supprimer
DELETE FROM offers 
WHERE id IN (
  SELECT o.id FROM offers o
  LEFT JOIN events e ON o.event_id = e.id
  WHERE o.company_id != e.company_id
);
```

---

## 📚 Ressources

- [Documentation Supabase RLS](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL Multi-tenancy Patterns](https://www.citusdata.com/blog/2016/10/03/designing-your-saas-database-for-high-scalability/)

---

## 🔄 Fréquence de Vérification

- ✅ **Avant chaque déploiement** : Exécuter le script de vérification
- ✅ **Après ajout de table** : Vérifier immédiatement
- ✅ **Hebdomadaire** : Vérification de routine en production
- ✅ **Après migration** : Systématique

---

## 📝 Historique des Vérifications

| Date | Résultat | Actions |
|------|----------|---------|
| 2025-11-07 | ✅ OK | Script initial créé |

---

**Maintenu par** : Équipe Dev Go-Prod AURA













