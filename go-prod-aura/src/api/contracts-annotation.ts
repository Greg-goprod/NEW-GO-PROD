import { supabase } from '../lib/supabaseClient';

export interface SaveAnnotatedContractRequest {
  contractId: string;
  file: File;
  version: 'annotated' | 'signed';
}

export interface SaveAnnotatedContractResponse {
  success: boolean;
  fileUrl?: string;
  error?: string;
}

/**
 * Upload et sauvegarde d'un PDF annoté
 */
export async function saveAnnotatedContract(
  request: SaveAnnotatedContractRequest
): Promise<SaveAnnotatedContractResponse> {
  try {
    const { contractId, file, version } = request;
    
    // Upload du fichier vers Supabase Storage
    const timestamp = Date.now();
    const fileName = `contract_${contractId}_${version}_${timestamp}.pdf`;
    
    const { error: uploadError } = await supabase.storage
      .from('contracts')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('Erreur upload:', uploadError);
      return { success: false, error: uploadError.message };
    }

    // Obtenir l'URL publique
    const { data: urlData } = supabase.storage
      .from('contracts')
      .getPublicUrl(fileName);

    const fileUrl = urlData.publicUrl;

    // Mettre à jour le contrat
    const updateData: any = {
      current_version: version,
      updated_at: new Date().toISOString()
    };

    if (version === 'annotated') {
      updateData.annotated_file_url = fileUrl;
      updateData.status = 'internal_sign';
    } else {
      updateData.signed_file_url = fileUrl;
    }

    const { error: updateError } = await supabase
      .from('contracts')
      .update(updateData)
      .eq('id', contractId);

    if (updateError) {
      console.error('Erreur mise à jour contrat:', updateError);
      return { success: false, error: updateError.message };
    }

    return { success: true, fileUrl };
  } catch (error) {
    console.error('Erreur saveAnnotatedContract:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Erreur inconnue' 
    };
  }
}

/**
 * Upload et sauvegarde d'un PDF signé en interne
 */
export async function saveSignedContract(
  request: SaveAnnotatedContractRequest
): Promise<SaveAnnotatedContractResponse> {
  try {
    const { contractId, file } = request;
    
    const timestamp = Date.now();
    const fileName = `contract_${contractId}_signed_internal_${timestamp}.pdf`;
    
    const { error: uploadError } = await supabase.storage
      .from('contracts')
      .upload(fileName, file);

    if (uploadError) {
      return { success: false, error: uploadError.message };
    }

    const { data: urlData } = supabase.storage
      .from('contracts')
      .getPublicUrl(fileName);

    const fileUrl = urlData.publicUrl;

    const { error: updateError } = await supabase
      .from('contracts')
      .update({
        signed_file_url: fileUrl,
        current_version: 'signed',
        status: 'internal_signed',
        updated_at: new Date().toISOString()
      })
      .eq('id', contractId);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    return { success: true, fileUrl };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Erreur inconnue' 
    };
  }
}

/**
 * Upload et sauvegarde d'un PDF signé par l'externe
 */
export async function saveExternalSignedContract(
  request: SaveAnnotatedContractRequest
): Promise<SaveAnnotatedContractResponse> {
  try {
    const { contractId, file } = request;
    
    const timestamp = Date.now();
    const fileName = `contract_${contractId}_signed_final_${timestamp}.pdf`;
    
    const { error: uploadError } = await supabase.storage
      .from('contracts')
      .upload(fileName, file);

    if (uploadError) {
      return { success: false, error: uploadError.message };
    }

    const { data: urlData } = supabase.storage
      .from('contracts')
      .getPublicUrl(fileName);

    const fileUrl = urlData.publicUrl;

    const { error: updateError } = await supabase
      .from('contracts')
      .update({
        signed_file_url: fileUrl,
        current_version: 'signed',
        status: 'finalized',
        updated_at: new Date().toISOString()
      })
      .eq('id', contractId);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    return { success: true, fileUrl };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Erreur inconnue' 
    };
  }
}

/**
 * Récupérer les informations d'un contrat
 */
export async function getContractInfo(contractId: string) {
  const { data, error } = await supabase
    .from('contracts')
    .select(`
      *,
      artists!inner (id, name),
      events (id, name)
    `)
    .eq('id', contractId)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}
