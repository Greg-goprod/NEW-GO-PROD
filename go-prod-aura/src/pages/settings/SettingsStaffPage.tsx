import { useState } from 'react';
import { Users, Award, UsersRound, Plus, Edit2, Trash2, GripVertical, Tags, Car, Shield, Wrench, UtensilsCrossed, Heart, Package, Sparkles } from 'lucide-react';
import { Card, CardHeader, CardBody } from '@/components/aura/Card';
import { Button } from '@/components/aura/Button';
import { Input } from '@/components/aura/Input';
import { useToast } from '@/components/aura/ToastProvider';
import { ConfirmDialog } from '@/components/aura/ConfirmDialog';
import { useStaffLookups } from '@/hooks/useStaffLookups';
import type {
  StaffVolunteerStatus,
  StaffCategory,
  StaffDepartment,
  StaffSectorWithDepartment,
} from '@/types/staff';

// Icones disponibles pour les categories
const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Car,
  Shield,
  Wrench,
  UtensilsCrossed,
  Heart,
  Package,
  Users,
  Sparkles,
};

const ICON_OPTIONS = [
  { value: 'Car', label: 'Voiture' },
  { value: 'Shield', label: 'Securite' },
  { value: 'Wrench', label: 'Technique' },
  { value: 'UtensilsCrossed', label: 'Restauration' },
  { value: 'Heart', label: 'Coeur' },
  { value: 'Package', label: 'Logistique' },
  { value: 'Users', label: 'Personnes' },
  { value: 'Sparkles', label: 'Etoiles' },
];

