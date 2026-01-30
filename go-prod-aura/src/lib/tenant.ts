import { supabase } from "./supabaseClient";
export type SupabaseClient = typeof supabase;

// UUID de l'entreprise de développement Go-Prod HQ
const DEV_COMPANY_ID = "06f6c960-3f90-41cb-b0d7-46937eaf90a8";

// Cache du company_id pour éviter les appels répétés
let cachedCompanyId: string | null = null;

/**
 * Récupère le company_id de l'utilisateur connecté
 * 
 * Priorité :
 * 1. Cache en mémoire (si déjà récupéré)
 * 2. Profil de l'utilisateur connecté (production)
 * 3. Entreprise de développement (dev bypass)
 */
export async function getCurrentCompanyId(_supabase?: any): Promise<string> {
  // Retourner le cache si disponible
  if (cachedCompanyId) {
    return cachedCompanyId;
  }
  
  console.log("[Tenant] Récupération du company_id...");
  
  // Vérifier si on est en mode bypass (développement)
  const isBypass = import.meta.env.VITE_AUTH_BYPASS === 'true' || 
    (import.meta.env.DEV && import.meta.env.VITE_AUTH_BYPASS !== 'false');
  
  if (isBypass) {
    console.log("[Tenant] Mode bypass: utilisation de l'entreprise de dev");
    cachedCompanyId = DEV_COMPANY_ID;
    return DEV_COMPANY_ID;
  }
  
  // En production: récupérer le company_id depuis le profil de l'utilisateur
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      console.warn("[Tenant] Pas de session utilisateur, impossible de récupérer le company_id");
      throw new Error("Utilisateur non connecté");
    }
    
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', session.user.id)
      .single();
    
    if (error) {
      console.error("[Tenant] Erreur lors de la récupération du profil:", error);
      throw new Error("Impossible de récupérer le profil utilisateur");
    }
    
    if (!profile?.company_id) {
      console.error("[Tenant] L'utilisateur n'a pas de company_id associé");
      throw new Error("Aucune organisation associée à cet utilisateur");
    }
    
    console.log("[Tenant] Company_id récupéré depuis le profil:", profile.company_id);
    cachedCompanyId = profile.company_id;
    return profile.company_id;
    
  } catch (error) {
    console.error("[Tenant] Erreur critique:", error);
    throw error;
  }
}

/**
 * Réinitialise le cache du company_id
 * À appeler lors du logout ou changement d'utilisateur
 */
export function clearCompanyIdCache() {
  cachedCompanyId = null;
  console.log("[Tenant] Cache company_id effacé");
}

/**
 * Définit manuellement le company_id (utilisé par AuthContext)
 */
export function setCompanyIdCache(companyId: string | null) {
  cachedCompanyId = companyId;
  if (companyId) {
    console.log("[Tenant] Cache company_id défini:", companyId);
  }
}
