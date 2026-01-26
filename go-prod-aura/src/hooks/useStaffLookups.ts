// =============================================================================
// Hook pour la gestion des lookups STAFF (statuts, groupes, compétences)
// =============================================================================

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import type {
  StaffVolunteerStatus,
  StaffDepartment,
  StaffSector,
  StaffSectorWithDepartment,
} from '../types/staff';

interface StaffLookupsState {
  statuses: StaffVolunteerStatus[];
  departments: StaffDepartment[];
  sectors: StaffSectorWithDepartment[];
  loading: boolean;
  error: string | null;
}

export function useStaffLookups() {
  const [state, setState] = useState<StaffLookupsState>({
    statuses: [],
    departments: [],
    sectors: [],
    loading: true,
    error: null,
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Charger tous les lookups
  // ───────────────────────────────────────────────────────────────────────────

  const loadAll = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      const [statusesRes, departmentsRes, sectorsRes] = await Promise.all([
        supabase
          .from('staff_volunteer_statuses')
          .select('*')
          .eq('is_active', true)
          .order('display_order', { ascending: true }),
        supabase
          .from('staff_departments')
          .select('*')
          .eq('is_active', true)
          .order('display_order', { ascending: true }),
        supabase
          .from('staff_sectors')
          .select(`
            *,
            department:staff_departments(*)
          `)
          .eq('is_active', true)
          .order('display_order', { ascending: true }),
      ]);

      if (statusesRes.error) throw statusesRes.error;
      if (departmentsRes.error) throw departmentsRes.error;
      if (sectorsRes.error) throw sectorsRes.error;

      setState({
        statuses: statusesRes.data || [],
        departments: departmentsRes.data || [],
        sectors: sectorsRes.data || [],
        loading: false,
        error: null,
      });
    } catch (err: any) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: err.message || 'Erreur lors du chargement des données',
      }));
    }
  }, []);

  // Charger au montage
  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // ───────────────────────────────────────────────────────────────────────────
  // CRUD pour les statuts
  // ───────────────────────────────────────────────────────────────────────────

  const createStatus = useCallback(
    async (name: string, color: string, display_order?: number) => {
      try {
        const { data, error } = await supabase
          .from('staff_volunteer_statuses')
          .insert({
            name,
            color,
            is_active: true,
            display_order: display_order || 999,
          })
          .select()
          .single();

        if (error) throw error;
        setState((prev) => ({
          ...prev,
          statuses: [...prev.statuses, data].sort(
            (a, b) => a.display_order - b.display_order
          ),
        }));
        return data;
      } catch (err: any) {
        throw err;
      }
    },
    []
  );

  const updateStatus = useCallback(
    async (id: string, updates: Partial<StaffVolunteerStatus>) => {
      try {
        const { data, error } = await supabase
          .from('staff_volunteer_statuses')
          .update(updates)
          .eq('id', id)
          .select()
          .single();

        if (error) throw error;
        setState((prev) => ({
          ...prev,
          statuses: prev.statuses.map((s) => (s.id === id ? data : s)),
        }));
        return data;
      } catch (err: any) {
        throw err;
      }
    },
    []
  );

  const deleteStatus = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('staff_volunteer_statuses')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setState((prev) => ({
        ...prev,
        statuses: prev.statuses.filter((s) => s.id !== id),
      }));
    } catch (err: any) {
      throw err;
    }
  }, []);

  // ───────────────────────────────────────────────────────────────────────────
  // CRUD pour les départements
  // ───────────────────────────────────────────────────────────────────────────

  const createDepartment = useCallback(
    async (name: string, description?: string, display_order?: number) => {
      try {
        const { data, error } = await supabase
          .from('staff_departments')
          .insert({
            name,
            description: description || null,
            is_active: true,
            display_order: display_order || 999,
          })
          .select()
          .single();

        if (error) throw error;
        setState((prev) => ({
          ...prev,
          departments: [...prev.departments, data].sort((a, b) => a.display_order - b.display_order),
        }));
        return data;
      } catch (err: any) {
        throw err;
      }
    },
    []
  );

  const updateDepartment = useCallback(
    async (id: string, updates: Partial<StaffDepartment>) => {
      try {
        const { data, error } = await supabase
          .from('staff_departments')
          .update(updates)
          .eq('id', id)
          .select()
          .single();

        if (error) throw error;
        setState((prev) => ({
          ...prev,
          departments: prev.departments.map((d) => (d.id === id ? data : d)),
        }));
        return data;
      } catch (err: any) {
        throw err;
      }
    },
    []
  );

  const deleteDepartment = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('staff_departments')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setState((prev) => ({
        ...prev,
        departments: prev.departments.filter((d) => d.id !== id),
      }));
    } catch (err: any) {
      throw err;
    }
  }, []);

  // ───────────────────────────────────────────────────────────────────────────
  // CRUD pour les secteurs
  // ───────────────────────────────────────────────────────────────────────────

  const createSector = useCallback(
    async (department_id: string, name: string, description?: string, display_order?: number) => {
      try {
        const { data, error } = await supabase
          .from('staff_sectors')
          .insert({
            department_id,
            name,
            description: description || null,
            is_active: true,
            display_order: display_order || 999,
          })
          .select(`
            *,
            department:staff_departments(*)
          `)
          .single();

        if (error) throw error;
        setState((prev) => ({
          ...prev,
          sectors: [...prev.sectors, data].sort((a, b) => a.display_order - b.display_order),
        }));
        return data;
      } catch (err: any) {
        throw err;
      }
    },
    []
  );

  const updateSector = useCallback(
    async (id: string, updates: Partial<StaffSector>) => {
      try {
        const { data, error } = await supabase
          .from('staff_sectors')
          .update(updates)
          .eq('id', id)
          .select(`
            *,
            department:staff_departments(*)
          `)
          .single();

        if (error) throw error;
        setState((prev) => ({
          ...prev,
          sectors: prev.sectors.map((s) => (s.id === id ? data : s)),
        }));
        return data;
      } catch (err: any) {
        throw err;
      }
    },
    []
  );

  const deleteSector = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('staff_sectors')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setState((prev) => ({
        ...prev,
        sectors: prev.sectors.filter((s) => s.id !== id),
      }));
    } catch (err: any) {
      throw err;
    }
  }, []);

  return {
    ...state,
    reload: loadAll,
    // Statuts
    createStatus,
    updateStatus,
    deleteStatus,
    // Départements
    createDepartment,
    updateDepartment,
    deleteDepartment,
    // Secteurs
    createSector,
    updateSector,
    deleteSector,
  };
}
