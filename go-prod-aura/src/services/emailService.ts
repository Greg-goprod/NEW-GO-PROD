/**
 * Service d'envoi d'emails via SMTP (Edge Function Supabase)
 * Configuration SMTP par tenant stockée dans smtp_configs
 */

import { supabase } from "@/lib/supabaseClient";
import { getCurrentCompanyId } from "@/lib/tenant";

// =============================================================================
// Types
// =============================================================================

export type Sender = { 
  name: string; 
  email: string; 
  label?: string;
  replyTo?: string;
};

export interface SendEmailParams {
  to: string | string[];
  cc?: string[];
  bcc?: string[];
  from?: string;
  fromName?: string;
  replyTo?: string;
  subject: string;
  html?: string;
  text?: string;
  companyId?: string; // Si non fourni, utilise getCurrentCompanyId()
  smtpConfigId?: string; // Si non fourni, utilise la config par défaut
  attachments?: Array<{
    filename: string;
    content: string; // Base64 encoded
    contentType?: string;
  }>;
  metadata?: {
    type?: "offer" | "contract" | "notification" | "campaign";
    offerId?: string;
    artistName?: string;
    eventName?: string;
  };
}

export interface SendEmailResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

// =============================================================================
// Expéditeurs par défaut (fallback)
// =============================================================================

export const DEFAULT_SENDERS: Sender[] = [
  { name: "Go-Prod", email: "noreply@go-prod.app", label: "Go-Prod (par défaut)" },
];

// Pour rétrocompatibilité
export const AVAILABLE_SENDERS: Sender[] = DEFAULT_SENDERS;

// =============================================================================
// Fonction principale d'envoi d'email
// =============================================================================

/**
 * Envoie un email via la Edge Function Supabase (SMTP)
 */
export async function sendEmail(params: SendEmailParams): Promise<SendEmailResponse> {
  try {
    // Récupérer le companyId si non fourni
    const companyId = params.companyId || getCurrentCompanyId();
    
    if (!companyId) {
      return {
        success: false,
        error: "Aucune entreprise sélectionnée. Veuillez vous connecter.",
      };
    }

    // Log des paramètres envoyés (sans le contenu des pièces jointes pour éviter les logs trop longs)
    const logParams = {
      ...params,
      companyId,
      attachments: params.attachments?.map(a => ({ 
        filename: a.filename, 
        contentType: a.contentType,
        contentLength: a.content?.length || 0 
      })),
    };
    console.log("[emailService] Envoi email avec params:", logParams);

    const { data, error } = await supabase.functions.invoke("send-email", {
      body: {
        ...params,
        companyId,
      },
    });

    console.log("[emailService] Réponse Edge Function:", { data, error });

    if (error) {
      console.error("[emailService] Erreur Edge Function:", error);
      // Essayer de récupérer plus d'infos sur l'erreur
      const errorDetails = (error as any)?.context?.body || (error as any)?.message || error;
      console.error("[emailService] Détails erreur:", errorDetails);
      return {
        success: false,
        error: typeof errorDetails === 'string' ? errorDetails : (error.message || "Erreur lors de l'appel à la fonction d'envoi"),
      };
    }

    if (!data?.success) {
      console.error("[emailService] Échec retourné par Edge Function:", data);
      return {
        success: false,
        error: data?.error || "Erreur inconnue lors de l'envoi",
      };
    }

    console.log("[emailService] Email envoyé avec succès, messageId:", data.messageId);
    return {
      success: true,
      messageId: data.messageId,
    };
  } catch (err: any) {
    console.error("[emailService] Erreur inattendue:", err);
    return {
      success: false,
      error: err.message || "Erreur inattendue",
    };
  }
}

// =============================================================================
// Fonctions pour les expéditeurs (simplifié avec SMTP)
// =============================================================================

/**
 * Récupère les expéditeurs disponibles (depuis la config SMTP)
 */
export async function getAvailableSenders(companyId: string): Promise<Sender[]> {
  try {
    const { data, error } = await supabase
      .from("smtp_configs")
      .select("from_name, from_email, reply_to")
      .eq("company_id", companyId)
      .eq("is_active", true);

    if (error || !data || data.length === 0) {
      return DEFAULT_SENDERS;
    }

    return data.map(config => ({
      name: config.from_name,
      email: config.from_email,
      label: config.from_name,
      replyTo: config.reply_to || undefined,
    }));
  } catch (error) {
    console.error("[emailService] Erreur récupération expéditeurs:", error);
    return DEFAULT_SENDERS;
  }
}

/**
 * Récupère l'expéditeur par défaut
 */
