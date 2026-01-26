// =============================================================================
// Types pour le module STAFF
// =============================================================================

// ─────────────────────────────────────────────────────────────────────────────
// Référence aux événements existants
// ─────────────────────────────────────────────────────────────────────────────

export interface EventReference {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  status: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Tables de lookup
// ─────────────────────────────────────────────────────────────────────────────

export interface StaffVolunteerStatus {
  id: string;
  company_id: string;
  name: string;
  color: string;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface StaffDepartment {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface StaffSector {
  id: string;
  company_id: string;
  department_id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface StaffSectorWithDepartment extends StaffSector {
  department: StaffDepartment;
}

// ─────────────────────────────────────────────────────────────────────────────
// Bénévoles
// ─────────────────────────────────────────────────────────────────────────────

export interface StaffVolunteer {
  id: string;
  company_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  status_id: string;
  department_ids: string[];
  sector_ids: string[];
  notes_internal: string | null;
  notes_public: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface StaffVolunteerWithRelations extends StaffVolunteer {
  status: StaffVolunteerStatus;
  departments: StaffDepartment[];
  sectors: StaffSectorWithDepartment[];
}

export interface StaffVolunteerInput {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string | null;
  status_id: string;
  department_ids?: string[];
  sector_ids?: string[];
  notes_internal?: string | null;
  notes_public?: string | null;
  is_active?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Shifts (créneaux)
// ─────────────────────────────────────────────────────────────────────────────

export interface StaffShift {
  id: string;
  company_id: string;
  event_id: string;
  department_id: string;
  sector_id: string | null;
  title: string;
  description: string | null;
  shift_date: string;
  start_time: string;
  end_time: string;
  places_total: number;
  places_filled: number;
  unlimited_places: boolean;
  notes_public: string | null;
  notes_internal: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface StaffShiftWithRelations extends StaffShift {
  event: EventReference;
  department: StaffDepartment;
  sector: StaffSector | null;
  assignments?: StaffShiftAssignment[];
}

export interface StaffShiftInput {
  event_id: string;
  department_id: string;
  sector_id?: string | null;
  title: string;
  description?: string | null;
  shift_date: Date;
  start_time: string;
  end_time: string;
  places_total?: number;
  unlimited_places?: boolean;
  notes_public?: string | null;
  notes_internal?: string | null;
  is_active?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Affectations de shifts
// ─────────────────────────────────────────────────────────────────────────────

export interface StaffShiftAssignment {
  id: string;
  shift_id: string;
  volunteer_id: string;
  assigned_at: string;
  assigned_by: string | null;
  status: 'pending' | 'confirmed' | 'cancelled';
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface StaffShiftAssignmentWithRelations extends StaffShiftAssignment {
  shift: StaffShift;
  volunteer: StaffVolunteer;
}

export interface StaffShiftAssignmentInput {
  shift_id: string;
  volunteer_id: string;
  status?: 'pending' | 'confirmed' | 'cancelled';
  notes?: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Campagnes de recrutement
// ─────────────────────────────────────────────────────────────────────────────

export interface StaffCampaign {
  id: string;
  company_id: string;
  target_event_id: string | null;
  title: string;
  description: string | null;
  status: 'draft' | 'active' | 'closed';
  start_date: string | null;
  end_date: string | null;
  custom_questions: Record<string, any> | null;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface StaffCampaignWithRelations extends StaffCampaign {
  target_event: EventReference | null;
  applications?: StaffCampaignApplication[];
}

export interface StaffCampaignInput {
  target_event_id?: string | null;
  title: string;
  description?: string | null;
  status?: 'draft' | 'active' | 'closed';
  start_date?: Date | null;
  end_date?: Date | null;
  custom_questions?: Record<string, any> | null;
  is_public?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Candidatures aux campagnes
// ─────────────────────────────────────────────────────────────────────────────

export interface StaffCampaignApplication {
  id: string;
  campaign_id: string;
  volunteer_id: string | null;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  custom_answers: Record<string, any> | null;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_at: string | null;
  reviewed_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface StaffCampaignApplicationWithRelations extends StaffCampaignApplication {
  campaign: StaffCampaign;
  volunteer: StaffVolunteer | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Inscriptions publiques aux shifts (future)
// ─────────────────────────────────────────────────────────────────────────────

export interface StaffShiftApplication {
  id: string;
  shift_id: string;
  volunteer_id: string | null;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_at: string | null;
  reviewed_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface StaffShiftApplicationWithRelations extends StaffShiftApplication {
  shift: StaffShift;
  volunteer: StaffVolunteer | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Communications
// ─────────────────────────────────────────────────────────────────────────────

export interface StaffCommunication {
  id: string;
  company_id: string;
  target_event_id: string | null;
  title: string;
  content: string;
  template_id: string | null;
  target_type: 'all' | 'event' | 'shift' | 'group' | 'custom';
  target_ids: string[] | null;
  sent_at: string | null;
  sent_by: string | null;
  recipient_count: number;
  status: 'draft' | 'scheduled' | 'sent' | 'failed';
  created_at: string;
  updated_at: string;
}

export interface StaffCommunicationWithRelations extends StaffCommunication {
  target_event: EventReference | null;
}

export interface StaffCommunicationInput {
  target_event_id?: string | null;
  title: string;
  content: string;
  template_id?: string | null;
  target_type?: 'all' | 'event' | 'shift' | 'group' | 'custom';
  target_ids?: string[] | null;
  status?: 'draft' | 'scheduled' | 'sent' | 'failed';
}

// ─────────────────────────────────────────────────────────────────────────────
// Exports
// ─────────────────────────────────────────────────────────────────────────────

export interface StaffExport {
  id: string;
  company_id: string;
  export_type: string;
  filters: Record<string, any> | null;
  file_path: string | null;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  row_count: number | null;
  error_message: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Audit logs
// ─────────────────────────────────────────────────────────────────────────────

export interface StaffAuditLog {
  id: string;
  company_id: string;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  old_values: Record<string, any> | null;
  new_values: Record<string, any> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Rôles utilisateurs
// ─────────────────────────────────────────────────────────────────────────────

export interface StaffUserRole {
  id: string;
  company_id: string;
  user_id: string;
  role: 'admin' | 'organizer' | 'volunteer';
  scoped_event_id: string | null;
  permissions: Record<string, any> | null;
  granted_by: string | null;
  granted_at: string;
  created_at: string;
  updated_at: string;
}

export interface StaffUserRoleWithRelations extends StaffUserRole {
  scoped_event: EventReference | null;
}

