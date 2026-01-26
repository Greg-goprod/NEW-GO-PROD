# 🔄 Guide d'import de données - Go-Prod-AURA

## 📋 Vue d'ensemble

Ce dossier contient tous les scripts nécessaires pour importer les données de l'ancienne base Supabase vers **Go-Prod-AURA**.

## 📂 Structure des fichiers

```
database/
├── README-IMPORT.md                    # Ce fichier
├── 01-schema-current.sql              # Schéma actuel de Go-Prod-AURA
├── 02-import-full.sql                 # Script SQL d'import complet
├── 03-validation.sql                  # Requêtes de validation post-import
├── import-via-api.ts                  # Script Node/TS pour import via API
└── old-data/                          # Placer ici vos exports
    ├── artists.csv (ou .sql)
    ├── spotify_data.csv
    ├── social_media_data.csv
    └── ...
```

## 🎯 Workflow d'import

### Étape 1 : Préparation
1. Placez votre export SQL ou CSV dans `database/old-data/`
2. Vérifiez le schéma actuel avec `01-schema-current.sql`
3. Adaptez `02-import-full.sql` selon vos données

### Étape 2 : Import
**Option A : SQL direct (recommandé pour gros volumes)**
```bash
# Via Supabase SQL Editor
1. Ouvrir le SQL Editor dans Supabase Dashboard
2. Copier-coller le contenu de 02-import-full.sql
3. Exécuter
```

**Option B : Script TypeScript (pour import contrôlé)**
```bash
cd go-prod-aura
npm install @supabase/supabase-js papaparse
tsx database/import-via-api.ts
```

### Étape 3 : Validation
```bash
# Exécuter les vérifications
# Via SQL Editor : copier-coller 03-validation.sql
```

## ⚠️ Points d'attention

### Multi-tenant
- Si `company_id` n'existe pas dans l'ancien dump, créer d'abord une company :
```sql
INSERT INTO public.companies (id, name, created_at)
VALUES ('00000000-0000-0000-0000-000000000001', 'GC Entertainment', NOW());
```

### UUID vs Auto-increment
- Le schéma actuel utilise des UUID (`gen_random_uuid()`)
- Si l'ancien schéma utilisait des INT, mapper les IDs

### Relations
- Ordre d'import impératif :
  1. companies
  2. profiles
  3. artists
  4. spotify_data (FK: artist_id)
  5. social_media_data (FK: artist_id)
  6. events
  7. event_artists (FK: event_id, artist_id)
  8. tags
  9. artist_tags

## 📊 Schéma détecté (actuel)

### Table: artists
```typescript
{
  id: string (UUID)
  name: string
  status: 'active' | 'inactive' | 'archived'
  created_at: timestamp
  email?: string
  phone?: string
  location?: string
  company_id?: string (FK → companies.id)
}
```

### Table: spotify_data
```typescript
{
  id: string (UUID)
  artist_id: string (FK → artists.id, UNIQUE)
  image_url?: string
  followers?: number
  popularity?: number
  external_url?: string
  genres?: string[] (jsonb)
}
```

### Table: social_media_data
```typescript
{
  id: string (UUID)
  artist_id: string (FK → artists.id, UNIQUE)
  instagram_url?: string
  facebook_url?: string
  youtube_url?: string
  tiktok_url?: string
  twitter_url?: string
}
```

### Table: profiles
```typescript
{
  id: string (UUID, = auth.users.id)
  full_name?: string
  avatar_url?: string
  role: 'owner' | 'admin' | 'manager' | 'user'
  company_id?: string (FK → companies.id)
}
```

## 🔧 RPC Functions utilisées

- `fetch_artists_page(p_page, p_page_size, p_search, p_status)`
- `count_artists_filtered(p_search, p_status)`

Ces fonctions doivent être créées avant l'utilisation de l'app.

## 📞 Support

En cas d'erreur d'import :
1. Vérifier les logs Supabase (Dashboard > Logs)
2. Vérifier les contraintes FK (`03-validation.sql`)
3. Désactiver temporairement RLS si bloqué (dev uniquement)