export async function getDefaultSender(companyId: string): Promise<Sender> {
  try {
    const { data, error } = await supabase
      .from("smtp_configs")
      .select("from_name, from_email, reply_to")
      .eq("company_id", companyId)
      .eq("is_active", true)
      .eq("is_default", true)
      .maybeSingle();

    if (error || !data) {
      // Fallback: prendre la première config active
      const { data: firstConfig } = await supabase
        .from("smtp_configs")
        .select("from_name, from_email, reply_to")
        .eq("company_id", companyId)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();

      if (firstConfig) {
        return {
          name: firstConfig.from_name,
          email: firstConfig.from_email,
          replyTo: firstConfig.reply_to || undefined,
        };
      }

      return DEFAULT_SENDERS[0];
    }

    return {
      name: data.from_name,
      email: data.from_email,
      replyTo: data.reply_to || undefined,
    };
  } catch (error) {
    console.error("[emailService] Erreur récupération expéditeur par défaut:", error);
    return DEFAULT_SENDERS[0];
  }
}

// =============================================================================
// Fonctions spécialisées pour les différents cas d'usage
// =============================================================================

/**
 * Envoie un email d'offre artiste avec PDF en pièce jointe
 */
export async function sendOfferEmail(params: {
  toEmail: string;
  toName?: string;
  ccEmails?: string[];
  bccEmails?: string[];
  subject: string;
  htmlContent?: string;
  pdfBase64?: string; // PDF encodé en base64
  pdfFileName?: string;
  artistName?: string;
  eventName?: string;
  validityDate?: string;
  customMessage?: string;
  companyId?: string; // ID de l'entreprise pour la config SMTP
  additionalAttachments?: Array<{ filename: string; content: string; contentType: string }>; // Annexes additionnelles
}): Promise<SendEmailResponse> {
  // Construire le HTML de l'email
  const html = params.htmlContent || buildOfferEmailHtml({
    recipientName: params.toName,
    artistName: params.artistName,
    eventName: params.eventName,
    validityDate: params.validityDate,
    customMessage: params.customMessage,
    pdfUrl: "", // Pas de lien, le PDF est en pièce jointe
    senderName: params.eventName || "L'équipe",
  });

  // Préparer les pièces jointes
  const attachments: Array<{ filename: string; content: string; contentType?: string }> = [];
  
  // Ajouter le PDF de l'offre
  if (params.pdfBase64 && params.pdfFileName) {
    attachments.push({
      filename: params.pdfFileName,
      content: params.pdfBase64,
      contentType: "application/pdf",
    });
  }

  // Ajouter les annexes additionnelles
  if (params.additionalAttachments && params.additionalAttachments.length > 0) {
    attachments.push(...params.additionalAttachments);
  }

  return sendEmail({
    to: params.toEmail,
    cc: params.ccEmails,
    bcc: params.bccEmails,
    subject: params.subject,
    html,
    attachments: attachments.length > 0 ? attachments : undefined,
    companyId: params.companyId,
    metadata: {
      type: "offer",
      artistName: params.artistName,
      eventName: params.eventName,
    },
  });
}

/**
 * Envoie un email de contrat pour signature
 */
export async function sendContractEmail(params: {
  toEmail: string;
  toName?: string;
  ccEmails?: string[];
  sender: Sender;
  subject: string;
  artistName: string;
  eventName: string;
  signatureUrl: string;
  customMessage?: string;
}): Promise<SendEmailResponse> {
  const html = buildContractEmailHtml({
    recipientName: params.toName,
    artistName: params.artistName,
    eventName: params.eventName,
    signatureUrl: params.signatureUrl,
    customMessage: params.customMessage,
    senderName: params.sender.name,
  });

  return sendEmail({
    to: params.toEmail,
    cc: params.ccEmails,
    fromName: params.sender.name,
    from: params.sender.email,
    replyTo: params.sender.replyTo || params.sender.email,
    subject: params.subject,
    html,
    metadata: {
      type: "contract",
      artistName: params.artistName,
      eventName: params.eventName,
    },
  });
}

/**
 * Envoie un email de notification simple
 */
export async function sendNotificationEmail(params: {
  toEmail: string;
  toName?: string;
  subject: string;
  message: string;
  ctaText?: string;
  ctaUrl?: string;
}): Promise<SendEmailResponse> {
  const html = buildNotificationEmailHtml({
    recipientName: params.toName,
    message: params.message,
    ctaText: params.ctaText,
    ctaUrl: params.ctaUrl,
  });

  return sendEmail({
    to: params.toEmail,
    subject: params.subject,
    html,
    metadata: {
      type: "notification",
    },
  });
}

