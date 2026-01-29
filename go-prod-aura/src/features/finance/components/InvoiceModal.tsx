/**
 * Modal de création/édition de facture
 * Avec zone de drag & drop pour upload PDF
 * Et extraction automatique des données via IA (Gemini)
 * 
 * V2: Detection fournisseur + proposition creation/mise a jour entreprise
 */

import { useState, useEffect, useCallback } from 'react';
import { Upload, X, FileText, Loader2, Sparkles, CheckCircle, AlertCircle, Building2, UserPlus, RefreshCw } from 'lucide-react';
import { Modal } from '@/components/aura/Modal';
import { Button } from '@/components/aura/Button';
import { Input } from '@/components/aura/Input';
import { DatePickerPopup } from '@/components/ui/pickers/DatePickerPopup';
import type {
  Invoice,
  InvoiceFormData,
  FinanceSelectOptions,
  CurrencyCode,
  InvoiceStatus,
} from '../financeTypes';
import { CURRENCIES, INVOICE_STATUS_LABELS } from '../financeTypes';
import { extractInvoiceData, isFileSupported, type ExtractedInvoiceData, type SupplierData } from '../invoiceExtractApi';
import { mapSupplierToCompanyForm, type CompanyFormData } from '../supplierDataMapper';

// Type pour le resultat de detection fournisseur
interface SupplierDetectionResult {
  type: 'matched' | 'new' | 'none';
  matchedSupplier?: { id: string; name: string };
  extractedData?: SupplierData;
  hasUpdates?: boolean;  // Si des champs peuvent etre mis a jour
  updatableFields?: string[];  // Liste des champs avec nouvelles donnees
}

interface InvoiceModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: InvoiceFormData, file?: File | null) => Promise<void>;
  invoice?: Invoice | null;
  options: FinanceSelectOptions | null;
  defaultArtistId?: string | null;
  // Données pré-remplies pour créer une facture à partir d'une offre virtuelle
  prefillData?: {
    booking_id?: string;
    artist_id?: string;
    amount_incl?: number;
    currency?: string;
  } | null;
  // Callback pour ouvrir le modal "Nouvelle societe" avec donnees pre-remplies
  // Recoit les donnees deja mappees au format CompanyFormData
  onCreateSupplier?: (formData: CompanyFormData, rawData: SupplierData) => void;
  // Callback pour ouvrir le modal de mise a jour d'un fournisseur existant
  onUpdateSupplier?: (supplierId: string, formData: CompanyFormData, rawData: SupplierData) => void;
  // ID du fournisseur a selectionner (apres creation d'une entreprise)
  newSupplierId?: string | null;
}

/**
 * Zone de drag & drop pour fichier PDF/Image avec extraction IA
 */
function FileDropZone({
  file,
  onFileSelect,
  onFileClear,
  existingFile,
  onExtractWithAI,
  extracting,
  extractionStatus,
}: {
  file: File | null;
  onFileSelect: (file: File) => void;
  onFileClear: () => void;
  existingFile?: boolean;
  onExtractWithAI?: () => void;
  extracting?: boolean;
  extractionStatus?: 'idle' | 'success' | 'error';
}) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) {
        const validation = isFileSupported(droppedFile);
        if (validation.valid) {
          onFileSelect(droppedFile);
        }
      }
    },
    [onFileSelect]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0];
      if (selectedFile) {
        onFileSelect(selectedFile);
      }
    },
    [onFileSelect]
  );

  if (file) {
    return (
      <div className="space-y-2">
        <div 
          className="flex items-center gap-3 p-3 rounded-lg"
          style={{
            background: 'var(--color-bg-surface)',
            border: '1px solid var(--color-border)',
          }}
        >
          <FileText className="w-8 h-8" style={{ color: 'var(--color-primary)' }} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>{file.name}</p>
            <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              {(file.size / 1024 / 1024).toFixed(2)} MB
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onFileClear} disabled={extracting}>
            <X className="w-4 h-4" />
          </Button>
        </div>
        
        {/* Bouton extraction IA */}
        {onExtractWithAI && (
          <Button
            type="button"
            variant={
              extractionStatus === 'success' 
                ? 'success' 
                : extractionStatus === 'error'
                ? 'danger'
                : 'primary'
            }
            onClick={onExtractWithAI}
            disabled={extracting}
            className="w-full"
          >
            {extracting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analyse en cours...
              </>
            ) : extractionStatus === 'success' ? (
              'Donnees extraites'
            ) : extractionStatus === 'error' ? (
              'Reessayer l\'analyse'
            ) : (
              'ANALYSER LA FACTURE'
            )}
          </Button>
        )}
      </div>
    );
  }

  return (
    <div
      className="relative rounded-lg p-6 text-center transition-colors"
      style={{
        border: isDragging 
          ? '2px dashed var(--color-primary)' 
          : '2px dashed var(--color-border)',
        background: isDragging 
          ? 'rgba(139, 92, 246, 0.1)' 
          : 'transparent',
      }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,.webp"
        onChange={handleFileInput}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
      />
      <Upload className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--color-text-secondary)' }} />
      <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
        Glissez un fichier ici ou <span style={{ color: 'var(--color-primary)' }}>parcourir</span>
      </p>
      <p className="text-xs mt-1" style={{ color: 'var(--color-text-tertiary)' }}>
        PDF, JPEG, PNG (max 20MB)
      </p>
      {existingFile && (
        <p className="text-xs mt-1" style={{ color: 'var(--color-text-tertiary)' }}>
          Un fichier existe deja (sera remplace)
        </p>
      )}
    </div>
  );
}

