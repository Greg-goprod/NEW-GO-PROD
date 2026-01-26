import React, { useState } from 'react';
import { Phone, Building2, Users, Briefcase, TrendingUp, Plus, Edit2, Trash2, GripVertical } from 'lucide-react';
import { Card, CardHeader, CardBody } from '@/components/aura/Card';
import { Button } from '@/components/aura/Button';
import { Input } from '@/components/aura/Input';
import { ConfirmDialog } from '@/components/aura/ConfirmDialog';
import { useToast } from '@/components/aura/ToastProvider';
import { useCRMLookups } from '@/hooks/useCRMLookups';
import type { CRMLookupTable, CRMLookup } from '@/types/crm';
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

// Composant pour un élément draggable
function SortableItem({ 
  lookup, 
  isEditing,
  editLabel,
  onEdit,
  onSave,
  onCancel,
  onDelete,
  onLabelChange
}: {
  lookup: CRMLookup;
  isEditing: boolean;
  editLabel: string;
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
  } = useSortable({ id: lookup.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || 'transform 200ms cubic-bezier(0.25, 1, 0.5, 1)',
    opacity: isDragging ? 0.3 : 1,
    zIndex: isDragging ? 0 : 'auto',
  };

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
      }}
      className="flex items-center gap-3 p-3 rounded-xl transition-all"
    >
      {/* Poignée de drag */}
      <div 
        {...attributes} 
        {...listeners}
        className="cursor-grab active:cursor-grabbing transition-colors"
        style={{ color: 'var(--text-muted)' }}
      >
        <GripVertical className="w-5 h-5" />
      </div>

      {isEditing ? (
        <>
          <Input
            value={editLabel}
            onChange={(e) => onLabelChange(e.target.value)}
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
          <span className="flex-1 text-sm" style={{ color: 'var(--text-primary)' }}>
            {lookup.label}
          </span>
          {!lookup.active && (
            <span 
              className="text-xs px-2 py-1 rounded-md"
              style={{ 
                background: 'var(--bg-surface-hover)',
                color: 'var(--text-muted)'
              }}
            >
              Desactive
            </span>
          )}
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

// Composant pour gérer une liste d'options
function LookupManager({ 
  title, 
  icon: Icon, 
  table,
  description 
}: { 
  title: string; 
  icon: React.ComponentType<any>; 
  table: CRMLookupTable;
  description: string;
}) {
  const { lookups, loading, create, update, disable, setLookupsOptimistic } = useCRMLookups(table);
  const { success, error: toastError } = useToast();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editSortOrder, setEditSortOrder] = useState(100);
  const [newLabel, setNewLabel] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ 
    open: boolean; 
    lookup: CRMLookup | null 
  }>({ open: false, lookup: null });
  const [activeLookup, setActiveLookup] = useState<CRMLookup | null>(null);

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

  const handleEdit = (lookup: CRMLookup) => {
    setEditingId(lookup.id);
    setEditLabel(lookup.label);
    setEditSortOrder(lookup.sort_order);
  };

  // Gestion du drag & drop
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const lookup = lookups.find(l => l.id === active.id);
    setActiveLookup(lookup || null);
  };

  const handleDragCancel = () => {
    setActiveLookup(null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveLookup(null);
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = lookups.findIndex((l) => l.id === active.id);
    const newIndex = lookups.findIndex((l) => l.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    // 1. Réorganiser localement IMMÉDIATEMENT pour une UI fluide
    const reorderedLookups = arrayMove(lookups, oldIndex, newIndex);
    
    // 2. Recalculer les sort_order pour le nouvel ordre
    const lookupsWithNewOrder = reorderedLookups.map((lookup, index) => ({
      ...lookup,
      sort_order: (index + 1) * 10
    }));
    
    // 3. METTRE À JOUR L'ÉTAT LOCAL IMMÉDIATEMENT (optimistic update)
    setLookupsOptimistic(lookupsWithNewOrder);

    // 4. Batch update : collecter les changements pour la DB
    const updates: Array<{ id: string; label: string; active: boolean; sortOrder: number }> = [];
    
    for (let i = 0; i < reorderedLookups.length; i++) {
      const lookup = reorderedLookups[i];
      const newSortOrder = (i + 1) * 10;
      
      if (lookup.sort_order !== newSortOrder) {
        updates.push({
          id: lookup.id,
          label: lookup.label,
          active: lookup.active,
          sortOrder: newSortOrder
        });
      }
    }

    // 5. Exécuter tous les updates en arrière-plan (sans recharger, skipReload = true)
    if (updates.length > 0) {
      Promise.all(
        updates.map(u => update(u.id, u.label, u.active, u.sortOrder, true))
      ).then(() => {
        success('Ordre mis à jour');
      }).catch((err) => {
        toastError('Erreur lors de la réorganisation');
        console.error(err);
      });
    }
  };

  const handleSave = async (id: string, active: boolean) => {
    try {
      await update(id, editLabel, active, editSortOrder);
      setEditingId(null);
      success('Option mise à jour');
    } catch (err) {
      toastError('Erreur lors de la mise à jour');
    }
  };

  const handleAdd = async () => {
    if (!newLabel.trim()) return;
    
    try {
      await create(newLabel.trim(), 100);
      setNewLabel('');
      setShowAddForm(false);
      success('Option créée');
    } catch (err) {
      toastError('Erreur lors de la création');
    }
  };

  const handleDeleteClick = (lookup: CRMLookup) => {
    setDeleteConfirm({ open: true, lookup });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm.lookup) return;
    
    try {
      await disable(deleteConfirm.lookup.id);
      success('Option désactivée');
      setDeleteConfirm({ open: false, lookup: null });
    } catch (err) {
      toastError('Erreur lors de la désactivation');
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Icon className="w-5 h-5" style={{ color: 'var(--primary)' }} />
            <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</h3>
          </div>
        </CardHeader>
        <CardBody>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Chargement...</p>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between w-full">
          <div>
            <div className="flex items-center gap-2">
              <Icon className="w-5 h-5" style={{ color: 'var(--primary)' }} />
              <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</h3>
            </div>
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>{description}</p>
          </div>
          <Button
            size="sm"
            variant="secondary"
            leftIcon={<Plus size={16} />}
            onClick={() => setShowAddForm(!showAddForm)}
          >
            Ajouter
          </Button>
        </div>
      </CardHeader>
      <CardBody>
        <div className="space-y-2">
          {/* Formulaire d'ajout */}
          {showAddForm && (
            <div 
              className="flex items-center gap-3 p-3 rounded-xl"
              style={{ background: 'var(--bg-surface)' }}
            >
              <Input
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="Nouveau label..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAdd();
                  if (e.key === 'Escape') setShowAddForm(false);
                }}
                autoFocus
              />
              <Button size="sm" variant="primary" onClick={handleAdd}>
                Ajouter
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowAddForm(false)}>
                Annuler
              </Button>
            </div>
          )}

          {/* Liste des options */}
          {lookups.length === 0 ? (
            <p className="text-sm py-4 text-center" style={{ color: 'var(--text-muted)' }}>
              Aucune option definie. Cliquez sur "Ajouter" pour en creer.
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
                items={lookups.map(l => l.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {lookups.map((lookup) => (
                    <SortableItem
                      key={lookup.id}
                      lookup={lookup}
                      isEditing={editingId === lookup.id}
                      editLabel={editLabel}
                      onEdit={() => handleEdit(lookup)}
                      onSave={() => handleSave(lookup.id, lookup.active)}
                      onCancel={() => setEditingId(null)}
                      onDelete={() => handleDeleteClick(lookup)}
                      onLabelChange={setEditLabel}
                    />
                  ))}
                </div>
              </SortableContext>
              <DragOverlay>
                {activeLookup ? (
                  <div 
                    className="flex items-center gap-3 p-3 rounded-xl shadow-xl"
                    style={{
                      background: 'var(--bg-elevated)',
                      border: '2px solid var(--primary)',
                      boxShadow: 'var(--glow-primary)',
                    }}
                  >
                    <GripVertical className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
                    <span className="flex-1 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                      {activeLookup.label}
                    </span>
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          )}
        </div>
      </CardBody>

      {/* Modal de confirmation de suppression */}
      <ConfirmDialog
        open={deleteConfirm.open}
        onClose={() => setDeleteConfirm({ open: false, lookup: null })}
        onConfirm={handleDeleteConfirm}
        title="Désactiver l'option"
        message={`Êtes-vous sûr de vouloir désactiver l'option "${deleteConfirm.lookup?.label}" ?\n\nL'option ne sera plus disponible dans les formulaires mais les données existantes seront conservées.`}
        confirmText="Désactiver"
        cancelText="Annuler"
        variant="danger"
      />
    </Card>
  );
}

export function SettingsContactsPage() {
  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div>
        <h2 className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>
          Options CRM
        </h2>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Gerez les listes d'options pour vos contacts et societes
        </p>
      </div>

      {/* Grille 2 colonnes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Colonne PERSONNES */}
        <div className="space-y-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <Users className="w-5 h-5 text-violet-400" />
              Parametres Personnes
            </h3>
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
              Options pour la gestion des contacts
            </p>
          </div>

          {/* Départements */}
          <LookupManager
            title="Départements"
            icon={Briefcase}
            table="departments"
            description="Booking, Transport, Hospitality, Technique, Presse, Finance..."
          />

          {/* Rôles de contacts */}
          <LookupManager
            title="Rôles de contacts"
            icon={Users}
            table="contact_roles"
            description="Booker, Tour Manager, Chauffeur, Responsable hôtel..."
          />

          {/* Niveaux de séniorité */}
          <LookupManager
            title="Niveaux de séniorité"
            icon={TrendingUp}
            table="seniority_levels"
            description="Décision, Management, Opérationnel, Assistant..."
          />

          {/* Statuts de contacts */}
          <LookupManager
            title="Statuts de contacts"
            icon={Phone}
            table="contact_statuses"
            description="Actif, À valider, Blacklist, Archivé..."
          />
        </div>

        {/* Colonne SOCIÉTÉS */}
        <div className="space-y-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <Building2 className="w-5 h-5 text-violet-400" />
              Parametres Societes
            </h3>
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
              Options pour la gestion des entreprises
            </p>
          </div>

          {/* Types de sociétés */}
          <LookupManager
            title="Types de sociétés"
            icon={Building2}
            table="company_types"
            description="Label, Maison de disques, Agence de booking, Salle, Festival..."
          />
        </div>
      </div>
    </div>
  );
}


export default SettingsContactsPage;