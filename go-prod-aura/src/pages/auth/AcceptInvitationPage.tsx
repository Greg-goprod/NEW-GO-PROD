import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { UserInvitation } from '@/types/user';
import { fetchInvitationByToken } from '@/api/invitationsApi';
import { acceptInvitationFlow } from '@/hooks/useInvitations';

export function AcceptInvitationPage() {
  const [params] = useSearchParams();
  const tokenParam = params.get('token');
  const [invitation, setInvitation] = useState<UserInvitation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!tokenParam) {
      setError('Lien invalide ou incomplet.');
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const data = await fetchInvitationByToken(tokenParam);
        if (!data) {
          setError('Cette invitation est introuvable ou déjà utilisée.');
        } else {
          setInvitation(data);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur inattendue');
      } finally {
        setLoading(false);
      }
    })();
  }, [tokenParam]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!tokenParam || !invitation) return;
    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }
    if (password !== confirmPassword) {
      setError('La confirmation ne correspond pas.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await acceptInvitationFlow({
        token: tokenParam,
        password,
        fullName: fullName || invitation.email.split('@')[0],
      });
      navigate('/app', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Inscription impossible');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-night-950 text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-gray-800 border-t-violet-500 rounded-full animate-spin" />
          <p>Vérification de l’invitation…</p>
        </div>
      </div>
    );
  }

  if (error && !invitation) {
    return (
      <div className="min-h-screen bg-night-950 flex items-center justify-center text-center text-white px-6">
        <div className="max-w-md space-y-4">
          <h1 className="text-3xl font-semibold">Invitation invalide</h1>
          <p className="text-gray-400">{error}</p>
          <p className="text-sm text-gray-500">
            Demandez à votre administrateur de vous renvoyer une invitation.
          </p>
        </div>
      </div>
    );
  }

  if (!invitation) return null;

  const isExpired = new Date(invitation.expires_at) < new Date();
  const isDisabled = invitation.status !== 'pending' || isExpired;

  return (
    <div className="min-h-screen bg-gradient-to-br from-night-900 via-night-950 to-black flex items-center justify-center px-4">
      <div className="w-full max-w-lg bg-white/5 border border-white/10 rounded-3xl p-8 text-white space-y-6">
        <div className="space-y-2 text-center">
          <p className="text-xs uppercase tracking-[0.4em] text-violet-300">Invitation Go-Prod</p>
          <h1 className="text-3xl font-semibold">Bienvenue 👋</h1>
          <p className="text-sm text-gray-300">
            Compte associé à <span className="font-medium text-white">{invitation.email}</span>
          </p>
          {invitation.role_name && (
            <p className="text-xs text-gray-400">
              Fonction prévue&nbsp;: {invitation.role_name}
            </p>
          )}
        </div>

        {isDisabled && (
          <div className="rounded-2xl border border-amber-400/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            Cette invitation n’est plus valide ({invitation.status}).
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm text-gray-300">Nom complet</label>
            <input
              type="text"
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:border-violet-400 focus:ring-2 focus:ring-violet-400/40 outline-none"
              placeholder="Prénom Nom"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              required
              disabled={isDisabled || submitting}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm text-gray-300">Mot de passe</label>
            <input
              type="password"
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:border-violet-400 focus:ring-2 focus:ring-violet-400/40 outline-none"
              placeholder="********"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={8}
              required
              disabled={isDisabled || submitting}
            />
            <p className="text-xs text-gray-500">Minimum 8 caractères.</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-gray-300">Confirmation</label>
            <input
              type="password"
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:border-violet-400 focus:ring-2 focus:ring-violet-400/40 outline-none"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
              disabled={isDisabled || submitting}
            />
          </div>

          {error && (
            <p className="text-sm text-red-300 bg-red-500/10 rounded-xl px-4 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isDisabled || submitting}
            className="w-full rounded-2xl bg-violet-600 hover:bg-violet-500 transition font-semibold py-3 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitting ? 'Création en cours…' : 'Créer mon accès'}
          </button>
        </form>
      </div>
    </div>
  );
}

