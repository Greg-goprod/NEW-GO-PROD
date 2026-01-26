import { supabase } from '../../lib/supabaseClient';
import type { Contract } from '@/types/contracts';

/**
 * Crée automatiquement un contrat à partir d'une offre acceptée
 */
export async function createContractFromAcceptedOffer(offerId: string): Promise<Contract | null> {
  try {
    // Récupérer l'offre
    const { data: offer, error: offerError } = await supabase
      .from('offers')
      .select(`
        *,
        artists!inner (id, name),
        events!inner (id, name)
      `)
      .eq('id', offerId)
      .single();

    if (offerError || !offer) {
      console.error('Erreur récupération offre:', offerError);
      return null;
    }

    // Vérifier si un contrat existe déjà
    if (offer.contract_id) {
      console.log('Un contrat existe déjà pour cette offre');
      return null;
    }

    // Créer le contrat
    const contractData = {
      artist_id: offer.artist_id,
      event_id: offer.event_id,
      contract_title: `Contrat ${offer.artists.name} - ${offer.events.name}`,
      status: 'to_receive' as const,
      source_offer_id: offerId,
      history: [{
        at: new Date().toISOString(),
        action: 'created_from_offer',
        details: `Contrat créé automatiquement depuis l'offre acceptée`
      }]
    };

    const { data: contract, error: contractError } = await supabase
      .from('contracts')
      .insert([contractData])
      .select()
      .single();

    if (contractError) {
      console.error('Erreur création contrat:', contractError);
      return null;
    }

    // Mettre à jour l'offre avec l'ID du contrat
    const { error: updateError } = await supabase
      .from('offers')
      .update({ contract_id: contract.id })
      .eq('id', offerId);

    if (updateError) {
      console.error('Erreur mise à jour offre:', updateError);
    }

    // Émettre un événement custom pour notifier le module Contrats
    window.dispatchEvent(new CustomEvent('contract-created-from-offer', {
      detail: { contractId: contract.id, offerId }
    }));

    return contract as Contract;
  } catch (error) {
    console.error('Erreur createContractFromAcceptedOffer:', error);
    return null;
  }
}
