import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, GripVertical, Music } from 'lucide-react';
import { Card, CardHeader, CardBody } from '@/components/aura/Card';
import { Button } from '@/components/aura/Button';
import { Input } from '@/components/aura/Input';
import { ConfirmDialog } from '@/components/aura/ConfirmDialog';
import { useToast } from '@/components/aura/ToastProvider';
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
  fetchStageTypes,
  fetchStageSpecificities,
  createStageType,
  createStageSpecificity,
  updateStageType,
  updateStageSpecificity,
  deleteStageType,
  deleteStageSpecificity,
  updateStageTypesOrder,
  updateStageSpecificitiesOrder,
  type StageType,
  type StageSpecificity,
} from '@/api/stageEnumsApi';

// Composant pour un item draggable
function SortableItem({
  item,
  isEditing,
  editingLabel,
  onEdit,
  onSave,
  onCancel,
  onDelete,
  onLabelChange,
}: {
  item: { id: string; label: string };
  isEditing: boolean;
  editingLabel: string;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete: () => void;
  onLabelChange: (value: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600"
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
      >
        <GripVertical className="w-5 h-5" />
      </div>

      {isEditing ? (
        <>
          <Input
            value={editingLabel}
            onChange={(e) => onLabelChange(e.target.value)}
            className="flex-1"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') onSave();
              if (e.key === 'Escape') onCancel();
            }}
          />
          <Button size="sm" variant="primary" onClick={onSave}>
            OK
          </Button>
          <Button size="sm" variant="secondary" onClick={onCancel}>
            X
          </Button>
        </>
      ) : (
        <>
          <span className="flex-1 text-sm text-gray-700 dark:text-gray-300">
            {item.label}
          </span>
          <Button size="sm" variant="ghost" onClick={onEdit}>
            <Edit2 className="w-4 h-4" />
          </Button>
          <Button size="sm" variant="ghost" onClick={onDelete} className="text-red-500 hover:text-red-600">
            <Trash2 className="w-4 h-4" />
          </Button>
        </>
      )}
    </div>
  );
}

interface StageEnumsManagerProps {
  companyId: string;
}

