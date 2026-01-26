# Fonctionnalité : Association Bidirectionnelle Contacts ↔ Entreprises

## Vue d'ensemble

Cette fonctionnalité permet d'associer des contacts à des entreprises et vice versa de manière bidirectionnelle. Les associations peuvent être gérées depuis les modaux d'ajout/modification de contacts ou d'entreprises.

## Schéma de la base de données

La table `crm_contact_company_links` gère les relations N-N entre contacts et entreprises :

```sql
CREATE TABLE crm_contact_company_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact_id UUID NOT NULL REFERENCES crm_contacts(id) ON DELETE CASCADE,
  company_crm_id UUID NOT NULL REFERENCES crm_companies(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

## Composants créés

### 1. `CompanySelector.tsx`
Composant de sélection multiple d'entreprises avec :
- Dropdown avec checkboxes
- Affichage des entreprises sélectionnées sous forme de tags
- Suppression individuelle des sélections
- Fermeture automatique au clic extérieur

**Props :**
- `companyId` : ID du tenant (company_id)
- `selectedCompanyIds` : IDs des entreprises sélectionnées
- `onChange` : Callback appelé lors de la modification

### 2. `ContactSelector.tsx`
Composant de sélection multiple de contacts avec :
- Dropdown avec checkboxes
- Affichage des contacts sélectionnés sous forme de tags
- Affichage de l'email en supplément pour faciliter l'identification
- Suppression individuelle des sélections
- Fermeture automatique au clic extérieur

**Props :**
- `companyId` : ID du tenant (company_id)
- `selectedContactIds` : IDs des contacts sélectionnés
- `onChange` : Callback appelé lors de la modification

## API créée

### `crmContactCompanyLinksApi.ts`

Quatre fonctions principales :

1. **`fetchContactCompanyIds(contactId)`**
   - Récupère la liste des IDs d'entreprises associées à un contact

2. **`fetchCompanyContactIds(companyCrmId)`**
   - Récupère la liste des IDs de contacts associés à une entreprise

3. **`linkContactToCompanies(contactId, companyId, companyCrmIds)`**
   - Associe un contact à plusieurs entreprises
   - Supprime les anciennes associations et crée les nouvelles
   - `companyId` : ID du tenant
   - `companyCrmIds` : Liste des IDs d'entreprises à associer

4. **`linkCompanyToContacts(companyCrmId, companyId, contactIds)`**
   - Associe une entreprise à plusieurs contacts
   - Supprime les anciennes associations et crée les nouvelles
   - `companyId` : ID du tenant
   - `contactIds` : Liste des IDs de contacts à associer

## Modifications des pages

### `personnes.tsx` (Contacts)

**État ajouté :**
```typescript
const [selectedCompanyIds, setSelectedCompanyIds] = useState<string[]>([]);
```

**Fonctions modifiées :**
- `handleAdd` : Réinitialise `selectedCompanyIds` à `[]`
- `handleEdit` : Charge les entreprises associées via `fetchContactCompanyIds`
- `handleSave` : Sauvegarde les liens via `linkContactToCompanies` après création/modification

**UI :**
- Modal passé en **4 colonnes** (avant: 2-3 colonnes)
- Ajout du `CompanySelector` dans le formulaire
- Réduction de la taille des champs (text-sm) pour compacité
- Réduction du nombre de lignes du textarea (rows={2})

### `entreprises.tsx` (Entreprises)

**État ajouté :**
```typescript
const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
```

**Fonctions modifiées :**
- `handleAdd` : Réinitialise `selectedContactIds` à `[]`
- `handleEdit` : Charge les contacts associés via `fetchCompanyContactIds`
- `handleSave` : Sauvegarde les liens via `linkCompanyToContacts` après création/modification

**UI :**
- Modal passé en **4 colonnes** (avant: 3 colonnes)
- Ajout du `ContactSelector` dans le formulaire
- Réorganisation des champs pour optimiser l'espace
- Réduction de la taille des champs (text-sm) pour compacité

## Flux d'utilisation

### Scénario 1 : Associer des entreprises à un contact

1. Aller sur `/app/contacts/personnes`
2. Cliquer sur "Ajouter" ou "Modifier" un contact
3. Remplir les informations du contact
4. Dans la section "Entreprises associées", cliquer sur le dropdown
5. Cocher les entreprises souhaitées
6. Cliquer sur "Créer" ou "Mettre à jour"
7. Les associations sont sauvegardées automatiquement

### Scénario 2 : Associer des contacts à une entreprise

1. Aller sur `/app/contacts/entreprises`
2. Cliquer sur "Ajouter" ou "Modifier" une entreprise
3. Remplir les informations de l'entreprise
4. Dans la section "Contacts associés", cliquer sur le dropdown
5. Cocher les contacts souhaités
6. Cliquer sur "Créer" ou "Mettre à jour"
7. Les associations sont sauvegardées automatiquement

## Comportement des associations

### Remplacement complet
Lors de la sauvegarde, **toutes les anciennes associations sont supprimées** et remplacées par les nouvelles sélections. Cela garantit la cohérence des données.

### Suppression en cascade
Si un contact ou une entreprise est supprimé, toutes les associations dans `crm_contact_company_links` sont automatiquement supprimées grâce aux contraintes `ON DELETE CASCADE`.

### Multi-tenant
Toutes les opérations sont isolées par `company_id` (tenant), garantissant que chaque organisation voit uniquement ses propres contacts et entreprises.

## Améliorations UX

### Modal contacts (4 colonnes)
**Ligne 1 :**
- Prénom * | Nom * | Email | Mobile

**Ligne 2 :**
- WhatsApp | Département | Séniorité | Statut

**Ligne 3 :**
- LinkedIn (pleine largeur)

**Ligne 4 :**
- Notes internes (textarea, 2 lignes)

**Ligne 5 :**
- Upload photo

**Ligne 6 :**
- Sélection entreprises

**Ligne 7 :**
- Sélection artistes

**Ligne 8 :**
- Checkboxes (Contact de nuit, Contact facturation)

### Modal entreprises (4 colonnes)
**Ligne 1 :**
- Nom * | Marque | Type | Email

**Ligne 2 :**
- Téléphone | Site web | Adresse | Ville

**Ligne 3 :**
- Pays | TVA

**Ligne 4 :**
- Notes d'accès (textarea, 2 lignes)

**Ligne 5 :**
- Sélection contacts

**Ligne 6 :**
- Checkboxes (Fournisseur, Client)

## Exemples d'utilisation

### Associer un contact à plusieurs entreprises
```typescript
await linkContactToCompanies(
  'contact-uuid',
  'tenant-uuid',
  ['company-1-uuid', 'company-2-uuid', 'company-3-uuid']
);
```

### Associer une entreprise à plusieurs contacts
```typescript
await linkCompanyToContacts(
  'company-uuid',
  'tenant-uuid',
  ['contact-1-uuid', 'contact-2-uuid']
);
```

### Récupérer les entreprises d'un contact
```typescript
const companyIds = await fetchContactCompanyIds('contact-uuid');
// ['company-1-uuid', 'company-2-uuid']
```

## Tests suggérés

1. ✅ Créer un contact et l'associer à 3 entreprises
2. ✅ Modifier le contact pour ne garder que 2 entreprises
3. ✅ Créer une entreprise et l'associer à 5 contacts
4. ✅ Modifier l'entreprise pour ajouter 2 contacts supplémentaires
5. ✅ Supprimer un contact et vérifier que les liens sont supprimés
6. ✅ Supprimer une entreprise et vérifier que les liens sont supprimés
7. ✅ Vérifier l'isolation multi-tenant

## Notes techniques

- Les sélecteurs utilisent des dropdowns personnalisés (pas de `<select>` natif) pour permettre la multi-sélection avec checkboxes
- Les tags affichent des icônes différentes (`Building2` pour entreprises, `User` pour contacts)
- Les sélecteurs se ferment automatiquement au clic extérieur grâce à `useRef` et `useEffect`
- Les associations sont rechargées à chaque ouverture du modal d'édition
- Les formulaires utilisent `text-sm` pour réduire la taille des polices et optimiser l'espace

## Fichiers modifiés/créés

**Nouveaux fichiers :**
- `src/components/crm/CompanySelector.tsx`
- `src/components/crm/ContactSelector.tsx`
- `src/api/crmContactCompanyLinksApi.ts`
- `docs/FEATURE_CRM_COMPANY_CONTACT_LINKS.md`

**Fichiers modifiés :**
- `src/pages/app/contacts/personnes.tsx`
- `src/pages/app/contacts/entreprises.tsx`

## Prochaines étapes possibles

1. Ajouter un affichage visuel des entreprises liées dans la liste des contacts
2. Ajouter un affichage visuel des contacts liés dans la liste des entreprises
3. Ajouter des statistiques sur les associations (ex: nombre de contacts par entreprise)
4. Permettre la gestion des associations directement depuis les vues détaillées
5. Ajouter des filtres par entreprise dans la liste des contacts et vice versa











