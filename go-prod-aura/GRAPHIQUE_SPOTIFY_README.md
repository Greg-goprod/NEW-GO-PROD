# 📊 Graphique d'Évolution Spotify - Documentation

## 🎯 **CE QUI A ÉTÉ IMPLÉMENTÉ**

Un système complet de suivi historique des données Spotify avec visualisation graphique.

---

## 📍 **OÙ SE TROUVE LE GRAPHIQUE ?**

### Navigation
```
App > Artistes > [Cliquer sur un artiste] > Page détail
```

### Position dans la page
```
┌─────────────────────────────────────────┐
│  Photo de l'artiste                     │
│  Widget Spotify                         │
│  Contact                                │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│  📊 Statistiques Spotify                │
│  • Followers: 4,232,782                 │
│  • Popularité: 71/100                   │
│  • Genres: Pop, Rock                    │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│  📈 Évolution Spotify                   │ ← ICI !
│                                         │
│  [7j] [1m] [3m] [6m] [1an] [2ans] [Tout]│
│                                         │
│     5M ┤              ╱━━━━━━━          │
│        │         ╱━━━━╱                 │
│     4M ┤    ╱━━━━╱                      │
│        │━━━━╱                           │
│     3M └────────────────────────        │
│        Sep   Oct   Nov   Déc   Jan      │
│                                         │
│  ━━━ Followers  ━━━ Popularité          │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│  🌐 Réseaux sociaux                     │
│  • Spotify                              │
│  • Instagram                            │
│  • Facebook                             │
└─────────────────────────────────────────┘
```

---

## 🎨 **FONCTIONNALITÉS**

### 1. **Sélecteur de Période**

7 options disponibles :

| Période | Durée | Cas d'usage |
|---------|-------|-------------|
| **7 jours** | 1 semaine | Tendance récente, pics d'actualité |
| **1 mois** | 30 jours | Performance mensuelle |
| **3 mois** | 90 jours | Tendance trimestrielle |
| **6 mois** | 180 jours | Évolution semestrielle |
| **1 an** | 365 jours | Performance annuelle |
| **2 ans** | 730 jours | Tendance long terme |
| **Tout** | Illimité | Historique complet depuis le début |

### 2. **Double Ligne**

**Ligne Violette** : Followers
- Axe Y gauche
- Échelle dynamique (K, M)
- Affiche la croissance de la fanbase

**Ligne Rose** : Popularité
- Axe Y droit
- Échelle 0-100
- Mesure l'engagement et l'écoute

### 3. **Interactivité**

- ✅ **Hover** : Info-bulle avec valeurs exactes
- ✅ **Responsive** : S'adapte à tous les écrans
- ✅ **Dark Mode** : Couleurs optimisées
- ✅ **Animations** : Transitions fluides

---

## 🔄 **SYNCHRONISATION AUTOMATIQUE**

### Horaire
**Tous les jours à 12h00 UTC** (13h Paris hiver, 14h Paris été)

### Processus
```
12:00 UTC
  ↓
Edge Function déclenchée par Cron Job
  ↓
Pour chaque entreprise:
  Pour chaque artiste avec Spotify ID:
    1. Appel API Spotify
    2. Récupération followers + popularité
    3. Mise à jour spotify_data (données actuelles)
    4. Insertion spotify_history (historique)
  ↓
Durée totale: ~30-60 secondes pour 100 artistes
  ↓
Graphiques mis à jour automatiquement
```

### Données enregistrées
- `followers` : Nombre d'abonnés Spotify
- `popularity` : Score 0-100 (algorithme Spotify)
- `recorded_at` : Horodatage de la mesure

---

## 📊 **EXEMPLE DE DONNÉES**

### Table `spotify_history`

| recorded_at | followers | popularity |
|-------------|-----------|------------|
| 2025-01-20  | 4,230,000 | 70         |
| 2025-01-21  | 4,232,000 | 71         |
| 2025-01-22  | 4,235,500 | 71         |
| 2025-01-23  | 4,232,782 | 71         |

### Graphique résultant

```
Followers
4.24M ┤                        •
      │                    •
4.23M ┤              •
      │        •
4.22M └──────────────────────
      20  21  22  23  Janvier

Popularité
72 ┤
   │              •───•───•
70 ┤        •
   │
68 └──────────────────────
   20  21  22  23  Janvier
```

---

## 🛠️ **FICHIERS IMPLIQUÉS**

### Frontend
```
src/
├── components/
│   └── artists/
│       └── ArtistStatsChart.tsx       ← Composant graphique
├── pages/
│   └── app/
│       └── artistes/
│           └── detail.tsx             ← Intégration
└── lib/
    └── supabaseClient.ts              ← Client Supabase
```

### Backend
```
supabase/
└── functions/
    └── spotify_daily_sync/
        └── index.ts                   ← Edge Function
```

### Base de données
```
Tables:
├── spotify_history                    ← Historique complet
├── spotify_data                       ← Données actuelles
└── artists                            ← Informations artistes

Views:
├── spotify_stats_with_change          ← Vue avec variations
└── latest_spotify_history             ← Dernières entrées

Cron Jobs:
└── spotify-daily-sync                 ← Synchronisation quotidienne
```

---

## 🎯 **CAS D'USAGE**

### 1. **Analyser une Campagne Marketing**

