# Migration i18n vers Context API

## ✅ Migration effectuée

Le système i18n a été migré d'une approche fonctionnelle vers une approche contextuelle React (Context API).

## 🔄 Changements effectués

### 1. Fichier i18n

**Avant** : `src/lib/i18n.ts` (fonctions globales)
```typescript
export function t(key: string): string
export function setLang(l: Lang): void
export function getLang(): Lang
export function initLang(): void
```

**Après** : `src/lib/i18n.tsx` (React Context)
```typescript
export function I18nProvider({ children }: { children: ReactNode }): ReactElement
export function useI18n(): { lang: Lang; setLang: (l: Lang) => void; t: (key: string) => string }
export type { Lang }
```

### 2. Intégration dans l'application

**`src/main.tsx`** :
```typescript
import { I18nProvider } from './lib/i18n'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <I18nProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </I18nProvider>
  </React.StrictMode>,
)
```

### 3. Utilisation dans les composants

**Avant** :
```typescript
import { t, setLang, getLang } from "@/lib/i18n"

// Dans le composant
const currentLang = getLang()
const label = t("some_key")
setLang("fr")
```

**Après** :
```typescript
import { useI18n } from "@/lib/i18n"

// Dans le composant
const { t, lang, setLang } = useI18n()
const label = t("some_key")
setLang("fr") // Re-render automatique !
```

### 4. Composants mis à jour

- ✅ `src/components/topbar/UserMenu.tsx`
- ✅ `src/components/topbar/GlobalSearch.tsx`
- ✅ `src/components/topbar/NotificationButton.tsx`

## 🎯 Avantages de la migration

### 1. Re-render automatique
Le changement de langue déclenche maintenant un re-render de tous les composants qui utilisent `useI18n()`, **sans besoin de `window.location.reload()`**.

### 2. État React natif
La langue est maintenant gérée comme un état React via `useState`, ce qui s'intègre mieux avec l'écosystème React.

### 3. Typage TypeScript amélioré
Le hook `useI18n()` retourne un objet typé, offrant une meilleure auto-complétion.

### 4. Testabilité
Les composants peuvent être facilement testés en les wrappant avec `<I18nProvider>`.

## 📝 Guide d'utilisation

### Utiliser les traductions dans un nouveau composant

```typescript
import { useI18n } from "@/lib/i18n"

export function MyComponent() {
  const { t, lang, setLang } = useI18n()
  
  return (
    <div>
      <p>{t("search_placeholder")}</p>
      <p>Langue actuelle : {lang}</p>
      <button onClick={() => setLang("en")}>Switch to English</button>
    </div>
  )
}
```

### Ajouter une nouvelle clé de traduction

Dans `src/lib/i18n.tsx`, ajouter la clé dans les 3 langues :

```typescript
const dict: Dict = {
  fr: {
    // ... existing keys
    my_new_key: "Ma nouvelle traduction",
  },
  en: {
    // ... existing keys
    my_new_key: "My new translation",
  },
  de: {
    // ... existing keys
    my_new_key: "Meine neue Übersetzung",
  },
};
```

### Ajouter une nouvelle langue

```typescript
type Lang = "fr" | "en" | "de" | "es"; // Ajouter "es"

const dict: Dict = {
  fr: { /* ... */ },
  en: { /* ... */ },
  de: { /* ... */ },
  es: {
    search_placeholder: "Buscar artistas, bookings, proyectos…",
    // ... toutes les clés
  },
};
```

## ⚠️ Points d'attention

### 1. Le fichier est maintenant `.tsx`
Le fichier `i18n.ts` a été renommé en `i18n.tsx` pour permettre l'utilisation de JSX.
Les imports fonctionnent toujours car ils n'incluent pas l'extension.

### 2. Plus besoin de `initLang()`
La langue est automatiquement chargée depuis `localStorage` au montage du `I18nProvider`.

### 3. Plus besoin de `window.location.reload()`
Le changement de langue déclenche un re-render automatique via le Context.

### 4. Tous les composants doivent être dans le Provider
Les composants qui utilisent `useI18n()` doivent être descendants du `<I18nProvider>`.

## 🧪 Tests

Pour tester un composant utilisant `useI18n()` :

```typescript
import { render } from '@testing-library/react'
import { I18nProvider } from '@/lib/i18n'
import MyComponent from './MyComponent'

test('renders with translations', () => {
  render(
    <I18nProvider>
      <MyComponent />
    </I18nProvider>
  )
  // ... assertions
})
```

## 📊 Build

Le build fonctionne sans erreurs :

```bash
✓ 1808 modules transformed.
✓ built in 11.32s
```

## ✅ Résultat

Le système i18n est maintenant entièrement basé sur React Context API, offrant :
- ✅ Re-render automatique lors du changement de langue
- ✅ Persistance dans `localStorage`
- ✅ Aucune dépendance externe
- ✅ Typage TypeScript complet
- ✅ Intégration native React

---

**Migration effectuée le** : 2024
**Version** : 2.0.0




