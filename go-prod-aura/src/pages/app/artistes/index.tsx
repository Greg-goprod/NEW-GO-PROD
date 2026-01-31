import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Music, Search, Plus, Grid3x3, List, Edit2, Trash2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useI18n } from "../../../lib/i18n";
import { Button } from "../../../components/ui/Button";
import { PageHeader } from "@/components/aura/PageHeader";
import { Input } from "../../../components/ui/Input";
import { supabase } from "../../../lib/supabaseClient";
import AddArtistModal from "./partials/AddArtistModal";
import EditArtistModal from "./partials/EditArtistModal";
import { ConfirmDeleteModal } from "../../../components/ui/ConfirmDeleteModal";
import { useEventStore } from "../../../store/useEventStore";
import { useCompanyId } from "@/hooks/useCompanyId";
import { useArtistsQuery, type ArtistFull } from "@/hooks/queries";
import { queryKeys } from "@/lib/queryClient";

// Type compatible avec EditArtistModal
type Artist = {
  id: string;
  name: string;
  status: 'active' | 'inactive' | 'archived';
  created_at: string;
  spotify_data?: {
    image_url?: string;
    followers?: number;
    popularity?: number;
    external_url?: string;
    spotify_id?: string;
    genres?: string[];
  };
};

type ViewMode = 'grid' | 'list';

