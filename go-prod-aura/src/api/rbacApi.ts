import { supabase } from '@/lib/supabaseClient';
import type {
  PermissionActionId,
  PermissionKey,
  RbacRole,
  RbacRoleInput,
} from '@/types/rbac';
import {
  getAllPermissionKeys,
  buildPermissionKey,
} from '@/config/permissionsMatrix';

const RBAC_MODE =
  import.meta.env.VITE_RBAC_MODE ?? (import.meta.env.DEV ? 'local' : 'supabase');
const isSupabaseMode = RBAC_MODE === 'supabase';

type DevTenantState = {
  roles: RbacRole[];
  rolePermissions: Record<string, PermissionKey[]>;
};

type DevStore = {
  tenants: Record<string, DevTenantState>;
};

const DEV_STORAGE_KEY = 'aura-rbac-dev-store';

const baseDevStore: DevStore = {
  tenants: {},
};

const allPermissionKeys = getAllPermissionKeys();

function nowISO() {
  return new Date().toISOString();
}

function generateId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `role-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function cloneStore<T>(payload: T): T {
  return JSON.parse(JSON.stringify(payload));
}

function ensureBrowserStore(): DevStore {
  if (typeof window === 'undefined') {
    if (!baseDevStore.tenants.__memory__) {
      baseDevStore.tenants.__memory__ = createDefaultTenantState('__memory__');
    }
    return baseDevStore;
  }

  const raw = window.localStorage.getItem(DEV_STORAGE_KEY);
  if (!raw) {
    const fresh: DevStore = { tenants: {} };
    window.localStorage.setItem(DEV_STORAGE_KEY, JSON.stringify(fresh));
    return fresh;
  }

  try {
    return JSON.parse(raw) as DevStore;
  } catch (error) {
    console.warn('[RBAC] Impossible de parser le store local, reset', error);
    const fresh: DevStore = { tenants: {} };
    window.localStorage.setItem(DEV_STORAGE_KEY, JSON.stringify(fresh));
    return fresh;
  }
}

function persistDevStore(store: DevStore) {
  if (typeof window === 'undefined') {
    baseDevStore.tenants.__memory__ = cloneStore(
      store.tenants.__memory__ ?? createDefaultTenantState('__memory__')
    );
    return;
  }
  window.localStorage.setItem(DEV_STORAGE_KEY, JSON.stringify(store));
}

function createDefaultTenantState(companyId: string): DevTenantState {
  const timestamp = nowISO();
  const adminRole: RbacRole = {
    id: generateId(),
    company_id: companyId,
    name: 'Administrateur',
    description: 'Accès complet à toutes les pages',
    is_system: true,
    created_at: timestamp,
    updated_at: timestamp,
  };

  const accountantRole: RbacRole = {
    id: generateId(),
    company_id: companyId,
    name: 'Comptable',
    description: 'Lecture artistes & contrats, gestion finances',
    is_system: false,
    created_at: timestamp,
    updated_at: timestamp,
  };

  const accountantPermissions = allPermissionKeys.filter((key) => {
    const isFinanceKey = key.startsWith('admin.finances:');
    const isArtistRead =
      key === buildPermissionKey('artists.list', 'read') ||
      key === buildPermissionKey('artists.contracts', 'read');
    const isContractRead =
      key === buildPermissionKey('admin.contracts', 'read');
    return isFinanceKey || isArtistRead || isContractRead;
  });

  return {
    roles: [adminRole, accountantRole],
    rolePermissions: {
      [adminRole.id]: [...allPermissionKeys],
      [accountantRole.id]: accountantPermissions,
    },
  };
}

function getTenantState(store: DevStore, companyId: string): DevTenantState {
  if (!store.tenants[companyId]) {
    store.tenants[companyId] = createDefaultTenantState(companyId);
    persistDevStore(store);
  }
  return store.tenants[companyId];
}

async function simulateNetworkDelay() {
  return new Promise((resolve) => setTimeout(resolve, 250));
}

export async function fetchRbacRoles(companyId: string): Promise<RbacRole[]> {
  if (!isSupabaseMode) {
    const store = ensureBrowserStore();
    const tenantState = getTenantState(store, companyId);
    await simulateNetworkDelay();
    return tenantState.roles;
  }

  const { data, error } = await supabase
    .from('rbac_roles')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data as RbacRole[];
}

export async function createRbacRole(
  companyId: string,
  payload: RbacRoleInput
): Promise<RbacRole> {
  if (!isSupabaseMode) {
    const store = ensureBrowserStore();
    const tenantState = getTenantState(store, companyId);
    const timestamp = nowISO();
    const newRole: RbacRole = {
      id: generateId(),
      company_id: companyId,
      name: payload.name,
      description: payload.description ?? null,
      is_system: false,
      created_at: timestamp,
      updated_at: timestamp,
    };

    tenantState.roles = [...tenantState.roles, newRole];
    tenantState.rolePermissions[newRole.id] = [];
    persistDevStore(store);
    await simulateNetworkDelay();
    return newRole;
  }

  const { data, error } = await supabase
    .from('rbac_roles')
    .insert({
      company_id: companyId,
      name: payload.name,
      description: payload.description ?? null,
    })
    .select('*')
    .single();

  if (error) throw error;
  return data as RbacRole;
}

export async function updateRbacRole(
  companyId: string,
  roleId: string,
  payload: RbacRoleInput
): Promise<RbacRole> {
  if (!isSupabaseMode) {
    const store = ensureBrowserStore();
    const tenantState = getTenantState(store, companyId);
    tenantState.roles = tenantState.roles.map((role) =>
      role.id === roleId
        ? {
            ...role,
            name: payload.name,
            description: payload.description ?? null,
            updated_at: nowISO(),
          }
        : role
    );
    persistDevStore(store);
    await simulateNetworkDelay();
    return tenantState.roles.find((role) => role.id === roleId)!;
  }

  const { data, error } = await supabase
    .from('rbac_roles')
    .update({
      name: payload.name,
      description: payload.description ?? null,
    })
    .eq('company_id', companyId)
    .eq('id', roleId)
    .select('*')
    .single();

  if (error) throw error;
  return data as RbacRole;
}

export async function deleteRbacRole(
  companyId: string,
  roleId: string
): Promise<void> {
  if (!isSupabaseMode) {
    const store = ensureBrowserStore();
    const tenantState = getTenantState(store, companyId);
    const role = tenantState.roles.find((r) => r.id === roleId);
    if (role?.is_system) {
      throw new Error('Impossible de supprimer un rôle système');
    }
    tenantState.roles = tenantState.roles.filter((role) => role.id !== roleId);
    delete tenantState.rolePermissions[roleId];
    persistDevStore(store);
    await simulateNetworkDelay();
    return;
  }

  const { error } = await supabase
    .from('rbac_roles')
    .delete()
    .eq('company_id', companyId)
    .eq('id', roleId);
  if (error) throw error;
}

export async function fetchRolePermissions(
  roleId: string,
  companyId?: string
): Promise<PermissionKey[]> {
  if (!isSupabaseMode) {
    if (!companyId) {
      throw new Error('companyId requis en mode dev');
    }
    const store = ensureBrowserStore();
    const tenantState = getTenantState(store, companyId);
    await simulateNetworkDelay();
    return tenantState.rolePermissions[roleId] ?? [];
  }

  const { data, error } = await supabase
    .from('rbac_role_permissions')
    .select('permission_key')
    .eq('role_id', roleId);

  if (error) throw error;
  return (data ?? []).map((entry) => entry.permission_key as string);
}

export async function saveRolePermissions(
  roleId: string,
  permissions: PermissionKey[],
  companyId?: string
): Promise<void> {
  if (!isSupabaseMode) {
    if (!companyId) {
      throw new Error('companyId requis en mode dev');
    }
    const store = ensureBrowserStore();
    const tenantState = getTenantState(store, companyId);
    tenantState.rolePermissions[roleId] = [...new Set(permissions)];
    persistDevStore(store);
    await simulateNetworkDelay();
    return;
  }

  const client = supabase;
  const deleteResponse = await client
    .from('rbac_role_permissions')
    .delete()
    .eq('role_id', roleId);
  if (deleteResponse.error) throw deleteResponse.error;

  if (!permissions.length) {
    return;
  }

  const { error } = await client.from('rbac_role_permissions').insert(
    permissions.map((permission_key) => ({
      role_id: roleId,
      permission_key,
    }))
  );

  if (error) throw error;
}

export function isRbacDevBypassEnabled() {
  return !isSupabaseMode;
}

export function buildPagePermission(
  pageId: string,
  action: PermissionActionId
): PermissionKey {
  return buildPermissionKey(pageId, action);
}


