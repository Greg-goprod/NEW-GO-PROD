/**
 * Modal d'envoi d'offre par email
 * - Destinataire = Booking Agent de l'offre
 * - Sujet auto : [ÉVÉNEMENT] - OFFRE - [ARTISTE] - [DATE]
 * - CC et CCi disponibles
 * - PDF attaché automatiquement
 */

import { useState, useEffect, useCallback } from "react";
import { Send, FileText, Plus, X, Paperclip, User, Mail, Users, Eye, CheckSquare, Square } from "lucide-react";
import { Modal } from "@/components/aura/Modal";
import { Button } from "@/components/aura/Button";
import { Badge } from "@/components/aura/Badge";
import { useToast } from "@/components/aura/ToastProvider";
import { supabase } from "@/lib/supabaseClient";
import { sendOfferEmail } from "@/services/emailService";
import { moveOffer } from "../bookingApi";
import {
  listEmailOfferAttachments,
  downloadAttachmentContent,
  blobToBase64,
  type EmailOfferAttachment,
} from "../emailAttachmentsApi";

export interface SendOfferModalProps {
  open: boolean;
  onClose: () => void;
  offer: {
    id: string;
    company_id?: string;
    event_id?: string;
    artist_id?: string;
    artist_name?: string;
    stage_name?: string;
    amount_display?: number | null;
    currency?: string | null;
    pdf_storage_path?: string | null;
    agency_contact_id?: string | null;
    date_time?: string | null;
    event_day_date?: string | null;
    validity_date?: string | null;
  };
  onSuccess: () => void;
}

interface BookingAgent {
  id: string;
  display_name: string;
  email_primary: string | null;
}

