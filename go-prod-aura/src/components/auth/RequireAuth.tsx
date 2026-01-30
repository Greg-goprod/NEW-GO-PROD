import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface RequireAuthProps {
  children: React.ReactNode;
}

export function RequireAuth({ children }: RequireAuthProps) {
  const { session, loading, bypass } = useAuth();
  const location = useLocation();

  // En mode bypass, on laisse passer immédiatement
  if (bypass) {
    return <>{children}</>;
  }

  // Si on a une session, on affiche l'app immédiatement
  // (même si le profil n'est pas encore chargé)
  if (session) {
    return <>{children}</>;
  }

  // Si on est encore en train de vérifier la session initiale
  // (pas de session ET loading), on attend brièvement
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500 mx-auto"></div>
          <p className="mt-3 text-gray-400 text-sm">Connexion...</p>
        </div>
      </div>
    );
  }

  // Pas de session et plus en chargement = non authentifié
  return <Navigate to="/auth/signin" state={{ from: location }} replace />;
}
