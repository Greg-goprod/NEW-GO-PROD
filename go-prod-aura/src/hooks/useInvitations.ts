import { useCallback, useEffect, useState } from 'react';
import type { UserInvitation } from '@/types/user';
import {
  assignRoleToUser,
  cancelInvitation,
  createInvitationRecord,
  fetchInvitationByToken,
  fetchInvitations,
  markInvitationAccepted,
  regenerateInvitation,
  sendInvitationEmail,
  buildInvitationLink,
} from '@/api/invitationsApi';
import { useToast } from '@/components/aura/ToastProvider';
import { supabase } from '@/lib/supabaseClient';

export function useInvitations(companyId?: string | null) {
  const { success, error: toastError } = useToast();
  const [invitations, setInvitations] = useState<UserInvitation[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const loadInvitations = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const rows = await fetchInvitations(companyId);
      setInvitations(rows);
    } catch (error) {
      console.error('[Invitations] loadInvitations error', error);
      toastError('Erreur', 'Impossible de charger les invitations');
    } finally {
      setLoading(false);
    }
  }, [companyId, toastError]);

  useEffect(() => {
    loadInvitations();
  }, [loadInvitations]);

  const sendInvite = useCallback(
    async (opts: { email: string; roleId: number | null; invitedBy: string | null; invitedByName?: string | null }) => {
      if (!companyId) return;
      setActionLoading(true);
      try {
        const { invitation, token } = await createInvitationRecord({
          companyId,
          email: opts.email,
          roleId: opts.roleId,
          invitedBy: opts.invitedBy,
        });
        const invitationLink = buildInvitationLink(token);
        let emailSent = false;
        try {
          await sendInvitationEmail({
            companyId,
            email: invitation.email,
            token,
            invitedByName: opts.invitedByName,
          });
          emailSent = true;
        } catch (error) {
          console.error('[Invitations] email send error', error);
          toastError(
            'Email non envoyé',
            'Le service email est indisponible. Utilisez le lien généré manuellement.'
          );
          if (typeof navigator !== 'undefined' && navigator.clipboard) {
            navigator.clipboard.writeText(invitationLink).catch((err) => {
              console.warn('[Invitations] clipboard write failed', err);
            });
          }
        }
        setInvitations((prev) => [invitation, ...prev]);
        if (emailSent) {
          success('Invitation envoyée', `Email envoyé à ${invitation.email}`);
        } else {
          success('Invitation créée', 'Partagez le lien copié dans le presse-papiers.');
        }
        return { invitation, invitationLink, emailSent };
      } catch (error) {
        console.error('[Invitations] sendInvite error', error);
        toastError('Erreur', "Impossible d'envoyer l'invitation");
        throw error;
      } finally {
        setActionLoading(false);
      }
    },
    [companyId, success, toastError]
  );

  const resendInvite = useCallback(
    async (invitationId: string) => {
      if (!companyId) return;
      setActionLoading(true);
      try {
        const { invitation, token } = await regenerateInvitation(invitationId);
        const invitationLink = buildInvitationLink(token);
        let emailSent = false;
        try {
          await sendInvitationEmail({
            companyId,
            email: invitation.email,
            token,
          });
          emailSent = true;
        } catch (error) {
          console.error('[Invitations] resend email error', error);
          toastError(
            'Email non envoyé',
            'Service email indisponible. Partagez le lien généré manuellement.'
          );
          if (typeof navigator !== 'undefined' && navigator.clipboard) {
            navigator.clipboard.writeText(invitationLink).catch((err) => {
              console.warn('[Invitations] clipboard write failed', err);
            });
          }
        }
        setInvitations((prev) =>
          prev.map((inv) => (inv.id === invitation.id ? invitation : inv))
        );
        if (emailSent) {
          success('Invitation renvoyée', `Lien régénéré pour ${invitation.email}`);
        } else {
          success('Invitation prête', 'Lien copié dans le presse-papiers.');
        }
        return { invitation, invitationLink, emailSent };
      } catch (error) {
        console.error('[Invitations] resendInvite error', error);
        toastError('Erreur', 'Impossible de renvoyer cette invitation');
        throw error;
      } finally {
        setActionLoading(false);
      }
    },
    [companyId, success, toastError]
  );

  const cancelInvite = useCallback(
    async (invitationId: string) => {
      setActionLoading(true);
      try {
        await cancelInvitation(invitationId);
        setInvitations((prev) =>
          prev.map((inv) =>
            inv.id === invitationId ? { ...inv, status: 'cancelled' } : inv
          )
        );
        success('Invitation annulée', 'Le lien est désormais invalide');
      } catch (error) {
        console.error('[Invitations] cancelInvite error', error);
        toastError('Erreur', 'Impossible d’annuler cette invitation');
      } finally {
        setActionLoading(false);
      }
    },
    [success, toastError]
  );

  return {
    invitations,
    loading,
    actionLoading,
    sendInvite,
    resendInvite,
    cancelInvite,
    refreshInvitations: loadInvitations,
  };
}

export async function acceptInvitationFlow(params: {
  token: string;
  password: string;
  fullName: string;
}): Promise<{ invitation: UserInvitation }> {
  const invitation = await fetchInvitationByToken(params.token);
  if (!invitation) {
    throw new Error('Invitation introuvable');
  }
  if (invitation.status !== 'pending') {
    throw new Error('Cette invitation n’est plus valide');
  }
  if (new Date(invitation.expires_at) < new Date()) {
    throw new Error('Cette invitation a expiré');
  }

  const { data, error } = await supabase.auth.signUp({
    email: invitation.email,
    password: params.password,
    options: {
      data: {
        full_name: params.fullName,
      },
    },
  });

  if (error) {
    throw error;
  }

  const userId = data.user?.id;
  if (!userId) {
    throw new Error('Utilisateur non créé');
  }

  await markInvitationAccepted(invitation.id, userId);

  if (invitation.company_id && invitation.role_id) {
    try {
      await assignRoleToUser(invitation.company_id, invitation.role_id, userId);
    } catch (roleError) {
      console.warn('[Invitations] assignRoleToUser failed', roleError);
    }
  }

  return { invitation };
}

