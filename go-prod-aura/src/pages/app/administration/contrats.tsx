import React, { useState, useEffect, useRef } from 'react';
import { FileText, Plus, Search, AlertCircle, Upload, Pencil, Download, RefreshCw, Send, Inbox, Edit3, SendHorizontal, CheckCircle } from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';
import type { Contract, ContractStatus } from '../../../types/contracts';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Modal } from '../../../components/aura/Modal';
import { PageHeader } from '../../../components/aura/PageHeader';
// import { ContractsKanbanAura } from '../../../components/contracts/ContractsKanbanAura'; // TEMPORAIRE: Kanban supprimé
import { ContractsListView } from '../../../components/contracts/ContractsListView';
import { ContractForm } from '../../../components/contracts/ContractForm';
import type { ContractFormData } from '../../../components/contracts/ContractForm';
import { SignatureEmailModal } from '../../../components/contracts/SignatureEmailModal';
import { ExternalSignatureModal } from '../../../components/contracts/ExternalSignatureModal';
import { SendContractForSignatureModal } from '../../../components/contracts/SendContractForSignatureModal';
import { SendContractToArtistModal } from '../../../components/contracts/SendContractToArtistModal';
import { ContractPdfViewer } from '../../../components/contracts/ContractPdfViewer';
import { AnnotatedPdfUploader } from '../../../components/contracts/AnnotatedPdfUploader';
import { EventDaysContainer } from '../../../components/aura/EventDaysContainer';

/**
 * Composant Modal pour afficher un PDF de contrat
 * Gère la génération de l'URL publique depuis Supabase Storage
 */
function ContractViewModal({ 
  contract, 
  isOpen, 
  onClose 
}: { 
  contract: Contract; 
  isOpen: boolean; 
  onClose: () => void;
}) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen || !contract) return;

    const loadPdfUrl = async () => {
      setLoading(true);
      try {
        // Déterminer quel fichier afficher (priorité: final > signed > annotated > original)
        const storagePath = 
          contract.current_version === 'final' && contract.final_signed_file_url
            ? contract.final_signed_file_url
            : contract.current_version === 'signed' && contract.signed_file_url
            ? contract.signed_file_url
            : contract.current_version === 'annotated' && contract.annotated_file_url
            ? contract.annotated_file_url
            : contract.original_file_url;

        if (!storagePath) {
          setPdfUrl(null);
          return;
        }

        // Si c'est déjà une URL complète, l'utiliser directement
        if (storagePath.startsWith('http')) {
          setPdfUrl(storagePath);
          return;
        }

        // Sinon, générer l'URL publique depuis Supabase Storage
        const { data } = supabase.storage
          .from('contracts')
          .getPublicUrl(storagePath);

        setPdfUrl(data.publicUrl);
      } catch (err) {
        console.error('Erreur chargement URL PDF:', err);
        setPdfUrl(null);
      } finally {
        setLoading(false);
      }
    };

    loadPdfUrl();
  }, [isOpen, contract]);

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title={contract.contract_title}
      size="xl"
    >
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-violet-200 border-t-violet-500 rounded-full animate-spin"></div>
        </div>
      ) : pdfUrl ? (
        <ContractPdfViewer
          pdfUrl={pdfUrl}
          title={contract.contract_title}
        />
      ) : (
        <div className="p-8 text-center">
          <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-sm text-gray-500">Aucun PDF disponible</p>
        </div>
      )}
    </Modal>
  );
}

/**
 * Helper pour formater une date ISO en format court DD/MM
 */
function formatDateShort(dateString?: string | null): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  return `${day}/${month}`;
}

/**
 * Page principale du module Contrats
 * - Gestion complète des contrats d'artistes
 * - Vue Kanban en haut + Liste en dessous
 * - Workflow de signature
 * - Intégration avec module Offres
 */
