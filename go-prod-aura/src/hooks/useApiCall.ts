import { useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { isAuthError, tryRefreshSession } from '@/lib/supabaseClient';

/**
 * Hook pour effectuer des appels API avec gestion automatique des erreurs d'authentification.
 * 
 * Si une erreur d'auth est détectée (session expirée), le hook :
 * 1. Tente de rafraîchir la session
 * 2. Réessaie l'appel automatiquement si le refresh réussit
 * 3. Redirige vers /auth/signin si le refresh échoue
 * 
 * @example
 * const { withAuthRetry } = useApiCall();
 * 
 * const handleSave = async () => {
 *   setLoading(true);
 *   try {
 *     await withAuthRetry(async () => {
 *       const { error } = await supabase.from('table').update(...);
 *       if (error) throw error;
 *     });
 *     toast.success('Saved!');
 *   } catch (err) {
 *     toast.error('Error saving');
 *   } finally {
 *     setLoading(false);
 *   }
 * };
 */
export function useApiCall() {
  const { bypass, handleApiError } = useAuth();

  /**
   * Wrapper pour les appels API avec retry automatique sur erreur d'auth
   */
  const withAuthRetry = useCallback(async <T>(
    apiCall: () => Promise<T>,
    maxRetries: number = 1
  ): Promise<T> => {
    if (bypass) {
      return apiCall();
    }

    let lastError: unknown;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await apiCall();
      } catch (error) {
        lastError = error;
        
        if (isAuthError(error) && attempt < maxRetries) {
          console.log(`[useApiCall] Auth error on attempt ${attempt + 1}, refreshing session...`);
          
          const refreshed = await tryRefreshSession();
          if (refreshed) {
            console.log('[useApiCall] Session refreshed, retrying...');
            continue; // Réessayer
          }
          
          // Refresh échoué, gérer l'erreur (redirige vers login)
          await handleApiError(error);
          throw error;
        }
        
        // Pas une erreur d'auth, ou plus de retries
        throw error;
      }
    }
    
    throw lastError;
  }, [bypass, handleApiError]);

  /**
   * Version simple sans retry - juste notification si session expirée
   */
  const checkAuthOnError = useCallback(async (error: unknown): Promise<void> => {
    if (!bypass && isAuthError(error)) {
      await handleApiError(error);
    }
  }, [bypass, handleApiError]);

  return {
    withAuthRetry,
    checkAuthOnError,
  };
}
