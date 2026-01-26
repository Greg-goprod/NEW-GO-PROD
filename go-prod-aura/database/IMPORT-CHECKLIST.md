# ✅ Checklist d'Import - Go-Prod-AURA

## 📋 Avant l'import

### 1. Préparation de l'environnement

- [ ] **Backup de la nouvelle base** (Go-Prod-AURA)
  ```bash
  # Via Supabase Dashboard > Settings > Database > Backup
  # Ou via CLI :
  pg_dump -h db.xxxxx.supabase.co -U postgres -d postgres > goprod_aura_backup.sql
  ```

- [ ] **Vérifier les variables d'environnement**
  ```bash
  echo $VITE_SUPABASE_URL
  echo $SUPABASE_SERVICE_KEY  # Pour import via API
  ```

- [ ] **Créer le dossier database/**
  ```bash
  cd go-prod-aura
  mkdir -p database/old-data
  ```

---

### 2. Export depuis l'ancienne base

- [ ] **Se connecter à l'ancienne base Supabase**
  - Ouvrir Dashboard > SQL Editor

- [ ] **Exporter les tables**
  - [ ] `artists.csv`
  - [ ] `spotify_data.csv`
  - [ ] `social_media_data.csv`
  - [ ] `events.csv`
  - [ ] `event_artists.csv`
  - [ ] `companies.csv` (si multi-tenant)
  - [ ] `profiles.csv` (si utilisateurs)

- [ ] **Placer les fichiers dans `database/old-data/`**

---

### 3. Analyse des données

- [ ] **Vérifier l'encodage** (doit être UTF-8)
  ```bash
  file -i database/old-data/*.csv
  ```

- [ ] **Compter les lignes**
  ```bash
  wc -l database/old-data/*.csv
  ```

- [ ] **Vérifier les colonnes**
  ```bash
  head -n 1 database/old-data/artists.csv
  ```

- [ ] **Identifier les mappings nécessaires**
  - Ouvrir `MAPPING-GUIDE.md`
  - Noter les transformations requises

---

### 4. Nettoyage des données (optionnel)

- [ ] **Supprimer les doublons**
- [ ] **Corriger les status invalides**
- [ ] **Normaliser les URLs**
- [ ] **Supprimer les orphelins FK**
- [ ] **Valider les UUID**

Voir `MAPPING-GUIDE.md` pour les scripts SQL.

---

## 🚀 Pendant l'import

### Option A : Import SQL direct

- [ ] **Désactiver RLS temporairement** (dev uniquement)
  ```sql
  ALTER TABLE public.artists DISABLE ROW LEVEL SECURITY;
  -- Répéter pour toutes les tables
  ```

- [ ] **Adapter `02-import-full.sql`**
  - Remplacer les données de test par vos données
  - Vérifier les chemins CSV si utilisation de `COPY`
  - Ajuster les mappings de colonnes

- [ ] **Exécuter dans SQL Editor**
  ```sql
  -- Copier-coller le contenu de 02-import-full.sql
  ```

- [ ] **Surveiller les NOTICE/WARNING dans les logs**

---

### Option B : Import via API (TypeScript)

- [ ] **Installer les dépendances**
  ```bash
  cd go-prod-aura
  npm install @supabase/supabase-js papaparse
  npm install --save-dev @types/papaparse tsx
  ```

- [ ] **Configurer les variables d'environnement**
  ```bash
  # Créer un fichier .env.import
  VITE_SUPABASE_URL=https://xxxxx.supabase.co
  SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
  ```

- [ ] **Vérifier les chemins de fichiers** dans `import-via-api.ts`

- [ ] **Exécuter le script**
  ```bash
  npx tsx database/import-via-api.ts
  ```

- [ ] **Surveiller les logs en temps réel**

---

## ✅ Après l'import

### 1. Validation des données

- [ ] **Exécuter `03-validation.sql`**
  ```bash
  # Via SQL Editor, copier-coller le contenu
  ```

- [ ] **Vérifier le rapport de validation**
  - Total d'enregistrements importés
  - Nombre d'orphelins (doit être 0)
  - Status invalides (doit être 0)
  - Couverture Spotify/Social Media

- [ ] **Vérifier visuellement dans l'app**
  - Aller sur `/app/artistes`
  - Vérifier qu'au moins 5 artistes s'affichent
  - Cliquer sur un artiste pour voir le détail
  - Vérifier les images Spotify
  - Vérifier les liens sociaux

---

### 2. Tests fonctionnels

- [ ] **Recherche d'artistes**
  - Taper un nom dans la barre de recherche
  - Vérifier les résultats

- [ ] **Filtrage par status**
  - Filtrer par `active`, `inactive`, `archived`
  - Vérifier les résultats

- [ ] **Pagination**
  - Naviguer entre les pages
  - Vérifier le compteur

- [ ] **Vue Grid / List**
  - Basculer entre les vues
  - Vérifier l'affichage

- [ ] **Détail d'un artiste**
  - Ouvrir un artiste
  - Vérifier toutes les sections :
    - Profil
    - Spotify stats
    - Social media links
    - Contact info

---

### 3. Tests des RPC Functions

- [ ] **fetch_artists_page**
  ```sql
  SELECT * FROM fetch_artists_page(0, 10, NULL, NULL);
  ```

- [ ] **count_artists_filtered**
  ```sql
  SELECT count_artists_filtered(NULL, 'active');
  ```

- [ ] **Vérifier les performances**
  - Mesurer le temps de réponse (< 500ms attendu)

---

### 4. Réactivation de la sécurité

- [ ] **Réactiver RLS**
  ```sql
  ALTER TABLE public.artists ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.spotify_data ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.social_media_data ENABLE ROW LEVEL SECURITY;
  -- Répéter pour toutes les tables
  ```

- [ ] **Vérifier les politiques RLS**
  ```sql
  SELECT tablename, policyname, roles, cmd, qual
  FROM pg_policies
  WHERE schemaname = 'public';
  ```

- [ ] **Tester l'accès avec un utilisateur non-admin**

---

### 5. Nettoyage

- [ ] **Supprimer les tables temporaires**
  ```sql
  DROP TABLE IF EXISTS temp_artist_mapping;
  ```

- [ ] **Supprimer les fichiers CSV sensibles**
  ```bash
  rm -f database/old-data/*.csv
  # Ou les déplacer dans un dossier sécurisé
  ```

- [ ] **Commit des scripts d'import**
  ```bash
  git add database/
  git commit -m "Add database import scripts"
  ```

---

## 📊 Rapport final

### Enregistrements importés

| Table | Nombre | Status |
|-------|--------|--------|
| companies | ___ | ⬜ |
| profiles | ___ | ⬜ |
| artists | ___ | ⬜ |
| spotify_data | ___ | ⬜ |
| social_media_data | ___ | ⬜ |
| events | ___ | ⬜ |
| event_artists | ___ | ⬜ |
| tags | ___ | ⬜ |
| artist_tags | ___ | ⬜ |

### Problèmes rencontrés

- [ ] Aucun problème ✅
- [ ] Orphelins détectés : ___
- [ ] Status invalides : ___
- [ ] URLs invalides : ___
- [ ] Doublons : ___
- [ ] Erreurs FK : ___

### Actions correctives

1. ___________________________
2. ___________________________
3. ___________________________

---

## 🆘 En cas de problème

### Rollback complet

```sql
-- Supprimer toutes les données importées
BEGIN;

TRUNCATE TABLE public.artist_tags CASCADE;
TRUNCATE TABLE public.tags CASCADE;
TRUNCATE TABLE public.event_artists CASCADE;
TRUNCATE TABLE public.events CASCADE;
TRUNCATE TABLE public.social_media_data CASCADE;
TRUNCATE TABLE public.spotify_data CASCADE;
TRUNCATE TABLE public.artists CASCADE;
TRUNCATE TABLE public.profiles CASCADE;
TRUNCATE TABLE public.companies CASCADE;

COMMIT;

-- Puis restaurer depuis le backup
-- psql -h db.xxxxx.supabase.co -U postgres -d postgres < goprod_aura_backup.sql
```

### Logs Supabase

- Dashboard > Logs > Postgres Logs
- Filtrer par `ERROR` ou `WARNING`

### Support

- Documentation Supabase : https://supabase.com/docs
- Discord Supabase : https://discord.supabase.com
- GitHub Issues : https://github.com/supabase/supabase/issues

---

## ✅ Import terminé !

**Date :** _______________  
**Durée :** _______________  
**Par :** _______________

🎉 Félicitations ! La migration est terminée.

**Prochaines étapes :**
1. Configurer les buckets Storage (artist-photos, contracts, etc.)
2. Importer les fichiers (photos, documents)
3. Configurer les webhooks (si nécessaire)
4. Migrer les autres modules (Production, Administration, etc.)




