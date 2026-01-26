import { useCallback, useMemo, useState } from "react";

// Placeholder pour Supabase - à remplacer par votre instance existante
// import { supabase } from '@/lib/supabase'

export type SearchHit = {
  id: string;
  label: string;
  sublabel?: string;
  entity: 'artist' | 'booking' | 'contact' | 'vehicle' | 'other';
  href: string; // où naviguer
};

type Provider = (q: string) => Promise<SearchHit[]>;

/** provider serveur: essaye des tables communes si elles existent.
 *  Ne plante jamais: renvoie [] en cas d'erreur. Mono-tenant pour l'instant.
 */
const artistsProvider: Provider = async (q) => {
  if (!q?.trim()) return [];
  try {
    // TODO: Remplacer par votre client Supabase
    // const { data, error } = await supabase
    //   .from('artists')
    //   .select('id,name')
    //   .ilike('name', `%${q}%`)
    //   .limit(10);
    // if (error || !data) return [];
    // return data.map((a: any) => ({
    //   id: a.id, label: a.name, entity: 'artist', href: `/app/artists/${a.id}`
    // }));
    
    // Mock data pour dev
    return [
      { id: '1', label: 'DJ Shadow', entity: 'artist' as const, href: '/app/artists/1' },
      { id: '2', label: 'Emma Johnson', entity: 'artist' as const, href: '/app/artists/2' }
    ].filter(a => a.label.toLowerCase().includes(q.toLowerCase()));
  } catch { return []; }
};

const bookingsProvider: Provider = async (q) => {
  if (!q?.trim()) return [];
  try {
    // TODO: Remplacer par votre client Supabase
    // const { data, error } = await supabase
    //   .from('bookings')
    //   .select('id,title,ref')
    //   .or(`title.ilike.%${q}%,ref.ilike.%${q}%`)
    //   .limit(10);
    // if (error || !data) return [];
    // return data.map((b: any) => ({
    //   id: b.id, label: b.title ?? b.ref, sublabel: b.ref ?? '', entity: 'booking', href: `/app/booking/${b.id}`
    // }));
    
    // Mock data pour dev
    return [
      { id: '1', label: 'Festival Électrique', sublabel: 'BKG-001', entity: 'booking' as const, href: '/app/booking/1' },
      { id: '2', label: 'Nuit Sonore', sublabel: 'BKG-002', entity: 'booking' as const, href: '/app/booking/2' }
    ].filter(b => b.label.toLowerCase().includes(q.toLowerCase()) || b.sublabel?.toLowerCase().includes(q.toLowerCase()));
  } catch { return []; }
};

// Ajoute d'autres providers si besoin
const providers: Provider[] = [artistsProvider, bookingsProvider];

export function useGlobalSearch() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchHit[]>([]);

  const search = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const chunks = await Promise.all(providers.map(p => p(q)));
      // merge + dédoublonnage simple
      const merged = chunks.flat();
      const map = new Map<string, SearchHit>();
      merged.forEach(h => { if (!map.has(`${h.entity}-${h.id}`)) map.set(`${h.entity}-${h.id}`, h); });
      setResults(Array.from(map.values()));
    } finally {
      setLoading(false);
    }
  }, []);

  const api = useMemo(() => ({ query, setQuery, loading, results, search }), [query, loading, results, search]);
  return api;
}

