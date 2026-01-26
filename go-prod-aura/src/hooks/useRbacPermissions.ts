import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { getCurrentCompanyId } from '@/lib/tenant';
import type {
  PermissionActionId,
  PermissionKey,
  RbacRole,
  RbacRoleInput,
} from '@/types/rbac';
import {
  DEFAULT_PERMISSION_ACTIONS,
  PERMISSION_MODULES,
  buildPermissionKey,
  getAllPermissionKeys,
} from '@/config/permissionsMatrix';
import {
  createRbacRole,
  deleteRbacRole,
  fetchRbacRoles,
  fetchRolePermissions,
  isRbacDevBypassEnabled,
  saveRolePermissions,
  updateRbacRole,
} from '@/api/rbacApi';
import { useToast } from '@/components/aura/ToastProvider';

const ALL_PERMISSION_KEYS = getAllPermissionKeys();
const EDIT_ACTIONS: PermissionActionId[] = ['create', 'update'];
const SETTINGS_PROFILE_PAGE_ID = 'settings.profile';
const SETTINGS_PROFILE_KEY = buildPermissionKey(
  SETTINGS_PROFILE_PAGE_ID,
  'read'
);
const ALL_PAGES = PERMISSION_MODULES.flatMap((module) => module.pages);
const SETTINGS_PAGE_IDS = ALL_PAGES.filter((page) =>
  page.id.startsWith('settings.')
).map((page) => page.id);

function clearSettingsScope(
  permissions: Set<PermissionKey>,
  settingsPageId: string
) {
  DEFAULT_PERMISSION_ACTIONS.forEach((action) => {
    permissions.delete(buildPermissionKey(settingsPageId, action));
  });
}

function normalizePermissionSet(
  input: Set<PermissionKey>
): Set<PermissionKey> {
  const next = new Set(input);
  let hasEditorRights = false;
  const scopeStatus = new Map<string, boolean>();

  ALL_PAGES.forEach((page) => {
    const hasEdit = EDIT_ACTIONS.some((action) =>
      next.has(buildPermissionKey(page.id, action))
    );
    if (hasEdit) {
      hasEditorRights = true;
    }
    if (page.settingsScope) {
      if (hasEdit) {
        scopeStatus.set(page.settingsScope, true);
        next.add(buildPermissionKey(page.settingsScope, 'read'));
      } else if (!scopeStatus.has(page.settingsScope)) {
        scopeStatus.set(page.settingsScope, false);
      }
    }
  });

  scopeStatus.forEach((isActive, scopeId) => {
    if (!isActive) {
      clearSettingsScope(next, scopeId);
    }
  });

  if (!hasEditorRights) {
    SETTINGS_PAGE_IDS.forEach((settingsPageId) => {
      if (settingsPageId !== SETTINGS_PROFILE_PAGE_ID) {
        clearSettingsScope(next, settingsPageId);
      }
    });
  }

  next.add(SETTINGS_PROFILE_KEY);

  return next;
}

function areSetsEqual(a: Set<PermissionKey>, b: Set<PermissionKey>) {
  if (a.size !== b.size) return false;
  for (const entry of a) {
    if (!b.has(entry)) return false;
  }
  return true;
}

