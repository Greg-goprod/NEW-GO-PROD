# 🔧 Guide de Diagnostic - Erreur Ajout d'Artiste

## 🎯 **Problème**
Erreur lors de l'ajout d'un artiste, mais rien dans la console.

## 🚀 **Serveur de Développement**
✅ **Serveur démarré** : http://localhost:5173/
✅ **Port actif** : 5173
✅ **Build réussi** : TypeScript sans erreur

---

## 🔍 **Étapes de Diagnostic**

### **1. Ouvrir la Console du Navigateur**
1. Aller sur http://localhost:5173/
2. Ouvrir les outils de développement (F12)
3. Aller dans l'onglet "Console"
4. Essayer d'ajouter un artiste

### **2. Utiliser le Bouton Diagnostic**
1. Dans le modal d'ajout d'artiste
2. Cliquer sur le bouton "🐛 Diagnostic"
3. Vérifier les logs dans la console

### **3. Vérifier les Variables d'Environnement**
Le diagnostic affichera :
```
🔧 === DIAGNOSTIC ENVIRONNEMENT ===
🌍 Variables d'environnement:
  - VITE_SUPABASE_URL: true/false
  - VITE_SUPABASE_ANON_KEY: true/false
  - VITE_SPOTIFY_CLIENT_ID: true/false
  - VITE_SPOTIFY_CLIENT_SECRET: true/false
```

### **4. Tester l'Ajout d'Artiste**
1. Saisir un nom d'artiste
2. Cliquer sur "Enregistrer"
3. Observer les logs dans la console :
   - `🚀 Début de l'ajout d'artiste`
   - `📝 Données: { name, companyId, selectedSpotifyArtist }`
   - `🔗 Slug généré: ...`
   - `🔍 Vérification de l'existence de l'artiste...`

---

## 🐛 **Logs de Débogage Ajoutés**

### **Modal d'Ajout d'Artiste**
- ✅ Logs détaillés pour chaque étape
- ✅ Affichage des données envoyées
- ✅ Gestion des erreurs avec messages explicites
- ✅ Bouton diagnostic intégré

### **Recherche Spotify**
- ✅ Logs pour l'import de la fonction
- ✅ Logs pour les credentials Spotify
- ✅ Logs pour les requêtes API
- ✅ Logs pour les réponses

### **Fonction de Recherche**
- ✅ Logs pour les variables d'environnement
- ✅ Logs pour les tokens d'accès
- ✅ Logs pour les requêtes de recherche
- ✅ Logs pour les résultats

---

## 🔧 **Problèmes Courants**

### **1. Variables d'Environnement Manquantes**
```
❌ Credentials Spotify manquants
```
**Solution** : Créer un fichier `.env.local` avec :
```env
VITE_SPOTIFY_CLIENT_ID=your_client_id
VITE_SPOTIFY_CLIENT_SECRET=your_client_secret
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_key
```

### **2. Erreur de Connexion Supabase**
```
❌ Erreur connexion Supabase: [details]
```
**Solution** : Vérifier les credentials Supabase

### **3. Erreur de Validation**
```
❌ Validation échouée: nom requis
```
**Solution** : Saisir un nom d'artiste

### **4. Artiste Déjà Existant**
```
❌ Artiste déjà existant: [id]
```
**Solution** : Choisir un nom différent

### **5. Erreur d'Insertion**
```
❌ Erreur lors de l'insertion de l'artiste: [details]
```
**Solution** : Vérifier les permissions de la base de données

---

## 📋 **Checklist de Diagnostic**

### **Avant de Tester**
- [ ] Serveur de développement démarré
- [ ] Console du navigateur ouverte
- [ ] Variables d'environnement configurées

### **Pendant le Test**
- [ ] Cliquer sur "🐛 Diagnostic" pour vérifier l'environnement
- [ ] Saisir un nom d'artiste
- [ ] Cliquer sur "Enregistrer"
- [ ] Observer les logs dans la console

### **Logs Attendus**
- [ ] `🚀 Début de l'ajout d'artiste`
- [ ] `📝 Données: { name, companyId, selectedSpotifyArtist }`
- [ ] `🔗 Slug généré: ...`
- [ ] `🔍 Vérification de l'existence de l'artiste...`
- [ ] `✅ Aucun doublon trouvé, insertion de l'artiste...`
- [ ] `✅ Artiste inséré avec succès: { id }`
- [ ] `🎉 Ajout d'artiste terminé avec succès`

---

## 🆘 **En Cas de Problème**

### **Si Aucun Log N'Apparaît**
1. Vérifier que la console est ouverte
2. Vérifier que le serveur fonctionne
3. Rafraîchir la page

### **Si Erreur de Variables d'Environnement**
1. Créer le fichier `.env.local`
2. Ajouter les variables requises
3. Redémarrer le serveur

### **Si Erreur de Base de Données**
1. Vérifier la connexion Supabase
2. Vérifier les permissions RLS
3. Vérifier la structure des tables

### **Si Erreur Spotify**
1. Vérifier les credentials Spotify
2. Vérifier la configuration de l'application Spotify
3. Vérifier les rate limits

---

## 📞 **Support**

Si le problème persiste après avoir suivi ce guide :
1. Copier tous les logs de la console
2. Noter les étapes exactes qui causent l'erreur
3. Vérifier la configuration des variables d'environnement
4. Tester avec un nom d'artiste simple (ex: "Test")

**🎯 Le diagnostic est maintenant prêt ! Testez l'ajout d'artiste et observez les logs dans la console.**


