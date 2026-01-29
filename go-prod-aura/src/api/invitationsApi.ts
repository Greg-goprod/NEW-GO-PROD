import { supabase } from '@/lib/supabaseClient';
import type { UserInvitation } from '@/types/user';
import { generateInviteToken, hashToken } from '@/utils/token';

const APP_URL =
  import.meta.env.VITE_APP_URL ||
  (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173');

type InvitationInsertPayload = {
  companyId: string;
  email: string;
  roleId: number | null;
  invitedBy: string | null;
  validityDays?: number;
};

export async function fetchInvitations(companyId: string): Promise<UserInvitation[]> {
  const { data, error } = await supabase
    .from('user_invitations')
    .select('*, role:rbac_roles(name)')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data ?? []).map((row) => ({
    ...(row as any),
    role_name: (row as any).role?.name ?? null,
  }));
}

export async function createInvitationRecord(
  payload: InvitationInsertPayload
): Promise<{ invitation: UserInvitation; token: string }> {
  const token = generateInviteToken();
  const tokenHash = await hashToken(token);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + (payload.validityDays ?? 7));

  const { data, error } = await supabase
    .from('user_invitations')
    .insert({
      company_id: payload.companyId,
      email: payload.email.toLowerCase(),
      role_id: payload.roleId,
      invited_by: payload.invitedBy,
      token_hash: tokenHash,
      status: 'pending',
      expires_at: expiresAt.toISOString(),
    })
    .select('*, role:rbac_roles(name)')
    .single();

  if (error) throw error;

  return {
    invitation: {
      ...(data as any),
      role_name: (data as any).role?.name ?? null,
    },
    token,
  };
}

export async function cancelInvitation(invitationId: string): Promise<void> {
  const { error } = await supabase
    .from('user_invitations')
    .update({ status: 'cancelled' })
    .eq('id', invitationId);

  if (error) throw error;
}

export async function regenerateInvitation(
  invitationId: string,
  validityDays = 7
): Promise<{ invitation: UserInvitation; token: string }> {
  const token = generateInviteToken();
  const tokenHash = await hashToken(token);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + validityDays);

  const { data, error } = await supabase
    .from('user_invitations')
    .update({
      token_hash: tokenHash,
      expires_at: expiresAt.toISOString(),
      status: 'pending',
      accepted_at: null,
      invited_user_id: null,
    })
    .eq('id', invitationId)
    .select('*, role:rbac_roles(name)')
    .single();

  if (error) throw error;

  return {
    invitation: {
      ...(data as any),
      role_name: (data as any).role?.name ?? null,
    },
    token,
  };
}

export async function markInvitationAccepted(
  invitationId: string,
  userId: string
): Promise<void> {
  const { error } = await supabase
    .from('user_invitations')
    .update({
      status: 'accepted',
      invited_user_id: userId,
      accepted_at: new Date().toISOString(),
    })
    .eq('id', invitationId);

  if (error) throw error;
}

export async function fetchInvitationByToken(
  rawToken: string
): Promise<UserInvitation | null> {
  const tokenHash = await hashToken(rawToken);
  const { data, error } = await supabase
    .from('user_invitations')
    .select('*, role:rbac_roles(name)')
    .eq('token_hash', tokenHash)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    ...(data as any),
    role_name: (data as any).role?.name ?? null,
  };
}

export async function assignRoleToUser(
  companyId: string,
  roleId: number,
  userId: string
): Promise<void> {
  const { error } = await supabase
    .from('rbac_user_roles')
    .upsert(
      {
        company_id: companyId,
        role_id: roleId,
        user_id: userId,
      },
      { onConflict: 'company_id,role_id,user_id' }
    );

  if (error) throw error;
}

export function buildInvitationLink(token: string): string {
  return `${APP_URL.replace(/\/$/, '')}/auth/invite?token=${encodeURIComponent(token)}`;
}

export async function sendInvitationEmail(params: {
  companyId: string;
  email: string;
  token: string;
  invitedByName?: string | null;
}): Promise<void> {
  const acceptUrl = buildInvitationLink(params.token);

  const html = `
    <div style="font-family: 'Segoe UI', sans-serif; line-height: 1.6; color: #111827;">
      <h2 style="color:#111827;">Invitation à rejoindre Go-Prod AURA</h2>
      <p>${params.invitedByName || 'Un administrateur'} vous invite à rejoindre la plateforme.</p>
      <p>Cliquez sur le bouton ci-dessous pour définir votre mot de passe :</p>
      <p style="text-align:center;margin:24px 0;">
        <a href="${acceptUrl}" style="background-color:#7c3aed;color:#fff;padding:12px 24px;border-radius:999px;text-decoration:none;font-weight:600;">
          Rejoindre la plateforme
        </a>
      </p>
      <p>Si le bouton ne fonctionne pas, copiez/collez ce lien dans votre navigateur :</p>
      <p style="word-break:break-all;"><a href="${acceptUrl}">${acceptUrl}</a></p>
      <p>Ce lien expirera automatiquement.</p>
    </div>
  `;

  const { error } = await supabase.functions.invoke('send-email', {
    body: {
      to: params.email,
      subject: 'Invitation à rejoindre Go-Prod AURA',
      html,
      text: `Vous êtes invité à rejoindre Go-Prod AURA. Ouvrez ${acceptUrl} pour finaliser votre accès.`,
      companyId: params.companyId,
    },
  });

  if (error) {
    throw new Error(error.message || 'Impossible d’envoyer l’invitation');
  }
}

