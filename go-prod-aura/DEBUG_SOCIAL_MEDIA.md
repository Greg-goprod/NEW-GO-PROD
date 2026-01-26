# 🔍 Debug : Icônes réseaux sociaux non reliées

## Problème identifié

Les icônes des réseaux sociaux sur la page détail artiste ne sont pas reliées aux données de la table `social_media_data`.

## Cause probable

**Supabase retourne `social_media_data` comme un tableau `[{...}]` au lieu d'un objet `{...}`**

Avec la requête :
```typescript
.select("*, spotify_data(*), social_media_data(*)")
```

Supabase peut retourner :
```json
{
  "id": "123",
  "name": "Naza",
  "spotify_data": [{...}],           // ← Tableau !
  "social_media_data": [{...}]       // ← Tableau !
}
```

Au lieu de :
```json
{
  "id": "123",
  "name": "Naza",
  "spotify_data": {...},             // ← Objet
  "social_media_data": {...}         // ← Objet
}
```

## Solution appliquée

### 1. Normalisation dans `detail.tsx`

Ajout d'une normalisation automatique :

```typescript
// Normaliser les données si ce sont des tableaux
if (data) {
  // Normaliser spotify_data
  if (Array.isArray(data.spotify_data)) {
    data.spotify_data = data.spotify_data.length > 0 ? data.spotify_data[0] : null;
  }
  
  // Normaliser social_media_data
  if (Array.isArray(data.social_media_data)) {
    data.social_media_data = data.social_media_data.length > 0 ? data.social_media_data[0] : null;
  }
}
```

### 2. Logs de debug ajoutés

```typescript
console.log('🔍 Artist data:', data);
console.log('🔍 Social media data (brut):', data?.social_media_data);
console.log('✅ Social media data (normalisé):', data.social_media_data);
```

## Comment tester

### 1. Ouvrir la page détail de Naza

```
http://localhost:5173/app/artistes/detail/<id-de-naza>
```

### 2. Ouvrir la console du navigateur (F12)

Vous devriez voir :
```
🔍 Artist data: { id: "...", name: "Naza", ... }
🔍 Social media data (brut): [{...}] ou {...}
⚠️ social_media_data est un tableau, normalisation...
✅ Social media data (normalisé): {...}
```

### 3. Vérifier les données en SQL

Exécuter le script `sql/debug_social_media_naza.sql` dans Supabase SQL Editor.

**Résultat attendu** :
- Requête 1 : Trouve l'ID de Naza
- Requête 2 : Affiche tous les liens sociaux de Naza
- Requête 3 : Compte le nombre de liens (devrait être > 0)
- Requête 4 : Simule exactement la requête du code
- Requête 5 : Vérifie qu'il y a bien 1 seule ligne (relation 1-to-1)

### 4. Vérifier les icônes

Sur la page détail, les icônes devraient maintenant :
- Être **colorées** et **cliquables** si le lien existe
- Être **grisées** et **non cliquables** si le lien n'existe pas

## Structure de la table social_media_data

```sql
CREATE TABLE public.social_media_data (
  artist_id UUID PRIMARY KEY REFERENCES public.artists(id),  -- Relation 1-to-1
  instagram_url TEXT,
  facebook_url TEXT,
  twitter_url TEXT,
  youtube_url TEXT,
  tiktok_url TEXT,
  website_url TEXT,
  threads_url TEXT,
  soundcloud_url TEXT,
  bandcamp_url TEXT,
  wikipedia_url TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_checked_at TIMESTAMPTZ
);
```

## Exemple de données attendues

Pour l'artiste "Naza", la table `social_media_data` devrait contenir :

```sql
artist_id: <uuid-de-naza>
instagram_url: https://instagram.com/naza
facebook_url: https://facebook.com/nazaofficiel
twitter_url: https://twitter.com/naza
youtube_url: https://youtube.com/@naza
tiktok_url: NULL
website_url: https://naza-officiel.com
threads_url: NULL
soundcloud_url: https://soundcloud.com/naza
bandcamp_url: NULL
wikipedia_url: https://fr.wikipedia.org/wiki/Naza_(rappeur)
```

## Si les icônes ne s'affichent toujours pas

### Vérifier 1 : Les données existent-elles ?

```sql
SELECT * FROM public.social_media_data 
WHERE artist_id = (
  SELECT id FROM public.artists WHERE LOWER(name) LIKE '%naza%' LIMIT 1
);
```

Si **0 ligne** → Les données n'ont pas été créées par le backend Supabase
Si **1 ligne** avec URLs NULL → Les URLs n'ont pas été enrichies

### Vérifier 2 : La normalisation fonctionne-t-elle ?

Dans la console du navigateur, vérifier :
```javascript
// Si c'est un tableau avant normalisation
⚠️ social_media_data est un tableau, normalisation...

// Si c'est déjà un objet
// Pas de warning, juste :
✅ Social media data (normalisé): {...}
```

### Vérifier 3 : Le type TypeScript est-il correct ?

Dans `detail.tsx`, le type devrait être :

```typescript
social_media_data?: {
  instagram_url?: string;
  facebook_url?: string;
  twitter_url?: string;
  youtube_url?: string;
  tiktok_url?: string;
  website_url?: string;
  threads_url?: string;
  soundcloud_url?: string;
  bandcamp_url?: string;
  wikipedia_url?: string;
}
```

## Fichiers modifiés

- ✅ `src/pages/app/artistes/detail.tsx` - Normalisation ajoutée
- ✅ `sql/debug_social_media_naza.sql` - Script de debug créé
- ✅ `DEBUG_SOCIAL_MEDIA.md` - Ce fichier

## Prochaine étape

1. **Recharger la page** de détail de Naza (F5)
2. **Ouvrir la console** (F12)
3. **Vérifier les logs** :
   - Les données brutes
   - La normalisation
   - Le résultat final
4. **Vérifier visuellement** que les icônes sont maintenant colorées

Si après cela les icônes ne sont toujours pas reliées, exécutez le script SQL `debug_social_media_naza.sql` et partagez les résultats.

## Note importante

Cette normalisation est maintenant appliquée **automatiquement** à chaque chargement de la page détail artiste. Elle gère à la fois `spotify_data` et `social_media_data`.

---

**Date** : 2025-10-24
**Statut** : ✅ Fix appliqué, en attente de test



