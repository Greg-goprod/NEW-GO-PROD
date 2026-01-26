# Structure des Pages GO-PROD

## 📊 Vue d'ensemble

Toutes les pages du SaaS GO-PROD ont été créées selon une structure cohérente et modulaire.

## 🗂️ Arborescence complète

```
src/pages/app/
├── dashboard/
│   └── index.tsx                  (/app)
│
├── artistes/
│   ├── index.tsx                  (/app/artistes)
│   └── lineup.tsx                 (/app/artistes/lineup)
│
├── production/
│   ├── index.tsx                  (/app/production)
│   ├── timetable.tsx              (/app/production/timetable)
│   ├── technique.tsx              (/app/production/technique)
│   ├── travel.tsx                 (/app/production/travel)
│   │
│   ├── ground/
│   │   ├── index.tsx              (/app/production/ground)
│   │   ├── missions.tsx           (/app/production/ground/missions)
│   │   ├── chauffeurs.tsx         (/app/production/ground/chauffeurs)
│   │   ├── vehicules.tsx          (/app/production/ground/vehicules)
│   │   └── horaires.tsx           (/app/production/ground/horaires)
│   │
│   └── hospitality/
│       ├── index.tsx              (/app/production/hospitality)
│       ├── backstage.tsx          (/app/production/hospitality/backstage)
│       ├── catering.tsx           (/app/production/hospitality/catering)
│       ├── hotels.tsx             (/app/production/hospitality/hotels)
│       └── partycrew.tsx          (/app/production/hospitality/partycrew)
│
├── administration/
│   ├── index.tsx                  (/app/administration)
│   ├── booking.tsx                (/app/administration/booking)
│   ├── contrats.tsx               (/app/administration/contrats)
│   ├── finances.tsx               (/app/administration/finances)
│   └── ventes.tsx                 (/app/administration/ventes)
│
└── settings/
    ├── index.tsx                  (/app/settings)
    ├── profile.tsx                (/app/settings/profile) [legacy]
    ├── security.tsx               (/app/settings/security) [legacy]
    └── permissions.tsx            (/app/settings/permissions)
```

## 🎨 Structure de page type

Toutes les pages suivent ce modèle :

```tsx
import { IconName } from "lucide-react";

export default function PageName() {
  return (
    <div className="p-6">
      <header className="flex items-center gap-2 mb-6">
        <IconName className="w-5 h-5 text-violet-400" />
        <h1 className="text-xl font-semibold text-white">Titre</h1>
      </header>

      <p className="text-sm text-gray-400 mb-6">Section / Sous-section</p>

      {/* TODO: contenu à implémenter */}
    </div>
  );
}
```

## 📍 Mapping Icônes → Pages

| Page | Icône Lucide | Route |
|------|--------------|-------|
| Dashboard | `LayoutDashboard` | `/app` |
| Artistes | `Music` | `/app/artistes` |
| Lineup | `ListMusic` | `/app/artistes/lineup` |
| Production | `Clapperboard` | `/app/production` |
| Timetable | `Calendar` | `/app/production/timetable` |
| Technique | `Wrench` | `/app/production/technique` |
| Travel | `Plane` | `/app/production/travel` |
| Ground | `Truck` | `/app/production/ground` |
| Missions | `MapPin` | `/app/production/ground/missions` |
| Chauffeurs | `UserRound` | `/app/production/ground/chauffeurs` |
| Véhicules | `Bus` | `/app/production/ground/vehicules` |
| Horaires | `Clock` | `/app/production/ground/horaires` |
| Hospitality | `Coffee` | `/app/production/hospitality` |
| Backstage | `DoorOpen` | `/app/production/hospitality/backstage` |
| Catering | `UtensilsCrossed` | `/app/production/hospitality/catering` |
| Hôtels | `Hotel` | `/app/production/hospitality/hotels` |
| Party Crew | `Users` | `/app/production/hospitality/partycrew` |
| Administration | `Briefcase` | `/app/administration` |
| Booking (Admin) | `Calendar` | `/app/administration/booking` |
| Contrats | `FileText` | `/app/administration/contrats` |
| Finances | `Wallet` | `/app/administration/finances` |
| Ventes | `ShoppingCart` | `/app/administration/ventes` |
| Paramètres | `Settings` | `/app/settings` |
| Permissions | `Shield` | `/app/settings/permissions` |

## 🗺️ Routes dans App.tsx

Toutes les routes sont configurées dans `src/App.tsx` avec une structure imbriquée pour refléter l'arborescence :

```tsx
<Route path="/app" element={<AppLayout/>}>
  {/* Dashboard */}
  <Route index element={<DashboardPage/>}/>
  
  {/* Artistes */}
  <Route path="artistes">
    <Route index element={<ArtistesPage/>}/>
    <Route path="lineup" element={<LineupPage/>}/>
  </Route>

  {/* Production */}
  <Route path="production">
    <Route index element={<ProductionPage/>}/>
    <Route path="timetable" element={<TimetablePage/>}/>
    {/* ... */}
    
    <Route path="ground">
      <Route index element={<GroundPage/>}/>
      <Route path="missions" element={<MissionsPage/>}/>
      {/* ... */}
    </Route>

    <Route path="hospitality">
      <Route index element={<HospitalityPage/>}/>
      <Route path="backstage" element={<BackstagePage/>}/>
      {/* ... */}
    </Route>
  </Route>

  {/* Administration */}
  <Route path="administration">
    {/* ... */}
  </Route>

  {/* Settings */}
  <Route path="settings">
    {/* ... */}
  </Route>
</Route>
```

## ✅ État actuel

- ✅ **26 pages** créées
- ✅ **Toutes les routes** configurées
- ✅ **Structure cohérente** (titre + icône + breadcrumb)
- ✅ **Aucune logique métier** (TODO commentés)
- ✅ **Build fonctionnel** sans erreurs
- ✅ **Layout global** réutilisé (Topbar + Sidebar)

## 🚀 Prochaines étapes

Pour chaque page, implémenter :

1. **Logique métier** :
   - Connexion Supabase
   - Gestion du state (useState, useEffect)
   - Appels API

2. **Interface utilisateur** :
   - Tableaux de données
   - Formulaires d'ajout/édition
   - Modales de confirmation
   - Filtres et recherche

3. **Permissions** :
   - Vérification des droits utilisateur
   - Guards sur les routes sensibles

4. **Traductions** :
   - Ajouter les clés i18n nécessaires
   - Remplacer les textes statiques

## 📝 Conventions

- **Nommage des fichiers** : `kebab-case` pour les dossiers, `PascalCase` pour les composants
- **Exports** : `export default function PageName()` pour faciliter l'import
- **Icônes** : Toujours de `lucide-react`, taille `w-5 h-5`, couleur `text-violet-400`
- **Padding** : `p-6` pour le contenu principal
- **Breadcrumb** : Format `Section / Sous-section` en `text-gray-400`

## 🔍 Navigation rapide

Pour accéder aux pages dans l'application :

```
http://localhost:5174/app                           → Dashboard
http://localhost:5174/app/artistes                  → Artistes
http://localhost:5174/app/production/ground         → Ground Transport
http://localhost:5174/app/administration/finances   → Finances
http://localhost:5174/app/settings                  → Paramètres
```

---

**Créé le** : 2024
**Version** : 1.0.0
**Pages totales** : 26
**Build** : ✅ Fonctionnel




