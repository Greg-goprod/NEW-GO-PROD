/**
 * API pour gérer les annexes email des offres
 * Bucket: email-offers-attachments
 * Table: email_offer_attachments
 */

import { supabase } from "@/lib/supabaseClient";

const BUCKET_NAME = "email-offers-attachments";

export interface EmailOfferAttachment {
  id: string;
  company_id: string;
  name: string;
  original_filename: string;
  storage_path: string;
  file_size: number;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export type CreateAttachmentInput = {
  company_id: string;
  name: string;
  original_filename: string;
  storage_path: string;
  file_size: number;
};

export type UpdateAttachmentInput = {
  name?: string;
};

/**
 * Liste toutes les annexes d'une entreprise
 */
export async function listEmailOfferAttachments(companyId: string): Promise<EmailOfferAttachment[]> {
  const { data, error } = await supabase
    .from("email_offer_attachments")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[emailAttachmentsApi] Erreur listEmailOfferAttachments:", error);
    throw error;
  }

  return data || [];
}

/**
 * Récupère une annexe par son ID
 */
export async function getEmailOfferAttachment(id: string): Promise<EmailOfferAttachment | null> {
  const { data, error } = await supabase
    .from("email_offer_attachments")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null; // Not found
    console.error("[emailAttachmentsApi] Erreur getEmailOfferAttachment:", error);
    throw error;
  }

  return data;
}

/**
 * Upload un fichier PDF et crée l'entrée en base
 */
export async function uploadEmailOfferAttachment(
  companyId: string,
  file: File,
  customName?: string
): Promise<EmailOfferAttachment> {
  // Vérifier le type de fichier
  if (file.type !== "application/pdf") {
    throw new Error("Seuls les fichiers PDF sont acceptés");
  }

  // Vérifier la taille (max 25MB)
  const maxSize = 25 * 1024 * 1024;
  if (file.size > maxSize) {
    throw new Error("Le fichier ne doit pas dépasser 25 Mo");
  }

  // Générer un chemin unique
  const timestamp = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `${companyId}/${timestamp}_${safeName}`;

  // Upload dans le bucket
  const { error: uploadError } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(storagePath, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError) {
    console.error("[emailAttachmentsApi] Erreur upload:", uploadError);
    throw new Error(`Erreur lors de l'upload: ${uploadError.message}`);
  }

  // Récupérer l'utilisateur courant
  const { data: userData } = await supabase.auth.getUser();

  // Créer l'entrée en base
  const { data, error } = await supabase
    .from("email_offer_attachments")
    .insert({
      company_id: companyId,
      name: customName || file.name.replace(/\.pdf$/i, ""),
      original_filename: file.name,
      storage_path: storagePath,
      file_size: file.size,
      created_by: userData.user?.id || null,
    })
    .select()
    .single();

  if (error) {
    // En cas d'erreur, supprimer le fichier uploadé
    await supabase.storage.from(BUCKET_NAME).remove([storagePath]);
    console.error("[emailAttachmentsApi] Erreur création entrée:", error);
    throw error;
  }

  return data;
}

/**
 * Renomme une annexe (modifie uniquement le nom affiché)
 */
export async function renameEmailOfferAttachment(
  id: string,
  newName: string
): Promise<EmailOfferAttachment> {
  const { data, error } = await supabase
    .from("email_offer_attachments")
    .update({ name: newName })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("[emailAttachmentsApi] Erreur renameEmailOfferAttachment:", error);
    throw error;
  }

  return data;
}

/**
 * Supprime une annexe (fichier + entrée en base)
 */
export async function deleteEmailOfferAttachment(id: string): Promise<void> {
  // Récupérer l'annexe pour obtenir le storage_path
  const attachment = await getEmailOfferAttachment(id);
  if (!attachment) {
    throw new Error("Annexe non trouvée");
  }

  // Supprimer le fichier du bucket
  const { error: storageError } = await supabase.storage
    .from(BUCKET_NAME)
    .remove([attachment.storage_path]);

  if (storageError) {
    console.error("[emailAttachmentsApi] Erreur suppression fichier:", storageError);
    // On continue quand même pour supprimer l'entrée en base
  }

  // Supprimer l'entrée en base
  const { error } = await supabase
    .from("email_offer_attachments")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("[emailAttachmentsApi] Erreur deleteEmailOfferAttachment:", error);
    throw error;
  }
}

/**
 * Génère une URL signée pour prévisualiser/télécharger le fichier
 */
export async function getAttachmentSignedUrl(
  storagePath: string,
  expiresInSeconds = 300
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .createSignedUrl(storagePath, expiresInSeconds);

  if (error || !data?.signedUrl) {
    console.error("[emailAttachmentsApi] Erreur getAttachmentSignedUrl:", error);
    throw new Error("Impossible de générer l'URL du fichier");
  }

  return data.signedUrl;
}

/**
 * Télécharge le contenu d'une annexe (pour l'envoi par email)
 */
export async function downloadAttachmentContent(storagePath: string): Promise<Blob> {
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .download(storagePath);

  if (error || !data) {
    console.error("[emailAttachmentsApi] Erreur downloadAttachmentContent:", error);
    throw new Error("Impossible de télécharger le fichier");
  }

  return data;
}

/**
 * Convertit un Blob en base64
 */
export async function blobToBase64(blob: Blob): Promise<string> {
  const arrayBuffer = await blob.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);
  let binary = "";
  for (let i = 0; i < uint8Array.length; i++) {
    binary += String.fromCharCode(uint8Array[i]);
  }
  return btoa(binary);
}
