// Utilitaires de débogage pour diagnostiquer les problèmes

export function debugEnvironment() {
  console.log("🔧 === DIAGNOSTIC ENVIRONNEMENT ===");
  
  // Variables d'environnement
  console.log("🌍 Variables d'environnement:");
  console.log("  - NODE_ENV:", import.meta.env.MODE);
  console.log("  - VITE_SUPABASE_URL:", !!import.meta.env.VITE_SUPABASE_URL);
  console.log("  - VITE_SUPABASE_ANON_KEY:", !!import.meta.env.VITE_SUPABASE_ANON_KEY);
  console.log("  - VITE_SPOTIFY_CLIENT_ID:", !!import.meta.env.VITE_SPOTIFY_CLIENT_ID);
  console.log("  - VITE_SPOTIFY_CLIENT_SECRET:", !!import.meta.env.VITE_SPOTIFY_CLIENT_SECRET);
  
  // Vérification des URLs
  console.log("🔗 URLs:");
  console.log("  - Current URL:", window.location.href);
  console.log("  - Origin:", window.location.origin);
  
  // Vérification des APIs
  console.log("🌐 APIs disponibles:");
  console.log("  - fetch:", typeof fetch);
  console.log("  - btoa:", typeof btoa);
  
  console.log("🔧 === FIN DIAGNOSTIC ===");
}

export function debugSupabaseConnection() {
  console.log("🔗 === TEST CONNEXION SUPABASE ===");
  
  try {
    // Test d'import du client Supabase
    import('../lib/supabaseClient').then(({ supabase }) => {
      console.log("✅ Client Supabase importé");
      
      // Test de connexion basique
      supabase.from('artists').select('count').limit(1).then(({ error }: { error: any }) => {
        if (error) {
          console.error("❌ Erreur connexion Supabase:", error);
        } else {
          console.log("✅ Connexion Supabase OK");
        }
      });
    }).catch((err: any) => {
      console.error("❌ Erreur import Supabase:", err);
    });
  } catch (error) {
    console.error("❌ Erreur test Supabase:", error);
  }
  
  console.log("🔗 === FIN TEST SUPABASE ===");
}
