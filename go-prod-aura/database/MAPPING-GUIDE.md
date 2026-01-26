# 🗺️ Guide de Mapping des Données

## 📋 Vue d'ensemble

Ce guide vous aide à mapper les colonnes de votre ancienne base Supabase vers le nouveau schéma **Go-Prod-AURA**.

---

## 🔄 Mapping des tables

### 1. TABLE: artists

| Ancienne colonne | Nouvelle colonne | Type | Transformation | Obligatoire |
|------------------|------------------|------|----------------|-------------|
| `id` | `id` | UUID | Préserver si possible | ✅ |
| `name` / `artist_name` | `name` | TEXT | Aucune | ✅ |
| `statut` / `status` | `status` | TEXT | Voir mapping status ci-dessous | ✅ |
| `mail` / `email` | `email` | TEXT | Validation format email | ❌ |
| `tel` / `phone` / `telephone` | `phone` | TEXT | Normaliser format (+XX XX XXX XX XX) | ❌ |
| `lieu` / `location` / `ville` | `location` | TEXT | Aucune | ❌ |
| `company_id` / `tenant_id` | `company_id` | UUID | Utiliser DEFAULT si absent | ✅ |
| `created_at` / `date_creation` | `created_at` | TIMESTAMP | Format ISO 8601 | ❌ |

#### Mapping des status
```javascript
const statusMap = {
  'actif': 'active',
  'active': 'active',
  'en activité': 'active',
  
  'inactif': 'inactive',
  'inactive': 'inactive',
  'pause': 'inactive',
  
  'archivé': 'archived',
  'archived': 'archived',
  'supprimé': 'archived',
  'deleted': 'archived'
};
```

**SQL de transformation :**
```sql
UPDATE old_artists
SET status = CASE
  WHEN status IN ('actif', 'active', 'en activité') THEN 'active'
  WHEN status IN ('inactif', 'inactive', 'pause') THEN 'inactive'
  WHEN status IN ('archivé', 'archived', 'supprimé', 'deleted') THEN 'archived'
  ELSE 'active'
END;
```

---

### 2. TABLE: spotify_data

| Ancienne colonne | Nouvelle colonne | Type | Transformation | Obligatoire |
|------------------|------------------|------|----------------|-------------|
| `id` | `id` | UUID | Générer si absent | ✅ |
| `artist_id` / `artiste_id` | `artist_id` | UUID | FK → artists.id | ✅ |
| `image` / `image_url` / `photo` | `image_url` | TEXT | Valider URL | ❌ |
| `followers` / `abonnes` | `followers` | INTEGER | Convertir en nombre | ❌ |
| `popularity` / `popularite` | `popularity` | INTEGER | Vérifier 0-100 | ❌ |
| `spotify_url` / `external_url` / `url` | `external_url` | TEXT | Valider URL | ❌ |
| `genres` / `styles` | `genres` | JSONB | Convertir en tableau JSON | ❌ |

#### Transformation des genres
**Si colonne `genres` est une chaîne séparée par des virgules :**
```sql
-- Exemple : "hip hop, electronic, trip hop" → ["hip hop", "electronic", "trip hop"]
UPDATE old_spotify_data
SET genres = jsonb_build_array(string_to_array(genres, ', '));
```

**Si colonne `genres` est déjà JSON mais avec guillemets simples :**
```sql
UPDATE old_spotify_data
SET genres = replace(genres, '''', '"')::jsonb;
```

---

### 3. TABLE: social_media_data

| Ancienne colonne | Nouvelle colonne | Type | Transformation | Obligatoire |
|------------------|------------------|------|----------------|-------------|
| `id` | `id` | UUID | Générer si absent | ✅ |
| `artist_id` | `artist_id` | UUID | FK → artists.id | ✅ |
| `instagram` / `instagram_url` | `instagram_url` | TEXT | Ajouter `https://` si absent | ❌ |
| `facebook` / `facebook_url` | `facebook_url` | TEXT | Ajouter `https://` si absent | ❌ |
| `youtube` / `youtube_url` | `youtube_url` | TEXT | Ajouter `https://` si absent | ❌ |
| `tiktok` / `tiktok_url` | `tiktok_url` | TEXT | Ajouter `https://` si absent | ❌ |
| `twitter` / `x` / `twitter_url` | `twitter_url` | TEXT | Ajouter `https://` si absent | ❌ |

