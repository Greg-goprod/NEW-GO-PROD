export type UserRole = 'owner' | 'admin' | 'manager' | 'user';

export interface Profile {
  id: string;              // = auth user id
  full_name: string | null;
  avatar_url: string | null;
  role: UserRole;          // stocké dans profiles.role (prévu multi-tenant)
  company_id?: string | null; // prêt pour multi-tenant, inutilisé pour l'instant
}




