import { createContext, useContext, useEffect, useState, useRef, useCallback, type ReactNode } from 'react';
import { supabase, isAuthError, tryRefreshSession } from '@/lib/supabaseClient';
import { setCompanyIdCache, clearCompanyIdCache } from '@/lib/tenant';
import type { Session, User } from '@supabase/supabase-js';

// ============================================================================
// AUTH BYPASS - Pour le développement local
// ============================================================================
const BYPASS = import.meta.env.VITE_AUTH_BYPASS === 'true' || 
  (import.meta.env.DEV && import.meta.env.VITE_AUTH_BYPASS !== 'false');

const DEV_PROFILE = {
  id: 'dev-bypass',
  full_name: 'Dev User',
  email: 'dev@localhost',
  avatar_url: null,
  company_id: '06f6c960-3f90-41cb-b0d7-46937eaf90a8',
};

const AUTH_TIMEOUT_MS = 5000;

// ============================================================================
// TYPES
// ============================================================================
export interface UserProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  company_id: string | null;
}

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  bypass: boolean;
  signOut: () => Promise<void>;
  /** Vérifie si la session est valide, tente un refresh si nécessaire */
  checkSession: () => Promise<boolean>;
  /** Handler pour les erreurs API - redirige vers login si erreur auth */
  handleApiError: (error: unknown) => Promise<boolean>;
}

// ============================================================================
// CONTEXT
// ============================================================================
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(BYPASS ? DEV_PROFILE : null);
  const [loading, setLoading] = useState(!BYPASS);
  const initRef = useRef(false);

  // Vérifie et rafraîchit la session si nécessaire
  const checkSession = useCallback(async (): Promise<boolean> => {
    if (BYPASS) return true;
    
    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      
      if (!currentSession) {
        // Pas de session, tenter un refresh
        const refreshed = await tryRefreshSession();
        if (!refreshed) {
          setSession(null);
          setUser(null);
          setProfile(null);
          return false;
        }
        // Re-fetch session après refresh
        const { data: { session: newSession } } = await supabase.auth.getSession();
        if (newSession) {
          setSession(newSession);
          setUser(newSession.user);
          return true;
        }
        return false;
      }
      
      // Vérifier si le token expire bientôt (dans les 5 minutes)
      const expiresAt = currentSession.expires_at;
      if (expiresAt) {
        const expiresIn = expiresAt * 1000 - Date.now();
        if (expiresIn < 5 * 60 * 1000) {
          // Token expire bientôt, le rafraîchir
          await tryRefreshSession();
        }
      }
      
      return true;
    } catch (err) {
      console.error('[Auth] checkSession error:', err);
      return false;
    }
  }, []);

  // Handler pour les erreurs API
  const handleApiError = useCallback(async (error: unknown): Promise<boolean> => {
    if (BYPASS) return false;
    
    if (isAuthError(error)) {
      console.warn('[Auth] API auth error detected, attempting session refresh...');
      
      // Tenter de rafraîchir la session
      const refreshed = await tryRefreshSession();
      
      if (!refreshed) {
        // Session invalide, déconnecter l'utilisateur
        console.warn('[Auth] Session refresh failed, signing out...');
        setSession(null);
        setUser(null);
        setProfile(null);
        
        // Rediriger vers login (sans reload pour garder le state si possible)
        window.location.href = '/auth/signin?reason=session_expired';
        return true; // Erreur gérée
      }
      
      return false; // Session rafraîchie, réessayer l'appel
    }
    
    return false; // Pas une erreur d'auth
  }, []);

  useEffect(() => {
    if (BYPASS) {
      console.log('[Auth] Bypass mode active');
      return;
    }

    if (initRef.current) return;
    initRef.current = true;

    const timeoutId = setTimeout(() => {
      if (loading) {
        console.warn('[Auth] Session check timed out');
        setLoading(false);
      }
    }, AUTH_TIMEOUT_MS);

    supabase.auth.getSession()
      .then(({ data: { session }, error }) => {
        if (error) {
          console.error('[Auth] getSession error:', error);
          setLoading(false);
          return;
        }
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          fetchProfile(session.user.id);
        } else {
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('[Auth] getSession exception:', err);
        setLoading(false);
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[Auth] Auth state changed:', event);
        
        if (event === 'TOKEN_REFRESHED') {
          console.log('[Auth] Token was refreshed');
        }
        
        if (event === 'SIGNED_OUT') {
          setSession(null);
          setUser(null);
          setProfile(null);
          setLoading(false);
          return;
        }
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          await fetchProfile(session.user.id);
        } else {
          setProfile(null);
          setLoading(false);
        }
      }
    );

    return () => {
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []);

  async function fetchProfile(userId: string) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url, company_id')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('[Auth] Error fetching profile:', error);
        setProfile(null);
        clearCompanyIdCache();
      } else {
        setProfile(data);
        // Mettre à jour le cache du company_id pour le tenant
        setCompanyIdCache(data?.company_id ?? null);
      }
    } catch (err) {
      console.error('[Auth] Exception fetching profile:', err);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }

  async function signOut() {
    if (BYPASS) return;
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('[Auth] signOut error:', err);
    }
    setSession(null);
    setUser(null);
    setProfile(null);
    clearCompanyIdCache();
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        loading,
        bypass: BYPASS,
        signOut,
        checkSession,
        handleApiError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