#### Normalisation des URLs
```sql
-- Ajouter https:// si manquant
UPDATE old_social_media_data
SET 
  instagram_url = CASE 
    WHEN instagram_url IS NOT NULL AND instagram_url NOT LIKE 'http%' 
    THEN 'https://' || instagram_url 
    ELSE instagram_url 
  END,
  facebook_url = CASE 
    WHEN facebook_url IS NOT NULL AND facebook_url NOT LIKE 'http%' 
    THEN 'https://' || facebook_url 
    ELSE facebook_url 
  END;
-- Répéter pour youtube, tiktok, twitter
```

---

### 4. TABLE: events

| Ancienne colonne | Nouvelle colonne | Type | Transformation | Obligatoire |
|------------------|------------------|------|----------------|-------------|
| `id` | `id` | UUID | Préserver si possible | ✅ |
| `name` / `nom` / `event_name` | `name` | TEXT | Aucune | ✅ |
| `date` / `event_date` / `date_evenement` | `event_date` | DATE | Format YYYY-MM-DD | ✅ |
| `lieu` / `venue` / `salle` | `venue` | TEXT | Aucune | ❌ |
| `ville` / `city` | `city` | TEXT | Aucune | ❌ |
| `pays` / `country` | `country` | TEXT | Code ISO ou nom complet | ❌ |
| `statut` / `status` | `status` | TEXT | Voir mapping status ci-dessous | ✅ |
| `company_id` / `tenant_id` | `company_id` | UUID | Utiliser DEFAULT si absent | ✅ |

#### Mapping des status
```javascript
const eventStatusMap = {
  'planifié': 'planned',
  'planned': 'planned',
  'prévu': 'planned',
  'à venir': 'planned',
  
  'confirmé': 'confirmed',
  'confirmed': 'confirmed',
  'validé': 'confirmed',
  
  'annulé': 'cancelled',
  'cancelled': 'cancelled',
  'canceled': 'cancelled',
  
  'terminé': 'completed',
  'completed': 'completed',
  'fini': 'completed',
  'passé': 'completed'
};
```

**SQL de transformation :**
```sql
UPDATE old_events
SET status = CASE
  WHEN status IN ('planifié', 'planned', 'prévu', 'à venir') THEN 'planned'
  WHEN status IN ('confirmé', 'confirmed', 'validé') THEN 'confirmed'
  WHEN status IN ('annulé', 'cancelled', 'canceled') THEN 'cancelled'
  WHEN status IN ('terminé', 'completed', 'fini', 'passé') THEN 'completed'
  ELSE 'planned'
END;
```

---

### 5. TABLE: event_artists (relation many-to-many)

| Ancienne colonne | Nouvelle colonne | Type | Transformation | Obligatoire |
|------------------|------------------|------|----------------|-------------|
| `event_id` / `evenement_id` | `event_id` | UUID | FK → events.id | ✅ |
| `artist_id` / `artiste_id` | `artist_id` | UUID | FK → artists.id | ✅ |
| `ordre` / `performance_order` / `position` | `performance_order` | INTEGER | Convertir en nombre | ❌ |
| `cachet` / `fee` / `fee_amount` | `fee_amount` | NUMERIC(10,2) | Convertir en décimal | ❌ |
| `monnaie` / `currency` / `fee_currency` | `fee_currency` | TEXT | Défaut : `CHF` | ❌ |

#### Normalisation des montants
```sql
-- Supprimer les symboles monétaires et convertir
UPDATE old_event_artists
SET fee_amount = CAST(REPLACE(REPLACE(fee_amount, 'CHF', ''), ' ', '') AS NUMERIC);
```

---

## 🔧 Scripts de transformation complets

### Exemple 1 : Migrer depuis un schéma légèrement différent

```sql
-- Supposons que l'ancienne table s'appelle "artistes" avec des colonnes en français

-- 1. Créer une table temporaire de mapping
CREATE TEMP TABLE artist_mapping AS
SELECT
  id::uuid as old_id,
  nom as name,
  CASE
    WHEN statut = 'actif' THEN 'active'
    WHEN statut = 'inactif' THEN 'inactive'
    ELSE 'archived'
  END as status,
  mail as email,
  telephone as phone,
  ville || ' - ' || pays as location,
  '00000000-0000-0000-0000-000000000001'::uuid as company_id,
  COALESCE(date_creation, NOW()) as created_at
FROM old_schema.artistes;

-- 2. Insérer dans la nouvelle table
INSERT INTO public.artists (id, name, status, email, phone, location, company_id, created_at)
SELECT * FROM artist_mapping
ON CONFLICT (id) DO NOTHING;
```

