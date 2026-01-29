import { useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';

export function SignInPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const { bypass } = useAuth();
  const locationState = location.state as { from?: { pathname: string } } | null;

  const redirectTo =
    locationState?.from?.pathname || params.get('redirectTo') || '/app';

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (signInError) {
        setError(signInError.message);
        return;
      }
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connexion impossible');
    } finally {
      setLoading(false);
    }
  };

  const handleBypass = () => {
    navigate(redirectTo, { replace: true });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-night-900 via-night-950 to-black flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 text-white space-y-8 shadow-2xl">
        <div className="space-y-2 text-center">
          <p className="text-sm uppercase tracking-[0.4em] text-violet-300">Go-Prod AURA</p>
          <h1 className="text-3xl font-semibold">Connexion</h1>
          <p className="text-sm text-gray-400">
            Accédez au workspace Venoge Festival
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-200">Email professionnel</label>
            <input
              type="email"
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:border-violet-400 focus:ring-2 focus:ring-violet-400/40 outline-none"
              placeholder="prenom.nom@venoge-festival.ch"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-200">Mot de passe</label>
            <input
              type="password"
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:border-violet-400 focus:ring-2 focus:ring-violet-400/40 outline-none"
              placeholder="********"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </div>

          {error && (
            <p className="text-sm text-red-300 bg-red-500/10 rounded-xl px-4 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-violet-600 hover:bg-violet-500 transition font-semibold py-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>

        {bypass && (
          <div className="text-center space-y-2">
            <p className="text-xs text-gray-400">
              Mode développement actif – aucune authentification requise.
            </p>
            <button
              type="button"
              onClick={handleBypass}
              className="text-violet-300 hover:text-white text-sm underline-offset-4 hover:underline"
            >
              Continuer sans compte
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