// =============================================================================
// Templates HTML
// =============================================================================

function buildOfferEmailHtml(params: {
  recipientName?: string;
  artistName?: string;
  eventName?: string;
  validityDate?: string;
  customMessage?: string;
  pdfUrl?: string;
  senderName: string;
}): string {
  // Si un lien PDF est fourni, afficher le bouton de téléchargement
  const pdfButton = params.pdfUrl ? `
    <div style="text-align: center; margin: 30px 0;">
      <a href="${params.pdfUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 15px 30px; border-radius: 5px; font-weight: bold;">
        📄 Télécharger l'offre PDF
      </a>
    </div>
  ` : `
    <div style="background: #f0f7ff; padding: 15px; border-radius: 5px; border-left: 4px solid #667eea; margin: 20px 0;">
      📎 <strong>L'offre PDF est jointe à cet email.</strong>
    </div>
  `;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Offre Artiste</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">Offre Artiste</h1>
  </div>
  
  <div style="background: #fff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
    <p>Bonjour${params.recipientName ? ` ${params.recipientName}` : ''},</p>
    
    <p>Veuillez trouver ci-joint notre offre pour <strong>${params.artistName || 'l\'artiste'}</strong>${params.eventName ? ` pour l'événement <strong>${params.eventName}</strong>` : ''}.</p>
    
    ${params.customMessage ? `<p>${params.customMessage}</p>` : ''}
    
    ${params.validityDate ? `<p style="background: #f5f5f5; padding: 15px; border-radius: 5px; border-left: 4px solid #667eea;"><strong>Date de validité :</strong> ${params.validityDate}</p>` : ''}
    
    ${pdfButton}
    
    <p>N'hésitez pas à nous contacter pour toute question.</p>
    
    <p>Cordialement,<br><strong>${params.senderName}</strong></p>
  </div>
  
  <div style="text-align: center; padding: 20px; color: #666; font-size: 12px;">
    <p>Cet email a été envoyé via Go-Prod</p>
  </div>
</body>
</html>
  `.trim();
}

function buildContractEmailHtml(params: {
  recipientName?: string;
  artistName: string;
  eventName: string;
  signatureUrl: string;
  customMessage?: string;
  senderName: string;
}): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Contrat à signer</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #34C759 0%, #30B350 100%); padding: 30px; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">Contrat à signer</h1>
  </div>
  
  <div style="background: #fff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
    <p>Bonjour${params.recipientName ? ` ${params.recipientName}` : ''},</p>
    
    <p>Le contrat pour <strong>${params.artistName}</strong> pour l'événement <strong>${params.eventName}</strong> est prêt pour signature.</p>
    
    ${params.customMessage ? `<p>${params.customMessage}</p>` : ''}
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${params.signatureUrl}" style="display: inline-block; background: linear-gradient(135deg, #34C759 0%, #30B350 100%); color: white; text-decoration: none; padding: 15px 30px; border-radius: 5px; font-weight: bold;">
        ✍️ Signer le contrat
      </a>
    </div>
    
    <p>Ce lien est valide pour une durée limitée.</p>
    
    <p>Cordialement,<br><strong>${params.senderName}</strong></p>
  </div>
  
  <div style="text-align: center; padding: 20px; color: #666; font-size: 12px;">
    <p>Cet email a été envoyé via Go-Prod</p>
  </div>
</body>
</html>
  `.trim();
}

function buildNotificationEmailHtml(params: {
  recipientName?: string;
  message: string;
  ctaText?: string;
  ctaUrl?: string;
}): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Notification</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #007AFF 0%, #0062CC 100%); padding: 30px; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">Go-Prod</h1>
  </div>
  
  <div style="background: #fff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
    <p>Bonjour${params.recipientName ? ` ${params.recipientName}` : ''},</p>
    
    <p>${params.message}</p>
    
    ${params.ctaUrl && params.ctaText ? `
    <div style="text-align: center; margin: 30px 0;">
      <a href="${params.ctaUrl}" style="display: inline-block; background: linear-gradient(135deg, #007AFF 0%, #0062CC 100%); color: white; text-decoration: none; padding: 15px 30px; border-radius: 5px; font-weight: bold;">
        ${params.ctaText}
      </a>
    </div>
    ` : ''}
    
    <p>Cordialement,<br><strong>L'équipe Go-Prod</strong></p>
  </div>
  
  <div style="text-align: center; padding: 20px; color: #666; font-size: 12px;">
    <p>Cet email a été envoyé via Go-Prod</p>
  </div>
</body>
</html>
  `.trim();
}
