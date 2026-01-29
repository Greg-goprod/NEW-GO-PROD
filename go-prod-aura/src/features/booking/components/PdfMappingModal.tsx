import { useState, useEffect, useCallback, useRef } from 'react';
import { X, Upload, FileText, Check, ChevronDown, Search, AlertCircle, Loader2 } from 'lucide-react';
import { PDFDocument } from 'pdf-lib';
import { Button } from '@/components/aura/Button';
import { Input } from '@/components/aura/Input';
import { OFFER_TEMPLATE_FIELDS } from '../offerTemplateConstants';

interface PdfMappingModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (file: File, mapping: Record<string, string>) => Promise<void>;
  initialMapping?: Record<string, string>;
  existingFileName?: string;
}

interface PdfField {
  name: string;
  type: string;
  mappedTo: string;
}

// Grouper les champs disponibles par categorie
const FIELD_GROUPS = [
  {
    id: 'base',
    label: 'Donnees de base',
    fields: ['event_name', 'artist_name', 'stage_name', 'performance_date_long', 'performance_date_iso', 'performance_time', 'duration_minutes', 'validity_date'],
  },
  {
    id: 'financial',
    label: 'Financier',
    fields: ['amount_display', 'amount_net', 'amount_gross', 'currency', 'amount_is_net_label', 'agency_commission_pct', 'prod_fee_amount', 'backline_fee_amount', 'buyout_hotel_amount', 'buyout_meal_amount', 'flight_contribution_amount', 'technical_fee_amount'],
  },
  {
    id: 'extras',
    label: 'Extras & Clauses',
    fields: ['notes', 'extras_summary', 'clauses_summary', 'offer_id', 'company_id'],
  },
];

