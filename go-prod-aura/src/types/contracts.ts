export type ContractStatus = 'to_receive' | 'review' | 'internal_sign' | 'internal_signed' | 'external_sign' | 'finalized';

export interface ContractAction {
  at: string;
  action: string;
  details: string;
}

export interface Contract {
  id: string;
  artist_id: string;
  artist_name?: string;
  contract_title: string;
  title?: string;
  status: ContractStatus;
  file_url?: string;
  original_file_url?: string;
  annotated_file_url?: string;
  signed_file_url?: string;
  current_version?: 'original' | 'annotated' | 'signed';
  management_email?: string;
  external_email?: string;
  return_email?: string;
  signed_by_internal?: string;
  signed_by_external?: string;
  event_id?: string;
  event_name?: string;
  source_offer_id?: string;
  history: ContractAction[];
  created_at: string;
  updated_at: string;
  virtual?: boolean;
  events?: {
    id: string;
    name: string;
  };
  artists?: {
    id: string;
    name: string;
  };
}
