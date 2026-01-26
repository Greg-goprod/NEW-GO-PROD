import { supabase } from '../lib/supabaseClient';

/**
 * Crée un token de signature sécurisé pour un contrat
 */
export const createSignatureToken = async (contractId: string): Promise<string> => {
  const { data, error } = await supabase.rpc('create_signature_token', {
    p_contract_id: contractId
  });

  if (error) {
    console.error('Erreur création token:', error);
    throw new Error('Impossible de créer le token de signature');
  }

  return data as string;
};

/**
 * Valide un token de signature
 */
export const validateSignatureToken = async (token: string) => {
  const { data, error } = await supabase.rpc('validate_signature_token', {
    p_token: token
  });

  if (error) {
    console.error('Erreur validation token:', error);
    throw new Error('Token invalide ou expiré');
  }

  return data;
};

/**
 * Marque un token comme utilisé
 */
export const markTokenAsUsed = async (token: string): Promise<boolean> => {
  const { data, error } = await supabase.rpc('mark_token_as_used', {
    p_token: token
  });

  if (error) {
    console.error('Erreur marquage token:', error);
    return false;
  }

  return data as boolean;
};

/**
 * Génère l'URL complète de signature
 */
export const generateSignatureUrl = (contractId: string, token: string): string => {
  const baseUrl = import.meta.env.VITE_APP_URL || window.location.origin;
  return `${baseUrl}/sign/${contractId}/${token}`;
};