export default function ContratsPage() {
  // États principaux
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // États des modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showSignatureEmailModal, setShowSignatureEmailModal] = useState(false);
  const [showExternalEmailModal, setShowExternalEmailModal] = useState(false);
  const [showSendForSignatureModal, setShowSendForSignatureModal] = useState(false);
  const [showSendToArtistModal, setShowSendToArtistModal] = useState(false);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [uploadingContractId, setUploadingContractId] = useState<string | null>(null);
  
  // Ref pour les inputs file cachés
  const fileInputRef = useRef<HTMLInputElement>(null);
  const annotatedFileInputRef = useRef<HTMLInputElement>(null);
  const signedArtistFileInputRef = useRef<HTMLInputElement>(null);

  // Charger les contrats
  useEffect(() => {
    fetchContracts();
    
    // Écouter l'événement de création depuis le module Offres
    const handleContractCreated = (event: any) => {
      console.log('📧 Événement contract-created-from-offer reçu:', event.detail);
      fetchContracts();
    };

    window.addEventListener('contract-created-from-offer', handleContractCreated);
    
    return () => {
      window.removeEventListener('contract-created-from-offer', handleContractCreated);
    };
  }, []);

  const fetchContracts = async () => {
    try {
      setLoading(true);
      setError('');

      // Récupérer les contrats avec leurs relations
      const { data, error: fetchError } = await supabase
        .from('contracts')
        .select(`
          *,
          artists!inner (id, name),
          events (id, name),
          offers:source_offer_id (date_time, stage_name)
        `)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      // Mapper les données
      const mappedContracts: Contract[] = (data || []).map((contract: any) => ({
        ...contract,
        artist_name: contract.artists?.name,
        event_name: contract.events?.name,
        history: contract.history || [],
        date_time: contract.offers?.date_time || null,
        stage_name: contract.offers?.stage_name || null,
      }));

      // Ajouter les cartes virtuelles depuis les offres acceptées sans contrat
      const { data: offers } = await supabase
        .from('offers')
        .select(`
          id,
          artist_id,
          event_id,
          contract_id,
          date_time,
          stage_name,
          artists!inner (id, name),
          events!inner (id, name)
        `)
        .eq('status', 'accepted')
        .is('contract_id', null);

      const virtualContracts: Contract[] = (offers || []).map((offer: any) => ({
        id: `virtual-${offer.id}`,
        artist_id: offer.artist_id,
        artist_name: offer.artists.name,
        contract_title: `Contrat ${offer.artists.name} - ${offer.events.name}`,
        status: 'to_receive' as ContractStatus,
        history: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        virtual: true,
        event_id: offer.event_id,
        event_name: offer.events.name,
        source_offer_id: offer.id,
        date_time: offer.date_time,
        stage_name: offer.stage_name,
      }));

      setContracts([...mappedContracts, ...virtualContracts]);
    } catch (err) {
      console.error('Erreur chargement contrats:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des contrats');
    } finally {
      setLoading(false);
    }
  };

  // Créer un contrat
  const handleCreateContract = async (formData: ContractFormData) => {
    try {
      // Upload du PDF si fourni
      let originalFileUrl = '';
      if (formData.file) {
        const timestamp = Date.now();
        const fileName = `contract_${timestamp}_original.pdf`;
        
        const { error: uploadError } = await supabase.storage
          .from('contracts')
          .upload(fileName, formData.file);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('contracts')
          .getPublicUrl(fileName);

        originalFileUrl = urlData.publicUrl;
      }

      // Créer le contrat
      const contractData = {
        artist_id: formData.artist_id,
        event_id: formData.event_id || null,
        contract_title: formData.contract_title,
        status: 'to_receive' as const,
        original_file_url: originalFileUrl || null,
        management_email: formData.management_email || null,
        external_email: formData.external_email || null,
        history: [{
          at: new Date().toISOString(),
          action: 'created',
          details: 'Contrat créé manuellement'
        }]
      };

      const { error: insertError } = await supabase
        .from('contracts')
        .insert([contractData]);

      if (insertError) throw insertError;

      await fetchContracts();
      setShowCreateModal(false);
    } catch (err) {
      console.error('Erreur création contrat:', err);
      throw err;
    }
  };

  // Changer le statut (drag & drop)
  const handleStatusChange = async (contractId: string, newStatus: ContractStatus) => {
    try {
      if (contractId.startsWith('virtual-')) {
        console.log('Carte virtuelle : utiliser "Nouveau contrat"');
        return;
      }

      const { error } = await supabase
        .from('contracts')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', contractId);

      if (error) throw error;
      await fetchContracts();
    } catch (err) {
      console.error('Erreur changement statut:', err);
      setError(err instanceof Error ? err.message : 'Erreur changement statut');
    }
  };

  // Envoyer email
  const handleSendEmail = async (contract: Contract) => {
    if (['internal_sign', 'internal_signed'].includes(contract.status)) {
      setSelectedContract(contract);
      if (contract.status === 'internal_signed') {
        setShowExternalEmailModal(true);
      } else {
        setShowSignatureEmailModal(true);
      }
    }
  };

  // Supprimer
  const handleDeleteContract = async (contract: Contract) => {
    if (!confirm(`Supprimer "${contract.contract_title}" ?`)) return;

    try {
      const { error } = await supabase
        .from('contracts')
        .delete()
        .eq('id', contract.id);

      if (error) throw error;
      await fetchContracts();
    } catch (err) {
      console.error('Erreur suppression:', err);
      setError(err instanceof Error ? err.message : 'Erreur suppression');
    }
  };

  const handleUpload = (contract: Contract) => {
    setSelectedContract(contract);
    setShowUploadModal(true);
  };

  const handleView = (contract: Contract) => {
    setSelectedContract(contract);
    setShowViewModal(true);
  };

  // Upload PDF pour un contrat virtuel (offre acceptée)
  const handleUploadContractPdf = async (contract: Contract, file: File) => {
    if (!file || !file.type.includes('pdf')) {
      setError('Veuillez sélectionner un fichier PDF');
      return;
    }

    try {
      setUploadingContractId(contract.id);
      
      // Générer un nom de fichier unique
      const timestamp = Date.now();
      const safeArtistName = (contract.artist_name || 'artiste').replace(/[^a-zA-Z0-9]/g, '_');
      const fileName = `${timestamp}_${safeArtistName}_contrat.pdf`;
      const storagePath = `${contract.event_id || 'general'}/${fileName}`;

      // Upload du fichier
      const { error: uploadError } = await supabase.storage
        .from('contracts')
        .upload(storagePath, file);

      if (uploadError) throw uploadError;

      const nowISO = new Date().toISOString();
      
      // Si c'est un contrat virtuel, créer le vrai contrat
      if (contract.virtual && contract.source_offer_id) {
        // Créer le contrat réel
        const { data: newContract, error: createError } = await supabase
          .from('contracts')
          .insert({
            artist_id: contract.artist_id,
            event_id: contract.event_id,
            source_offer_id: contract.source_offer_id,
            contract_title: contract.contract_title,
            status: 'review', // Passe au statut "En révision" après upload
            original_file_url: storagePath,
            received_at: nowISO, // Date de réception
            history: [{
              at: nowISO,
              action: 'uploaded',
              details: 'PDF du contrat uploadé'
            }]
          })
          .select()
          .single();

        if (createError) throw createError;

        // Mettre à jour l'offre avec l'ID du contrat
        await supabase
          .from('offers')
          .update({ contract_id: newContract.id })
          .eq('id', contract.source_offer_id);

        console.log('✅ Contrat créé:', newContract.id);
      } else {
        // Mettre à jour le contrat existant
        const { error: updateError } = await supabase
          .from('contracts')
          .update({
            original_file_url: storagePath,
            status: 'review',
            received_at: nowISO, // Date de réception
            updated_at: nowISO
          })
          .eq('id', contract.id);

        if (updateError) throw updateError;
      }

      await fetchContracts();
      setError('');
    } catch (err) {
      console.error('Erreur upload PDF contrat:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'upload du PDF');
    } finally {
      setUploadingContractId(null);
    }
  };

  // Déclencher le sélecteur de fichier
  const triggerFileUpload = (contract: Contract) => {
    setSelectedContract(contract);
    fileInputRef.current?.click();
  };

  // Gérer la sélection du fichier
  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && selectedContract) {
      await handleUploadContractPdf(selectedContract, file);
    }
    // Reset l'input pour permettre de sélectionner le même fichier
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Télécharger le PDF pour annotation (ouvre avec l'application par défaut - Acrobat, etc.)
  const handleDownloadForAnnotation = async (contract: Contract) => {
    try {
      const storagePath = contract.original_file_url;
      if (!storagePath) {
        setError('Aucun PDF disponible pour ce contrat');
        return;
      }

      // Télécharger le fichier depuis Supabase Storage
      const { data, error: downloadError } = await supabase.storage
        .from('contracts')
        .download(storagePath);

      if (downloadError) throw downloadError;

      // Créer un lien de téléchargement
      const url = URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      
      // Nom du fichier pour le téléchargement
      const fileName = `${contract.artist_name || 'contrat'}_a_annoter.pdf`;
      link.download = fileName;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Erreur téléchargement PDF:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors du téléchargement');
    }
  };

  // Upload du PDF annoté et passage au statut "A signer festival"
  const handleUploadAnnotatedPdf = async (contract: Contract, file: File) => {
    if (!file || !file.type.includes('pdf')) {
      setError('Veuillez sélectionner un fichier PDF');
      return;
    }

    try {
      setUploadingContractId(contract.id);
      
      // Extraire le nom du fichier original (sans extension)
      const originalFileName = file.name.replace(/\.pdf$/i, '');
      
      // Nom de l'événement sécurisé pour le nom de fichier
      const safeEventName = (contract.event_name || 'Evenement').replace(/[^a-zA-Z0-9]/g, '_');
      
      // Générer le nom de fichier : {nom_fichier_original}_{Evenement}_ANNOTE.pdf
      const timestamp = Date.now();
      const fileName = `${timestamp}_${originalFileName}_${safeEventName}_ANNOTE.pdf`;
      const storagePath = `${contract.event_id || 'general'}/${fileName}`;

      // Upload du fichier annoté
      const { error: uploadError } = await supabase.storage
        .from('contracts')
        .upload(storagePath, file);

      if (uploadError) throw uploadError;

      const nowISO = new Date().toISOString();
      
      // Mettre à jour le contrat avec le PDF annoté et passer au statut "A signer festival"
      const { error: updateError } = await supabase
        .from('contracts')
        .update({
          annotated_file_url: storagePath,
          current_version: 'annotated',
          status: 'internal_sign', // A signer festival
          annotated_at: nowISO, // Date d'annotation
          updated_at: nowISO,
          history: [
            ...(contract.history || []),
            {
              at: nowISO,
              action: 'annotated',
              details: 'PDF annoté uploadé - À signer par le festival'
            }
          ]
        })
        .eq('id', contract.id);

      if (updateError) throw updateError;

      console.log('✅ PDF annoté uploadé:', storagePath);
      await fetchContracts();
      setError('');
    } catch (err) {
      console.error('Erreur upload PDF annoté:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'upload du PDF annoté');
    } finally {
      setUploadingContractId(null);
    }
  };

  // Déclencher le sélecteur de fichier pour PDF annoté
  const triggerAnnotatedFileUpload = (contract: Contract) => {
    setSelectedContract(contract);
    annotatedFileInputRef.current?.click();
  };

  // Gérer la sélection du fichier annoté
  const handleAnnotatedFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && selectedContract) {
      await handleUploadAnnotatedPdf(selectedContract, file);
    }
    // Reset l'input
    if (annotatedFileInputRef.current) {
      annotatedFileInputRef.current.value = '';
    }
  };

  // Référence pour l'input de remplacement du PDF original
  const replaceFileInputRef = useRef<HTMLInputElement>(null);

  // Remplacer le PDF original (si mauvais document uploadé)
  const handleReplaceOriginalPdf = async (contract: Contract, file: File) => {
    if (!file || !file.type.includes('pdf')) {
      setError('Veuillez sélectionner un fichier PDF');
      return;
    }

    try {
      setUploadingContractId(contract.id);
      
      // Supprimer l'ancien fichier si possible
      if (contract.original_file_url) {
        await supabase.storage
          .from('contracts')
          .remove([contract.original_file_url]);
      }
      
      // Générer un nouveau nom de fichier
      const timestamp = Date.now();
      const safeArtistName = (contract.artist_name || 'artiste').replace(/[^a-zA-Z0-9]/g, '_');
      const fileName = `${timestamp}_${safeArtistName}_contrat.pdf`;
      const storagePath = `${contract.event_id || 'general'}/${fileName}`;

      // Upload du nouveau fichier
      const { error: uploadError } = await supabase.storage
        .from('contracts')
        .upload(storagePath, file);

      if (uploadError) throw uploadError;

      // Mettre à jour le contrat avec le nouveau PDF
      const { error: updateError } = await supabase
        .from('contracts')
        .update({
          original_file_url: storagePath,
          updated_at: new Date().toISOString(),
          history: [
            ...(contract.history || []),
            {
              at: new Date().toISOString(),
              action: 'replaced',
              details: 'PDF original remplacé'
            }
          ]
        })
        .eq('id', contract.id);

      if (updateError) throw updateError;

      console.log('✅ PDF original remplacé:', storagePath);
      await fetchContracts();
      setError('');
    } catch (err) {
      console.error('Erreur remplacement PDF:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors du remplacement du PDF');
    } finally {
      setUploadingContractId(null);
    }
  };

  // Déclencher le sélecteur de fichier pour remplacer le PDF
  const triggerReplaceFileUpload = (contract: Contract) => {
    setSelectedContract(contract);
    replaceFileInputRef.current?.click();
  };

  // Gérer la sélection du fichier de remplacement
  const handleReplaceFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && selectedContract) {
      await handleReplaceOriginalPdf(selectedContract, file);
    }
    // Reset l'input
    if (replaceFileInputRef.current) {
      replaceFileInputRef.current.value = '';
    }
  };

  // Référence pour l'input du PDF signé festival
  const signedFestivalFileInputRef = useRef<HTMLInputElement>(null);

  // Upload du PDF signé par le festival et passage au statut suivant
  const handleUploadSignedFestivalPdf = async (contract: Contract, file: File) => {
    if (!file || !file.type.includes('pdf')) {
      setError('Veuillez sélectionner un fichier PDF');
      return;
    }

    try {
      setUploadingContractId(contract.id);
      
      // Extraire le nom du fichier original (sans extension)
      const originalFileName = file.name.replace(/\.pdf$/i, '');
      
      // Nom de l'événement sécurisé pour le nom de fichier
      const safeEventName = (contract.event_name || 'Evenement').replace(/[^a-zA-Z0-9]/g, '_');
      
      // Générer le nom de fichier : {nom_fichier_original}_{Evenement}_SIGNE_FESTIVAL.pdf
      const timestamp = Date.now();
      const fileName = `${timestamp}_${originalFileName}_${safeEventName}_SIGNE_FESTIVAL.pdf`;
      const storagePath = `${contract.event_id || 'general'}/${fileName}`;

      // Upload du fichier signé
      const { error: uploadError } = await supabase.storage
        .from('contracts')
        .upload(storagePath, file);

      if (uploadError) throw uploadError;

      const nowISO = new Date().toISOString();
      
      // Mettre à jour le contrat avec le PDF signé et passer au statut "signé festival"
      const { error: updateError } = await supabase
        .from('contracts')
        .update({
          signed_file_url: storagePath,
          current_version: 'signed',
          status: 'internal_signed', // Signé par le festival
          internal_signed_at: nowISO, // Date de signature festival
          updated_at: nowISO,
          history: [
            ...(contract.history || []),
            {
              at: nowISO,
              action: 'signed_by_festival',
              details: 'PDF signé par le festival uploadé'
            }
          ]
        })
        .eq('id', contract.id);

      if (updateError) throw updateError;

      console.log('✅ PDF signé festival uploadé:', storagePath);
      await fetchContracts();
      setError('');
    } catch (err) {
      console.error('Erreur upload PDF signé festival:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'upload du PDF signé');
    } finally {
      setUploadingContractId(null);
    }
  };

  // Déclencher le sélecteur de fichier pour le PDF signé festival
  const triggerSignedFestivalFileUpload = (contract: Contract) => {
    setSelectedContract(contract);
    signedFestivalFileInputRef.current?.click();
  };

  // Gérer la sélection du fichier signé festival
  const handleSignedFestivalFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && selectedContract) {
      await handleUploadSignedFestivalPdf(selectedContract, file);
    }
    // Reset l'input
    if (signedFestivalFileInputRef.current) {
      signedFestivalFileInputRef.current.value = '';
    }
  };

  // Upload du PDF signé par l'artiste et passage au statut finalisé
  const handleUploadSignedArtistPdf = async (contract: Contract, file: File) => {
    if (!file || !file.type.includes('pdf')) {
      setError('Veuillez sélectionner un fichier PDF');
      return;
    }

    try {
      setUploadingContractId(contract.id);
      
      // Nom de l'artiste sécurisé pour le nom de fichier (sans espaces ni caractères spéciaux)
      const safeArtistName = (contract.artist_name || 'Artiste').replace(/[^a-zA-Z0-9]/g, '_');
      
      // Nom de l'événement sécurisé pour le nom de fichier
      const safeEventName = (contract.event_name || 'Evenement').replace(/[^a-zA-Z0-9]/g, '_');
      
      // Générer le nom de fichier : CONTRAT_{Evenement}_{Artiste}_SIGNE_ARTISTE.pdf
      const timestamp = Date.now();
      const fileName = `${timestamp}_CONTRAT_${safeEventName}_${safeArtistName}_SIGNE_ARTISTE.pdf`;
      const storagePath = `${contract.event_id || 'general'}/${fileName}`;

      // Upload du fichier signé
      const { error: uploadError } = await supabase.storage
        .from('contracts')
        .upload(storagePath, file);

      if (uploadError) throw uploadError;

      const nowISO = new Date().toISOString();
      
      // Mettre à jour le contrat avec le PDF signé et passer au statut finalisé
      const { error: updateError } = await supabase
        .from('contracts')
        .update({
          final_signed_file_url: storagePath,
          current_version: 'final',
          status: 'finalized', // Contrat finalisé
          external_signed_at: nowISO, // Date de signature artiste
          finalized_at: nowISO, // Date de finalisation
          updated_at: nowISO,
          history: [
            ...(contract.history || []),
            {
              at: nowISO,
              action: 'signed_by_artist',
              details: 'PDF signé par l\'artiste uploadé - Contrat finalisé'
            }
          ]
        })
        .eq('id', contract.id);

      if (updateError) throw updateError;

      console.log('✅ PDF signé artiste uploadé:', storagePath);
      await fetchContracts();
      setError('');
    } catch (err) {
      console.error('Erreur upload PDF signé artiste:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'upload du PDF signé');
    } finally {
      setUploadingContractId(null);
    }
  };

  // Déclencher le sélecteur de fichier pour le PDF signé artiste
  const triggerSignedArtistFileUpload = (contract: Contract) => {
    setSelectedContract(contract);
    signedArtistFileInputRef.current?.click();
  };

  // Gérer la sélection du fichier signé artiste
  const handleSignedArtistFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && selectedContract) {
      await handleUploadSignedArtistPdf(selectedContract, file);
    }
    // Reset l'input
    if (signedArtistFileInputRef.current) {
      signedArtistFileInputRef.current.value = '';
    }
  };

  // Filtrer
  const filteredContracts = contracts.filter((contract) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      contract.contract_title.toLowerCase().includes(query) ||
      contract.artist_name?.toLowerCase().includes(query) ||
      contract.event_name?.toLowerCase().includes(query)
    );
  });

  return (
    <div className="flex flex-col h-full p-6 space-y-6">
      {/* Input file caché pour upload PDF initial */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,application/pdf"
        onChange={handleFileSelected}
        className="hidden"
      />
      
      {/* Input file caché pour upload PDF annoté */}
      <input
        ref={annotatedFileInputRef}
        type="file"
        accept=".pdf,application/pdf"
        onChange={handleAnnotatedFileSelected}
        className="hidden"
      />
      
      {/* Input file caché pour remplacer le PDF original */}
      <input
        ref={replaceFileInputRef}
        type="file"
        accept=".pdf,application/pdf"
        onChange={handleReplaceFileSelected}
        className="hidden"
      />
      
      {/* Input file caché pour upload PDF signé festival */}
      <input
        ref={signedFestivalFileInputRef}
        type="file"
        accept=".pdf,application/pdf"
        onChange={handleSignedFestivalFileSelected}
        className="hidden"
      />
      
      {/* Input file caché pour upload PDF signé artiste */}
      <input
        ref={signedArtistFileInputRef}
        type="file"
        accept=".pdf,application/pdf"
        onChange={handleSignedArtistFileSelected}
        className="hidden"
      />
      
      {/* Header */}
      <PageHeader
        icon={FileText}
        title="CONTRATS"
        actions={
          <>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Rechercher..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
            <Button
              variant="primary"
              onClick={() => setShowCreateModal(true)}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Nouveau contrat
            </Button>
          </>
        }
      />

      {/* Erreur */}
      {error && (
        <div className="mb-4 flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg">
          <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* Contenu */}
      <div className="flex-1 overflow-y-auto space-y-8">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-violet-200 border-t-violet-500 rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Chargement...</p>
            </div>
          </div>
        ) : (
          <>
            {/* Vue par jour - Offres acceptées (prêtes pour contrat) */}
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Contrats par jour
              </h2>
              <EventDaysContainer 
                eventId={localStorage.getItem("selected_event_id") || ""}
                emptyMessage="Aucun contrat pour ce jour"
              >
                {(day) => {
                  // Filtrer les contrats pour ce jour
                  const dayContracts = filteredContracts.filter(contract => {
                    if (!contract.date_time) return false;
                    const contractDate = contract.date_time.split('T')[0];
                    return contractDate === day.date;
                  });
                  
                  if (dayContracts.length === 0) {
                    return (
                      <div className="px-5 py-4 text-center text-sm text-gray-400 dark:text-gray-500 italic">
                        Aucun contrat pour ce jour
                      </div>
                    );
                  }
                  
                  return dayContracts.map(contract => (
                    <div 
                      key={contract.id}
                      className="px-5 py-3 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                    >
                      {/* Colonne Statut - largeur fixe, aligné à gauche */}
                      <div className="w-36 flex-shrink-0">
                        <span className={`
                          inline-block px-3 py-1.5 text-sm font-medium rounded-lg w-full text-center
                          ${contract.virtual 
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' 
                            : contract.status === 'finalized' 
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                              : 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400'
                          }
                        `}>
                          {contract.virtual ? 'À recevoir' : 
                           contract.status === 'to_receive' ? 'À recevoir' :
                           contract.status === 'review' ? 'À réviser' :
                           contract.status === 'internal_sign' ? 'À signer festival' :
                           contract.status === 'internal_signed' ? 'Signé festival' :
                           contract.status === 'external_sign' ? 'À signer artiste' :
                           contract.status === 'finalized' ? 'Finalisé' :
                           contract.status}
                        </span>
                      </div>
                      
                      {/* Nom de l'artiste - juste après le statut */}
                      <div className="w-40 flex-shrink-0">
                        <p className="font-medium text-gray-900 dark:text-white truncate">
                          {contract.artist_name}
                        </p>
                        {contract.stage_name && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {contract.stage_name}
                          </p>
                        )}
                      </div>
                      
                      {/* Badges de dates - en ligne horizontale, tous en gris sauf le dernier (signé artiste/finalisé) en vert */}
                      <div className="flex items-center gap-2 flex-1">
                        {/* Reçu le - visible si received_at existe */}
                        {contract.received_at && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400">
                            <Inbox className="w-3 h-3" />
                            Reçu {formatDateShort(contract.received_at)}
                          </span>
                        )}
                        
                        {/* Annoté le - visible si annotated_at existe */}
                        {contract.annotated_at && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400">
                            <Edit3 className="w-3 h-3" />
                            Annoté {formatDateShort(contract.annotated_at)}
                          </span>
                        )}
                        
                        {/* Envoyé le - visible si sent_for_internal_sign_at existe */}
                        {contract.sent_for_internal_sign_at && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400">
                            <SendHorizontal className="w-3 h-3" />
                            Envoyé {formatDateShort(contract.sent_for_internal_sign_at)}
                          </span>
                        )}
                        
                        {/* Signé festival - visible si internal_signed_at existe */}
                        {contract.internal_signed_at && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400">
                            <CheckCircle className="w-3 h-3" />
                            Signé festival {formatDateShort(contract.internal_signed_at)}
                          </span>
                        )}
                        
                        {/* Envoyé artiste - visible si sent_for_external_sign_at existe */}
                        {contract.sent_for_external_sign_at && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400">
                            <SendHorizontal className="w-3 h-3" />
                            Envoyé artiste {formatDateShort(contract.sent_for_external_sign_at)}
                          </span>
                        )}
                        
                        {/* Signé artiste - VERT - visible si external_signed_at existe */}
                        {contract.external_signed_at && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                            <CheckCircle className="w-3 h-3" />
                            Signé artiste {formatDateShort(contract.external_signed_at)}
                          </span>
                        )}
                        
                        {/* Finalisé - VERT - visible si finalized_at existe */}
                        {contract.finalized_at && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                            <CheckCircle className="w-3 h-3" />
                            Finalisé {formatDateShort(contract.finalized_at)}
                          </span>
                        )}
                      </div>
                      
                      {/* Actions - tous les boutons ont une largeur fixe de 180px */}
                      <div className="flex items-center gap-2">
                        {/* Bouton Upload PDF - visible pour statut "À recevoir" */}
                        {(contract.virtual || contract.status === 'to_receive') && (
                          <button
                            onClick={() => triggerFileUpload(contract)}
                            disabled={uploadingContractId === contract.id}
                            className={`
                              min-w-[180px] px-3 py-1.5 text-sm font-medium rounded-lg flex items-center justify-center gap-2 transition-colors
                              ${uploadingContractId === contract.id
                                ? 'bg-gray-100 text-gray-400 cursor-wait'
                                : 'bg-violet-100 text-violet-700 hover:bg-violet-200 dark:bg-violet-900/30 dark:text-violet-400 dark:hover:bg-violet-900/50'
                              }
                            `}
                            title="Ajouter le PDF du contrat"
                          >
                            <Upload className="w-4 h-4" />
                            {uploadingContractId === contract.id ? 'Upload...' : 'Ajouter PDF'}
                          </button>
                        )}
                        
                        {/* Bouton Modifier PDF - visible pour statut "À réviser" (si mauvais document) */}
                        {!contract.virtual && contract.status === 'review' && contract.original_file_url && (
                          <button
                            onClick={() => triggerReplaceFileUpload(contract)}
                            disabled={uploadingContractId === contract.id}
                            className={`
                              min-w-[180px] px-3 py-1.5 text-sm font-medium rounded-lg flex items-center justify-center gap-2 transition-colors
                              ${uploadingContractId === contract.id
                                ? 'bg-gray-100 text-gray-400 cursor-wait'
                                : 'bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:hover:bg-amber-900/50'
                              }
                            `}
                            title="Remplacer le PDF original (si mauvais document)"
                          >
                            <RefreshCw className="w-4 h-4" />
                            {uploadingContractId === contract.id ? 'Upload...' : 'Modifier PDF original'}
                          </button>
                        )}
                        
                        {/* Bouton Annoter - visible pour statut "À réviser" */}
                        {!contract.virtual && contract.status === 'review' && contract.original_file_url && (
                          <button
                            onClick={() => handleDownloadForAnnotation(contract)}
                            className="min-w-[180px] px-3 py-1.5 text-sm font-medium rounded-lg flex items-center justify-center gap-2 transition-colors bg-violet-100 text-violet-700 hover:bg-violet-200 dark:bg-violet-900/30 dark:text-violet-400 dark:hover:bg-violet-900/50"
                            title="Télécharger pour annoter avec Acrobat"
                          >
                            <Download className="w-4 h-4" />
                            Annoter
                          </button>
                        )}
                        
                        {/* Bouton Uploader annoté - visible pour statut "À réviser" */}
                        {!contract.virtual && contract.status === 'review' && (
                          <button
                            onClick={() => triggerAnnotatedFileUpload(contract)}
                            disabled={uploadingContractId === contract.id}
                            className={`
                              min-w-[180px] px-3 py-1.5 text-sm font-medium rounded-lg flex items-center justify-center gap-2 transition-colors
                              ${uploadingContractId === contract.id
                                ? 'bg-gray-100 text-gray-400 cursor-wait'
                                : 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50'
                              }
                            `}
                            title="Uploader le PDF annoté"
                          >
                            <Upload className="w-4 h-4" />
                            {uploadingContractId === contract.id ? 'Upload...' : 'Uploader annoté'}
                          </button>
                        )}
                        
                        {/* Bouton Envoyer pour signature - visible pour statut "À signer festival" */}
                        {!contract.virtual && contract.status === 'internal_sign' && (
                          <button
                            onClick={() => {
                              setSelectedContract(contract);
                              setShowSendForSignatureModal(true);
                            }}
                            className="min-w-[180px] px-3 py-1.5 text-sm font-medium rounded-lg flex items-center justify-center gap-2 transition-colors bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50"
                            title="Envoyer le contrat pour signature interne"
                          >
                            <Send className="w-4 h-4" />
                            Envoyer pour signature
                          </button>
                        )}
                        
                        {/* Bouton Uploader signé - visible pour statut "À signer festival" (après envoi) */}
                        {!contract.virtual && contract.status === 'internal_sign' && (
                          <button
                            onClick={() => triggerSignedFestivalFileUpload(contract)}
                            disabled={uploadingContractId === contract.id}
                            className={`
                              min-w-[180px] px-3 py-1.5 text-sm font-medium rounded-lg flex items-center justify-center gap-2 transition-colors
                              ${uploadingContractId === contract.id
                                ? 'bg-gray-100 text-gray-400 cursor-wait'
                                : 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50'
                              }
                            `}
                            title="Uploader le contrat signé par le festival"
                          >
                            <Upload className="w-4 h-4" />
                            {uploadingContractId === contract.id ? 'Upload...' : 'Uploader signé'}
                          </button>
                        )}
                        
                        {/* Bouton Envoyer à l'artiste - visible pour statut "Signé festival" */}
                        {!contract.virtual && contract.status === 'internal_signed' && (
                          <button
                            onClick={() => {
                              setSelectedContract(contract);
                              setShowSendToArtistModal(true);
                            }}
                            className="min-w-[180px] px-3 py-1.5 text-sm font-medium rounded-lg flex items-center justify-center gap-2 transition-colors bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50"
                            title="Envoyer le contrat à l'artiste pour signature"
                          >
                            <Send className="w-4 h-4" />
                            Envoyer à l'artiste
                          </button>
                        )}
                        
                        {/* Bouton Uploader signé artiste - visible pour statut "À signer artiste" */}
                        {!contract.virtual && contract.status === 'external_sign' && (
                          <button
                            onClick={() => triggerSignedArtistFileUpload(contract)}
                            disabled={uploadingContractId === contract.id}
                            className={`
                              min-w-[180px] px-3 py-1.5 text-sm font-medium rounded-lg flex items-center justify-center gap-2 transition-colors
                              ${uploadingContractId === contract.id
                                ? 'bg-gray-100 text-gray-400 cursor-wait'
                                : 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50'
                              }
                            `}
                            title="Uploader le contrat signé par l'artiste"
                          >
                            <Upload className="w-4 h-4" />
                            {uploadingContractId === contract.id ? 'Upload...' : 'Uploader signé artiste'}
                          </button>
                        )}
                        
                        {/* Bouton voir - visible si le contrat a un PDF */}
                        {!contract.virtual && contract.original_file_url && (
                          <button
                            onClick={() => handleView(contract)}
                            className="p-1.5 text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 transition-colors"
                            title="Voir le contrat"
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ));
                }}
              </EventDaysContainer>
            </div>

