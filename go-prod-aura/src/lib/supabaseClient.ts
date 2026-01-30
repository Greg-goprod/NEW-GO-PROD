import { createClient } from "@supabase/supabase-js";

// Client Supabase centralisé pour éviter les instances multiples
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL!,
  import.meta.env.VITE_SUPABASE_ANON_KEY!,
  {
    auth: {
      // Rafraîchir automatiquement le token avant expiration
      autoRefreshToken: true,
      // Persister la session dans localStorage
      persistSession: true,
      // Détecter les changements de session dans d'autres onglets
      detectSessionInUrl: true,
    },
  }
);

export default supabase;

/**
 * Helper pour vérifier si une erreur est liée à l'authentification
 */
export function isAuthError(error: unknown): boolean {
  if (!error) return false;
  
  // Erreur Supabase standard
  if (typeof error === 'object' && error !== null) {
    const err = error as { code?: string; status?: number; message?: string };
    
    // Codes d'erreur Supabase Auth
    if (err.code === 'PGRST301' || err.code === 'PGRST401') return true;
    if (err.status === 401 || err.status === 403) return true;
    if (err.message?.includes('JWT') || err.message?.includes('token')) return true;
    if (err.message?.includes('not authenticated')) return true;
  }
  
  return false;
}

/**
 * Tente de rafraîchir la session et retourne true si réussi
 */
export async function tryRefreshSession(): Promise<boolean> {
  try {
    const { data, error } = await supabase.auth.refreshSession();
    if (error || !data.session) {
      console.warn('[Supabase] Session refresh failed:', error?.message);
      return false;
    }
    console.log('[Supabase] Session refreshed successfully');
    return true;
  } catch (err) {
    console.error('[Supabase] Session refresh exception:', err);
    return false;
  }
}
