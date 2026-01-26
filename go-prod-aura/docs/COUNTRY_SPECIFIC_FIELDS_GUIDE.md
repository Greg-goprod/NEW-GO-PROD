# 🌍 Guide : Champs Spécifiques par Pays - CRM AURA

## 📋 Vue d'ensemble

**Implémentation complète** d'un système dynamique permettant d'adapter les champs de facturation et finance selon le pays de l'entreprise.

### ✨ Fonctionnalités

- **Interface adaptative** : Les champs changent automatiquement selon le pays sélectionné
- **8 pays configurés** : Suisse, France, Royaume-Uni, États-Unis, Allemagne, Belgique, Espagne, Italie
- **Validation intelligente** : Regex et champs requis selon réglementations nationales
- **Stockage flexible** : Données en JSONB pour évolution future
- **Configuration centralisée** : Table dédiée pour gérer les configurations

---

## 🏗️ Architecture

### 1. **Base de données**

#### Table `country_business_fields`
Configuration des champs par pays :
- `country_code` : Code ISO (CH, FR, GB, US, etc.)
- `field_key` : Clé unique du champ (uid, siret, ein, etc.)
- `field_label` : Label affiché à l'utilisateur
- `field_type` : Type de champ (text, select, number)
- `is_required` : Si le champ est obligatoire
- `validation_regex` : Expression régulière pour validation
- `placeholder` : Exemple de format
- `help_text` : Aide contextuelle
- `select_options` : Options pour les selects (JSONB)

#### Colonne `crm_companies.country_specific_data`
Données JSONB stockant les valeurs spécifiques par pays :
```json
{
  "uid": "CHE-123.456.789",
  "canton": "VD",
  "rc_number": "123456"
}
```

### 2. **Frontend**

#### Composants
- `CountrySpecificFields.tsx` : Composant React dynamique
- `countryFieldsApi.ts` : API pour récupérer les configurations
- `countryFields.ts` : Types TypeScript

#### Mapping pays
```typescript
const COUNTRY_TO_ISO = {
  'Suisse': 'CH',
  'France': 'FR',
  'Royaume-Uni': 'GB',
  'États-Unis': 'US',
  // ...
};
```

---

## 📊 Champs par Pays

### 🇨🇭 **SUISSE**
| Champ | Label | Format | Requis |
|-------|-------|--------|--------|
| `uid` | N° UID | CHE-123.456.789 | ✅ |
| `canton` | Canton | VD, GE, etc. (select) | ❌ |
| `rc_number` | N° Registre du Commerce | 123456 | ❌ |
| `bc_number` | BC Number | 09000 (5 chiffres) | ❌ |

### 🇫🇷 **FRANCE**
| Champ | Label | Format | Requis |
|-------|-------|--------|--------|
| `siret` | N° SIRET | 12345678901234 (14 chiffres) | ✅ |
| `siren` | N° SIREN | 123456789 (9 chiffres) | ✅ |
| `code_ape` | Code APE/NAF | 9001Z | ❌ |
| `rcs` | RCS | Paris | ❌ |
| `capital_social` | Capital social (€) | 10000 | ❌ |
| `forme_juridique` | Forme juridique | SAS, SARL, SA (select) | ❌ |

### 🇬🇧 **ROYAUME-UNI**
| Champ | Label | Format | Requis |
|-------|-------|--------|--------|
| `company_number` | Company Registration Number | 12345678 (8 chiffres) | ✅ |
| `vat_number` | VAT Number | GB123456789 | ❌ |
| `sort_code` | Sort Code | 12-34-56 | ❌ |
| `registered_office` | Registered Office | London | ❌ |
| `entity_type` | Entity Type | Ltd, PLC (select) | ❌ |

### 🇺🇸 **ÉTATS-UNIS**
| Champ | Label | Format | Requis |
|-------|-------|--------|--------|
| `ein` | EIN (Tax ID) | 12-3456789 | ✅ |
| `state_of_incorporation` | State of Incorporation | Delaware (select) | ❌ |
| `routing_number` | Routing Number | 021000021 (9 chiffres) | ❌ |
| `account_number` | Account Number | 123456789 | ❌ |
| `entity_type` | Entity Type | LLC, Corp (select) | ❌ |

### 🇩🇪 **ALLEMAGNE**
| Champ | Label | Format | Requis |
|-------|-------|--------|--------|
| `handelsregister` | Handelsregisternummer | HRB 12345 | ✅ |
| `ust_idnr` | USt-IdNr | DE123456789 | ❌ |
| `steuernummer` | Steuernummer | 12345678901 (11 chiffres) | ❌ |
| `entity_type` | Rechtsform | GmbH, AG (select) | ❌ |

### 🇧🇪 **BELGIQUE**
| Champ | Label | Format | Requis |
|-------|-------|--------|--------|
| `enterprise_number` | N° d'entreprise | 0123.456.789 | ✅ |
| `entity_type` | Forme juridique | SA/NV, SPRL (select) | ❌ |

### 🇪🇸 **ESPAGNE**
| Champ | Label | Format | Requis |
|-------|-------|--------|--------|
| `cif` | CIF/NIF | A12345678 | ✅ |
| `entity_type` | Forma jurídica | SL, SA (select) | ❌ |