### Exemple 2 : Convertir les genres Spotify

```sql
-- Si genres est une chaîne : "hip hop, electronic"
-- Convertir en JSONB : ["hip hop", "electronic"]

CREATE TEMP TABLE spotify_mapping AS
SELECT
  gen_random_uuid() as id,
  artist_id::uuid,
  image_url,
  followers::integer,
  popularity::integer,
  spotify_url as external_url,
  jsonb_build_array(
    SELECT trim(unnest(string_to_array(genres, ',')))
  ) as genres,
  COALESCE(created_at, NOW()) as created_at
FROM old_schema.spotify_data;

INSERT INTO public.spotify_data
SELECT * FROM spotify_mapping
ON CONFLICT (artist_id) DO NOTHING;
```

---

## 🧹 Nettoyage des données

### Supprimer les doublons

```sql
-- Doublons dans artists (basé sur le nom)
WITH duplicates AS (
  SELECT
    id,
    ROW_NUMBER() OVER (PARTITION BY name ORDER BY created_at DESC) as rn
  FROM public.artists
)
DELETE FROM public.artists
WHERE id IN (SELECT id FROM duplicates WHERE rn > 1);
```

### Supprimer les valeurs invalides

```sql
-- Supprimer les artists sans nom
DELETE FROM public.artists WHERE name IS NULL OR name = '';

-- Supprimer les spotify_data avec popularity hors limites
DELETE FROM public.spotify_data WHERE popularity < 0 OR popularity > 100;

-- Supprimer les URLs invalides
UPDATE public.social_media_data
SET instagram_url = NULL
WHERE instagram_url IS NOT NULL AND instagram_url NOT LIKE 'http%';
```

### Normaliser les formats

```sql
-- Uniformiser les emails (lowercase)
UPDATE public.artists
SET email = LOWER(email)
WHERE email IS NOT NULL;

-- Uniformiser les pays
UPDATE public.events
SET country = CASE
  WHEN country IN ('CH', 'Suisse', 'Switzerland') THEN 'Switzerland'
  WHEN country IN ('FR', 'France') THEN 'France'
  WHEN country IN ('UK', 'GB', 'United Kingdom') THEN 'United Kingdom'
  ELSE country
END;
```

---

## 🔍 Vérifications pré-import

### Checklist SQL

```sql
-- 1. Vérifier les UUID valides
SELECT COUNT(*) FROM old_artists WHERE id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- 2. Vérifier les status invalides
SELECT DISTINCT status FROM old_artists WHERE status NOT IN ('active', 'inactive', 'archived');

-- 3. Vérifier les orphelins FK
SELECT COUNT(*) FROM old_spotify_data s
LEFT JOIN old_artists a ON a.id = s.artist_id
WHERE a.id IS NULL;

-- 4. Vérifier les doublons
SELECT name, COUNT(*) FROM old_artists GROUP BY name HAVING COUNT(*) > 1;

-- 5. Vérifier les valeurs NULL
SELECT COUNT(*) FROM old_artists WHERE name IS NULL;
```

---

## 📊 Export optimisé depuis l'ancienne base

### Script SQL complet d'export

```sql
-- Export artists avec colonnes mappées
COPY (
  SELECT
    id,
    name,
    CASE
      WHEN status IN ('actif', 'active') THEN 'active'
      WHEN status IN ('inactif', 'inactive') THEN 'inactive'
      ELSE 'archived'
    END as status,
    email,
    phone,
    location,
    company_id,
    created_at
  FROM artists
  ORDER BY created_at
) TO '/tmp/artists_clean.csv' WITH CSV HEADER;

-- Export spotify_data avec genres au format JSON
COPY (
  SELECT
    id,
    artist_id,
    image_url,
    followers,
    popularity,
    external_url,
    jsonb_build_array(genres) as genres,
    created_at
  FROM spotify_data
  ORDER BY created_at
) TO '/tmp/spotify_data_clean.csv' WITH CSV HEADER;
```

---

## 🚀 Prêt pour l'import

Une fois vos données nettoyées et mappées :

1. **Placer les fichiers CSV dans** `database/old-data/`
2. **Vérifier avec** `03-validation.sql` (sur l'ancienne base)
3. **Lancer l'import** :
   - SQL : `02-import-full.sql`
   - API : `npx tsx database/import-via-api.ts`
4. **Valider post-import** : `03-validation.sql` (sur la nouvelle base)

Bonne migration ! 🎉




