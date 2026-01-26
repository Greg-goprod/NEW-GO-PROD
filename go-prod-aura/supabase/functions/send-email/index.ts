// deno-lint-ignore-file no-explicit-any
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ENCRYPTION_KEY = Deno.env.get("SMTP_ENCRYPTION_KEY") || "GoProdEncrypt32CharKeyChange!!";

// Configuration du relais SMTP (Fly.io)
const SMTP_RELAY_URL = Deno.env.get("SMTP_RELAY_URL"); // Ex: https://smtp-relay.fly.dev
const SMTP_RELAY_API_KEY = Deno.env.get("SMTP_RELAY_API_KEY");

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

console.log("[send-email] v5 SMTP Relay with decryption");

// =============================================================================
// Déchiffrement XOR (même algo que manage-smtp-config)
// =============================================================================
function decryptPassword(encrypted: string): string {
  try {
    const data = atob(encrypted);
    let result = "";
    for (let i = 0; i < data.length; i++) {
      result += String.fromCharCode(
        data.charCodeAt(i) ^ ENCRYPTION_KEY.charCodeAt(i % ENCRYPTION_KEY.length)
      );
    }
    return result;
  } catch {
    // Si le déchiffrement échoue, retourner tel quel (peut-être pas chiffré)
    return encrypted;
  }
}

// =============================================================================
// CORS Headers
// =============================================================================
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// =============================================================================
// Types
// =============================================================================
interface Attachment {
  filename: string;
  content: string; // Base64 encoded
  contentType?: string;
}

interface EmailRequest {
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  subject: string;
  html?: string;
  text?: string;
  fromName?: string;
  from?: string;
  replyTo?: string;
  companyId: string;
  attachments?: Attachment[];
}

interface SmtpConfig {
  id: string;
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password_encrypted: string;
  from_email: string;
  from_name: string;
  reply_to: string | null;
}

// =============================================================================
// Récupérer la config SMTP de la company
// =============================================================================
async function getSmtpConfig(companyId: string): Promise<SmtpConfig | null> {
  const { data, error } = await supabase
    .from("smtp_configs")
    .select("*")
    .eq("company_id", companyId)
    .eq("is_active", true)
    .order("is_default", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[send-email] Erreur récupération config SMTP:", error);
    return null;
  }

  return data;
}

// =============================================================================
// Envoyer via le relais SMTP (Railway)
// =============================================================================
async function sendViaSmtpRelay(
  config: SmtpConfig, 
  request: EmailRequest
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  
  if (!SMTP_RELAY_URL || !SMTP_RELAY_API_KEY) {
    console.error("[send-email] SMTP_RELAY_URL ou SMTP_RELAY_API_KEY non configuré");
    return {
      success: false,
      error: "Service d'envoi non configuré. Contactez l'administrateur.",
    };
  }

  // Déchiffrer le mot de passe avant de l'envoyer au relay
  const decryptedPassword = decryptPassword(config.password_encrypted);
  
  const payload = {
    smtp: {
      host: config.host,
      port: config.port,
      username: config.username,
      password: decryptedPassword,
    },
    email: {
      from: request.from || config.from_email,
      fromName: request.fromName || config.from_name,
      to: request.to,
      cc: request.cc,
      bcc: request.bcc,
      subject: request.subject,
      html: request.html,
      text: request.text,
      replyTo: request.replyTo || config.reply_to,
      attachments: request.attachments, // Pièces jointes (base64)
    },
  };

  if (request.attachments?.length) {
    console.log(`[send-email] ${request.attachments.length} pièce(s) jointe(s)`);
  }
  
  // Debug CC/BCC
  console.log(`[send-email] To: ${request.to}`);
  console.log(`[send-email] CC: ${JSON.stringify(request.cc)}`);
  console.log(`[send-email] BCC: ${JSON.stringify(request.bcc)}`);

  try {
    const response = await fetch(`${SMTP_RELAY_URL}/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": SMTP_RELAY_API_KEY,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("[send-email] Erreur relais SMTP:", data);
      return {
        success: false,
        error: data.error || `Erreur d'envoi: ${response.status}`,
      };
    }

    console.log("[send-email] Email envoyé via relais SMTP:", data.messageId);
    return {
      success: true,
      messageId: data.messageId,
    };

  } catch (error: any) {
    console.error("[send-email] Erreur:", error);
    return {
      success: false,
      error: error.message || "Erreur de communication avec le service d'envoi",
    };
  }
}

// =============================================================================
// Handler principal
// =============================================================================
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ success: false, error: "Méthode non autorisée" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const body: EmailRequest = await req.json();

    // Validation
    if (!body.to) {
      return new Response(
        JSON.stringify({ success: false, error: "Destinataire requis" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!body.subject) {
      return new Response(
        JSON.stringify({ success: false, error: "Sujet requis" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!body.companyId) {
      return new Response(
        JSON.stringify({ success: false, error: "Company ID requis" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Récupérer la config SMTP
    const config = await getSmtpConfig(body.companyId);

    if (!config) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Aucune configuration SMTP trouvée. Veuillez configurer vos paramètres email dans les paramètres." 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Envoyer via le relais SMTP
    const result = await sendViaSmtpRelay(config, body);

    return new Response(
      JSON.stringify(result),
      { 
        status: result.success ? 200 : 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error: any) {
    console.error("[send-email] Erreur:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || "Erreur interne" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
