# 📸 Améliorations de la gestion des contacts

## 🎯 Fonctionnalités implémentées

### **1️⃣ Upload de photos pour les contacts**
### **2️⃣ Pastilles photos dans la vue liste**
### **3️⃣ Association de contacts aux artistes**

---

## 📸 1. Upload de photos

### **Composant : `PhotoUploader.tsx`**

Permet d'uploader une photo lors de l'ajout ou de la modification d'un contact.

#### **Fonctionnalités :**
- ✅ **Upload vers Supabase Storage** (bucket `contact-photos`)
- ✅ **Aperçu instantané** de la photo
- ✅ **Validation** : images uniquement, max 5MB
- ✅ **Nommage automatique** : `[contact_id]-[timestamp].ext` ou `temp-[timestamp].ext`
- ✅ **Suppression** de la photo
- ✅ **Remplacement** d'une photo existante
- ✅ **Génération d'URL publique** automatique

#### **Interface :**
```typescript
interface PhotoUploaderProps {
  currentPhotoUrl?: string;
  onPhotoChange: (url: string | null) => void;
  contactId?: string; // Pour nommer le fichier de manière unique
}
```

#### **Utilisation dans le formulaire :**
```tsx
<PhotoUploader
  currentPhotoUrl={formData.photo_url}
  onPhotoChange={(url) => setFormData({ ...formData, photo_url: url || undefined })}
  contactId={editingContact?.id}
/>
```

