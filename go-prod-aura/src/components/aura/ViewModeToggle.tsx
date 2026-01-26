import { List, Grid3x3 } from 'lucide-react';

interface ViewModeToggleProps {
  mode: 'list' | 'grid';
  onChange: (mode: 'list' | 'grid') => void;
}

/**
 * Composant standardisé pour basculer entre vue liste et vue grille
 * 
 * @example
 * const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
 * 
 * <ViewModeToggle mode={viewMode} onChange={setViewMode} />
 */
export function ViewModeToggle({ mode, onChange }: ViewModeToggleProps) {
  return (
    <div className="flex gap-2 bg-white dark:bg-gray-800 rounded-lg p-1 shadow">
      <button
        onClick={() => onChange('list')}
        className={`p-2 rounded transition-colors ${
          mode === 'list'
            ? 'bg-violet-500 text-white'
            : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
        }`}
        title="Vue liste"
        aria-label="Vue liste"
      >
        <List className="w-5 h-5" />
      </button>
      <button
        onClick={() => onChange('grid')}
        className={`p-2 rounded transition-colors ${
          mode === 'grid'
            ? 'bg-violet-500 text-white'
            : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
        }`}
        title="Vue grille"
        aria-label="Vue grille"
      >
        <Grid3x3 className="w-5 h-5" />
      </button>
    </div>
  );
}










