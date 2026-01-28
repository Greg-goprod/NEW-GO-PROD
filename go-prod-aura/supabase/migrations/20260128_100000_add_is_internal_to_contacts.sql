-- Migration: Ajouter le champ is_internal à la table crm_contacts
-- Description: Permet de distinguer les contacts internes (equipe) des contacts externes (clients, fournisseurs, partenaires)

ALTER TABLE public.crm_contacts
ADD COLUMN IF NOT EXISTS is_internal boolean NOT NULL DEFAULT false;

-- Commentaire sur la colonne
COMMENT ON COLUMN public.crm_contacts.is_internal IS 'true = contact interne (membre equipe), false = contact externe (client, fournisseur, partenaire)';
