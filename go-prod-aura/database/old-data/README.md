# 📁 Dossier old-data

## 📋 Placement des fichiers d'export

Placez ici vos fichiers d'export de l'ancienne base Supabase.

### Formats supportés :
- **CSV** : `.csv` (recommandé pour import via API)
- **SQL** : `.sql` (pour import direct dans SQL Editor)

---

## 📄 Fichiers attendus

### 1. `artists.csv`
Colonnes minimales :
```csv
id,name,status,email,phone,location,company_id,created_at
00000000-0000-0000-0000-000000000001,DJ Shadow,active,dj.shadow@example.com,+41 79 123 45 67,Geneva,00000000-0000-0000-0000-000000000001,2024-01-01 00:00:00
```

**Mapping des colonnes :**
| Ancien | Nouveau | Notes |
|--------|---------|-------|
| `id` | `id` | UUID préservé si possible |
| `name` | `name` | Obligatoire |
| `status` | `status` | Mapper : actif → active, inactif → inactive, archivé → archived |
| `email` | `email` | Optionnel |
| `phone` | `phone` | Optionnel |
| `location` | `location` | Optionnel |
| `company_id` | `company_id` | Si absent, utiliser DEFAULT_COMPANY_ID |
| `created_at` | `created_at` | Si absent, NOW() |

---

### 2. `spotify_data.csv`
Colonnes minimales :
```csv
id,artist_id,image_url,followers,popularity,external_url,genres,created_at
00000000-0000-0000-0000-000000000002,00000000-0000-0000-0000-000000000001,https://...,850000,72,https://open.spotify.com/...,"[""hip hop"",""electronic""]",2024-01-01 00:00:00
```

**Notes importantes :**
- `artist_id` doit correspondre à un `id` existant dans `artists`
- `genres` doit être un tableau JSON : `["genre1", "genre2"]`
- `popularity` doit être entre 0 et 100

---

### 3. `social_media_data.csv`
Colonnes minimales :
```csv
id,artist_id,instagram_url,facebook_url,youtube_url,tiktok_url,twitter_url,created_at
00000000-0000-0000-0000-000000000003,00000000-0000-0000-0000-000000000001,https://instagram.com/djshadow,https://facebook.com/djshadow,https://youtube.com/@djshadow,,https://twitter.com/djshadow,2024-01-01 00:00:00
```

**Notes :**
- `artist_id` doit correspondre à un `id` existant dans `artists`
- Toutes les URLs sont optionnelles

---

### 4. `events.csv`
Colonnes minimales :
```csv
id,name,event_date,venue,city,country,status,company_id,created_at
00000000-0000-0000-0000-000000000004,Montreux Jazz Festival 2024,2024-07-15,Montreux Music & Convention Centre,Montreux,Switzerland,completed,00000000-0000-0000-0000-000000000001,2024-01-01 00:00:00
```

**Mapping du status :**
| Ancien | Nouveau |
|--------|---------|
| planifié | planned |
| confirmé | confirmed |
| annulé | cancelled |
| terminé | completed |

---

### 5. `event_artists.csv`
Colonnes minimales :
```csv
event_id,artist_id,performance_order,fee_amount,fee_currency,created_at
00000000-0000-0000-0000-000000000004,00000000-0000-0000-0000-000000000001,1,25000.00,CHF,2024-01-01 00:00:00
```

**Notes :**
- `event_id` et `artist_id` doivent exister dans leurs tables respectives
- La paire `(event_id, artist_id)` doit être unique
- `fee_currency` par défaut : `CHF`

---

## 🔄 Extraction depuis l'ancienne base

### Via Supabase Dashboard

1. **Aller dans SQL Editor**
2. **Copier-coller les requêtes suivantes :**

#### Export Artists
```sql
COPY (
  SELECT id, name, status, email, phone, location, company_id, created_at
  FROM artists
  ORDER BY created_at
) TO STDOUT WITH CSV HEADER;
```
→ Sauvegarder sous `artists.csv`