export function PdfMappingModal({
  open,
  onClose,
  onSave,
  initialMapping = {},
  existingFileName,
}: PdfMappingModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [pdfFields, setPdfFields] = useState<PdfField[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropdownRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Fermer le dropdown quand on clique ailleurs
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (activeDropdown) {
        const dropdownEl = dropdownRefs.current[activeDropdown];
        if (dropdownEl && !dropdownEl.contains(event.target as Node)) {
          setActiveDropdown(null);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activeDropdown]);

  // Reset quand le modal s'ouvre/ferme
  useEffect(() => {
    if (!open) {
      setFile(null);
      setPdfFields([]);
      setError(null);
      setSearchTerm('');
      setActiveDropdown(null);
    }
  }, [open]);

  // Extraire les champs du PDF
  const extractPdfFields = useCallback(async (pdfFile: File) => {
    setLoading(true);
    setError(null);
    
    try {
      const arrayBuffer = await pdfFile.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      const form = pdfDoc.getForm();
      const fields = form.getFields();
      
      if (fields.length === 0) {
        setError("Ce PDF ne contient pas de champs de formulaire. Veuillez utiliser un PDF interactif avec des champs editables.");
        setPdfFields([]);
        return;
      }

      const extractedFields: PdfField[] = fields.map((field) => {
        const name = field.getName();
        const type = field.constructor.name.replace(/\d+$/, ''); // Normaliser PDFTextField2 -> PDFTextField
        return {
          name,
          type,
          mappedTo: initialMapping[name] || '',
        };
      });

      setPdfFields(extractedFields);
    } catch (err) {
      console.error('Erreur extraction PDF:', err);
      setError("Impossible de lire ce fichier PDF. Verifiez qu'il s'agit d'un PDF valide.");
      setPdfFields([]);
    } finally {
      setLoading(false);
    }
  }, [initialMapping]);

  // Gerer le drop de fichier
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type === 'application/pdf') {
      setFile(droppedFile);
      extractPdfFields(droppedFile);
    } else {
      setError("Veuillez deposer un fichier PDF.");
    }
  }, [extractPdfFields]);

  // Gerer la selection de fichier
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
      extractPdfFields(selectedFile);
    } else if (selectedFile) {
      setError("Veuillez selectionner un fichier PDF.");
    }
  }, [extractPdfFields]);

  // Mettre a jour le mapping d'un champ
  const updateFieldMapping = useCallback((fieldName: string, mappedValue: string) => {
    setPdfFields(prev => 
      prev.map(f => f.name === fieldName ? { ...f, mappedTo: mappedValue } : f)
    );
    setActiveDropdown(null);
  }, []);

  // Sauvegarder
  const handleSave = async () => {
    if (!file) return;
    
    setSaving(true);
    try {
      const mapping: Record<string, string> = {};
      pdfFields.forEach(f => {
        if (f.mappedTo) {
          mapping[f.name] = f.mappedTo;
        }
      });
      
      await onSave(file, mapping);
      onClose();
    } catch (err) {
      console.error('Erreur sauvegarde:', err);
      setError("Erreur lors de la sauvegarde. Veuillez reessayer.");
    } finally {
      setSaving(false);
    }
  };

  // Filtrer les champs selon la recherche
  const filteredFields = pdfFields.filter(f => 
    f.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Compter les champs mappes
  const mappedCount = pdfFields.filter(f => f.mappedTo).length;

  // Obtenir le label d'un champ mappe
  const getMappedLabel = (value: string) => {
    return OFFER_TEMPLATE_FIELDS.find(f => f.value === value)?.label || value;
  };

  // Obtenir l'icone du type de champ
  const getFieldTypeIcon = (type: string) => {
    switch (type) {
      case 'PDFTextField':
        return <span className="text-blue-500 text-xs font-mono">Txt</span>;
      case 'PDFCheckBox':
        return <span className="text-green-500 text-xs font-mono">Chk</span>;
      case 'PDFDropdown':
        return <span className="text-purple-500 text-xs font-mono">Sel</span>;
      default:
        return <span className="text-gray-500 text-xs font-mono">?</span>;
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col m-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Configuration du modele PDF
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Uploadez votre PDF et mappez les champs avec les donnees de l'offre
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Zone de drop si pas de fichier */}
          {!file && !loading && (
            <div
              className={`
                border-2 border-dashed rounded-xl p-12 text-center transition-all cursor-pointer
                ${isDragOver 
                  ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20' 
                  : 'border-gray-300 dark:border-gray-600 hover:border-violet-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                }
              `}
              onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Upload className={`w-16 h-16 mx-auto mb-4 ${isDragOver ? 'text-violet-500' : 'text-gray-400'}`} />
              <p className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Glissez-deposez votre PDF ici
              </p>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                ou cliquez pour selectionner un fichier
              </p>
              <p className="text-xs text-gray-400">
                PDF interactif avec champs de formulaire requis (max 10 Mo)
              </p>
              {existingFileName && (
                <p className="mt-4 text-sm text-violet-600 dark:text-violet-400">
                  Fichier actuel : {existingFileName}
                </p>
              )}
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="w-12 h-12 text-violet-500 animate-spin mb-4" />
              <p className="text-gray-600 dark:text-gray-400">Analyse du PDF en cours...</p>
            </div>
          )}

          {/* Erreur */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-red-800 dark:text-red-200 font-medium">Erreur</p>
                <p className="text-red-600 dark:text-red-300 text-sm">{error}</p>
              </div>
            </div>
          )}

          {/* Liste des champs */}
          {file && pdfFields.length > 0 && !loading && (
            <div className="space-y-4">
              {/* Info fichier */}
              <div className="flex items-center gap-3 p-4 bg-violet-50 dark:bg-violet-900/20 rounded-lg">
                <FileText className="w-10 h-10 text-violet-500" />
                <div className="flex-1">
                  <p className="font-semibold text-gray-900 dark:text-white">{file.name}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {pdfFields.length} champs detectes - {mappedCount} mappes
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setFile(null);
                    setPdfFields([]);
                  }}
                >
                  Changer
                </Button>
              </div>

              {/* Barre de recherche */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Rechercher un champ..."
                  className="pl-10"
                />
              </div>

              {/* Grille des champs */}
              <div className="grid gap-3 max-h-[400px] overflow-y-auto pr-2">
                {filteredFields.map((field) => (
                  <div
                    key={field.name}
                    className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-violet-300 dark:hover:border-violet-600 transition-colors"
                  >
                    {/* Type icon */}
                    <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                      {getFieldTypeIcon(field.type)}
                    </div>

                    {/* Nom du champ PDF */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 dark:text-white truncate" title={field.name}>
                        {field.name}
                      </p>
                      <p className="text-xs text-gray-500">{field.type.replace('PDF', '')}</p>
                    </div>

                    {/* Fleche */}
                    <div className="text-gray-400">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                      </svg>
                    </div>

                    {/* Dropdown de mapping */}
                    <div 
                      className="relative w-56"
                      ref={(el) => { dropdownRefs.current[field.name] = el; }}
                    >
                      <button
                        onClick={() => setActiveDropdown(activeDropdown === field.name ? null : field.name)}
                        className={`
                          w-full flex items-center justify-between px-3 py-2 rounded-lg border text-sm transition-colors
                          ${field.mappedTo 
                            ? 'bg-violet-50 dark:bg-violet-900/30 border-violet-300 dark:border-violet-600 text-violet-700 dark:text-violet-300' 
                            : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-500'
                          }
                          hover:border-violet-400
                        `}
                      >
                        <span className="truncate">
                          {field.mappedTo ? getMappedLabel(field.mappedTo) : 'Choisir...'}
                        </span>
                        <ChevronDown className={`w-4 h-4 ml-2 transition-transform ${activeDropdown === field.name ? 'rotate-180' : ''}`} />
                      </button>

                      {/* Dropdown menu */}
                      {activeDropdown === field.name && (
                        <div className="absolute z-50 mt-1 w-72 right-0 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 max-h-64 overflow-y-auto">
                          {/* Option vide */}
                          <button
                            onClick={() => updateFieldMapping(field.name, '')}
                            className="w-full px-4 py-2 text-left text-sm text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                          >
                            <span className="w-4 h-4" />
                            Non mappe
                          </button>
                          
                          {/* Groupes de champs */}
                          {FIELD_GROUPS.map((group) => (
                            <div key={group.id}>
                              <div className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider bg-gray-50 dark:bg-gray-900/50">
                                {group.label}
                              </div>
                              {group.fields.map((fieldValue) => {
                                const fieldDef = OFFER_TEMPLATE_FIELDS.find(f => f.value === fieldValue);
                                if (!fieldDef) return null;
                                const isSelected = field.mappedTo === fieldValue;
                                return (
                                  <button
                                    key={fieldValue}
                                    onClick={() => updateFieldMapping(field.name, fieldValue)}
                                    className={`
                                      w-full px-4 py-2 text-left text-sm flex items-center gap-2 transition-colors
                                      ${isSelected 
                                        ? 'bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300' 
                                        : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                                      }
                                    `}
                                  >
                                    {isSelected ? (
                                      <Check className="w-4 h-4 text-violet-500" />
                                    ) : (
                                      <span className="w-4 h-4" />
                                    )}
                                    {fieldDef.label}
                                  </button>
                                );
                              })}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {filteredFields.length === 0 && searchTerm && (
                <p className="text-center text-gray-500 py-8">
                  Aucun champ ne correspond a "{searchTerm}"
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {pdfFields.length > 0 && (
              <span>
                {mappedCount}/{pdfFields.length} champs mappes
              </span>
            )}
          </div>
          <div className="flex gap-3">
            <Button variant="ghost" onClick={onClose}>
              Annuler
            </Button>
            <Button
              variant="primary"
              onClick={handleSave}
              disabled={!file || pdfFields.length === 0 || saving}
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sauvegarde...
                </>
              ) : (
                'Enregistrer le mapping'
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
