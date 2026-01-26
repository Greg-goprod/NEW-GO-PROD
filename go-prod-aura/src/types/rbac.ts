export type PermissionActionId = 'read' | 'create' | 'update' | 'delete';

export interface RbacRole {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

export interface RbacRoleInput {
  name: string;
  description?: string;
}

export interface RbacRoleUpdateInput extends RbacRoleInput {
  id: string;
}

export type PermissionKey = string;






















