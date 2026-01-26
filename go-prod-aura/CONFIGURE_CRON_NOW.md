# ⏰ Configurer le Cron Job - 5 Minutes

## 🎯 **CE QU'IL RESTE À FAIRE**

Tout est prêt sauf le Cron Job qui déclenchera la synchronisation automatique.

---

## 📋 **ÉTAPE 1 : Trouver vos Identifiants Supabase**

1. **Ouvrez** Supabase Dashboard
2. **Allez** dans **Settings** > **API**
3. **Notez** :
   - **Project URL** (ex: `https://alhoefdrjbwdzijizrxc.supabase.co`)
   - **service_role secret** : Cliquez sur "Reveal" et copiez la clé

---

## 📋 **ÉTAPE 2 : Configurer le Cron**

1. **Ouvrez** Supabase > **SQL Editor**

2. **Copiez** le code ci-dessous

3. **⚠️ REMPLACEZ** les 2 lignes marquées :

```sql
SELECT cron.schedule(
  'spotify-daily-sync',
  '0 12 * * *',
  $$
  SELECT net.http_post(
    url := 'https://VOTRE-PROJECT.supabase.co/functions/v1/spotify_daily_sync',  -- ⚠️ LIGNE À REMPLACER
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer VOTRE-SERVICE-ROLE-KEY'  -- ⚠️ LIGNE À REMPLACER
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
```

4. **Cliquez** sur **RUN**

---

## ✅ **ÉTAPE 3 : Vérifier**

Exécutez dans le SQL Editor :

```sql
SELECT * FROM cron.job WHERE jobname = 'spotify-daily-sync';
```

**Résultat attendu** :
```
jobid | schedule  | command | nodename | ...
------|-----------|---------|----------|-----
1     | 0 12 * * *| ...     | ...      | ...
```

Si vous voyez 1 ligne ✅ : **C'EST BON !**

---

## 🧪 **TESTER MAINTENANT (Optionnel)**

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

**Résultat attendu** : `(200, ...)`

Puis vérifiez :

```sql
SELECT COUNT(*) FROM spotify_history;
```

Vous devriez voir des entrées !

---

## 📊 **VOIR LE GRAPHIQUE**

1. Allez sur `/app/artistes`
2. Cliquez sur un artiste
3. Scrollez jusqu'à "Évolution Spotify"
4. Testez les périodes : 7j, 1m, 3m, etc.

---

## ⏰ **HORAIRE DU CRON**

**12h00 UTC tous les jours** = 13h00 Paris (hiver) / 14h00 Paris (été)

Pour changer l'horaire, modifiez `'0 12 * * *'` :

```
'0 12 * * *'  → 12h00 UTC
'0 6 * * *'   → 06h00 UTC
'0 0 * * *'   → 00h00 UTC (minuit)
'30 14 * * *' → 14h30 UTC
```

---

## 🎉 **C'EST TOUT !**

Le système fonctionne maintenant en **automatique** :

- ✅ Synchronisation quotidienne
- ✅ Historique illimité
- ✅ Graphiques en temps réel
- ✅ Zéro maintenance

**Félicitations ! Le module est complet.** 🚀



