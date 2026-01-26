# 📚 Exemples d'Utilisation des Scripts de Vérification

## 🚀 Démarrage Rapide

### 1. Vérification SQL Simple

```bash
# Via Supabase CLI
supabase db execute -f supabase/scripts/verify_multitenant_architecture.sql

# Via psql
psql -U postgres -d postgres -f supabase/scripts/verify_multitenant_architecture.sql
```

### 2. Vérification JavaScript avec Rapport JSON

```bash
# Définir les variables d'environnement
export SUPABASE_URL="https://votre-projet.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="eyJhbGc..."

# Exécuter
node supabase/scripts/verify_multitenant_architecture.js

# Avec sortie JSON uniquement
node supabase/scripts/verify_multitenant_architecture.js --json
```

### 3. Script Shell Interactif

```bash
# Rendre le script exécutable
chmod +x supabase/scripts/verify.sh

# Exécuter
./supabase/scripts/verify.sh
```

---

## 📊 Exemples de Sorties

### ✅ Cas 1 : Architecture Parfaite

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔍 VÉRIFICATION ARCHITECTURE MULTITENANT GO-PROD AURA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1️⃣ VÉRIFICATION MULTITENANT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ TABLES MÉTIER avec company_id (MULTITENANT) :
  • artists → company_id (idx_artists_company)
  • events → company_id (idx_events_company)
  • offers → company_id (idx_offers_company)
  • staff_volunteers → company_id (idx_staff_volunteers_company)
  ... (45 tables au total)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

7️⃣ RÉSUMÉ FINAL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ ARCHITECTURE MULTITENANT PARFAITE !

  • 45 tables avec company_id (multitenancy OK)
  • 0 table métier sans company_id
  • 0 table sans RLS
  • 0 violation d'intégrité référentielle

═══════════════════════════════════════════════════════════════════════════
```

### ⚠️ Cas 2 : Problèmes Détectés

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️ TABLES MÉTIER SANS company_id (À VÉRIFIER) :
  ⚠️ event_artists → MANQUE company_id ! | Lié indirectement via event_id
  ⚠️ event_days → MANQUE company_id ! | Lié indirectement via event_id
  ⚠️ offer_extras → MANQUE company_id ! | ❌ PAS DE LIEN MULTITENANT

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

4️⃣ VÉRIFICATION INTÉGRITÉ DES DONNÉES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  📋 Vérification table OFFERS :
    ❌ 3 offres avec event_id de tenant différent!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

7️⃣ RÉSUMÉ FINAL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️ PROBLÈMES DÉTECTÉS DANS L'ARCHITECTURE

  • 42 tables avec company_id (multitenancy)
  ❌ 3 table(s) métier SANS company_id
  ❌ 2 table(s) avec company_id SANS RLS
  ❌ 3 violation(s) d'intégrité référentielle

═══════════════════════════════════════════════════════════════════════════
```

### 📄 Cas 3 : Rapport JSON

```json
{
  "timestamp": "2025-11-07T14:32:45.123Z",
  "summary": {
    "totalTables": 65,
    "tablesWithCompanyId": 45,
    "tablesWithEventId": 12,
    "tablesWithoutCompanyId": 3,
    "tablesWithoutRLS": 0,
    "integrityViolations": 0,
    "potCommun": 18
  },
  "issues": {
    "tablesWithoutCompanyId": [
      {
        "name": "event_artists",
        "hasEventId": true,
        "warning": "Lié indirectement via event_id"
      },
      {
        "name": "event_days",
        "hasEventId": true,
        "warning": "Lié indirectement via event_id"
      }
    ],
    "tablesWithoutRLS": [],
    "integrityViolations": [],
    "warnings": []
  },
  "details": {
    "systemTables": [
      "companies",
      "enrich_config",
      "rbac_permissions"
    ],
    "multitenantTables": [
      {
        "name": "artists",
        "tenantColumn": "company_id",
        "eventColumns": "created_for_event_id"
      }
    ],
    "potCommunTables": [
      {
        "name": "staff_volunteers",
        "description": "Bénévoles mutualités sur tous événements"
      },
      {
        "name": "crm_contacts",
        "description": "Contacts CRM mutualités"
      }
    ],
    "eventLinkedTables": [
      {
        "name": "offers",
        "eventColumns": "event_id"
      },
      {
        "name": "staff_shifts",
        "eventColumns": "event_id"
      }
    ]
  },
  "status": "OK"
}
```

---

## 🔧 Cas d'Usage Pratiques

### Cas 1 : Intégration dans un Pipeline CI/CD

#### GitHub Actions