#### **Design :**
- **Aperçu circulaire** de 80x80px
- **Bouton violet** avec icône Upload
- **Bouton X** pour supprimer (en hover sur l'aperçu)
- **Message d'aide** : "JPG, PNG ou GIF • Max 5MB"
- **État de chargement** : "Upload en cours..."

---

## 👤 2. Pastilles photos dans la vue liste

### **Affichage dans le tableau**

Nouvelle colonne **"Photo"** ajoutée au début du tableau.

#### **Fonctionnalités :**
- ✅ **Affiche la vraie photo** si disponible (ronde, 40x40px)
- ✅ **Affiche les initiales** si pas de photo (gradient violet/purple)
- ✅ **Bordure violette** pour cohérence visuelle
- ✅ **Même style** que la vue grille

#### **Design :**

**Avec photo :**
```tsx
<img
  src={contact.photo_url}
  alt={`${contact.first_name} ${contact.last_name}`}
  className="w-10 h-10 rounded-full object-cover border border-violet-500"
/>
```

**Sans photo (initiales) :**
```tsx
<div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-medium text-sm border border-violet-500">
  {getInitials(contact.first_name, contact.last_name)}
</div>
```

---

## 🎵 3. Association de contacts aux artistes

### **Composants et API**

#### **A. API : `artistsApi.ts`**

Nouvelles fonctions pour gérer les artistes et leurs liens avec les contacts.

```typescript
// Récupérer tous les artistes du tenant
export async function fetchArtists(companyId: string): Promise<Artist[]>

// Récupérer les artistes d'un contact
export async function fetchContactArtists(contactId: string): Promise<Artist[]>

// Associer/dissocier des artistes à un contact
export async function linkContactToArtists(
  contactId: string,
  companyId: string,
  artistIds: string[]
): Promise<void>
```

#### **B. Composant : `ArtistSelector.tsx`**

Sélecteur d'artistes avec dropdown et checkboxes multi-sélection.

**Fonctionnalités :**
- ✅ **Dropdown avec checkboxes** pour sélection multiple
- ✅ **Affichage des artistes sélectionnés** en tags
- ✅ **Fermeture au clic extérieur**
- ✅ **Filtré par tenant** (company_id)
- ✅ **Association optionnelle**
- ✅ **Suppression individuelle** des tags (bouton X)
- ✅ **Icône Music** pour identification visuelle

**Interface :**
```typescript
interface ArtistSelectorProps {
  companyId: string;
  selectedArtistIds: string[];
  onChange: (artistIds: string[]) => void;
}
```

**Utilisation dans le formulaire :**
```tsx
{companyId && (
  <ArtistSelector
    companyId={companyId}
    selectedArtistIds={selectedArtistIds}
    onChange={setSelectedArtistIds}
  />
)}
```

#### **C. Table de liaison : `crm_artist_contact_links`**

Relation many-to-many entre contacts et artistes.

**Colonnes :**
- `id` (uuid, pk)
- `contact_id` (uuid, fk → crm_contacts)
- `artist_id` (uuid, fk → artists)
- `company_id` (uuid, fk → companies)
- `created_at` (timestamptz)

**Fonctionnement :**
1. Lors de la sauvegarde d'un contact
2. Suppression des anciennes associations
3. Création des nouvelles associations

---

## 🔄 Workflow complet

### **Ajout d'un nouveau contact :**

1. Cliquer sur **"Ajouter un contact"**
2. Remplir les champs (prénom, nom, email, etc.)
3. **📸 Uploader une photo** (optionnel)
4. **🎵 Sélectionner des artistes** (optionnel)
5. Sauvegarder

**Résultat :**
- Contact créé dans `crm_contacts`
- Photo uploadée dans `contact-photos`
- URL de la photo sauvegardée dans `crm_contacts.photo_url`
- Associations créées dans `crm_artist_contact_links`

### **Édition d'un contact existant :**

1. Cliquer sur **Modifier** (icône crayon)
2. Le formulaire se pré-remplit :
   - Toutes les données du contact
   - Photo existante (aperçu)
   - Artistes déjà associés (tags)
3. Modifier les données
4. **Changer/Ajouter une photo** (optionnel)
5. **Modifier les artistes** (optionnel)
6. Sauvegarder

**Résultat :**
- Contact mis à jour
- Nouvelle photo uploadée si changée
- Anciennes associations supprimées
- Nouvelles associations créées

---

## 📁 Fichiers créés/modifiés

### **Nouveaux fichiers :**

1. **`src/components/crm/PhotoUploader.tsx`**
   - Composant d'upload de photo
   - Gestion du storage Supabase
   - Preview et validation

2. **`src/components/crm/ArtistSelector.tsx`**
   - Sélecteur d'artistes avec checkboxes
   - Dropdown multi-sélection
   - Tags des artistes sélectionnés

3. **`src/api/artistsApi.ts`**
   - API pour récupérer les artistes
   - API pour gérer les liens contact-artiste

### **Fichiers modifiés :**

4. **`src/pages/app/contacts/personnes.tsx`**
   - Intégration du `PhotoUploader`
   - Intégration de l'`ArtistSelector`
   - Ajout de la colonne Photo dans le tableau
   - Gestion de la sauvegarde des artistes
   - État `selectedArtistIds`

---

## 🎨 Design et UX

### **Cohérence visuelle :**
- **Couleur violette** : thème principal de l'app
- **Pastilles rondes** : uniformes entre vue liste et vue grille
- **Initiales** : fallback élégant pour photos manquantes
- **Gradient violet/purple** : visuel moderne

### **Interactions :**
- **Hover** : bouton X apparaît sur la photo
- **Loading** : "Upload en cours..." pendant l'upload
- **Toasts** : feedback utilisateur (succès/erreur)
- **Validation** : messages d'erreur clairs

### **Responsive :**
- Formulaire adapté
- Photos circulaires de taille fixe
- Tags qui wrap automatiquement

---

## 🔒 Sécurité et bonnes pratiques

### **Storage Supabase :**
- ✅ **Bucket public** : `contact-photos`
- ✅ **Nommage unique** : évite les collisions
- ✅ **Validation côté client** : type et taille
- ✅ **upsert: false** : évite l'écrasement accidentel

### **Multi-tenancy :**
- ✅ **Filtrage par company_id** : chaque tenant voit ses artistes
- ✅ **RLS policies** : sécurité au niveau DB
- ✅ **Liens avec company_id** : traçabilité

### **Performance :**
- ✅ **Cache des artistes** : chargé une fois
- ✅ **Debounce** : éviter les requêtes multiples
- ✅ **Lazy loading** : artistes chargés au clic

---

## 📊 Base de données

### **Table `crm_contacts` :**
- Colonne `photo_url` (text, nullable) déjà existante
- Stocke l'URL publique de la photo

### **Table `crm_artist_contact_links` :**
Déjà créée dans `20251104_140000_crm_core.sql`

```sql
CREATE TABLE public.crm_artist_contact_links (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id uuid NOT NULL REFERENCES public.crm_contacts(id) ON DELETE CASCADE,
  artist_id uuid NOT NULL REFERENCES public.artists(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now() NOT NULL
);
```

### **Bucket Storage `contact-photos` :**
- Configuration : **Public**
- Accessible via : `https://[project].supabase.co/storage/v1/object/public/contact-photos/[filename]`

---

## 🧪 Tests recommandés

### **Upload de photo :**
- [ ] Upload d'une image JPG, PNG, GIF
- [ ] Validation : fichier non-image rejeté
- [ ] Validation : fichier > 5MB rejeté
- [ ] Aperçu de la photo avant sauvegarde
- [ ] Suppression de la photo
- [ ] Remplacement d'une photo existante
- [ ] Photo visible après sauvegarde (liste et grille)

### **Association d'artistes :**
- [ ] Dropdown s'ouvre au clic
- [ ] Liste des artistes filtrée par tenant
- [ ] Sélection multiple avec checkboxes
- [ ] Tags affichés pour artistes sélectionnés
- [ ] Suppression d'un tag (bouton X)
- [ ] Fermeture du dropdown au clic extérieur
- [ ] Sauvegarde des associations
- [ ] Chargement des associations à l'édition

### **Vue liste :**
- [ ] Pastille photo visible pour contacts avec photos
- [ ] Initiales visibles pour contacts sans photo
- [ ] Gradient violet/purple pour initiales
- [ ] Bordure violette uniforme

### **Vue grille :**
- [ ] Photos déjà visibles (fonctionnalité existante)
- [ ] Cohérence avec vue liste

---

## 🎉 Résultat final

Les utilisateurs peuvent maintenant :

1. **📸 Uploader des photos** directement depuis l'interface
2. **👁️ Voir les photos** dans la vue liste ET la vue grille
3. **🎵 Associer des contacts à leurs artistes** pour un meilleur suivi

**Avantages :**
- ✅ **Plus besoin d'importer manuellement** les photos
- ✅ **Identification visuelle** rapide des contacts
- ✅ **Liens contact-artiste** pour analyses et filtres futurs
- ✅ **UX moderne** et intuitive

---

## 🔮 Améliorations futures possibles

1. **Crop d'image** : permettre de recadrer avant upload
2. **Webcam** : prendre une photo directement depuis la webcam
3. **Filtres par artiste** : afficher tous les contacts d'un artiste
4. **Badges artistes** : afficher les artistes dans les cards de la vue grille
5. **Upload multiple** : uploader plusieurs contacts avec photos via CSV
6. **Compression** : optimiser automatiquement les images avant upload
7. **Drag & drop** : glisser-déposer des photos











