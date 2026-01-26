// deno-lint-ignore-file no-explicit-any
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

console.log("[manage-email-config] v1 Brevo initialized");

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
interface SaveConfigRequest {
  action: "save";
  companyId: string;
  brevoApiKey: string;
  fromEmail: string;
  fromName: string;
  replyTo?: string;
}

interface GetConfigRequest {
  action: "get";
  companyId: string;
}

interface TestConfigRequest {
  action: "test";
  companyId?: string;
  brevoApiKey?: string;
  fromEmail?: string;
  fromName?: string;
  testEmail: string;
}

interface DeleteConfigRequest {
  action: "delete";
  companyId: string;
}

type ConfigRequest = SaveConfigRequest | GetConfigRequest | TestConfigRequest | DeleteConfigRequest;

// =============================================================================
// Handlers
// =============================================================================

async function handleSave(req: SaveConfigRequest) {
  const { companyId, brevoApiKey, fromEmail, fromName, replyTo } = req;

  // Vérifier si une config existe déjà
  const { data: existing } = await supabase
    .from("email_configs")
    .select("id")
    .eq("company_id", companyId)
    .maybeSingle();

  if (existing) {
    // Mise à jour
    const { data, error } = await supabase
      .from("email_configs")
      .update({
        brevo_api_key: brevoApiKey,
        from_email: fromEmail,
        from_name: fromName,
        reply_to: replyTo || null,
        is_active: true,
      })
      .eq("id", existing.id)
      .select("id, company_id, from_email, from_name, reply_to, is_active, created_at, updated_at, last_tested_at")
      .single();

    if (error) {
      console.error("[manage-email-config] Erreur mise à jour:", error);
      throw new Error(error.message);
    }

    return { success: true, config: data, message: "Configuration mise à jour" };
  } else {
    // Création
    const { data, error } = await supabase
      .from("email_configs")
      .insert({
        company_id: companyId,
        brevo_api_key: brevoApiKey,
        from_email: fromEmail,
        from_name: fromName,
        reply_to: replyTo || null,
        is_active: true,
      })
      .select("id, company_id, from_email, from_name, reply_to, is_active, created_at, updated_at, last_tested_at")
      .single();

    if (error) {
      console.error("[manage-email-config] Erreur création:", error);
      throw new Error(error.message);
    }

    return { success: true, config: data, message: "Configuration créée" };
  }
}

async function handleGet(req: GetConfigRequest) {
  const { companyId } = req;

  const { data, error } = await supabase
    .from("email_configs")
    .select("id, company_id, from_email, from_name, reply_to, is_active, created_at, updated_at, last_tested_at")
    .eq("company_id", companyId)
    .maybeSingle();

  if (error) {
    console.error("[manage-email-config] Erreur récupération:", error);
    throw new Error(error.message);
  }

  return { success: true, config: data };
}

async function handleTest(req: TestConfigRequest) {
  const { testEmail, companyId, brevoApiKey, fromEmail, fromName } = req;

  let apiKey: string;
  let senderEmail: string;
  let senderName: string;

  if (companyId && !brevoApiKey) {
    // Tester la config existante
    const { data, error } = await supabase
      .from("email_configs")
      .select("*")
      .eq("company_id", companyId)
      .single();

    if (error || !data) {
      throw new Error("Configuration non trouvée");
    }

    apiKey = data.brevo_api_key;
    senderEmail = data.from_email;
    senderName = data.from_name;
  } else if (brevoApiKey && fromEmail && fromName) {
    // Test direct
    apiKey = brevoApiKey;
    senderEmail = fromEmail;
    senderName = fromName;
  } else {
    throw new Error("Paramètres manquants pour le test");
  }

  // Envoyer l'email de test via Brevo
  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "accept": "application/json",
      "api-key": apiKey,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      sender: { name: senderName, email: senderEmail },
      to: [{ email: testEmail }],
      subject: "Test de configuration email - Go-Prod",
      htmlContent: `
        <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px;">
          <h2 style="color: #667eea;">✅ Configuration Brevo validée !</h2>
          <p>Votre configuration email fonctionne correctement.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="color: #666; font-size: 12px;">
            <strong>Expéditeur :</strong> ${senderName} &lt;${senderEmail}&gt;<br>
            <strong>Date :</strong> ${new Date().toLocaleString('fr-FR')}
          </p>
          <p style="color: #999; font-size: 11px;">Envoyé depuis Go-Prod via Brevo</p>
        </div>
      `,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    console.error("[manage-email-config] Erreur Brevo:", data);
    throw new Error(data.message || "Erreur lors du test Brevo");
  }

  // Mettre à jour last_tested_at si c'est une config existante
  if (companyId && !brevoApiKey) {
    await supabase
      .from("email_configs")
      .update({ last_tested_at: new Date().toISOString() })
      .eq("company_id", companyId);
  }

  return { success: true, message: "Email de test envoyé avec succès !" };
}

async function handleDelete(req: DeleteConfigRequest) {
  const { companyId } = req;

  const { error } = await supabase
    .from("email_configs")
    .delete()
    .eq("company_id", companyId);

  if (error) {
    console.error("[manage-email-config] Erreur suppression:", error);
    throw new Error(error.message);
  }

  return { success: true, message: "Configuration supprimée" };
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
      case "save":
        result = await handleSave(body as SaveConfigRequest);
        break;
      case "get":
        result = await handleGet(body as GetConfigRequest);
        break;
      case "test":
        result = await handleTest(body as TestConfigRequest);
        break;
      case "delete":
        result = await handleDelete(body as DeleteConfigRequest);
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
    console.error("[manage-email-config] Erreur:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || "Erreur interne" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
