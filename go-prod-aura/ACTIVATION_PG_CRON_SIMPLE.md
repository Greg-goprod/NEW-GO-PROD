# ⚡ Activation pg_cron - 2 Minutes

## 🎯 **PROBLÈME**

```
ERROR: schema "cron" does not exist
```

## ✅ **SOLUTION**

Activez l'extension `pg_cron` dans Supabase.

---

## 📋 **ÉTAPE 1 : Activer pg_cron**

**Supabase Dashboard** > **SQL Editor** > **New Query**

Copiez/collez :

```sql
CREATE EXTENSION IF NOT EXISTS pg_cron;
```

Cliquez **RUN** ✅

---

## 📋 **ÉTAPE 2 : Vérifier**

```sql
SELECT * FROM pg_extension WHERE extname = 'pg_cron';
```

**Résultat attendu** : 1 ligne

✅ **C'est bon !**

---

## 📋 **ÉTAPE 3 : Configurer le Cron**

Maintenant utilisez le fichier :
`sql/activate_pg_cron_and_configure.sql`

**N'oubliez pas de remplacer** :
- Ligne 42 : URL Supabase
- Ligne 45 : Service Role Key

**RUN** ✅

---

## 📋 **ÉTAPE 4 : Vérifier le Cron**

```sql
SELECT * FROM cron.job WHERE jobname = 'spotify-daily-sync';
```

**Résultat attendu** : 1 ligne avec votre job

✅ **Terminé !**

---

## 🎉 **C'EST TOUT !**

Le système est maintenant actif.

**Prochaine sync** : Demain à 12h00 UTC

**Pour tester maintenant** : Voir `FIX_CRON_ERROR.md`

---

## 📊 **VISUALISER LE GRAPHIQUE**

1. Allez sur `/app/artistes`
2. Cliquez sur un artiste
3. Scrollez jusqu'à "Évolution Spotify"
4. Sélectionnez une période

**Note** : Le graphique sera vide tant qu'il n'y a pas de données historiques.

**Pour créer des données de test** : Voir `TEST_SPOTIFY_HISTORY_NOW.md`

---

**Félicitations ! Le module est complet.** 🚀