export function useRbacPermissions() {
  const { success, error: toastError } = useToast();
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [roles, setRoles] = useState<RbacRole[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [loadingRoles, setLoadingRoles] = useState(true);
  const [loadingPermissions, setLoadingPermissions] = useState(false);
  const [savingPermissions, setSavingPermissions] = useState(false);
  const [draftPermissions, setDraftPermissions] = useState<
    Set<PermissionKey>
  >(new Set());
  const [savedPermissions, setSavedPermissions] = useState<
    Set<PermissionKey>
  >(new Set());
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const cid = await getCurrentCompanyId(supabase);
        setCompanyId(cid);
      } catch (error) {
        console.error('[RBAC] Impossible de récupérer le tenant', error);
        toastError(
          'Erreur',
          "Impossible de récupérer l’entreprise courante pour COMPTE"
        );
      }
    })();
  }, [toastError]);

  const loadRoles = useCallback(async () => {
    if (!companyId) return;
    setLoadingRoles(true);
    try {
      const data = await fetchRbacRoles(companyId);
      setRoles(data);
      setSelectedRoleId((previous) => {
        if (previous && data.some((role) => role.id === previous)) {
          return previous;
        }
        return data[0]?.id ?? null;
      });
    } catch (error) {
      console.error('[RBAC] Erreur chargement rôles', error);
      toastError('Erreur', 'Impossible de charger les fonctions');
    } finally {
      setLoadingRoles(false);
    }
  }, [companyId, toastError]);

  useEffect(() => {
    loadRoles();
  }, [loadRoles]);

  useEffect(() => {
    if (!companyId || !selectedRoleId) {
      setDraftPermissions(new Set());
      setSavedPermissions(new Set());
      setIsDirty(false);
      return;
    }

    let active = true;
    setLoadingPermissions(true);
    (async () => {
      try {
        const permissions = await fetchRolePermissions(selectedRoleId, companyId);
        if (!active) return;
        const syncedSet = normalizePermissionSet(new Set(permissions));
        setSavedPermissions(syncedSet);
        setDraftPermissions(new Set(syncedSet));
        setIsDirty(false);
      } catch (error) {
        if (!active) return;
        console.error('[RBAC] Erreur chargement permissions', error);
        toastError('Erreur', 'Impossible de charger les droits de la fonction');
      } finally {
        if (active) {
          setLoadingPermissions(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [companyId, selectedRoleId, toastError]);

  const applyDraftUpdate = useCallback(
    (mutator: (current: Set<PermissionKey>) => Set<PermissionKey>) => {
      setDraftPermissions((current) => {
        const next = normalizePermissionSet(mutator(current));
        setIsDirty(!areSetsEqual(next, savedPermissions));
        return next;
      });
    },
    [savedPermissions]
  );

  const togglePermission = useCallback(
    (permission: PermissionKey) => {
      applyDraftUpdate((current) => {
        const next = new Set(current);
        if (next.has(permission)) {
          next.delete(permission);
        } else {
          next.add(permission);
        }
        return next;
      });
    },
    [applyDraftUpdate]
  );

  const setPermissionsForPage = useCallback(
    (pageId: string, actions: PermissionActionId[], enable: boolean) => {
      applyDraftUpdate((current) => {
        const next = new Set(current);
        actions.forEach((action) => {
          const key = buildPermissionKey(pageId, action);
          if (enable) {
            next.add(key);
          } else {
            next.delete(key);
          }
        });
        return next;
      });
    },
    [applyDraftUpdate]
  );

  const setPermissionsForAction = useCallback(
    (action: PermissionActionId, enable: boolean) => {
      applyDraftUpdate((current) => {
        const next = new Set(current);
        ALL_PERMISSION_KEYS.forEach((key) => {
          if (key.endsWith(`:${action}`)) {
            if (enable) {
              next.add(key);
            } else {
              next.delete(key);
            }
          }
        });
        return next;
      });
    },
    [applyDraftUpdate]
  );

  const setAllPermissions = useCallback(
    (enable: boolean) => {
      applyDraftUpdate(() => {
        return enable ? new Set(ALL_PERMISSION_KEYS) : new Set();
      });
    },
    [applyDraftUpdate]
  );

  const resetDraft = useCallback(() => {
    setDraftPermissions(new Set(savedPermissions));
    setIsDirty(false);
  }, [savedPermissions]);

  const saveCurrentPermissions = useCallback(async () => {
    if (!companyId || !selectedRoleId) return;
    setSavingPermissions(true);
    try {
      await saveRolePermissions(
        selectedRoleId,
        Array.from(draftPermissions),
        companyId
      );
      const synced = new Set(draftPermissions);
      setSavedPermissions(synced);
      setIsDirty(false);
      success('Permissions enregistrées', 'Les droits ont été sauvegardés');
    } catch (error) {
      console.error('[RBAC] Erreur sauvegarde permissions', error);
      toastError('Erreur', 'Impossible de sauvegarder les droits');
      throw error;
    } finally {
      setSavingPermissions(false);
    }
  }, [
    companyId,
    draftPermissions,
    selectedRoleId,
    success,
    toastError,
  ]);

  const createRoleHandler = useCallback(
    async (payload: RbacRoleInput) => {
      if (!companyId) throw new Error('companyId manquant');
      try {
        const role = await createRbacRole(companyId, payload);
        setRoles((current) => [...current, role]);
        setSelectedRoleId(role.id);
        success('Fonction créée', 'Vous pouvez maintenant lui attribuer des droits');
        return role;
      } catch (error) {
        console.error('[RBAC] Erreur création rôle', error);
        toastError('Erreur', 'Impossible de créer la fonction');
        throw error;
      }
    },
    [companyId, success, toastError]
  );

  const updateRoleHandler = useCallback(
    async (roleId: string, payload: RbacRoleInput) => {
      if (!companyId) throw new Error('companyId manquant');
      try {
        const updated = await updateRbacRole(companyId, roleId, payload);
        setRoles((current) =>
          current.map((role) => (role.id === roleId ? updated : role))
        );
        success('Fonction mise à jour', 'Les informations ont été sauvegardées');
        return updated;
      } catch (error) {
        console.error('[RBAC] Erreur mise à jour rôle', error);
        toastError('Erreur', 'Impossible de modifier cette fonction');
        throw error;
      }
    },
    [companyId, success, toastError]
  );

  const deleteRoleHandler = useCallback(
    async (roleId: string) => {
      if (!companyId) throw new Error('companyId manquant');
      try {
        await deleteRbacRole(companyId, roleId);
        setRoles((current) => {
          const remaining = current.filter((role) => role.id !== roleId);
          setSelectedRoleId((prev) => {
            if (prev && prev !== roleId) {
              return prev;
            }
            return remaining[0]?.id ?? null;
          });
          return remaining;
        });
        success('Fonction supprimée', 'La fonction a été retirée');
      } catch (error) {
        console.error('[RBAC] Erreur suppression rôle', error);
        toastError('Erreur', 'Impossible de supprimer cette fonction');
        throw error;
      }
    },
    [companyId, success, toastError]
  );

  const selectedRole = useMemo(
    () => roles.find((role) => role.id === selectedRoleId) ?? null,
    [roles, selectedRoleId]
  );

  return {
    companyId,
    roles,
    selectedRole,
    selectedRoleId,
    selectRole: setSelectedRoleId,
    loadingRoles,
    loadingPermissions,
    savingPermissions,
    draftPermissions,
    isDirty,
    togglePermission,
    setPermissionsForPage,
    setPermissionsForAction,
    setAllPermissions,
    resetDraft,
    saveCurrentPermissions,
    createRole: createRoleHandler,
    updateRole: updateRoleHandler,
    deleteRole: deleteRoleHandler,
    refreshRoles: loadRoles,
    devBypassActive: isRbacDevBypassEnabled(),
  };
}


