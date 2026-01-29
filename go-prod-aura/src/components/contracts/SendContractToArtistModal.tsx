/**
 * Modal d'envoi de contrat pour signature artiste (externe)
 * - Destinataire = contact administratif de l'agence du booking agent
 * - Sujet auto : [ÉVÉNEMENT] - CONTRAT - [ARTISTE] - À SIGNER PAR L'ARTISTE
 * - CC et CCi disponibles
 * - PDF signé par le festival attaché automatiquement
 * 
 * Design identique à SendContractForSignatureModal
 */

import { useState, useEffect, useCallback } from "react";
import { Send, FileText, Plus, X, Mail, Eye, User, Users, Building2 } from "lucide-react";
import { Modal } from "@/components/aura/Modal";
import { Button } from "@/components/aura/Button";
import { Badge } from "@/components/aura/Badge";
import { useToast } from "@/components/aura/ToastProvider";
import { supabase } from "@/lib/supabaseClient";
import { sendEmail } from "@/services/emailService";
import type { Contract } from "@/types/contracts";

export interface SendContractToArtistModalProps {
  open: boolean;
  onClose: () => void;
  contract: Contract;
  onSuccess: () => void;
}

interface AgencyContact {
  id: string;
  display_name: string;
  email_primary: string | null;
  role_name?: string;
}

interface Agency {
  id: string;
  name: string;
}

