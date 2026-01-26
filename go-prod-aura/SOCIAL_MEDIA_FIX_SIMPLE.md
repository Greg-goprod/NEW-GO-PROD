# ⚡ FIX RAPIDE : Icônes réseaux sociaux

## 🔴 Problème

Les icônes des réseaux sociaux sont **toutes grisées** sur la page détail artiste, alors que les données **existent dans la base**.

## ✅ Solution en 3 étapes

### 1️⃣ Ouvrir Supabase SQL Editor

Dashboard → Votre projet → **SQL Editor** (menu gauche)

### 2️⃣ Copier-coller ce script

```sql
-- Supprimer les anciennes politiques
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.social_media_data;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.social_media_data;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.social_media_data;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.social_media_data;

-- Créer les nouvelles politiques
CREATE POLICY "social_media_read_policy"
ON public.social_media_data FOR SELECT TO authenticated USING (true);

CREATE POLICY "social_media_insert_policy"
ON public.social_media_data FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "social_media_update_policy"
ON public.social_media_data FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "social_media_delete_policy"
ON public.social_media_data FOR DELETE TO authenticated USING (true);

-- Activer RLS
ALTER TABLE public.social_media_data ENABLE ROW LEVEL SECURITY;
```

### 3️⃣ Cliquer sur "Run"

Puis **recharger la page de Naza** (F5) dans votre navigateur.

## 🎉 Résultat attendu

**AVANT** (actuel) :
- ⚪ Toutes les icônes grisées
- Console : `Social media data: null`

**APRÈS** (fix appliqué) :
- 🟢 Instagram (coloré, cliquable)
- 🟢 Twitter/X (coloré, cliquable)
- 🟢 YouTube (coloré, cliquable)
- 🟢 SoundCloud (coloré, cliquable)
- Console : `Social media data: {instagram_url: "https://...", ...}`

## 🔍 Pourquoi ça ne marchait pas ?

Les **politiques RLS (Row Level Security)** bloquaient l'accès aux données depuis l'application, même si elles existaient dans la base.

Le script ci-dessus crée les bonnes politiques pour permettre la lecture des données.

---

**Temps estimé** : 30 secondes  
**Pas de redémarrage nécessaire** : Effet immédiat ⚡



