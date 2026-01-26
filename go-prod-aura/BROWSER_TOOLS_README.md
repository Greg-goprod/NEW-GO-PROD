# 🌐 Browser Tools MCP - Guide d'Installation et Utilisation

## ✅ Installation Complète

### 📦 Ce qui a été configuré

1. ✅ **MCP Server** : Configuré dans Cursor (`~/.cursor/mcp.json`)
2. ✅ **Script de démarrage** : `start-browser-tools-server.bat` créé
3. ⏳ **Extension Chrome** : À installer manuellement (voir ci-dessous)

---

## 🚀 Démarrage Rapide

### 1️⃣ Installer l'Extension Chrome

1. **Télécharger l'extension** :
   - URL : https://github.com/AgentDeskAI/browser-tools-mcp/releases/download/v1.2.0/BrowserTools-1.2.0-extension.zip

2. **Installer dans Chrome** :
   ```
   1. Décompressez le fichier ZIP
   2. Ouvrez Chrome → chrome://extensions/
   3. Activez "Mode développeur" (en haut à droite)
   4. Cliquez "Charger l'extension non empaquetée"
   5. Sélectionnez le dossier décompressé
   ```

### 2️⃣ Démarrer le Serveur Browser Tools

**Option A : Double-cliquez sur** `start-browser-tools-server.bat`

**Option B : Ligne de commande**
```bash
npx -y @agentdeskai/browser-tools-server@latest
```

⚠️ **IMPORTANT** : Gardez le serveur actif pendant l'utilisation !

### 3️⃣ Ouvrir le Panel Browser Tools dans Chrome

1. Ouvrez Chrome DevTools (F12)
2. Sélectionnez l'onglet **"BrowserTools MCP"**
3. Le statut devrait afficher "Connected ✅"

### 4️⃣ Redémarrer Cursor

Fermez et relancez Cursor pour qu'il charge la configuration MCP.

---

## 🎯 Outils Disponibles

### 🔍 Outils de Débogage

| Outil | Description | Exemple d'utilisation |
|-------|-------------|----------------------|
| `browser_snapshot` | Capture l'état actuel de la page | "Prends un snapshot de la page" |
| `browser_click` | Cliquer sur un élément | "Clique sur le bouton Submit" |
| `browser_type` | Saisir du texte | "Tape 'test@email.com' dans le champ email" |
| `browser_navigate` | Naviguer vers une URL | "Va sur google.com" |
| `browser_console_messages` | Lire les logs console | "Montre-moi les erreurs console" |
| `browser_network_requests` | Voir les requêtes réseau | "Liste les requêtes API" |

### 🔬 Outils d'Audit (Lighthouse)

| Outil | Description | Exemple d'utilisation |
|-------|-------------|----------------------|
| `runAccessibilityAudit` | Audit WCAG accessibilité | "Vérifie l'accessibilité de cette page" |
| `runPerformanceAudit` | Analyse des performances | "Pourquoi cette page est lente ?" |
| `runSEOAudit` | Audit SEO | "Améliore le SEO de cette page" |
| `runBestPracticesAudit` | Bonnes pratiques web | "Vérifie les best practices" |
| `runNextJSAudit` | Audit spécifique NextJS | "Audit NextJS avec app router" |
| `runAuditMode` | Tous les audits | "Lance audit mode" |
| `runDebuggerMode` | Mode debug complet | "Entre en debugger mode" |

---

## 💡 Exemples d'Utilisation

### Exemple 1 : Déboguer une page

```
Toi : "Prends un snapshot de localhost:5173"
→ L'IA capture l'état de la page

Toi : "Y a-t-il des erreurs console ?"
→ L'IA liste les erreurs

Toi : "Clique sur le bouton Login"
→ L'IA interagit avec la page
```

### Exemple 2 : Audit complet

```
Toi : "Lance un audit complet de cette page"
→ L'IA exécute tous les audits (SEO, Performance, Accessibilité)

Toi : "Corrige les problèmes d'accessibilité"
→ L'IA propose des corrections
```

### Exemple 3 : Test automatisé

```
Toi : "Va sur localhost:5173, remplis le formulaire de login avec test@test.com / password123, puis clique sur Submit"
→ L'IA automatise le scénario de test
```

---

## 🔧 Dépannage

### ❌ L'extension ne se connecte pas

1. Fermez complètement Chrome (toutes les fenêtres)
2. Redémarrez le serveur browser-tools
3. Rouvrez Chrome et les DevTools
4. Vérifiez qu'une seule instance du panel est ouverte

### ❌ Cursor ne voit pas les outils

1. Vérifiez que `~/.cursor/mcp.json` contient la configuration
2. Redémarrez complètement Cursor
3. Dans Cursor, ouvrez l'onglet "MCP" pour voir les serveurs connectés

### ❌ Le serveur ne démarre pas

```bash
# Nettoyez le cache npm
npm cache clean --force

# Réessayez
npx -y @agentdeskai/browser-tools-server@latest
```

---

## 📊 Architecture

```
┌─────────────┐     ┌──────────────────┐     ┌──────────────────┐     ┌──────────────┐
│   Cursor    │ ──► │  MCP Server      │ ──► │  Browser Tools   │ ──► │   Chrome     │
│   (Client)  │ ◄── │  (Protocol       │ ◄── │  Server          │ ◄── │  Extension   │
│             │     │   Handler)       │     │  (Middleware)    │     │              │
└─────────────┘     └──────────────────┘     └──────────────────┘     └──────────────┘
```

**Flux de données** :
1. Vous posez une question dans Cursor
2. Le MCP Server reçoit la requête et communique avec le Browser Tools Server
3. Le Browser Tools Server envoie des commandes à l'extension Chrome
4. L'extension interagit avec la page et renvoie les résultats
5. Les résultats remontent jusqu'à Cursor

---

## 🔒 Sécurité & Confidentialité

✅ **Toutes les données sont stockées localement**
✅ Aucune donnée envoyée à des services tiers
✅ Les cookies et headers sensibles sont automatiquement supprimés
✅ Le serveur tourne uniquement en local (localhost)

---

## 📚 Ressources

- **Documentation officielle** : https://browsertools.agentdesk.ai/
- **GitHub** : https://github.com/AgentDeskAI/browser-tools-mcp
- **Roadmap** : https://github.com/orgs/AgentDeskAI/projects/1/views/1

---

## 🎯 Checklist de Démarrage

- [ ] Extension Chrome installée et activée
- [ ] Serveur browser-tools démarré (`start-browser-tools-server.bat`)
- [ ] Panel "BrowserTools MCP" ouvert dans Chrome DevTools
- [ ] Statut "Connected ✅" affiché
- [ ] Cursor redémarré
- [ ] Test : "Prends un snapshot de la page actuelle"

---

**🎉 Prêt à utiliser ! Posez des questions à Cursor pour interagir avec votre navigateur.**


