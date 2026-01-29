/**
 * Gestionnaire des scènes de l'événement courant
 * Permet d'ajouter, éditer, supprimer et réordonner les scènes
 * avec drag & drop comme sur la page booking
 */

import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, GripVertical, MapPin, Check, X, Users } from 'lucide-react';
import { Card, CardHeader, CardBody } from '@/components/aura/Card';
import { Button } from '@/components/aura/Button';
import { Input } from '@/components/aura/Input';
import { ConfirmDialog } from '@/components/aura/ConfirmDialog';
import { useToast } from '@/components/aura/ToastProvider';
import { supabase } from '@/lib/supabaseClient';
import {
  fetchStageTypes,
  fetchStageSpecificities,
  type StageType,
  type StageSpecificity,
} from '@/api/stageEnumsApi';
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

interface EventStage {
  id: string;
  event_id: string;
  name: string;
  type: string | null;
  specificity: string | null;
  capacity: number | null;
  display_order: number;
  created_at: string;
}

interface EventStagesManagerProps {
  eventId: string | null;
  companyId: string;
}

// Composant pour une scène draggable
function SortableStage({
  stage,
  isEditing,
  editData,
  stageTypes,
  stageSpecificities,
  onEdit,
  onSave,
  onCancel,
  onDelete,
  onDataChange,
}: {
  stage: EventStage;
  isEditing: boolean;
  editData: Partial<EventStage>;
  stageTypes: StageType[];
  stageSpecificities: StageSpecificity[];
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete: () => void;
  onDataChange: (data: Partial<EventStage>) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: stage.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Trouver les labels des types/spécificités
  const typeLabel = stageTypes.find(t => t.value === stage.type)?.label || stage.type;
  const specLabel = stageSpecificities.find(s => s.value === stage.specificity)?.label || stage.specificity;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600"
      {...attributes}
    >
      {/* Handle de drag */}
      <div
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
      >
        <GripVertical className="w-5 h-5" />
      </div>

      {isEditing ? (
        // Mode édition
        <div className="flex-1 grid grid-cols-4 gap-2 items-center">
          <Input
            value={editData.name || ''}
            onChange={(e) => onDataChange({ ...editData, name: e.target.value })}
            placeholder="Nom de la scène"
            className="col-span-1"
            autoFocus
          />
          <select
            value={editData.type || ''}
            onChange={(e) => onDataChange({ ...editData, type: e.target.value || null })}
            className="col-span-1 h-9 rounded-lg px-3 text-sm"
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-default)',
              color: 'var(--text-primary)',
            }}
          >
            <option value="">Type...</option>
            {stageTypes.map((type) => (
              <option key={type.id} value={type.value}>{type.label}</option>
            ))}
          </select>
          <select
            value={editData.specificity || ''}
            onChange={(e) => onDataChange({ ...editData, specificity: e.target.value || null })}
            className="col-span-1 h-9 rounded-lg px-3 text-sm"
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-default)',
              color: 'var(--text-primary)',
            }}
          >
            <option value="">Specificite...</option>
            {stageSpecificities.map((spec) => (
              <option key={spec.id} value={spec.value}>{spec.label}</option>
            ))}
          </select>
          <div className="col-span-1 flex items-center gap-2">
            <Input
              type="number"
              value={editData.capacity || ''}
              onChange={(e) => onDataChange({ ...editData, capacity: e.target.value ? parseInt(e.target.value) : null })}
              placeholder="Capacite"
              className="flex-1"
            />
            <Button size="sm" variant="primary" onClick={onSave}>
              <Check className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="secondary" onClick={onCancel}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      ) : (
        // Mode affichage
        <>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                {stage.name}
              </span>
              {typeLabel && (
                <span 
                  className="text-xs px-2 py-0.5 rounded-full"
                  style={{ 
                    background: 'var(--primary-light)', 
                    color: 'var(--primary)' 
                  }}
                >
                  {typeLabel}
                </span>
              )}
              {specLabel && (
                <span 
                  className="text-xs px-2 py-0.5 rounded-full"
                  style={{ 
                    background: 'rgba(34, 197, 94, 0.1)', 
                    color: 'var(--success)' 
                  }}
                >
                  {specLabel}
                </span>
              )}
            </div>
            {stage.capacity && (
              <div className="flex items-center gap-1 mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                <Users className="w-3 h-3" />
                {stage.capacity.toLocaleString()} places
              </div>
            )}
          </div>
          <Button size="sm" variant="ghost" onClick={onEdit}>
            <Edit2 className="w-4 h-4" />
          </Button>
          <Button size="sm" variant="ghost" onClick={onDelete}>
            <Trash2 className="w-4 h-4 text-red-500" />
          </Button>
        </>
      )}
    </div>
  );
}

