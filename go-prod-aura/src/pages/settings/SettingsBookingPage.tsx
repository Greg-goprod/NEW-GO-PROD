import { useState, useEffect, useCallback, useRef, type ChangeEvent, type DragEvent } from 'react';
import { FileText, Calendar, Plus, Edit2, Trash2, GripVertical, UploadCloud, Download, Settings2, Truck, CreditCard, Save, Volume2, Bus, UtensilsCrossed, Image, Monitor, ShoppingBag, Receipt, Clock, FileType, ChevronDown } from 'lucide-react';
import { PDFDocument } from 'pdf-lib';
import { Card, CardHeader, CardBody } from '@/components/aura/Card';
import { Button } from '@/components/aura/Button';
import { Input } from '@/components/aura/Input';
import { useToast } from '@/components/aura/ToastProvider';
import { ConfirmDialog } from '@/components/aura/ConfirmDialog';
import { Accordion } from '@/components/ui/Accordion';
import { getCurrentCompanyId } from '@/lib/tenant';
import { supabase } from '@/lib/supabaseClient';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import {
  listOfferClauses, createOfferClause, updateOfferClause, deleteOfferClause,
  listExclusivityPresets, createExclusivityPreset, updateExclusivityPreset, deleteExclusivityPreset,
  type OfferClause, type ExclusivityPreset
} from "@/features/booking/advancedBookingApi";
import type { OfferTemplateRecord } from '@/features/booking/offerTemplateApi';
import { fetchOfferTemplate, upsertOfferTemplate, updateOfferTemplateMapping, deleteOfferTemplate } from '@/features/booking/offerTemplateApi';
import { OFFER_TEMPLATE_FIELDS, type OfferTemplateFieldKey } from '@/features/booking/offerTemplateConstants';
import { PdfMappingModal } from '@/features/booking/components/PdfMappingModal';
import { fetchOfferSettings, upsertOfferSettings, type OfferSettings } from '@/features/booking/offerSettingsApi';
import { EmailAttachmentsManager } from '@/features/booking/components/EmailAttachmentsManager';
import { SimpleHtmlEditor } from '@/components/ui/SimpleHtmlEditor';
import { Mail } from 'lucide-react';

// Composant pour un élément draggable Clause
function SortableClause({ 
  clause, 
  isEditing,
  editData,
  onEdit,
  onSave,
  onCancel,
  onDelete,
  onDataChange
}: {
  clause: OfferClause;
  isEditing: boolean;
  editData: { title: string; body: string };
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete: () => void;
  onDataChange: (data: { title: string; body: string }) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: clause.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || 'transform 200ms cubic-bezier(0.25, 1, 0.5, 1)',
    opacity: isDragging ? 0.3 : 1,
    zIndex: isDragging ? 0 : 'auto',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600"
    >
      {/* Poignée de drag */}
      <div 
        {...attributes} 
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
      >
        <GripVertical className="w-5 h-5" />
      </div>

      {isEditing ? (
        <>
          <Input
            value={editData.title}
            onChange={(e) => onDataChange({ ...editData, title: e.target.value })}
            className="flex-1"
            autoFocus
          />
          <Button size="sm" variant="primary" onClick={onSave}>
            ✓
          </Button>
          <Button size="sm" variant="secondary" onClick={onCancel}>
            ✗
          </Button>
        </>
      ) : (
        <>
          <span className="flex-1 text-sm text-gray-700 dark:text-gray-300">
            {clause.title}
          </span>
          <Button
            size="sm"
            variant="ghost"
            onClick={onEdit}
          >
            <Edit2 className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={onDelete}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </>
      )}
    </div>
  );
}

// Composant pour un élément draggable Exclusivity Preset
function SortableExclusivity({ 
  preset, 
  isEditing,
  editData,
  onEdit,
  onSave,
  onCancel,
  onDelete,
  onDataChange
}: {
  preset: ExclusivityPreset;
  isEditing: boolean;
  editData: { name: string; description: string };
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete: () => void;
  onDataChange: (data: { name: string; description: string }) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: preset.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || 'transform 200ms cubic-bezier(0.25, 1, 0.5, 1)',
    opacity: isDragging ? 0.3 : 1,
    zIndex: isDragging ? 0 : 'auto',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600"
    >
      {/* Poignée de drag */}
      <div 
        {...attributes} 
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
      >
        <GripVertical className="w-5 h-5" />
      </div>

      {isEditing ? (
        <>
          <Input
            value={editData.name}
            onChange={(e) => onDataChange({ ...editData, name: e.target.value })}
            className="flex-1"
            autoFocus
          />
          <Button size="sm" variant="primary" onClick={onSave}>
            ✓
          </Button>
          <Button size="sm" variant="secondary" onClick={onCancel}>
            ✗
          </Button>
        </>
      ) : (
        <>
          <span className="flex-1 text-sm text-gray-700 dark:text-gray-300">
            {preset.name}
          </span>
          <Button
            size="sm"
            variant="ghost"
            onClick={onEdit}
          >
            <Edit2 className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={onDelete}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </>
      )}
    </div>
  );
}

export function SettingsBookingPage() {
  const { success: toastSuccess, error: toastError } = useToast();
  const scrollPositionRef = useRef<number>(0);
  
  // Fonction pour obtenir le conteneur de scroll
  const getScrollContainer = useCallback(() => {
    return document.querySelector('[data-settings-scroll-container]') as HTMLElement | null;
  }, []);
  
  // Fonction pour sauvegarder la position de scroll
  const saveScrollPosition = useCallback(() => {
    const scrollContainer = getScrollContainer();
    if (scrollContainer) {
      scrollPositionRef.current = scrollContainer.scrollTop;
    }
  }, [getScrollContainer]);
  
  // Fonction pour restaurer la position de scroll
  const restoreScrollPosition = useCallback(() => {
    // Double requestAnimationFrame pour s'assurer que le DOM est mis à jour
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const scrollContainer = getScrollContainer();
        if (scrollContainer && scrollPositionRef.current > 0) {
          scrollContainer.scrollTop = scrollPositionRef.current;
        }
      });
    });
  }, [getScrollContainer]);
  
  const TEMPLATE_BUCKET =
    import.meta.env.VITE_SUPABASE_OFFER_TEMPLATE_BUCKET ||
    import.meta.env.VITE_SUPABASE_OFFER_PDF_BUCKET ||
    "word-templates";

  const [companyId, setCompanyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  // États pour les extras
  const [clauses, setClauses] = useState<OfferClause[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingClauseId, setEditingClauseId] = useState<string | null>(null);
  const [newClauseData, setNewClauseData] = useState({ title: '', body: '' });
  const [editClauseData, setEditClauseData] = useState({ title: '', body: '' });
  const [activeClause, setActiveClause] = useState<OfferClause | null>(null);
  
  // États pour les clauses d'exclusivité
  const [exclPresets, setExclPresets] = useState<ExclusivityPreset[]>([]);
  const [showAddExclForm, setShowAddExclForm] = useState(false);
  const [editingExclId, setEditingExclId] = useState<string | null>(null);
  const [newExclData, setNewExclData] = useState({ name: '', description: '' });
  const [editExclData, setEditExclData] = useState({ name: '', description: '' });
  const [activeExcl, setActiveExcl] = useState<ExclusivityPreset | null>(null);
  
  // États pour la confirmation de suppression
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: string; id: string; name: string } | null>(null);

  // États pour le template PDF
  const [templateConfig, setTemplateConfig] = useState<OfferTemplateRecord | null>(null);
  const [templateFields, setTemplateFields] = useState<string[]>([]);
  const [templateMapping, setTemplateMapping] = useState<Record<string, string>>({});
  const [uploadingTemplate, setUploadingTemplate] = useState(false);
  const [savingTemplateMapping, setSavingTemplateMapping] = useState(false);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showPdfMappingModal, setShowPdfMappingModal] = useState(false);

  // États pour les parametres d'offre (offer_settings)
  const [offerSettings, setOfferSettings] = useState<OfferSettings | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsForm, setSettingsForm] = useState({
    // Notes pour Extras et Exclusivite
    extras_note: '',
    exclusivity_note: '',
    // Transports
    transport_note: '',
    transport_content: '',
    // Paiements
    payment_note: '',
    payment_content: '',
    // Validite
    validity_text: '',
    // Clauses additionnelles
    stage_pa_lights: '',
    screens: '',
    merchandising: '',
    withholding_taxes: '',
    decibel_limit: '',
    tour_bus: '',
    catering_meals: '',
    artwork: '',
    // Corps HTML des emails d'offres
    email_body_html: '',
  });