```yaml
# .github/workflows/verify-multitenant.yml
name: Vérification Architecture Multitenant

on:
  pull_request:
    paths:
      - 'supabase/migrations/**'
  push:
    branches:
      - main

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm install @supabase/supabase-js
      
      - name: Verify Multitenant Architecture
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
        run: |
          node supabase/scripts/verify_multitenant_architecture.js --json > report.json
          
      - name: Upload Report
        uses: actions/upload-artifact@v3
        with:
          name: multitenant-verification-report
          path: report.json
      
      - name: Comment PR with Results
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v6
        with:
          script: |
            const fs = require('fs');
            const report = JSON.parse(fs.readFileSync('report.json', 'utf8'));
            
            const body = report.status === 'OK' 
              ? '✅ Architecture multitenant valide'
              : '⚠️ Problèmes détectés dans l\'architecture multitenant';
            
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: body + '\n\nVoir l\'artefact pour le rapport complet.'
            });
```

### Cas 2 : Vérification Avant Déploiement

```bash
#!/bin/bash
# deploy.sh

echo "🔍 Vérification de l'architecture multitenant..."

# Exécuter la vérification
node supabase/scripts/verify_multitenant_architecture.js --json > /tmp/verify_report.json

# Lire le statut
status=$(cat /tmp/verify_report.json | jq -r '.status')

if [ "$status" != "OK" ]; then
    echo "❌ Erreur : Architecture multitenant invalide"
    echo "Rapport complet :"
    cat /tmp/verify_report.json | jq '.'
    exit 1
fi

echo "✅ Architecture multitenant valide"
echo "🚀 Déploiement en cours..."

# Continuer le déploiement
supabase db push
```

### Cas 3 : Monitoring Régulier (Cron)

```bash
# /etc/cron.d/verify-multitenant
# Vérifier l'architecture tous les jours à 2h du matin

0 2 * * * /home/user/verify_and_alert.sh
```

**verify_and_alert.sh**:

```bash
#!/bin/bash

REPORT_FILE="/var/log/supabase/verify_$(date +%Y%m%d).json"
ALERT_EMAIL="admin@goprod.com"

# Exécuter la vérification
node /app/supabase/scripts/verify_multitenant_architecture.js --json > "$REPORT_FILE"

# Vérifier le statut
status=$(cat "$REPORT_FILE" | jq -r '.status')

if [ "$status" != "OK" ]; then
    # Envoyer une alerte
    echo "Architecture multitenant invalide. Voir rapport : $REPORT_FILE" | \
        mail -s "⚠️ ALERTE : Problème Architecture Multitenant" "$ALERT_EMAIL"
fi
```

### Cas 4 : Vérification Après Migration

```bash
#!/bin/bash
# post-migration-check.sh

echo "📋 Application de la migration..."
supabase migration up

echo "🔍 Vérification de l'architecture..."

# Vérification SQL détaillée
supabase db execute -f supabase/scripts/verify_multitenant_architecture.sql

# Vérification programmatique
node supabase/scripts/verify_multitenant_architecture.js

if [ $? -ne 0 ]; then
    echo "❌ Problème détecté après migration"
    echo "🔄 Rollback..."
    supabase migration down
    exit 1
fi

echo "✅ Migration appliquée avec succès"
```

### Cas 5 : Audit RGPD / Sécurité

```bash
#!/bin/bash
# audit-security.sh

echo "🔒 AUDIT DE SÉCURITÉ - ARCHITECTURE MULTITENANT"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Générer le rapport
REPORT_FILE="security_audit_$(date +%Y%m%d_%H%M%S).json"
node supabase/scripts/verify_multitenant_architecture.js --json > "$REPORT_FILE"

# Extraire les métriques de sécurité
echo "📊 Métriques de Sécurité :"
echo ""
echo "  • Tables sans RLS : $(cat $REPORT_FILE | jq '.summary.tablesWithoutRLS')"
echo "  • Tables sans company_id : $(cat $REPORT_FILE | jq '.summary.tablesWithoutCompanyId')"
echo "  • Violations d'intégrité : $(cat $REPORT_FILE | jq '.summary.integrityViolations')"
echo ""

# Générer un rapport PDF (exemple avec pandoc)
echo "📄 Génération du rapport PDF..."
cat $REPORT_FILE | jq '.' | pandoc -o "audit_$(date +%Y%m%d).pdf"

echo "✅ Audit terminé : $REPORT_FILE"
```

---

## 🎯 Scénarios de Correction

### Scénario 1 : Table sans company_id

**Problème détecté** :
```
⚠️ offer_extras → MANQUE company_id !
```

**Solution** :

