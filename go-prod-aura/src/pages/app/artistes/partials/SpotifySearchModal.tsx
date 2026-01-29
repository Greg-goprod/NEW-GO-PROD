import { useState, useEffect } from "react";
import { Search, Music, ExternalLink } from "lucide-react";
import { Modal } from "@/components/aura/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

interface SpotifyArtist {
  id: string;
  name: string;
  external_urls: { spotify: string };
  images: Array<{ url: string; height: number; width: number }>;
  popularity: number;
  genres: string[];
  followers: { total: number };
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (artist: SpotifyArtist) => void;
  searchQuery: string;
}

export default function SpotifySearchModal({ isOpen, onClose, onSelect, searchQuery }: Props) {
  const [artists, setArtists] = useState<SpotifyArtist[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState(searchQuery);

  // Recherche automatique quand le modal s'ouvre
  useEffect(() => {
    if (isOpen && searchQuery.trim()) {
      searchArtists(searchQuery);
    }
  }, [isOpen, searchQuery]);

  const searchArtists = async (query: string) => {
    if (!query.trim()) return;
    
    console.log("🔍 Recherche Spotify pour:", query);
    setLoading(true);
    setError(null);
    
    try {
      // Utiliser la fonction de recherche Spotify
      console.log("📡 Import de la fonction de recherche...");
      const { searchSpotifyArtists } = await import('../../../../pages/api/spotify/search');
      console.log("🎵 Lancement de la recherche...");
      const results = await searchSpotifyArtists(query.trim());
      console.log("✅ Résultats trouvés:", results.length);
      setArtists(results);
    } catch (err) {
      console.error("❌ Erreur lors de la recherche Spotify:", err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      setArtists([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    searchArtists(searchTerm);
  };

  const handleSelect = (artist: SpotifyArtist) => {
    onSelect(artist);
    onClose();
  };

  const formatFollowers = (count: number) => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title="Rechercher sur Spotify"
      size="lg"
      footer={
        <Button variant="secondary" onClick={onClose}>
          Annuler
        </Button>
      }
    >
      <div className="space-y-4">
        {/* Barre de recherche */}
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Rechercher un artiste sur Spotify..."
              className="input pl-10 h-10"
            />
          </div>
          <Button type="submit" disabled={loading || !searchTerm.trim()}>
            {loading ? "Recherche..." : "Rechercher"}
          </Button>
        </form>

        {/* Résultats */}
        {error && (
          <div className="text-red-400 text-sm text-center py-4">
            {error}
          </div>
        )}

        {loading && (
          <div className="text-center py-8">
            <div className="inline-flex items-center gap-2 text-gray-400">
              <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
              Recherche en cours...
            </div>
          </div>
        )}

        {!loading && !error && artists.length > 0 && (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            <p className="text-sm text-gray-400 mb-3">
              {artists.length} résultat{artists.length > 1 ? 's' : ''} trouvé{artists.length > 1 ? 's' : ''}
            </p>
            {artists.slice(0, 8).map((artist) => (
              <div
                key={artist.id}
                className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer"
                style={{ 
                  borderColor: 'var(--border-default)',
                  transition: 'background 0.15s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-hover-row)'}
                onMouseLeave={(e) => e.currentTarget.style.background = ''}
                onClick={() => handleSelect(artist)}
              >
                {/* Image */}
                <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0">
                  {artist.images[0] ? (
                    <img
                      src={artist.images[0].url}
                      alt={artist.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                      <Music className="w-6 h-6 text-gray-400" />
                    </div>
                  )}
                </div>

                {/* Infos */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-sm truncate">{artist.name}</h3>
                  <div className="flex items-center gap-4 text-xs text-gray-500 mt-1">
                    <span>{formatFollowers(artist.followers.total)} followers</span>
                    <span>Popularité: {artist.popularity}/100</span>
                    {artist.genres.length > 0 && (
                      <span className="truncate">{artist.genres[0]}</span>
                    )}
                  </div>
                </div>

                {/* Bouton Spotify */}
                <a
                  href={artist.external_urls.spotify}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 text-green-500 hover:text-green-400 transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            ))}
          </div>
        )}

        {!loading && !error && artists.length === 0 && searchTerm && (
          <div className="text-center py-8 text-gray-400">
            <Music className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Aucun artiste trouvé pour "{searchTerm}"</p>
            <p className="text-sm mt-1">Essayez avec un autre nom</p>
          </div>
        )}
      </div>
    </Modal>
  );
}
