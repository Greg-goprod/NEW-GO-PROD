/**
 * API pour la gestion de la configuration email Brevo
 */

import { supabase } from "@/lib/supabaseClient";

// =============================================================================
// Types
// =============================================================================

export interface EmailConfig {
  id: string;
  company_id: string;
  from_email: string;
  from_name: string;
  reply_to: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  last_tested_at: string | null;
}

export interface EmailConfigSave {
  companyId: string;
  brevoApiKey: string;
  fromEmail: string;
  fromName: string;
  replyTo?: string;
}

// =============================================================================
// API Functions
// =============================================================================

/**
 * Récupère la configuration email d'une company
 */
export async function getEmailConfig(companyId: string): Promise<EmailConfig | null> {
  const { data, error } = await supabase.functions.invoke("manage-email-config", {
    body: { action: "get", companyId },
  });

  if (error) {
    console.error("[emailConfigApi] Erreur getEmailConfig:", error);
    throw new Error(error.message || "Erreur lors de la récupération");
  }

  if (!data?.success) {
    throw new Error(data?.error || "Erreur inconnue");
  }

  return data.config || null;
}

/**
 * Sauvegarde la configuration email
 */
export async function saveEmailConfig(config: EmailConfigSave): Promise<{ config: EmailConfig; message: string }> {
  const { data, error } = await supabase.functions.invoke("manage-email-config", {
    body: { action: "save", ...config },
  });

  if (error) {
    console.error("[emailConfigApi] Erreur saveEmailConfig:", error);
    throw new Error(error.message || "Erreur lors de la sauvegarde");
  }

  if (!data?.success) {
    throw new Error(data?.error || "Erreur inconnue");
  }

  return { config: data.config, message: data.message };
}

/**
 * Teste la configuration email
 */
export async function testEmailConfig(params: {
  companyId?: string;
  brevoApiKey?: string;
  fromEmail?: string;
  fromName?: string;
  testEmail: string;
}): Promise<string> {
  const { data, error } = await supabase.functions.invoke("manage-email-config", {
    body: { action: "test", ...params },
  });

  if (error) {
    console.error("[emailConfigApi] Erreur testEmailConfig:", error);
    throw new Error(error.message || "Erreur lors du test");
  }

  if (!data?.success) {
    throw new Error(data?.error || "Échec du test");
  }

  return data.message;
}

/**
 * Supprime la configuration email
 */
export async function deleteEmailConfig(companyId: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke("manage-email-config", {
    body: { action: "delete", companyId },
  });

  if (error) {
    console.error("[emailConfigApi] Erreur deleteEmailConfig:", error);
    throw new Error(error.message || "Erreur lors de la suppression");
  }

  if (!data?.success) {
    throw new Error(data?.error || "Erreur inconnue");
  }
}
