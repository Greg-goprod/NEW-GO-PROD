# 📋 Vue Grille pour les Contacts

## 🎯 Fonctionnalité implémentée

Ajout d'une vue en grille (cards) en plus de la vue liste existante pour la page **Personnes** (`/app/contacts/personnes`).

---

## ✨ Caractéristiques

### **Toggle Vue Liste / Vue Grille**
- Bouton dans la barre d'outils pour basculer entre les deux vues
- Icônes : `List` (vue liste) et `Grid3x3` (vue grille)
- État sauvegardé pendant la session

### **Vue Grille - Layout**
- **5 colonnes** en grille responsive
- Cards avec hover effect (ombre accentuée)
- Actions (Modifier/Supprimer) visibles au survol

### **Contenu des Cards**

#### 1. **Photo / Avatar**
- Photo ronde si disponible (`photo_url`)
- Initiales avec gradient violet si pas de photo
- Bordure violette de 2px
- Taille : 64x64px

#### 2. **Nom du contact**
- Prénom + Nom
- Police semi-bold
- Taille standard

#### 3. **Société associée** (optionnel)
- Icône `Building2`
- Nom de la société principale (`main_company`)
- Texte petit et gris
- Tronqué avec `truncate` si trop long

#### 4. **Téléphone** (optionnel)
- **Cliquable** → Ouvre WhatsApp Web
- Icône `Phone`
- Lien formaté : `https://wa.me/[numéro_nettoyé]`
- Style : fond vert clair, texte vert
- Effet hover

#### 5. **Email** (optionnel)
- **Cliquable** → Ouvre client mail (`mailto:`)
- Icône `Mail`
- Style : fond bleu clair, texte bleu
- Effet hover

---

## 🔧 Implémentation technique

### **Fichiers modifiés**
- `src/pages/app/contacts/personnes.tsx`

### **Nouveaux imports**
```typescript
import { List, Grid3x3 } from 'lucide-react';
```

### **Nouveaux états**
```typescript
const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
```

### **Nouvelles fonctions utilitaires**

#### `getInitials(firstName, lastName)`
Génère les initiales d'un contact :
```typescript
const getInitials = (firstName?: string, lastName?: string) => {
  const first = firstName?.trim() || '';
  const last = lastName?.trim() || '';
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase() || '??';
};
```

#### `getWhatsAppLink(phone)`
Formate le numéro pour WhatsApp Web :
```typescript
const getWhatsAppLink = (phone?: string) => {
  if (!phone) return null;
  const cleaned = phone.replace(/[^\d+]/g, '');
  return `https://wa.me/${cleaned}`;
};
```

---

## 🎨 Styles appliqués

### **Toggle Buttons**
```css
- bg-violet-500 text-white (actif)
- text-gray-500 hover:text-gray-700 (inactif)
- Transition fluide
```

### **Cards**
```css
- bg-white dark:bg-gray-800
- rounded-lg shadow
- hover:shadow-lg (effet hover)
- padding: 16px (p-4)
- flex flex-col items-center text-center
```

### **Avatar (initiales)**
```css
- bg-gradient-to-br from-violet-500 to-purple-600
- text-white font-semibold text-lg
- border-2 border-violet-500
```

### **Liens cliquables**
- **WhatsApp** : `bg-green-50 text-green-600 hover:bg-green-100`
- **Email** : `bg-blue-50 text-blue-600 hover:bg-blue-100`
- Mode sombre supporté avec `dark:` variants

---

## 🚀 Utilisation

1. Aller sur `/app/contacts/personnes`
2. Cliquer sur l'icône **grille** (à droite de la barre de recherche)
3. Les contacts s'affichent en cards (5 colonnes)
4. Survoler une card pour voir les actions (Modifier/Supprimer)
5. Cliquer sur le téléphone → Ouvre WhatsApp
6. Cliquer sur l'email → Ouvre le client mail

---

## 📱 Responsiveness

La grille utilise `grid-cols-5`, ce qui fonctionne bien sur grands écrans.

### **Amélioration future suggérée :**
```css
grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5
```

---

## 🔗 Liens utiles

- **WhatsApp Web API** : `https://wa.me/[phone_number]`
- **Mailto** : `mailto:[email_address]`
- **Lucide Icons** : https://lucide.dev/

---

## ✅ Tests recommandés

- [ ] Toggle entre vue liste et vue grille
- [ ] Affichage des initiales si pas de photo
- [ ] Clic sur téléphone → ouvre WhatsApp
- [ ] Clic sur email → ouvre client mail
- [ ] Hover sur card → affiche actions
- [ ] Modifier un contact depuis la grille
- [ ] Supprimer un contact depuis la grille
- [ ] Mode sombre (dark mode)
- [ ] Recherche fonctionne dans les deux vues

---

## 🎉 Résultat

Les utilisateurs peuvent maintenant visualiser leurs contacts de deux façons :
1. **Liste** : tableau détaillé, idéal pour scanner rapidement
2. **Grille** : cards visuelles avec photos, idéal pour retrouver visuellement un contact

Les deux vues partagent les mêmes fonctionnalités (recherche, édition, suppression).