export default function ArtistesPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const currentEvent = useEventStore((state) => state.currentEvent);
  
  // Company ID depuis le hook (synchrone)
  const { companyId } = useCompanyId();
  
  // Données artistes avec React Query (cache automatique)
  const { data: artists = [], isLoading, error } = useArtistsQuery(companyId);
  
  // États locaux pour l'UI
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(96);
  const [showAdd, setShowAdd] = useState(false);
  const [editingArtist, setEditingArtist] = useState<Artist | null>(null);
  const [deletingArtist, setDeletingArtist] = useState<ArtistFull | null>(null);
  const [sortColumn, setSortColumn] = useState<string>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Filtrage et tri côté client (instantané grâce au cache)
  const filteredAndSortedArtists = useMemo(() => {
    let result = [...artists];
    
    // Filtre par recherche
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      result = result.filter(artist => 
        artist.name.toLowerCase().includes(searchLower)
      );
    }
    
    // Filtre par statut
    if (statusFilter !== 'all') {
      result = result.filter(artist => artist.status === statusFilter);
    }
    
    // Tri
    result.sort((a, b) => {
      let aVal = '';
      let bVal = '';
      if (sortColumn === 'name') {
        aVal = a.name || '';
        bVal = b.name || '';
      } else if (sortColumn === 'status') {
        aVal = a.status || '';
        bVal = b.status || '';
      }
      const comparison = aVal.localeCompare(bVal);
      return sortDirection === 'asc' ? comparison : -comparison;
    });
    
    return result;
  }, [artists, searchQuery, statusFilter, sortColumn, sortDirection]);

  // Pagination côté client
  const totalCount = filteredAndSortedArtists.length;
  const totalPages = Math.ceil(totalCount / pageSize);
  const paginatedArtists = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredAndSortedArtists.slice(start, start + pageSize);
  }, [filteredAndSortedArtists, currentPage, pageSize]);

  // Reset page quand les filtres changent
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const handleStatusChange = (value: string) => {
    setStatusFilter(value);
    setCurrentPage(1);
  };

  const handlePageSizeChange = (value: number) => {
    setPageSize(value);
    setCurrentPage(1);
  };

  const handleArtistClick = (id: string) => {
    navigate(`/app/artistes/detail/${id}`);
  };

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const handleEditArtist = (artist: ArtistFull) => {
    // Convertir vers le type Artist compatible avec EditArtistModal
    setEditingArtist({
      id: artist.id,
      name: artist.name,
      status: artist.status || 'active',
      created_at: artist.created_at || new Date().toISOString(),
      spotify_data: artist.spotify_data,
    });
  };

  const handleDeleteArtist = (artist: ArtistFull) => {
    setDeletingArtist(artist);
  };

  const handleEditClose = () => {
    setEditingArtist(null);
  };

  const handleDeleteClose = () => {
    setDeletingArtist(null);
  };

  const handleEditSave = () => {
    setEditingArtist(null);
    // Invalider le cache pour rafraîchir les données
    if (companyId) {
      queryClient.invalidateQueries({ queryKey: queryKeys.artists(companyId) });
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingArtist) return;
    
    try {
      // Supprimer les données Spotify d'abord
      await supabase
        .from('spotify_data')
        .delete()
        .eq('artist_id', deletingArtist.id);
      
      // Supprimer l'artiste
      await supabase
        .from('artists')
        .delete()
        .eq('id', deletingArtist.id);
      
      setDeletingArtist(null);
      
      // Invalider le cache pour rafraîchir les données
      if (companyId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.artists(companyId) });
      }
    } catch (err) {
      console.error('Erreur lors de la suppression:', err);
    }
  };

  const handleAddSaved = () => {
    setShowAdd(false);
    setCurrentPage(1);
    // Invalider le cache pour rafraîchir les données
    if (companyId) {
      queryClient.invalidateQueries({ queryKey: queryKeys.artists(companyId) });
    }
  };

  const statusOptions = [
    { id: 'all', label: t('all') },
    { id: 'active', label: 'Active' },
    { id: 'inactive', label: 'Inactive' },
    { id: 'archived', label: 'Archived' },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <PageHeader
        icon={Music}
        title={t('artists').toUpperCase()}
        actions={
          <Button leftIcon={<Plus size={16} />} onClick={() => setShowAdd(true)}>
            {t('artists.addArtist')}
          </Button>
        }
      />

      {/* Search and filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <Input
            placeholder={t('search')}
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="px-4 py-2 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            {statusOptions.map(option => (
              <option key={option.id} value={option.id}>{option.label}</option>
            ))}
          </select>
          <select
            value={pageSize}
            onChange={(e) => handlePageSizeChange(Number(e.target.value))}
            className="px-4 py-2 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value={24}>24</option>
            <option value={48}>48</option>
            <option value={96}>96</option>
          </select>
          <div className="flex gap-1 border border-gray-200 dark:border-white/10 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded ${viewMode === 'grid' ? 'bg-violet-500 text-white' : 'text-gray-500'}`}
            >
              <Grid3x3 size={16} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded ${viewMode === 'list' ? 'bg-violet-500 text-white' : 'text-gray-500'}`}
            >
              <List size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-red-900/20 border border-red-700 text-red-400 p-4 rounded-lg">
          {error instanceof Error ? error.message : 'Une erreur est survenue'}
        </div>
      )}

      {/* Loading state */}
      {isLoading ? (
        <div className="text-center py-10 text-gray-500 dark:text-gray-400">
          {t('loading')}
        </div>
      ) : paginatedArtists.length === 0 ? (
        <div className="text-center py-10">
          <Music className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            {searchQuery || statusFilter !== 'all' ? 'Aucun résultat' : t('artists.noArtists')}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {searchQuery || statusFilter !== 'all' ? 'Essayez de modifier vos filtres' : t('artists.addFirst')}
          </p>
        </div>
      ) : (
        <>
          {/* Grid view */}
          {viewMode === 'grid' && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {paginatedArtists.map((artist) => (
                <div
                  key={artist.id}
                  className="card-surface card-hover p-4 rounded-xl transition-all relative group"
                >
                  {/* Icône Spotify en haut à droite */}
                  {artist.spotify_data?.external_url && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(artist.spotify_data?.external_url, '_blank');
                      }}
                      className="absolute top-2 right-2 bg-green-500 hover:bg-green-600 text-white p-2 rounded-full shadow-lg transition-colors z-10"
                      title="Ouvrir sur Spotify"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.44-.494.15-1.017-.122-1.167-.616-.15-.494.122-1.017.616-1.167 4.239-1.26 9.6-.66 13.2 1.68.479.3.578 1.02.262 1.5zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.18-1.2-.18-1.38-.719-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z"/>
                      </svg>
                    </button>
                  )}
                  
                  <div 
                    className="flex flex-col items-center text-center cursor-pointer"
                    onClick={() => handleArtistClick(artist.id)}
                  >
                    <img
                      src={artist.spotify_data?.image_url || `https://api.dicebear.com/7.x/initials/svg?seed=${artist.name}`}
                      alt={artist.name}
                      className="w-32 h-32 rounded-full object-cover mb-3 border-2 border-violet-400/20 hover:border-violet-400 transition-colors"
                    />
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white hover:text-violet-400 transition-colors uppercase">
                      {artist.name}
                    </h3>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* List view */}
          {viewMode === 'list' && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden border border-gray-200 dark:border-gray-700">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th 
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase cursor-pointer hover:text-violet-400 transition-colors select-none"
                      onClick={() => handleSort('name')}
                    >
                      <div className="flex items-center gap-2">
                        {t('artists.artist')}
                        <span className={sortColumn === 'name' ? 'text-violet-400' : 'text-gray-400 dark:text-gray-500'}>
                          {sortColumn === 'name' && sortDirection === 'asc' ? '▲' : '▼'}
                        </span>
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Réseaux sociaux
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      GIG
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {paginatedArtists.map((artist) => (
                    <tr
                      key={artist.id}
                      style={{ transition: 'background 0.15s ease' }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-hover-row)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = ''}
                    >
                      <td 
                        className="px-4 py-3 whitespace-nowrap cursor-pointer"
                        onClick={() => handleArtistClick(artist.id)}
                      >
                        <div className="flex items-center">
                          <img
                            className="h-10 w-10 rounded-full object-cover border border-violet-500"
                            src={artist.spotify_data?.image_url || `https://api.dicebear.com/7.x/initials/svg?seed=${artist.name}`}
                            alt={artist.name}
                          />
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900 dark:text-white uppercase">
                              {artist.name}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {/* Spotify */}
                          {artist.spotify_data?.external_url ? (
                            <a
                              href={artist.spotify_data.external_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="w-6 h-6 bg-[#1DB954] rounded-full flex items-center justify-center hover:scale-110 transition-transform"
                              title="Spotify"
                            >
                              <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.44-.494.15-1.017-.122-1.167-.616-.15-.494.122-1.017.616-1.167 4.239-1.26 9.6-.66 13.2 1.68.479.3.578 1.02.262 1.5zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.18-1.2-.18-1.38-.719-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z"/>
                              </svg>
                            </a>
                          ) : (
                            <div className="w-6 h-6 bg-gray-600 rounded-full flex items-center justify-center opacity-30" title="Spotify (non disponible)">
                              <svg className="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.44-.494.15-1.017-.122-1.167-.616-.15-.494.122-1.017.616-1.167 4.239-1.26 9.6-.66 13.2 1.68.479.3.578 1.02.262 1.5zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.18-1.2-.18-1.38-.719-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z"/>
                              </svg>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        <span className="text-gray-400"></span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditArtist(artist);
                            }}
                            className="p-2 text-gray-400 hover:text-blue-500 transition-colors"
                            title="Modifier l'artiste"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteArtist(artist);
                            }}
                            className="p-2 text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                            title="Supprimer l'artiste"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-between items-center mt-6">
              <Button
                variant="secondary"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                {t('previous')}
              </Button>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Page {currentPage} {t('of')} {totalPages} ({totalCount} {t('artists.total')})
              </span>
              <Button
                variant="secondary"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                {t('next')}
              </Button>
            </div>
          )}
        </>
      )}

      {/* Modal Ajouter */}
      {showAdd && companyId && (
        <AddArtistModal
          companyId={companyId}
          eventId={currentEvent?.id || null}
          onClose={() => setShowAdd(false)}
          onSaved={handleAddSaved}
        />
      )}

      {/* Modal Modifier */}
      {editingArtist && companyId && (
        <EditArtistModal
          artist={editingArtist}
          companyId={companyId}
          onClose={handleEditClose}
          onSaved={handleEditSave}
        />
      )}

      {/* Modal Supprimer */}
      {deletingArtist && (
        <ConfirmDeleteModal
          isOpen={true}
          onClose={handleDeleteClose}
          onConfirm={handleDeleteConfirm}
          title="Supprimer l'artiste"
          message="Êtes-vous sûr de vouloir supprimer cet artiste ? Cette action supprimera également toutes les données associées."
          itemName={deletingArtist.name}
        />
      )}
    </div>
  );
}
