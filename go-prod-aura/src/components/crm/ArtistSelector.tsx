import { useState, useEffect, useRef } from 'react';
import { ChevronDown, Music, X } from 'lucide-react';
import { fetchArtists, type Artist } from '@/api/artistsApi';
import { useToast } from '@/components/aura/ToastProvider';

interface ArtistSelectorProps {
  companyId: string;
  selectedArtistIds: string[];
  onChange: (artistIds: string[]) => void;
}

export function ArtistSelector({ companyId, selectedArtistIds, onChange }: ArtistSelectorProps) {
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { error: toastError } = useToast();

  // Charger les artistes
  useEffect(() => {
    if (!companyId) return;
    
    const loadArtists = async () => {
      try {
        setLoading(true);
        const data = await fetchArtists(companyId);
        setArtists(data);
      } catch (err) {
        console.error('Erreur chargement artistes:', err);
        toastError('Erreur lors du chargement des artistes');
      } finally {
        setLoading(false);
      }
    };

    loadArtists();
  }, [companyId, toastError]);

  // Fermer le dropdown au clic extérieur
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggle = (artistId: string) => {
    if (selectedArtistIds.includes(artistId)) {
      onChange(selectedArtistIds.filter(id => id !== artistId));
    } else {
      onChange([...selectedArtistIds, artistId]);
    }
  };

  const handleRemove = (artistId: string) => {
    onChange(selectedArtistIds.filter(id => id !== artistId));
  };

  const selectedArtists = artists.filter(a => selectedArtistIds.includes(a.id));

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-900 dark:text-gray-100">
        Artistes associés <span className="text-gray-400">(optionnel)</span>
      </label>

      {/* Tags des artistes sélectionnés */}
      {selectedArtists.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2 max-h-24 overflow-y-auto p-2 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
          {selectedArtists.map(artist => (
            <span
              key={artist.id}
              className="inline-flex items-center gap-1 px-2 py-1 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 rounded text-sm"
            >
              <Music className="w-3 h-3" />
              {artist.name}
              <button
                type="button"
                onClick={() => handleRemove(artist.id)}
                className="ml-1 hover:text-violet-900 dark:hover:text-violet-100"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Dropdown */}
      <div ref={dropdownRef} className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          disabled={loading}
          className="w-full flex items-center justify-between px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:border-violet-500 dark:hover:border-violet-500 transition-colors disabled:opacity-50"
        >
          <span className="text-sm text-gray-900 dark:text-gray-100">
            {loading ? 'Chargement...' : `Sélectionner des artistes (${selectedArtistIds.length})`}
          </span>
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Liste déroulante */}
        {isOpen && (
          <div className="absolute z-50 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {artists.length === 0 ? (
              <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 text-center">
                Aucun artiste disponible
              </div>
            ) : (
              <div className="py-1">
                {artists.map(artist => (
                  <label
                    key={artist.id}
                    className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedArtistIds.includes(artist.id)}
                      onChange={() => handleToggle(artist.id)}
                      className="w-4 h-4 text-violet-600 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-violet-500 dark:focus:ring-violet-400"
                    />
                    <Music className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-900 dark:text-gray-100">
                      {artist.name}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-400">
        Vous pouvez associer ce contact à plusieurs artistes
      </p>
    </div>
  );
}





