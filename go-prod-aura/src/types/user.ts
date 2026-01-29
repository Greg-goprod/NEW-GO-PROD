export type UserRole = 'owner' | 'admin' | 'manager' | 'user';

export interface Profile {
  id: string;              // = auth user id
  full_name: string | null;
  avatar_url: string | null;
  role: UserRole;          // stocké dans profiles.role (prévu multi-tenant)
  company_id?: string | null; // prêt pour multi-tenant, inutilisé pour l'instant
}

export type InvitationStatus = 'pending' | 'accepted' | 'cancelled' | 'expired';

export interface UserInvitation {
  id: string;
  company_id: string;
  email: string;
  role_id: number | null;
  invited_by: string | null;
  invited_user_id: string | null;
  token_hash: string;
  status: InvitationStatus;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
  updated_at: string;
  role_name?: string | null;
}
