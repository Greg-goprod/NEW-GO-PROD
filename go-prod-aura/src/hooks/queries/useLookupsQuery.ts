import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { queryKeys } from '@/lib/queryClient';

/**
 * Types pour les lookups CRM
 */
export interface CRMLookup {
  id: string;
  company_id: string;
  type: string;
  value: string;
  label: string;
  display_order?: number;
  is_active?: boolean;
}

export interface CRMLookups {
  roles: CRMLookup[];
  sources: CRMLookup[];
  tags: CRMLookup[];
  companySectors: CRMLookup[];
  companySizes: CRMLookup[];
}

/**
 * Types pour les lookups Staff
 */
export interface StaffLookup {
  id: string;
  company_id: string;
  value: string;
  label: string;
  color?: string;
  icon?: string;
  display_order?: number;
  is_active?: boolean;
}

export interface StaffLookups {
  statuses: StaffLookup[];
  categories: StaffLookup[];
  departments: StaffLookup[];
  sectors: StaffLookup[];
}

/**
 * Fetch les lookups CRM
 */
async function fetchCRMLookups(companyId: string): Promise<CRMLookups> {
  const types = ['contact_role', 'contact_source', 'contact_tag', 'company_sector', 'company_size'];
  
  const { data, error } = await supabase
    .from('crm_lookups')
    .select('*')
    .eq('company_id', companyId)
    .in('type', types)
    .eq('is_active', true)
    .order('display_order', { ascending: true });

  if (error) throw error;

  const lookups = data || [];
  
  return {
    roles: lookups.filter(l => l.type === 'contact_role'),
    sources: lookups.filter(l => l.type === 'contact_source'),
    tags: lookups.filter(l => l.type === 'contact_tag'),
    companySectors: lookups.filter(l => l.type === 'company_sector'),
    companySizes: lookups.filter(l => l.type === 'company_size'),
  };
}

/**
 * Fetch les lookups Staff
 */
async function fetchStaffLookups(companyId: string): Promise<StaffLookups> {
  const [statusesRes, categoriesRes, departmentsRes, sectorsRes] = await Promise.all([
    supabase
      .from('staff_statuses')
      .select('*')
      .eq('company_id', companyId)
      .order('display_order', { ascending: true }),
    supabase
      .from('staff_categories')
      .select('*')
      .eq('company_id', companyId)
      .order('display_order', { ascending: true }),
    supabase
      .from('staff_departments')
      .select('*')
      .eq('company_id', companyId)
      .order('display_order', { ascending: true }),
    supabase
      .from('staff_sectors')
      .select('*')
      .eq('company_id', companyId)
      .order('display_order', { ascending: true }),
  ]);

  // Vérifier les erreurs
  if (statusesRes.error) throw statusesRes.error;
  if (categoriesRes.error) throw categoriesRes.error;
  if (departmentsRes.error) throw departmentsRes.error;
  if (sectorsRes.error) throw sectorsRes.error;

  return {
    statuses: statusesRes.data || [],
    categories: categoriesRes.data || [],
    departments: departmentsRes.data || [],
    sectors: sectorsRes.data || [],
  };
}

/**
 * Hook React Query pour les lookups CRM
 * Cache de 10 minutes car ces données changent rarement
 */
export function useCRMLookupsQuery(companyId: string | null) {
  return useQuery({
    queryKey: queryKeys.crmLookups(companyId || ''),
    queryFn: () => fetchCRMLookups(companyId!),
    enabled: !!companyId,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
}

/**
 * Hook React Query pour les lookups Staff
 * Cache de 10 minutes car ces données changent rarement
 */
export function useStaffLookupsQuery(companyId: string | null) {
  return useQuery({
    queryKey: queryKeys.staffLookups(companyId || ''),
    queryFn: () => fetchStaffLookups(companyId!),
    enabled: !!companyId,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
}
