# Feature: Sélection Multiple de Rôles pour les Contacts

**Date**: 2025-11-07  
**Version**: 1.0

## Vue d'ensemble

Cette fonctionnalité permet d'associer un ou plusieurs rôles à chaque contact CRM dans Go-Prod AURA. Les rôles peuvent être sélectionnés via un dropdown avec des checkboxes, et de nouveaux rôles peuvent être créés directement depuis le sélecteur.

## Problèmes Résolus

### 1. Erreur `company_crm_id` inexistante

**Problème**: Lors de la modification d'un contact, l'application générait une erreur indiquant que la colonne `company_crm_id` n'existait pas dans la table `crm_contact_company_links`.

**Cause**: Le nom de la colonne dans la migration SQL était `linked_company_id`, mais l'API utilisait `company_crm_id`.

**Solution**: Correction de tous les fichiers API pour utiliser `linked_company_id` :
- `src/api/crmContactCompanyLinksApi.ts` : Mise à jour des fonctions `fetchContactCompanyIds`, `fetchCompanyContactIds`, `linkContactToCompanies`, et `linkCompanyToContacts`.

### 2. Ajout de la Sélection Multiple de Rôles

**Fonctionnalités implémentées**:
- Sélection multiple de rôles via un dropdown avec checkboxes
- Affichage des rôles sélectionnés sous forme de tags
- Possibilité d'ajouter un nouveau rôle directement depuis le dropdown
- Sauvegarde automatique des associations contact-rôle

## Structure de la Base de Données

### Nouvelle Table: `crm_contact_role_links`

```sql
create table if not exists public.crm_contact_role_links (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  contact_id uuid not null references public.crm_contacts(id),
  role_id uuid not null references public.contact_roles(id),
  created_at timestamptz not null default timezone('utc', now()),
  unique (company_id, contact_id, role_id)
);
```

**Caractéristiques**:
- Table de liaison N-N entre contacts et rôles
- Multi-tenant (via `company_id`)
- Contrainte unique pour éviter les doublons
- RLS activé pour la sécurité

## Fichiers Créés

### 1. Migration SQL
**Fichier**: `supabase/migrations/20251107_100000_contact_role_links.sql`
- Création de la table `crm_contact_role_links`
- Index pour optimiser les recherches
- Trigger pour vérifier la cohérence du tenant
- Politiques RLS pour la sécurité

### 2. API
**Fichier**: `src/api/crmContactRoleLinksApi.ts`
- `fetchContactRoleIds(contactId)` : Récupère les IDs des rôles d'un contact
- `linkContactToRoles(contactId, companyId, roleIds)` : Associe des rôles à un contact

### 3. Composant UI
**Fichier**: `src/components/crm/RoleSelector.tsx`
- Dropdown avec multi-sélection via checkboxes
- Champ pour ajouter un nouveau rôle
- Affichage des rôles sélectionnés sous forme de tags
- Fermeture automatique au clic extérieur

## Fichiers Modifiés

### 1. `src/api/crmContactCompanyLinksApi.ts`
**Corrections**:
- Remplacement de `company_crm_id` par `linked_company_id` dans toutes les fonctions

### 2. `src/pages/app/contacts/personnes.tsx`
**Ajouts**:
- Import du `RoleSelector` et de l'API des rôles
- État `selectedRoleIds` pour stocker les rôles sélectionnés
- Chargement des rôles lors de l'édition d'un contact
- Sauvegarde des associations de rôles lors de la sauvegarde du contact
- Intégration du composant `RoleSelector` dans le modal

## Utilisation

### Dans le Modal Contact

1. **Sélectionner des rôles existants** :
   - Cliquer sur le dropdown "Rôles"
   - Cocher/décocher les rôles souhaités
   - Les rôles sélectionnés s'affichent sous forme de tags

2. **Ajouter un nouveau rôle** :
   - Ouvrir le dropdown "Rôles"
   - Cliquer sur "Ajouter un rôle"
   - Saisir le nom du nouveau rôle
   - Valider avec "OK" ou appuyer sur Entrée
   - Le nouveau rôle est automatiquement sélectionné

3. **Retirer un rôle sélectionné** :
   - Cliquer sur le "X" du tag du rôle

## Sécurité

- **Multi-tenant** : Chaque association est liée à un `company_id` (tenant)
- **RLS activé** : Seuls les utilisateurs du même tenant peuvent voir/modifier les associations
- **Vérification de cohérence** : Un trigger vérifie que le contact et le rôle appartiennent au même tenant

## Migration

La migration a été appliquée avec succès sur Supabase :
- ✅ Table `crm_contact_role_links` créée
- ✅ Index créés
- ✅ Trigger de validation du tenant créé
- ✅ Politiques RLS configurées

## Tests Recommandés

1. **Création d'un contact avec des rôles** :
   - Créer un nouveau contact
   - Sélectionner plusieurs rôles
   - Vérifier que les rôles sont sauvegardés
   - Rouvrir le modal d'édition pour vérifier que les rôles sont bien chargés

2. **Ajout d'un nouveau rôle** :
   - Ouvrir le modal d'ajout/édition de contact
   - Ajouter un nouveau rôle depuis le dropdown
   - Vérifier que le rôle apparaît dans la liste et est sélectionné
   - Vérifier que le rôle est disponible dans `/app/settings/contacts`

3. **Édition des rôles d'un contact** :
   - Modifier un contact existant
   - Changer ses rôles (ajouter/retirer)
   - Vérifier que les changements sont sauvegardés

4. **Affichage des rôles** :
   - Vérifier que les tags des rôles s'affichent correctement
   - Vérifier que les rôles peuvent être retirés via le "X"

## Notes Techniques

- Le composant `RoleSelector` suit le même pattern que `ArtistSelector` et `CompanySelector` pour une cohérence de l'interface
- La fermeture automatique du dropdown est gérée via un `useEffect` qui écoute les clics extérieurs
- Les rôles sont chargés dynamiquement via le hook `useActiveCRMLookups('contact_roles')`
- L'ajout d'un rôle utilise la fonction `create` du hook pour appeler le RPC `upsert_crm_option`

## Prochaines Étapes Possibles

- Afficher les rôles dans la vue liste/grille des contacts
- Ajouter un filtre par rôle dans la page des contacts
- Permettre l'édition en masse des rôles pour plusieurs contacts
- Ajouter des statistiques sur la répartition des rôles










