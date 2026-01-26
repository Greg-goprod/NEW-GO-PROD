# 📁 Scripts de Vérification Architecture Multitenant

## 🎯 Vue d'Ensemble

Ce dossier contient l'ensemble des outils de vérification et de validation de l'architecture multitenant de **Go-Prod AURA**.

### Objectif

Garantir que :
- ✅ Toutes les tables métier ont un `company_id` (isolation par tenant)
- ✅ Toutes les tables multitenant ont RLS activé (sécurité)
- ✅ Les relations événementielles sont cohérentes
- ✅ Les "pots communs" sont documentés et validés
- ✅ L'intégrité référentielle est respectée

---

## 📚 Documentation

### 📖 Fichiers Disponibles

| Fichier | Description | Usage |
|---------|-------------|-------|
| **README_VERIFICATION.md** | Documentation complète des scripts de vérification | Guide de référence principal |
| **EXEMPLES.md** | Exemples pratiques et cas d'usage | Tutoriels et scénarios réels |
| **verify.sh** | Script shell interactif | Exécution simplifiée |
| **verify_multitenant_architecture.sql** | Script SQL de vérification | Vérification complète avec affichage détaillé |
| **verify_multitenant_architecture.js** | Script Node.js programmatique | Génération de rapports JSON |

---

## 🚀 Démarrage Rapide

### Option 1 : Script Interactif (Recommandé)

```bash
# Rendre exécutable
chmod +x supabase/scripts/verify.sh

# Lancer le menu interactif
./supabase/scripts/verify.sh
```

### Option 2 : Vérification SQL Directe

```bash
# Via Supabase CLI
supabase db execute -f supabase/scripts/verify_multitenant_architecture.sql

# Via psql
psql -U postgres -d postgres -f supabase/scripts/verify_multitenant_architecture.sql
```

### Option 3 : Vérification Programmatique (CI/CD)

```bash
# Définir les variables d'environnement
export SUPABASE_URL="https://votre-projet.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="eyJhbGc..."

# Exécuter
node supabase/scripts/verify_multitenant_architecture.js

# Format JSON uniquement
node supabase/scripts/verify_multitenant_architecture.js --json
```

---

## 📊 Que Vérifie le Script ?

### 1️⃣ Multitenant (company_id)

- ✅ Liste des tables avec `company_id`
- ⚠️ Tables métier **sans** `company_id` (anomalie)
- 📋 Tables système (normalement sans `company_id`)

### 2️⃣ Relations Événementielles (event_id)

- 📅 Tables liées aux événements via `event_id`
- 🔗 Vérification de la cohérence tenant ↔ événement

### 3️⃣ Pots Communs (Ressources Mutualisées)

Identification des ressources partagées entre événements d'un même tenant :
- `staff_volunteers` : Bénévoles mutualités
- `artists` : Artistes mutualités
- `crm_contacts` : Contacts CRM
- Tables de lookups/référentiels

### 4️⃣ Intégrité Référentielle

Vérification que les `event_id` référencent bien des événements du **même tenant** :
- `offers.event_id` → `events.id` (même `company_id`)
- `staff_shifts.event_id` → `staff_events.id` (même `company_id`)
- etc.

### 5️⃣ Row Level Security (RLS)

- 🔒 Toutes les tables avec `company_id` doivent avoir RLS activé
- 📜 Vérification des policies basées sur `auth_company_id()`

### 6️⃣ Statistiques Générales

- Nombre de tenants
- Nombre d'événements par tenant
- Répartition des tables par catégorie

---

## 📈 Interprétation des Résultats

### ✅ Tout est OK

```
✅ ARCHITECTURE MULTITENANT PARFAITE !

  • 45 tables avec company_id (multitenancy OK)
  • 0 table métier sans company_id
  • 0 table sans RLS
  • 0 violation d'intégrité référentielle
```

➡️ **Action** : Aucune action requise

### ⚠️ Problèmes Détectés

