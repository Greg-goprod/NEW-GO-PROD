/**
 * Modal d'envoi de contrat pour signature interne (festival)
 * - Destinataire = signataire interne sélectionné dans un dropdown
 * - Sujet auto : [ÉVÉNEMENT] - CONTRAT - [ARTISTE] - À SIGNER
 * - CC et CCi disponibles
 * - PDF annoté attaché automatiquement
 * 
 * Design identique à SendOfferModal
 */

import { useState, useEffect, useCallback } from "react";
import { Send, FileText, Plus, X, Mail, Eye, User, Users } from "lucide-react";
import { Modal } from "@/components/aura/Modal";
import { Button } from "@/components/aura/Button";
import { Badge } from "@/components/aura/Badge";
import { useToast } from "@/components/aura/ToastProvider";
import { supabase } from "@/lib/supabaseClient";
import { sendEmail } from "@/services/emailService";
import type { Contract } from "@/types/contracts";

export interface SendContractForSignatureModalProps {
  open: boolean;
  onClose: () => void;
  contract: Contract;
  onSuccess: () => void;
}

interface InternalSignatory {
  id: string;
  display_name: string;
  email_primary: string | null;
}

export function SendContractForSignatureModal({ 
  open, 
  onClose, 
  contract, 
  onSuccess 
}: SendContractForSignatureModalProps) {
  const { success: toastSuccess, error: toastError } = useToast();

  // États principaux
  const [selectedSignatoryId, setSelectedSignatoryId] = useState<string>("");
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
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [internalSignatories, setInternalSignatories] = useState<InternalSignatory[]>([]);

  // État pour la prévisualisation PDF
  const [pdfPreviewOpen, setPdfPreviewOpen] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [loadingPdfPreview, setLoadingPdfPreview] = useState(false);

  // Charger les données nécessaires
  const loadData = useCallback(async () => {
    if (!open || !contract?.id) return;

    console.log("[SendContractModal] loadData appelé avec contract:", {
      id: contract.id,
      event_id: contract.event_id,
      artist_name: contract.artist_name,
    });

    setLoading(true);
    try {
      // 1. Charger le nom de l'événement et le company_id
      // D'abord essayer avec contract.event_id
      let eventId = contract.event_id;
      
      // Si pas d'event_id, essayer de le récupérer depuis le contrat en base
      if (!eventId) {
        console.log("[SendContractModal] Pas d'event_id dans le contrat props, récupération depuis la base...");
        const { data: contractData } = await supabase
          .from("contracts")
          .select("event_id")
          .eq("id", contract.id)
          .single();
        
        if (contractData?.event_id) {
          eventId = contractData.event_id;
          console.log("[SendContractModal] event_id récupéré depuis la base:", eventId);
        }
      }
      
      if (eventId) {
        console.log("[SendContractModal] Chargement événement avec id:", eventId);
        const { data: eventData, error: eventError } = await supabase
          .from("events")
          .select("name, company_id")
          .eq("id", eventId)
          .single();
        
        if (eventError) {
          console.error("[SendContractModal] Erreur chargement événement:", eventError);
        }
        
        console.log("[SendContractModal] Données événement:", eventData);
        
        if (eventData?.name) {
          setEventName(eventData.name);
        }
        if (eventData?.company_id) {
          setCompanyId(eventData.company_id);
          console.log("[SendContractModal] Company ID récupéré depuis événement:", eventData.company_id);
        } else {
          console.warn("[SendContractModal] Pas de company_id dans l'événement!");
        }
      } else {
        console.warn("[SendContractModal] Aucun event_id trouvé pour ce contrat!");
      }

      // 2. Charger les signataires internes (is_signatory = true ET is_internal = true)
      const { data: signatories, error } = await supabase
        .from("crm_contacts")
        .select("id, display_name, email_primary")
        .eq("is_signatory", true)
        .eq("is_internal", true)
        .order("display_name");

      if (error) {
        console.error("[SendContractModal] Erreur chargement signataires:", error);
      } else if (signatories && signatories.length > 0) {
        setInternalSignatories(signatories);
        // Sélectionner le premier par défaut
        setSelectedSignatoryId(signatories[0].id);
        if (signatories[0].email_primary) {
          setEmail(signatories[0].email_primary);
        }
      }

    } catch (error) {
      console.error("[SendContractModal] Erreur chargement données:", error);
    } finally {
      setLoading(false);
    }
  }, [open, contract]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Mettre à jour l'email quand le signataire change
  useEffect(() => {
    if (selectedSignatoryId) {
      const signatory = internalSignatories.find(s => s.id === selectedSignatoryId);
      if (signatory?.email_primary) {
        setEmail(signatory.email_primary);
      }
    }
  }, [selectedSignatoryId, internalSignatories]);

  // Générer le sujet automatiquement
  useEffect(() => {
    if (!open) return;

    // Format: ÉVÉNEMENT - CONTRAT - ARTISTE - À SIGNER
    const parts: string[] = [];
    
    if (eventName) {
      parts.push(eventName.toUpperCase());
    }
    
    parts.push("CONTRAT");
    
    if (contract.artist_name) {
      parts.push(contract.artist_name.toUpperCase());
    }
    
    parts.push("À SIGNER");
    
    setSubject(parts.join(" - "));
  }, [open, eventName, contract.artist_name]);

  // Générer le message par défaut
  useEffect(() => {
    if (!open) return;

    const selectedSignatory = internalSignatories.find(s => s.id === selectedSignatoryId);
    const recipientName = selectedSignatory?.display_name || "";
    const artistName = contract.artist_name || "l'artiste";
    
    let msg = `Bonjour${recipientName ? ` ${recipientName}` : ""},\n\n`;
    msg += `Veuillez trouver ci-joint le contrat pour ${artistName}`;
    if (eventName) {
      msg += ` dans le cadre de ${eventName}`;
    }
    msg += " à signer.\n\n";
    
    msg += "Merci de bien vouloir signer ce contrat et nous le retourner.\n\n";
    msg += "Cordialement";
    
    setMessage(msg);
  }, [open, selectedSignatoryId, internalSignatories, contract.artist_name, eventName]);

  // Reset à la fermeture
  useEffect(() => {
    if (!open) {
      setCcEmails([]);
      setBccEmails([]);
      setCcInput("");
      setBccInput("");
      setSelectedSignatoryId("");
      setEmail("");
      setPdfPreviewOpen(false);
      setPdfPreviewUrl(null);
    }
  }, [open]);

  // Regex pour validation email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // Ajouter un email CC
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

  // Ajouter un email CCi
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
    // Utiliser le PDF annoté si disponible, sinon l'original
    const pdfPath = contract.annotated_file_url || contract.original_file_url;
    
    if (!pdfPath) {
      toastError("Aucun PDF disponible pour ce contrat");
      return;
    }

    setLoadingPdfPreview(true);
    try {
      const { data } = supabase.storage
        .from("contracts")
        .getPublicUrl(pdfPath);

      if (data?.publicUrl) {
        setPdfPreviewUrl(data.publicUrl);
        setPdfPreviewOpen(true);
      } else {
        throw new Error("Impossible de générer l'URL du PDF");
      }
    } catch (error) {
      console.error("[SendContractModal] Erreur preview PDF:", error);
      toastError("Impossible de charger l'aperçu du PDF");
    } finally {
      setLoadingPdfPreview(false);
    }
  };

  // Fermer la prévisualisation PDF
  const closePdfPreview = () => {
    setPdfPreviewOpen(false);
    setPdfPreviewUrl(null);
  };

  // Construire le HTML de l'email
  function buildEmailHtml(params: {
    recipientName?: string;
    artistName?: string;
    eventName?: string;
    message: string;
  }): string {
    // Convertir les sauts de ligne en <br>
    const messageHtml = params.message.replace(/\n/g, "<br>");

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Contrat à signer</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">Contrat à signer${params.artistName ? ` - ${params.artistName}` : ''}</h1>
    ${params.eventName ? `<p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 14px;">${params.eventName}</p>` : ''}
  </div>
  
  <div style="background: #fff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
    <div style="font-size: 15px; color: #333;">
      ${messageHtml}
    </div>
    
    <div style="background: #f0f7ff; padding: 15px; border-radius: 5px; border-left: 4px solid #667eea; margin: 25px 0;">
      📎 <strong>Le contrat PDF est joint à cet email.</strong>
    </div>
  </div>
  
  <div style="text-align: center; padding: 20px; color: #666; font-size: 12px;">
    <p>Cet email a été envoyé via Go-Prod</p>
  </div>
</body>
</html>
    `.trim();
  }

  // Envoyer l'email
  const handleSend = async () => {
    if (!email.trim()) {
      toastError("Veuillez sélectionner un destinataire");
      return;
    }

    if (!emailRegex.test(email.trim())) {
      toastError("Adresse email destinataire invalide");
      return;
    }

    // Utiliser le PDF annoté si disponible, sinon l'original
    const pdfPath = contract.annotated_file_url || contract.original_file_url;
    
    if (!pdfPath) {
      toastError("Aucun PDF disponible pour ce contrat");
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
      console.log("[SendContractModal] Début envoi email pour contrat:", contract.id);
      console.log("[SendContractModal] PDF path:", pdfPath);
      console.log("[SendContractModal] Destinataire:", email);
      
      // 1. Télécharger le PDF depuis Supabase Storage
      const { data: pdfData, error: downloadError } = await supabase.storage
        .from("contracts")
        .download(pdfPath);

      if (downloadError || !pdfData) {
        console.error("[SendContractModal] Erreur téléchargement PDF:", downloadError);
        throw new Error("Impossible de télécharger le PDF du contrat");
      }

      console.log("[SendContractModal] PDF téléchargé, taille:", pdfData.size);

      // 2. Convertir en base64
      const arrayBuffer = await pdfData.arrayBuffer();
      const base64 = btoa(
        new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
      );

      console.log("[SendContractModal] PDF converti en base64, longueur:", base64.length);

      // 3. Construire le nom du fichier PDF
      const cleanEvent = (eventName || "EVENT").toUpperCase().replace(/[^A-Z0-9\s-]/gi, "").replace(/\s+/g, "_");
      const cleanArtist = (contract.artist_name || "ARTISTE").toUpperCase().replace(/[^A-Z0-9\s-]/gi, "").replace(/\s+/g, "_");
      const pdfFileName = `CONTRAT_${cleanEvent}_${cleanArtist}_A_SIGNER.pdf`;

      console.log("[SendContractModal] Nom fichier PDF:", pdfFileName);

      // 4. Construire le HTML de l'email
      const selectedSignatory = internalSignatories.find(s => s.id === selectedSignatoryId);
      const htmlContent = buildEmailHtml({
        recipientName: selectedSignatory?.display_name,
        artistName: contract.artist_name,
        eventName,
        message,
      });

      // 5. Envoyer l'email avec le companyId récupéré depuis l'événement
      console.log("[SendContractModal] Envoi email avec companyId:", companyId);
      
      if (!companyId) {
        throw new Error("Impossible de déterminer l'entreprise pour la configuration SMTP");
      }
      
      const result = await sendEmail({
        to: email.trim(),
        cc: finalCcEmails.length > 0 ? finalCcEmails : undefined,
        bcc: finalBccEmails.length > 0 ? finalBccEmails : undefined,
        subject: subject.trim(),
        html: htmlContent,
        companyId: companyId, // Important: passer le companyId pour la config SMTP
        attachments: [{
          filename: pdfFileName,
          content: base64,
          contentType: "application/pdf",
        }],
      });

      console.log("[SendContractModal] Résultat envoi:", result);

      if (!result.success) {
        throw new Error(result.error || "Erreur lors de l'envoi de l'email");
      }

      const nowISO = new Date().toISOString();
      
      // 6. Mettre à jour l'historique et la date d'envoi du contrat
      await supabase
        .from("contracts")
        .update({
          sent_for_internal_sign_at: nowISO, // Date d'envoi pour signature
          updated_at: nowISO,
          history: [
            ...(contract.history || []),
            {
              at: nowISO,
              action: "sent_for_internal_signature",
              details: `Envoyé pour signature à ${email}`,
            },
          ],
        })
        .eq("id", contract.id);

      // Fermer le preview PDF s'il est ouvert
      closePdfPreview();

      toastSuccess("Contrat envoyé pour signature avec succès !");
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error("[SendContractModal] Erreur envoi:", error);
      toastError(error?.message || "Erreur lors de l'envoi de l'email");
    } finally {
      setSending(false);
    }
  };

  // Affichage du loader
  if (loading) {
    return (
      <Modal open={open} onClose={onClose} title="Envoyer pour signature" size="md">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600"></div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal open={open} onClose={onClose} title="Envoyer pour signature" size="md">
      <div className="space-y-5">
        {/* Résumé du contrat */}
        <div className="p-4 bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 rounded-lg border border-violet-200 dark:border-violet-800">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-violet-100 dark:bg-violet-800 flex items-center justify-center">
              <Mail className="w-6 h-6 text-violet-600 dark:text-violet-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                {contract.artist_name || "Artiste"}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {contract.stage_name && <span>{contract.stage_name} • </span>}
                {eventName && <span>{eventName}</span>}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                {contract.annotated_file_url ? "PDF annoté" : "PDF original"}
              </p>
            </div>
            {(contract.annotated_file_url || contract.original_file_url) && (
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

        {/* Sélection du signataire */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>
            <User className="w-4 h-4" />
            Signataire interne <span className="text-red-500">*</span>
          </label>
          {internalSignatories.length === 0 ? (
            <p className="text-sm text-amber-600 dark:text-amber-400 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
              Aucun signataire interne trouvé. Veuillez configurer des contacts avec les attributs "Signataire" et "Interne" dans le CRM.
            </p>
          ) : (
            <select
              value={selectedSignatoryId}
              onChange={(e) => setSelectedSignatoryId(e.target.value)}
              className="w-full h-[44px] px-4 rounded-xl border transition-all focus:outline-none"
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
            >
              <option value="">Sélectionner un signataire...</option>
              {internalSignatories.map((signatory) => (
                <option key={signatory.id} value={signatory.id}>
                  {signatory.display_name} {signatory.email_primary ? `(${signatory.email_primary})` : "(pas d'email)"}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* CC */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>
            <Users className="w-4 h-4" />
            CC (Copie carbone)
          </label>
          <div className="flex gap-2 items-center">
            <input
              id="contract-email-cc-input"
              name="cc-contract-email"
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

        {/* CCi */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>
            <Mail className="w-4 h-4" />
            CCi (Copie cachée)
          </label>
          <form onSubmit={(e) => { e.preventDefault(); addBccEmail(); }}>
            <div className="flex gap-2 items-center">
              <input
                id="contract-email-bcc-input"
                name="bcc-contract-email"
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
            id="contract-email-subject"
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
          <Button 
            variant="primary" 
            onClick={handleSend} 
            disabled={sending || !selectedSignatoryId || !email}
          >
            <Send className="w-4 h-4 mr-2" />
            {sending ? "Envoi en cours..." : "Envoyer pour signature"}
          </Button>
        </div>
      </div>

      {/* Modal de prévisualisation PDF */}
      <Modal
        open={pdfPreviewOpen}
        onClose={closePdfPreview}
        title={`Prévisualisation - ${contract.artist_name || "Contrat"}`}
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
