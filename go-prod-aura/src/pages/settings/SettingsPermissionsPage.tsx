import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckSquare,
  Eye,
  PenSquare,
  PlusCircle,
  ShieldCheck,
  Square,
  Trash2,
  UserPlus,
  type LucideIcon,
} from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/aura/Card';
import { Button } from '@/components/aura/Button';
import { Input } from '@/components/aura/Input';
import { Modal } from '@/components/aura/Modal';
import { ConfirmDialog } from '@/components/aura/ConfirmDialog';
import { useRbacPermissions } from '@/hooks/useRbacPermissions';
import {
  PERMISSION_MODULES,
  buildPermissionKey,
  getPageActions,
} from '@/config/permissionsMatrix';
import type { PermissionActionId, RbacRole } from '@/types/rbac';

type RoleModalState =
  | { open: false; mode: null; role: null }
  | { open: true; mode: 'create' | 'edit'; role: RbacRole | null };

interface ActionColumn {
  id: PermissionActionId;
  label: string;
  helper: string;
  icon: LucideIcon;
}

const ACTION_COLUMNS: ActionColumn[] = [
  { id: 'read', label: 'Lecture', helper: 'Consulter', icon: Eye },
  { id: 'create', label: 'Insérer', helper: 'Créer', icon: PlusCircle },
  { id: 'update', label: 'Modifier', helper: 'Mettre à jour', icon: PenSquare },
  { id: 'delete', label: 'Supprimer', helper: 'Effacer', icon: Trash2 },
];

