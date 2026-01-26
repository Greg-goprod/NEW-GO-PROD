// deno-lint-ignore-file no-explicit-any
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ENCRYPTION_KEY = Deno.env.get("SMTP_ENCRYPTION_KEY") || "GoProdEncrypt32CharKeyChange!!";

// Configuration du relais SMTP (Railway)
const SMTP_RELAY_URL = Deno.env.get("SMTP_RELAY_URL");
const SMTP_RELAY_API_KEY = Deno.env.get("SMTP_RELAY_API_KEY");

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

console.log("[manage-smtp-config] v4 - Simple encryption");

// =============================================================================
// CORS Headers
// =============================================================================
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// =============================================================================
// Chiffrement XOR simple (compatible avec Railway)
// =============================================================================
function encryptPassword(password: string): string {
  let result = "";
  for (let i = 0; i < password.length; i++) {
    result += String.fromCharCode(
      password.charCodeAt(i) ^ ENCRYPTION_KEY.charCodeAt(i % ENCRYPTION_KEY.length)
    );
  }
  return btoa(result);
}

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
    return encrypted;
  }
}

// =============================================================================
// Types
// =============================================================================
interface CreateConfigRequest {
  action: "create";
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

interface UpdateConfigRequest {
  action: "update";
  configId: string;
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

interface DeleteConfigRequest {
  action: "delete";
  configId: string;
}

interface TestConfigRequest {
  action: "test";
  configId?: string;
  host?: string;
  port?: number;
  secure?: boolean;
  username?: string;
  password?: string;
  fromEmail?: string;
  fromName?: string;
  testEmail: string;
}

interface ListConfigsRequest {
  action: "list";
  companyId: string;
}

type ConfigRequest = 
  | CreateConfigRequest 
  | UpdateConfigRequest 
  | DeleteConfigRequest
  | TestConfigRequest
  | ListConfigsRequest;

// =============================================================================
// Handlers
// =============================================================================

async function handleCreate(req: CreateConfigRequest) {
  const { companyId, name, host, port, secure, username, password, fromEmail, fromName, replyTo, isDefault } = req;

  // Chiffrer le mot de passe
  const passwordEncrypted = encryptPassword(password);

  const { data, error } = await supabase
    .from("smtp_configs")
    .insert({
      company_id: companyId,
      name,
      host,
      port,
      secure,
      username,
      password_encrypted: passwordEncrypted,
      from_email: fromEmail,
      from_name: fromName,
      reply_to: replyTo || null,
      is_default: isDefault ?? false,
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    console.error("[manage-smtp-config] Erreur création:", error);
    throw new Error(error.message);
  }

  const { password_encrypted: _, ...safeData } = data;
  return { success: true, config: safeData };
}

async function handleUpdate(req: UpdateConfigRequest) {
  const { configId, password, ...updates } = req;

  const updateData: any = {};
  
  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.host !== undefined) updateData.host = updates.host;
  if (updates.port !== undefined) updateData.port = updates.port;
  if (updates.secure !== undefined) updateData.secure = updates.secure;
  if (updates.username !== undefined) updateData.username = updates.username;
  if (updates.fromEmail !== undefined) updateData.from_email = updates.fromEmail;
  if (updates.fromName !== undefined) updateData.from_name = updates.fromName;
  if (updates.replyTo !== undefined) updateData.reply_to = updates.replyTo || null;
  if (updates.isActive !== undefined) updateData.is_active = updates.isActive;
  if (updates.isDefault !== undefined) updateData.is_default = updates.isDefault;
  
  if (password) {
    updateData.password_encrypted = encryptPassword(password);
  }

  const { data, error } = await supabase
    .from("smtp_configs")
    .update(updateData)
    .eq("id", configId)
    .select()
    .single();

  if (error) {
    console.error("[manage-smtp-config] Erreur mise à jour:", error);
    throw new Error(error.message);
  }

  const { password_encrypted: _, ...safeData } = data;
  return { success: true, config: safeData };
}

async function handleDelete(req: DeleteConfigRequest) {
  const { configId } = req;

  const { error } = await supabase
    .from("smtp_configs")
    .delete()
    .eq("id", configId);

  if (error) {
    console.error("[manage-smtp-config] Erreur suppression:", error);
    throw new Error(error.message);
  }

  return { success: true };
}

async function handleTest(req: TestConfigRequest) {
  const { testEmail, configId } = req;

  if (!SMTP_RELAY_URL || !SMTP_RELAY_API_KEY) {
    console.error("[manage-smtp-config] SMTP_RELAY_URL:", SMTP_RELAY_URL);
    console.error("[manage-smtp-config] SMTP_RELAY_API_KEY:", SMTP_RELAY_API_KEY ? "SET" : "NOT SET");
    throw new Error("Service d'envoi non configuré. Contactez l'administrateur.");
  }

  let host: string, port: number, username: string, password: string, fromEmail: string, fromName: string;

  if (configId) {
    // Tester une config existante
    const { data, error } = await supabase
      .from("smtp_configs")
      .select("*")
      .eq("id", configId)
      .single();

    if (error || !data) {
      throw new Error("Configuration non trouvée");
    }

    host = data.host;
    port = data.port;
    username = data.username;
    // Déchiffrer le mot de passe pour l'envoyer à Railway
    password = decryptPassword(data.password_encrypted);
    fromEmail = data.from_email;
    fromName = data.from_name;
  } else {
    // Test direct avec paramètres fournis
    if (!req.host || !req.username || !req.password || !req.fromEmail) {
      throw new Error("Paramètres SMTP manquants pour le test");
    }
    host = req.host;
    port = req.port || 587;
    username = req.username;
    password = req.password; // Mot de passe en clair pour le test direct
    fromEmail = req.fromEmail;
    fromName = req.fromName || "Test SMTP";
  }

  // Envoyer l'email de test via le relais Railway
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px;">
      <h2 style="color: #667eea;">✅ Configuration SMTP validée !</h2>
      <p>Votre configuration email fonctionne correctement.</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
      <p style="color: #666; font-size: 12px;">
        <strong>Serveur :</strong> ${host}:${port}<br>
        <strong>Expéditeur :</strong> ${fromName} &lt;${fromEmail}&gt;<br>
        <strong>Date :</strong> ${new Date().toLocaleString('fr-FR')}
      </p>
      <p style="color: #999; font-size: 11px;">Envoyé depuis Go-Prod via votre serveur SMTP</p>
    </div>
  `;

  try {
    const fullUrl = `${SMTP_RELAY_URL}/send`;
    console.log("[manage-smtp-config] Envoi test vers Railway:", fullUrl);
    console.log("[manage-smtp-config] SMTP Host:", host, "Port:", port, "Username:", username);
    
    const response = await fetch(fullUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": SMTP_RELAY_API_KEY,
      },
      body: JSON.stringify({
        smtp: {
          host,
          port,
          username,
          password, // Mot de passe en clair pour Railway
        },
        email: {
          from: fromEmail,
          fromName,
          to: testEmail,
          subject: "Test de configuration email - Go-Prod",
          html: htmlContent,
        },
      }),
    });

    const responseText = await response.text();
    console.log("[manage-smtp-config] Réponse Railway brute:", responseText);
    
    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      throw new Error(`Réponse Railway invalide: ${responseText.substring(0, 200)}`);
    }

    if (!response.ok) {
      console.error("[manage-smtp-config] Railway error status:", response.status);
      throw new Error(data.error || `Erreur Railway: ${response.status}`);
    }

    // Mettre à jour last_tested_at
    if (configId) {
      await supabase
        .from("smtp_configs")
        .update({ last_tested_at: new Date().toISOString() })
        .eq("id", configId);
    }

    return { success: true, message: "Email de test envoyé avec succès ! Vérifiez votre boîte de réception." };

  } catch (error: any) {
    console.error("[manage-smtp-config] Erreur test:", error);
    throw new Error(`Échec de l'envoi: ${error.message}`);
  }
}

async function handleList(req: ListConfigsRequest) {
  const { companyId } = req;

  const { data, error } = await supabase
    .from("smtp_configs")
    .select("id, company_id, name, host, port, secure, username, from_email, from_name, reply_to, is_active, is_default, created_at, updated_at, last_tested_at")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[manage-smtp-config] Erreur liste:", error);
    throw new Error(error.message);
  }

  return { success: true, configs: data || [] };
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
    const body: ConfigRequest = await req.json();

    if (!body.action) {
      return new Response(
        JSON.stringify({ success: false, error: "Action requise" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let result;

    switch (body.action) {
      case "create":
        result = await handleCreate(body as CreateConfigRequest);
        break;
      case "update":
        result = await handleUpdate(body as UpdateConfigRequest);
        break;
      case "delete":
        result = await handleDelete(body as DeleteConfigRequest);
        break;
      case "test":
        result = await handleTest(body as TestConfigRequest);
        break;
      case "list":
        result = await handleList(body as ListConfigsRequest);
        break;
      default:
        return new Response(
          JSON.stringify({ success: false, error: "Action inconnue" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("[manage-smtp-config] Erreur:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || "Erreur interne" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