export function SendOfferModal({ open, onClose, offer, onSuccess }: SendOfferModalProps) {
  const { success: toastSuccess, error: toastError } = useToast();

  // États principaux
  const [email, setEmail] = useState("");
  const [ccEmails, setCcEmails] = useState<string[]>([]);
  const [bccEmails, setBccEmails] = useState<string[]>([]);
  const [ccInput, setCcInput] = useState("");
  const [bccInput, setBccInput] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);

  // Données chargées
  const [eventName, setEventName] = useState("");
  const [bookingAgent, setBookingAgent] = useState<BookingAgent | null>(null);
  const [performanceDate, setPerformanceDate] = useState<string>("");

  // État pour la prévisualisation PDF
  const [pdfPreviewOpen, setPdfPreviewOpen] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [loadingPdfPreview, setLoadingPdfPreview] = useState(false);

  // État pour les annexes email
  const [availableAttachments, setAvailableAttachments] = useState<EmailOfferAttachment[]>([]);
  const [selectedAttachmentIds, setSelectedAttachmentIds] = useState<Set<string>>(new Set());
  const [loadingAttachments, setLoadingAttachments] = useState(false);

  // Charger les données nécessaires
  const loadData = useCallback(async () => {
    if (!open || !offer?.id) return;

    setLoading(true);
    try {
      // 1. Charger le nom de l'événement
      if (offer.event_id) {
        const { data: eventData } = await supabase
          .from("events")
          .select("name")
          .eq("id", offer.event_id)
          .single();
        
        if (eventData?.name) {
          setEventName(eventData.name);
        }
      }

      // 2. Charger le booking agent si agency_contact_id existe
      if (offer.agency_contact_id) {
        const { data: agentData } = await supabase
          .from("crm_contacts")
          .select("id, display_name, email_primary")
          .eq("id", offer.agency_contact_id)
          .single();
        
        if (agentData) {
          setBookingAgent(agentData);
          if (agentData.email_primary) {
            setEmail(agentData.email_primary);
          }
        }
      } else if (offer.artist_id) {
        // Fallback: chercher le booking agent principal de l'artiste
        const { data: linkData } = await supabase
          .from("crm_artist_contact_links")
          .select(`
            contact_id,
            crm_contacts (id, display_name, email_primary)
          `)
          .eq("artist_id", offer.artist_id)
          .eq("is_main_agent", true)
          .maybeSingle();
        
        if (linkData?.crm_contacts) {
          const contact = linkData.crm_contacts as any;
          setBookingAgent({
            id: contact.id,
            display_name: contact.display_name,
            email_primary: contact.email_primary,
          });
          if (contact.email_primary) {
            setEmail(contact.email_primary);
          }
        }
      }

      // 3. Déterminer la date de performance (event_day_date a priorité)
      let dateStr = offer.event_day_date || offer.date_time;
      if (dateStr) {
        // Extraire juste la date (YYYY-MM-DD)
        dateStr = String(dateStr).slice(0, 10);
        setPerformanceDate(dateStr);
      }

      // 4. Charger les annexes disponibles
      if (offer.company_id) {
        setLoadingAttachments(true);
        try {
          const attachments = await listEmailOfferAttachments(offer.company_id);
          setAvailableAttachments(attachments);
        } catch (e) {
          console.error("[SendOfferModal] Erreur chargement annexes:", e);
        } finally {
          setLoadingAttachments(false);
        }
      }

    } catch (error) {
      console.error("[SendOfferModal] Erreur chargement données:", error);
    } finally {
      setLoading(false);
    }
  }, [open, offer]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Générer le sujet automatiquement
  useEffect(() => {
    if (!open) return;

    // Format: ÉVÉNEMENT - OFFRE - ARTISTE - jour DD.MM.YYYY
    const parts: string[] = [];
    
    if (eventName) {
      parts.push(eventName.toUpperCase());
    }
    
    parts.push("OFFRE");
    
    if (offer.artist_name) {
      parts.push(offer.artist_name.toUpperCase());
    }
    
    if (performanceDate) {
      // Formater la date en français avec le jour en toutes lettres et en MAJUSCULE
      const date = new Date(`${performanceDate}T00:00:00`);
      const weekday = date.toLocaleDateString("fr-FR", { weekday: "long" }).toUpperCase();
      const day = date.getDate().toString().padStart(2, "0");
      const month = (date.getMonth() + 1).toString().padStart(2, "0");
      const year = date.getFullYear();
      // Format: MERCREDI 12.08.2026
      const formatted = `${weekday} ${day}.${month}.${year}`;
      parts.push(formatted);
    }
    
    setSubject(parts.join(" - "));
  }, [open, eventName, offer.artist_name, performanceDate]);

  // Générer le message par défaut (mis à jour quand les annexes changent)
  useEffect(() => {
    if (!open) return;

    const recipientName = bookingAgent?.display_name || "";
    const artistName = offer.artist_name || "l'artiste";
    
    let msg = `Bonjour${recipientName ? ` ${recipientName}` : ""},\n\n`;
    msg += `Veuillez trouver ci-joint notre offre pour ${artistName}`;
    if (eventName) {
      msg += ` dans le cadre de ${eventName}`;
    }
    msg += ".\n\n";
    
    // Construire le nom du PDF de l'offre pour la liste des documents
    const cleanEvent = (eventName || "EVENT").toUpperCase().replace(/[^A-Z0-9\s-]/gi, "").trim();
    const cleanArtist = (offer.artist_name || "ARTISTE").toUpperCase().replace(/[^A-Z0-9\s-]/gi, "").trim();
    let offerPdfName = `${cleanEvent} - OFFRE - ${cleanArtist}`;
    if (performanceDate) {
      const date = new Date(`${performanceDate}T00:00:00`);
      const weekday = date.toLocaleDateString("fr-FR", { weekday: "long" }).toUpperCase();
      const day = date.getDate().toString().padStart(2, "0");
      const month = (date.getMonth() + 1).toString().padStart(2, "0");
      const year = date.getFullYear();
      offerPdfName += ` - ${weekday} ${day}.${month}.${year}`;
    }
    offerPdfName += ".pdf";
    
    // Liste des documents joints
    msg += "Documents joints :\n";
    msg += `• ${offerPdfName}\n`;
    
    // Ajouter les annexes sélectionnées
    const selectedAttachments = availableAttachments.filter(a => selectedAttachmentIds.has(a.id));
    selectedAttachments.forEach(attachment => {
      msg += `• ${attachment.name}.pdf\n`;
    });
    msg += "\n";
    
    // Texte de validité (sera mis en gras/rouge dans le HTML)
    if (offer.validity_date) {
      const validityDate = new Date(offer.validity_date);
      const formatted = validityDate.toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      });
      msg += `Cette offre est valable jusqu'au ${formatted}.\n\n`;
    }
    
    msg += "N'hésitez pas à nous contacter pour toute question.\n\nCordialement";
    
    setMessage(msg);
  }, [open, bookingAgent, offer.artist_name, offer.validity_date, eventName, performanceDate, availableAttachments, selectedAttachmentIds]);

  // Reset à la fermeture
  useEffect(() => {
    if (!open) {
      setCcEmails([]);
      setBccEmails([]);
      setCcInput("");
      setBccInput("");
      setSelectedAttachmentIds(new Set());
    }
  }, [open]);

  // Fonction pour basculer la sélection d'une annexe
  const toggleAttachment = (attachmentId: string) => {
    setSelectedAttachmentIds((prev) => {
      const next = new Set(prev);
      if (next.has(attachmentId)) {
        next.delete(attachmentId);
      } else {
        next.add(attachmentId);
      }
      return next;
    });
  };

  // Regex pour validation email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // Ajouter un email CC (avec option silencieuse pour onBlur)
  const addCcEmail = (silent = false) => {
    const trimmed = ccInput.trim();
    if (!trimmed) return;
    
    if (ccEmails.includes(trimmed)) {
      setCcInput("");
      return;
    }
    
    if (emailRegex.test(trimmed)) {
      setCcEmails([...ccEmails, trimmed]);
      setCcInput("");
    } else if (!silent) {
      toastError("Adresse email CC invalide");
    }
  };

  // Ajouter un email CCi (avec option silencieuse pour onBlur)
  const addBccEmail = (silent = false) => {
    const trimmed = bccInput.trim();
    if (!trimmed) return;
    
    if (bccEmails.includes(trimmed)) {
      setBccInput("");
      return;
    }
    
    if (emailRegex.test(trimmed)) {
      setBccEmails([...bccEmails, trimmed]);
      setBccInput("");
    } else if (!silent) {
      toastError("Adresse email CCi invalide");
    }
  };

  // Supprimer un email CC
  const removeCcEmail = (emailToRemove: string) => {
    setCcEmails(ccEmails.filter(e => e !== emailToRemove));
  };

  // Supprimer un email CCi
  const removeBccEmail = (emailToRemove: string) => {
    setBccEmails(bccEmails.filter(e => e !== emailToRemove));
  };

  // Prévisualiser le PDF
  const handlePreviewPdf = async () => {
    if (!offer.pdf_storage_path) {
      toastError("Aucun PDF disponible pour cette offre");
      return;
    }

    setLoadingPdfPreview(true);
    try {
      const { data, error } = await supabase.storage
        .from("offers")
        .createSignedUrl(offer.pdf_storage_path, 300); // 5 minutes

      if (error || !data?.signedUrl) {
        throw new Error("Impossible de générer l'URL du PDF");
      }

      setPdfPreviewUrl(data.signedUrl);
      setPdfPreviewOpen(true);
    } catch (error: any) {
      console.error("[SendOfferModal] Erreur prévisualisation PDF:", error);
      toastError(error?.message || "Erreur lors de la prévisualisation du PDF");
    } finally {
      setLoadingPdfPreview(false);
    }
  };

  // Fermer la prévisualisation PDF
  const closePdfPreview = () => {
    setPdfPreviewOpen(false);
    setPdfPreviewUrl(null);
  };

  // Envoyer l'email
  const handleSend = async () => {
    if (!email.trim()) {
      toastError("Veuillez saisir une adresse email destinataire");
      return;
    }

    if (!emailRegex.test(email.trim())) {
      toastError("Adresse email destinataire invalide");
      return;
    }

    if (!offer.pdf_storage_path) {
      toastError("Aucun PDF disponible pour cette offre. Veuillez d'abord générer le PDF.");
      return;
    }

    // Ajouter automatiquement les emails CC/CCi saisis mais non ajoutés
    let finalCcEmails = [...ccEmails];
    let finalBccEmails = [...bccEmails];
    
    if (ccInput.trim() && emailRegex.test(ccInput.trim()) && !finalCcEmails.includes(ccInput.trim())) {
      finalCcEmails.push(ccInput.trim());
      setCcInput("");
    }
    
    if (bccInput.trim() && emailRegex.test(bccInput.trim()) && !finalBccEmails.includes(bccInput.trim())) {
      finalBccEmails.push(bccInput.trim());
      setBccInput("");
    }

    setSending(true);
    try {
      // 1. Télécharger le PDF de l'offre depuis Supabase Storage
      const { data: pdfData, error: downloadError } = await supabase.storage
        .from("offers")
        .download(offer.pdf_storage_path);

      if (downloadError || !pdfData) {
        throw new Error("Impossible de télécharger le PDF de l'offre");
      }

      // 2. Convertir en base64
      const arrayBuffer = await pdfData.arrayBuffer();
      const base64 = btoa(
        new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
      );

      // 3. Construire le nom du fichier PDF de l'offre (même format que le sujet)
      const cleanEvent = (eventName || "EVENT").toUpperCase().replace(/[^A-Z0-9\s-]/gi, "").trim();
      const cleanArtist = (offer.artist_name || "ARTISTE").toUpperCase().replace(/[^A-Z0-9\s-]/gi, "").trim();
      
      // Formater la date avec le jour en toutes lettres
      let dateStr = "";
      if (performanceDate) {
        const date = new Date(`${performanceDate}T00:00:00`);
        const weekday = date.toLocaleDateString("fr-FR", { weekday: "long" }).toUpperCase();
        const day = date.getDate().toString().padStart(2, "0");
        const month = (date.getMonth() + 1).toString().padStart(2, "0");
        const year = date.getFullYear();
        dateStr = `${weekday} ${day}.${month}.${year}`;
      }
      
      const parts = [cleanEvent, "OFFRE", cleanArtist];
      if (dateStr) parts.push(dateStr);
      const pdfFileName = `${parts.join(" - ")}.pdf`;

      // 4. Préparer les pièces jointes additionnelles (annexes sélectionnées)
      const additionalAttachments: Array<{ filename: string; content: string; contentType: string }> = [];
      
      if (selectedAttachmentIds.size > 0) {
        const selectedAttachments = availableAttachments.filter((a) =>
          selectedAttachmentIds.has(a.id)
        );
        
        for (const attachment of selectedAttachments) {
          try {
            const blob = await downloadAttachmentContent(attachment.storage_path);
            const attachmentBase64 = await blobToBase64(blob);
            additionalAttachments.push({
              filename: `${attachment.name}.pdf`,
              content: attachmentBase64,
              contentType: "application/pdf",
            });
          } catch (e) {
            console.error(`[SendOfferModal] Erreur téléchargement annexe ${attachment.name}:`, e);
            // On continue avec les autres annexes
          }
        }
      }

      // 5. Construire le HTML de l'email
      const htmlContent = buildEmailHtml({
        recipientName: bookingAgent?.display_name,
        artistName: offer.artist_name,
        eventName,
        message,
        hasAdditionalAttachments: additionalAttachments.length > 0,
      });

      // 6. Envoyer l'email avec le PDF et les annexes en pièces jointes
      const result = await sendOfferEmail({
        toEmail: email.trim(),
        toName: bookingAgent?.display_name,
        ccEmails: finalCcEmails.length > 0 ? finalCcEmails : undefined,
        bccEmails: finalBccEmails.length > 0 ? finalBccEmails : undefined,
        subject: subject.trim(),
        htmlContent,
        pdfBase64: base64,
        pdfFileName,
        artistName: offer.artist_name || undefined,
        eventName: eventName || undefined,
        validityDate: offer.validity_date || undefined,
        companyId: offer.company_id, // Passer le companyId pour la config SMTP
        additionalAttachments: additionalAttachments.length > 0 ? additionalAttachments : undefined,
      });

      if (!result.success) {
        throw new Error(result.error || "Erreur lors de l'envoi");
      }

      // 6. Mettre à jour le statut de l'offre à "sent"
      await moveOffer(offer.id, "sent");

      // Fermer le preview PDF s'il est ouvert
      closePdfPreview();

      toastSuccess("Offre envoyée par email avec succès !");
      onSuccess();
      onClose();

    } catch (error: any) {
      console.error("[SendOfferModal] Erreur envoi:", error);
      toastError(error?.message || "Erreur lors de l'envoi de l'email");
    } finally {
      setSending(false);
    }
  };

  // Construire le HTML de l'email
  function buildEmailHtml(params: {
    recipientName?: string;
    artistName?: string;
    eventName?: string;
    message: string;
    hasAdditionalAttachments?: boolean;
  }): string {
    // Convertir les sauts de ligne en <br> et mettre le texte de validité en gras/rouge
    let messageHtml = params.message.replace(/\n/g, "<br>");
    
    // Détecter et styliser le texte "Cette offre est valable jusqu'au ..."
    messageHtml = messageHtml.replace(
      /(Cette offre est valable jusqu'au [^<.]+\.)/gi,
      '<strong style="color: #DC2626;">$1</strong>'
    );
    
    const attachmentText = params.hasAdditionalAttachments
      ? "📎 <strong>L'offre PDF et les documents annexes sont joints à cet email.</strong>"
      : "📎 <strong>L'offre PDF est jointe à cet email.</strong>";

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
    <h1 style="color: white; margin: 0; font-size: 24px;">Offre Artiste${params.artistName ? ` - ${params.artistName}` : ''}</h1>
    ${params.eventName ? `<p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 14px;">${params.eventName}</p>` : ''}
  </div>
  
  <div style="background: #fff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
    <div style="font-size: 15px; color: #333;">
      ${messageHtml}
    </div>
    
    <div style="background: #f0f7ff; padding: 15px; border-radius: 5px; border-left: 4px solid #667eea; margin: 25px 0;">
      ${attachmentText}
    </div>
  </div>
  
  <div style="text-align: center; padding: 20px; color: #666; font-size: 12px;">
    <p>Cet email a été envoyé via Go-Prod</p>
  </div>
</body>
</html>
    `.trim();
  }

  if (loading) {
    return (
      <Modal open={open} onClose={onClose} title="Envoyer l'offre" size="md">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600"></div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal open={open} onClose={onClose} title="Envoyer l'offre" size="md">
      <div className="space-y-5">
        {/* Résumé de l'offre */}
        <div className="p-4 bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 rounded-lg border border-violet-200 dark:border-violet-800">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-violet-100 dark:bg-violet-800 flex items-center justify-center">
              <Mail className="w-6 h-6 text-violet-600 dark:text-violet-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                {offer.artist_name || "Artiste"}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {offer.stage_name && <span>{offer.stage_name} • </span>}
                {performanceDate && (
                  <span>
                    {new Date(`${performanceDate}T00:00:00`).toLocaleDateString("fr-FR", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                    })}
                  </span>
                )}
              </p>
              {offer.amount_display && (
                <p className="text-sm font-medium text-violet-600 dark:text-violet-400 mt-1">
                  {offer.amount_display.toLocaleString("fr-CH")} {offer.currency || "CHF"}
                </p>
              )}
            </div>
            {offer.pdf_storage_path && (
              <button
                type="button"
                onClick={handlePreviewPdf}
                disabled={loadingPdfPreview}
                className="flex-shrink-0 cursor-pointer hover:scale-105 transition-all hover:shadow-lg"
                title="Cliquer pour prévisualiser le PDF"
              >
                <div className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium text-sm shadow-md">
                  {loadingPdfPreview ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                  ) : (
                    <>
                      <FileText className="w-5 h-5" />
                      <Eye className="w-5 h-5" />
                    </>
                  )}
                  <span>Voir PDF</span>
                </div>
              </button>
            )}
          </div>
        </div>

        {/* Annexes à joindre */}
        {availableAttachments.length > 0 && (
          <div
            className="p-4 rounded-lg border"
            style={{
              background: "var(--color-bg-surface)",
              borderColor: "var(--color-border)",
            }}
          >
            <label
              className="flex items-center gap-2 text-sm font-medium mb-3"
              style={{ color: "var(--color-text-primary)" }}
            >
              <Paperclip className="w-4 h-4" />
              Annexes à joindre
              {selectedAttachmentIds.size > 0 && (
                <Badge color="blue" className="ml-2">
                  {selectedAttachmentIds.size} sélectionnée{selectedAttachmentIds.size > 1 ? "s" : ""}
                </Badge>
              )}
            </label>
            {loadingAttachments ? (
              <div className="flex items-center gap-2 py-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-violet-600" />
                <span className="text-sm" style={{ color: "var(--color-text-muted)" }}>
                  Chargement des annexes...
                </span>
              </div>
            ) : (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {availableAttachments.map((attachment) => {
                  const isSelected = selectedAttachmentIds.has(attachment.id);
                  return (
                    <div
                      key={attachment.id}
                      onClick={() => toggleAttachment(attachment.id)}
                      className="flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors hover:bg-violet-50 dark:hover:bg-violet-900/20"
                      style={{
                        background: isSelected ? "rgba(139, 92, 246, 0.1)" : "transparent",
                      }}
                    >
                      <div className="flex-shrink-0">
                        {isSelected ? (
                          <CheckSquare className="w-5 h-5 text-violet-600" />
                        ) : (
                          <Square className="w-5 h-5" style={{ color: "var(--color-text-muted)" }} />
                        )}
                      </div>
                      <FileText className="w-4 h-4 text-red-500 flex-shrink-0" />
                      <span
                        className="text-sm truncate flex-1"
                        style={{ color: "var(--color-text-primary)" }}
                      >
                        {attachment.name}
                      </span>
                      <span
                        className="text-xs flex-shrink-0"
                        style={{ color: "var(--color-text-muted)" }}
                      >
                        {(attachment.file_size / 1024).toFixed(0)} Ko
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Destinataire */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>
            <User className="w-4 h-4" />
            Destinataire <span className="text-red-500">*</span>
          </label>
          {bookingAgent && (
            <p className="text-xs mb-2" style={{ color: 'var(--color-text-muted)' }}>
              Booking Agent : {bookingAgent.display_name}
            </p>
          )}
          <input
            id="offer-email-to"
            name="offer-email-to"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(evt) => setEmail(evt.target.value)}
            placeholder="email@agent.com"
            className="input w-full"
          />
        </div>

        {/* CC */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>
            <Users className="w-4 h-4" />
            CC (Copie carbone)
          </label>
          <div className="flex gap-2 items-center">
            <input
              id="offer-email-cc-input"
              name="cc-additional-email"
              type="email"
              autoComplete="email"
              value={ccInput}
              onChange={(evt) => setCcInput(evt.target.value)}
              onKeyDown={(evt) => evt.key === "Enter" && (evt.preventDefault(), addCcEmail())}
              onBlur={() => addCcEmail(true)}
              placeholder="Ajouter un email en copie..."
              className="input flex-1"
            />
            <button
              type="button"
              onClick={() => addCcEmail()}
              disabled={!ccInput.trim()}
              className="h-[44px] w-[44px] flex items-center justify-center rounded-xl border transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:border-violet-500"
              style={{ 
                background: 'var(--color-bg-surface)', 
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-primary)'
              }}
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
          {ccEmails.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {ccEmails.map((ccEmail) => (
                <Badge key={ccEmail} color="blue" className="flex items-center gap-1">
                  {ccEmail}
                  <button onClick={() => removeCcEmail(ccEmail)} className="ml-1 hover:text-red-500">
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* CCi - Isolé dans un form séparé pour avoir une autocomplétion indépendante du CC */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>
            <Mail className="w-4 h-4" />
            CCi (Copie cachée)
          </label>
          <form onSubmit={(e) => { e.preventDefault(); addBccEmail(); }}>
            <div className="flex gap-2 items-center">
              <input
                id="offer-email-bcc-input"
                name="bcc-email"
                type="email"
                autoComplete="email"
                value={bccInput}
                onChange={(evt) => setBccInput(evt.target.value)}
                onKeyDown={(evt) => evt.key === "Enter" && (evt.preventDefault(), addBccEmail())}
                onBlur={() => addBccEmail(true)}
                placeholder="Ajouter un email en copie cachée..."
                className="input flex-1"
              />
              <button
                type="button"
                onClick={() => addBccEmail()}
                disabled={!bccInput.trim()}
                className="h-[44px] w-[44px] flex items-center justify-center rounded-xl border transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:border-violet-500"
                style={{ 
                  background: 'var(--color-bg-surface)', 
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-primary)'
                }}
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </form>
          {bccEmails.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {bccEmails.map((bccEmail) => (
                <Badge key={bccEmail} color="gray" className="flex items-center gap-1">
                  {bccEmail}
                  <button type="button" onClick={() => removeBccEmail(bccEmail)} className="ml-1 hover:text-red-500">
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Sujet */}
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>
            Sujet
          </label>
          <input
            id="offer-email-subject"
            name="email-subject-line"
            type="text"
            autoComplete="off"
            value={subject}
            onChange={(evt) => setSubject(evt.target.value)}
            placeholder="Sujet de l'email"
            className="input w-full"
          />
        </div>

        {/* Message */}
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>
            Message
          </label>
          <textarea
            className="w-full min-h-[120px] px-4 py-3 rounded-xl border transition-all resize-none focus:outline-none"
            style={{
              background: 'var(--color-bg-surface)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-primary)',
              fontSize: '14px',
            }}
            onFocus={(e) => {
              e.target.style.boxShadow = '0 0 0 2px color-mix(in oklab, var(--color-primary) 55%, transparent)';
              e.target.style.borderColor = 'var(--color-primary)';
            }}
            onBlur={(e) => {
              e.target.style.boxShadow = 'none';
              e.target.style.borderColor = 'var(--color-border)';
            }}
            rows={6}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Message personnalisé..."
          />
        </div>

        {/* Boutons */}
        <div className="flex justify-end gap-3 pt-5 mt-2 border-t" style={{ borderColor: 'var(--color-border)' }}>
          <Button variant="ghost" onClick={onClose} disabled={sending}>
            Annuler
          </Button>
          <Button variant="primary" onClick={handleSend} disabled={sending || !offer.pdf_storage_path}>
            <Send className="w-4 h-4 mr-2" />
            {sending ? "Envoi en cours..." : "Envoyer l'offre"}
          </Button>
        </div>
      </div>

      {/* Modal de prévisualisation PDF */}
      <Modal
        open={pdfPreviewOpen}
        onClose={closePdfPreview}
        title={`Prévisualisation - ${offer.artist_name || "Offre"}`}
        size="xl"
        zIndex={1200}
      >
        <div className="h-[75vh]">
          {pdfPreviewUrl ? (
            <iframe
              src={pdfPreviewUrl}
              className="w-full h-full rounded-lg border border-gray-200 dark:border-gray-700"
              title="Prévisualisation PDF"
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600"></div>
            </div>
          )}
        </div>
        <div className="flex justify-end mt-4">
          <Button variant="secondary" onClick={closePdfPreview}>
            Fermer
          </Button>
        </div>
      </Modal>
    </Modal>
  );
}
