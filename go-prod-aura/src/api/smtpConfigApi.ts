/**
 * API pour la gestion des configurations SMTP
 * Interagit avec l'Edge Function manage-smtp-config
 */

import { supabase } from "@/lib/supabaseClient";

// =============================================================================
// Types
// =============================================================================

export interface SmtpConfig {
  id: string;
  company_id: string;
  name: string;
  host: string;
  port: number;
  secure: boolean;
  username: string;
  from_email: string;
  from_name: string;
  reply_to: string | null;
  is_active: boolean;
  is_default: boolean;
  created_at: string;
  updated_at: string;
  last_tested_at: string | null;
}

export interface SmtpConfigCreate {
  companyId: string;
  name: string;
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
  fromEmail: string;
  fromName: string;
  replyTo?: string;
  isDefault?: boolean;
}

export interface SmtpConfigUpdate {
  name?: string;
  host?: string;
  port?: number;
  secure?: boolean;
  username?: string;
  password?: string;
  fromEmail?: string;
  fromName?: string;
  replyTo?: string;
  isActive?: boolean;
  isDefault?: boolean;
}

// =============================================================================
// Presets SMTP communs
// =============================================================================

export interface SmtpPreset {
  name: string;
  host: string;
  port: number;
  secure: boolean;
  notes?: string;
}

export const SMTP_PRESETS: SmtpPreset[] = [
  { name: "Infomaniak", host: "mail.infomaniak.com", port: 587, secure: true, notes: "Hébergeur suisse" },
  { name: "OVH", host: "ssl0.ovh.net", port: 465, secure: true },
  { name: "Gandi", host: "mail.gandi.net", port: 587, secure: true },
  { name: "Gmail", host: "smtp.gmail.com", port: 587, secure: true, notes: "Nécessite mot de passe d'application" },
  { name: "Outlook/Office365", host: "smtp.office365.com", port: 587, secure: true },
  { name: "Yahoo", host: "smtp.mail.yahoo.com", port: 465, secure: true },
  { name: "Ionos (1&1)", host: "smtp.ionos.fr", port: 587, secure: true },
  { name: "Free", host: "smtp.free.fr", port: 465, secure: true },
  { name: "Orange", host: "smtp.orange.fr", port: 465, secure: true },
  { name: "Autre", host: "", port: 587, secure: true },
];

// =============================================================================
// API Functions
// =============================================================================

/**
 * Récupère toutes les configurations SMTP d'une company
 */
export async function fetchSmtpConfigs(companyId: string): Promise<SmtpConfig[]> {
  const { data, error } = await supabase.functions.invoke("manage-smtp-config", {
    body: { action: "list", companyId },
  });

  if (error) {
    console.error("[smtpConfigApi] Erreur fetchSmtpConfigs:", error);
    throw new Error(error.message || "Erreur lors de la récupération des configurations");
  }

  if (!data?.success) {
    throw new Error(data?.error || "Erreur inconnue");
  }

  return data.configs || [];
}

/**
 * Crée une nouvelle configuration SMTP
 */
export async function createSmtpConfig(config: SmtpConfigCreate): Promise<SmtpConfig> {
  const { data, error } = await supabase.functions.invoke("manage-smtp-config", {
    body: { action: "create", ...config },
  });

  if (error) {
    console.error("[smtpConfigApi] Erreur createSmtpConfig:", error);
    throw new Error(error.message || "Erreur lors de la création");
  }

  if (!data?.success) {
    throw new Error(data?.error || "Erreur inconnue");
  }

  return data.config;
}

/**
 * Met à jour une configuration SMTP
 */
export async function updateSmtpConfig(configId: string, updates: SmtpConfigUpdate): Promise<SmtpConfig> {
  const { data, error } = await supabase.functions.invoke("manage-smtp-config", {
    body: { action: "update", configId, ...updates },
  });

  if (error) {
    console.error("[smtpConfigApi] Erreur updateSmtpConfig:", error);
    throw new Error(error.message || "Erreur lors de la mise à jour");
  }

  if (!data?.success) {
    throw new Error(data?.error || "Erreur inconnue");
  }

  return data.config;
}

/**
 * Supprime une configuration SMTP
 */
export async function deleteSmtpConfig(configId: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke("manage-smtp-config", {
    body: { action: "delete", configId },
  });

  if (error) {
    console.error("[smtpConfigApi] Erreur deleteSmtpConfig:", error);
    throw new Error(error.message || "Erreur lors de la suppression");
  }

  if (!data?.success) {
    throw new Error(data?.error || "Erreur inconnue");
  }
}

/**
 * Teste une configuration SMTP existante
 */
export async function testSmtpConfig(configId: string, testEmail: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke("manage-smtp-config", {
    body: { action: "test", configId, testEmail },
  });

  if (error) {
    console.error("[smtpConfigApi] Erreur testSmtpConfig:", error);
    throw new Error(error.message || "Erreur lors du test");
  }

  if (!data?.success) {
    throw new Error(data?.error || "Échec du test");
  }

  return data.message;
}

/**
 * Teste une configuration SMTP sans la sauvegarder
 */
export async function testSmtpConfigDirect(params: {
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
  fromEmail: string;
  fromName: string;
  testEmail: string;
}): Promise<string> {
  const { data, error } = await supabase.functions.invoke("manage-smtp-config", {
    body: { action: "test", ...params },
  });

  if (error) {
    console.error("[smtpConfigApi] Erreur testSmtpConfigDirect:", error);
    throw new Error(error.message || "Erreur lors du test");
  }

  if (!data?.success) {
    throw new Error(data?.error || "Échec du test");
  }

  return data.message;
}

/**
 * Définit une configuration comme défaut
 */
export async function setDefaultSmtpConfig(configId: string): Promise<SmtpConfig> {
  return updateSmtpConfig(configId, { isDefault: true });
}
