import React, { useState, useEffect } from 'react';
import { FileText, Plus, Search, AlertCircle } from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';
import type { Contract, ContractStatus } from '../../../types/contracts';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import Modal from '../../../components/ui/Modal';
import { PageHeader } from '../../../components/aura/PageHeader';
// import { ContractsKanbanAura } from '../../../components/contracts/ContractsKanbanAura'; // TEMPORAIRE: Kanban supprimé
import { ContractsListView } from '../../../components/contracts/ContractsListView';
import { ContractForm } from '../../../components/contracts/ContractForm';
import type { ContractFormData } from '../../../components/contracts/ContractForm';
import { SignatureEmailModal } from '../../../components/contracts/SignatureEmailModal';
import { ExternalSignatureModal } from '../../../components/contracts/ExternalSignatureModal';
import { ContractPdfViewer } from '../../../components/contracts/ContractPdfViewer';
import { AnnotatedPdfUploader } from '../../../components/contracts/AnnotatedPdfUploader';

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
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);

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
          events (id, name)
        `)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      // Mapper les données
      const mappedContracts: Contract[] = (data || []).map((contract: any) => ({
        ...contract,
        artist_name: contract.artists?.name,
        event_name: contract.events?.name,
        history: contract.history || [],
      }));

      // Ajouter les cartes virtuelles depuis les offres acceptées sans contrat
      const { data: offers } = await supabase
        .from('offers')
        .select(`
          id,
          artist_id,
          event_id,
          contract_id,
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
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8 mb-6">
              <div className="text-center text-gray-500 dark:text-gray-400 mb-4">
                Vue Kanban temporairement désactivée
              </div>
              <div className="text-center text-sm text-gray-400 dark:text-gray-500">
                Un nouveau système de containers avec cards sera implémenté prochainement
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Liste des contrats
              </h2>
              <ContractsListView
                contracts={filteredContracts}
                onView={handleView}
                onUpload={handleUpload}
                onSendEmail={handleSendEmail}
                onDelete={handleDeleteContract}
              />
            </div>
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
        <Modal
          isOpen={showViewModal}
          onClose={() => {
            setShowViewModal(false);
            setSelectedContract(null);
          }}
          title={selectedContract.contract_title}
          size="xl"
        >
          {selectedContract.original_file_url || selectedContract.annotated_file_url || selectedContract.signed_file_url ? (
            <ContractPdfViewer
              pdfUrl={
                selectedContract.current_version === 'signed' && selectedContract.signed_file_url
                  ? selectedContract.signed_file_url
                  : selectedContract.current_version === 'annotated' && selectedContract.annotated_file_url
                  ? selectedContract.annotated_file_url
                  : selectedContract.original_file_url || ''
              }
              title={selectedContract.contract_title}
            />
          ) : (
            <div className="p-8 text-center">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-sm text-gray-500">Aucun PDF disponible</p>
            </div>
          )}
        </Modal>
      )}

      {selectedContract && showUploadModal && (
        <Modal
          isOpen={showUploadModal}
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
    </div>
  );
}
