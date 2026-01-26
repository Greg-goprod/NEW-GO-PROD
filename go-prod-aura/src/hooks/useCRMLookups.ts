import { useState, useEffect, useCallback } from 'react';
import { getCurrentCompanyId } from '@/lib/tenant';
import { supabase } from '@/lib/supabaseClient';
import {
  fetchCRMLookups,
  fetchActiveCRMLookups,
  upsertCRMOption,
  disableCRMOption
} from '@/api/crmLookupsApi';
import type { CRMLookupTable, CRMLookup } from '@/types/crm';

/**
 * Hook pour gérer les lookups CRM (options éditables)
 */
export function useCRMLookups(table: CRMLookupTable) {
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [lookups, setLookups] = useState<CRMLookup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Fonction pour mettre à jour l'état local sans recharger
  const setLookupsOptimistic = useCallback((newLookups: CRMLookup[]) => {
    setLookups(newLookups);
  }, []);

  // Charger le companyId au démarrage
  useEffect(() => {
    (async () => {
      const cid = await getCurrentCompanyId(supabase);
      setCompanyId(cid);
    })();
  }, []);

  const loadLookups = useCallback(async () => {
    if (!companyId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await fetchCRMLookups(companyId, table);
      setLookups(data);
    } catch (err) {
      console.error(`Erreur lors du chargement des ${table}:`, err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [companyId, table]);

  useEffect(() => {
    loadLookups();
  }, [loadLookups]);

  const create = useCallback(async (label: string, sortOrder: number = 100) => {
    if (!companyId) throw new Error('Company ID not found');
    try {
      await upsertCRMOption(table, companyId, null, label, true, sortOrder);
      await loadLookups();
    } catch (err) {
      console.error(`Erreur lors de la création:`, err);
      throw err;
    }
  }, [table, companyId, loadLookups]);

  const update = useCallback(async (id: string, label: string, active: boolean, sortOrder: number, skipReload = false) => {
    if (!companyId) throw new Error('Company ID not found');
    try {
      await upsertCRMOption(table, companyId, id, label, active, sortOrder);
      if (!skipReload) {
        await loadLookups();
      }
    } catch (err) {
      console.error(`Erreur lors de la mise à jour:`, err);
      throw err;
    }
  }, [table, companyId, loadLookups]);

  const disable = useCallback(async (id: string) => {
    if (!companyId) throw new Error('Company ID not found');
    try {
      await disableCRMOption(table, companyId, id);
      await loadLookups();
    } catch (err) {
      console.error(`Erreur lors de la désactivation:`, err);
      throw err;
    }
  }, [table, companyId, loadLookups]);

  const refresh = loadLookups;

  return {
    lookups,
    loading,
    error,
    create,
    update,
    disable,
    refresh,
    setLookupsOptimistic
  };
}

/**
 * Hook pour récupérer uniquement les options actives
 */
export function useActiveCRMLookups(table: CRMLookupTable) {
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [lookups, setLookups] = useState<CRMLookup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Charger le companyId au démarrage
  useEffect(() => {
    (async () => {
      const cid = await getCurrentCompanyId(supabase);
      setCompanyId(cid);
    })();
  }, []);

  useEffect(() => {
    if (!companyId) {
      setLoading(false);
      return;
    }

    const loadLookups = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchActiveCRMLookups(companyId, table);
        setLookups(data);
      } catch (err) {
        console.error(`Erreur lors du chargement des ${table} actifs:`, err);
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    loadLookups();
  }, [companyId, table]);

  return {
    lookups,
    loading,
    error
  };
}

