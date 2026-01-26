import { useState } from 'react';
import { Users, Award, UsersRound, Plus, Edit2, Trash2, GripVertical } from 'lucide-react';
import { Card, CardHeader, CardBody } from '@/components/aura/Card';
import { Button } from '@/components/aura/Button';
import { Input } from '@/components/aura/Input';
import { useToast } from '@/components/aura/ToastProvider';
import { ConfirmDialog } from '@/components/aura/ConfirmDialog';
import { useStaffLookups } from '@/hooks/useStaffLookups';
import type {
  StaffVolunteerStatus,
  StaffVolunteerGroup,
  StaffVolunteerSkill,
} from '@/types/staff';

export default function SettingsStaffPage() {
  const { success, error: toastError } = useToast();
  const {
    statuses,
    groups,
    skills,
    loading,
    createStatus,
    updateStatus,
    deleteStatus,
    createGroup,
    updateGroup,
    deleteGroup,
    createSkill,
    updateSkill,
    deleteSkill,
  } = useStaffLookups();

  // États pour les statuts
  const [showAddStatusForm, setShowAddStatusForm] = useState(false);
  const [editingStatusId, setEditingStatusId] = useState<string | null>(null);
  const [statusForm, setStatusForm] = useState({ name: '', color: '#10b981' });

  // États pour les groupes
  const [showAddGroupForm, setShowAddGroupForm] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [groupForm, setGroupForm] = useState({ name: '', description: '' });

  // États pour les compétences
  const [showAddSkillForm, setShowAddSkillForm] = useState(false);
  const [editingSkillId, setEditingSkillId] = useState<string | null>(null);
  const [skillForm, setSkillForm] = useState({ name: '', description: '' });

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
  // Handlers Groupes
  // ───────────────────────────────────────────────────────────────────────────
  
  const handleEditGroup = (group: StaffVolunteerGroup) => {
    setEditingGroupId(group.id);
    setGroupForm({ name: group.name, description: group.description || '' });
  };

  const handleSaveGroup = async () => {
    if (!groupForm.name.trim()) {
      toastError('Le nom est requis');
      return;
    }

    try {
      if (editingGroupId) {
        await updateGroup(editingGroupId, {
          name: groupForm.name,
          description: groupForm.description || null,
        });
        success('Groupe mis à jour');
      } else {
        await createGroup(groupForm.name, groupForm.description);
        success('Groupe créé');
      }
      setEditingGroupId(null);
      setShowAddGroupForm(false);
      setGroupForm({ name: '', description: '' });
    } catch (err: any) {
      toastError(err.message || 'Erreur lors de la sauvegarde');
    }
  };

  const handleCancelEditGroup = () => {
    setEditingGroupId(null);
    setShowAddGroupForm(false);
    setGroupForm({ name: '', description: '' });
  };

  // ───────────────────────────────────────────────────────────────────────────
  // Handlers Compétences
  // ───────────────────────────────────────────────────────────────────────────
  
  const handleEditSkill = (skill: StaffVolunteerSkill) => {
    setEditingSkillId(skill.id);
    setSkillForm({ name: skill.name, description: skill.description || '' });
  };

  const handleSaveSkill = async () => {
    if (!skillForm.name.trim()) {
      toastError('Le nom est requis');
      return;
    }

    try {
      if (editingSkillId) {
        await updateSkill(editingSkillId, {
          name: skillForm.name,
          description: skillForm.description || null,
        });
        success('Compétence mise à jour');
      } else {
        await createSkill(skillForm.name, skillForm.description);
        success('Compétence créée');
      }
      setEditingSkillId(null);
      setShowAddSkillForm(false);
      setSkillForm({ name: '', description: '' });
    } catch (err: any) {
      toastError(err.message || 'Erreur lors de la sauvegarde');
    }
  };

  const handleCancelEditSkill = () => {
    setEditingSkillId(null);
    setShowAddSkillForm(false);
    setSkillForm({ name: '', description: '' });
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Colonne STATUTS */}
          <div>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Users className="w-5 h-5 text-violet-400" />
                      <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Statuts</h3>
                    </div>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Statuts des benevoles</p>
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setShowAddStatusForm(!showAddStatusForm)}
                  >
                    <Plus size={16} className="mr-1" />
                    Ajouter
                  </Button>
                </div>
              </CardHeader>
              <CardBody>
                <div className="space-y-2">
                  {/* Formulaire d'ajout */}
                  {showAddStatusForm && (
                    <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: 'var(--bg-surface)' }}>
                      <Input
                        value={statusForm.name}
                        onChange={(e) => setStatusForm({ ...statusForm, name: e.target.value })}
                        placeholder="Nom du statut..."
                        className="flex-1"
                        autoFocus
                      />
                      <input
                        type="color"
                        value={statusForm.color}
                        onChange={(e) => setStatusForm({ ...statusForm, color: e.target.value })}
                        className="w-10 h-10 rounded border border-gray-300 dark:border-gray-600 cursor-pointer"
                      />
                      <Button size="sm" variant="primary" onClick={handleSaveStatus}>
                        Ajouter
                      </Button>
                      <Button size="sm" variant="ghost" onClick={handleCancelEditStatus}>
                        Annuler
                      </Button>
                    </div>
                  )}

                  {/* Liste des statuts */}
                  {!statuses || statuses.length === 0 ? (
                    <p className="text-sm py-4 text-center" style={{ color: 'var(--text-muted)' }}>
                      Aucune option definie. Cliquez sur "Ajouter" pour en creer.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {statuses?.map((status) => (
                        <div key={status.id} className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                          <div className="text-gray-400">
                            <GripVertical className="w-5 h-5" />
                          </div>

                          {editingStatusId === status.id ? (
                            <>
                              <Input
                                value={statusForm.name}
                                onChange={(e) => setStatusForm({ ...statusForm, name: e.target.value })}
                                className="flex-1"
                                autoFocus
                              />
                              <input
                                type="color"
                                value={statusForm.color}
                                onChange={(e) => setStatusForm({ ...statusForm, color: e.target.value })}
                                className="w-10 h-10 rounded border border-gray-300 dark:border-gray-600 cursor-pointer"
                              />
                              <Button size="sm" variant="primary" onClick={handleSaveStatus}>
                                ✓
                              </Button>
                              <Button size="sm" variant="secondary" onClick={handleCancelEditStatus}>
                                ✗
                              </Button>
                            </>
                          ) : (
                            <>
                              <div
                                className="w-4 h-4 rounded-full flex-shrink-0"
                                style={{ backgroundColor: status.color }}
                              />
                              <span className="flex-1 text-sm text-gray-700 dark:text-gray-300">
                                {status.name}
                              </span>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleEditStatus(status)}
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setDeleteConfirm({ type: 'status', id: status.id, name: status.name })}
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

          {/* Colonne GROUPES & COMPÉTENCES */}
          <div className="space-y-6">
            {/* Groupes */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <UsersRound className="w-5 h-5 text-violet-400" />
                      <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Groupes</h3>
                    </div>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Groupes de benevoles</p>
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setShowAddGroupForm(!showAddGroupForm)}
                  >
                    <Plus size={16} className="mr-1" />
                    Ajouter
                  </Button>
                </div>
              </CardHeader>
              <CardBody>
                <div className="space-y-2">
                  {showAddGroupForm && (
                    <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: 'var(--bg-surface)' }}>
                      <Input
                        value={groupForm.name}
                        onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })}
                        placeholder="Nom du groupe..."
                        autoFocus
                      />
                      <Button size="sm" variant="primary" onClick={handleSaveGroup}>
                        Ajouter
                      </Button>
                      <Button size="sm" variant="ghost" onClick={handleCancelEditGroup}>
                        Annuler
                      </Button>
                    </div>
                  )}

                  {!groups || groups.length === 0 ? (
                    <p className="text-sm py-4 text-center" style={{ color: 'var(--text-muted)' }}>
                      Aucune option definie. Cliquez sur "Ajouter" pour en creer.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {groups?.map((group) => (
                        <div key={group.id} className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                          <div className="text-gray-400">
                            <GripVertical className="w-5 h-5" />
                          </div>

                          {editingGroupId === group.id ? (
                            <>
                              <Input
                                value={groupForm.name}
                                onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })}
                                className="flex-1"
                                autoFocus
                              />
                              <Button size="sm" variant="primary" onClick={handleSaveGroup}>
                                ✓
                              </Button>
                              <Button size="sm" variant="secondary" onClick={handleCancelEditGroup}>
                                ✗
                              </Button>
                            </>
                          ) : (
                            <>
                              <span className="flex-1 text-sm text-gray-700 dark:text-gray-300">
                                {group.name}
                              </span>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleEditGroup(group)}
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setDeleteConfirm({ type: 'group', id: group.id, name: group.name })}
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

            {/* Compétences */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Award className="w-5 h-5 text-violet-400" />
                      <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Competences</h3>
                    </div>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Competences des benevoles</p>
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setShowAddSkillForm(!showAddSkillForm)}
                  >
                    <Plus size={16} className="mr-1" />
                    Ajouter
                  </Button>
                </div>
              </CardHeader>
              <CardBody>
                <div className="space-y-2">
                  {showAddSkillForm && (
                    <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: 'var(--bg-surface)' }}>
                      <Input
                        value={skillForm.name}
                        onChange={(e) => setSkillForm({ ...skillForm, name: e.target.value })}
                        placeholder="Nom de la compétence..."
                        autoFocus
                      />
                      <Button size="sm" variant="primary" onClick={handleSaveSkill}>
                        Ajouter
                      </Button>
                      <Button size="sm" variant="ghost" onClick={handleCancelEditSkill}>
                        Annuler
                      </Button>
                    </div>
                  )}

                  {!skills || skills.length === 0 ? (
                    <p className="text-sm py-4 text-center" style={{ color: 'var(--text-muted)' }}>
                      Aucune option definie. Cliquez sur "Ajouter" pour en creer.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {skills?.map((skill) => (
                        <div key={skill.id} className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                          <div className="text-gray-400">
                            <GripVertical className="w-5 h-5" />
                          </div>

                          {editingSkillId === skill.id ? (
                            <>
                              <Input
                                value={skillForm.name}
                                onChange={(e) => setSkillForm({ ...skillForm, name: e.target.value })}
                                className="flex-1"
                                autoFocus
                              />
                              <Button size="sm" variant="primary" onClick={handleSaveSkill}>
                                ✓
                              </Button>
                              <Button size="sm" variant="secondary" onClick={handleCancelEditSkill}>
                                ✗
                              </Button>
                            </>
                          ) : (
                            <>
                              <span className="flex-1 text-sm text-gray-700 dark:text-gray-300">
                                {skill.name}
                              </span>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleEditSkill(skill)}
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setDeleteConfirm({ type: 'skill', id: skill.id, name: skill.name })}
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
              success('Statut supprimé');
            } else if (deleteConfirm.type === 'group') {
              await deleteGroup(deleteConfirm.id);
              success('Groupe supprimé');
            } else if (deleteConfirm.type === 'skill') {
              await deleteSkill(deleteConfirm.id);
              success('Compétence supprimée');
            }
            
            setDeleteConfirm(null);
          } catch (err: any) {
            toastError(err.message || 'Erreur suppression');
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
