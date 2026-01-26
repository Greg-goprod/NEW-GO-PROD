# ⚡ Démarrage Rapide - Historique Spotify

## 🎯 En 5 minutes chrono

### ✅ ÉTAPE 1 : SQL (2 min)

Supabase > SQL Editor > Copier/coller :

```sql
-- Fichier : sql/create_spotify_history_table.sql
```

Cliquez sur **RUN** ✅

---

### ✅ ÉTAPE 2 : Edge Function (2 min)

Supabase > Edge Functions > **New Function**

**Nom :** `spotify_daily_sync`

Copier/coller le contenu de :
```
supabase/functions/spotify_daily_sync/index.ts
```

Cliquez sur **DEPLOY** ✅

---

### ✅ ÉTAPE 3 : Test Manuel (30 sec)

Sur la page de l'Edge Function, cliquez sur **INVOKE**

Résultat attendu :
```json
{
  "success": true,
  "stats": {
    "synced": 80,
    "historySaved": 80
  }
}
```

✅ **C'est fait !** L'historique commence maintenant.

---

### ✅ ÉTAPE 4 : Cron Job (1 min)

**Option A - Via l'interface Supabase :**

Database > Cron Jobs > Create

**Option B - Via SQL :**

```sql
SELECT cron.schedule(
  'spotify-daily-sync',
  '0 12 * * *',
  $$
  SELECT net.http_post(
    url := 'https://VOTRE-PROJECT.supabase.co/functions/v1/spotify_daily_sync',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer VOTRE-SERVICE-ROLE-KEY'
    )
  );
  $$
);
```

Remplacez `VOTRE-PROJECT` et `VOTRE-SERVICE-ROLE-KEY`.

✅ **Sync automatique configurée !**

---

## 📊 POUR VOIR LES GRAPHIQUES

### Installation (1 min)

```bash
cd go-prod-aura
npm install chart.js react-chartjs-2
```

### Utilisation

Dans votre page détail artiste :

```tsx
import { ArtistStatsChart } from '../../components/artists/ArtistStatsChart';

<ArtistStatsChart 
  artistId={artist.id} 
  artistName={artist.name} 
  period={30} 
/>
```

---

## ⏰ QUAND VERRA-T-ON DES DONNÉES ?

| Jour | Ce qui se passe |
|------|-----------------|
| **Jour 1** | 1 point de données (aujourd'hui) |
| **Jour 3** | Graphique commence à prendre forme |
| **Jour 7** | Tendance sur 1 semaine visible |
| **Jour 30** | Graphique complet sur 1 mois |

---

## 🧪 VÉRIFIER QUE ÇA MARCHE

```sql
-- Voir les entrées d'aujourd'hui
SELECT 
  a.name,
  h.followers,
  h.popularity,
  h.recorded_at
FROM spotify_history h
INNER JOIN artists a ON a.id = h.artist_id
WHERE h.recorded_at::date = CURRENT_DATE
ORDER BY a.name
LIMIT 10;
```

**Résultat attendu** : 80+ lignes avec la date du jour ✅

---

## 🎉 C'EST TOUT !

**Votre système tourne maintenant automatiquement :**

- ✅ Sync quotidienne à 12h00
- ✅ Historique enregistré chaque jour
- ✅ Graphiques prêts à afficher
- ✅ Zéro maintenance

**Consultez `SETUP_SPOTIFY_HISTORY.md` pour plus de détails.**