{/* Liste des contrats supprimée - affichage uniquement par jour */}
          </>
        )}
      </div>

      {/* Modals */}
      <ContractForm
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateContract}
      />

      {selectedContract && showViewModal && (
        <ContractViewModal
          contract={selectedContract}
          isOpen={showViewModal}
          onClose={() => {
            setShowViewModal(false);
            setSelectedContract(null);
          }}
        />
      )}

      {selectedContract && showUploadModal && (
        <Modal
          open={showUploadModal}
          onClose={() => {
            setShowUploadModal(false);
            setSelectedContract(null);
          }}
          title={`Upload PDF - ${selectedContract.contract_title}`}
          size="lg"
        >
          <AnnotatedPdfUploader
            contract={selectedContract}
            onUploadSuccess={() => {
              fetchContracts();
              setShowUploadModal(false);
              setSelectedContract(null);
            }}
            onUploadError={(error) => setError(error)}
          />
        </Modal>
      )}

      {selectedContract && showSignatureEmailModal && (
        <SignatureEmailModal
          isOpen={showSignatureEmailModal}
          onClose={() => {
            setShowSignatureEmailModal(false);
            setSelectedContract(null);
          }}
          onSend={async (data) => {
            console.log('Envoi email signature interne:', data);
            alert('Fonctionnalité EmailJS à intégrer');
          }}
          contract={selectedContract}
          defaultEmail={selectedContract.management_email}
        />
      )}

      {selectedContract && showExternalEmailModal && (
        <ExternalSignatureModal
          isOpen={showExternalEmailModal}
          onClose={() => {
            setShowExternalEmailModal(false);
            setSelectedContract(null);
          }}
          onSend={async (data) => {
            console.log('Envoi email signature externe:', data);
            alert('Fonctionnalité EmailJS à intégrer');
          }}
          contract={selectedContract}
          defaultEmail={selectedContract.external_email}
          pdfAttachment={selectedContract.signed_file_url}
        />
      )}

      {/* Modal d'envoi pour signature interne */}
      {selectedContract && showSendForSignatureModal && (
        <SendContractForSignatureModal
          open={showSendForSignatureModal}
          onClose={() => {
            setShowSendForSignatureModal(false);
            setSelectedContract(null);
          }}
          contract={selectedContract}
          onSuccess={() => {
            fetchContracts();
          }}
        />
      )}

      {/* Modal d'envoi à l'artiste pour signature */}
      {selectedContract && showSendToArtistModal && (
        <SendContractToArtistModal
          open={showSendToArtistModal}
          onClose={() => {
            setShowSendToArtistModal(false);
            setSelectedContract(null);
          }}
          contract={selectedContract}
          onSuccess={() => {
            fetchContracts();
          }}
        />
      )}
    </div>
  );
}
