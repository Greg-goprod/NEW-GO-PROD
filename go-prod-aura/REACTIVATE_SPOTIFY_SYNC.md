# 🔄 Réactiver la Synchronisation Spotify

## Une fois l'Edge Function déployée

### 1. Modifier `src/pages/app/artistes/index.tsx`

#### Réactiver l'import
```typescript
// Ligne 9 : Décommenter
import { triggerSpotifySync } from "../../../lib/spotifySync";
```

#### Réactiver le bouton
```typescript
// Lignes 219-230 : Remplacer par
<Button
  variant="secondary"
  disabled={companyId === '00000000-0000-0000-0000-000000000000'}
  onClick={() => {
    if (!companyId || companyId === '00000000-0000-0000-0000-000000000000') return;
    setSyncState("running");
    triggerSpotifySync(supabase, companyId, 25).then((r) => {
      setSyncState(r.ok ? "done" : "error");
      setSyncMsg(r.message);
      fetchArtists();
    });
  }}
>
  <RefreshCw className={`mr-2 h-4 w-4 ${syncState==="running" ? "animate-spin" : ""}`} />
  Synchroniser Spotify
</Button>
```

#### Réactiver la synchronisation automatique
```typescript
// Lignes 65-77 : Décommenter
useEffect(() => {
  if (!companyId) return;
  
  (async () => {
    setSyncState("running");
    const r = await triggerSpotifySync(supabase, companyId, 25);
    setSyncState(r.ok ? "done" : "error");
    setSyncMsg(r.message);
    await fetchArtists();
  })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [companyId]);
```

### 2. Tester
1. Redémarrez le serveur : `npm run dev`
2. Allez sur la page des artistes
3. Cliquez sur "Synchroniser Spotify"
4. Vérifiez qu'il n'y a plus d'erreur 404

### 3. Vérifier les Logs
Dans la console, vous devriez voir :
- ✅ `Synchronisation Spotify démarrée`
- ✅ `Edge Function appelée avec succès`
- ✅ `Données synchronisées`

## Script de Réactivation Automatique

Créez un fichier `reactivate-spotify.js` :

```javascript
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/pages/app/artistes/index.tsx');

// Lire le fichier
let content = fs.readFileSync(filePath, 'utf8');

// Réactiver l'import
content = content.replace(
  '// import { triggerSpotifySync } from "../../../lib/spotifySync"; // Désactivé - Edge Function non déployée',
  'import { triggerSpotifySync } from "../../../lib/spotifySync";'
);

// Réactiver le bouton
content = content.replace(
  /disabled={true}\s+onClick={() => \{\s*\/\/ Edge Function non déployée - désactivé temporairement\s*setSyncState\("error"\);\s*setSyncMsg\("Edge Function non déployée\. Voir DEPLOY_EDGE_FUNCTION\.md"\);\s*\}\}/s,
  `disabled={companyId === '00000000-0000-0000-0000-000000000000'}
            onClick={() => {
              if (!companyId || companyId === '00000000-0000-0000-0000-000000000000') return;
              setSyncState("running");
              triggerSpotifySync(supabase, companyId, 25).then((r) => {
                setSyncState(r.ok ? "done" : "error");
                setSyncMsg(r.message);
                fetchArtists();
              });
            }}`
);

// Réactiver la synchronisation automatique
content = content.replace(
  /\/\/ Synchronisation automatique désactivée \(Edge Function non déployée\)\s*\/\/ useEffect\(\(\) => \{[\s\S]*?\}, \[companyId\]\);/,
  `// Synchronisation automatique au mount
  useEffect(() => {
    if (!companyId) return;
    
    (async () => {
      setSyncState("running");
      const r = await triggerSpotifySync(supabase, companyId, 25);
      setSyncState(r.ok ? "done" : "error");
      setSyncMsg(r.message);
      await fetchArtists();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);`
);

// Écrire le fichier modifié
fs.writeFileSync(filePath, content);

console.log('✅ Synchronisation Spotify réactivée !');
console.log('🔄 Redémarrez le serveur : npm run dev');
```

### Utilisation
```bash
node reactivate-spotify.js
npm run dev
```


