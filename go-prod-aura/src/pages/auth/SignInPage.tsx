import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/aura/Button';
import { Input } from '@/components/aura/Input';
import { useAuth } from '@/contexts/AuthContext';

export default function SignInPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { bypass } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Destination après login
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/app';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError(error.message);
      } else {
        navigate(from, { replace: true });
      }
    } catch (err) {
      setError('Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  }

  function handleBypass() {
    navigate(from, { replace: true });
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 px-4">
      <div className="max-w-md w-full space-y-8">
        {/* Logo / Title */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white">GO-PROD</h1>
          <p className="mt-2 text-gray-400">Connectez-vous à votre compte</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">
                Email
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="votre@email.com"
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1">
                Mot de passe
              </label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
            </div>
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={loading}
          >
            {loading ? 'Connexion...' : 'Se connecter'}
          </Button>

          {/* Bypass button (dev only) */}
          {bypass && (
            <div className="mt-4 pt-4 border-t border-gray-700">
              <Button
                type="button"
                variant="secondary"
                className="w-full"
                onClick={handleBypass}
              >
                Continuer sans compte (Dev)
              </Button>
              <p className="mt-2 text-xs text-gray-500 text-center">
                Mode développement actif
              </p>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