#### Export Spotify Data
```sql
COPY (
  SELECT id, artist_id, image_url, followers, popularity, external_url, genres, created_at
  FROM spotify_data
  ORDER BY created_at
) TO STDOUT WITH CSV HEADER;
```
→ Sauvegarder sous `spotify_data.csv`

#### Export Social Media Data
```sql
COPY (
  SELECT id, artist_id, instagram_url, facebook_url, youtube_url, tiktok_url, twitter_url, created_at
  FROM social_media_data
  ORDER BY created_at
) TO STDOUT WITH CSV HEADER;
```
→ Sauvegarder sous `social_media_data.csv`

#### Export Events
```sql
COPY (
  SELECT id, name, event_date, venue, city, country, status, company_id, created_at
  FROM events
  ORDER BY event_date
) TO STDOUT WITH CSV HEADER;
```
→ Sauvegarder sous `events.csv`

#### Export Event-Artists
```sql
COPY (
  SELECT event_id, artist_id, performance_order, fee_amount, fee_currency, created_at
  FROM event_artists
  ORDER BY created_at
) TO STDOUT WITH CSV HEADER;
```
→ Sauvegarder sous `event_artists.csv`

---

### Via CLI (si accès direct à la base)

```bash
# Export complet en SQL
pg_dump -h db.xxxxx.supabase.co -U postgres -d postgres -t artists -t spotify_data -t social_media_data -t events -t event_artists > old_goprod_export.sql

# Ou export CSV par table
psql -h db.xxxxx.supabase.co -U postgres -d postgres -c "COPY artists TO STDOUT WITH CSV HEADER" > artists.csv
```

---

## ⚠️ Checklist avant import

- [ ] Tous les fichiers CSV sont encodés en UTF-8
- [ ] Les UUID sont au format valide (`00000000-0000-0000-0000-000000000000`)
- [ ] Les dates sont au format ISO 8601 (`2024-01-01 00:00:00` ou `2024-01-01T00:00:00Z`)
- [ ] Le champ `genres` dans `spotify_data.csv` est un tableau JSON valide
- [ ] Aucun caractère spécial non échappé (guillemets, virgules dans les valeurs)
- [ ] Les `company_id` existent dans la table `companies` (ou utiliser `DEFAULT_COMPANY_ID`)
- [ ] Les relations FK sont cohérentes :
  - `spotify_data.artist_id` → `artists.id`
  - `social_media_data.artist_id` → `artists.id`
  - `event_artists.event_id` → `events.id`
  - `event_artists.artist_id` → `artists.id`

---

## 🛠️ Nettoyage des données (si nécessaire)

### Supprimer les doublons
```sql
-- Trouver les doublons dans artists
SELECT name, COUNT(*) FROM artists GROUP BY name HAVING COUNT(*) > 1;

-- Supprimer les doublons (garder le plus récent)
DELETE FROM artists a
USING artists b
WHERE a.id < b.id
AND a.name = b.name;
```

### Normaliser les status
```sql
-- Corriger les status invalides
UPDATE artists SET status = 'active' WHERE status NOT IN ('active', 'inactive', 'archived');
UPDATE events SET status = 'planned' WHERE status NOT IN ('planned', 'confirmed', 'cancelled', 'completed');
```

### Supprimer les orphelins
```sql
-- Supprimer les spotify_data sans artist
DELETE FROM spotify_data WHERE artist_id NOT IN (SELECT id FROM artists);

-- Supprimer les social_media_data sans artist
DELETE FROM social_media_data WHERE artist_id NOT IN (SELECT id FROM artists);
```

---

## 📊 Validation post-export

Avant de lancer l'import, vérifiez la cohérence :

```bash
# Compter les lignes dans chaque CSV
wc -l *.csv

# Vérifier les colonnes
head -n 1 artists.csv
head -n 1 spotify_data.csv
```

---

## 🚀 Prêt pour l'import

Une fois vos fichiers placés ici :
1. **SQL direct** : Utiliser `02-import-full.sql` (adapter les chemins)
2. **API TypeScript** : Exécuter `npx tsx database/import-via-api.ts`

Bonne chance ! 🎉