### 🇮🇹 **ITALIE**
| Champ | Label | Format | Requis |
|-------|-------|--------|--------|
| `partita_iva` | Partita IVA | 12345678901 (11 chiffres) | ✅ |
| `codice_fiscale` | Codice Fiscale | RSSMRA85M01H501Z | ❌ |
| `entity_type` | Forma giuridica | SRL, SPA (select) | ❌ |

---

## 🚀 Utilisation

### Dans l'interface CRM

1. **Créer/Modifier une entreprise**
2. **Section "Informations générales"** : Sélectionner le **Pays**
3. **Section "Facturation & Finance"** : Les champs spécifiques apparaissent automatiquement
4. Remplir les champs requis (marqués *)
5. Sauvegarder

### Exemple concret

**Entreprise suisse** :
```
Pays : Suisse
→ Affiche : N° UID *, Canton, N° RC, BC Number
```

**Entreprise française** :
```
Pays : France  
→ Affiche : N° SIRET *, N° SIREN *, Code APE, RCS, Capital social, Forme juridique
```

**Changement de pays** :
```
Pays : Suisse → France
→ Les champs suisses disparaissent
→ Les champs français apparaissent
→ Les données précédentes sont conservées en base
```

---

## 🔧 Installation

### 1. Appliquer la migration

Sur **Supabase Cloud** :
1. Aller dans **SQL Editor**
2. Copier le contenu de `supabase/migrations/20251109_200000_country_specific_fields.sql`
3. Exécuter le script
4. Vérifier la création de la table `country_business_fields`

### 2. Vérifier les données seeded

```sql
SELECT country_code, COUNT(*) as nb_fields 
FROM country_business_fields 
GROUP BY country_code 
ORDER BY country_code;
```

Résultat attendu :
```
CH  | 4 champs
FR  | 6 champs
GB  | 5 champs
US  | 5 champs
DE  | 4 champs
BE  | 2 champs
ES  | 2 champs
IT  | 3 champs
```

---

## 🧪 Tests

### Checklist de test

- [ ] Sélectionner "Suisse" → Vérifier que champs UID, Canton, RC, BC apparaissent
- [ ] Sélectionner "France" → Vérifier que SIRET, SIREN, etc. apparaissent
- [ ] Changer de "Suisse" à "France" → Les champs s'adaptent
- [ ] Remplir champ requis avec mauvais format → Validation affiche erreur
- [ ] Créer entreprise avec données pays → Sauvegarder OK
- [ ] Éditer entreprise → Données spécifiques pays chargées correctement
- [ ] Tester mode clair et mode sombre → Contraste OK

---

## ➕ Ajouter un nouveau pays

### Étape 1 : Migration SQL

```sql
-- 🇳🇱 PAYS-BAS (exemple)
INSERT INTO public.country_business_fields (country_code, field_key, field_label, field_type, is_required, validation_regex, placeholder, help_text, sort_order) VALUES
('NL', 'kvk_number', 'KVK-nummer', 'text', true, '^\d{8}$', '12345678', 'Numéro de la Chambre de Commerce (8 chiffres)', 10),
('NL', 'btw_number', 'BTW-nummer', 'text', false, '^NL\d{9}B\d{2}$', 'NL123456789B01', 'Numéro de TVA néerlandais', 20);
```

### Étape 2 : Ajouter au mapping frontend

```typescript
// src/pages/app/contacts/entreprises.tsx
const COUNTRIES = [
  // ...
  { value: 'Pays-Bas', label: 'Pays-Bas' },
];

const COUNTRY_TO_ISO = {
  // ...
  'Pays-Bas': 'NL',
};
```

### Étape 3 : Tester

Redémarrer l'app et tester avec le nouveau pays !

---

## 📈 Améliorations futures possibles

### Phase 2 : Auto-complétion
- Intégration API SIREN (France)
- Intégration Companies House API (UK)
- Intégration UID Register (Suisse)

### Phase 3 : Validation avancée
- Vérification de validité du n° d'entreprise en temps réel
- Suggestions auto

### Phase 4 : Templates facturation
- Génération PDF conforme par pays
- Mentions légales automatiques

### Phase 5 : Multi-devises
- Conversion automatique selon pays
- Taux de change historiques

---

## 🛟 Support

### Problèmes courants

**Les champs ne s'affichent pas**
→ Vérifier que la migration est bien appliquée
→ Vérifier la console navigateur pour erreurs API

**Les données ne sont pas sauvegardées**
→ Vérifier que `country_specific_data` est bien dans le payload
→ Vérifier les RLS policies Supabase

**Validation ne fonctionne pas**
→ Vérifier les regex dans `country_business_fields`
→ Activer `showValidation={true}` sur le composant

---

## 📚 Références

- [Migration SQL complète](../supabase/migrations/20251109_200000_country_specific_fields.sql)
- [Composant CountrySpecificFields](../src/components/crm/CountrySpecificFields.tsx)
- [API countryFieldsApi](../src/api/countryFieldsApi.ts)
- [Types TypeScript](../src/types/countryFields.ts)

---

**Implémenté le 2025-11-09**  
**Version: 1.0.0**  
**Status: ✅ Prêt pour production**







