import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface RequireAuthProps {
  children: React.ReactNode;
}

export function RequireAuth({ children }: RequireAuthProps) {
  const { session, loading, bypass } = useAuth();
  const location = useLocation();

  // En mode bypass, on laisse passer
  if (bypass) {
    return <>{children}</>;
  }

  // Pendant le chargement, afficher un loader
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-500 mx-auto"></div>
          <p className="mt-4 text-gray-400">Chargement...</p>
        </div>
      </div>
    );
  }

  // Si pas de session, rediriger vers login
  if (!session) {
    return <Navigate to="/auth/signin" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
