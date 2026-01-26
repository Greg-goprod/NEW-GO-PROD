# 🔧 Fix : "schema cron does not exist"

## ❌ **ERREUR**

```
ERROR: 3F000: schema "cron" does not exist
LINE 11: SELECT cron.schedule(
```

## 🎯 **CAUSE**

L'extension **pg_cron** n'est **pas activée** dans votre base Supabase.

---

## ✅ **SOLUTION RAPIDE (2 MINUTES)**

### **Option 1 : Script Tout-en-Un** (Recommandé)

**Fichier** : `sql/activate_pg_cron_and_configure.sql`

**Étapes** :
1. Ouvrez **Supabase > SQL Editor**
2. Copiez le contenu de `activate_pg_cron_and_configure.sql`
3. **⚠️ Modifiez les 2 lignes** :
   - Ligne 42 : URL Supabase
   - Ligne 45 : Service Role Key
4. Cliquez sur **RUN**

**C'est tout !** ✅

Le script va :
- ✅ Activer l'extension `pg_cron`
- ✅ Configurer le cron job
- ✅ Vérifier que tout fonctionne

---

### **Option 2 : Étape par Étape**

#### **Étape 1 : Activer pg_cron**

Dans **Supabase SQL Editor** :

```sql
CREATE EXTENSION IF NOT EXISTS pg_cron;
```

Cliquez sur **RUN**.

**Vérification** :
```sql
SELECT * FROM pg_extension WHERE extname = 'pg_cron';
```

Vous devriez voir 1 ligne ✅

---

#### **Étape 2 : Configurer le Cron**

Maintenant vous pouvez exécuter `sql/configure_cron_job.sql` (avec vos valeurs).

---

## 🔍 **VÉRIFIER QUE ÇA MARCHE**

```sql
-- 1. L'extension est activée
SELECT extname FROM pg_extension WHERE extname = 'pg_cron';

-- 2. Le cron job existe
SELECT * FROM cron.job WHERE jobname = 'spotify-daily-sync';

-- Résultat attendu : 1 ligne avec votre job
```

---

## 📊 **TESTER IMMÉDIATEMENT**

Pour tester sans attendre 12h00 :

```sql
SELECT net.http_post(
  url := 'https://VOTRE-PROJECT.supabase.co/functions/v1/spotify_daily_sync',
  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer VOTRE-SERVICE-ROLE-KEY'
  ),
  body := '{}'::jsonb
);
```

Puis vérifiez :

```sql
SELECT COUNT(*) FROM spotify_history;
-- Devrait être > 0 si la sync a fonctionné
```

---

## ❓ **FAQ**

### Q : Pourquoi pg_cron n'était pas activé ?
**R :** Supabase ne l'active pas par défaut. C'est une extension optionnelle.

### Q : Est-ce que c'est sûr d'activer pg_cron ?
**R :** Oui, c'est une extension PostgreSQL officielle maintenue par Citus Data (Microsoft).

### Q : Y a-t-il des limites ?
**R :** Non, pg_cron est illimité dans Supabase. Vous pouvez créer autant de cron jobs que nécessaire.

---

## 🎉 **RÉSULTAT**

Une fois pg_cron activé et le cron configuré :

✅ **Synchronisation automatique** tous les jours à 12h00 UTC
✅ **Historique complet** enregistré dans `spotify_history`
✅ **Graphiques fonctionnels** sur la page détail artiste
✅ **Zéro maintenance** requise

---

## 📚 **PROCHAINES ÉTAPES**

1. ✅ Activer pg_cron (fait !)
2. ✅ Configurer le cron job (fait !)
3. 🎯 Tester avec une sync manuelle
4. 🎯 Vérifier le graphique sur la page détail artiste
5. 🎯 Attendre demain 12h00 pour la première sync auto

---

**Le système est maintenant opérationnel !** 🚀



