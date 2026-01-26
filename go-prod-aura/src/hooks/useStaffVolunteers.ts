// =============================================================================
// Hook pour la gestion des bénévoles (STAFF_VOLUNTEERS)
// =============================================================================

import { useState, useEffect, useCallback } from 'react';
import {
  fetchVolunteers,
  searchVolunteers,
  createVolunteer,
  updateVolunteer,
  deleteVolunteer,
} from '../api/staffVolunteersApi';
import type { StaffVolunteerWithRelations, StaffVolunteerInput } from '../types/staff';

interface UseStaffVolunteersOptions {
  autoLoad?: boolean;
  filters?: {
    search?: string;
    status_id?: string;
    group_ids?: string[];
    skill_ids?: string[];
    is_active?: boolean;
  };
}

export function useStaffVolunteers(options: UseStaffVolunteersOptions = {}) {
  const { autoLoad = true, filters } = options;

  const [volunteers, setVolunteers] = useState<StaffVolunteerWithRelations[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ───────────────────────────────────────────────────────────────────────────
  // Charger les bénévoles
  // ───────────────────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let data: StaffVolunteerWithRelations[];

      if (filters && Object.keys(filters).length > 0) {
        data = await searchVolunteers(filters);
      } else {
        data = await fetchVolunteers();
      }

      setVolunteers(data);
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement des bénévoles');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Charger au montage si autoLoad
  useEffect(() => {
    if (autoLoad) {
      load();
    }
  }, [autoLoad, load]);

  // ───────────────────────────────────────────────────────────────────────────
  // Créer un bénévole
  // ───────────────────────────────────────────────────────────────────────────

  const create = useCallback(
    async (input: StaffVolunteerInput) => {
      try {
        const newVolunteer = await createVolunteer(input);
        await load(); // Recharger pour avoir les relations
        return newVolunteer;
      } catch (err: any) {
        setError(err.message || 'Erreur lors de la création du bénévole');
        throw err;
      }
    },
    [load]
  );

  // ───────────────────────────────────────────────────────────────────────────
  // Mettre à jour un bénévole
  // ───────────────────────────────────────────────────────────────────────────

  const update = useCallback(
    async (id: string, input: Partial<StaffVolunteerInput>) => {
      try {
        const updatedVolunteer = await updateVolunteer(id, input);
        await load(); // Recharger pour avoir les relations
        return updatedVolunteer;
      } catch (err: any) {
        setError(err.message || 'Erreur lors de la mise à jour du bénévole');
        throw err;
      }
    },
    [load]
  );

  // ───────────────────────────────────────────────────────────────────────────
  // Supprimer un bénévole
  // ───────────────────────────────────────────────────────────────────────────

  const remove = useCallback(
    async (id: string) => {
      try {
        await deleteVolunteer(id);
        setVolunteers((prev) => prev.filter((v) => v.id !== id));
      } catch (err: any) {
        setError(err.message || 'Erreur lors de la suppression du bénévole');
        throw err;
      }
    },
    []
  );

  return {
    volunteers,
    loading,
    error,
    load,
    create,
    update,
    remove,
  };
}