```
⚠️ PROBLÈMES DÉTECTÉS DANS L'ARCHITECTURE

  • 42 tables avec company_id (multitenancy)
  ❌ 3 table(s) métier SANS company_id
  ❌ 2 table(s) avec company_id SANS RLS
  ❌ 5 violation(s) d'intégrité référentielle
```

➡️ **Action** : Consulter **README_VERIFICATION.md** section "Actions Correctives"

---

## 🔄 Workflow Recommandé

### Avant Chaque Déploiement

```bash
# 1. Vérifier l'architecture
./supabase/scripts/verify.sh

# 2. Si erreurs, corriger
# 3. Re-vérifier
./supabase/scripts/verify.sh

# 4. Déployer
supabase db push
```

### Intégration CI/CD

Voir **EXEMPLES.md** section "Intégration dans un Pipeline CI/CD"

### Monitoring Régulier

```bash
# Cron quotidien
0 2 * * * /app/supabase/scripts/verify.sh >> /var/log/multitenant_verify.log 2>&1
```

---

## 🛠️ Maintenance

### Après Ajout d'une Nouvelle Table

✅ **Checklist** :

- [ ] La table a-t-elle un `company_id` ?
- [ ] Le `company_id` a-t-il un index ?
- [ ] Foreign key `company_id → companies(id) ON DELETE CASCADE` ?
- [ ] RLS activé ?
- [ ] Policies RLS créées ?
- [ ] Si liée à un événement, `event_id` présent ?
- [ ] **Exécuter le script de vérification**

```bash
./supabase/scripts/verify.sh
```

### Après Migration

```bash
# 1. Appliquer la migration
supabase migration up

# 2. Vérifier immédiatement
./supabase/scripts/verify.sh

# 3. Si problème, rollback
supabase migration down
```

---

## 📚 Documentation Complète

Pour plus de détails, consultez :

1. **[README_VERIFICATION.md](./README_VERIFICATION.md)** - Guide complet de vérification
2. **[EXEMPLES.md](./EXEMPLES.md)** - Exemples pratiques et cas d'usage

---

## 🆘 Support

### Problèmes Courants

#### Erreur : "Variables d'environnement manquantes"

```bash
export SUPABASE_URL="https://votre-projet.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="eyJhbGc..."
```

#### Erreur : "Supabase CLI n'est pas installé"

```bash
npm install -g supabase
```

#### Erreur : "Node.js n'est pas installé"

```bash
# Ubuntu/Debian
sudo apt install nodejs npm

# macOS
brew install node

# Windows
# Télécharger depuis https://nodejs.org/
```

#### Erreur : "Permission denied: ./verify.sh"

```bash
chmod +x supabase/scripts/verify.sh
```

---

## 🔐 Sécurité

⚠️ **IMPORTANT** : Les scripts utilisent la **service_role key** qui a tous les droits.

- ✅ Ne jamais commiter les clés dans Git
- ✅ Utiliser des variables d'environnement
- ✅ Restreindre l'accès aux scripts de vérification
- ✅ La fonction `exec_sql` est restreinte (service_role uniquement)

---

## 📝 Changelog

| Date | Version | Changements |
|------|---------|-------------|
| 2025-11-07 | 1.0.0 | Version initiale des scripts de vérification |

---

## 👥 Contributeurs

**Maintenu par** : Équipe Dev Go-Prod AURA

**Contact** : Pour toute question ou amélioration, contactez l'équipe de développement.

---

## 📄 Licence

© 2025 Go-Prod AURA - Usage interne uniquement

---

## 🎯 Roadmap

### Version 1.1 (À venir)

- [ ] Support des branches (preview environments)
- [ ] Vérification des permissions RBAC
- [ ] Dashboard web de monitoring
- [ ] Alertes automatiques (Slack/Discord)
- [ ] Export PDF des rapports
- [ ] Historique des vérifications

### Version 1.2

- [ ] Vérification des performances (index manquants)
- [ ] Suggestions d'optimisation
- [ ] Tests de charge multitenant
- [ ] Audit RGPD automatisé

---

**⚡ Pro-tip** : Intégrez ces scripts dans votre workflow quotidien pour maintenir une architecture multitenant robuste et sécurisée !













