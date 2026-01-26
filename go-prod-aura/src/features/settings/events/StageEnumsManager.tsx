import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, GripVertical, Music } from 'lucide-react';
import { Card, CardHeader, CardBody } from '@/components/aura/Card';
import { Button } from '@/components/aura/Button';
import { Input } from '@/components/aura/Input';
import { ConfirmDialog } from '@/components/aura/ConfirmDialog';
import { useToast } from '@/components/aura/ToastProvider';
import {
  fetchStageTypes,
  fetchStageSpecificities,
  createStageType,
  createStageSpecificity,
  updateStageType,
  updateStageSpecificity,
  deleteStageType,
  deleteStageSpecificity,
  initializeStageEnumsForCompany,
  type StageType,
  type StageSpecificity,
} from '@/api/stageEnumsApi';

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
  const [savingType, setSavingType] = useState(false);

  // Formulaire spécificité
  const [showSpecForm, setShowSpecForm] = useState(false);
  const [newSpecLabel, setNewSpecLabel] = useState('');
  const [savingSpec, setSavingSpec] = useState(false);

  // Édition en ligne
  const [editingTypeId, setEditingTypeId] = useState<string | null>(null);
  const [editingTypeLabel, setEditingTypeLabel] = useState('');
  const [editingSpecId, setEditingSpecId] = useState<string | null>(null);
  const [editingSpecLabel, setEditingSpecLabel] = useState('');

  // Confirmation de suppression unifiée
  const [deleteConfirm, setDeleteConfirm] = useState<{
    type: 'stageType' | 'stageSpec';
    id: string;
    name: string;
  } | null>(null);

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
    setSavingType(true);
    try {
      await createStageType(companyId, newTypeLabel.trim(), newTypeLabel.trim());
      toastSuccess(`Type "${newTypeLabel}" ajouté`);
      setNewTypeLabel('');
      setShowTypeForm(false);
      loadData();
    } catch (err: any) {
      console.error('Erreur ajout type:', err);
      toastError(err.message || "Erreur lors de l'ajout du type");
    } finally {
      setSavingType(false);
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
    setSavingSpec(true);
    try {
      await createStageSpecificity(companyId, newSpecLabel.trim(), newSpecLabel.trim());
      toastSuccess(`Spécificité "${newSpecLabel}" ajoutée`);
      setNewSpecLabel('');
      setShowSpecForm(false);
      loadData();
    } catch (err: any) {
      console.error('Erreur ajout spécificité:', err);
      toastError(err.message || "Erreur lors de l'ajout de la spécificité");
    } finally {
      setSavingSpec(false);
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

  if (loading) {
    return <div className="text-sm text-gray-500">Chargement...</div>;
  }

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
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
                <div className="space-y-2">
                  {stageTypes.map((type) => (
                    <div
                      key={type.id}
                      className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600"
                    >
                      <div className="text-gray-400">
                        <GripVertical className="w-5 h-5" />
                      </div>

                      {editingTypeId === type.id ? (
                        <>
                          <Input
                            value={editingTypeLabel}
                            onChange={(e) => setEditingTypeLabel(e.target.value)}
                            className="flex-1"
                            autoFocus
                          />
                          <Button size="sm" variant="primary" onClick={() => handleSaveType(type.id)}>
                            ✓
                          </Button>
                          <Button size="sm" variant="secondary" onClick={handleCancelEditType}>
                            ✗
                          </Button>
                        </>
                      ) : (
                        <>
                          <span className="flex-1 text-sm text-gray-700 dark:text-gray-300">
                            {type.label}
                          </span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEditType(type)}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              setDeleteConfirm({ type: 'stageType', id: type.id, name: type.label })
                            }
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  ))}
                </div>
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
                <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
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
                <div className="space-y-2">
                  {stageSpecificities.map((spec) => (
                    <div
                      key={spec.id}
                      className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600"
                    >
                      <div className="text-gray-400">
                        <GripVertical className="w-5 h-5" />
                      </div>

                      {editingSpecId === spec.id ? (
                        <>
                          <Input
                            value={editingSpecLabel}
                            onChange={(e) => setEditingSpecLabel(e.target.value)}
                            className="flex-1"
                            autoFocus
                          />
                          <Button size="sm" variant="primary" onClick={() => handleSaveSpec(spec.id)}>
                            ✓
                          </Button>
                          <Button size="sm" variant="secondary" onClick={handleCancelEditSpec}>
                            ✗
                          </Button>
                        </>
                      ) : (
                        <>
                          <span className="flex-1 text-sm text-gray-700 dark:text-gray-300">
                            {spec.label}
                          </span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEditSpec(spec)}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              setDeleteConfirm({ type: 'stageSpec', id: spec.id, name: spec.label })
                            }
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardBody>
        </Card>
      </div>

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