/**
 * Composant d'alerte pour la detection fournisseur
 * Affiche clairement si c'est un nouveau fournisseur a creer ou un existant a completer
 */
function SupplierDetectionAlert({
  detection,
  onCreateSupplier,
  onUpdateSupplier,
  onDismiss,
}: {
  detection: SupplierDetectionResult;
  onCreateSupplier?: () => void;
  onUpdateSupplier?: () => void;
  onDismiss: () => void;
}) {
  if (detection.type === 'none') return null;

  // === CAS 1: NOUVEAU FOURNISSEUR A CREER ===
  if (detection.type === 'new' && detection.extractedData) {
    return (
      <div 
        className="p-4 rounded-lg"
        style={{ 
          background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(139, 92, 246, 0.15))',
          border: '2px solid rgba(59, 130, 246, 0.4)' 
        }}
      >
        {/* Header avec badge */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div 
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(59, 130, 246, 0.2)' }}
            >
              <UserPlus className="w-4 h-4 text-blue-500" />
            </div>
            <div>
              <span 
                className="inline-block px-2 py-0.5 text-xs font-semibold rounded-full"
                style={{ background: 'rgba(59, 130, 246, 0.3)', color: '#3b82f6' }}
              >
                NOUVEAU FOURNISSEUR
              </span>
            </div>
          </div>
          <button 
            onClick={onDismiss} 
            className="p-1.5 hover:bg-black/10 dark:hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" style={{ color: 'var(--color-text-secondary)' }} />
          </button>
        </div>

        {/* Contenu */}
        <div className="mb-3">
          <p className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            {detection.extractedData.company_name}
          </p>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
            {[
              detection.extractedData.city,
              detection.extractedData.country
            ].filter(Boolean).join(', ') || 'Adresse non detectee'}
          </p>
          {detection.extractedData.vat_number && (
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-tertiary)' }}>
              TVA: {detection.extractedData.vat_number}
            </p>
          )}
        </div>

        {/* Message explicatif */}
        <p className="text-xs mb-3" style={{ color: 'var(--color-text-secondary)' }}>
          Ce fournisseur n'existe pas encore dans votre base. Cliquez ci-dessous pour le creer avec les donnees extraites de la facture.
        </p>

        {/* Bouton action */}
        <Button
          type="button"
          onClick={onCreateSupplier}
          className="w-full"
          style={{
            background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
            border: 'none',
            color: 'white',
          }}
        >
          <Building2 className="w-4 h-4 mr-2" />
          Creer ce fournisseur
        </Button>
      </div>
    );
  }

  // === CAS 2: FOURNISSEUR EXISTANT AVEC DONNEES A COMPLETER ===
  if (detection.type === 'matched' && detection.matchedSupplier) {
    const hasUpdates = detection.updatableFields && detection.updatableFields.length > 0;
    
    return (
      <div 
        className="p-4 rounded-lg"
        style={{ 
          background: hasUpdates 
            ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.15), rgba(16, 185, 129, 0.15))'
            : 'rgba(34, 197, 94, 0.1)',
          border: hasUpdates 
            ? '2px solid rgba(34, 197, 94, 0.4)' 
            : '1px solid rgba(34, 197, 94, 0.3)'
        }}
      >
        {/* Header avec badge */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div 
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(34, 197, 94, 0.2)' }}
            >
              <CheckCircle className="w-4 h-4 text-green-500" />
            </div>
            <div>
              <span 
                className="inline-block px-2 py-0.5 text-xs font-semibold rounded-full"
                style={{ background: 'rgba(34, 197, 94, 0.3)', color: '#22c55e' }}
              >
                FOURNISSEUR EXISTANT
              </span>
            </div>
          </div>
          <button 
            onClick={onDismiss} 
            className="p-1.5 hover:bg-black/10 dark:hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" style={{ color: 'var(--color-text-secondary)' }} />
          </button>
        </div>

        {/* Contenu */}
        <div className="mb-3">
          <p className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            {detection.matchedSupplier.name}
          </p>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
            Ce fournisseur a ete automatiquement selectionne.
          </p>
        </div>

        {/* Liste des champs a completer */}
        {hasUpdates && (
          <>
            <div 
              className="p-2 rounded-lg mb-3"
              style={{ background: 'rgba(34, 197, 94, 0.1)' }}
            >
              <p className="text-xs font-medium mb-1" style={{ color: '#22c55e' }}>
                Nouvelles donnees detectees sur la facture:
              </p>
              <div className="flex flex-wrap gap-1">
                {detection.updatableFields!.map((field, index) => (
                  <span 
                    key={index}
                    className="inline-block px-2 py-0.5 text-xs rounded"
                    style={{ 
                      background: 'rgba(34, 197, 94, 0.2)', 
                      color: 'var(--color-text-primary)' 
                    }}
                  >
                    {field}
                  </span>
                ))}
              </div>
            </div>

            {/* Message explicatif */}
            <p className="text-xs mb-3" style={{ color: 'var(--color-text-secondary)' }}>
              Vous pouvez enrichir la fiche de ce fournisseur avec les nouvelles informations extraites de la facture.
            </p>

            {/* Bouton action */}
            <Button
              type="button"
              onClick={onUpdateSupplier}
              className="w-full"
              style={{
                background: 'linear-gradient(135deg, #22c55e, #10b981)',
                border: 'none',
                color: 'white',
              }}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Completer les donnees du fournisseur
            </Button>
          </>
        )}
      </div>
    );
  }

  return null;
}

