# 📊 Setup - Historique & Synchronisation Quotidienne Spotify

## 🎯 OBJECTIF

Mettre en place un système complet pour :
1. ✅ **Synchroniser automatiquement** les données Spotify tous les jours à midi
2. ✅ **Enregistrer l'historique** (followers, popularité) dans une table dédiée
3. ✅ **Afficher des graphiques** d'évolution sur 30 jours

---

## 📋 INSTALLATION EN 4 ÉTAPES

### ÉTAPE 1 : Créer la table d'historique

1. Ouvrez **Supabase > SQL Editor**
2. Copiez le contenu de `sql/create_spotify_history_table.sql`
3. **Exécutez le script**

**Résultat attendu** :
- ✅ Table `spotify_history` créée
- ✅ Index créés pour les performances
- ✅ Vue `spotify_stats_with_change` créée
- ✅ Politiques RLS configurées

---

### ÉTAPE 2 : Déployer l'Edge Function de synchronisation quotidienne

#### A. Créer la fonction dans Supabase

1. Allez sur **Supabase Dashboard**
2. Menu **Edge Functions**
3. Cliquez sur **"New Function"**
4. Nom : `spotify_daily_sync`
5. Copiez le contenu de `supabase/functions/spotify_daily_sync/index.ts`
6. Collez et **déployez**

#### B. Configurer les variables d'environnement

Dans **Edge Functions > Settings**, vérifiez que ces variables existent :
- `SPOTIFY_CLIENT_ID`
- `SPOTIFY_CLIENT_SECRET`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

---

### ÉTAPE 3 : Configurer le Cron Job

1. Allez sur **Supabase Dashboard > Database > Cron Jobs**
2. Cliquez sur **"Create Cron Job"**

**Configuration :**
```
Nom : Spotify Daily Sync
Schedule : 0 12 * * * (tous les jours à 12h00 UTC)
SQL Command :
  SELECT net.http_post(
    url := 'https://[VOTRE-PROJECT].supabase.co/functions/v1/spotify_daily_sync',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || '[VOTRE-SERVICE-ROLE-KEY]'
    ),
    body := '{}'::jsonb
  );
```

**⚠️ Important :**
- Remplacez `[VOTRE-PROJECT]` par votre URL Supabase
- Remplacez `[VOTRE-SERVICE-ROLE-KEY]` par votre clé service role

#### Alternative : Utiliser pg_cron directement

```sql
SELECT cron.schedule(
  'spotify-daily-sync',
  '0 12 * * *',  -- Tous les jours à 12h00 UTC
  $$
  SELECT net.http_post(
    url := 'https://[VOTRE-PROJECT].supabase.co/functions/v1/spotify_daily_sync',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer [VOTRE-SERVICE-ROLE-KEY]'
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
```

---

### ÉTAPE 4 : Installer Chart.js et mettre à jour l'interface

#### A. Installer les dépendances

```bash
cd go-prod-aura
npm install chart.js react-chartjs-2
```

#### B. Intégrer le composant graphique

Le composant `ArtistStatsChart.tsx` est déjà créé dans `src/components/artists/`.

Pour l'utiliser dans la page détail d'un artiste :

```tsx
import { ArtistStatsChart } from '../../components/artists/ArtistStatsChart';

// Dans votre composant
<ArtistStatsChart 
  artistId={artist.id} 
  artistName={artist.name}
  period={30}  // 30 derniers jours
/>
```

---

## 🧪 TESTS

### Test 1 : Vérifier la table

```sql
SELECT * FROM spotify_history LIMIT 10;
```

**Résultat attendu** : Table vide au début (normal)

---

### Test 2 : Tester l'Edge Function manuellement

1. Allez sur **Edge Functions > spotify_daily_sync**
2. Cliquez sur **"Invoke"**
3. Regardez les logs

**Résultat attendu** :
```json
{
  "success": true,
  "message": "Daily sync completed",
  "stats": {
    "companies": 1,
    "synced": 80,
    "historySaved": 80,
    "errors": 0,
    "duration": "45.32s"
  }
}
```

---

### Test 3 : Vérifier l'historique après sync

```sql
SELECT 
  a.name,
  h.followers,
  h.popularity,
  h.recorded_at
FROM spotify_history h
INNER JOIN artists a ON a.id = h.artist_id
ORDER BY h.recorded_at DESC
LIMIT 10;
```

**Résultat attendu** : 10 entrées avec les données du jour

---

### Test 4 : Vérifier le Cron Job

```sql
-- Lister les cron jobs
SELECT * FROM cron.job;

-- Voir l'historique d'exécution
SELECT * FROM cron.job_run_details 
ORDER BY start_time DESC 
LIMIT 5;
```

---

## 📊 UTILISATION

### Dashboard des statistiques

Une fois les données historiques accumulées (après quelques jours), vous verrez :

1. **Graphiques d'évolution**
   - Followers sur 30 jours
   - Popularité sur 30 jours
   - Vue combinée des deux métriques

2. **Statistiques récapitulatives**
   - Valeur actuelle
   - Variation depuis le début de la période
   - Nombre de points de données

3. **Sélecteur de vue**
   - Les deux métriques
   - Followers uniquement
   - Popularité uniquement