export function SendContractToArtistModal({ 
  open, 
  onClose, 
  contract, 
  onSuccess 
}: SendContractToArtistModalProps) {
  const { success: toastSuccess, error: toastError } = useToast();

  // États principaux
  const [selectedContactId, setSelectedContactId] = useState<string>("");
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
  const [agencyContacts, setAgencyContacts] = useState<AgencyContact[]>([]);
  const [agency, setAgency] = useState<Agency | null>(null);

  // État pour la prévisualisation PDF
  const [pdfPreviewOpen, setPdfPreviewOpen] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [loadingPdfPreview, setLoadingPdfPreview] = useState(false);

  // Charger les données nécessaires
  const loadData = useCallback(async () => {
    if (!open || !contract?.id) return;

    console.log("[SendContractToArtist] loadData appelé avec contract:", {
      id: contract.id,
      event_id: contract.event_id,
      source_offer_id: contract.source_offer_id,
      artist_name: contract.artist_name,
    });

    setLoading(true);
    try {
      // 1. Charger le nom de l'événement et le company_id
      let eventId = contract.event_id;
      
      if (!eventId) {
        console.log("[SendContractToArtist] Pas d'event_id dans le contrat props, récupération depuis la base...");
        const { data: contractData } = await supabase
          .from("contracts")
          .select("event_id")
          .eq("id", contract.id)
          .single();
        
        if (contractData?.event_id) {
          eventId = contractData.event_id;
          console.log("[SendContractToArtist] event_id récupéré depuis la base:", eventId);
        }
      }
      
      if (eventId) {
        console.log("[SendContractToArtist] Chargement événement avec id:", eventId);
        const { data: eventData, error: eventError } = await supabase
          .from("events")
          .select("name, company_id")
          .eq("id", eventId)
          .single();
        
        if (eventError) {
          console.error("[SendContractToArtist] Erreur chargement événement:", eventError);
        }
        
        console.log("[SendContractToArtist] Données événement:", eventData);
        
        if (eventData?.name) {
          setEventName(eventData.name);
        }
        if (eventData?.company_id) {
          setCompanyId(eventData.company_id);
          console.log("[SendContractToArtist] Company ID récupéré depuis événement:", eventData.company_id);
        } else {
          console.warn("[SendContractToArtist] Pas de company_id dans l'événement!");
        }
      } else {
        console.warn("[SendContractToArtist] Aucun event_id trouvé pour ce contrat!");
      }

      // 2. Récupérer l'offre liée et son booking_agency_id
      let bookingAgencyId: string | null = null;
      
      if (contract.source_offer_id) {
        const { data: offerData, error: offerError } = await supabase
          .from("offers")
          .select("booking_agency_id, agency_contact_id")
          .eq("id", contract.source_offer_id)
          .single();
        
        if (offerError) {
          console.error("[SendContractToArtist] Erreur chargement offre:", offerError);
        } else if (offerData) {
          console.log("[SendContractToArtist] Données offre:", offerData);
          bookingAgencyId = offerData.booking_agency_id;
          
          // Fallback: si pas de booking_agency_id mais agency_contact_id, chercher l'agence du contact
          if (!bookingAgencyId && offerData.agency_contact_id) {
            console.log("[SendContractToArtist] Recherche agence via agency_contact_id...");
            const { data: contactCompanyLink } = await supabase
              .from("crm_contact_company_links")
              .select("linked_company_id")
              .eq("contact_id", offerData.agency_contact_id)
              .maybeSingle();
            
            if (contactCompanyLink?.linked_company_id) {
              bookingAgencyId = contactCompanyLink.linked_company_id;
              console.log("[SendContractToArtist] Agence trouvée via lien contact:", bookingAgencyId);
            }
          }
        }
      }

      // 3. Charger l'agence et ses contacts administratifs
      if (bookingAgencyId) {
        console.log("[SendContractToArtist] Chargement agence:", bookingAgencyId);
        
        // Charger les infos de l'agence
        const { data: agencyData } = await supabase
          .from("crm_companies")
          .select("id, name")
          .eq("id", bookingAgencyId)
          .single();
        
        if (agencyData) {
          setAgency(agencyData);
          console.log("[SendContractToArtist] Agence trouvée:", agencyData.name);
        }

        // Charger les contacts avec rôle "Administration/contrats" dans cette agence
        // D'abord, trouver le rôle "Administration/contrats" ou similaire
        const { data: roleData } = await supabase
          .from("crm_contact_roles")
          .select("id, name")
          .or("name.ilike.%administration%,name.ilike.%contrat%,name.ilike.%admin%")
          .limit(5);
        
        console.log("[SendContractToArtist] Rôles trouvés:", roleData);

        // Charger les contacts de l'agence (ceux qui ont cette entreprise dans leur link)
        const { data: contactsLinked, error: contactsError } = await supabase
          .from("crm_contact_company_links")
          .select(`
            contact_id,
            crm_contacts!inner(
              id,
              display_name,
              email_primary,
              crm_contact_role_links(
                role_id,
                crm_contact_roles(name)
              )
            )
          `)
          .eq("linked_company_id", bookingAgencyId);

        if (contactsError) {
          console.error("[SendContractToArtist] Erreur chargement contacts:", contactsError);
        }

        console.log("[SendContractToArtist] Contacts de l'agence:", contactsLinked);

        // Transformer et filtrer les contacts
        const contacts: AgencyContact[] = [];
        const seenIds = new Set<string>();

        if (contactsLinked) {
          for (const link of contactsLinked) {
            const contact = (link as any).crm_contacts;
            if (!contact || !contact.id || seenIds.has(contact.id)) continue;
            seenIds.add(contact.id);

            // Vérifier si le contact a un rôle admin/contrats
            const roles = contact.crm_contact_role_links || [];
            let roleName = "";

            for (const roleLink of roles) {
              const rName = roleLink.crm_contact_roles?.name || "";
              if (rName.toLowerCase().includes("admin") || 
                  rName.toLowerCase().includes("contrat") ||
                  rName.toLowerCase().includes("finance")) {
                roleName = rName;
                break;
              }
            }

            contacts.push({
              id: contact.id,
              display_name: contact.display_name,
              email_primary: contact.email_primary,
              role_name: roleName || (roles[0]?.crm_contact_roles?.name || ""),
            });
          }
        }

        // Trier: contacts avec rôle admin en premier
        contacts.sort((a, b) => {
          const aIsAdmin = a.role_name?.toLowerCase().includes("admin") || a.role_name?.toLowerCase().includes("contrat");
          const bIsAdmin = b.role_name?.toLowerCase().includes("admin") || b.role_name?.toLowerCase().includes("contrat");
          if (aIsAdmin && !bIsAdmin) return -1;
          if (!aIsAdmin && bIsAdmin) return 1;
          return a.display_name.localeCompare(b.display_name);
        });

        setAgencyContacts(contacts);
        console.log("[SendContractToArtist] Contacts filtrés:", contacts);

        // Sélectionner le premier par défaut
        if (contacts.length > 0) {
          setSelectedContactId(contacts[0].id);
          if (contacts[0].email_primary) {
            setEmail(contacts[0].email_primary);
          }
        }
      } else {
        console.warn("[SendContractToArtist] Aucune agence trouvée pour ce contrat!");
      }

    } catch (error) {
      console.error("[SendContractToArtist] Erreur chargement données:", error);
    } finally {
      setLoading(false);
    }
  }, [open, contract]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Mettre à jour l'email quand le contact change
  useEffect(() => {
    if (selectedContactId) {
      const contact = agencyContacts.find(c => c.id === selectedContactId);
      if (contact?.email_primary) {
        setEmail(contact.email_primary);
      }
    }
  }, [selectedContactId, agencyContacts]);

  // Générer le sujet automatiquement
  useEffect(() => {
    if (!open) return;

    // Format: ÉVÉNEMENT - CONTRAT - ARTISTE - À SIGNER PAR L'ARTISTE
    const parts: string[] = [];
    
    if (eventName) {
      parts.push(eventName.toUpperCase());
    }
    
    parts.push("CONTRAT");
    
    if (contract.artist_name) {
      parts.push(contract.artist_name.toUpperCase());
    }
    
    parts.push("À SIGNER PAR L'ARTISTE");
    
    setSubject(parts.join(" - "));
  }, [open, eventName, contract.artist_name]);

  // Générer le message par défaut
  useEffect(() => {
    if (!open) return;

    const selectedContact = agencyContacts.find(c => c.id === selectedContactId);
    const recipientName = selectedContact?.display_name || "";
    const artistName = contract.artist_name || "l'artiste";
    
    let msg = `Bonjour${recipientName ? ` ${recipientName}` : ""},\n\n`;
    msg += `Veuillez trouver ci-joint le contrat signé par le festival pour ${artistName}`;
    if (eventName) {
      msg += ` dans le cadre de ${eventName}`;
    }
    msg += ".\n\n";
    
    msg += "Merci de bien vouloir faire signer ce contrat par l'artiste et nous le retourner.\n\n";
    msg += "Cordialement";
    
    setMessage(msg);
  }, [open, selectedContactId, agencyContacts, contract.artist_name, eventName]);

  // Reset à la fermeture
  useEffect(() => {
    if (!open) {
      setCcEmails([]);
      setBccEmails([]);
      setCcInput("");
      setBccInput("");
      setSelectedContactId("");
      setEmail("");
      setPdfPreviewOpen(false);
      setPdfPreviewUrl(null);
      setAgencyContacts([]);
      setAgency(null);
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
    // Utiliser le PDF signé si disponible, sinon annoté, sinon original
    const pdfPath = contract.signed_file_url || contract.annotated_file_url || contract.original_file_url;
    
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
      console.error("[SendContractToArtist] Erreur preview PDF:", error);
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
    agencyName?: string;
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
  <title>Contrat à signer par l'artiste</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">Contrat à signer${params.artistName ? ` - ${params.artistName}` : ''}</h1>
    ${params.eventName ? `<p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 14px;">${params.eventName}</p>` : ''}
  </div>
  
  <div style="background: #fff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
    <div style="font-size: 15px; color: #333;">
      ${messageHtml}
    </div>
    
    <div style="background: #ecfdf5; padding: 15px; border-radius: 5px; border-left: 4px solid #10b981; margin: 25px 0;">
      📎 <strong>Le contrat signé par le festival est joint à cet email.</strong>
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

    // Utiliser le PDF signé si disponible, sinon annoté, sinon original
    const pdfPath = contract.signed_file_url || contract.annotated_file_url || contract.original_file_url;
    
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
      console.log("[SendContractToArtist] Début envoi email pour contrat:", contract.id);
      console.log("[SendContractToArtist] PDF path:", pdfPath);
      console.log("[SendContractToArtist] Destinataire:", email);
      
      // 1. Télécharger le PDF depuis Supabase Storage
      const { data: pdfData, error: downloadError } = await supabase.storage
        .from("contracts")
        .download(pdfPath);

      if (downloadError || !pdfData) {
        console.error("[SendContractToArtist] Erreur téléchargement PDF:", downloadError);
        throw new Error("Impossible de télécharger le PDF du contrat");
      }

      console.log("[SendContractToArtist] PDF téléchargé, taille:", pdfData.size);

      // 2. Convertir en base64
      const arrayBuffer = await pdfData.arrayBuffer();
      const base64 = btoa(
        new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
      );

      console.log("[SendContractToArtist] PDF converti en base64, longueur:", base64.length);

      // 3. Construire le nom du fichier PDF
      const cleanEvent = (eventName || "EVENT").toUpperCase().replace(/[^A-Z0-9\s-]/gi, "").replace(/\s+/g, "_");
      const cleanArtist = (contract.artist_name || "ARTISTE").toUpperCase().replace(/[^A-Z0-9\s-]/gi, "").replace(/\s+/g, "_");
      const pdfFileName = `CONTRAT_${cleanEvent}_${cleanArtist}_SIGNE_FESTIVAL.pdf`;

      console.log("[SendContractToArtist] Nom fichier PDF:", pdfFileName);

      // 4. Construire le HTML de l'email
      const selectedContact = agencyContacts.find(c => c.id === selectedContactId);
      const htmlContent = buildEmailHtml({
        recipientName: selectedContact?.display_name,
        artistName: contract.artist_name,
        eventName,
        agencyName: agency?.name,
        message,
      });

      // 5. Envoyer l'email avec le companyId récupéré depuis l'événement
      console.log("[SendContractToArtist] Envoi email avec companyId:", companyId);
      
      if (!companyId) {
        throw new Error("Impossible de déterminer l'entreprise pour la configuration SMTP");
      }
      
      const result = await sendEmail({
        to: email.trim(),
        cc: finalCcEmails.length > 0 ? finalCcEmails : undefined,
        bcc: finalBccEmails.length > 0 ? finalBccEmails : undefined,
        subject: subject.trim(),
        html: htmlContent,
        companyId: companyId,
        attachments: [{
          filename: pdfFileName,
          content: base64,
          contentType: "application/pdf",
        }],
      });

      console.log("[SendContractToArtist] Résultat envoi:", result);

      if (!result.success) {
        throw new Error(result.error || "Erreur lors de l'envoi de l'email");
      }

      const nowISO = new Date().toISOString();
      
      // 6. Mettre à jour l'historique, le statut et la date d'envoi du contrat
      await supabase
        .from("contracts")
        .update({
          status: "external_sign", // Passé au statut "À signer artiste"
          sent_for_external_sign_at: nowISO,
          updated_at: nowISO,
          history: [
            ...(contract.history || []),
            {
              at: nowISO,
              action: "sent_for_external_signature",
              details: `Envoyé pour signature à l'artiste via ${agency?.name || "l'agence"} (${email})`,
            },
          ],
        })
        .eq("id", contract.id);

      // Fermer le preview PDF s'il est ouvert
      closePdfPreview();

      toastSuccess("Contrat envoyé à l'artiste avec succès !");
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error("[SendContractToArtist] Erreur envoi:", error);
      toastError(error?.message || "Erreur lors de l'envoi de l'email");
    } finally {
      setSending(false);
    }
  };

  // Affichage du loader
  if (loading) {
    return (
      <Modal open={open} onClose={onClose} title="Envoyer à l'artiste" size="md">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal open={open} onClose={onClose} title="Envoyer à l'artiste" size="md">
      <div className="space-y-5">
        {/* Résumé du contrat */}
        <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg border border-green-200 dark:border-green-800">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-green-100 dark:bg-green-800 flex items-center justify-center">
              <Send className="w-6 h-6 text-green-600 dark:text-green-400" />
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
                {contract.signed_file_url ? "PDF signé par le festival" : 
                 contract.annotated_file_url ? "PDF annoté" : "PDF original"}
              </p>
            </div>
            {(contract.signed_file_url || contract.annotated_file_url || contract.original_file_url) && (
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

        {/* Agence */}
        {agency && (
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
            <div className="flex items-center gap-2 text-sm">
              <Building2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span className="font-medium text-blue-800 dark:text-blue-200">Agence :</span>
              <span className="text-blue-700 dark:text-blue-300">{agency.name}</span>
            </div>
          </div>
        )}

        {/* Sélection du contact */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>
            <User className="w-4 h-4" />
            Destinataire <span className="text-red-500">*</span>
          </label>
          {agencyContacts.length === 0 ? (
            <div className="text-sm text-amber-600 dark:text-amber-400 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
              <p className="font-medium">Aucun contact trouvé pour cette agence.</p>
              <p className="text-xs mt-1">Veuillez vérifier que l'offre a bien un booking agent avec une agence liée, et que cette agence a des contacts.</p>
            </div>
          ) : (
            <select
              value={selectedContactId}
              onChange={(e) => setSelectedContactId(e.target.value)}
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
              <option value="">Sélectionner un destinataire...</option>
              {agencyContacts.map((contact) => (
                <option key={contact.id} value={contact.id}>
                  {contact.display_name} 
                  {contact.email_primary ? ` (${contact.email_primary})` : " (pas d'email)"}
                  {contact.role_name ? ` - ${contact.role_name}` : ""}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Email manuel si nécessaire */}
        {agencyContacts.length === 0 && (
          <div>
            <label className="flex items-center gap-2 text-sm font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>
              <Mail className="w-4 h-4" />
              Email du destinataire <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@agence.com"
              className="input w-full"
            />
          </div>
        )}

        {/* CC */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>
            <Users className="w-4 h-4" />
            CC (Copie carbone)
          </label>
          <div className="flex gap-2 items-center">
            <input
              id="artist-contract-email-cc-input"
              name="cc-artist-contract-email"
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
              className="h-[44px] w-[44px] flex items-center justify-center rounded-xl border transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:border-green-500"
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
                id="artist-contract-email-bcc-input"
                name="bcc-artist-contract-email"
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
                className="h-[44px] w-[44px] flex items-center justify-center rounded-xl border transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:border-green-500"
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
                  <button onClick={() => removeBccEmail(bccEmail)} className="ml-1 hover:text-red-500">
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
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="input w-full"
          />
        </div>

        {/* Message */}
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>
            Message
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={6}
            className="input w-full resize-y"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button variant="ghost" onClick={onClose} className="flex-1">
            Annuler
          </Button>
          <Button
            onClick={handleSend}
            disabled={sending || !email.trim()}
            className="flex-1 bg-green-600 hover:bg-green-700"
          >
            {sending ? (
              <span className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                Envoi...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Send className="w-4 h-4" />
                Envoyer à l'artiste
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* Modal de prévisualisation PDF */}
      {pdfPreviewOpen && pdfPreviewUrl && (
        <Modal 
          open={pdfPreviewOpen} 
          onClose={closePdfPreview} 
          title="Aperçu du contrat"
          size="xl"
        >
          <div className="h-[75vh]">
            <iframe
              src={pdfPreviewUrl}
              className="w-full h-full border-0 rounded-lg"
              title="Aperçu du contrat PDF"
            />
          </div>
          <div className="flex justify-end pt-4">
            <Button variant="ghost" onClick={closePdfPreview}>
              Fermer
            </Button>
          </div>
        </Modal>
      )}
    </Modal>
  );
}

export default SendContractToArtistModal;