/**
 * Composant principal de la modal
 */
export function InvoiceModal({
  open,
  onClose,
  onSubmit,
  invoice,
  options,
  defaultArtistId,
  prefillData,
  onCreateSupplier,
  onUpdateSupplier,
  newSupplierId,
}: InvoiceModalProps) {
  const isEdit = !!invoice;

  // État du formulaire
  const [formData, setFormData] = useState<InvoiceFormData>({
    supplier_id: '',
    reference: '',
    amount_excl: null,
    amount_incl: 0,
    currency: 'EUR',
    due_date: new Date().toISOString().split('T')[0],
    tax_treatment: 'net',
    artist_id: null,
    booking_id: null,
    category_id: null,
    notes: null,
    status: 'to_receive',
  });

  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Etats pour l'extraction IA
  const [extracting, setExtracting] = useState(false);
  const [extractionStatus, setExtractionStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [extractionNotes, setExtractionNotes] = useState<string | null>(null);
  
  // Etat pour la detection de fournisseur
  const [supplierDetection, setSupplierDetection] = useState<SupplierDetectionResult>({ type: 'none' });
  const [extractedSupplierData, setExtractedSupplierData] = useState<SupplierData | null>(null);

  // Initialiser le formulaire
  useEffect(() => {
    if (open) {
      if (invoice) {
        setFormData({
          supplier_id: invoice.supplier_id,
          reference: invoice.reference,
          amount_excl: invoice.amount_excl ?? null,
          amount_incl: invoice.amount_incl,
          currency: invoice.currency,
          due_date: invoice.due_date,
          tax_treatment: invoice.tax_treatment,
          artist_id: invoice.artist_id ?? null,
          booking_id: invoice.booking_id ?? null,
          category_id: invoice.category_id ?? null,
          notes: invoice.notes ?? null,
          status: invoice.status,
        });
      } else if (prefillData) {
        // Création à partir d'une offre virtuelle
        setFormData({
          supplier_id: '',
          reference: '',
          amount_excl: null,
          amount_incl: prefillData.amount_incl || 0,
          currency: (prefillData.currency as any) || 'EUR',
          due_date: new Date().toISOString().split('T')[0],
          tax_treatment: 'net',
          artist_id: prefillData.artist_id ?? null,
          booking_id: prefillData.booking_id ?? null,
          category_id: null,
          notes: null,
          status: 'to_pay', // Passe à "À payer" puisqu'on crée la vraie facture
        });
      } else {
        setFormData({
          supplier_id: '',
          reference: '',
          amount_excl: null,
          amount_incl: 0,
          currency: 'EUR',
          due_date: new Date().toISOString().split('T')[0],
          tax_treatment: 'net',
          artist_id: defaultArtistId ?? null,
          booking_id: null,
          category_id: null,
          notes: null,
          status: 'to_receive',
        });
      }
      setFile(null);
      setErrors({});
      setExtractionStatus('idle');
      setExtractionNotes(null);
      setSupplierDetection({ type: 'none' });
      setExtractedSupplierData(null);
    }
  }, [open, invoice, defaultArtistId, prefillData]);

  // Mettre a jour le fournisseur selectionne quand une entreprise est creee
  useEffect(() => {
    if (newSupplierId && open) {
      setFormData((prev) => ({ ...prev, supplier_id: newSupplierId }));
      // Fermer l'alerte de detection si elle etait ouverte
      setSupplierDetection({ type: 'none' });
    }
  }, [newSupplierId, open]);

  /**
   * Fonction de matching fuzzy pour trouver un fournisseur existant
   */
  const findMatchingSupplier = useCallback((supplierName: string | null) => {
    if (!supplierName || !options?.suppliers) return null;
    
    const normalizedName = supplierName.toLowerCase().trim();
    
    // Recherche exacte d'abord
    const exactMatch = options.suppliers.find(
      s => s.name.toLowerCase().trim() === normalizedName
    );
    if (exactMatch) return exactMatch;
    
    // Recherche par mots cles principaux (ignore les formes juridiques)
    const legalForms = ['sa', 'sarl', 'sas', 'eurl', 'gmbh', 'ag', 'ltd', 'inc', 'llc', 'bv', 'nv', 'oy', 'ab', 'productions', 'production', 'prod'];
    const extractWords = (name: string) => 
      name.toLowerCase()
        .split(/[\s,.-]+/)
        .filter(w => w.length > 3 && !legalForms.includes(w)); // Augmente de 2 a 3 caracteres minimum
    
    const searchWords = extractWords(normalizedName);
    
    if (searchWords.length === 0) return null;
    
    const wordMatch = options.suppliers.find(s => {
      const supplierWords = extractWords(s.name);
      
      // Au moins 70% des mots significatifs doivent matcher (augmente de 50% a 70%)
      const matchCount = searchWords.filter(w => 
        supplierWords.some(sw => {
          // Match exact ou l'un contient l'autre avec au moins 80% de similarite
          if (sw === w) return true;
          const longer = sw.length > w.length ? sw : w;
          const shorter = sw.length > w.length ? w : sw;
          return longer.includes(shorter) && (shorter.length / longer.length) >= 0.8;
        })
      ).length;
      
      return matchCount >= Math.ceil(searchWords.length * 0.7);
    });
    
    return wordMatch || null;
  }, [options?.suppliers]);

  /**
   * Determiner quels champs pourraient etre mis a jour pour un fournisseur existant
   */
  const getUpdatableFields = useCallback((extractedData: SupplierData): string[] => {
    const fields: string[] = [];
    
    // On liste les champs avec des donnees extraites qui pourraient enrichir le fournisseur
    if (extractedData.email) fields.push('Email');
    if (extractedData.phone) fields.push('Telephone');
    if (extractedData.website) fields.push('Site web');
    if (extractedData.vat_number) fields.push('N TVA');
    if (extractedData.banking?.iban) fields.push('IBAN');
    if (extractedData.banking?.swift_bic) fields.push('BIC/SWIFT');
    if (extractedData.banking?.bank_name) fields.push('Banque');
    if (extractedData.banking?.routing_number) fields.push('Routing Number');
    if (extractedData.banking?.sort_code) fields.push('Sort Code');
    if (extractedData.banking?.bsb_code) fields.push('BSB Code');
    if (extractedData.siret) fields.push('SIRET');
    if (extractedData.ide) fields.push('IDE');
    if (extractedData.ein) fields.push('EIN');
    if (extractedData.abn) fields.push('ABN');
    
    return fields;
  }, []);

  // Fonction d'extraction IA
  const handleExtractWithAI = async () => {
    if (!file) return;

    // Verifier si le fichier est supporte
    const validation = isFileSupported(file);
    if (!validation.valid) {
      setErrors({ extract: validation.error || 'Fichier non supporte' });
      return;
    }

    setExtracting(true);
    setExtractionStatus('idle');
    setExtractionNotes(null);
    setErrors({});
    setSupplierDetection({ type: 'none' });

    try {
      const result = await extractInvoiceData(file);

      if (!result.success || !result.data) {
        setExtractionStatus('error');
        setErrors({ extract: result.error || 'Erreur lors de l\'extraction' });
        return;
      }

      const data = result.data;

      // Pre-remplir les champs du formulaire avec les donnees extraites
      setFormData((prev) => ({
        ...prev,
        // Reference
        reference: data.invoice_number || prev.reference,
        // Montants
        amount_excl: data.amount_excl_tax ?? prev.amount_excl,
        amount_incl: data.amount_incl_tax ?? prev.amount_incl,
        // Devise
        currency: (data.currency as CurrencyCode) || prev.currency,
        // Dates
        due_date: data.due_date || prev.due_date,
        // Notes - ajouter les notes d'extraction si presentes
        notes: data.extraction_notes 
          ? `${prev.notes ? prev.notes + '\n' : ''}[IA] ${data.extraction_notes}`
          : prev.notes,
      }));

      // Stocker les donnees fournisseur extraites
      const supplierData = data.supplier;
      setExtractedSupplierData(supplierData);

      // Detection et matching du fournisseur
      const supplierName = data.supplier_name || supplierData?.company_name;
      const matchedSupplier = findMatchingSupplier(supplierName);

      if (matchedSupplier) {
        // Fournisseur trouve - selectionner automatiquement
        setFormData((prev) => ({ ...prev, supplier_id: matchedSupplier.id }));
        
        // Verifier s'il y a des donnees a mettre a jour
        if (supplierData) {
          const updatableFields = getUpdatableFields(supplierData);
          setSupplierDetection({
            type: 'matched',
            matchedSupplier: { id: matchedSupplier.id, name: matchedSupplier.name },
            extractedData: supplierData,
            hasUpdates: updatableFields.length > 0,
            updatableFields,
          });
        }
      } else if (supplierData?.company_name) {
        // Nouveau fournisseur detecte
        setSupplierDetection({
          type: 'new',
          extractedData: supplierData,
        });
      }

      setExtractionStatus('success');
      
      // Message de succes enrichi
      const countryInfo = data.detected_country ? ` (${data.detected_country})` : '';
      const bankingInfo = supplierData?.banking?.iban ? ' - IBAN detecte' : 
                         supplierData?.banking?.routing_number ? ' - Routing detecte' : '';
      
      setExtractionNotes(
        `Extraction reussie (confiance: ${data.confidence_score}%)` +
        (supplierName ? ` - ${supplierName}${countryInfo}` : '') +
        bankingInfo
      );

    } catch (error: any) {
      console.error('[InvoiceModal] Erreur extraction:', error);
      setExtractionStatus('error');
      setErrors({ extract: error.message || 'Erreur inattendue' });
    } finally {
      setExtracting(false);
    }
  };

  // Handler pour creer un nouveau fournisseur
  const handleCreateSupplier = () => {
    console.log('[InvoiceModal] handleCreateSupplier appele', {
      hasExtractedData: !!extractedSupplierData,
      hasCallback: !!onCreateSupplier
    });
    
    if (extractedSupplierData) {
      // Passer la devise de la facture au mapper
      const companyFormData = mapSupplierToCompanyForm(extractedSupplierData, formData.currency);
      console.log('[InvoiceModal] Donnees mappees:', companyFormData);
      
      if (onCreateSupplier) {
        console.log('[InvoiceModal] Appel du callback onCreateSupplier');
        onCreateSupplier(companyFormData, extractedSupplierData);
      } else {
        console.warn('[InvoiceModal] Callback onCreateSupplier non defini');
        // Log pour debug avec les donnees mappees
        console.log('[InvoiceModal] Donnees fournisseur a creer:', {
          formData: companyFormData,
          rawData: extractedSupplierData
        });
        // Copier les donnees dans le presse-papier pour faciliter la creation manuelle
        navigator.clipboard?.writeText(JSON.stringify(companyFormData, null, 2));
      }
    } else {
      console.error('[InvoiceModal] Pas de donnees extraites disponibles');
    }
  };

  // Handler pour mettre a jour un fournisseur existant
  const handleUpdateSupplier = () => {
    if (extractedSupplierData && supplierDetection.matchedSupplier) {
      // Passer la devise de la facture au mapper
      const companyFormData = mapSupplierToCompanyForm(extractedSupplierData, formData.currency);
      if (onUpdateSupplier) {
        onUpdateSupplier(supplierDetection.matchedSupplier.id, companyFormData, extractedSupplierData);
      } else {
        // Log pour debug avec les donnees mappees
        console.log('[InvoiceModal] Donnees fournisseur a mettre a jour:', {
          id: supplierDetection.matchedSupplier.id,
          formData: companyFormData,
          rawData: extractedSupplierData,
        });
      }
    }
  };

  // Validation
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.supplier_id) {
      newErrors.supplier_id = 'Le fournisseur est requis';
    }
    if (!formData.reference.trim()) {
      newErrors.reference = 'La référence est requise';
    }
    if (!formData.amount_incl || formData.amount_incl <= 0) {
      newErrors.amount_incl = 'Le montant TTC doit être supérieur à 0';
    }
    if (!formData.due_date) {
      newErrors.due_date = "La date d'échéance est requise";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Soumission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setLoading(true);
    try {
      await onSubmit(formData, file);
      onClose();
    } catch (err: any) {
      setErrors({ submit: err.message || 'Erreur lors de la sauvegarde' });
    } finally {
      setLoading(false);
    }
  };

  // Mise à jour d'un champ
  const updateField = <K extends keyof InvoiceFormData>(
    field: K,
    value: InvoiceFormData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // Style pour les labels
  const labelStyle = { color: 'var(--color-text-primary)' };
  // Style pour les textes secondaires
  const secondaryTextStyle = { color: 'var(--color-text-secondary)' };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Modifier la facture' : 'Nouvelle facture'}
      size="lg"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" form="invoice-form" disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {isEdit ? 'Enregistrer' : 'Créer la facture'}
          </Button>
        </>
      }
    >
      <form id="invoice-form" onSubmit={handleSubmit} className="space-y-4">
        {/* Zone upload PDF avec extraction IA */}
        <div>
          <label className="block text-sm font-medium mb-2" style={labelStyle}>
            Fichier (PDF ou image)
          </label>
          <FileDropZone
            file={file}
            onFileSelect={(f) => {
              setFile(f);
              setExtractionStatus('idle');
              setExtractionNotes(null);
            }}
            onFileClear={() => {
              setFile(null);
              setExtractionStatus('idle');
              setExtractionNotes(null);
            }}
            existingFile={isEdit}
            onExtractWithAI={handleExtractWithAI}
            extracting={extracting}
            extractionStatus={extractionStatus}
          />
          
          {/* Message de succes extraction */}
          {extractionNotes && extractionStatus === 'success' && (
            <div 
              className="mt-2 p-2 rounded-lg flex items-start gap-2"
              style={{ 
                background: 'rgba(34, 197, 94, 0.1)', 
                border: '1px solid rgba(34, 197, 94, 0.3)' 
              }}
            >
              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-green-600 dark:text-green-400">{extractionNotes}</p>
            </div>
          )}
          
          {/* Erreur extraction */}
          {errors.extract && (
            <div 
              className="mt-2 p-2 rounded-lg flex items-start gap-2"
              style={{ 
                background: 'rgba(239, 68, 68, 0.1)', 
                border: '1px solid rgba(239, 68, 68, 0.3)' 
              }}
            >
              <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-red-600 dark:text-red-400">{errors.extract}</p>
            </div>
          )}
        </div>

        {/* Alerte detection fournisseur */}
        {supplierDetection.type !== 'none' && (
          <SupplierDetectionAlert
            detection={supplierDetection}
            onCreateSupplier={handleCreateSupplier}
            onUpdateSupplier={handleUpdateSupplier}
            onDismiss={() => setSupplierDetection({ type: 'none' })}
          />
        )}

        {/* Ligne 1: Fournisseur + Référence */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2" style={labelStyle}>
              Fournisseur *
            </label>
            <select
              value={formData.supplier_id}
              onChange={(e) => updateField('supplier_id', e.target.value)}
              className="input w-full"
            >
              <option value="">Selectionner...</option>
              {options?.suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            {errors.supplier_id && (
              <p className="text-sm text-red-500 mt-1">{errors.supplier_id}</p>
            )}
          </div>

          <Input
            label="Reference facture *"
            value={formData.reference}
            onChange={(e) => updateField('reference', e.target.value)}
            placeholder="Ex: FAC-2026-001"
            error={errors.reference}
          />
        </div>

        {/* Ligne 2: Montants + Devise */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input
            label="Montant HT"
            type="number"
            step="0.01"
            min="0"
            value={formData.amount_excl ?? ''}
            onChange={(e) =>
              updateField(
                'amount_excl',
                e.target.value ? parseFloat(e.target.value) : null
              )
            }
            placeholder="0.00"
          />

          <Input
            label="Montant TTC *"
            type="number"
            step="0.01"
            min="0"
            value={formData.amount_incl || ''}
            onChange={(e) =>
              updateField('amount_incl', parseFloat(e.target.value) || 0)
            }
            placeholder="0.00"
            error={errors.amount_incl}
          />

          <div>
            <label className="block text-sm font-medium mb-2" style={labelStyle}>
              Devise
            </label>
            <select
              value={formData.currency}
              onChange={(e) => updateField('currency', e.target.value as CurrencyCode)}
              className="input w-full"
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Ligne 3: Échéance + Statut */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <DatePickerPopup
            label="Date d'echeance *"
            value={formData.due_date ? new Date(formData.due_date) : null}
            onChange={(date) => updateField('due_date', date ? date.toISOString().split('T')[0] : '')}
            error={errors.due_date}
          />

          <div>
            <label className="block text-sm font-medium mb-2" style={labelStyle}>
              Statut
            </label>
            <select
              value={formData.status || 'to_receive'}
              onChange={(e) =>
                updateField('status', e.target.value as InvoiceStatus)
              }
              className="input w-full"
            >
              <option value="to_receive">{INVOICE_STATUS_LABELS.to_receive}</option>
              <option value="to_pay">{INVOICE_STATUS_LABELS.to_pay}</option>
              <option value="canceled">{INVOICE_STATUS_LABELS.canceled}</option>
            </select>
            <p className="text-xs mt-1" style={secondaryTextStyle}>
              Partiel/Payee sont automatiques
            </p>
          </div>
        </div>

        {/* Ligne 4: Artiste + Catégorie */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2" style={labelStyle}>
              Artiste
            </label>
            <select
              value={formData.artist_id ?? ''}
              onChange={(e) =>
                updateField('artist_id', e.target.value || null)
              }
              className="input w-full"
            >
              <option value="">Aucun</option>
              {options?.artists.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={labelStyle}>
              Categorie
            </label>
            <select
              value={formData.category_id ?? ''}
              onChange={(e) =>
                updateField('category_id', e.target.value || null)
              }
              className="input w-full"
            >
              <option value="">Aucune</option>
              {options?.categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium mb-2" style={labelStyle}>
            Notes
          </label>
          <textarea
            value={formData.notes ?? ''}
            onChange={(e) => updateField('notes', e.target.value || null)}
            rows={3}
            className="input w-full resize-none"
            placeholder="Notes internes..."
          />
        </div>

        {/* Erreur générale */}
        {errors.submit && (
          <div className="p-3 rounded-lg" style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.5)' }}>
            <p className="text-sm" style={{ color: 'var(--color-error, #ef4444)' }}>{errors.submit}</p>
          </div>
        )}
      </form>
    </Modal>
  );
}

export default InvoiceModal;
