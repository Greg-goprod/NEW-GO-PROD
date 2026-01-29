/**
 * Composant pour gérer les annexes email des offres
 * - Upload par drag & drop
 * - Renommer les fichiers
 * - Supprimer les fichiers
 * - Prévisualiser les PDF
 */

import { useState, useEffect, useCallback, type DragEvent } from "react";
import { FileText, Upload, Trash2, Edit2, Eye, Check, X, Paperclip } from "lucide-react";
import { Card, CardHeader, CardBody } from "@/components/aura/Card";
import { Button } from "@/components/aura/Button";
import { Input } from "@/components/aura/Input";
import { Modal } from "@/components/aura/Modal";
import { ConfirmDialog } from "@/components/aura/ConfirmDialog";
import { useToast } from "@/components/aura/ToastProvider";
import {
  listEmailOfferAttachments,
  uploadEmailOfferAttachment,
  renameEmailOfferAttachment,
  deleteEmailOfferAttachment,
  getAttachmentSignedUrl,
  type EmailOfferAttachment,
} from "../emailAttachmentsApi";

interface EmailAttachmentsManagerProps {
  companyId: string | null;
}

export function EmailAttachmentsManager({ companyId }: EmailAttachmentsManagerProps) {
  const { success: toastSuccess, error: toastError } = useToast();

  // États
  const [attachments, setAttachments] = useState<EmailOfferAttachment[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  // État pour l'édition de nom
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  // État pour la prévisualisation PDF
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewName, setPreviewName] = useState<string>("");
  const [loadingPreview, setLoadingPreview] = useState(false);

  // État pour la confirmation de suppression
  const [deleteConfirm, setDeleteConfirm] = useState<EmailOfferAttachment | null>(null);

  // Charger les annexes
  const loadAttachments = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const data = await listEmailOfferAttachments(companyId);
      setAttachments(data);
    } catch (error: any) {
      console.error("[EmailAttachmentsManager] Erreur chargement:", error);
      toastError(error?.message || "Erreur lors du chargement des annexes");
    } finally {
      setLoading(false);
    }
  }, [companyId, toastError]);

  useEffect(() => {
    loadAttachments();
  }, [loadAttachments]);

  // Gérer l'upload
  const handleUpload = async (file: File) => {
    if (!companyId) return;

    if (file.type !== "application/pdf") {
      toastError("Seuls les fichiers PDF sont acceptés");
      return;
    }

    setUploading(true);
    try {
      await uploadEmailOfferAttachment(companyId, file);
      toastSuccess("Annexe ajoutée avec succès");
      loadAttachments();
    } catch (error: any) {
      console.error("[EmailAttachmentsManager] Erreur upload:", error);
      toastError(error?.message || "Erreur lors de l'upload");
    } finally {
      setUploading(false);
    }
  };

  // Gérer le drag & drop
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    const pdfFiles = files.filter((f) => f.type === "application/pdf");

    if (pdfFiles.length === 0) {
      toastError("Seuls les fichiers PDF sont acceptés");
      return;
    }

    // Upload tous les fichiers PDF
    for (const file of pdfFiles) {
      await handleUpload(file);
    }
  };

  // Gérer le renommage
  const handleStartEdit = (attachment: EmailOfferAttachment) => {
    setEditingId(attachment.id);
    setEditName(attachment.name);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditName("");
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editName.trim()) return;

    try {
      await renameEmailOfferAttachment(editingId, editName.trim());
      toastSuccess("Nom modifié avec succès");
      setEditingId(null);
      setEditName("");
      loadAttachments();
    } catch (error: any) {
      console.error("[EmailAttachmentsManager] Erreur renommage:", error);
      toastError(error?.message || "Erreur lors du renommage");
    }
  };

  // Gérer la suppression
  const handleDelete = async () => {
    if (!deleteConfirm) return;

    try {
      await deleteEmailOfferAttachment(deleteConfirm.id);
      toastSuccess("Annexe supprimée");
      setDeleteConfirm(null);
      loadAttachments();
    } catch (error: any) {
      console.error("[EmailAttachmentsManager] Erreur suppression:", error);
      toastError(error?.message || "Erreur lors de la suppression");
    }
  };

  // Gérer la prévisualisation
  const handlePreview = async (attachment: EmailOfferAttachment) => {
    setLoadingPreview(true);
    setPreviewName(attachment.name);
    try {
      const url = await getAttachmentSignedUrl(attachment.storage_path, 300);
      setPreviewUrl(url);
    } catch (error: any) {
      console.error("[EmailAttachmentsManager] Erreur prévisualisation:", error);
      toastError(error?.message || "Impossible de prévisualiser le fichier");
    } finally {
      setLoadingPreview(false);
    }
  };

  const closePreview = () => {
    setPreviewUrl(null);
    setPreviewName("");
  };

  // Formater la taille du fichier
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} o`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
            <Paperclip className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h3 className="font-semibold" style={{ color: "var(--text-primary)" }}>
              Annexes Emails
            </h3>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              Documents PDF à joindre aux emails d'offres
            </p>
          </div>
        </div>
      </CardHeader>

      <CardBody>
        <div className="space-y-4">
          {/* Zone de drag & drop */}
          <div
            className={`flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
              isDragOver ? "border-amber-500 bg-amber-500/10" : ""
            }`}
            style={{
              borderColor: isDragOver ? undefined : "var(--border-default)",
            }}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => document.getElementById("attachment-upload")?.click()}
          >
            {uploading ? (
              <div className="flex items-center gap-3">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-amber-600" />
                <span style={{ color: "var(--text-secondary)" }}>Upload en cours...</span>
              </div>
            ) : (
              <>
                <Upload
                  className="w-10 h-10 mb-2"
                  style={{ color: isDragOver ? "#d97706" : "var(--text-muted)" }}
                />
                <p className="font-medium mb-1" style={{ color: "var(--text-primary)" }}>
                  Glissez-déposez vos fichiers PDF ici
                </p>
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                  ou cliquez pour sélectionner (max 25 Mo par fichier)
                </p>
              </>
            )}
          </div>

          <input
            id="attachment-upload"
            type="file"
            accept="application/pdf"
            multiple
            className="hidden"
            onChange={async (e) => {
              const files = Array.from(e.target.files || []);
              for (const file of files) {
                await handleUpload(file);
              }
              e.target.value = "";
            }}
          />

          {/* Liste des annexes */}
          {loading ? (
            <div className="text-center py-6">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600 mx-auto" />
              <p className="mt-2 text-sm" style={{ color: "var(--text-muted)" }}>
                Chargement...
              </p>
            </div>
          ) : attachments.length === 0 ? (
            <p className="text-center py-4 text-sm" style={{ color: "var(--text-muted)" }}>
              Aucune annexe. Ajoutez des documents PDF à joindre à vos emails d'offres.
            </p>
          ) : (
            <div className="space-y-2">
              {attachments.map((attachment) => (
                <div
                  key={attachment.id}
                  className="flex items-center gap-3 p-3 rounded-lg border"
                  style={{
                    background: "var(--bg-surface)",
                    borderColor: "var(--border-default)",
                  }}
                >
                  {/* Icône PDF */}
                  <div
                    className="p-2 rounded-lg"
                    style={{ background: "rgba(239, 68, 68, 0.1)" }}
                  >
                    <FileText className="w-5 h-5 text-red-500" />
                  </div>

                  {/* Nom (éditable) */}
                  <div className="flex-1 min-w-0">
                    {editingId === attachment.id ? (
                      <div className="flex items-center gap-2">
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="flex-1"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSaveEdit();
                            if (e.key === "Escape") handleCancelEdit();
                          }}
                        />
                        <Button size="sm" variant="primary" onClick={handleSaveEdit}>
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={handleCancelEdit}>
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <p
                          className="font-medium truncate"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {attachment.name}
                        </p>
                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                          {attachment.original_filename} • {formatFileSize(attachment.file_size)}
                        </p>
                      </>
                    )}
                  </div>

                  {/* Actions */}
                  {editingId !== attachment.id && (
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handlePreview(attachment)}
                        title="Prévisualiser"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleStartEdit(attachment)}
                        title="Renommer"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-500 hover:text-red-600"
                        onClick={() => setDeleteConfirm(attachment)}
                        title="Supprimer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </CardBody>

      {/* Modal de prévisualisation PDF */}
      <Modal
        open={!!previewUrl}
        onClose={closePreview}
        title={`Prévisualisation - ${previewName}`}
        size="xl"
      >
        <div className="h-[75vh]">
          {loadingPreview ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600" />
            </div>
          ) : previewUrl ? (
            <iframe
              src={previewUrl}
              className="w-full h-full rounded-lg border"
              style={{ borderColor: "var(--border-default)" }}
              title="Prévisualisation PDF"
            />
          ) : null}
        </div>
        <div className="flex justify-end mt-4">
          <Button variant="secondary" onClick={closePreview}>
            Fermer
          </Button>
        </div>
      </Modal>

      {/* Confirmation de suppression */}
      <ConfirmDialog
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDelete}
        title="Supprimer l'annexe"
        message={`Êtes-vous sûr de vouloir supprimer "${deleteConfirm?.name}" ? Cette action est irréversible.`}
        confirmText="Supprimer"
        variant="danger"
      />
    </Card>
  );
}

export default EmailAttachmentsManager;