**Scénario** : Sortie d'album le 15/01

**Action** :
1. Sélectionner **1 mois**
2. Observer le pic de followers vers le 15/01
3. Mesurer l'impact : +50,000 followers en 7 jours

### 2. **Comparer les Artistes**

**Scénario** : Qui a la meilleure croissance ?

**Action** :
1. Ouvrir plusieurs onglets avec différents artistes
2. Sélectionner **3 mois** partout
3. Comparer visuellement les courbes

### 3. **Détecter un Problème**

**Scénario** : Chute soudaine de popularité

**Action** :
1. Sélectionner **7 jours**
2. Identifier la date exacte de la chute
3. Investiguer les causes (scandale, retrait de morceau, etc.)

### 4. **Planifier une Stratégie**

**Scénario** : Budget marketing annuel

**Action** :
1. Sélectionner **1 an** ou **2 ans**
2. Identifier les périodes de forte croissance
3. Reproduire les stratégies gagnantes

---

## 📈 **MÉTRIQUES DISPONIBLES**

### Followers (Abonnés)
- **Définition** : Nombre d'utilisateurs qui suivent l'artiste sur Spotify
- **Importance** : Mesure la taille de la fanbase
- **Tendance** : Généralement en croissance constante
- **Pic typique** : +20-50% lors d'une sortie d'album majeure

### Popularity (Popularité)
- **Définition** : Score 0-100 calculé par Spotify (algorithme propriétaire)
- **Facteurs** : Nombre d'écoutes récentes, tendances actuelles
- **Importance** : Mesure l'engagement et la visibilité
- **Variabilité** : Fluctue plus que les followers (dépend des sorties)

---

## 🔧 **MAINTENANCE**

### Zéro Maintenance Requise ✅

Le système fonctionne de manière autonome :

- ✅ Synchronisation automatique quotidienne
- ✅ Gestion des erreurs intégrée (retry, skip)
- ✅ Pas de limite de stockage (PostgreSQL)
- ✅ Pas de coût API Spotify (client credentials gratuit)
- ✅ Logs détaillés pour debugging

### Vérifications Optionnelles

**Hebdomadaire** (optionnel) :
```sql
-- Voir le dernier déclenchement du cron
SELECT * FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'spotify-daily-sync')
ORDER BY start_time DESC
LIMIT 1;
```

**Mensuelle** (optionnel) :
```sql
-- Compter les entrées historiques
SELECT COUNT(*) FROM spotify_history;

-- Devrait augmenter de ~80-100 par jour
-- (nombre d'artistes avec Spotify ID)
```

---

## 🎨 **PERSONNALISATION**

### Changer les Couleurs

Fichier : `src/components/artists/ArtistStatsChart.tsx`

```tsx
// Ligne ~120 : Followers
borderColor: 'rgb(139, 92, 246)',      // Violet-400
backgroundColor: 'rgba(139, 92, 246, 0.1)',

// Ligne ~135 : Popularité
borderColor: 'rgb(236, 72, 153)',      // Pink-500
backgroundColor: 'rgba(236, 72, 153, 0.1)',
```

### Ajouter des Périodes

```tsx
// Ligne ~315
const periods: { value: Period; label: string }[] = [
  { value: 14, label: '2 semaines' },  // Ajout
  { value: 7, label: '7 jours' },
  // ...
];
```

### Changer l'Horaire du Cron

```sql
-- Fichier : sql/configure_cron_job.sql
-- Ligne 9
'0 12 * * *',  → '0 6 * * *'  (06h00 UTC)
```

---

## ❓ **FAQ**

### Q: Le graphique est vide, pourquoi ?
**R:** Pas encore d'historique. Options :
1. Attendre la 1ère sync automatique (demain 12h00)
2. Déclencher une sync manuelle (voir `CONFIGURE_CRON_NOW.md`)
3. Créer des données de test (voir `TEST_SPOTIFY_HISTORY_NOW.md`)

### Q: Peut-on ajouter d'autres métriques ?
**R:** Oui ! Modifiez l'Edge Function pour récupérer :
- Nombre de playlists
- Top tracks
- Écoutes mensuelles (si disponible via API)

### Q: Les données sont-elles fiables ?
**R:** Oui, elles viennent directement de l'API Spotify officielle.

### Q: Quelle est la rétention des données ?
**R:** Illimitée ! Toutes les mesures quotidiennes sont conservées.

### Q: Peut-on exporter les données ?
**R:** Oui :
```sql
COPY (
  SELECT * FROM spotify_history
  WHERE artist_id = 'UUID'
) TO '/tmp/export.csv' CSV HEADER;
```

---

## 🎉 **RÉSUMÉ**

✅ **Graphique interactif** avec 2 lignes (Followers + Popularité)
✅ **7 périodes** : 7j, 1m, 3m, 6m, 1an, 2ans, tout
✅ **Synchronisation automatique** quotidienne à 12h00 UTC
✅ **Historique illimité** depuis le déploiement
✅ **Design moderne** adapté dark/light mode
✅ **Position idéale** entre Stats Spotify et Réseaux sociaux
✅ **Zéro maintenance** requise

**Tout est prêt ! Il ne reste qu'à configurer le Cron Job.** 🚀

Voir : `CONFIGURE_CRON_NOW.md` pour les dernières étapes.



