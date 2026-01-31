import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Hook pour obtenir le company_id de manière fiable
 * Priorité: profile > localStorage > null
 * 
 * Retourne { companyId, loading }
 * - loading=true tant que le company_id n'est pas résolu
 * - companyId=null si aucun company_id trouvé
 */
export function useCompanyId() {
  const { profile } = useAuth();
  const [companyId, setCompanyId] = useState<string | null>(() => {
    // Initialisation synchrone depuis localStorage
    return localStorage.getItem('company_id');
  });
  const [loading, setLoading] = useState(!companyId);

  useEffect(() => {
    // Si le profil a un company_id, l'utiliser
    if (profile?.company_id) {
      setCompanyId(profile.company_id);
      setLoading(false);
      // S'assurer qu'il est dans localStorage
      localStorage.setItem('company_id', profile.company_id);
    } else if (!companyId) {
      // Pas de company_id du tout, on attend le profil
      setLoading(true);
    }
  }, [profile?.company_id, companyId]);

  return { companyId, loading };
}