---

## 🔄 SYNCHRONISATION

### Fréquence

- **Automatique** : Tous les jours à 12h00 UTC (configurable)
- **Manuelle** : Via le bouton "Synchroniser Spotify" (met à jour `spotify_data` uniquement)

### Que se passe-t-il lors de la sync quotidienne ?

```
12h00 UTC : Déclenchement du cron
    ↓
Edge Function `spotify_daily_sync` appelée
    ↓
Pour chaque entreprise :
  Pour chaque artiste :
    1. Récupère les données depuis Spotify API
    2. Met à jour `spotify_data` (current data)
    3. Insère dans `spotify_history` (historical data)
    ↓
Résumé envoyé (synced, errors, duration)
```

---

## 📈 EXEMPLES DE REQUÊTES UTILES

### Évolution d'un artiste sur 30 jours

```sql
SELECT 
  recorded_at::date as date,
  followers,
  popularity
FROM spotify_history
WHERE artist_id = 'UUID-DE-L-ARTISTE'
  AND recorded_at >= NOW() - INTERVAL '30 days'
ORDER BY recorded_at;
```

### Top 10 artistes avec la plus grande croissance

```sql
WITH stats AS (
  SELECT 
    artist_id,
    MAX(followers) FILTER (WHERE recorded_at >= NOW() - INTERVAL '7 days') as followers_now,
    MIN(followers) FILTER (WHERE recorded_at >= NOW() - INTERVAL '7 days') as followers_7d_ago
  FROM spotify_history
  WHERE recorded_at >= NOW() - INTERVAL '7 days'
  GROUP BY artist_id
)
SELECT 
  a.name,
  s.followers_now,
  s.followers_7d_ago,
  s.followers_now - s.followers_7d_ago as growth
FROM stats s
INNER JOIN artists a ON a.id = s.artist_id
WHERE s.followers_7d_ago IS NOT NULL
ORDER BY growth DESC
LIMIT 10;
```

### Artistes les plus populaires (tendance)

```sql
SELECT 
  a.name,
  AVG(h.popularity) as avg_popularity_30d,
  MAX(h.followers) as max_followers
FROM spotify_history h
INNER JOIN artists a ON a.id = h.artist_id
WHERE h.recorded_at >= NOW() - INTERVAL '30 days'
GROUP BY a.id, a.name
ORDER BY avg_popularity_30d DESC
LIMIT 20;
```

---

## 🐛 DÉPANNAGE

### Problème 1 : Cron ne se déclenche pas

**Vérifications** :
1. Le cron est bien créé : `SELECT * FROM cron.job;`
2. Les logs d'exécution : `SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 5;`
3. L'URL de l'Edge Function est correcte
4. La `service_role_key` est valide

**Solution** : Tester manuellement l'Edge Function d'abord

---

### Problème 2 : Historique non enregistré

**Cause probable** : Contrainte UNIQUE `(artist_id, recorded_at)`

Si vous exécutez la sync plusieurs fois le même jour, la 2ème fois ne créera pas de doublon (normal).

**Solution** : C'est voulu ! Chaque artiste = 1 entrée par jour maximum

---

### Problème 3 : Graphiques vides

**Causes possibles** :
1. Pas encore de données historiques → Attendre la première sync
2. Chart.js non installé → `npm install chart.js react-chartjs-2`
3. Erreur dans le composant → Vérifier la console

**Solution** : Créer des données de test manuellement :

```sql
INSERT INTO spotify_history (artist_id, followers, popularity, recorded_at)
VALUES 
  ('UUID-ARTISTE', 1000000, 75, NOW() - INTERVAL '30 days'),
  ('UUID-ARTISTE', 1010000, 76, NOW() - INTERVAL '20 days'),
  ('UUID-ARTISTE', 1025000, 77, NOW() - INTERVAL '10 days'),
  ('UUID-ARTISTE', 1050000, 78, NOW());
```

---

## ✅ CHECKLIST FINALE

- [ ] Table `spotify_history` créée
- [ ] Vue `spotify_stats_with_change` créée
- [ ] Edge Function `spotify_daily_sync` déployée
- [ ] Variables d'environnement configurées
- [ ] Cron Job créé (12h00 UTC quotidien)
- [ ] Cron Job testé manuellement
- [ ] Chart.js installé (`npm install`)
- [ ] Composant `ArtistStatsChart` intégré
- [ ] Test avec quelques jours de données

---

## 🎉 RÉSULTAT FINAL

Après quelques jours, vous aurez :

- ✅ **Synchronisation automatique** tous les jours à midi
- ✅ **Historique complet** des followers et popularité
- ✅ **Graphiques d'évolution** sur 30 jours
- ✅ **Statistiques de croissance** pour chaque artiste
- ✅ **Dashboard analytique** pour suivre les tendances

**Temps total d'installation** : ~30 minutes  
**Données nécessaires** : 7-30 jours pour des graphiques intéressants

---

## 📞 SUPPORT

Si vous rencontrez des problèmes :
1. Vérifiez les logs de l'Edge Function dans Supabase
2. Vérifiez les logs du Cron Job
3. Testez manuellement chaque étape
4. Consultez les exemples de requêtes SQL ci-dessus



