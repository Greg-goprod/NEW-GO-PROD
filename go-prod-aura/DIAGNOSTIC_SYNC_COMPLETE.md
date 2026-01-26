# 🔍 Diagnostic Complet - Synchronisation Spotify

## ❓ PROBLÈME RAPPORTÉ
- La synchronisation semble fonctionner lors de l'ajout d'un artiste individuel
- Mais la synchronisation globale ne synchronise pas tous les artistes
- Les logs montrent "Synced 23 out of 25 artist(s)" mais les artistes ne s'affichent pas tous

---

## 📊 ÉTAPE 1 : Vérifier la base de données

### 1.1 Exécuter le script SQL de diagnostic
```sql
-- Copiez et exécutez dans l'éditeur SQL de Supabase
-- Fichier : go-prod-aura/sql/debug_artists_display.sql
```

**Résultats attendus :**
- Total d'artistes
- Nombre d'artistes avec/sans données Spotify
- Détails de chaque artiste

### 1.2 Vérifier les données Spotify dans la table
```sql
SELECT 
  a.name,
  sd.spotify_id,
  sd.external_url,
  sd.image_url,
  sd.followers,
  sd.popularity,
  sd.updated_at
FROM artists a
LEFT JOIN spotify_data sd ON sd.artist_id = a.id
WHERE a.company_id = '06f6c960-3f90-41cb-b0d7-46937eaf90a8'
ORDER BY sd.updated_at DESC NULLS LAST;
```

**À vérifier :**
- [ ] Tous les artistes ont une entrée dans `spotify_data` ?
- [ ] Les `external_url` sont bien renseignées ?
- [ ] Les `image_url` sont bien renseignées ?
- [ ] Les dates `updated_at` sont récentes ?

---

## 🔍 ÉTAPE 2 : Analyser les logs du navigateur

### 2.1 Ouvrir la console du navigateur
1. F12 pour ouvrir DevTools
2. Onglet Console
3. Rafraîchir la page `/app/artistes`

### 2.2 Chercher ces logs spécifiques
```
🔍 Recherche des artistes pour company_id: ...
📊 Données récupérées: ...
📊 Nombre d'artistes: ...
🎵 === DIAGNOSTIC DONNÉES SPOTIFY ===
🎤 Artiste 1: ... { hasSpotifyData: ..., image_url: ..., ... }
...
✅ Résultats trouvés: ...
```

**Questions à répondre :**
1. Combien d'artistes sont récupérés ? (devrait être 25)
2. Pour chaque artiste, `hasSpotifyData` est `true` ou `false` ?
3. Les `image_url` sont présentes ?
4. Y a-t-il un message "🔧 spotify_data est un tableau..." ?

---

## 🎯 ÉTAPE 3 : Tester la synchronisation manuelle

### 3.1 Forcer une synchronisation
1. Sur la page artistes, cliquer sur "Synchroniser Spotify"
2. Attendre la fin de la synchronisation
3. Vérifier les logs dans Supabase :
   - Edge Functions > `spotify_enrich_batch` > Logs
4. Noter le message final : "Synced X out of Y artist(s)"

### 3.2 Vérifier les logs de l'Edge Function
Chercher ces informations :
```
Found X artists to process
Artist [NOM]: Using existing spotify_id [ID]
Artist [NOM]: Fetched from Spotify - followers: X, popularity: Y
✓ Updated artist [NOM]
Skipping artist [NOM]: no spotify_id or external_url found
```

**Questions :**
1. Combien d'artistes sont traités ?
2. Combien sont ignorés (skipped) ?
3. Y a-t-il des erreurs ?

---

## 🔧 ÉTAPE 4 : Vérifications de l'Edge Function

### 4.1 Vérifier le code de l'Edge Function
Dans Supabase > Edge Functions > `spotify_enrich_batch` :

**Vérifier ces points :**
- [ ] La limite par défaut est `limit = 100` ?
- [ ] Les CORS headers sont présents ?
- [ ] La logique de détection du `spotify_id` est correcte ?
- [ ] Les `external_url` sont bien sauvegardées ?

### 4.2 Tester avec une limite plus élevée
Modifier temporairement dans `spotifySync.ts` :
```typescript
limit = 200  // Au lieu de 100
```

---

## 🐛 PROBLÈMES POSSIBLES ET SOLUTIONS

### Problème 1 : `spotify_data` est un tableau au lieu d'un objet
**Symptôme :** Les artistes s'affichent mais sans images
**Solution :** Le code de normalisation ajouté devrait résoudre ce problème

### Problème 2 : Les `external_url` ne sont pas sauvegardées
**Symptôme :** Sync réussit mais les URLs sont vides
**Solution :** Vérifier l'Edge Function et s'assurer que `external_url` est bien construite et sauvegardée

### Problème 3 : La relation `artists` <-> `spotify_data` est cassée
**Symptôme :** Les données Spotify existent mais ne sont pas liées aux artistes
**Solution :** Vérifier la clé étrangère `artist_id` dans `spotify_data`

### Problème 4 : Limite de pagination trop basse
**Symptôme :** Seulement les 24 premiers artistes s'affichent
**Solution :** Déjà corrigé (pageSize = 96)

---

## 📝 CHECKLIST DE DIAGNOSTIC

1. [ ] Exécuter le script SQL `debug_artists_display.sql`
2. [ ] Noter le nombre total d'artistes dans la base
3. [ ] Noter le nombre d'artistes avec données Spotify
4. [ ] Ouvrir la console du navigateur sur `/app/artistes`
5. [ ] Noter le nombre d'artistes affichés dans les logs
6. [ ] Vérifier si `spotify_data` est un tableau ou un objet
7. [ ] Cliquer sur "Synchroniser Spotify"
8. [ ] Vérifier les logs de l'Edge Function dans Supabase
9. [ ] Noter le message "Synced X out of Y"
10. [ ] Rafraîchir la page et vérifier si les artistes s'affichent

---

## 💬 QUESTIONS À RÉPONDRE

Pour mieux vous aider, pourriez-vous fournir :

1. **Nombre d'artistes dans la base :**
   - Total : ?
   - Avec données Spotify : ?
   - Sans données Spotify : ?

2. **Console navigateur :**
   - Nombre d'artistes récupérés : ?
   - Capture d'écran des logs `🎵 DIAGNOSTIC DONNÉES SPOTIFY` ?

3. **Logs Edge Function :**
   - Message "Synced X out of Y" : ?
   - Nombre d'artistes "skipped" : ?
   - Y a-t-il des erreurs ?

4. **Affichage visuel :**
   - Combien d'artistes voyez-vous sur la page ?
   - Voyez-vous les images/avatars ?
   - Voyez-vous un message d'erreur ?



