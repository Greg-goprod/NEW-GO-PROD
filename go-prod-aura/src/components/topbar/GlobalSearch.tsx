import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import { useGlobalSearch } from "../../hooks/useGlobalSearch";
import { useI18n } from "../../lib/i18n";

// Simple debounce sans dépendance externe
function useDebounce<T extends (...args: any[]) => any>(fn: T, delay: number) {
  const timeoutRef = useRef<number | undefined>(undefined);
  
  return (...args: Parameters<T>) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(() => fn(...args), delay);
  };
}

type Props = { onNavigate: (href: string) => void; };

export default function GlobalSearch({ onNavigate }: Props) {
  const { query, setQuery, loading, results, search } = useGlobalSearch();
  const { t } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);

  const debounced = useDebounce((val: string) => search(val), 300);

  useEffect(() => { 
    if (!query) {
      setOpen(false);
    }
  }, [query]);

  // Keyboard shortcut Cmd/Ctrl + K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === 'Escape' && open) {
        setOpen(false);
        setQuery('');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, setQuery]);

  return (
    <div className="relative w-full max-w-2xl">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
      <input
        ref={inputRef}
        value={query}
        onChange={(e) => { 
          setQuery(e.target.value); 
          debounced(e.target.value); 
          setOpen(true); 
        }}
        onFocus={() => query && setOpen(true)}
        placeholder={t('search_placeholder')}
        className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-white/5 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-violet-400 dark:focus:border-white/20 transition-all"
      />
      {open && (query.length > 0) && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          
          {/* Results panel */}
          <div className="absolute z-50 mt-2 w-full rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-night-900/95 backdrop-blur shadow-xl p-2">
            {loading && <div className="px-3 py-2 text-xs text-gray-600 dark:text-gray-400">Recherche en cours...</div>}
            {!loading && results.length === 0 && (
              <div className="px-3 py-2 text-xs text-gray-600 dark:text-gray-400">Aucun résultat trouvé</div>
            )}
            {!loading && results.length > 0 && (
              <ul className="max-h-80 overflow-auto">
                {results.map((r) => (
                  <li key={`${r.entity}-${r.id}`}>
                    <button
                      onClick={() => { 
                        setOpen(false); 
                        setQuery('');
                        onNavigate(r.href); 
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-white/5 dark:hover:bg-white/5 hover:bg-gray-100 rounded flex items-center gap-2 transition-colors"
                    >
                      <span className="text-sm text-white dark:text-white text-gray-900">{r.label}</span>
                      {r.sublabel && <span className="text-xs text-gray-500 dark:text-gray-500 text-gray-600">{r.sublabel}</span>}
                      <span className="ml-auto text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-500 text-gray-600">{r.entity}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-2 pt-2 border-t border-white/10 dark:border-white/10 border-gray-200 px-3 py-1 text-[10px] text-gray-600 dark:text-gray-600 text-gray-500">
              <kbd className="px-1.5 py-0.5 rounded bg-white/5 dark:bg-white/5 bg-gray-100">⌘K</kbd> pour ouvrir · <kbd className="px-1.5 py-0.5 rounded bg-white/5 dark:bg-white/5 bg-gray-100">ESC</kbd> pour fermer
            </div>
          </div>
        </>
      )}
    </div>
  );
}

