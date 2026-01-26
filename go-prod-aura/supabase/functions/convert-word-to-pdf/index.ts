// deno-lint-ignore-file no-explicit-any
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CLOUDCONVERT_API_KEY = Deno.env.get("CLOUDCONVERT_API_KEY");

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

console.log("[convert-word-to-pdf] v1 initialized");

// =============================================================================
// CORS Headers
// =============================================================================
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// =============================================================================
// CloudConvert API - Conversion DOCX vers PDF
// =============================================================================
async function convertWithCloudConvert(wordBuffer: ArrayBuffer, fileName: string): Promise<ArrayBuffer> {
  if (!CLOUDCONVERT_API_KEY) {
    throw new Error("CLOUDCONVERT_API_KEY non configurée");
  }

  const baseUrl = "https://api.cloudconvert.com/v2";
  const headers = {
    "Authorization": `Bearer ${CLOUDCONVERT_API_KEY}`,
    "Content-Type": "application/json",
  };

  // 1. Créer un job avec import/upload, convert, export
  console.log("[convert] Création du job CloudConvert...");
  const jobResponse = await fetch(`${baseUrl}/jobs`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      tasks: {
        "import-file": {
          operation: "import/upload",
        },
        "convert-to-pdf": {
          operation: "convert",
          input: ["import-file"],
          input_format: "docx",
          output_format: "pdf",
          engine: "office",
        },
        "export-result": {
          operation: "export/url",
          input: ["convert-to-pdf"],
          inline: false,
          archive_multiple_files: false,
        },
      },
      tag: "goprod-offer-conversion",
    }),
  });

  if (!jobResponse.ok) {
    const error = await jobResponse.text();
    console.error("[convert] Erreur création job:", error);
    throw new Error(`Erreur CloudConvert: ${error}`);
  }

  const job = await jobResponse.json();
  const jobId = job.data.id;
  console.log("[convert] Job créé:", jobId);

  // 2. Trouver la tâche d'upload
  const uploadTask = job.data.tasks.find((t: any) => t.name === "import-file");
  if (!uploadTask?.result?.form) {
    throw new Error("Impossible de trouver l'URL d'upload");
  }

  // 3. Upload du fichier Word
  console.log("[convert] Upload du fichier Word...");
  const formData = new FormData();
  
  // Ajouter les paramètres du formulaire
  for (const [key, value] of Object.entries(uploadTask.result.form.parameters)) {
    formData.append(key, value as string);
  }
  
  // Ajouter le fichier
  const blob = new Blob([wordBuffer], { 
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" 
  });
  formData.append("file", blob, fileName);

  const uploadResponse = await fetch(uploadTask.result.form.url, {
    method: "POST",
    body: formData,
  });

  if (!uploadResponse.ok) {
    const error = await uploadResponse.text();
    console.error("[convert] Erreur upload:", error);
    throw new Error(`Erreur upload: ${error}`);
  }

  console.log("[convert] Upload réussi, attente de la conversion...");

  // 4. Attendre la fin du job (polling)
  let attempts = 0;
  const maxAttempts = 60; // 60 secondes max
  
  while (attempts < maxAttempts) {
    await new Promise(r => setTimeout(r, 1000));
    
    const statusResponse = await fetch(`${baseUrl}/jobs/${jobId}`, { headers });
    const statusData = await statusResponse.json();
    const status = statusData.data.status;
    
    console.log(`[convert] Status: ${status} (attempt ${attempts + 1})`);
    
    if (status === "finished") {
      // Trouver la tâche d'export
      const exportTask = statusData.data.tasks.find((t: any) => t.name === "export-result");
      if (exportTask?.result?.files?.[0]?.url) {
        const pdfUrl = exportTask.result.files[0].url;
        console.log("[convert] PDF prêt, téléchargement...");
        
        // Télécharger le PDF
        const pdfResponse = await fetch(pdfUrl);
        if (!pdfResponse.ok) {
          throw new Error("Erreur téléchargement PDF");
        }
        
        return await pdfResponse.arrayBuffer();
      }
      throw new Error("URL du PDF non trouvée");
    }
    
    if (status === "error") {
      const errorTask = statusData.data.tasks.find((t: any) => t.status === "error");
      throw new Error(`Erreur conversion: ${errorTask?.message || "Erreur inconnue"}`);
    }
    
    attempts++;
  }

  throw new Error("Timeout: conversion trop longue");
}

// =============================================================================
// Handler principal
// =============================================================================
Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  console.log("[convert-word-to-pdf] Requête reçue");
  
  // Vérifier l'authentification (JWT ou API Key)
  const authHeader = req.headers.get("Authorization");
  const apiKey = req.headers.get("apikey");
  
  if (!authHeader && !apiKey) {
    console.warn("[convert-word-to-pdf] Pas d'authentification fournie");
    return new Response(
      JSON.stringify({ ok: false, error: "Authentication required" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
  
  console.log("[convert-word-to-pdf] Auth OK");

  try {
    const body = await req.json().catch(() => ({}));
    const { word_storage_path, offer_id } = body;

    if (!word_storage_path) {
      return new Response(
        JSON.stringify({ ok: false, error: "word_storage_path requis" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Télécharger le fichier Word depuis Supabase Storage
    console.log("[convert] Téléchargement du Word:", word_storage_path);
    const { data: wordData, error: downloadError } = await supabase.storage
      .from("offers")
      .download(word_storage_path);

    if (downloadError || !wordData) {
      console.error("[convert] Erreur téléchargement:", downloadError);
      return new Response(
        JSON.stringify({ ok: false, error: "Impossible de télécharger le fichier Word" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const wordBuffer = await wordData.arrayBuffer();
    const fileName = word_storage_path.split("/").pop() || "document.docx";
    console.log("[convert] Fichier téléchargé:", fileName, "- Taille:", wordBuffer.byteLength);

    // 2. Convertir en PDF
    console.log("[convert] Démarrage conversion CloudConvert...");
    const pdfBuffer = await convertWithCloudConvert(wordBuffer, fileName);
    console.log("[convert] PDF généré - Taille:", pdfBuffer.byteLength);

    // 3. Upload du PDF dans Supabase Storage
    const pdfPath = word_storage_path.replace(/\.docx$/i, ".pdf");
    console.log("[convert] Upload du PDF:", pdfPath);

    const { error: uploadError } = await supabase.storage
      .from("offers")
      .upload(pdfPath, pdfBuffer, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) {
      console.error("[convert] Erreur upload PDF:", uploadError);
      return new Response(
        JSON.stringify({ ok: false, error: "Erreur upload PDF: " + uploadError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Mettre à jour l'offre si offer_id fourni
    if (offer_id) {
      const { error: updateError } = await supabase
        .from("offers")
        .update({ pdf_storage_path: pdfPath })
        .eq("id", offer_id);

      if (updateError) {
        console.warn("[convert] Erreur mise à jour offre:", updateError);
      }
    }

    // 5. Créer une URL signée pour le PDF
    const { data: signedUrlData } = await supabase.storage
      .from("offers")
      .createSignedUrl(pdfPath, 300); // 5 minutes

    console.log("[convert] Conversion terminée avec succès!");

    return new Response(
      JSON.stringify({
        ok: true,
        pdf_storage_path: pdfPath,
        signed_url: signedUrlData?.signedUrl || null,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("[convert-word-to-pdf] ERREUR:", error?.message || String(error));
    return new Response(
      JSON.stringify({ ok: false, error: error?.message || "Erreur interne" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
