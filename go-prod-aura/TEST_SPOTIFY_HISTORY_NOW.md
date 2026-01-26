# 🧪 Tester l'Historique Spotify Maintenant

## 🎯 POUR VOIR ÇA FONCTIONNER TOUT DE SUITE

Pas envie d'attendre 30 jours ? Créons des données de test ! 🚀

---

## OPTION 1 : Données de Test Automatiques ⚡

### Étape 1 : Exécuter le script

Supabase > SQL Editor > Copier/coller :

```sql
-- Fichier : sql/create_test_history_data.sql
```

Cliquez sur **RUN**

### Ce que ça fait :

- ✅ Sélectionne 5 artistes aléatoires
- ✅ Crée 30 jours d'historique pour chacun
- ✅ Simule une croissance progressive (90% → 100%)
- ✅ Ajoute des variations aléatoires (+/- 1%)

### Résultat :

```
Données de test créées pour: 5 artistes
nb_entrees: 155 (5 × 31 jours)
de: 2025-09-23
a: 2025-10-23
```

---

## OPTION 2 : Données de Test Manuelles (1 artiste) 🎯

Si vous voulez tester sur un artiste spécifique :

```sql
-- Remplacez UUID-DE-VOTRE-ARTISTE par un vrai UUID
DO $$
DECLARE
  test_artist_id UUID := '03f55e62-9549-4633-a830-0f77b004e600'; -- GAZO
  base_followers INT := 4232782;
  base_popularity INT := 71;
  i INT;
BEGIN
  FOR i IN 1..30 LOOP
    INSERT INTO spotify_history (artist_id, followers, popularity, recorded_at)
    VALUES (
      test_artist_id,
      base_followers + (i * 500) + (RANDOM() * 2000)::INT,
      LEAST(100, base_popularity + (RANDOM() * 3)::INT),
      NOW() - INTERVAL '30 days' + (i || ' days')::INTERVAL
    )
    ON CONFLICT (artist_id, recorded_at) DO NOTHING;
  END LOOP;
END $$;
```

---

## ✅ VÉRIFIER LES DONNÉES

### Test 1 : Compter les entrées

```sql
SELECT 
  COUNT(*) as total_entries,
  COUNT(DISTINCT artist_id) as nb_artists,
  MIN(recorded_at)::date as first_date,
  MAX(recorded_at)::date as last_date
FROM spotify_history;
```

**Résultat attendu :**
```
total_entries: 155
nb_artists: 5
first_date: 2025-09-23
last_date: 2025-10-23
```

---

### Test 2 : Voir l'évolution d'un artiste

```sql
SELECT 
  a.name,
  h.followers,
  h.popularity,
  h.recorded_at::date
FROM spotify_history h
INNER JOIN artists a ON a.id = h.artist_id
ORDER BY h.recorded_at DESC
LIMIT 10;
```

**Résultat attendu :**
```
name        | followers | popularity | date
------------|-----------|------------|------------
GAZO        | 4245123   | 73         | 2025-10-23
GAZO        | 4243891   | 72         | 2025-10-22
FRANGLISH   | 1868456   | 66         | 2025-10-23
...
```

---

### Test 3 : Voir les variations

```sql
SELECT 
  name,
  current_followers,
  previous_followers,
  followers_change,
  popularity_change
FROM spotify_stats_with_change
WHERE followers_change IS NOT NULL
ORDER BY followers_change DESC
LIMIT 5;
```

**Résultat attendu :**
```
name       | current | previous | change | popularity_change
-----------|---------|----------|--------|------------------
GAZO       | 4232782 | 4230000  | +2782  | +1
FRANGLISH  | 1861045 | 1859500  | +1545  | 0
...
```

✅ **Si vous voyez des nombres dans `followers_change`, ça marche !**

---

## 📊 TESTER LES GRAPHIQUES

Maintenant que vous avez des données, testez le composant :

### 1. Installer Chart.js

```bash
cd go-prod-aura
npm install chart.js react-chartjs-2
```

### 2. Utiliser le composant

Dans votre page détail artiste (`detail.tsx`) :

```tsx
import { ArtistStatsChart } from '../../components/artists/ArtistStatsChart';

// Dans le render, ajoutez :
<div className="mt-6">
  <ArtistStatsChart 
    artistId={artist.id} 
    artistName={artist.name}
    period={30}
  />
</div>
```

### 3. Voir le résultat

Allez sur la page de détail d'un artiste qui a des données de test.

**Vous devriez voir :**
- ✅ Graphique avec 30 points
- ✅ Courbe de followers en violet
- ✅ Courbe de popularité en rose
- ✅ Statistiques récapitulatives
- ✅ Sélecteur de vue (both/followers/popularity)

---

## 🎨 APPARENCE DU GRAPHIQUE

```
┌─────────────────────────────────────────────┐
│  Évolution Followers & Popularité           │
│                                             │
│  5M ┤                               ╱━━━    │
│     │                          ╱━━━╱        │
│  4M ┤                     ╱━━━╱             │
│     │                ╱━━━╱                  │
│  3M ┤           ╱━━━╱                       │
│     └───────────────────────────────────    │
│     30j   20j   10j   Aujourd'hui           │
└─────────────────────────────────────────────┘

📊 Statistiques:
   Followers: 4,232,782 (+45,234) ↗
   Popularité: 71/100 (+2) ↗
   Points de données: 31
```

---

## 🧹 NETTOYER LES DONNÉES DE TEST

Une fois que vous avez testé, vous pouvez supprimer les données de test :

```sql
-- Supprimer toutes les données de test
DELETE FROM spotify_history;

-- Ou supprimer uniquement pour certains artistes
DELETE FROM spotify_history
WHERE artist_id IN (
  'uuid-artiste-1',
  'uuid-artiste-2'
);
```

**Note :** La synchronisation quotidienne recréera les vraies données !

---

## 🚀 PASSER EN PRODUCTION

Une fois testé :

1. ✅ **Nettoyez** les données de test (optionnel)
2. ✅ **Configurez** le Cron Job (12h00 quotidien)
3. ✅ **Attendez** la première sync automatique
4. ✅ **Profitez** des vraies données historiques !

---

## 📝 RÉSUMÉ

| Action | Commande/Fichier |
|--------|------------------|
| **Créer données test** | `create_test_history_data.sql` |
| **Voir évolution** | `view_artist_evolution.sql` |
| **Tester graphiques** | Installer Chart.js + Intégrer composant |
| **Nettoyer** | `DELETE FROM spotify_history;` |
| **Production** | Configurer Cron Job |

---

## 🎉 FÉLICITATIONS !

Vous avez maintenant :
- ✅ Un système d'historique fonctionnel
- ✅ Des graphiques professionnels
- ✅ Des données de test pour valider
- ✅ Tout est prêt pour la production !

**Prochaine étape : Configurer le Cron Job et laisser tourner automatiquement !** 🚀



