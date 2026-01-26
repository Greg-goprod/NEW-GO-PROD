import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Music, Search, Plus, Grid3x3, List, Edit2, Trash2 } from "lucide-react";
import { useI18n } from "../../../lib/i18n";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import { getCurrentCompanyId } from "../../../lib/tenant";
// import { triggerSpotifySync } from "../../../lib/spotifySync"; // Temporairement désactivé
import { supabase } from "../../../lib/supabaseClient";
import AddArtistModal from "./partials/AddArtistModal";
import EditArtistModal from "./partials/EditArtistModal";
import { ConfirmDeleteModal } from "../../../components/ui/ConfirmDeleteModal";
import { useEventStore } from "../../../store/useEventStore";

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
  };
  social_media_data?: {
    instagram_url?: string;
    facebook_url?: string;
    twitter_url?: string;
    youtube_url?: string;
    tiktok_url?: string;
    website_url?: string;
    threads_url?: string;
    soundcloud_url?: string;
    bandcamp_url?: string;
    wikipedia_url?: string;
  };
};

type ViewMode = 'grid' | 'list';

export default function ArtistesPage() {
  const { t } = useI18n();
  const currentEvent = useEventStore((state) => state.currentEvent);
  const navigate = useNavigate();
  
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [pageSize, setPageSize] = useState(96);
  const [showAdd, setShowAdd] = useState(false);
  // Variables de sync temporairement désactivées
  // const [syncState, setSyncState] = useState<"idle"|"running"|"done"|"error">("idle");
  // const [syncMsg, setSyncMsg] = useState<string | undefined>(undefined);
  // const [isSyncing, setIsSyncing] = useState(false);
  const [editingArtist, setEditingArtist] = useState<Artist | null>(null);
  const [deletingArtist, setDeletingArtist] = useState<Artist | null>(null);
  const [sortColumn, setSortColumn] = useState<string>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  
  // Utiliser une ref pour éviter les boucles infinies
  const isLoadingArtistsRef = useRef(false);
  
  const totalPages = Math.ceil(totalCount / pageSize);

  // Récupération du company_id
  useEffect(() => {
    (async () => {
      try {
        const cid = await getCurrentCompanyId(supabase);
        setCompanyId(cid);
        // Charger les artistes une fois que companyId est défini
        await fetchArtists(cid);
      } catch (e) {
        console.error('Erreur récupération company_id:', e);
        setError('Impossible de récupérer le company_id');
      }
    })();
  }, []);

  // Synchronisation automatique au mount - DÉSACTIVÉE pour éviter les boucles
  // useEffect(() => {
  //   if (!companyId) return;
  //   
  //   (async () => {
  //     setSyncState("running");
  //     const r = await triggerSpotifySync(supabase, companyId, 25);
  //     setSyncState(r.ok ? "done" : "error");
  //     setSyncMsg(r.message);
  //     await fetchArtists();
  //   })();
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, [companyId]);

  const fetchArtists = useCallback(async (currentCompanyId?: string) => {
    // Protection contre les appels multiples avec ref
    if (isLoadingArtistsRef.current) {
      console.log("⏳ Chargement déjà en cours, ignorer l'appel");
      return;
    }

    try {
      isLoadingArtistsRef.current = true;
      setLoading(true);
      setError(null);

      const idToUse = currentCompanyId || companyId;
      if (!idToUse) {
        console.log("❌ Company ID manquant");
        isLoadingArtistsRef.current = false;
        setLoading(false);
        return;
      }
      
      console.log("🔍 Recherche des artistes pour company_id:", idToUse);
      
      let query = supabase
        .from('artists')
        .select('*, spotify_data(*), social_media_data(*)', { count: 'exact' })
        .order(sortColumn, { ascending: sortDirection === 'asc' });
      
      // Filtrer par company_id
      query = query.eq('company_id', idToUse);
      console.log("🔍 Requête avec filtre company_id:", idToUse);

      if (searchQuery) {
        query = query.ilike('name', `%${searchQuery}%`);
        console.log("🔍 Requête avec recherche:", searchQuery);
      }

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
        console.log("🔍 Requête avec filtre status:", statusFilter);
      }

      console.log("🔍 Exécution de la requête...");
      const { data, error: err, count } = await query
        .range((currentPage - 1) * pageSize, currentPage * pageSize - 1);

      if (err) {
        console.error("❌ Erreur lors de la requête:", err);
        throw err;
      }

      console.log("📊 Données récupérées:", data);
      console.log("📊 Nombre d'artistes:", data?.length);
      
      // Normaliser les données Spotify (si c'est un tableau, prendre le premier élément)
      const normalizedData = data?.map(artist => {
        let spotifyData = artist.spotify_data;
        
        // Si spotify_data est un tableau, prendre le premier élément
        if (Array.isArray(spotifyData)) {
          console.log(`🔧 spotify_data est un tableau pour ${artist.name}, normalisation...`);
          spotifyData = spotifyData.length > 0 ? spotifyData[0] : undefined;
        }
        
        return {
          ...artist,
          spotify_data: spotifyData
        };
      });
      
      // Diagnostic des données Spotify
      if (normalizedData && normalizedData.length > 0) {
        console.log("🎵 === DIAGNOSTIC DONNÉES SPOTIFY ===");
        normalizedData.forEach((artist, index) => {
          console.log(`🎤 Artiste ${index + 1}: ${artist.name}`, {
            hasSpotifyData: !!artist.spotify_data,
            image_url: artist.spotify_data?.image_url,
            external_url: artist.spotify_data?.external_url,
            followers: artist.spotify_data?.followers,
            popularity: artist.spotify_data?.popularity
          });
        });
        console.log("🎵 === FIN DIAGNOSTIC ===");
      }

      console.log("✅ Résultats trouvés:", {
        artists: normalizedData?.length || 0,
        totalCount: count || 0,
        companyId: idToUse
      });

      setArtists(normalizedData || []);
      setTotalCount(count || 0);
    } catch (err: unknown) {
      console.error('💥 Erreur lors du chargement des artistes:', err);
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setLoading(false);
      isLoadingArtistsRef.current = false;
    }
  }, [companyId, currentPage, searchQuery, statusFilter, pageSize, sortColumn, sortDirection]);

  useEffect(() => {
    fetchArtists();
  }, [fetchArtists]);

  const handleArtistClick = (id: string) => {
    navigate(`/app/artistes/detail/${id}`);
  };

  // 🔧 FONCTION DE SYNCHRONISATION MANUELLE SPOTIFY (conservée pour usage futur)
  // Cette fonction peut être appelée manuellement si besoin de forcer une synchronisation
  // La synchronisation automatique se fait quotidiennement à 12h00 UTC via cron job
  // Fonction temporairement désactivée pour le build
  /* const _handleManualSpotifySync = async () => {
    if (isSyncing || !companyId) return;
    
    setIsSyncing(true);
    setSyncState("running");
    setSyncMsg("Synchronisation en cours...");
    
    try {
      const result = await triggerSpotifySync(supabase, companyId, 100);
      setSyncState(result.ok ? "done" : "error");
      setSyncMsg(result.message);
      
      if (result.ok) {
        await fetchArtists();
      }
    } catch (error) {
      setSyncState("error");
      setSyncMsg("Erreur lors de la synchronisation");
      console.error("Erreur sync:", error);
    } finally {
      setIsSyncing(false);
    }
  }; */

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const handleEditArtist = (artist: Artist) => {
    setEditingArtist(artist);
  };

  const handleDeleteArtist = (artist: Artist) => {
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
    fetchArtists();
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
      fetchArtists();
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
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
      <div className="flex items-center justify-between mb-6">
        <header className="flex items-center gap-2">
          <Music className="w-5 h-5 text-violet-400" />
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">{t('artists').toUpperCase()}</h1>
        </header>
        <div className="flex items-center gap-2">
          <Button leftIcon={<Plus size={16} />} onClick={() => setShowAdd(true)}>
            {t('artists.addArtist')}
          </Button>
        </div>
      </div>

      {/* Status de synchronisation - Temporairement désactivé */}
      {/* {syncMsg && (
        <div className={`p-3 rounded-lg text-sm ${
          syncState === "done" ? "bg-green-500/10 text-green-400 border border-green-500/20" :
          syncState === "error" ? "bg-red-500/10 text-red-400 border border-red-500/20" :
          "bg-blue-500/10 text-blue-400 border border-blue-500/20"
        }`}>
          {syncMsg}
        </div>
      )} */}

      {/* Search and filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <Input
            placeholder={t('search')}
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-4 py-2 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            {statusOptions.map(option => (
              <option key={option.id} value={option.id}>{option.label}</option>
            ))}
          </select>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="px-4 py-2 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value={24}>24</option>
            <option value={48}>48</option>
            <option value={96}>96</option>
          </select>
          {/* Indicateur de sync temporairement désactivé */}
          {/* {syncState !== "idle" && (
            <span className={`text-sm ${syncState==="error" ? "text-red-400" : "text-gray-500 dark:text-gray-400"}`}>
              {syncState==="running" ? "Synchro en cours…" : (syncMsg ?? "Synchro effectuée")}
            </span>
          )} */}
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
          {error}
        </div>
      )}

      {/* Loading state */}
      {loading ? (
        <div className="text-center py-10 text-gray-500 dark:text-gray-400">
          {t('loading')}
        </div>
      ) : artists.length === 0 ? (
        <div className="text-center py-10">
          <Music className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            {t('artists.noArtists')}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t('artists.addFirst')}
          </p>
        </div>
      ) : (
        <>
          {/* Grid view */}
          {viewMode === 'grid' && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {artists.map((artist) => (
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
                  {artists.map((artist) => (
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
                          {/* Website */}
                          {artist.social_media_data?.website_url ? (
                            <a
                              href={artist.social_media_data.website_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="w-6 h-6 bg-gray-700 rounded-full flex items-center justify-center hover:scale-110 transition-transform"
                              title="Site web"
                            >
                              <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="2" y1="12" x2="22" y2="12"></line>
                                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                              </svg>
                            </a>
                          ) : (
                            <div className="w-6 h-6 bg-gray-600 rounded-full flex items-center justify-center opacity-30" title="Site web (non disponible)">
                              <svg className="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="2" y1="12" x2="22" y2="12"></line>
                                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                              </svg>
                            </div>
                          )}
                          
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
                          
                          {/* Instagram */}
                          {artist.social_media_data?.instagram_url ? (
                            <a
                              href={artist.social_media_data.instagram_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="w-6 h-6 bg-gradient-to-br from-[#833AB4] via-[#FD1D1D] to-[#FCAF45] rounded-full flex items-center justify-center hover:scale-110 transition-transform"
                              title="Instagram"
                            >
                              <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                              </svg>
                            </a>
                          ) : (
                            <div className="w-6 h-6 bg-gray-600 rounded-full flex items-center justify-center opacity-30" title="Instagram (non disponible)">
                              <svg className="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                              </svg>
                            </div>
                          )}
                          
                          {/* Facebook */}
                          {artist.social_media_data?.facebook_url ? (
                            <a
                              href={artist.social_media_data.facebook_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="w-6 h-6 bg-[#1877F2] rounded-full flex items-center justify-center hover:scale-110 transition-transform"
                              title="Facebook"
                            >
                              <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                              </svg>
                            </a>
                          ) : (
                            <div className="w-6 h-6 bg-gray-600 rounded-full flex items-center justify-center opacity-30" title="Facebook (non disponible)">
                              <svg className="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                              </svg>
                            </div>
                          )}
                          
                          {/* YouTube */}
                          {artist.social_media_data?.youtube_url ? (
                            <a
                              href={artist.social_media_data.youtube_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="w-6 h-6 bg-[#FF0000] rounded-full flex items-center justify-center hover:scale-110 transition-transform"
                              title="YouTube"
                            >
                              <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                              </svg>
                            </a>
                          ) : (
                            <div className="w-6 h-6 bg-gray-600 rounded-full flex items-center justify-center opacity-30" title="YouTube (non disponible)">
                              <svg className="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                              </svg>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {/* Colonne GIG - à remplir plus tard */}
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
                            className="p-2 text-gray-400 hover:text-red-500 transition-colors"
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
          onSaved={() => { setShowAdd(false); setCurrentPage(1); fetchArtists(); }}
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