export default function SettingsStaffPage() {
  const { success, error: toastError } = useToast();
  const {
    statuses,
    categories,
    departments,
    sectors,
    loading,
    createStatus,
    updateStatus,
    deleteStatus,
    createCategory,
    updateCategory,
    deleteCategory,
    createDepartment,
    updateDepartment,
    deleteDepartment,
    createSector,
    updateSector,
    deleteSector,
  } = useStaffLookups();

  // États pour les statuts
  const [showAddStatusForm, setShowAddStatusForm] = useState(false);
  const [editingStatusId, setEditingStatusId] = useState<string | null>(null);
  const [statusForm, setStatusForm] = useState({ name: '', color: '#10b981' });

  // États pour les categories
  const [showAddCategoryForm, setShowAddCategoryForm] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [categoryForm, setCategoryForm] = useState({ name: '', description: '', color: '#713DFF', icon: 'Users' });

  // États pour les départements
  const [showAddDepartmentForm, setShowAddDepartmentForm] = useState(false);
  const [editingDepartmentId, setEditingDepartmentId] = useState<string | null>(null);
  const [departmentForm, setDepartmentForm] = useState({ name: '', description: '' });

  // États pour les secteurs
  const [showAddSectorForm, setShowAddSectorForm] = useState(false);
  const [editingSectorId, setEditingSectorId] = useState<string | null>(null);
  const [sectorForm, setSectorForm] = useState({ name: '', description: '', department_id: '' });

  // Confirmation de suppression
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: string; id: string; name: string } | null>(null);

  // ───────────────────────────────────────────────────────────────────────────
  // Handlers Statuts
  // ───────────────────────────────────────────────────────────────────────────
  
  const handleEditStatus = (status: StaffVolunteerStatus) => {
    setEditingStatusId(status.id);
    setStatusForm({ name: status.name, color: status.color });
  };

  const handleSaveStatus = async () => {
    if (!statusForm.name.trim()) {
      toastError('Le nom est requis');
      return;
    }

    try {
      if (editingStatusId) {
        await updateStatus(editingStatusId, statusForm);
        success('Statut mis à jour');
      } else {
        await createStatus(statusForm.name, statusForm.color);
        success('Statut créé');
      }
      setEditingStatusId(null);
      setShowAddStatusForm(false);
      setStatusForm({ name: '', color: '#10b981' });
    } catch (err: any) {
      toastError(err.message || 'Erreur lors de la sauvegarde');
    }
  };

  const handleCancelEditStatus = () => {
    setEditingStatusId(null);
    setShowAddStatusForm(false);
    setStatusForm({ name: '', color: '#10b981' });
  };

  // ───────────────────────────────────────────────────────────────────────────
  // Handlers Départements
  // ───────────────────────────────────────────────────────────────────────────
  
  const handleEditDepartment = (department: StaffDepartment) => {
    setEditingDepartmentId(department.id);
    setDepartmentForm({ name: department.name, description: department.description || '' });
  };

  const handleSaveDepartment = async () => {
    if (!departmentForm.name.trim()) {
      toastError('Le nom est requis');
      return;
    }

    try {
      if (editingDepartmentId) {
        await updateDepartment(editingDepartmentId, {
          name: departmentForm.name,
          description: departmentForm.description || null,
        });
        success('Département mis à jour');
      } else {
        await createDepartment(departmentForm.name, departmentForm.description);
        success('Département créé');
      }
      setEditingDepartmentId(null);
      setShowAddDepartmentForm(false);
      setDepartmentForm({ name: '', description: '' });
    } catch (err: any) {
      toastError(err.message || 'Erreur lors de la sauvegarde');
    }
  };

  const handleCancelEditDepartment = () => {
    setEditingDepartmentId(null);
    setShowAddDepartmentForm(false);
    setDepartmentForm({ name: '', description: '' });
  };

  // ───────────────────────────────────────────────────────────────────────────
  // Handlers Categories
  // ───────────────────────────────────────────────────────────────────────────
  
  const handleEditCategory = (category: StaffCategory) => {
    setEditingCategoryId(category.id);
    setCategoryForm({ 
      name: category.name, 
      description: category.description || '', 
      color: category.color || '#713DFF',
      icon: category.icon || 'Users'
    });
  };

  const handleSaveCategory = async () => {
    if (!categoryForm.name.trim()) {
      toastError('Le nom est requis');
      return;
    }

    try {
      if (editingCategoryId) {
        await updateCategory(editingCategoryId, {
          name: categoryForm.name,
          description: categoryForm.description || null,
          color: categoryForm.color,
          icon: categoryForm.icon,
        });
        success('Categorie mise a jour');
      } else {
        await createCategory(categoryForm.name, categoryForm.description, categoryForm.color, categoryForm.icon);
        success('Categorie creee');
      }
      setEditingCategoryId(null);
      setShowAddCategoryForm(false);
      setCategoryForm({ name: '', description: '', color: '#713DFF', icon: 'Users' });
    } catch (err: any) {
      toastError(err.message || 'Erreur lors de la sauvegarde');
    }
  };

  const handleCancelEditCategory = () => {
    setEditingCategoryId(null);
    setShowAddCategoryForm(false);
    setCategoryForm({ name: '', description: '', color: '#713DFF', icon: 'Users' });
  };

  // ───────────────────────────────────────────────────────────────────────────
  // Handlers Secteurs
  // ───────────────────────────────────────────────────────────────────────────
  
  const handleEditSector = (sector: StaffSectorWithDepartment) => {
    setEditingSectorId(sector.id);
    setSectorForm({ name: sector.name, description: sector.description || '', department_id: sector.department_id });
  };

  const handleSaveSector = async () => {
    if (!sectorForm.name.trim()) {
      toastError('Le nom est requis');
      return;
    }
    if (!sectorForm.department_id) {
      toastError('Le département est requis');
      return;
    }

    try {
      if (editingSectorId) {
        await updateSector(editingSectorId, {
          name: sectorForm.name,
          description: sectorForm.description || null,
          department_id: sectorForm.department_id,
        });
        success('Secteur mis à jour');
      } else {
        await createSector(sectorForm.department_id, sectorForm.name, sectorForm.description);
        success('Secteur créé');
      }
      setEditingSectorId(null);
      setShowAddSectorForm(false);
      setSectorForm({ name: '', description: '', department_id: '' });
    } catch (err: any) {
      toastError(err.message || 'Erreur lors de la sauvegarde');
    }
  };

  const handleCancelEditSector = () => {
    setEditingSectorId(null);
    setShowAddSectorForm(false);
    setSectorForm({ name: '', description: '', department_id: '' });
  };

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div>
        <h2 className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>
          Options Staff
        </h2>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Gerez les statuts, groupes et competences des benevoles
        </p>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p style={{ color: 'var(--text-secondary)' }}>Chargement...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {/* Statuts */}
          <Card>
            <CardHeader>
              <div>
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-violet-400" />
                  <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Statuts</h3>
                </div>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Statuts des benevoles</p>
              </div>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setShowAddStatusForm(!showAddStatusForm)}
              >
                <Plus size={16} />
              </Button>
            </CardHeader>
            <CardBody>
              <div className="space-y-1">
                {showAddStatusForm && (
                  <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                    <Input
                      value={statusForm.name}
                      onChange={(e) => setStatusForm({ ...statusForm, name: e.target.value })}
                      placeholder="Nom..."
                      className="flex-1 text-sm"
                      autoFocus
                    />
                    <input
                      type="color"
                      value={statusForm.color}
                      onChange={(e) => setStatusForm({ ...statusForm, color: e.target.value })}
                      className="w-8 h-8 rounded border border-gray-300 dark:border-gray-600 cursor-pointer"
                    />
                    <Button size="sm" variant="primary" onClick={handleSaveStatus}>OK</Button>
                    <Button size="sm" variant="ghost" onClick={handleCancelEditStatus}>X</Button>
                  </div>
                )}

                {!statuses || statuses.length === 0 ? (
                  <p className="text-xs py-4 text-center" style={{ color: 'var(--text-muted)' }}>
                    Aucune option
                  </p>
                ) : (
                  <div className="space-y-1">
                    {statuses?.map((status) => (
                      <div key={status.id} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                        <GripVertical className="w-4 h-4 text-gray-400" />
                        {editingStatusId === status.id ? (
                          <>
                            <Input
                              value={statusForm.name}
                              onChange={(e) => setStatusForm({ ...statusForm, name: e.target.value })}
                              className="flex-1 text-sm"
                              autoFocus
                            />
                            <input
                              type="color"
                              value={statusForm.color}
                              onChange={(e) => setStatusForm({ ...statusForm, color: e.target.value })}
                              className="w-8 h-8 rounded border border-gray-300 dark:border-gray-600 cursor-pointer"
                            />
                            <Button size="sm" variant="ghost" onClick={handleSaveStatus}>OK</Button>
                          </>
                        ) : (
                          <>
                            <div
                              className="w-3 h-3 rounded-full flex-shrink-0"
                              style={{ backgroundColor: status.color }}
                            />
                            <span className="flex-1 text-xs text-gray-700 dark:text-gray-300 truncate">
                              {status.name}
                            </span>
                            <Button size="sm" variant="ghost" className="p-1" onClick={() => handleEditStatus(status)}>
                              <Edit2 className="w-3.5 h-3.5" />
                            </Button>
                            <Button size="sm" variant="ghost" className="p-1 text-red-500 hover:text-red-600" onClick={() => setDeleteConfirm({ type: 'status', id: status.id, name: status.name })}>
                              <Trash2 className="w-3.5 h-3.5" />
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

          {/* Categories */}
          <Card>
            <CardHeader>
              <div>
                <div className="flex items-center gap-2">
                  <Tags className="w-5 h-5 text-violet-400" />
                  <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Categories</h3>
                </div>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Types de staff (Chauffeurs, Securite...)</p>
              </div>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setShowAddCategoryForm(!showAddCategoryForm)}
              >
                <Plus size={16} />
              </Button>
            </CardHeader>
            <CardBody>
              <div className="space-y-1">
                {showAddCategoryForm && (
                  <div className="flex flex-col gap-2 p-2 rounded-lg border" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-default)' }}>
                    <Input
                      value={categoryForm.name}
                      onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                      placeholder="Nom..."
                      className="text-sm"
                      autoFocus
                    />
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={categoryForm.color}
                        onChange={(e) => setCategoryForm({ ...categoryForm, color: e.target.value })}
                        className="w-8 h-8 rounded border cursor-pointer"
                        style={{ borderColor: 'var(--border-default)' }}
                      />
                      <select
                        value={categoryForm.icon}
                        onChange={(e) => setCategoryForm({ ...categoryForm, icon: e.target.value })}
                        className="input text-sm flex-1"
                      >
                        {ICON_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button size="sm" variant="primary" onClick={handleSaveCategory}>OK</Button>
                      <Button size="sm" variant="ghost" onClick={handleCancelEditCategory}>X</Button>
                    </div>
                  </div>
                )}

                {!categories || categories.length === 0 ? (
                  <p className="text-xs py-4 text-center" style={{ color: 'var(--text-muted)' }}>
                    Aucune categorie
                  </p>
                ) : (
                  <div className="space-y-1">
                    {categories?.map((category) => {
                      const IconComponent = CATEGORY_ICONS[category.icon || 'Users'] || Users;
                      return (
                        <div key={category.id} className="flex items-center gap-2 p-2 rounded-lg border" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-default)' }}>
                          <GripVertical className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                          {editingCategoryId === category.id ? (
                            <>
                              <Input
                                value={categoryForm.name}
                                onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                                className="flex-1 text-sm"
                                autoFocus
                              />
                              <input
                                type="color"
                                value={categoryForm.color}
                                onChange={(e) => setCategoryForm({ ...categoryForm, color: e.target.value })}
                                className="w-6 h-6 rounded border cursor-pointer"
                                style={{ borderColor: 'var(--border-default)' }}
                              />
                              <Button size="sm" variant="ghost" onClick={handleSaveCategory}>OK</Button>
                            </>
                          ) : (
                            <>
                              <div
                                className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0"
                                style={{ backgroundColor: category.color + '20', color: category.color }}
                              >
                                <IconComponent className="w-3.5 h-3.5" />
                              </div>
                              <span className="flex-1 text-xs truncate" style={{ color: 'var(--text-primary)' }}>
                                {category.name}
                              </span>
                              <Button size="sm" variant="ghost" className="p-1" onClick={() => handleEditCategory(category)}>
                                <Edit2 className="w-3.5 h-3.5" />
                              </Button>
                              <Button size="sm" variant="ghost" className="p-1 text-red-500 hover:text-red-600" onClick={() => setDeleteConfirm({ type: 'category', id: category.id, name: category.name })}>
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </CardBody>
          </Card>

          {/* Départements */}
          <Card>
            <CardHeader>
              <div>
                <div className="flex items-center gap-2">
                  <UsersRound className="w-5 h-5 text-violet-400" />
                  <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Departements</h3>
                </div>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Departements des benevoles</p>
              </div>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setShowAddDepartmentForm(!showAddDepartmentForm)}
              >
                <Plus size={16} />
              </Button>
            </CardHeader>
            <CardBody>
              <div className="space-y-1">
                {showAddDepartmentForm && (
                  <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                    <Input
                      value={departmentForm.name}
                      onChange={(e) => setDepartmentForm({ ...departmentForm, name: e.target.value })}
                      placeholder="Nom..."
                      className="text-sm"
                      autoFocus
                    />
                    <Button size="sm" variant="primary" onClick={handleSaveDepartment}>OK</Button>
                    <Button size="sm" variant="ghost" onClick={handleCancelEditDepartment}>X</Button>
                  </div>
                )}

                {!departments || departments.length === 0 ? (
                  <p className="text-xs py-4 text-center" style={{ color: 'var(--text-muted)' }}>
                    Aucune option
                  </p>
                ) : (
                  <div className="space-y-1">
                    {departments?.map((department) => (
                      <div key={department.id} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                        <GripVertical className="w-4 h-4 text-gray-400" />
                        {editingDepartmentId === department.id ? (
                          <>
                            <Input
                              value={departmentForm.name}
                              onChange={(e) => setDepartmentForm({ ...departmentForm, name: e.target.value })}
                              className="flex-1 text-sm"
                              autoFocus
                            />
                            <Button size="sm" variant="ghost" onClick={handleSaveDepartment}>OK</Button>
                          </>
                        ) : (
                          <>
                            <span className="flex-1 text-xs text-gray-700 dark:text-gray-300 truncate">
                              {department.name}
                            </span>
                            <Button size="sm" variant="ghost" className="p-1" onClick={() => handleEditDepartment(department)}>
                              <Edit2 className="w-3.5 h-3.5" />
                            </Button>
                            <Button size="sm" variant="ghost" className="p-1 text-red-500 hover:text-red-600" onClick={() => setDeleteConfirm({ type: 'department', id: department.id, name: department.name })}>
                              <Trash2 className="w-3.5 h-3.5" />
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

          {/* Secteurs */}
          <Card>
            <CardHeader>
              <div>
                <div className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-violet-400" />
                  <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Secteurs</h3>
                </div>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Secteurs des bénévoles</p>
              </div>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setShowAddSectorForm(!showAddSectorForm)}
              >
                <Plus size={16} />
              </Button>
            </CardHeader>
            <CardBody>
              <div className="space-y-1">
                {showAddSectorForm && (
                  <div className="flex flex-col gap-2 p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                    <Input
                      value={sectorForm.name}
                      onChange={(e) => setSectorForm({ ...sectorForm, name: e.target.value })}
                      placeholder="Nom..."
                      className="text-sm"
                      autoFocus
                    />
                    <select
                      value={sectorForm.department_id}
                      onChange={(e) => setSectorForm({ ...sectorForm, department_id: e.target.value })}
                      className="input text-sm"
                    >
                      <option value="">-- Département --</option>
                      {departments?.map((dept) => (
                        <option key={dept.id} value={dept.id}>{dept.name}</option>
                      ))}
                    </select>
                    <div className="flex gap-2 justify-end">
                      <Button size="sm" variant="primary" onClick={handleSaveSector}>OK</Button>
                      <Button size="sm" variant="ghost" onClick={handleCancelEditSector}>X</Button>
                    </div>
                  </div>
                )}

                {!sectors || sectors.length === 0 ? (
                  <p className="text-xs py-4 text-center" style={{ color: 'var(--text-muted)' }}>
                    Aucune option
                  </p>
                ) : (
                  <div className="space-y-1">
                    {sectors?.map((sector) => (
                      <div key={sector.id} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                        <GripVertical className="w-4 h-4 text-gray-400" />
                        {editingSectorId === sector.id ? (
                          <>
                            <Input
                              value={sectorForm.name}
                              onChange={(e) => setSectorForm({ ...sectorForm, name: e.target.value })}
                              className="flex-1 text-sm"
                              autoFocus
                            />
                            <Button size="sm" variant="ghost" onClick={handleSaveSector}>OK</Button>
                          </>
                        ) : (
                          <>
                            <div className="flex-1">
                              <span className="text-xs text-gray-700 dark:text-gray-300 truncate block">
                                {sector.name}
                              </span>
                              <span className="text-xs text-gray-500 dark:text-gray-500">
                                {sector.department?.name}
                              </span>
                            </div>
                            <Button size="sm" variant="ghost" className="p-1" onClick={() => handleEditSector(sector)}>
                              <Edit2 className="w-3.5 h-3.5" />
                            </Button>
                            <Button size="sm" variant="ghost" className="p-1 text-red-500 hover:text-red-600" onClick={() => setDeleteConfirm({ type: 'sector', id: sector.id, name: sector.name })}>
                              <Trash2 className="w-3.5 h-3.5" />
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
      )}

      {/* Confirmation de suppression */}
      <ConfirmDialog
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={async () => {
          if (!deleteConfirm) return;
          
          try {
            if (deleteConfirm.type === 'status') {
              await deleteStatus(deleteConfirm.id);
              success('Statut supprime');
            } else if (deleteConfirm.type === 'category') {
              await deleteCategory(deleteConfirm.id);
              success('Categorie supprimee');
            } else if (deleteConfirm.type === 'department') {
              await deleteDepartment(deleteConfirm.id);
              success('Departement supprime');
            } else if (deleteConfirm.type === 'sector') {
              await deleteSector(deleteConfirm.id);
              success('Secteur supprime');
            }
            
            setDeleteConfirm(null);
          } catch (err: any) {
            toastError(err.message || 'Erreur suppression');
          }
        }}
        title="Confirmer la suppression"
        message={`Etes-vous sur de vouloir supprimer "${deleteConfirm?.name}" ?`}
        confirmText="Supprimer"
        variant="danger"
      />
    </div>
  );
}