export function EventStagesManager({ eventId, companyId }: EventStagesManagerProps) {
  const { success: toastSuccess, error: toastError } = useToast();

  const [stages, setStages] = useState<EventStage[]>([]);
  const [stageTypes, setStageTypes] = useState<StageType[]>([]);
  const [stageSpecificities, setStageSpecificities] = useState<StageSpecificity[]>([]);
  const [loading, setLoading] = useState(false);

  // Formulaire d'ajout
  const [showAddForm, setShowAddForm] = useState(false);
  const [newStageData, setNewStageData] = useState<Partial<EventStage>>({
    name: '',
    type: null,
    specificity: null,
    capacity: null,
  });

  // Édition en ligne
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<EventStage>>({});

  // Confirmation de suppression
  const [deleteConfirm, setDeleteConfirm] = useState<{
    id: string;
    name: string;
  } | null>(null);

  // Drag & drop
  const [activeStage, setActiveStage] = useState<EventStage | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Charger les données
  const loadData = async () => {
    if (!eventId) return;
    
    setLoading(true);
    try {
      // Charger les scènes de l'événement
      const { data: stagesData, error: stagesError } = await supabase
        .from('event_stages')
        .select('*')
        .eq('event_id', eventId)
        .order('display_order', { ascending: true });

      if (stagesError) throw stagesError;
      setStages(stagesData || []);

      // Charger les enums
      const [types, specs] = await Promise.all([
        fetchStageTypes(companyId),
        fetchStageSpecificities(companyId),
      ]);
      setStageTypes(types);
      setStageSpecificities(specs);
    } catch (err: any) {
      console.error('Erreur chargement scènes:', err);
      toastError(err.message || 'Erreur lors du chargement des scènes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (eventId && companyId) {
      loadData();
    } else {
      setStages([]);
    }
  }, [eventId, companyId]);

  // Ajouter une scène
  const handleAdd = async () => {
    if (!newStageData.name?.trim() || !eventId) {
      toastError('Le nom de la scène est obligatoire');
      return;
    }

    try {
      const maxOrder = stages.length > 0 
        ? Math.max(...stages.map(s => s.display_order || 0)) 
        : 0;

      const { error } = await supabase
        .from('event_stages')
        .insert({
          event_id: eventId,
          name: newStageData.name.trim(),
          type: newStageData.type || null,
          specificity: newStageData.specificity || null,
          capacity: newStageData.capacity || null,
          display_order: maxOrder + 1,
        });

      if (error) throw error;

      toastSuccess(`Scène "${newStageData.name}" ajoutée`);
      setNewStageData({ name: '', type: null, specificity: null, capacity: null });
      setShowAddForm(false);
      loadData();
    } catch (err: any) {
      console.error('Erreur ajout scène:', err);
      toastError(err.message || 'Erreur lors de l\'ajout de la scène');
    }
  };

  // Éditer une scène
  const handleEdit = (stage: EventStage) => {
    setEditingId(stage.id);
    setEditData({
      name: stage.name,
      type: stage.type,
      specificity: stage.specificity,
      capacity: stage.capacity,
    });
  };

  // Sauvegarder l'édition
  const handleSave = async () => {
    if (!editingId || !editData.name?.trim()) {
      toastError('Le nom de la scène est obligatoire');
      return;
    }

    try {
      const { error } = await supabase
        .from('event_stages')
        .update({
          name: editData.name.trim(),
          type: editData.type || null,
          specificity: editData.specificity || null,
          capacity: editData.capacity || null,
        })
        .eq('id', editingId);

      if (error) throw error;

      toastSuccess('Scène modifiée');
      setEditingId(null);
      setEditData({});
      loadData();
    } catch (err: any) {
      console.error('Erreur modification scène:', err);
      toastError(err.message || 'Erreur lors de la modification');
    }
  };

  // Annuler l'édition
  const handleCancel = () => {
    setEditingId(null);
    setEditData({});
  };

  // Supprimer une scène
  const handleDelete = async () => {
    if (!deleteConfirm) return;

    try {
      const { error } = await supabase
        .from('event_stages')
        .delete()
        .eq('id', deleteConfirm.id);

      if (error) throw error;

      toastSuccess('Scène supprimée');
      setDeleteConfirm(null);
      loadData();
    } catch (err: any) {
      console.error('Erreur suppression scène:', err);
      toastError(err.message || 'Erreur lors de la suppression');
    }
  };

  // Drag & drop handlers
  const handleDragStart = (event: DragStartEvent) => {
    const stage = stages.find(s => s.id === event.active.id);
    setActiveStage(stage || null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveStage(null);

    if (!over || active.id === over.id) return;

    const oldIndex = stages.findIndex(s => s.id === active.id);
    const newIndex = stages.findIndex(s => s.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    // Mise à jour optimiste locale
    const reorderedStages = arrayMove(stages, oldIndex, newIndex);
    setStages(reorderedStages);

    // Mettre à jour les display_order en base
    try {
      const updates = reorderedStages.map((stage, index) => ({
        id: stage.id,
        display_order: index + 1,
      }));

      for (const update of updates) {
        await supabase
          .from('event_stages')
          .update({ display_order: update.display_order })
          .eq('id', update.id);
      }

      toastSuccess('Ordre des scènes mis à jour');
    } catch (err: any) {
      console.error('Erreur réordonnancement:', err);
      toastError('Erreur lors de la mise à jour de l\'ordre');
      loadData(); // Recharger pour annuler le changement optimiste
    }
  };

  const handleDragCancel = () => {
    setActiveStage(null);
  };

  if (!eventId) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
            <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
              Scènes de l'événement
            </h3>
          </div>
        </CardHeader>
        <CardBody>
          <div 
            className="rounded-xl p-4"
            style={{ 
              background: 'rgba(245, 158, 11, 0.1)',
              border: '1px solid rgba(245, 158, 11, 0.3)'
            }}
          >
            <div className="flex items-center gap-2 text-amber-400">
              <div className="w-4 h-4 bg-amber-400 rounded-full"></div>
              <span className="font-medium">Aucun événement sélectionné</span>
            </div>
            <p className="text-amber-300/80 text-sm mt-2">
              Sélectionnez un événement pour gérer ses scènes.
            </p>
          </div>
        </CardBody>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardBody>
          <div className="text-sm" style={{ color: 'var(--text-muted)' }}>Chargement...</div>
        </CardBody>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between w-full">
            <div>
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5" style={{ color: 'var(--primary)' }} />
                <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Scènes de l'événement
                </h3>
              </div>
              <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                Gérez les scènes, leurs types et capacités
              </p>
            </div>
            <Button
              size="sm"
              variant="primary"
              onClick={() => setShowAddForm(!showAddForm)}
            >
              <Plus size={16} className="mr-1" />
              Ajouter
            </Button>
          </div>
        </CardHeader>
        <CardBody>
          <div className="space-y-3">
            {/* Formulaire d'ajout */}
            {showAddForm && (
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                <div className="grid grid-cols-4 gap-2 items-center">
                  <Input
                    value={newStageData.name || ''}
                    onChange={(e) => setNewStageData({ ...newStageData, name: e.target.value })}
                    placeholder="Nom de la scène"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAdd();
                      if (e.key === 'Escape') setShowAddForm(false);
                    }}
                  />
                  <select
                    value={newStageData.type || ''}
                    onChange={(e) => setNewStageData({ ...newStageData, type: e.target.value || null })}
                    className="h-9 rounded-lg px-3 text-sm"
                    style={{
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border-default)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    <option value="">Type...</option>
                    {stageTypes.map((type) => (
                      <option key={type.id} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                  <select
                    value={newStageData.specificity || ''}
                    onChange={(e) => setNewStageData({ ...newStageData, specificity: e.target.value || null })}
                    className="h-9 rounded-lg px-3 text-sm"
                    style={{
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border-default)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    <option value="">Specificite...</option>
                    {stageSpecificities.map((spec) => (
                      <option key={spec.id} value={spec.value}>{spec.label}</option>
                    ))}
                  </select>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={newStageData.capacity || ''}
                      onChange={(e) => setNewStageData({ ...newStageData, capacity: e.target.value ? parseInt(e.target.value) : null })}
                      placeholder="Capacite"
                      className="flex-1"
                    />
                    <Button size="sm" variant="primary" onClick={handleAdd}>
                      Ajouter
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setShowAddForm(false)}>
                      Annuler
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Liste des scènes avec drag & drop */}
            {stages.length === 0 ? (
              <p className="text-sm py-4 text-center" style={{ color: 'var(--text-muted)' }}>
                Aucune scène définie. Cliquez sur "Ajouter" pour en créer.
              </p>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDragCancel={handleDragCancel}
              >
                <SortableContext
                  items={stages.map(s => s.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2">
                    {stages.map((stage) => (
                      <SortableStage
                        key={stage.id}
                        stage={stage}
                        isEditing={editingId === stage.id}
                        editData={editData}
                        stageTypes={stageTypes}
                        stageSpecificities={stageSpecificities}
                        onEdit={() => handleEdit(stage)}
                        onSave={handleSave}
                        onCancel={handleCancel}
                        onDelete={() => setDeleteConfirm({ id: stage.id, name: stage.name })}
                        onDataChange={setEditData}
                      />
                    ))}
                  </div>
                </SortableContext>
                <DragOverlay>
                  {activeStage ? (
                    <div className="flex items-center gap-2 p-3 bg-white dark:bg-gray-700 rounded-lg border-2 border-violet-500 shadow-xl">
                      <GripVertical className="w-5 h-5 text-gray-400" />
                      <span className="flex-1 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                        {activeStage.name}
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
        onConfirm={handleDelete}
        title="Confirmer la suppression"
        message={`Êtes-vous sûr de vouloir supprimer la scène "${deleteConfirm?.name}" ?`}
        confirmText="Supprimer"
        variant="danger"
      />
    </>
  );
}
