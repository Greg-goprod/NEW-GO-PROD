# Intégration Topbar - Recherche, Notifications, Menu Utilisateur

## ✅ Composants intégrés

### 1. 🔍 Recherche globale (GlobalSearch)
- **Emplacement** : `src/components/topbar/GlobalSearch.tsx`
- **Hook** : `src/hooks/useGlobalSearch.ts`
- **Fonctionnalités** :
  - Recherche en temps réel avec debounce (300ms)
  - Raccourci clavier `Cmd/Ctrl + K`
  - Support Supabase (mock data en dev)
  - Recherche dans `artists` et `bookings`
  - Autocomplete avec navigation

### 2. 🔔 Notifications (NotificationButton)
- **Emplacement** : `src/components/topbar/NotificationButton.tsx`
- **Fonctionnalités** :
  - UI uniquement (badge à 0)
  - Placeholder pour future implémentation backend
  - Badge rouge quand `unread > 0`

### 3. 👤 Menu utilisateur (UserMenu)
- **Emplacement** : `src/components/topbar/UserMenu.tsx`
- **Fonctionnalités** :
  - Avatar avec initiales ou photo
  - Dropdown avec 5 sections :
    - Mon profil → `/app/settings/profile`
    - Sécurité → `/app/settings/security`
    - Autorisations → `/app/admin/permissions` (admin/owner uniquement)
    - Sélecteur de langue (FR/EN/DE)
    - Déconnexion (via `supabase.auth.signOut()`)
  - Menu s'ouvre vers le haut (dans sidebar)

## 📦 Nouveaux fichiers créés

```
src/
├── types/
│   └── user.ts                        # Types UserRole, Profile
├── lib/
│   └── i18n.ts                        # Mini i18n FR/EN/DE
├── hooks/
│   └── useGlobalSearch.ts             # Hook de recherche Supabase
├── components/
│   ├── auth/
│   │   └── RequireRole.tsx            # Guard d'accès (placeholder)
│   ├── system/
│   │   └── EnvIncident.tsx            # Écran si variables .env manquantes
│   └── topbar/
│       ├── TopBar.tsx                 # Topbar principale
│       ├── GlobalSearch.tsx           # Recherche globale
│       ├── NotificationButton.tsx     # Icône notifications
│       └── UserMenu.tsx               # Menu utilisateur complet
└── layout/
    └── AppLayout.tsx                  # Layout avec Supabase auth
```

## 🔧 Configuration requise

### Variables d'environnement

Créer un fichier `.env` à la racine :

```env
VITE_SUPABASE_URL=https://votre-projet.supabase.co
VITE_SUPABASE_ANON_KEY=votre-clé-anonyme-ici
```

### Tables Supabase

**Table `profiles`** :
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  full_name TEXT,
  avatar_url TEXT,
  role TEXT CHECK (role IN ('owner', 'admin', 'manager', 'user')),
  company_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Tables de recherche (optionnel)** :
```sql
CREATE TABLE artists (
  id UUID PRIMARY KEY,
  name TEXT,
  ...
);

CREATE TABLE bookings (
  id UUID PRIMARY KEY,
  title TEXT,
  ref TEXT,
  ...
);
```

## 🎯 Fonctionnalités i18n

### Langues supportées
- 🇫🇷 Français (par défaut)
- 🇬🇧 English
- 🇩🇪 Deutsch

### Traductions disponibles
```typescript
{
  search_placeholder: "Rechercher artistes, bookings, projets…",
  sign_out: "Déconnexion",
  profile: "Mon profil",
  security: "Sécurité",
  permissions: "Autorisations",
  notifications: "Notifications",
  language: "Langue",
  admin_only: "Réservé aux administrateurs"
}
```

### Ajouter une traduction
Dans `src/lib/i18n.ts`, ajouter la clé dans les 3 langues.

## 🚀 Déploiement Netlify

### Variables d'environnement à configurer
1. Aller dans **Site settings → Environment variables**
2. Ajouter :
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

### Build settings
```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

## 📝 Utilisation

### Recherche globale
```tsx
// Le hook est déjà intégré dans GlobalSearch
const { query, setQuery, loading, results, search } = useGlobalSearch()
```

### Menu utilisateur
```tsx
import UserMenu from '@/components/topbar/UserMenu'

<UserMenu profile={profile} />
```

### Guard d'accès (future)
```tsx
import RequireRole from '@/components/auth/RequireRole'

<RequireRole allow={['admin', 'owner']}>
  <AdminPanel />
</RequireRole>
```

## ✨ Personnalisation

### Ajouter un provider de recherche
Dans `src/hooks/useGlobalSearch.ts` :

```typescript
const vehiclesProvider: Provider = async (q) => {
  const { data } = await supabase
    .from('vehicles')
    .select('id,name')
    .ilike('name', `%${q}%`)
    .limit(10);
  return (data || []).map((v: any) => ({
    id: v.id,
    label: v.name,
    entity: 'vehicle',
    href: `/app/vehicles/${v.id}`
  }));
};

const providers: Provider[] = [artistsProvider, bookingsProvider, vehiclesProvider];
```

### Modifier le menu utilisateur
Dans `src/components/topbar/UserMenu.tsx`, ajouter un bouton :

```tsx
<button
  onClick={() => { setOpen(false); nav('/app/mon-chemin'); }}
  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-white hover:bg-white/5 rounded"
>
  <Icon name="MonIcone" className="w-4 h-4" /> Mon item
</button>
```

## 🐛 Troubleshooting

### Erreur "Module not found: @supabase/supabase-js"
```bash
npm install @supabase/supabase-js
```

### Variables d'environnement non détectées
Vérifier que le fichier `.env` est à la racine et que les variables commencent par `VITE_`.

### Profil utilisateur null
Vérifier que :
1. La table `profiles` existe
2. L'utilisateur est authentifié
3. Un profil existe pour cet utilisateur

### Recherche ne retourne rien
En mode dev, des données mock sont affichées. En production, vérifier :
1. Les tables `artists` et `bookings` existent
2. Les RLS policies permettent la lecture
3. Les colonnes `name`, `title`, `ref` existent

## 📚 Documentation

- [Supabase Auth](https://supabase.com/docs/guides/auth)
- [Supabase Database](https://supabase.com/docs/guides/database)
- [Lucide Icons](https://lucide.dev/)
- [React Router](https://reactrouter.com/)

---

**Auteur** : Intégration complète pour GO-PROD Aura
**Date** : 2024
**Version** : 1.0.0




