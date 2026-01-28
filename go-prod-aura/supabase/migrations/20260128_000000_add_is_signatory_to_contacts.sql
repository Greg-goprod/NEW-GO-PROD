-- Migration: Ajouter le champ is_signatory à la table crm_contacts
-- Description: Permet d'identifier les contacts qui sont signataires de contrats

ALTER TABLE public.crm_contacts
ADD COLUMN IF NOT EXISTS is_signatory boolean NOT NULL DEFAULT false;

-- Commentaire sur la colonne
COMMENT ON COLUMN public.crm_contacts.is_signatory IS 'Indique si ce contact est un signataire de contrats';
