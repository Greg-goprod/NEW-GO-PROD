const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/pages/app/artistes/index.tsx');

console.log('🔄 Réactivation de la synchronisation Spotify...');

try {
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
  console.log('🎵 Le bouton "Synchroniser Spotify" devrait maintenant fonctionner');

} catch (error) {
  console.error('❌ Erreur lors de la réactivation :', error.message);
}
