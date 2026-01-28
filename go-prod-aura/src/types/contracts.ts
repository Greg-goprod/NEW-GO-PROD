export type ContractStatus = 'to_receive' | 'review' | 'internal_sign' | 'internal_signed' | 'external_sign' | 'finalized';

export interface ContractAction {
  at: string;
  action: string;
  details: string;
}

export interface Contract {
  id: string;
  company_id?: string;
  artist_id: string;
  artist_name?: string;
  contract_title: string;
  title?: string;
  status: ContractStatus;
  file_url?: string;
  original_file_url?: string;
  annotated_file_url?: string;
  signed_file_url?: string;
  final_signed_file_url?: string; // PDF final signé par l'artiste
  current_version?: 'original' | 'annotated' | 'signed' | 'final';
  management_email?: string;
  external_email?: string;
  return_email?: string;
  signed_by_internal?: string;
  signed_by_external?: string;
  event_id?: string;
  event_name?: string;
  offer_id?: string; // ID de l'offre liée
  source_offer_id?: string;
  date_time?: string;
  stage_name?: string;
  history: ContractAction[];
  created_at: string;
  updated_at: string;
  virtual?: boolean;
  // Dates de suivi
  received_at?: string;
  annotated_at?: string;
  sent_for_internal_sign_at?: string;
  internal_signed_at?: string;
  sent_for_external_sign_at?: string;
  external_signed_at?: string;
  finalized_at?: string;
  events?: {
    id: string;
    name: string;
  };
  artists?: {
    id: string;
    name: string;
  };
}
