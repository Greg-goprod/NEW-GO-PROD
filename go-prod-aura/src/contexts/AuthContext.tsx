import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseClient';
import type { Profile } from '@/types/user';

interface AuthContextValue {
  loading: boolean;
  session: Session | null;
  profile: Profile | null;
  bypass: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  loading: true,
  session: null,
  profile: null,
  bypass: false,
  refreshProfile: async () => {},
  signOut: async () => {},
});

const ENV_BYPASS = import.meta.env.VITE_AUTH_BYPASS;
const BYPASS =
  ENV_BYPASS === 'true' ||
  (ENV_BYPASS === undefined && import.meta.env.DEV);

async function fetchProfile(uid: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url, role, company_id')
    .eq('id', uid)
    .maybeSingle();

  if (error) {
    console.warn('[Auth] fetchProfile error', error);
    return null;
  }

  return (data as Profile) ?? null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (uid: string) => {
    const result = await fetchProfile(uid);
    setProfile(
      result ?? {
        id: uid,
        full_name: 'Utilisateur',
        avatar_url: null,
        role: 'admin',
        company_id: null,
      }
    );
  }, []);

  useEffect(() => {
    let active = true;

    if (BYPASS) {
      setProfile({
        id: 'dev-bypass',
        full_name: 'Dev Admin',
        avatar_url: null,
        role: 'admin',
        company_id: '06f6c960-3f90-41cb-b0d7-46937eaf90a8',
      });
      setSession(null);
      setLoading(false);
      return () => {
        active = false;
      };
    }

    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      setSession(data.session ?? null);
      if (data.session?.user?.id) {
        await loadProfile(data.session.user.id);
      } else {
        setProfile(null);
      }
      setLoading(false);
    })();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      if (!active) return;
      setSession(nextSession);
      if (nextSession?.user?.id) {
        await loadProfile(nextSession.user.id);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [loadProfile]);

  const refreshProfile = useCallback(async () => {
    if (!session?.user?.id || BYPASS) return;
    await loadProfile(session.user.id);
  }, [loadProfile, session]);

  const signOut = useCallback(async () => {
    if (BYPASS) return;
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
  }, []);

  const value = useMemo(
    () => ({
      loading,
      session,
      profile,
      bypass: BYPASS,
      refreshProfile,
      signOut,
    }),
    [loading, session, profile, refreshProfile, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}