export function SettingsPermissionsPage() {
  const {
    roles,
    selectedRole,
    selectedRoleId,
    selectRole,
    loadingRoles,
    loadingPermissions,
    savingPermissions,
    draftPermissions,
    isDirty,
    togglePermission,
    setPermissionsForPage,
    setAllPermissions,
    resetDraft,
    saveCurrentPermissions,
    createRole,
    updateRole,
    deleteRole,
    devBypassActive,
  } = useRbacPermissions();

  const [roleModal, setRoleModal] = useState<RoleModalState>({
    open: false,
    mode: null,
    role: null,
  });
  const [roleForm, setRoleForm] = useState({ name: '', description: '' });
  const [formError, setFormError] = useState<string | null>(null);
  const [roleSubmitting, setRoleSubmitting] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<RbacRole | null>(null);

  const selectedRoleTotals = useMemo(() => {
    if (!selectedRole) return { granted: 0, total: 0 };
    const allKeys = PERMISSION_MODULES.flatMap((module) =>
      module.pages.flatMap((page) => {
        const actions = getPageActions(page);
        return actions.map((action) => buildPermissionKey(page.id, action));
      })
    );
    const granted = allKeys.filter((key) => draftPermissions.has(key)).length;
    return { granted, total: allKeys.length };
  }, [selectedRole, draftPermissions]);

  const openCreateModal = () => {
    setRoleModal({ open: true, mode: 'create', role: null });
    setRoleForm({ name: '', description: '' });
    setFormError(null);
  };

  const openEditModal = (role: RbacRole) => {
    setRoleModal({ open: true, mode: 'edit', role });
    setRoleForm({
      name: role.name,
      description: role.description ?? '',
    });
    setFormError(null);
  };

  const closeRoleModal = () => {
    setRoleModal({ open: false, mode: null, role: null });
    setRoleForm({ name: '', description: '' });
    setFormError(null);
  };

  const handleRoleSubmit = async () => {
    const trimmedName = roleForm.name.trim();
    if (!trimmedName) {
      setFormError('Le nom de la fonction est obligatoire');
      return;
    }
    setFormError(null);
    setRoleSubmitting(true);
    try {
      if (roleModal.mode === 'create') {
        await createRole({
          name: trimmedName,
          description: roleForm.description.trim() || undefined,
        });
      } else if (roleModal.mode === 'edit' && roleModal.role) {
        await updateRole(roleModal.role.id, {
          name: trimmedName,
          description: roleForm.description.trim() || undefined,
        });
      }
      closeRoleModal();
    } finally {
      setRoleSubmitting(false);
    }
  };

  const handleTogglePage = (pageId: string) => {
    const page = PERMISSION_MODULES.flatMap((module) => module.pages).find(
      (p) => p.id === pageId
    );
    if (!page) return;
    const actions = getPageActions(page);
    const hasAll = actions.every((action) =>
      draftPermissions.has(buildPermissionKey(page.id, action))
    );
    setPermissionsForPage(page.id, actions, !hasAll);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <p className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>
            COMPTE
          </p>
          <p className="mt-1 text-sm max-w-3xl" style={{ color: 'var(--text-secondary)' }}>
            Creez des fonctions sur mesure et attribuez les droits page par
            page. Les reglages restent en mode developpement tant que le bypass
            est actif.
          </p>
        </div>
      </div>

      {devBypassActive && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-300/60 bg-amber-50 p-4 text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide">
              Mode développement actif
            </p>
            <p className="text-sm">
              Les autorisations ne bloquent pas encore l’application. Elles
              seront appliquées lors du déploiement en production.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card className="xl:col-span-1">
          <CardHeader className="flex-col items-start gap-2 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <ShieldCheck className="w-5 h-5 text-violet-400" />
              <h3 className="text-lg font-semibold">Fonctions utilisateurs</h3>
            </div>
            <Button
              size="sm"
              onClick={openCreateModal}
              className="ml-auto flex items-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              Nouvelle fonction
            </Button>
          </CardHeader>
          <CardBody className="space-y-4">
            {loadingRoles ? (
              <div className="space-y-3">
                {[1, 2, 3].map((key) => (
                  <div
                    key={key}
                    className="h-20 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse"
                  />
                ))}
              </div>
            ) : roles.length === 0 ? (
              <div 
                className="rounded-xl border border-dashed p-6 text-center text-sm"
                style={{ 
                  borderColor: 'var(--color-border)',
                  color: 'var(--text-muted)'
                }}
              >
                Aucune fonction pour le moment. Creez votre premiere fonction
                pour gerer les droits.
              </div>
            ) : (
              <div className="space-y-3">
                {roles.map((role) => {
                  const isSelected = role.id === selectedRoleId;
                  return (
                    <button
                      type="button"
                      key={role.id}
                      onClick={() => selectRole(role.id)}
                      className={`w-full rounded-2xl border p-4 text-left transition ${
                        isSelected
                          ? 'border-violet-500 bg-violet-50 dark:border-violet-400 dark:bg-violet-500/10'
                          : 'border-gray-200 dark:border-gray-700 hover:border-violet-300 dark:hover:border-violet-500/50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                            {role.name}
                          </p>
                          {role.description && (
                            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                              {role.description}
                            </p>
                          )}
                        </div>
                        {role.is_system && (
                          <span className="text-xs font-semibold uppercase tracking-wide text-violet-600 dark:text-violet-300">
                            Système
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2 mt-4">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="flex items-center gap-1"
                          onClick={(event) => {
                            event.stopPropagation();
                            openEditModal(role);
                          }}
                        >
                          <PenSquare className="w-4 h-4" />
                          Modifier
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={role.is_system}
                          className="flex items-center gap-1 text-red-600 hover:text-red-700"
                          onClick={(event) => {
                            event.stopPropagation();
                            setRoleToDelete(role);
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                          Supprimer
                        </Button>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </CardBody>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader className="flex flex-col gap-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Droits par page
                </p>
                {selectedRole ? (
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    {selectedRole.name} —{' '}
                    {selectedRoleTotals.granted} / {selectedRoleTotals.total}{' '}
                    permissions actives
                  </p>
                ) : (
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                    Selectionnez une fonction pour editer ses droits.
                  </p>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => resetDraft()}
                  disabled={!isDirty || !selectedRole}
                >
                  Réinitialiser
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setAllPermissions(false)}
                  disabled={!selectedRole}
                >
                  Tout retirer
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setAllPermissions(true)}
                  disabled={!selectedRole}
                >
                  Tout autoriser
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    void saveCurrentPermissions();
                  }}
                  disabled={!selectedRole || !isDirty || savingPermissions}
                  className="flex items-center gap-2"
                >
                  {savingPermissions && (
                    <span className="w-4 h-4 border-2 border-white/60 border-t-transparent rounded-full animate-spin" />
                  )}
                  Sauvegarder
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardBody>
            {!selectedRole ? (
              <div 
                className="rounded-xl border border-dashed p-6 text-center text-sm"
                style={{ 
                  borderColor: 'var(--color-border)',
                  color: 'var(--text-muted)'
                }}
              >
                Choisissez une fonction a gauche pour afficher les droits
                disponibles.
              </div>
            ) : loadingPermissions ? (
              <div className="py-12 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                Chargement des droits...
              </div>
            ) : (
              <div className="overflow-x-auto">
                <div className="min-w-[720px] space-y-6">
                  <div 
                    className="grid grid-cols-[minmax(250px,1fr)_repeat(4,minmax(120px,1fr))] gap-3 text-xs font-semibold uppercase"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    <span>Pages</span>
                    {ACTION_COLUMNS.map((action) => (
                      <div
                        key={action.id}
                        className="text-center flex flex-col items-center gap-1"
                      >
                        <action.icon className="w-4 h-4" />
                        {action.label}
                      </div>
                    ))}
                  </div>

                  {PERMISSION_MODULES.map((module) => (
                    <div key={module.id} className="space-y-4">
                      <div 
                        className="text-xs font-semibold uppercase tracking-wide"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        {module.label}
                      </div>
                      <div className="space-y-4">
                        {module.pages.map((page) => {
                          const actions = getPageActions(page);
                          return (
                            <div
                              key={page.id}
                              className="grid grid-cols-[minmax(250px,1fr)_repeat(4,minmax(120px,1fr))] gap-3 rounded-2xl p-4"
                              style={{ border: '1px solid var(--color-border)' }}
                            >
                              <div className="space-y-2">
                                <div className="flex items-center justify-between gap-2">
                                  <div>
                                    <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
                                      {page.label}
                                    </p>
                                    {page.description && (
                                      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                                        {page.description}
                                      </p>
                                    )}
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleTogglePage(page.id)}
                                  >
                                    {actions.every((action) =>
                                      draftPermissions.has(
                                        buildPermissionKey(page.id, action)
                                      )
                                    )
                                      ? 'Tout retirer'
                                      : 'Tout accorder'}
                                  </Button>
                                </div>
                              </div>
                              {ACTION_COLUMNS.map((action) => {
                                const isSupported = actions.includes(action.id);
                                const permissionKey = buildPermissionKey(
                                  page.id,
                                  action.id
                                );
                                const checked =
                                  isSupported &&
                                  draftPermissions.has(permissionKey);

                                return (
                                  <div
                                    key={`${page.id}-${action.id}`}
                                    className="flex items-center justify-center"
                                  >
                                    {isSupported ? (
                                      <PermissionCheckbox
                                        checked={checked}
                                        label={`${action.label} — ${page.label}`}
                                        onChange={() =>
                                          togglePermission(permissionKey)
                                        }
                                      />
                                    ) : (
                                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                        —
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {roleModal.open && (
        <Modal
          open={roleModal.open}
          onClose={closeRoleModal}
          title={roleModal.mode === 'create' ? 'Nouvelle fonction' : 'Modifier la fonction'}
          widthClass="max-w-xl"
        >
          <div className="space-y-4">
            <Input
              label="Nom de la fonction"
              placeholder="Ex. Comptable, Booking manager..."
              value={roleForm.name}
              onChange={(event) =>
                setRoleForm((prev) => ({ ...prev, name: event.target.value }))
              }
              error={formError || undefined}
            />
            <div>
              <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                Description (optionnel)
              </label>
              <textarea
                className="w-full mt-2 min-h-[120px] px-3 py-2 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500"
                style={{ 
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--text-primary)'
                }}
                placeholder="Decrivez rapidement le perimetre de cette fonction"
                value={roleForm.description}
                onChange={(event) =>
                  setRoleForm((prev) => ({
                    ...prev,
                    description: event.target.value,
                  }))
                }
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" onClick={closeRoleModal}>
                Annuler
              </Button>
              <Button onClick={handleRoleSubmit} disabled={roleSubmitting}>
                {roleSubmitting ? 'Enregistrement...' : 'Enregistrer'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      <ConfirmDialog
        open={Boolean(roleToDelete)}
        onClose={() => setRoleToDelete(null)}
        onConfirm={() => {
          if (roleToDelete) {
            void deleteRole(roleToDelete.id);
          }
        }}
        title="Supprimer la fonction"
        message={
          roleToDelete
            ? `Confirmez-vous la suppression de "${roleToDelete.name}" ? Les attributions de droits liées seront effacées.`
            : ''
        }
        confirmText="Oui, supprimer"
      />
    </div>
  );
}

interface PermissionCheckboxProps {
  checked: boolean;
  label: string;
  onChange: () => void;
}

function PermissionCheckbox({
  checked,
  label,
  onChange,
}: PermissionCheckboxProps) {
  return (
    <label
      className={`flex h-12 w-12 cursor-pointer items-center justify-center rounded-xl border transition ${
        checked
          ? 'border-violet-500 bg-violet-100 text-violet-700 dark:border-violet-400 dark:bg-violet-500/20 dark:text-violet-200'
          : 'border-gray-200 bg-white text-gray-400 hover:border-violet-300 hover:text-violet-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-500 dark:hover:border-violet-500/40'
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="sr-only"
        aria-label={label}
      />
      {checked ? (
        <CheckSquare className="w-5 h-5" />
      ) : (
        <Square className="w-5 h-5" />
      )}
    </label>
  );
}

export default SettingsPermissionsPage;
