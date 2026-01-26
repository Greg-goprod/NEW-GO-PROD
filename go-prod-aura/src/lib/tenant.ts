import { supabase } from "./supabaseClient";
export type SupabaseClient = typeof supabase;

/**
 * Recupere le company_id selon le mode de l'application
 * - Mode BETA: Retourne le tenant force depuis .env.beta
 * - Mode DEV: Retourne l'entreprise de developpement
 */
export async function getCurrentCompanyId(supabase: any): Promise<string> {
  console.log("Recuperation du company_id...");
  
  // Verifier si on est en mode BETA avec tenant force
  const appMode = import.meta.env.VITE_APP_MODE;
  const forcedTenantId = import.meta.env.VITE_FORCED_TENANT_ID;
  
  if (appMode === 'beta' && forcedTenantId) {
    console.log("Mode BETA : Utilisation du tenant force");
    return await getForcedTenantId(supabase, forcedTenantId);
  }
  
  // En mode developpement, toujours utiliser l'entreprise de dev
  console.log("Mode developpement : Utilisation de l'entreprise de developpement");
  return await getDefaultCompanyId(supabase);
}

/**
 * Recupere et valide le tenant force en mode BETA
 */
async function getForcedTenantId(supabase: any, tenantId: string): Promise<string> {
  console.log("Validation du tenant force:", tenantId);
  
  try {
    // Verifier que le tenant existe et est marque comme production_data
    const { data: tenant, error } = await supabase
      .from("companies")
      .select("id, name, is_production_data")
      .eq("id", tenantId)
      .maybeSingle();

    if (error) {
      console.error("Erreur lors de la validation du tenant:", error);
      throw new Error("Tenant BETA invalide");
    }

    if (!tenant) {
      console.error("Le tenant force n'existe pas:", tenantId);
      throw new Error("Tenant BETA introuvable");
    }

    if (!tenant.is_production_data) {
      console.warn("Le tenant BETA n'est pas marque comme production_data");
    }

    console.log("Tenant BETA valide:", tenant.name);
    return tenant.id;
  } catch (error) {
    console.error("Erreur critique lors de la validation du tenant BETA:", error);
    throw error;
  }
}

async function getDefaultCompanyId(supabase: any): Promise<string> {
  console.log("Mode developpement: utilisation de l'entreprise existante Go-Prod HQ");
  
  // UUID de l'entreprise existante Go-Prod HQ
  const DEV_COMPANY_ID = "06f6c960-3f90-41cb-b0d7-46937eaf90a8";
  
  try {
    // Verifier que l'entreprise Go-Prod HQ existe
    const { data: existingCompany, error: searchErr } = await supabase
      .from("companies")
      .select("id, name")
      .eq("id", DEV_COMPANY_ID)
      .maybeSingle();

    if (searchErr) {
      console.log("Erreur lors de la recherche d'entreprise:", searchErr);
    }

    if (existingCompany?.id) {
      console.log("Entreprise Go-Prod HQ trouvee:", existingCompany.id, "-", existingCompany.name);
      return existingCompany.id;
    }

    // Si l'entreprise n'existe pas, c'est un probleme
    console.error("L'entreprise Go-Prod HQ n'existe pas dans la base de donnees");
    throw new Error("L'entreprise Go-Prod HQ n'existe pas");
  } catch (error) {
    console.error("Erreur critique lors de la gestion du company_id:", error);
    throw new Error("Impossible de recuperer l'entreprise Go-Prod HQ");
  }
}