export function StageEnumsManager({ companyId }: StageEnumsManagerProps) {
  const { success: toastSuccess, error: toastError } = useToast();

  const [stageTypes, setStageTypes] = useState<StageType[]>([]);
  const [stageSpecificities, setStageSpecificities] = useState<StageSpecificity[]>([]);
  const [loading, setLoading] = useState(false);

  // Formulaire type
  const [showTypeForm, setShowTypeForm] = useState(false);
  const [newTypeLabel, setNewTypeLabel] = useState('');

  // Formulaire spécificité
  const [showSpecForm, setShowSpecForm] = useState(false);
  const [newSpecLabel, setNewSpecLabel] = useState('');

  // Édition en ligne
  const [editingTypeId, setEditingTypeId] = useState<string | null>(null);
  const [editingTypeLabel, setEditingTypeLabel] = useState('');
  const [editingSpecId, setEditingSpecId] = useState<string | null>(null);
  const [editingSpecLabel, setEditingSpecLabel] = useState('');

  // Drag & Drop
  const [activeType, setActiveType] = useState<StageType | null>(null);
  const [activeSpec, setActiveSpec] = useState<StageSpecificity | null>(null);

  // Confirmation de suppression unifiée
  const [deleteConfirm, setDeleteConfirm] = useState<{
    type: 'stageType' | 'stageSpec';
    id: string;
    name: string;
  } | null>(null);

  // Sensors pour le drag & drop
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Charger les données
  const loadData = async () => {
    console.log('🔍 StageEnumsManager - Chargement des enums pour company:', companyId);
    setLoading(true);
    try {
      const [types, specs] = await Promise.all([
        fetchStageTypes(companyId),
        fetchStageSpecificities(companyId),
      ]);
      console.log('✅ Types récupérés:', types);
      console.log('✅ Spécificités récupérées:', specs);
      setStageTypes(types);
      setStageSpecificities(specs);
    } catch (err: any) {
      console.error('❌ Erreur chargement enums:', err);
      toastError(`Erreur: ${err.message || 'Impossible de charger les types de scènes'}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (companyId) {
      loadData();
    }
  }, [companyId]);

  // Ajouter un type
  const handleAddType = async () => {
    if (!newTypeLabel.trim()) {
      toastError('Le label est obligatoire');
      return;
    }
    try {
      await createStageType(companyId, newTypeLabel.trim(), newTypeLabel.trim());
      toastSuccess(`Type "${newTypeLabel}" ajouté`);
      setNewTypeLabel('');
      setShowTypeForm(false);
      loadData();
    } catch (err: any) {
      console.error('Erreur ajout type:', err);
      toastError(err.message || "Erreur lors de l'ajout du type");
    }
  };

  // Éditer un type
  const handleEditType = (type: StageType) => {
    setEditingTypeId(type.id);
    setEditingTypeLabel(type.label);
  };

  // Sauvegarder l'édition d'un type
  const handleSaveType = async (id: string) => {
    if (!editingTypeLabel.trim()) {
      toastError('Le label est obligatoire');
      return;
    }
    try {
      await updateStageType(id, editingTypeLabel.trim());
      toastSuccess('Type modifié');
      setEditingTypeId(null);
      setEditingTypeLabel('');
      loadData();
    } catch (err: any) {
      console.error('Erreur modification type:', err);
      toastError(err.message || 'Erreur lors de la modification du type');
    }
  };

  // Annuler l'édition d'un type
  const handleCancelEditType = () => {
    setEditingTypeId(null);
    setEditingTypeLabel('');
    setShowTypeForm(false);
  };

  // Ajouter une spécificité
  const handleAddSpec = async () => {
    if (!newSpecLabel.trim()) {
      toastError('Le label est obligatoire');
      return;
    }
    try {
      await createStageSpecificity(companyId, newSpecLabel.trim(), newSpecLabel.trim());
      toastSuccess(`Spécificité "${newSpecLabel}" ajoutée`);
      setNewSpecLabel('');
      setShowSpecForm(false);
      loadData();
    } catch (err: any) {
      console.error('Erreur ajout spécificité:', err);
      toastError(err.message || "Erreur lors de l'ajout de la spécificité");
    }
  };

  // Éditer une spécificité
  const handleEditSpec = (spec: StageSpecificity) => {
    setEditingSpecId(spec.id);
    setEditingSpecLabel(spec.label);
  };

  // Sauvegarder l'édition d'une spécificité
  const handleSaveSpec = async (id: string) => {
    if (!editingSpecLabel.trim()) {
      toastError('Le label est obligatoire');
      return;
    }
    try {
      await updateStageSpecificity(id, editingSpecLabel.trim());
      toastSuccess('Spécificité modifiée');
      setEditingSpecId(null);
      setEditingSpecLabel('');
      loadData();
    } catch (err: any) {
      console.error('Erreur modification spécificité:', err);
      toastError(err.message || 'Erreur lors de la modification de la spécificité');
    }
  };

  // Annuler l'édition d'une spécificité
  const handleCancelEditSpec = () => {
    setEditingSpecId(null);
    setEditingSpecLabel('');
    setShowSpecForm(false);
  };

  // Drag & Drop handlers pour les types
  const handleTypeDragStart = (event: DragStartEvent) => {
    const item = stageTypes.find((t) => t.id === event.active.id);
    setActiveType(item || null);
  };

  const handleTypeDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveType(null);

    if (over && active.id !== over.id) {
      const oldIndex = stageTypes.findIndex((t) => t.id === active.id);
      const newIndex = stageTypes.findIndex((t) => t.id === over.id);
      const newOrder = arrayMove(stageTypes, oldIndex, newIndex);
      setStageTypes(newOrder);

      try {
        await updateStageTypesOrder(newOrder.map((t) => t.id));
      } catch (err: any) {
        console.error('Erreur reorder types:', err);
        toastError('Erreur lors du reordonnancement');
        loadData();
      }
    }
  };

  const handleTypeDragCancel = () => {
    setActiveType(null);
  };

  // Drag & Drop handlers pour les specificites
  const handleSpecDragStart = (event: DragStartEvent) => {
    const item = stageSpecificities.find((s) => s.id === event.active.id);
    setActiveSpec(item || null);
  };

  const handleSpecDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveSpec(null);

    if (over && active.id !== over.id) {
      const oldIndex = stageSpecificities.findIndex((s) => s.id === active.id);
      const newIndex = stageSpecificities.findIndex((s) => s.id === over.id);
      const newOrder = arrayMove(stageSpecificities, oldIndex, newIndex);
      setStageSpecificities(newOrder);

      try {
        await updateStageSpecificitiesOrder(newOrder.map((s) => s.id));
      } catch (err: any) {
        console.error('Erreur reorder specs:', err);
        toastError('Erreur lors du reordonnancement');
        loadData();
      }
    }
  };

  const handleSpecDragCancel = () => {
    setActiveSpec(null);
  };

  if (loading) {
    return <div className="text-sm text-gray-500">Chargement...</div>;
  }

  return (
    <>
      {/* Container Types de scènes */}
      <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Music className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Types de scènes
                  </h3>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Principale, Second Stage, Clubbing...
                </p>
              </div>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setShowTypeForm(!showTypeForm)}
              >
                <Plus size={16} className="mr-1" />
                Ajouter
              </Button>
            </div>
          </CardHeader>
          <CardBody>
            <div className="space-y-2">
              {/* Formulaire d'ajout */}
              {showTypeForm && (
                <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                  <Input
                    value={newTypeLabel}
                    onChange={(e) => setNewTypeLabel(e.target.value)}
                    placeholder="Nouveau label..."
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddType();
                      if (e.key === 'Escape') handleCancelEditType();
                    }}
                    autoFocus
                  />
                  <Button size="sm" variant="primary" onClick={handleAddType}>
                    Ajouter
                  </Button>
                  <Button size="sm" variant="ghost" onClick={handleCancelEditType}>
                    Annuler
                  </Button>
                </div>
              )}

              {/* Liste des types */}
              {stageTypes.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">
                  Aucune option définie. Cliquez sur "Ajouter" pour en créer.
                </p>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragStart={handleTypeDragStart}
                  onDragEnd={handleTypeDragEnd}
                  onDragCancel={handleTypeDragCancel}
                >
                  <SortableContext
                    items={stageTypes.map((t) => t.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-2">
                      {stageTypes.map((type) => (
                        <SortableItem
                          key={type.id}
                          item={type}
                          isEditing={editingTypeId === type.id}
                          editingLabel={editingTypeLabel}
                          onEdit={() => handleEditType(type)}
                          onSave={() => handleSaveType(type.id)}
                          onCancel={handleCancelEditType}
                          onDelete={() => setDeleteConfirm({ type: 'stageType', id: type.id, name: type.label })}
                          onLabelChange={setEditingTypeLabel}
                        />
                      ))}
                    </div>
                  </SortableContext>
                  <DragOverlay>
                    {activeType ? (
                      <div className="flex items-center gap-2 p-3 bg-white dark:bg-gray-700 rounded-lg border-2 border-violet-500 shadow-xl">
                        <GripVertical className="w-5 h-5 text-gray-400" />
                        <span className="flex-1 text-sm text-gray-700 dark:text-gray-300 font-medium">
                          {activeType.label}
                        </span>
                      </div>
                    ) : null}
                  </DragOverlay>
                </DndContext>
              )}
            </div>
          </CardBody>
        </Card>

        {/* Container Spécificités de scènes */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Music className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text_WHITE">
                    Spécificités de scènes
                  </h3>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Open Air, Couvert, Indoor...
                </p>
              </div>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setShowSpecForm(!showSpecForm)}
              >
                <Plus size={16} className="mr-1" />
                Ajouter
              </Button>
            </div>
          </CardHeader>
          <CardBody>
            <div className="space-y-2">
              {/* Formulaire d'ajout */}
              {showSpecForm && (
                <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                  <Input
                    value={newSpecLabel}
                    onChange={(e) => setNewSpecLabel(e.target.value)}
                    placeholder="Nouveau label..."
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddSpec();
                      if (e.key === 'Escape') handleCancelEditSpec();
                    }}
                    autoFocus
                  />
                  <Button size="sm" variant="primary" onClick={handleAddSpec}>
                    Ajouter
                  </Button>
                  <Button size="sm" variant="ghost" onClick={handleCancelEditSpec}>
                    Annuler
                  </Button>
                </div>
              )}

              {/* Liste des spécificités */}
              {stageSpecificities.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">
                  Aucune option définie. Cliquez sur "Ajouter" pour en créer.
                </p>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragStart={handleSpecDragStart}
                  onDragEnd={handleSpecDragEnd}
                  onDragCancel={handleSpecDragCancel}
                >
                  <SortableContext
                    items={stageSpecificities.map((s) => s.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-2">
                      {stageSpecificities.map((spec) => (
                        <SortableItem
                          key={spec.id}
                          item={spec}
                          isEditing={editingSpecId === spec.id}
                          editingLabel={editingSpecLabel}
                          onEdit={() => handleEditSpec(spec)}
                          onSave={() => handleSaveSpec(spec.id)}
                          onCancel={handleCancelEditSpec}
                          onDelete={() => setDeleteConfirm({ type: 'stageSpec', id: spec.id, name: spec.label })}
                          onLabelChange={setEditingSpecLabel}
                        />
                      ))}
                    </div>
                  </SortableContext>
                  <DragOverlay>
                    {activeSpec ? (
                      <div className="flex items-center gap-2 p-3 bg-white dark:bg-gray-700 rounded-lg border-2 border-violet-500 shadow-xl">
                        <GripVertical className="w-5 h-5 text-gray-400" />
                        <span className="flex-1 text-sm text-gray-700 dark:text-gray-300 font-medium">
                          {activeSpec.label}
                        </span>
                      </div>
                    ) : null}
                  </DragOverlay>
                </DndContext>
              )}
            </div>
          </CardBody>
        </Card>

      {/* Confirmation de suppression */}
      <ConfirmDialog
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={async () => {
          if (!deleteConfirm) return;

          try {
            if (deleteConfirm.type === 'stageType') {
              await deleteStageType(deleteConfirm.id);
              toastSuccess('Type supprimé');
            } else if (deleteConfirm.type === 'stageSpec') {
              await deleteStageSpecificity(deleteConfirm.id);
              toastSuccess('Spécificité supprimée');
            }

            setDeleteConfirm(null);
            loadData();
          } catch (err: any) {
            console.error('Erreur suppression:', err);
            toastError(err.message || 'Erreur suppression');
          }
        }}
        title="Confirmer la suppression"
        message={`Êtes-vous sûr de vouloir supprimer "${deleteConfirm?.name}" ?`}
        confirmText="Supprimer"
        variant="danger"
      />
    </>
  );
}