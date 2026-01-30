import { createContext, useContext, useEffect, useState, useRef, type ReactNode } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { Session, User } from '@supabase/supabase-js';

// ============================================================================
// AUTH BYPASS - Pour le développement local
// ============================================================================
// En mode DEV, le bypass est activé par défaut sauf si VITE_AUTH_BYPASS=false
// En mode PROD, le bypass est désactivé sauf si VITE_AUTH_BYPASS=true
const BYPASS = import.meta.env.VITE_AUTH_BYPASS === 'true' || 
  (import.meta.env.DEV && import.meta.env.VITE_AUTH_BYPASS !== 'false');

const DEV_PROFILE = {
  id: 'dev-bypass',
  full_name: 'Dev User',
  email: 'dev@localhost',
  avatar_url: null,
  company_id: '06f6c960-3f90-41cb-b0d7-46937eaf90a8', // Venoge Festival
};

// Timeout pour éviter le blocage infini (5 secondes)
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

  useEffect(() => {
    if (BYPASS) {
      console.log('[Auth] Bypass mode active - skipping real auth');
      return;
    }

    // Prevent double initialization in strict mode
    if (initRef.current) return;
    initRef.current = true;

    // Timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      if (loading) {
        console.warn('[Auth] Session check timed out, redirecting to login');
        setLoading(false);
      }
    }, AUTH_TIMEOUT_MS);

    // Get initial session
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

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[Auth] Auth state changed:', event);
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
        // Don't block on profile error, user is still authenticated
        setProfile(null);
      } else {
        setProfile(data);
      }
    } catch (err) {
      console.error('[Auth] Exception fetching profile:', err);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }

  async function signOut() {
    if (BYPASS) {
      console.log('[Auth] Bypass mode - signOut ignored');
      return;
    }
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('[Auth] signOut error:', err);
    }
    setSession(null);
    setUser(null);
    setProfile(null);
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