```sql
-- 1. Ajouter la colonne
ALTER TABLE offer_extras 
ADD COLUMN company_id UUID REFERENCES companies(id) ON DELETE CASCADE;

-- 2. Remplir avec les données existantes (via la relation avec offers)
UPDATE offer_extras oe
SET company_id = o.company_id
FROM offers o
WHERE oe.offer_id = o.id;

-- 3. Rendre la colonne NOT NULL
ALTER TABLE offer_extras 
ALTER COLUMN company_id SET NOT NULL;

-- 4. Ajouter un index
CREATE INDEX idx_offer_extras_company ON offer_extras(company_id);

-- 5. Activer RLS
ALTER TABLE offer_extras ENABLE ROW LEVEL SECURITY;

-- 6. Créer les policies
CREATE POLICY "Users can view offer extras of their company"
ON offer_extras FOR SELECT
USING (company_id = auth_company_id());

-- ... (autres policies)

-- 7. Vérifier
SELECT * FROM offer_extras WHERE company_id IS NULL; -- Doit retourner 0 lignes
```

### Scénario 2 : Violation d'Intégrité Référentielle

**Problème détecté** :
```
❌ 3 offres avec event_id de tenant différent!
```

**Analyse** :

```sql
-- Identifier les offres problématiques
SELECT 
    o.id,
    o.name,
    o.company_id as offer_company,
    e.company_id as event_company,
    c1.name as offer_tenant,
    c2.name as event_tenant
FROM offers o
JOIN events e ON o.event_id = e.id
LEFT JOIN companies c1 ON o.company_id = c1.id
LEFT JOIN companies c2 ON e.company_id = c2.id
WHERE o.company_id != e.company_id;
```

**Solutions possibles** :

```sql
-- Option 1 : Corriger le company_id de l'offre
UPDATE offers o
SET company_id = e.company_id
FROM events e
WHERE o.event_id = e.id
  AND o.company_id != e.company_id;

-- Option 2 : Supprimer les offres incohérentes (si corruption de données)
DELETE FROM offers
WHERE id IN (
  SELECT o.id FROM offers o
  JOIN events e ON o.event_id = e.id
  WHERE o.company_id != e.company_id
);

-- Option 3 : Créer une contrainte pour éviter cela à l'avenir
ALTER TABLE offers
ADD CONSTRAINT check_offer_event_same_tenant
CHECK (
  company_id = (SELECT company_id FROM events WHERE id = event_id)
);
```

### Scénario 3 : RLS Manquant

**Problème détecté** :
```
⚠️ staff_exports → RLS DÉSACTIVÉ
```

**Solution** :

```sql
-- Activer RLS
ALTER TABLE staff_exports ENABLE ROW LEVEL SECURITY;

-- Créer les policies standards
CREATE POLICY "Users can view exports of their company"
ON staff_exports FOR SELECT
USING (company_id = auth_company_id());

CREATE POLICY "Users can insert exports for their company"
ON staff_exports FOR INSERT
WITH CHECK (company_id = auth_company_id());

CREATE POLICY "Users can update exports of their company"
ON staff_exports FOR UPDATE
USING (company_id = auth_company_id())
WITH CHECK (company_id = auth_company_id());

CREATE POLICY "Users can delete exports of their company"
ON staff_exports FOR DELETE
USING (company_id = auth_company_id());

-- Vérifier
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'staff_exports';
```

---

## 📈 Métriques et KPIs

### Métriques à Suivre

1. **Couverture Multitenant** : `tablesWithCompanyId / totalTables`
2. **Couverture RLS** : `100% des tables avec company_id doivent avoir RLS`
3. **Intégrité Référentielle** : `0 violation`
4. **Tables "Pots Communs"** : Identifier et documenter

### Tableau de Bord

```bash
# Générer un tableau de bord quotidien
node supabase/scripts/verify_multitenant_architecture.js --json | jq '{
  date: .timestamp,
  score: (if .status == "OK" then 100 else 0 end),
  metrics: {
    multitenant_coverage: (.summary.tablesWithCompanyId / .summary.totalTables * 100 | round),
    rls_coverage: (if .summary.tablesWithoutRLS == 0 then 100 else 0 end),
    integrity_violations: .summary.integrityViolations
  }
}'
```

---

## 🎓 Bonnes Pratiques

1. **Vérifier AVANT chaque déploiement**
2. **Intégrer dans le CI/CD**
3. **Monitorer régulièrement** (cron quotidien)
4. **Documenter les "pots communs"**
5. **Former l'équipe** sur l'architecture multitenant
6. **Créer des templates** de migration qui incluent automatiquement company_id et RLS

---

**Maintenu par** : Équipe Dev Go-Prod AURA













