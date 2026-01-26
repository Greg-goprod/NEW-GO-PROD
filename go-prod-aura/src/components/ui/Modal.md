# Modal Component - Documentation

## 🎯 **Composant Modal Standard AURA**

Le composant `Modal` est le composant de référence pour tous les modals de l'application. Il respecte le design system AURA et offre toutes les fonctionnalités nécessaires.

## 📋 **Fonctionnalités**

### ✅ **Design AURA**
- **Thème sombre/clair** : Adaptation automatique
- **Classes AURA** : `modal-backdrop`, `modal`, `modal-md`, etc.
- **Variables CSS** : Couleurs, bordures, ombres AURA
- **Transitions** : Animations fluides

### ✅ **Comportement**
- **Déplaçable** : Glisser-déposer par le header
- **Fermeture** : Clic backdrop, bouton X, touche Escape
- **Scroll bloqué** : Body scroll désactivé quand ouvert
- **Z-index** : Gestion des couches correcte

### ✅ **Fonctionnalités**
- **Tailles** : `sm`, `md`, `lg`, `xl`
- **Déplacement** : Optionnel (`draggable={true/false}`)
- **Footer** : Optionnel avec boutons standardisés
- **Accessibilité** : Navigation clavier, focus management

## 🚀 **Utilisation**

### **Import**
```typescript
import Modal, { ModalFooter, ModalButton } from "@/components/ui/Modal";
```

### **Exemple basique**
```tsx
<Modal
  isOpen={isModalOpen}
  onClose={() => setIsModalOpen(false)}
  title="Mon Modal"
>
  <p>Contenu du modal</p>
</Modal>
```

### **Exemple complet avec footer**
```tsx
<Modal
  isOpen={isModalOpen}
  onClose={() => setIsModalOpen(false)}
  title="Ajouter un élément"
  size="md"
  draggable={true}
  footer={
    <ModalFooter>
      <ModalButton variant="secondary" onClick={onCancel}>
        Annuler
      </ModalButton>
      <ModalButton 
        variant="primary" 
        onClick={onSave}
        loading={isLoading}
      >
        Enregistrer
      </ModalButton>
    </ModalFooter>
  }
>
  <div className="space-y-3">
    <div>
      <label className="block text-xs font-medium mb-1">Nom *</label>
      <Input 
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="input h-8 text-sm"
      />
    </div>
  </div>
</Modal>
```

## 🎨 **Props**

### **Modal**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `isOpen` | `boolean` | - | État d'ouverture du modal |
| `onClose` | `() => void` | - | Fonction de fermeture |
| `title` | `string` | - | Titre du modal |
| `children` | `ReactNode` | - | Contenu du modal |
| `footer` | `ReactNode` | - | Footer optionnel |
| `size` | `'sm' \| 'md' \| 'lg' \| 'xl'` | `'md'` | Taille du modal |
| `draggable` | `boolean` | `true` | Permet le déplacement |
| `className` | `string` | `''` | Classes CSS additionnelles |

### **ModalButton**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `'primary' \| 'secondary' \| 'danger'` | `'secondary'` | Style du bouton |
| `onClick` | `() => void` | - | Action du bouton |
| `children` | `ReactNode` | - | Texte du bouton |
| `disabled` | `boolean` | `false` | État désactivé |
| `loading` | `boolean` | `false` | État de chargement |
| `className` | `string` | `''` | Classes CSS additionnelles |

## 📐 **Tailles**

| Taille | Largeur | Usage |
|--------|---------|-------|
| `sm` | 400px | Modals simples, confirmations |
| `md` | 600px | Formulaires standards |
| `lg` | 800px | Formulaires complexes |
| `xl` | 1000px | Tableaux, données détaillées |

## 🎯 **Bonnes Pratiques**

### **1. Structure du contenu**
```tsx
// ✅ Bon : Contenu organisé
<div className="space-y-3">
  <div>
    <label className="block text-xs font-medium mb-1">Label</label>
    <Input className="input h-8 text-sm" />
  </div>
</div>

// ❌ Éviter : Contenu non structuré
<p>Texte sans structure</p>
```

### **2. Footer avec boutons**
```tsx
// ✅ Bon : Footer avec ModalFooter
<ModalFooter>
  <ModalButton variant="secondary" onClick={onCancel}>
    Annuler
  </ModalButton>
  <ModalButton variant="primary" onClick={onSave}>
    Enregistrer
  </ModalButton>
</ModalFooter>

// ❌ Éviter : Footer custom
<div className="flex gap-2">
  <button>Annuler</button>
  <button>Enregistrer</button>
</div>
```

### **3. Gestion des états**
```tsx
// ✅ Bon : États gérés
const [loading, setLoading] = useState(false);
const [error, setError] = useState<string | null>(null);

<ModalButton 
  variant="primary" 
  onClick={onSave}
  loading={loading}
  disabled={!isValid}
>
  Enregistrer
</ModalButton>

// ❌ Éviter : Pas de gestion d'état
<ModalButton onClick={onSave}>
  Enregistrer
</ModalButton>
```

## 🔧 **Styles AURA**

### **Classes CSS utilisées**
- `modal-backdrop` : Overlay avec blur
- `modal` : Container principal
- `modal-sm/md/lg/xl` : Tailles
- `modal-header` : Header avec titre et bouton fermer
- `btn`, `btn-primary`, `btn-secondary` : Boutons
- `input` : Champs de saisie

### **Variables CSS**
- `--z-modal-backdrop` : Z-index backdrop (400)
- `--z-modal` : Z-index modal (500)
- `--border-default` : Couleur des bordures
- `--text-secondary` : Couleur du texte secondaire

## 🎉 **Exemples d'Usage**

### **Modal de confirmation**
```tsx
<Modal
  isOpen={showConfirm}
  onClose={() => setShowConfirm(false)}
  title="Confirmer la suppression"
  size="sm"
  footer={
    <ModalFooter>
      <ModalButton variant="secondary" onClick={onCancel}>
        Annuler
      </ModalButton>
      <ModalButton variant="danger" onClick={onConfirm}>
        Supprimer
      </ModalButton>
    </ModalFooter>
  }
>
  <p>Êtes-vous sûr de vouloir supprimer cet élément ?</p>
</Modal>
```

### **Modal de formulaire**
```tsx
<Modal
  isOpen={showForm}
  onClose={() => setShowForm(false)}
  title="Modifier les informations"
  size="lg"
  draggable={true}
  footer={
    <ModalFooter>
      <ModalButton variant="secondary" onClick={onCancel}>
        Annuler
      </ModalButton>
      <ModalButton 
        variant="primary" 
        onClick={onSave}
        loading={isLoading}
      >
        Sauvegarder
      </ModalButton>
    </ModalFooter>
  }
>
  <div className="space-y-4">
    {/* Formulaire complexe */}
  </div>
</Modal>
```

---

## ✅ **Checklist pour Nouveaux Modals**

- [ ] Utiliser le composant `Modal` standard
- [ ] Définir la taille appropriée (`sm`, `md`, `lg`, `xl`)
- [ ] Activer le déplacement si nécessaire (`draggable={true}`)
- [ ] Utiliser `ModalFooter` et `ModalButton` pour les actions
- [ ] Gérer les états de chargement et d'erreur
- [ ] Respecter la structure des champs (labels, inputs)
- [ ] Tester la fermeture (Escape, backdrop, bouton X)
- [ ] Vérifier l'accessibilité clavier

**🎯 Ce composant Modal est maintenant la référence pour tous les futurs modals de l'application !**



