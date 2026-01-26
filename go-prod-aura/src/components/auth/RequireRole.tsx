import type { UserRole } from '../../types/user';
import type { ReactElement } from 'react';

type Props = {
  allow: UserRole[];
  children: ReactElement;
  fallback?: ReactElement;
};

export default function RequireRole({ allow: _allow, children, fallback: _fallback }: Props) {
  // TODO: Récupérer le rôle depuis le contexte utilisateur ou Supabase
  // Pour l'instant, on retourne toujours les enfants (placeholder)
  
  // Exemple d'implémentation future:
  // const { profile } = useAuth();
  // if (!profile || !_allow.includes(profile.role)) {
  //   return _fallback ?? <div>Accès refusé</div>;
  // }
  
  return children;
}