const [clausesSortable, setClausesSortable] = useState(false);
const [exclusivitySortable, setExclusivitySortable] = useState(false);

// États pour les accordéons
const [accordionOffersOpen, setAccordionOffersOpen] = useState(true);
const [accordionMailsOpen, setAccordionMailsOpen] = useState(false);

const getNextSortOrder = (items: { sort_order?: number | null }[], enabled: boolean) => {
  if (!enabled) return undefined;
  if (!items.length) return 10;
  const maxOrder = Math.max(...items.map(item => item.sort_order ?? 0));
  return (maxOrder || 0) + 10;
};

  // Configuration du drag & drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Ne démarre le drag qu'après 8px de mouvement
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Récupération du company_id
  useEffect(() => {
    (async () => {
      try {
        const cid = await getCurrentCompanyId(supabase);
        setCompanyId(cid);
      } catch (e) {
        console.error('❌ Erreur récupération company_id:', e);
        toastError("Impossible de récupérer l'ID de l'entreprise");
      }
    })();
  }, [toastError]);

  // Chargement des données booking
  const loadBookingData = useCallback(async () => {
    if (!companyId) return;
    
    setLoading(true);
    try {
      const [clausesData, exclData] = await Promise.all([
        listOfferClauses(companyId),
        listExclusivityPresets(companyId),
      ]);
      
      setClauses(clausesData);
      setExclPresets(exclData);
      setClausesSortable(
        clausesData.length > 0 && Object.prototype.hasOwnProperty.call(clausesData[0], 'sort_order')
      );
      setExclusivitySortable(
        exclData.length > 0 && Object.prototype.hasOwnProperty.call(exclData[0], 'sort_order')
      );
    } catch (e: unknown) {
      const error = e as { message?: string };
      console.error("Erreur chargement:", e);
      toastError(error?.message || "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, [companyId, toastError]);

  useEffect(() => {
    loadBookingData();
  }, [loadBookingData]);

  const loadOfferTemplate = useCallback(async () => {
    if (!companyId) return;
    try {
      const template = await fetchOfferTemplate(companyId);
      setTemplateConfig(template);
      setTemplateFields(template?.detected_fields ?? []);
      setTemplateMapping(template?.fields_mapping ?? {});
    } catch (e) {
      console.error("Erreur chargement template:", e);
      toastError("Impossible de charger le modèle PDF");
    }
  }, [companyId, toastError]);

  useEffect(() => {
    loadOfferTemplate();
  }, [loadOfferTemplate]);

  // Chargement des parametres d'offre
  const loadOfferSettings = useCallback(async () => {
    if (!companyId) return;
    try {
      const settings = await fetchOfferSettings(companyId);
      setOfferSettings(settings);
      if (settings) {
        setSettingsForm({
          extras_note: settings.extras_note || '',
          exclusivity_note: settings.exclusivity_note || '',
          transport_note: settings.transport_note || '',
          transport_content: settings.transport_content || '',
          payment_note: settings.payment_note || '',
          payment_content: settings.payment_content || '',
          validity_text: settings.validity_text || '',
          stage_pa_lights: settings.stage_pa_lights || '',
          screens: settings.screens || '',
          merchandising: settings.merchandising || '',
          withholding_taxes: settings.withholding_taxes || '',
          decibel_limit: settings.decibel_limit || '',
          tour_bus: settings.tour_bus || '',
          catering_meals: settings.catering_meals || '',
          artwork: settings.artwork || '',
          email_body_html: settings.email_body_html || '',
        });
      }
    } catch (e) {
      console.error("Erreur chargement offer_settings:", e);
    }
  }, [companyId]);

  useEffect(() => {
    loadOfferSettings();
  }, [loadOfferSettings]);

  // Sauvegarde des parametres d'offre
  const handleSaveSettings = async () => {
    if (!companyId) return;
    setSavingSettings(true);
    try {
      const saved = await upsertOfferSettings({
        company_id: companyId,
        ...settingsForm,
      });
      setOfferSettings(saved);
      toastSuccess("Parametres enregistres");
    } catch (e: unknown) {
      const error = e as { message?: string };
      console.error("Erreur sauvegarde settings:", e);
      toastError(error?.message || "Erreur de sauvegarde");
    } finally {
      setSavingSettings(false);
    }
  };

  // Mise a jour d'un champ du formulaire settings
  const updateSettingsField = (field: keyof typeof settingsForm, value: string) => {
    setSettingsForm(prev => ({ ...prev, [field]: value }));
  };

  // Handlers pour les extras (clauses)
  const handleAddClause = async () => {
    if (!companyId || !newClauseData.title.trim()) return;
    
    saveScrollPosition();
    try {
      const sortOrder = getNextSortOrder(clauses, clausesSortable);
      const payload: Parameters<typeof createOfferClause>[1] = {
        key: newClauseData.title.toLowerCase().replace(/\s+/g, '_'),
        title: newClauseData.title,
        body: '',
        locale: 'fr',
        category: '',
        default_enabled: false,
      };
      if (typeof sortOrder === 'number') {
        (payload as OfferClause).sort_order = sortOrder;
      }
      await createOfferClause(companyId, payload);
      toastSuccess("Extra ajouté");
      setNewClauseData({ title: '', body: '' });
      setShowAddForm(false);
      await loadBookingData();
      restoreScrollPosition();
    } catch (e: unknown) {
      const error = e as { message?: string };
      console.error("Erreur ajout extra:", e);
      toastError(error?.message || "Erreur ajout");
    }
  };

  const handleEditClause = (clause: OfferClause) => {
    setEditingClauseId(clause.id);
    setEditClauseData({ title: clause.title, body: clause.body });
  };

  const handleSaveClause = async () => {
    if (!editingClauseId || !editClauseData.title.trim()) return;
    
    saveScrollPosition();
    try {
      await updateOfferClause(editingClauseId, {
        key: editClauseData.title.toLowerCase().replace(/\s+/g, '_'),
        title: editClauseData.title,
        body: editClauseData.body,
        locale: 'fr',
        category: '',
        default_enabled: false,
      });
      toastSuccess("Extra mis à jour");
      setEditingClauseId(null);
      setEditClauseData({ title: '', body: '' });
      await loadBookingData();
      restoreScrollPosition();
    } catch (e: unknown) {
      const error = e as { message?: string };
      console.error("Erreur mise à jour extra:", e);
      toastError(error?.message || "Erreur mise à jour");
    }
  };

  const handleCancelEdit = () => {
    setEditingClauseId(null);
    setEditClauseData({ title: '', body: '' });
  };

  // Handlers pour les clauses d'exclusivité
  const handleAddExcl = async () => {
    if (!companyId || !newExclData.name.trim()) return;
    
    saveScrollPosition();
    try {
      const sortOrder = getNextSortOrder(exclPresets, exclusivitySortable);
      const payload: Parameters<typeof createExclusivityPreset>[1] = {
        name: newExclData.name,
        penalty_note: null,
        region: null,
        perimeter_km: null,
        days_before: null,
        days_after: null,
      };
      if (typeof sortOrder === 'number') {
        (payload as ExclusivityPreset).sort_order = sortOrder;
      }
      await createExclusivityPreset(companyId, payload);
      toastSuccess("Clause d'exclusivité ajoutée");
      setNewExclData({ name: '', description: '' });
      setShowAddExclForm(false);
      await loadBookingData();
      restoreScrollPosition();
    } catch (e: unknown) {
      const error = e as { message?: string };
      console.error("Erreur ajout clause exclusivité:", e);
      toastError(error?.message || "Erreur ajout");
    }
  };

  const handleEditExcl = (preset: ExclusivityPreset) => {
    setEditingExclId(preset.id);
    setEditExclData({ name: preset.name, description: preset.penalty_note || '' });
  };

  const handleSaveExcl = async () => {
    if (!editingExclId || !editExclData.name.trim()) return;
    
    saveScrollPosition();
    try {
      await updateExclusivityPreset(editingExclId, {
        name: editExclData.name,
        penalty_note: editExclData.description,
      });
      toastSuccess("Clause d'exclusivité mise à jour");
      setEditingExclId(null);
      setEditExclData({ name: '', description: '' });
      await loadBookingData();
      restoreScrollPosition();
    } catch (e: unknown) {
      const error = e as { message?: string };
      console.error("Erreur mise à jour clause exclusivité:", e);
      toastError(error?.message || "Erreur mise à jour");
    }
  };

  const handleCancelEditExcl = () => {
    setEditingExclId(null);
    setEditExclData({ name: '', description: '' });
  };

const detectPdfFields = async (file: File): Promise<string[]> => {
  const buffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(buffer);
  const form = pdfDoc.getForm();
  return form
    .getFields()
    .map((field) => field.getName())
    .filter((name): name is string => !!name);
};

const FINANCIAL_KEYS: OfferTemplateFieldKey[] = [
  "amount_display",
  "amount_net",
  "amount_gross",
  "currency",
  "amount_is_net_label",
  "prod_fee_amount",
  "backline_fee_amount",
  "buyout_hotel_amount",
  "buyout_meal_amount",
  "flight_contribution_amount",
  "technical_fee_amount",
];

const EXTRAS_KEYS: OfferTemplateFieldKey[] = [
  "extras_summary",
  "clauses_summary",
];

const guessFieldForName = (
  fieldName: string,
): OfferTemplateFieldKey | null => {
  const normalized = fieldName.toLowerCase();
  if (
    normalized.includes("event") ||
    normalized.includes("evenement") ||
    normalized.includes("évènement")
  ) {
    return "event_name";
  }
  if (normalized.includes("artist") || normalized.includes("artiste")) {
    return "artist_name";
  }
  if (normalized.includes("scene") || normalized.includes("stage")) {
    return "stage_name";
  }
  if (normalized.includes("date")) {
    return normalized.includes("iso")
      ? "performance_date_iso"
      : "performance_date_long";
  }
  if (normalized.includes("heure") || normalized.includes("time")) {
    return "performance_time";
  }
  if (
    normalized.includes("durée") ||
    normalized.includes("duree") ||
    normalized.includes("duration")
  ) {
    return "duration_minutes";
  }
  if (
    normalized.includes("montant") ||
    normalized.includes("amount") ||
    normalized.includes("cachet")
  ) {
    return "amount_display";
  }
  if (normalized.includes("net")) {
    return "amount_net";
  }
  if (normalized.includes("brut") || normalized.includes("gross")) {
    return "amount_gross";
  }
  if (normalized.includes("prod")) {
    return "prod_fee_amount";
  }
  if (normalized.includes("backline")) {
    return "backline_fee_amount";
  }
  if (normalized.includes("hotel")) {
    return "buyout_hotel_amount";
  }
  if (normalized.includes("repas") || normalized.includes("meal")) {
    return "buyout_meal_amount";
  }
  if (normalized.includes("flight") || normalized.includes("vol")) {
    return "flight_contribution_amount";
  }
  if (normalized.includes("tech")) {
    return "technical_fee_amount";
  }
  if (normalized.includes("extra")) {
    return "extras_summary";
  }
  if (normalized.includes("clause") || normalized.includes("exclu")) {
    return "clauses_summary";
  }
  if (normalized.includes("currency") || normalized.includes("devise")) {
    return "currency";
  }
  if (normalized.includes("net")) {
    return "amount_is_net_label";
  }
  if (normalized.includes("note") || normalized.includes("remarque")) {
    return "notes";
  }
  if (normalized.includes("offre") && normalized.includes("id")) {
    return "offer_id";
  }
  if (normalized.includes("company")) {
    return "company_id";
  }
  return null;
};

const buildSmartMapping = (fields: string[]) => {
  const mapping: Record<string, string> = {};
  fields.forEach((field) => {
    const guess = guessFieldForName(field);
    if (guess) {
      mapping[field] = guess;
    }
  });
  return mapping;
};

const getFieldGroup = (
  fieldName: string,
  mappedValue?: OfferTemplateFieldKey | null,
): "base" | "financial" | "extras" => {
  const key = mappedValue ?? guessFieldForName(fieldName);
  if (key && FINANCIAL_KEYS.includes(key)) return "financial";
  if (key && EXTRAS_KEYS.includes(key)) return "extras";
  return "base";
};

const handleTemplateUpload = async (file: File) => {
  if (!companyId) {
    toastError("Entreprise inconnue");
    return;
  }
  if (file.type !== "application/pdf") {
    toastError("Veuillez sélectionner un fichier PDF");
    return;
  }
  setUploadingTemplate(true);
  try {
    const detectedFields = await detectPdfFields(file);
    if (!detectedFields.length) {
      toastError("Aucun champ de formulaire détecté dans ce PDF");
      return;
    }
    const storagePath = `${companyId}/offer_template_${Date.now()}.pdf`;
    const { error: uploadError } = await supabase.storage
      .from(TEMPLATE_BUCKET)
      .upload(storagePath, file, { upsert: true });
    if (uploadError) throw uploadError;

    const { data: userData } = await supabase.auth.getUser();
    const defaultMapping = buildSmartMapping(detectedFields);

    const template = await upsertOfferTemplate({
      company_id: companyId,
      storage_path: storagePath,
      file_name: file.name,
      file_size: file.size,
      detected_fields: detectedFields,
      fields_mapping: defaultMapping,
      uploaded_by: userData.user?.id ?? null,
    });

    setTemplateConfig(template);
    setTemplateFields(template.detected_fields ?? []);
    setTemplateMapping(template.fields_mapping ?? {});
    toastSuccess("Modèle importé avec succès");
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error("Erreur import template:", error);
    toastError(err?.message || "Erreur lors de l'import du modèle");
  } finally {
    setUploadingTemplate(false);
  }
};

const handleTemplateFileChange = async (
  event: ChangeEvent<HTMLInputElement>,
) => {
  const file = event.target.files?.[0];
  if (!file) return;
  await handleTemplateUpload(file);
  event.target.value = "";
};

// Upload d'un modele Word (.docx)
const handleWordTemplateUpload = async (file: File) => {
  if (!companyId) {
    toastError("Entreprise inconnue");
    return;
  }
  
  const isDocx = file.name.endsWith('.docx') || 
    file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  
  if (!isDocx) {
    toastError("Veuillez selectionner un fichier Word (.docx)");
    return;
  }
  
  setUploadingTemplate(true);
  try {
    // Lire le contenu du fichier pour detecter les placeholders
    const arrayBuffer = await file.arrayBuffer();
    const PizZip = (await import('pizzip')).default;
    const zip = new PizZip(arrayBuffer);
    
    // Extraire le document.xml pour trouver les placeholders
    const docXml = zip.file('word/document.xml')?.asText() || '';
    
    // Detecter les placeholders {variable_name}
    const placeholderRegex = /\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g;
    const detectedPlaceholders: string[] = [];
    let match;
    while ((match = placeholderRegex.exec(docXml)) !== null) {
      if (!detectedPlaceholders.includes(match[1])) {
        detectedPlaceholders.push(match[1]);
      }
    }
    
    // Upload dans le bucket word-templates
    const storagePath = `${companyId}/offer_template_${Date.now()}.docx`;
    const { error: uploadError } = await supabase.storage
      .from(TEMPLATE_BUCKET)
      .upload(storagePath, file, { upsert: true });
    
    if (uploadError) throw uploadError;

    const { data: userData } = await supabase.auth.getUser();

    // Sauvegarder la configuration du template
    const template = await upsertOfferTemplate({
      company_id: companyId,
      storage_path: storagePath,
      file_name: file.name,
      file_size: file.size,
      detected_fields: detectedPlaceholders,
      fields_mapping: {}, // Pas de mapping necessaire pour Word, les placeholders sont directs
      uploaded_by: userData.user?.id ?? null,
    });

    setTemplateConfig(template);
    setTemplateFields(template.detected_fields ?? []);
    setTemplateMapping({});
    
    toastSuccess(`Modele Word importe avec succes (${detectedPlaceholders.length} placeholders detectes)`);
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error("Erreur import modele Word:", error);
    toastError(err?.message || "Erreur lors de l'import du modele Word");
  } finally {
    setUploadingTemplate(false);
  }
};

const handleTemplateDrop = async (event: DragEvent<HTMLDivElement>) => {
  event.preventDefault();
  if (uploadingTemplate) return;
  setIsDragOver(false);
  const file = event.dataTransfer?.files?.[0];
  if (!file) return;
  await handleTemplateUpload(file);
};

const handleTemplateZoneClick = () => {
  if (uploadingTemplate) return;
  document.getElementById("offer-template-upload")?.click();
};

const handleMappingChange = (fieldName: string, value: string) => {
  setTemplateMapping((prev) => ({ ...prev, [fieldName]: value }));
};

const handleSaveTemplateMapping = async () => {
  if (!templateConfig) return;
  setSavingTemplateMapping(true);
  try {
    await updateOfferTemplateMapping(templateConfig.id, templateMapping);
    toastSuccess("Mapping enregistré");
    loadOfferTemplate();
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error("Erreur sauvegarde mapping:", error);
    toastError(err?.message || "Impossible d'enregistrer le mapping");
  } finally {
    setSavingTemplateMapping(false);
  }
};

const handleDownloadTemplate = async () => {
  if (!templateConfig?.storage_path) return;
  setDownloadingTemplate(true);
  try {
    const { data, error } = await supabase.storage
      .from(TEMPLATE_BUCKET)
      .createSignedUrl(templateConfig.storage_path, 120);
    if (error || !data?.signedUrl) throw error;
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error("Erreur téléchargement template:", error);
    toastError(err?.message || "Impossible de télécharger le modèle");
  } finally {
    setDownloadingTemplate(false);
  }
};

const handleDeleteTemplate = () => {
  if (!templateConfig) return;
  setDeleteConfirm({
    type: 'template',
    id: templateConfig.id,
    name: templateConfig.file_name || 'Modèle PDF',
  });
};

const mappingChanged = templateConfig
  ? JSON.stringify(templateMapping ?? {}) !==
    JSON.stringify(templateConfig.fields_mapping ?? {})
  : Object.keys(templateMapping).length > 0;

// Handler pour sauvegarder depuis le modal de mapping PDF
const handlePdfMappingSave = async (file: File, mapping: Record<string, string>) => {
  if (!companyId) {
    throw new Error("Entreprise inconnue");
  }
  
  // Detecter les champs du PDF
  const buffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(buffer);
  const form = pdfDoc.getForm();
  const detectedFields = form.getFields().map(f => f.getName()).filter((n): n is string => !!n);
  
  // Upload du fichier
  const storagePath = `${companyId}/offer_template_${Date.now()}.pdf`;
  const { error: uploadError } = await supabase.storage
    .from(TEMPLATE_BUCKET)
    .upload(storagePath, file, { upsert: true });
  if (uploadError) throw uploadError;

  const { data: userData } = await supabase.auth.getUser();

  // Sauvegarder le template avec le mapping
  const template = await upsertOfferTemplate({
    company_id: companyId,
    storage_path: storagePath,
    file_name: file.name,
    file_size: file.size,
    detected_fields: detectedFields,
    fields_mapping: mapping,
    uploaded_by: userData.user?.id ?? null,
  });

  setTemplateConfig(template);
  setTemplateFields(template.detected_fields ?? []);
  setTemplateMapping(template.fields_mapping ?? {});
  toastSuccess("Modele PDF configure avec succes");
};

  // Handlers Drag & Drop pour Clauses
  const handleClauseDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const clause = clauses.find(c => c.id === active.id);
    setActiveClause(clause || null);
  };

  const handleClauseDragCancel = () => {
    setActiveClause(null);
  };

  const handleClauseDragEnd = async (event: DragEndEvent) => {
    setActiveClause(null);
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const oldIndex = clauses.findIndex((c) => c.id === active.id);
    const newIndex = clauses.findIndex((c) => c.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const reorderedClauses = arrayMove(clauses, oldIndex, newIndex);

    if (!clausesSortable) {
      setClauses(reorderedClauses);
      return;
    }

    const clausesWithNewOrder = reorderedClauses.map((clause, index) => ({
      ...clause,
      sort_order: (index + 1) * 10,
    }));
    setClauses(clausesWithNewOrder);

    const updates = reorderedClauses
      .map((clause, index) => {
        const newSortOrder = (index + 1) * 10;
        if ((clause.sort_order ?? 0) === newSortOrder) return null;
        return updateOfferClause(clause.id, { sort_order: newSortOrder });
      })
      .filter((promise): promise is Promise<OfferClause> => promise !== null);

    if (updates.length > 0) {
      try {
        await Promise.all(updates);
      } catch (error) {
        console.error("Erreur mise à jour ordre extras:", error);
        toastError("Impossible d'enregistrer l'ordre des extras");
        saveScrollPosition();
        await loadBookingData();
        restoreScrollPosition();
      }
    }
  };

  // Handlers Drag & Drop pour Exclusivity Presets
  const handleExclDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const preset = exclPresets.find(p => p.id === active.id);
    setActiveExcl(preset || null);
  };

  const handleExclDragCancel = () => {
    setActiveExcl(null);
  };

  const handleExclDragEnd = async (event: DragEndEvent) => {
    setActiveExcl(null);
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const oldIndex = exclPresets.findIndex((p) => p.id === active.id);
    const newIndex = exclPresets.findIndex((p) => p.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const reorderedPresets = arrayMove(exclPresets, oldIndex, newIndex);

    if (!exclusivitySortable) {
      setExclPresets(reorderedPresets);
      return;
    }

    const presetsWithNewOrder = reorderedPresets.map((preset, index) => ({
      ...preset,
      sort_order: (index + 1) * 10,
    }));
    setExclPresets(presetsWithNewOrder);

    const updates = reorderedPresets
      .map((preset, index) => {
        const newSortOrder = (index + 1) * 10;
        if ((preset.sort_order ?? 0) === newSortOrder) return null;
        return updateExclusivityPreset(preset.id, { sort_order: newSortOrder });
      })
      .filter((promise): promise is Promise<ExclusivityPreset> => promise !== null);

    if (updates.length > 0) {
      try {
        await Promise.all(updates);
      } catch (error) {
        console.error("Erreur mise à jour ordre clauses:", error);
        toastError("Impossible d'enregistrer l'ordre des clauses");
        saveScrollPosition();
        await loadBookingData();
        restoreScrollPosition();
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div>
        <h2 className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>
          Options Booking
        </h2>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Gerez les clauses et extras pour vos offres
        </p>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p style={{ color: 'var(--text-secondary)' }}>Chargement...</p>
        </div>
      ) : (
        <>
          {/* ACCORDEON 1: PARAMETRAGES OFFRES */}
          <div 
            className="rounded-xl overflow-hidden"
            style={{ 
              background: 'var(--bg-elevated)', 
              border: '1px solid var(--border-default)',
              boxShadow: 'var(--shadow-md)',
            }}
          >
            {/* Header accordéon */}
            <button
              type="button"
              onClick={() => setAccordionOffersOpen(!accordionOffersOpen)}
              className="w-full px-5 py-4 flex items-center justify-between transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50"
              style={{ background: accordionOffersOpen ? 'rgba(113, 61, 255, 0.05)' : 'transparent' }}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-violet-100 dark:bg-violet-900/30">
                  <FileText className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                </div>
                <div className="text-left">
                  <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                    PARAMETRAGES OFFRES
                  </h3>
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                    Modele Word, Extras et Clauses d'exclusivite
                  </p>
                </div>
              </div>
              <ChevronDown 
                className={`w-5 h-5 transition-transform duration-200 ${accordionOffersOpen ? 'rotate-180' : ''}`}
                style={{ color: 'var(--text-muted)' }}
              />
            </button>

            {/* Contenu accordéon */}
            {accordionOffersOpen && (
              <div className="px-5 pb-5 space-y-6 border-t" style={{ borderColor: 'var(--border-default)' }}>
                {/* Section Modele Word d'offre */}
                <Card className="mt-5">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-violet-100 dark:bg-violet-900/30">
                  <FileType className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                </div>
                <div>
                  <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                    Modele Word d'offre
                  </h3>
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                    Importez un document Word (.docx) avec des placeholders {'{'}variable{'}'}
                  </p>
                </div>
              </div>
              {templateConfig && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-red-500 hover:text-red-600"
                  onClick={handleDeleteTemplate}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </CardHeader>
            <CardBody>
              <div className="space-y-4">
                {/* Template existant */}
                {templateConfig && (
                  <div className="flex items-center justify-between p-4 rounded-lg" style={{ background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)' }}>
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-lg" style={{ background: 'rgba(34, 197, 94, 0.2)' }}>
                        <FileType className="w-8 h-8" style={{ color: 'var(--success)' }} />
                      </div>
                      <div>
                        <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
                          {templateConfig.file_name || 'Modele Word'}
                        </p>
                        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                          {templateFields.length} placeholders detectes
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={handleDownloadTemplate}
                        disabled={downloadingTemplate}
                      >
                        <Download className="w-4 h-4 mr-1" />
                        {downloadingTemplate ? '...' : 'Telecharger'}
                      </Button>
                    </div>
                  </div>
                )}
                
                {/* Zone de glisser-deposer (toujours visible) */}
                <div 
                  className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-xl cursor-pointer transition-colors"
                  style={{ borderColor: 'var(--border-default)' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--primary)';
                    e.currentTarget.style.background = 'rgba(113, 61, 255, 0.05)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border-default)';
                    e.currentTarget.style.background = 'transparent';
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.currentTarget.style.borderColor = 'var(--primary)';
                    e.currentTarget.style.background = 'rgba(113, 61, 255, 0.1)';
                  }}
                  onDragLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border-default)';
                    e.currentTarget.style.background = 'transparent';
                  }}
                  onDrop={async (e) => {
                    e.preventDefault();
                    e.currentTarget.style.borderColor = 'var(--border-default)';
                    e.currentTarget.style.background = 'transparent';
                    const file = e.dataTransfer?.files?.[0];
                    if (file && (file.name.endsWith('.docx') || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')) {
                      await handleWordTemplateUpload(file);
                    } else {
                      toastError('Veuillez deposer un fichier Word (.docx)');
                    }
                  }}
                  onClick={() => document.getElementById('word-template-upload')?.click()}
                >
                  <UploadCloud className="w-12 h-12 mb-3" style={{ color: 'var(--text-muted)' }} />
                  <p className="font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                    {templateConfig ? 'Remplacer le modele Word' : 'Glissez-deposez votre modele Word ici'}
                  </p>
                  <p className="text-sm text-center max-w-md" style={{ color: 'var(--text-muted)' }}>
                    {templateConfig 
                      ? 'Glissez un nouveau fichier .docx ou cliquez pour selectionner'
                      : <>ou cliquez pour selectionner un fichier .docx avec des placeholders comme {'{'}artist_name{'}'}, {'{'}amount_net{'}'}, {'{'}amount_gross{'}'}</>
                    }
                  </p>
                </div>
              </div>
              
              <input
                id="word-template-upload"
                type="file"
                accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    await handleWordTemplateUpload(file);
                  }
                  e.target.value = '';
                }}
              />
            </CardBody>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Colonne EXTRAS */}
            <div>
            {/* Extras */}
            <Card>
              <CardHeader>
                <div>
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-violet-400" />
                    <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Extras</h3>
                  </div>
                  <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Clauses et extras personnalises pour vos offres</p>
                </div>
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => setShowAddForm(!showAddForm)}
                >
                  <Plus size={16} className="mr-1" />
                  Ajouter
                </Button>
              </CardHeader>
              <CardBody>
                <div className="space-y-4">
                  {/* Note d'introduction pour les extras */}
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                      Note d'introduction (optionnel)
                    </label>
                    <textarea
                      className="w-full rounded-lg border px-3 py-2 text-sm resize-none"
                      style={{
                        background: 'var(--bg-surface)',
                        borderColor: 'var(--color-border)',
                        color: 'var(--text-primary)',
                      }}
                      rows={2}
                      placeholder="Note introductive pour la section extras..."
                      value={settingsForm.extras_note}
                      onChange={(e) => updateSettingsField('extras_note', e.target.value)}
                    />
                  </div>
                  
                  {/* Formulaire d'ajout */}
                  {showAddForm && (
                    <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: 'var(--bg-surface)' }}>
                      <Input
                        value={newClauseData.title}
                        onChange={(e) => setNewClauseData({ ...newClauseData, title: e.target.value })}
                        placeholder="Nouveau label..."
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleAddClause();
                          if (e.key === 'Escape') setShowAddForm(false);
                        }}
                        autoFocus
                      />
                      <Button size="sm" variant="primary" onClick={handleAddClause}>
                        Ajouter
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setShowAddForm(false)}>
                        Annuler
                      </Button>
                    </div>
                  )}

                  {/* Liste des extras */}
                  {clauses.length === 0 ? (
                    <p className="text-sm py-4 text-center" style={{ color: 'var(--text-muted)' }}>
                      Aucune option definie. Cliquez sur "Ajouter" pour en creer.
                    </p>
                  ) : (
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragStart={handleClauseDragStart}
                      onDragEnd={handleClauseDragEnd}
                      onDragCancel={handleClauseDragCancel}
                    >
                      <SortableContext
                        items={clauses.map(c => c.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        <div className="space-y-2">
                          {clauses.map((clause) => (
                            <SortableClause
                              key={clause.id}
                              clause={clause}
                              isEditing={editingClauseId === clause.id}
                              editData={editClauseData}
                              onEdit={() => handleEditClause(clause)}
                              onSave={handleSaveClause}
                              onCancel={handleCancelEdit}
                              onDelete={() => setDeleteConfirm({ type: 'clause', id: clause.id, name: clause.title })}
                              onDataChange={setEditClauseData}
                            />
                          ))}
                        </div>
                      </SortableContext>
                      <DragOverlay>
                        {activeClause ? (
                          <div className="flex items-center gap-2 p-3 bg-white dark:bg-gray-700 rounded-lg border-2 border-violet-500 shadow-xl">
                            <GripVertical className="w-5 h-5 text-gray-400" />
                            <span className="flex-1 text-sm text-gray-700 dark:text-gray-300 font-medium">
                              {activeClause.title}
                            </span>
                          </div>
                        ) : null}
                      </DragOverlay>
                    </DndContext>
                  )}
                </div>
              </CardBody>
            </Card>
          </div>

          {/* Colonne CLAUSES D'EXCLUSIVITÉ */}
          <div>
            {/* Clauses d'exclusivité */}
            <Card>
              <CardHeader>
                <div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-violet-400" />
                    <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Clauses d'exclusivite</h3>
                  </div>
                  <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Clauses d'exclusivite territoriale et temporelle</p>
                </div>
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => setShowAddExclForm(!showAddExclForm)}
                >
                  <Plus size={16} className="mr-1" />
                  Ajouter
                </Button>
              </CardHeader>
              <CardBody>
                <div className="space-y-4">
                  {/* Note d'introduction pour les clauses d'exclusivite */}
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                      Note d'introduction (optionnel)
                    </label>
                    <textarea
                      className="w-full rounded-lg border px-3 py-2 text-sm resize-none"
                      style={{
                        background: 'var(--bg-surface)',
                        borderColor: 'var(--color-border)',
                        color: 'var(--text-primary)',
                      }}
                      rows={2}
                      placeholder="Note introductive pour la section clauses d'exclusivite..."
                      value={settingsForm.exclusivity_note}
                      onChange={(e) => updateSettingsField('exclusivity_note', e.target.value)}
                    />
                  </div>
                  
                  {/* Formulaire d'ajout */}
                  {showAddExclForm && (
                    <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: 'var(--bg-surface)' }}>
                      <Input
                        value={newExclData.name}
                        onChange={(e) => setNewExclData({ ...newExclData, name: e.target.value })}
                        placeholder="Nouveau label..."
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleAddExcl();
                          if (e.key === 'Escape') setShowAddExclForm(false);
                        }}
                        autoFocus
                      />
                      <Button size="sm" variant="primary" onClick={handleAddExcl}>
                        Ajouter
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setShowAddExclForm(false)}>
                        Annuler
                      </Button>
                    </div>
                  )}

                  {/* Liste des clauses */}
                  {exclPresets.length === 0 ? (
                    <p className="text-sm py-4 text-center" style={{ color: 'var(--text-muted)' }}>
                      Aucune option definie. Cliquez sur "Ajouter" pour en creer.
                    </p>
                  ) : (
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragStart={handleExclDragStart}
                      onDragEnd={handleExclDragEnd}
                      onDragCancel={handleExclDragCancel}
                    >
                      <SortableContext
                        items={exclPresets.map(p => p.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        <div className="space-y-2">
                          {exclPresets.map((preset) => (
                            <SortableExclusivity
                              key={preset.id}
                              preset={preset}
                              isEditing={editingExclId === preset.id}
                              editData={editExclData}
                              onEdit={() => handleEditExcl(preset)}
                              onSave={handleSaveExcl}
                              onCancel={handleCancelEditExcl}
                              onDelete={() => setDeleteConfirm({ type: 'excl', id: preset.id, name: preset.name })}
                              onDataChange={setEditExclData}
                            />
                          ))}
                        </div>
                      </SortableContext>
                      <DragOverlay>
                        {activeExcl ? (
                          <div className="flex items-center gap-2 p-3 bg-white dark:bg-gray-700 rounded-lg border-2 border-violet-500 shadow-xl">
                            <GripVertical className="w-5 h-5 text-gray-400" />
                            <span className="flex-1 text-sm text-gray-700 dark:text-gray-300 font-medium">
                              {activeExcl.name}
                            </span>
                          </div>
                        ) : null}
                      </DragOverlay>
                    </DndContext>
                  )}
                </div>
              </CardBody>
            </Card>
          </div>

          {/* Bandeau Parametres de l'offre avec bouton Sauver */}
          <div className="col-span-1 lg:col-span-2 flex items-center justify-between py-4 px-1">
            <div>
              <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                Parametres de l'offre
              </h3>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Textes par defaut pour vos documents d'offre
              </p>
            </div>
            <Button
              variant="primary"
              onClick={handleSaveSettings}
              disabled={savingSettings}
            >
              <Save size={16} className="mr-2" />
              {savingSettings ? 'Enregistrement...' : 'Enregistrer les parametres'}
            </Button>
          </div>

          {/* Transports Locaux */}
          <div>
            <Card>
              <CardHeader>
                <div>
                  <div className="flex items-center gap-2">
                    <Truck className="w-5 h-5 text-violet-400" />
                    <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Transports Locaux</h3>
                  </div>
                  <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Navettes et vehicules fournis par le festival</p>
                </div>
              </CardHeader>
              <CardBody>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
                      Note d'introduction
                    </label>
                    <textarea
                      value={settingsForm.transport_note}
                      onChange={(e) => updateSettingsField('transport_note', e.target.value)}
                      rows={2}
                      className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                      style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                      placeholder="Ex: Les transports locaux suivants sont fournis par le festival:"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
                      Contenu (une ligne par element)
                    </label>
                    <textarea
                      value={settingsForm.transport_content}
                      onChange={(e) => updateSettingsField('transport_content', e.target.value)}
                      rows={5}
                      className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 font-mono"
                      style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                      placeholder="- Navette aeroport/hotel&#10;- Vehicule avec chauffeur&#10;- Transport hotel/site"
                    />
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>

          {/* Conditions de Paiement */}
          <div>
            <Card>
              <CardHeader>
                <div>
                  <div className="flex items-center gap-2">
                    <Receipt className="w-5 h-5 text-violet-400" />
                    <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Conditions de Paiement</h3>
                  </div>
                  <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Modalites et echeances de paiement</p>
                </div>
              </CardHeader>
              <CardBody>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
                      Note d'introduction
                    </label>
                    <textarea
                      value={settingsForm.payment_note}
                      onChange={(e) => updateSettingsField('payment_note', e.target.value)}
                      rows={2}
                      className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                      style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                      placeholder="Ex: CONDITIONS DE PAIEMENT, NON NEGOTIABLES"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
                      Contenu (une ligne par condition)
                    </label>
                    <textarea
                      value={settingsForm.payment_content}
                      onChange={(e) => updateSettingsField('payment_content', e.target.value)}
                      rows={5}
                      className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 font-mono"
                      style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                      placeholder="- 50% a la signature&#10;- 50% restant 30 jours avant"
                    />
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>

          {/* Validite de l'offre */}
          <div>
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-violet-400" />
                  <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Validite de l'offre</h3>
                </div>
                <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Texte concernant la duree de validite</p>
              </CardHeader>
              <CardBody>
                <textarea
                  value={settingsForm.validity_text}
                  onChange={(e) => updateSettingsField('validity_text', e.target.value)}
                  rows={4}
                  className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                  placeholder="Ex: Cette offre est valable jusqu'au {validity_date}."
                />
              </CardBody>
            </Card>
          </div>

          {/* Stage PA & Lights */}
          <div>
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Volume2 className="w-5 h-5 text-violet-400" />
                  <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Stage PA & Lights</h3>
                </div>
                <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Equipements son et lumiere fournis</p>
              </CardHeader>
              <CardBody>
                <textarea
                  value={settingsForm.stage_pa_lights}
                  onChange={(e) => updateSettingsField('stage_pa_lights', e.target.value)}
                  rows={4}
                  className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 font-mono"
                  style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                  placeholder="- Systeme PA selon rider&#10;- Eclairage standard festival"
                />
              </CardBody>
            </Card>
          </div>

          {/* Ecrans */}
          <div>
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Monitor className="w-5 h-5 text-violet-400" />
                  <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Ecrans</h3>
                </div>
                <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Ecrans LED et affichage video</p>
              </CardHeader>
              <CardBody>
                <textarea
                  value={settingsForm.screens}
                  onChange={(e) => updateSettingsField('screens', e.target.value)}
                  rows={4}
                  className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 font-mono"
                  style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                  placeholder="- Ecrans LED lateraux&#10;- Resolution: 1920x1080"
                />
              </CardBody>
            </Card>
          </div>

          {/* Merchandising */}
          <div>
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-violet-400" />
                  <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Merchandising</h3>
                </div>
                <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Vente de produits derives</p>
              </CardHeader>
              <CardBody>
                <textarea
                  value={settingsForm.merchandising}
                  onChange={(e) => updateSettingsField('merchandising', e.target.value)}
                  rows={4}
                  className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 font-mono"
                  style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                  placeholder="- Stand disponible&#10;- Commission: 20%"
                />
              </CardBody>
            </Card>
          </div>

          {/* Impots a la source */}
          <div>
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-violet-400" />
                  <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Impots a la source</h3>
                </div>
                <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Retenues fiscales applicables</p>
              </CardHeader>
              <CardBody>
                <textarea
                  value={settingsForm.withholding_taxes}
                  onChange={(e) => updateSettingsField('withholding_taxes', e.target.value)}
                  rows={4}
                  className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 font-mono"
                  style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                  placeholder="- Taux: 15% sur le brut&#10;- Attestation requise"
                />
              </CardBody>
            </Card>
          </div>

          {/* Limitation Decibels */}
          <div>
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Volume2 className="w-5 h-5 text-violet-400" />
                  <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Limitation Decibels (dB)</h3>
                </div>
                <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Contraintes sonores du site</p>
              </CardHeader>
              <CardBody>
                <textarea
                  value={settingsForm.decibel_limit}
                  onChange={(e) => updateSettingsField('decibel_limit', e.target.value)}
                  rows={4}
                  className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 font-mono"
                  style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                  placeholder="- Limite: 102 dB(A)&#10;- Couvre-feu: 02h00"
                />
              </CardBody>
            </Card>
          </div>

          {/* Tour Bus */}
          <div>
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Bus className="w-5 h-5 text-violet-400" />
                  <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Assortiments Tour Bus</h3>
                </div>
                <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Parking et branchements tour bus</p>
              </CardHeader>
              <CardBody>
                <textarea
                  value={settingsForm.tour_bus}
                  onChange={(e) => updateSettingsField('tour_bus', e.target.value)}
                  rows={4}
                  className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 font-mono"
                  style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                  placeholder="- Parking securise&#10;- Branchement 32A"
                />
              </CardBody>
            </Card>
          </div>

          {/* Catering / Repas */}
          <div>
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <UtensilsCrossed className="w-5 h-5 text-violet-400" />
                  <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Catering / Repas</h3>
                </div>
                <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Restauration et hospitalite</p>
              </CardHeader>
              <CardBody>
                <textarea
                  value={settingsForm.catering_meals}
                  onChange={(e) => updateSettingsField('catering_meals', e.target.value)}
                  rows={4}
                  className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 font-mono"
                  style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                  placeholder="- Repas chauds inclus&#10;- Options vegan disponibles"
                />
              </CardBody>
            </Card>
          </div>

          {/* Affiche / Artwork */}
          <div>
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Image className="w-5 h-5 text-violet-400" />
                  <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Affiche / Artwork</h3>
                </div>
                <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Communication et visuels</p>
              </CardHeader>
              <CardBody>
                <textarea
                  value={settingsForm.artwork}
                  onChange={(e) => updateSettingsField('artwork', e.target.value)}
                  rows={4}
                  className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 font-mono"
                  style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                  placeholder="- Validation requise&#10;- Delai: 14 jours"
                />
              </CardBody>
            </Card>
          </div>
        </div>
              </div>
            )}
          </div>

          {/* ACCORDEON 2: PARAMETRAGES MAILS BOOKING */}
          <div 
            className="rounded-xl overflow-hidden"
            style={{ 
              background: 'var(--bg-elevated)', 
              border: '1px solid var(--border-default)',
              boxShadow: 'var(--shadow-md)',
            }}
          >
            {/* Header accordéon */}
            <button
              type="button"
              onClick={() => setAccordionMailsOpen(!accordionMailsOpen)}
              className="w-full px-5 py-4 flex items-center justify-between transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50"
              style={{ background: accordionMailsOpen ? 'rgba(59, 130, 246, 0.05)' : 'transparent' }}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="text-left">
                  <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                    PARAMETRAGES MAILS BOOKING
                  </h3>
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                    Annexes et corps des emails d'offres
                  </p>
                </div>
              </div>
              <ChevronDown 
                className={`w-5 h-5 transition-transform duration-200 ${accordionMailsOpen ? 'rotate-180' : ''}`}
                style={{ color: 'var(--text-muted)' }}
              />
            </button>

            {/* Contenu accordéon */}
            {accordionMailsOpen && (
              <div className="px-5 pb-5 space-y-6 border-t" style={{ borderColor: 'var(--border-default)' }}>
                {/* Section Annexes Emails et Corps de l'email - 2 colonnes */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-5">
                  {/* Annexes Emails */}
                  <EmailAttachmentsManager companyId={companyId} />

                  {/* Corps de l'email */}
                  <Card>
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                          <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                            Corps de l'email d'offre
                          </h3>
                          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                            Modele HTML par defaut pour le corps des emails d'envoi d'offres
                          </p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          const defaultTemplate = `Bonjour {recipient_name},

Veuillez trouver ci-joint notre offre pour {artist_name} dans le cadre de {event_name}.

Documents joints :
{attachments_list}

<strong style="color: #DC2626;">Cette offre est valable jusqu'au {validity_date}.</strong>

N'hesitez pas a nous contacter pour toute question.

Cordialement`;
                          updateSettingsField('email_body_html', defaultTemplate.replace(/\n/g, '<br>'));
                        }}
                        title="Inserer le modele par defaut"
                      >
                        Modele par defaut
                      </Button>
                    </CardHeader>
                    <CardBody>
                      <div className="space-y-3">
                        <div className="text-xs p-3 rounded-lg" style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>
                          <p className="font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Variables disponibles :</p>
                          <div className="grid grid-cols-2 gap-1">
                            <span><code className="text-violet-600">{'{'}recipient_name{'}'}</code> - Nom du destinataire</span>
                            <span><code className="text-violet-600">{'{'}artist_name{'}'}</code> - Nom de l'artiste</span>
                            <span><code className="text-violet-600">{'{'}event_name{'}'}</code> - Nom de l'evenement</span>
                            <span><code className="text-violet-600">{'{'}performance_date{'}'}</code> - Date du concert</span>
                            <span><code className="text-violet-600">{'{'}amount_display{'}'}</code> - Montant de l'offre</span>
                            <span><code className="text-violet-600">{'{'}validity_date{'}'}</code> - Date limite de validite</span>
                            <span className="col-span-2"><code className="text-violet-600">{'{'}attachments_list{'}'}</code> - Liste des documents joints (PDF offre + annexes)</span>
                          </div>
                        </div>
                        <SimpleHtmlEditor
                          value={settingsForm.email_body_html}
                          onChange={(html) => updateSettingsField('email_body_html', html)}
                          placeholder="Composez le corps de votre email d'offre ici..."
                          minHeight={250}
                          disabled={savingSettings}
                        />
                      </div>
                    </CardBody>
                  </Card>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Confirmation de suppression */}
      <ConfirmDialog
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={async () => {
          if (!deleteConfirm) return;

          saveScrollPosition();
          try {
            if (deleteConfirm.type === 'clause') {
              await deleteOfferClause(deleteConfirm.id);
              toastSuccess("Clause supprimée");
            } else if (deleteConfirm.type === 'excl') {
              await deleteExclusivityPreset(deleteConfirm.id);
              toastSuccess("Clause d'exclusivité supprimée");
            } else if (deleteConfirm.type === 'template') {
              await deleteOfferTemplate(deleteConfirm.id);
              if (templateConfig?.storage_path) {
                await supabase.storage
                  .from(TEMPLATE_BUCKET)
                  .remove([templateConfig.storage_path]);
              }
              setTemplateConfig(null);
              setTemplateFields([]);
              setTemplateMapping({});
              toastSuccess("Modèle supprimé");
              loadOfferTemplate();
            }

            setDeleteConfirm(null);
            await loadBookingData();
            restoreScrollPosition();
          } catch (e: unknown) {
            const error = e as { message?: string };
            console.error("Erreur suppression:", e);
            toastError(error?.message || "Erreur suppression");
          }
        }}
        title="Confirmer la suppression"
        message={`Êtes-vous sûr de vouloir supprimer "${deleteConfirm?.name}" ?`}
        confirmText="Supprimer"
        variant="danger"
      />
    </div>
  );
}

export default SettingsBookingPage;

