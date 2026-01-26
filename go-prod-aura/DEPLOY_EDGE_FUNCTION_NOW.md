# 🚀 Déployer l'Edge Function - Guide Rapide

## ✅ CE QUI A ÉTÉ AMÉLIORÉ

J'ai mis à jour votre Edge Function avec :

1. ✅ **CORS complet** : `Access-Control-Allow-Methods` ajouté
2. ✅ **Limite augmentée** : 100 artistes au lieu de 25
3. ✅ **Logs détaillés** : Pour voir exactement ce qui se passe
4. ✅ **Gestion d'erreurs améliorée** : Continue même si un artiste échoue
5. ✅ **Statistiques précises** : Synced, skipped, errors

---

## 📋 DÉPLOIEMENT EN 3 ÉTAPES

### ÉTAPE 1 : Copier le code

1. Ouvrez le fichier : `go-prod-aura/supabase/functions/spotify_enrich_batch/index.ts`
2. **Sélectionnez tout** (Ctrl+A)
3. **Copiez** (Ctrl+C)

### ÉTAPE 2 : Coller dans Supabase

1. Allez sur **Supabase Dashboard**
2. Menu **Edge Functions**
3. Cliquez sur `spotify_enrich_batch`
4. **Sélectionnez tout le code existant** et remplacez-le
5. **Collez le nouveau code** (Ctrl+V)
6. Cliquez sur **"Deploy"** (en haut à droite)

### ÉTAPE 3 : Tester

1. Retournez sur votre page artistes
2. Ouvrez la **console du navigateur** (F12)
3. Cliquez sur **"Synchroniser Spotify"**
4. Regardez les logs dans la console

---

## 🧪 VÉRIFICATION DES LOGS

### Dans la console du navigateur

Vous devriez voir :
```
🔗 URL Edge Function: https://...
🔑 Anon Key présent: true
📊 Payload: {company_id: "...", limit: 100}
✅ Résultats trouvés: {artists: 88, totalCount: 88, ...}
```

### Dans Supabase (Edge Functions > Logs)

Vous devriez voir :
```
🚀 Starting sync for company 06f6c960-3f90-41cb-b0d7-46937eaf90a8, limit 100
Found X candidates for sync
🎵 Syncing [NOM ARTISTE] (spotify_id)...
✅ Updated [NOM ARTISTE]
...
✅ Sync summary: {message: "Synced X out of Y artist(s)", total: Y, synced: X, skipped: 0}
```

---

## ❓ QUE SE PASSERA-T-IL ?

### Si tout va bien ✅

- Pas d'erreur CORS
- Message de succès : "Synced X out of Y artist(s)"
- Les données Spotify sont mises à jour (followers, popularity, etc.)
- Les logs détaillés apparaissent dans Supabase

### Si l'erreur CORS persiste ❌

**Causes possibles :**

1. **La fonction n'est pas encore déployée**
   - Solution : Attendez 10-20 secondes après le déploiement
   - Rafraîchissez la page et réessayez

2. **Cache du navigateur**
   - Solution : Videz le cache (Ctrl+Shift+R)
   - Ou testez en navigation privée

3. **Variables d'environnement manquantes**
   - Solution : Vérifiez dans Supabase > Edge Functions > Settings :
     - `SPOTIFY_CLIENT_ID`
     - `SPOTIFY_CLIENT_SECRET`
     - `SUPABASE_URL`
     - `SUPABASE_SERVICE_ROLE_KEY`

---

## 📊 RÉSULTAT ATTENDU

Après le déploiement et la synchronisation :

| Métrique | Valeur attendue |
|----------|-----------------|
| **Total artistes** | 88 |
| **Artistes synchronisés** | ~80 |
| **Artistes ignorés** | ~8 (sans Spotify) |
| **Erreurs** | 0 |

**Temps estimé** : 30-60 secondes pour synchroniser 80+ artistes

---

## 🐛 DÉPANNAGE

### "Nothing to sync"

C'est **normal** si tous vos artistes ont déjà été synchronisés récemment !

La fonction RPC `artists_for_spotify_sync` ne synchronise que :
- Les artistes **sans données Spotify**
- Les artistes dont les données sont **obsolètes** (> 7 jours)

**Pour forcer une resynchronisation complète**, exécutez dans SQL Editor :

```sql
-- Marquer toutes les données comme obsolètes
UPDATE spotify_data
SET updated_at = '2020-01-01'
WHERE artist_id IN (
  SELECT id FROM artists 
  WHERE company_id = '06f6c960-3f90-41cb-b0d7-46937eaf90a8'
);
```

Puis cliquez à nouveau sur "Synchroniser Spotify".

### "Company ID manquant"

Si vous voyez ce message dans les logs :
1. Vérifiez que vous êtes bien connecté
2. Rafraîchissez la page
3. Le `company_id` devrait être : `06f6c960-3f90-41cb-b0d7-46937eaf90a8`

---

## ✅ CHECKLIST FINALE

- [ ] Code copié depuis `index.ts`
- [ ] Code collé dans Supabase
- [ ] Fonction déployée
- [ ] Page artistes rafraîchie
- [ ] Console ouverte (F12)
- [ ] "Synchroniser Spotify" cliqué
- [ ] Plus d'erreur CORS ✅
- [ ] Message de succès reçu ✅
- [ ] Logs détaillés visibles dans Supabase ✅

---

## 🎉 APRÈS LE DÉPLOIEMENT

Votre synchronisation Spotify sera **complètement opérationnelle** :

- ✅ Synchronisation manuelle via bouton
- ✅ Gestion de 100 artistes à la fois
- ✅ Logs détaillés pour diagnostic
- ✅ Pas d'erreur CORS
- ✅ Statistiques précises (synced/skipped/errors)

**Bon déploiement !** 🚀



