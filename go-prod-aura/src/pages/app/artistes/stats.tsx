import { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { BarChart3, Search, Music, Clock, X, ChevronDown, Share2, Activity, Users, Radio, Mic2, Disc3, ExternalLink, TrendingUp, Play, Camera, Headphones, List, Globe } from "lucide-react";
import { PageHeader } from "../../../components/aura/PageHeader";
import { supabase } from "../../../lib/supabaseClient";
import { getCurrentCompanyId } from "../../../lib/tenant";
// Composants de la page detail artiste - chargent depuis Supabase directement
import { ArtistHistoryChart } from "../../../components/artist/ArtistHistoryChart";
import { ArtistConcerts } from "../../../components/artist/ArtistConcerts";
import { SocialLinksContainer } from "../../../components/artist/SocialLinksContainer";
import { WorldMapAudience, EUROPEAN_COUNTRIES, LISTENER_SOURCES, FOLLOWER_SOURCES, STREAMS_SOURCES } from "../../../components/charts/WorldMapAudience";
import type { MapMode, DataType } from "../../../components/charts/WorldMapAudience";
import { ArtistPlatformsBar } from "../../../components/artist/ArtistPlatformsBar";

const HISTORY_KEY = "artist_stats_history";
const MAX_HISTORY = 10;

// Mapping nom de pays vers code ISO
const COUNTRY_NAME_TO_CODE: Record<string, string> = {
  "Switzerland": "CH", "France": "FR", "Germany": "DE", "United States": "US", "USA": "US",
  "United Kingdom": "GB", "UK": "GB", "Spain": "ES", "Italy": "IT", "Belgium": "BE",
  "Netherlands": "NL", "Sweden": "SE", "Norway": "NO", "Denmark": "DK", "Finland": "FI",
  "Austria": "AT", "Portugal": "PT", "Poland": "PL", "Canada": "CA", "Australia": "AU",
  "Brazil": "BR", "Mexico": "MX", "Argentina": "AR", "Japan": "JP", "South Korea": "KR",
  "China": "CN", "Russia": "RU", "India": "IN", "South Africa": "ZA", "Ireland": "IE",
  "New Zealand": "NZ", "Greece": "GR", "Turkey": "TR", "Czech Republic": "CZ", "Czechia": "CZ",
  "Hungary": "HU", "Romania": "RO", "Ukraine": "UA", "Colombia": "CO", "Chile": "CL",
  "Peru": "PE", "Venezuela": "VE", "Israel": "IL", "Egypt": "EG", "Morocco": "MA",
  "Nigeria": "NG", "Indonesia": "ID", "Philippines": "PH", "Thailand": "TH", "Vietnam": "VN",
  "Malaysia": "MY", "Singapore": "SG", "Taiwan": "TW", "Croatia": "HR", "Slovenia": "SI",
  "Slovakia": "SK", "Bulgaria": "BG", "Serbia": "RS", "Iceland": "IS", "Luxembourg": "LU",
};

// Fonction pour obtenir le code pays depuis le nom
function getCountryCodeFromName(countryName: string | undefined): string | null {
  if (!countryName) return null;
  return COUNTRY_NAME_TO_CODE[countryName] || null;
}

// Onglets de navigation
type TabId = "social" | "activity" | "audiences" | "radio" | "concerts" | "discographie";

const TABS: { id: TabId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "social", label: "SOCIAL MEDIA", icon: Share2 },
  { id: "activity", label: "ACTIVITY FEED", icon: Activity },
  { id: "audiences", label: "AUDIENCES", icon: Users },
  { id: "radio", label: "RADIO STATS", icon: Radio },
  { id: "concerts", label: "CONCERTS", icon: Mic2 },
  { id: "discographie", label: "DISCOGRAPHIE", icon: Disc3 },
];

type Artist = {
  id: string;
  name: string;
  spotify_id?: string;
  image_url?: string;
  spotify_data?: {
    image_url?: string;
    spotify_id?: string;
  };
};

type RecentArtist = {
  id: string;
  name: string;
  image_url?: string;
  timestamp: number;
};


export default function ArtistStatsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  // Initialiser selectedArtistId depuis l'URL si present
  const [selectedArtistId, setSelectedArtistId] = useState<string | null>(() => {
    return searchParams.get("artistId");
  });
  const [loadingArtists, setLoadingArtists] = useState(true);
  const [recentArtists, setRecentArtists] = useState<RecentArtist[]>([]);
  const [artistBio, setArtistBio] = useState<string | null>(null);
  const [bioExpanded, setBioExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("social");
  const [enrichedData, setEnrichedData] = useState<{
    biography?: string;
    country_name?: string;
    city?: string;
    born_year?: number;
    formed_year?: number;
    artist_type?: string;
    gender?: string;
    style?: string;
    mood?: string;
    genres?: string[];
    disambiguation?: string;
    discogs_releases_count?: number;
    url_musicbrainz?: string;
    url_wikipedia_en?: string;
    url_wikipedia_fr?: string;
    url_wikidata?: string;
    url_discogs?: string;
    // Donnees Wikidata
    birth_date?: string;
    birth_place?: string;
    activity_start?: number;
    activity_end?: number;
    nationalities?: string[];
    occupations?: string[];
    instruments?: string[];
    labels?: string[];
    awards?: string[];
    website_official?: string;
    biography_en?: string;
    biography_fr?: string;
  } | null>(null);

  // Charger l'historique depuis localStorage
  useEffect(() => {
    const stored = localStorage.getItem(HISTORY_KEY);
    if (stored) {
      try {
        setRecentArtists(JSON.parse(stored));
      } catch (e) {
        console.error("Erreur parsing historique:", e);
      }
    }
  }, []);

  // Synchroniser selectedArtistId avec l'URL (pour navigation back/forward)
  useEffect(() => {
    const artistIdFromUrl = searchParams.get("artistId");
    if (artistIdFromUrl !== selectedArtistId) {
      setSelectedArtistId(artistIdFromUrl);
    }
  }, [searchParams]);

  // Charger la biographie et les donnees enrichies quand un artiste est selectionne
  useEffect(() => {
    if (!selectedArtistId) {
      setArtistBio(null);
      setBioExpanded(false);
      setEnrichedData(null);
      return;
    }
    
    const loadData = async () => {
      // Charger bio depuis artists
      const { data: artistData } = await supabase
        .from("artists")
        .select("bio")
        .eq("id", selectedArtistId)
        .single();
      
      setArtistBio(artistData?.bio || null);
      
      // Charger donnees enrichies depuis artists_enriched
      const { data: enriched } = await supabase
        .from("artists_enriched")
        .select(`
          biography,
          country_name,
          city,
          born_year,
          formed_year,
          artist_type,
          gender,
          style,
          mood,
          genres,
          disambiguation,
          discogs_releases_count,
          url_musicbrainz,
          url_wikipedia_en,
          url_wikipedia_fr,
          url_wikidata,
          url_discogs,
          birth_date,
          birth_place,
          activity_start,
          activity_end,
          nationalities,
          occupations,
          instruments,
          labels,
          awards,
          website_official,
          biography_en,
          biography_fr
        `)
        .eq("artist_id", selectedArtistId)
        .single();
      
      // Charger les genres depuis artist_genres (Songstats)
      const { data: genresData } = await supabase
        .from("artist_genres")
        .select("genre")
        .eq("artist_id", selectedArtistId);
      
      const songstatsGenres = genresData?.map(g => g.genre) || [];
      
      // Fusionner: utiliser genres Songstats si disponibles, sinon ceux de artists_enriched
      const finalGenres = songstatsGenres.length > 0 ? songstatsGenres : (enriched?.genres || []);
      // Le premier genre devient le "style" si pas de style defini
      const finalStyle = enriched?.style || (finalGenres.length > 0 ? finalGenres[0] : null);
      const finalSubgenres = finalStyle && finalGenres.length > 0 && finalGenres[0] === finalStyle 
        ? finalGenres.slice(1) 
        : finalGenres;
      
      setEnrichedData(enriched ? { ...enriched, style: finalStyle, genres: finalSubgenres } : null);
    };
    
    loadData();
  }, [selectedArtistId]);

  // Ajouter un artiste a l'historique
  const addToHistory = useCallback((artist: Artist) => {
    setRecentArtists(prev => {
      const filtered = prev.filter(a => a.id !== artist.id);
      const newEntry: RecentArtist = {
        id: artist.id,
        name: artist.name,
        image_url: artist.spotify_data?.image_url || artist.image_url,
        timestamp: Date.now()
      };
      const updated = [newEntry, ...filtered].slice(0, MAX_HISTORY);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Supprimer un artiste de l'historique
  const removeFromHistory = useCallback((artistId: string) => {
    setRecentArtists(prev => {
      const updated = prev.filter(a => a.id !== artistId);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Récupérer le company_id et la liste des artistes
  useEffect(() => {
    (async () => {
      try {
        const cid = await getCurrentCompanyId(supabase);
        setCompanyId(cid);
        
        // Charger la liste des artistes
        const { data, error } = await supabase
          .from("artists")
          .select("id, name, spotify_data(*)")
          .eq("company_id", cid)
          .eq("status", "active")
          .order("name");
        
        if (error) throw error;
        
        // Normaliser spotify_data et extraire le spotify_id
        const normalizedData = data?.map(artist => {
          const spotifyData = Array.isArray(artist.spotify_data) && artist.spotify_data.length > 0
            ? artist.spotify_data[0]
            : artist.spotify_data;
          
          return {
            ...artist,
            spotify_data: spotifyData,
            spotify_id: spotifyData?.spotify_id || null
          };
        });
        
        // Filtrer pour ne garder que les artistes ayant un Spotify ID
        const artistsWithSpotify = normalizedData?.filter(artist => artist.spotify_id) || [];
        
        setArtists(artistsWithSpotify);
      } catch (e) {
        console.error('Erreur chargement artistes:', e);
      } finally {
        setLoadingArtists(false);
      }
    })();
  }, []);

  // Selection d'un artiste - les composants chargent depuis Supabase directement
  const handleArtistSelect = (artistId: string) => {
    const artist = artists.find(a => a.id === artistId);
    if (artist) {
      addToHistory(artist);
    }
    setSelectedArtistId(artistId);
    // Mettre a jour l'URL pour persister la selection (navigation back/forward)
    setSearchParams({ artistId }, { replace: true });
    // Les composants ArtistStatsOverview, ArtistHistoryChart, ArtistConcerts, ContainerSongstats
    // chargent automatiquement leurs donnees depuis Supabase grace a leur useEffect
  };

  // Filtrer les artistes par recherche
  const filteredArtists = useMemo(() => {
    return artists.filter(a => 
      a.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [artists, searchQuery]);

  const selectedArtist = artists.find(a => a.id === selectedArtistId);

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        icon={BarChart3}
        title="STATS ARTISTES"
      />

      {/* Container : Historique des artistes recemment consultes */}
      <div className="bg-white dark:bg-slate-950/40 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-4 h-4 text-slate-400" />
          <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400">
            Artistes recemment consultes
          </h3>
        </div>
        <div className="grid grid-cols-5 md:grid-cols-10 gap-3">
          {recentArtists.map((artist) => (
            <div key={artist.id} className="relative group">
              <button
                onClick={() => handleArtistSelect(artist.id)}
                className={`w-full flex flex-col items-center gap-2 p-2 rounded-xl transition-all ${
                  selectedArtistId === artist.id
                    ? "bg-violet-100 dark:bg-violet-900/30 ring-2 ring-violet-500"
                    : "hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                {artist.image_url ? (
                  <img
                    src={artist.image_url}
                    alt={artist.name}
                    className="w-12 h-12 md:w-14 md:h-14 rounded-full object-cover shadow-md"
                  />
                ) : (
                  <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-md">
                    <Music className="w-6 h-6 text-white" />
                  </div>
                )}
                <span className="text-xs text-slate-700 dark:text-slate-300 text-center truncate w-full">
                  {artist.name.length > 10 ? artist.name.substring(0, 10) + "..." : artist.name}
                </span>
              </button>
              {/* Bouton supprimer */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeFromHistory(artist.id);
                }}
                className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
          {/* Emplacements vides */}
          {Array.from({ length: Math.max(0, 10 - recentArtists.length) }).map((_, i) => (
            <div
              key={`empty-${i}`}
              className="w-full flex flex-col items-center gap-2 p-2"
            >
              <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-slate-200 dark:bg-slate-800 border-2 border-dashed border-slate-300 dark:border-slate-700" />
            </div>
          ))}
        </div>
      </div>

      {/* Barre de recherche et selection d'artiste */}
      <div className="bg-white dark:bg-slate-950/40 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Recherche textuelle */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher un artiste par nom..."
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>

          {/* Dropdown de selection */}
          <div>
            <select
              value={selectedArtistId || ""}
              onChange={(e) => handleArtistSelect(e.target.value)}
              disabled={loadingArtists}
              className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              <option value="">-- Selectionner un artiste --</option>
              {filteredArtists.map(artist => (
                <option key={artist.id} value={artist.id}>
                  {artist.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Liste de recherche rapide */}
        {searchQuery && filteredArtists.length > 0 && !selectedArtistId && (
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2">
            {filteredArtists.slice(0, 8).map(artist => (
              <button
                key={artist.id}
                onClick={() => handleArtistSelect(artist.id)}
                className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left"
              >
                {artist.spotify_data?.image_url ? (
                  <img 
                    src={artist.spotify_data.image_url} 
                    alt={artist.name}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-violet-500 flex items-center justify-center">
                    <Music className="w-4 h-4 text-white" />
                  </div>
                )}
                <span className="text-sm text-slate-900 dark:text-slate-100 truncate">
                  {artist.name}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Container OVERVIEW - Compact */}
      {selectedArtist && (
        <div className="bg-white dark:bg-slate-950/40 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
          <div className="flex gap-4">
            {/* Photo artiste - plus petite */}
            <div className="flex-shrink-0">
              {selectedArtist.spotify_data?.image_url ? (
                <img
                  src={selectedArtist.spotify_data.image_url}
                  alt={selectedArtist.name}
                  className="w-20 h-20 rounded-xl object-cover shadow-md"
                />
              ) : (
                <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-md">
                  <Music className="w-8 h-8 text-white" />
                </div>
              )}
            </div>
            
            {/* Infos artiste - compact */}
            <div className="flex-1 min-w-0">
              {/* Nom + disambiguation */}
              <div className="flex items-center gap-2 mb-1">
                {/* Drapeau du pays d'origine */}
                {enrichedData?.country_name && getCountryCodeFromName(enrichedData.country_name) && (
                  <img 
                    src={`https://flagcdn.com/24x18/${getCountryCodeFromName(enrichedData.country_name)?.toLowerCase()}.png`}
                    alt={enrichedData.country_name}
                    className="w-6 h-4 object-cover rounded-sm shadow-sm"
                  />
                )}
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 truncate">
                {selectedArtist.name}
              </h2>
                {enrichedData?.disambiguation && (
                  <span className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {enrichedData.disambiguation}
                  </span>
                )}
              </div>
              
              {/* Infos en ligne - separees par des points */}
              {enrichedData && (
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600 dark:text-slate-400 mb-2">
                  {enrichedData.artist_type && (
                    <span>{enrichedData.artist_type === 'Person' ? 'Solo' : enrichedData.artist_type === 'Group' ? 'Groupe' : enrichedData.artist_type}</span>
                  )}
                  {enrichedData.gender && enrichedData.artist_type === 'Person' && (
                    <>
                      <span className="text-slate-300 dark:text-slate-600">•</span>
                      <span>{enrichedData.gender === 'Male' ? 'Homme' : enrichedData.gender === 'Female' ? 'Femme' : enrichedData.gender}</span>
                    </>
                  )}
                  {enrichedData.birth_date && (
                    <>
                      <span className="text-slate-300 dark:text-slate-600">•</span>
                      <span>{new Date(enrichedData.birth_date).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}</span>
                    </>
                  )}
                  {(enrichedData.city || enrichedData.country_name) && (
                    <>
                      <span className="text-slate-300 dark:text-slate-600">•</span>
                      <span>{enrichedData.city ? `${enrichedData.city}, ${enrichedData.country_name || ''}` : enrichedData.country_name}</span>
                    </>
                  )}
                  {enrichedData.activity_start && (
                    <>
                      <span className="text-slate-300 dark:text-slate-600">•</span>
                      <span>{enrichedData.activity_start} - {enrichedData.activity_end || 'present'}</span>
                    </>
                  )}
                  {(enrichedData.discogs_releases_count ?? 0) > 0 && (
                    <>
                      <span className="text-slate-300 dark:text-slate-600">•</span>
                      <span>{enrichedData.discogs_releases_count} releases</span>
                    </>
                  )}
        </div>
      )}

              {/* Style principal + Sous-genres + Labels en tags compacts */}
              <div className="flex flex-wrap items-center gap-1.5">
                {enrichedData?.style && (
                  <span className="px-2 py-0.5 text-[10px] font-semibold bg-violet-500 text-white rounded-full">
                    {enrichedData.style}
                  </span>
                )}
                {enrichedData?.genres?.slice(0, 4).map((genre, idx) => (
                  <span key={idx} className="px-2 py-0.5 text-[10px] bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 rounded-full">
                    {genre}
                  </span>
                ))}
                {enrichedData?.labels?.slice(0, 2).map((label, idx) => (
                  <span key={idx} className="px-2 py-0.5 text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-full">
                    {label}
                  </span>
                ))}
                {enrichedData?.awards && enrichedData.awards.length > 0 && (
                  <span className="px-2 py-0.5 text-[10px] bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-full">
                    {enrichedData.awards.length} awards
                  </span>
                )}
            </div>
          </div>
          
          </div>
          
          {/* Biographie en accordeon - compact */}
          {(artistBio || enrichedData?.biography_fr || enrichedData?.biography_en || enrichedData?.biography) && (
            <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setBioExpanded(!bioExpanded)}
                className="w-full flex items-center justify-between text-left group"
              >
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                  Biographie
                </span>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${bioExpanded ? "rotate-180" : ""}`} />
              </button>
              {bioExpanded && (
                <p className="mt-2 text-xs text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-4">
                  {artistBio || enrichedData?.biography_fr || enrichedData?.biography_en || enrichedData?.biography}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Barre des plateformes - Toutes les icones, colorees si dispo */}
      {selectedArtist && (
        <ArtistPlatformsBar key={`platforms-${selectedArtistId}`} artistId={selectedArtistId!} />
      )}

      {/* Navigation par onglets - Style SettingsTabs */}
      {selectedArtist && (
        <>
          {/* Navigation Tabs - Style AURA */}
          <div className="relative bg-gradient-to-r from-slate-50 via-white to-slate-50 dark:from-slate-900/80 dark:via-slate-800/60 dark:to-slate-900/80 rounded-xl border border-slate-200 dark:border-slate-700/50 shadow-sm overflow-hidden">
            {/* Barre superieure decorative */}
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-violet-500/50 to-transparent" />
            
            <nav 
              className="flex gap-1 overflow-x-auto px-2 py-2 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600" 
              role="tablist"
              aria-label="Sections statistiques artiste"
            >
              {TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    role="tab"
                    aria-selected={isActive}
                    className={`relative flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 whitespace-nowrap ${
                      isActive
                        ? "bg-violet-500/10 text-violet-600 dark:text-violet-400 shadow-sm ring-1 ring-violet-500/20"
                        : "text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-700/50"
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? "text-violet-500" : ""}`} />
                    <span>{tab.label}</span>
                    {/* Indicateur actif */}
                    {isActive && (
                      <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-violet-500 rounded-full" />
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Contenu de l'onglet actif */}
          <div className="bg-white dark:bg-slate-950/40 rounded-xl border border-slate-200 dark:border-slate-800 p-6 mt-6">
            {/* SOCIAL MEDIA */}
            {activeTab === "social" && (
              <div className="space-y-6">
                <SocialLinksContainer key={`social-${selectedArtistId}`} artistId={selectedArtistId!} />
                <ArtistHistoryChart key={`chart-${selectedArtistId}`} artistId={selectedArtistId!} />
              </div>
            )}

            {/* ACTIVITY FEED */}
            {activeTab === "activity" && (
              <ActivityFeedSection key={`activity-${selectedArtistId}`} artistId={selectedArtistId!} />
            )}

            {/* AUDIENCES */}
            {activeTab === "audiences" && (
              <AudiencesSection key={`audiences-${selectedArtistId}`} artistId={selectedArtistId!} />
            )}

            {/* RADIO STATS */}
            {activeTab === "radio" && (
              <RadioStatsSection key={`radio-${selectedArtistId}`} artistId={selectedArtistId!} />
            )}

            {/* CONCERTS */}
            {activeTab === "concerts" && (
              <ArtistConcerts key={`concerts-${selectedArtistId}`} artistId={selectedArtistId!} />
            )}

            {/* DISCOGRAPHIE */}
            {activeTab === "discographie" && (
              <DiscographieSection key={`disco-${selectedArtistId}`} artistId={selectedArtistId!} companyId={companyId} />
            )}
          </div>
        </>
      )}

      {/* Message si aucun artiste selectionne */}
      {!selectedArtistId && (
        <div className="text-center py-12 text-slate-500 dark:text-slate-400">
          <Music className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Sélectionnez un artiste pour afficher ses statistiques</p>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// COMPOSANTS DE SECTION POUR LES ONGLETS
// ============================================================================

// Couleurs et icones par source pour Activity Feed
const SOURCE_CONFIG: Record<string, { color: string; bgColor: string; icon: string }> = {
  spotify: { color: "text-green-500", bgColor: "bg-green-500/20", icon: "https://cdn.simpleicons.org/spotify/1DB954" },
  apple_music: { color: "text-pink-500", bgColor: "bg-pink-500/20", icon: "https://cdn.simpleicons.org/applemusic/FA243C" },
  deezer: { color: "text-purple-500", bgColor: "bg-purple-500/20", icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23A238FF'%3E%3Cpath d='M18.81 4.16v3.03H24V4.16h-5.19zM6.27 8.38v3.027h5.189V8.38H6.27zm12.54 0v3.027H24V8.38h-5.19zM6.27 12.594v3.027h5.189v-3.027H6.27zm6.27 0v3.027h5.19v-3.027h-5.19zm6.27 0v3.027H24v-3.027h-5.19zM0 16.81v3.029h5.19v-3.03H0zm6.27 0v3.029h5.189v-3.03H6.27zm6.27 0v3.029h5.19v-3.03h-5.19zm6.27 0v3.029H24v-3.03h-5.19z'/%3E%3C/svg%3E" },
  youtube: { color: "text-red-500", bgColor: "bg-red-500/20", icon: "https://cdn.simpleicons.org/youtube/FF0000" },
  tiktok: { color: "text-slate-900 dark:text-white", bgColor: "bg-slate-900/20 dark:bg-white/20", icon: "https://cdn.simpleicons.org/tiktok/000000" },
  instagram: { color: "text-pink-600", bgColor: "bg-gradient-to-br from-purple-500/20 via-pink-500/20 to-orange-400/20", icon: "https://cdn.simpleicons.org/instagram/E4405F" },
  soundcloud: { color: "text-orange-500", bgColor: "bg-orange-500/20", icon: "https://cdn.simpleicons.org/soundcloud/FF5500" },
  radio: { color: "text-blue-500", bgColor: "bg-blue-500/20", icon: "" },
  amazon: { color: "text-cyan-600", bgColor: "bg-cyan-600/20", icon: "https://cdn.simpleicons.org/amazonmusic/FF9900" },
  itunes: { color: "text-pink-400", bgColor: "bg-pink-400/20", icon: "https://cdn.simpleicons.org/apple/000000" },
  shazam: { color: "text-blue-400", bgColor: "bg-blue-400/20", icon: "https://cdn.simpleicons.org/shazam/0088FF" },
  beatport: { color: "text-green-400", bgColor: "bg-green-400/20", icon: "https://cdn.simpleicons.org/beatport/94D500" },
  tracklist: { color: "text-indigo-500", bgColor: "bg-indigo-500/20", icon: "" },
};

// Couleurs par tier d'importance
const TIER_CONFIG: Record<number, { color: string; label: string }> = {
  1: { color: "bg-amber-500", label: "Important" },
  2: { color: "bg-blue-500", label: "Notable" },
  3: { color: "bg-slate-400", label: "Standard" },
  4: { color: "bg-slate-300", label: "Mineur" },
};

// Composant icone source avec fallback Lucide
function SourceIcon({ source, config }: { source: string; config: { color: string; bgColor: string; icon: string } }) {
  const [imgError, setImgError] = useState(false);
  
  // Icones Lucide de fallback par source
  const getFallbackIcon = () => {
    switch (source) {
      case "spotify":
      case "apple_music":
      case "deezer":
      case "soundcloud":
      case "amazon":
      case "itunes":
        return <Music className={`w-5 h-5 ${config.color}`} />;
      case "youtube":
        return <Play className={`w-5 h-5 ${config.color}`} />;
      case "tiktok":
        return <Music className={`w-5 h-5 ${config.color}`} />;
      case "instagram":
        return <Camera className={`w-5 h-5 ${config.color}`} />;
      case "shazam":
        return <Search className={`w-5 h-5 ${config.color}`} />;
      case "beatport":
        return <Headphones className={`w-5 h-5 ${config.color}`} />;
      case "tracklist":
        return <List className={`w-5 h-5 ${config.color}`} />;
      case "radio":
      default:
        return <Radio className={`w-5 h-5 ${config.color}`} />;
    }
  };
  
  return (
    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${config.bgColor} ring-2 ring-slate-200 dark:ring-slate-800`}>
      {config.icon && !imgError ? (
        <img 
          src={config.icon} 
          alt={source}
          className="w-6 h-6 object-contain"
          onError={() => setImgError(true)}
            />
          ) : (
        getFallbackIcon()
          )}
        </div>
  );
}

// Section Activity Feed - Timeline verticale style Songstats
function ActivityFeedSection({ artistId }: { artistId: string }) {
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    const fetchActivities = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("artist_activities")
        .select("*")
        .eq("artist_id", artistId)
        .neq("activity_type", "comment")
        .order("activity_date", { ascending: false })
        .limit(100);
      setActivities(data || []);
      setLoading(false);
    };
    fetchActivities();
  }, [artistId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500">
        <Activity className="w-10 h-10 mx-auto mb-2 opacity-50" />
        <p className="text-sm">Aucune activite recente</p>
      </div>
    );
  }

  const uniqueSources = Array.from(new Set(activities.map(a => a.source))).filter(Boolean);
  const filteredActivities = filter === "all" ? activities : activities.filter(a => a.source === filter);

  // Grouper par date
  const groupedByDate: Record<string, any[]> = {};
  filteredActivities.forEach(activity => {
    const dateKey = activity.activity_date 
      ? new Date(activity.activity_date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }).toUpperCase()
      : "SANS DATE";
    if (!groupedByDate[dateKey]) groupedByDate[dateKey] = [];
    groupedByDate[dateKey].push(activity);
  });

  return (
    <div className="space-y-3">
      {/* Filtres compacts */}
      <div className="flex flex-wrap gap-1.5 pb-3 border-b border-slate-200 dark:border-slate-700/50">
        <button
          onClick={() => setFilter("all")}
          className={`px-3 py-1 text-[11px] font-medium rounded-md transition-all ${
            filter === "all"
              ? "bg-violet-600 text-white"
              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
          }`}
        >
          Tout ({activities.length})
        </button>
        {uniqueSources.map(source => {
          const config = SOURCE_CONFIG[source] || { icon: "" };
          const count = activities.filter(a => a.source === source).length;
          return (
            <button
              key={source}
              onClick={() => setFilter(source)}
              className={`flex items-center gap-1.5 px-3 py-1 text-[11px] font-medium rounded-md transition-all capitalize ${
                filter === source
                  ? "bg-violet-600 text-white"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              {config.icon && <img src={config.icon} alt="" className="w-3.5 h-3.5" />}
              {source.replace(/_/g, " ")} ({count})
            </button>
          );
        })}
      </div>

      {/* Timeline verticale */}
      <div className="max-h-[600px] overflow-y-auto pr-1">
        {Object.entries(groupedByDate).map(([dateLabel, dateActivities], groupIdx) => (
          <div key={dateLabel}>
            {/* Separateur date dans la colonne timeline */}
            <div className="flex gap-3">
              <div className="w-10 flex flex-col items-center py-2">
                {groupIdx > 0 && <div className="w-px h-2 bg-slate-300 dark:bg-slate-700" />}
                <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 tracking-wider text-center leading-tight py-1">
                  {dateLabel}
                </span>
                <div className="w-px h-2 bg-slate-300 dark:bg-slate-700" />
            </div>
              <div className="flex-1" />
            </div>

            {/* Activites du groupe */}
            {dateActivities.map((activity, idx) => {
              const sourceConfig = SOURCE_CONFIG[activity.source] || { color: "text-slate-500", bgColor: "bg-slate-700", icon: "" };
              const raw = activity.metadata?.raw;
              const activityText = activity.description || raw?.activity_text || "";
              const trackTitle = activity.title || raw?.track_info?.title || "";
              const activityUrl = activity.url || raw?.activity_url || null;
              const songstatsUrl = raw?.track_info?.site_url;
              const tier = raw?.activity_tier || 3;
              const tierConfig = TIER_CONFIG[tier] || TIER_CONFIG[3];
              const isLast = idx === dateActivities.length - 1 && groupIdx === Object.entries(groupedByDate).length - 1;

              return (
                <div key={activity.id || idx} className="flex gap-3">
                  {/* Colonne timeline */}
                  <div className="flex flex-col items-center flex-shrink-0 w-10">
                    {/* Icone plateforme */}
                    <SourceIcon source={activity.source} config={sourceConfig} />
                    {/* Ligne verticale */}
                    {!isLast && <div className="w-px flex-1 min-h-[12px] bg-slate-300 dark:bg-slate-700" />}
              </div>

                  {/* Contenu */}
                  <div
                    className="group flex-1 min-w-0 flex items-center gap-2 pb-3 cursor-pointer"
                    onClick={() => activityUrl && window.open(activityUrl, '_blank')}
                  >
          <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${tierConfig.color}`} />
                        <span className="text-sm font-medium text-slate-900 dark:text-white truncate">
                          {trackTitle || activityText.slice(0, 40)}
              </span>
              </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate pl-3 mt-0.5">
                        {trackTitle ? activityText.slice(0, 60) : activityText.slice(40, 100)}...
                      </p>
          </div>
          
                    {/* Liens au hover */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                      {activityUrl && (
                        <a
                          href={activityUrl}
                target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="p-1 rounded hover:bg-violet-500/20 text-violet-500"
              >
                          <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
                      {songstatsUrl && (
              <a
                          href={songstatsUrl}
                target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="p-1 rounded hover:bg-slate-500/20 text-slate-400"
              >
                          <TrendingUp className="w-3.5 h-3.5" />
              </a>
              )}
            </div>
          </div>
                </div>
              );
            })}
        </div>
      ))}
      </div>

      {/* Footer stats */}
      <div className="pt-2 border-t border-slate-200 dark:border-slate-700/50">
        <p className="text-[10px] text-slate-400 dark:text-slate-500 text-center">
          {filteredActivities.length} activites
        </p>
      </div>
    </div>
  );
}

// Coordonnées des pays pour la carte (x, y en pourcentage)
const COUNTRY_COORDS: Record<string, { x: number; y: number; name: string }> = {
  US: { x: 20, y: 40, name: "États-Unis" },
  GB: { x: 47, y: 30, name: "Royaume-Uni" },
  UK: { x: 47, y: 30, name: "Royaume-Uni" },
  FR: { x: 48, y: 35, name: "France" },
  DE: { x: 51, y: 32, name: "Allemagne" },
  ES: { x: 45, y: 40, name: "Espagne" },
  IT: { x: 52, y: 38, name: "Italie" },
  BR: { x: 32, y: 65, name: "Brésil" },
  MX: { x: 15, y: 48, name: "Mexique" },
  CA: { x: 18, y: 28, name: "Canada" },
  AU: { x: 85, y: 70, name: "Australie" },
  JP: { x: 88, y: 40, name: "Japon" },
  CN: { x: 78, y: 40, name: "Chine" },
  IN: { x: 72, y: 48, name: "Inde" },
  RU: { x: 70, y: 28, name: "Russie" },
  NL: { x: 49, y: 31, name: "Pays-Bas" },
  BE: { x: 48, y: 32, name: "Belgique" },
  CH: { x: 50, y: 35, name: "Suisse" },
  AT: { x: 52, y: 34, name: "Autriche" },
  PL: { x: 54, y: 32, name: "Pologne" },
  SE: { x: 53, y: 24, name: "Suède" },
  NO: { x: 51, y: 22, name: "Norvège" },
  DK: { x: 51, y: 28, name: "Danemark" },
  FI: { x: 56, y: 22, name: "Finlande" },
  PT: { x: 43, y: 40, name: "Portugal" },
  AR: { x: 28, y: 75, name: "Argentine" },
  CL: { x: 26, y: 78, name: "Chili" },
  CO: { x: 25, y: 55, name: "Colombie" },
  ZA: { x: 56, y: 75, name: "Afrique du Sud" },
  KR: { x: 85, y: 40, name: "Corée du Sud" },
  TW: { x: 84, y: 48, name: "Taïwan" },
  ID: { x: 82, y: 58, name: "Indonésie" },
  TH: { x: 78, y: 52, name: "Thaïlande" },
  PH: { x: 84, y: 52, name: "Philippines" },
  MY: { x: 78, y: 56, name: "Malaisie" },
  SG: { x: 78, y: 58, name: "Singapour" },
  NZ: { x: 92, y: 78, name: "Nouvelle-Zélande" },
  IE: { x: 44, y: 30, name: "Irlande" },
  GR: { x: 55, y: 40, name: "Grèce" },
  TR: { x: 58, y: 40, name: "Turquie" },
  CZ: { x: 52, y: 33, name: "Tchéquie" },
  HU: { x: 54, y: 35, name: "Hongrie" },
  RO: { x: 56, y: 36, name: "Roumanie" },
  UA: { x: 58, y: 33, name: "Ukraine" },
};

// Section Audiences
function AudiencesSection({ artistId }: { artistId: string }) {
  const [audience, setAudience] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mapMode, setMapMode] = useState<MapMode>("world");
  const [dataType, setDataType] = useState<DataType>("listeners");

  useEffect(() => {
    const fetchAudience = async () => {
      setLoading(true);
      const { data } = await supabase
          .from("artist_audience")
          .select("*")
          .eq("artist_id", artistId)
        .order("listeners_count", { ascending: false });
      setAudience(data || []);
      setLoading(false);
    };
    fetchAudience();
  }, [artistId]);

  // Filtrer par type de donnees (ecoutes, followers ou streams)
  const filteredByType = useMemo(() => {
    const sourcesToUse = dataType === "listeners" 
      ? LISTENER_SOURCES 
      : dataType === "streams" 
        ? STREAMS_SOURCES 
        : FOLLOWER_SOURCES;
    return audience.filter((item) => sourcesToUse.has(item.source));
  }, [audience, dataType]);

  // Agreger par pays (country_code)
  const countryTotals: Record<string, number> = {};
  filteredByType.forEach((item) => {
    const code = item.country_code?.toUpperCase();
    if (code) {
      countryTotals[code] = (countryTotals[code] || 0) + (item.listeners_count || 0);
    }
  });

  // Trier par total et ajouter le rang (TOUS les pays)
  const allSortedCountries = Object.entries(countryTotals)
    .map(([code, total]) => ({ code, total }))
    .sort((a, b) => b.total - a.total)
    .map((item, idx) => ({ ...item, rank: idx + 1 }));

  // Filtrer selon le mode (Europe ou Monde)
  const sortedCountries = mapMode === "europe"
    ? allSortedCountries
        .filter((c) => EUROPEAN_COUNTRIES.has(c.code))
        .map((item, idx) => ({ ...item, rank: idx + 1 })) // Recalculer les rangs pour l'Europe
    : allSortedCountries;

  // Top 20 + Suisse (toujours incluse)
  const top20 = sortedCountries.slice(0, 20);
  const swissEntry = sortedCountries.find((c) => c.code === "CH");
  const swissInTop20 = top20.some((c) => c.code === "CH");
  
  const displayList = swissInTop20 || !swissEntry 
    ? top20 
    : [...top20.slice(0, 19), swissEntry];

  // Max pour les cercles
  const maxTotal = sortedCountries[0]?.total || 1;

  // Trouver le rang de la Suisse dans le mode actuel
  const swissRank = sortedCountries.findIndex((c) => c.code === "CH") + 1;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  const hasAudienceData = audience.length > 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Carte interactive - 2 colonnes */}
      <div className="lg:col-span-2">
          <h4 className="text-sm font-semibold text-slate-600 dark:text-slate-400 uppercase mb-3">
          {mapMode === "europe" ? "Repartition europeenne" : "Repartition mondiale"} 
          {" - "}
          {dataType === "listeners" ? "Ecoutes" : dataType === "streams" ? "Monthly Listeners" : "Followers"}
          </h4>
        <div className="bg-slate-100 dark:bg-slate-900/50 rounded-xl overflow-hidden">
          {hasAudienceData ? (
            <WorldMapAudience 
              data={sortedCountries}
              maxTotal={maxTotal}
              highlightCountry="CH"
              mode={mapMode}
              onModeChange={setMapMode}
              dataType={dataType}
              onDataTypeChange={setDataType}
            />
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400 dark:text-slate-500">
              <Globe className="w-16 h-16 mb-4 opacity-30" />
              <p className="text-sm font-medium">Aucune donnee geographique disponible</p>
              <p className="text-xs mt-1 opacity-70">Les donnees apparaitront apres synchronisation</p>
                </div>
                  )}
                </div>
              </div>

      {/* Top 20 Pays - 1 colonne */}
      <div className="lg:col-span-1">
          <h4 className="text-sm font-semibold text-slate-600 dark:text-slate-400 uppercase mb-3">
          Top 20 {mapMode === "europe" ? "Europe" : "Monde"}
          </h4>
        <div className="bg-slate-50 dark:bg-slate-900/30 rounded-xl p-2 min-h-[300px]">
          {hasAudienceData ? (
          <div className="space-y-1">
            {displayList.map((country, idx) => {
              const coords = COUNTRY_COORDS[country.code];
              const isSwiss = country.code === "CH";
              const actualRank = idx + 1;
              const rank = isSwiss && !swissInTop20 ? swissRank : actualRank;
              
              // Couleur selon le type de donnees
              const rankBgClass = isSwiss 
                ? "bg-red-500 text-white" 
                : rank <= 3 
                  ? dataType === "listeners" 
                    ? "bg-emerald-500 text-white" 
                    : dataType === "streams"
                      ? "bg-green-500 text-white"
                      : "bg-violet-500 text-white"
                  : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300";
              
              const totalColorClass = isSwiss 
                ? "text-red-600 dark:text-red-400" 
                : dataType === "listeners"
                  ? "text-emerald-600 dark:text-emerald-400"
                  : dataType === "streams"
                    ? "text-green-600 dark:text-green-400"
                    : "text-violet-600 dark:text-violet-400";
              
              return (
                <div
                  key={country.code}
                  className={`flex items-center gap-2 py-1.5 px-2 rounded-lg transition-colors ${
                    isSwiss 
                      ? "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800" 
                      : "bg-white dark:bg-slate-800/50"
                  }`}
                >
                  {/* Rang */}
                  <span className={`w-5 h-5 flex items-center justify-center rounded-full text-[9px] font-bold flex-shrink-0 ${rankBgClass}`}>
                    {rank}
                  </span>
                  
                  {/* Drapeau image */}
                  <img 
                    src={`https://flagcdn.com/20x15/${country.code.toLowerCase()}.png`}
                    alt={country.code}
                    className="w-5 h-3.5 object-cover rounded-sm flex-shrink-0"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                  
                  {/* Nom complet */}
                  <span className="font-medium text-slate-700 dark:text-slate-300 text-[11px] truncate flex-1">
                    {coords?.name || country.code}
                  </span>
                  
                  {/* Total - AGRANDI */}
                  <span className={`text-sm font-bold flex-shrink-0 ${totalColorClass}`}>
                    {country.total.toLocaleString('de-CH')}
                  </span>
                  
                  {/* Badge rang si Suisse hors top 20 */}
                  {isSwiss && !swissInTop20 && (
                    <span className="text-[9px] bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 px-1 py-0.5 rounded font-semibold flex-shrink-0">
                      #{swissRank}
                    </span>
                  )}
                </div>
              );
            })}
              </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full py-12 text-slate-400 dark:text-slate-500">
              <Users className="w-10 h-10 mb-3 opacity-30" />
              <p className="text-sm font-medium">Aucun pays</p>
              <p className="text-xs mt-1 opacity-70">Pas de donnees</p>
        </div>
      )}
        </div>
      </div>
    </div>
  );
}

// Section Radio Stats - Design AURA moderne
function RadioStatsSection({ artistId }: { artistId: string }) {
  const [radioStats, setRadioStats] = useState<Record<string, number>>({});
  const [rosterAvg, setRosterAvg] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRadioStats = async () => {
      setLoading(true);
      
      // Recuperer les stats radio de l'artiste
      const { data: stats } = await supabase
        .from("artist_stats_current")
        .select("metric, value")
        .eq("artist_id", artistId)
        .eq("source", "radio");
      
      // Recuperer le nom de l'artiste
      const { data: artist } = await supabase
        .from("artists")
        .select("name, company_id")
        .eq("id", artistId)
        .single();
      
      if (artist) {
        // Calculer la moyenne du roster
        const { data: rosterStats } = await supabase
          .from("artist_stats_current")
          .select("metric, value, artist_id")
          .eq("source", "radio")
          .in("metric", ["radio_plays_total", "radio_stations_total"]);
        
        if (rosterStats && rosterStats.length > 0) {
          const avgByMetric: Record<string, { sum: number; count: number }> = {};
          rosterStats.forEach((s: any) => {
            if (!avgByMetric[s.metric]) avgByMetric[s.metric] = { sum: 0, count: 0 };
            avgByMetric[s.metric].sum += Number(s.value) || 0;
            avgByMetric[s.metric].count += 1;
          });
          
          const avgs: Record<string, number> = {};
          Object.entries(avgByMetric).forEach(([metric, data]) => {
            avgs[metric] = Math.round(data.sum / data.count);
          });
          setRosterAvg(avgs);
        }
      }
      
      // Transformer les stats en objet
      const statsMap: Record<string, number> = {};
      (stats || []).forEach((s: any) => {
        statsMap[s.metric] = Number(s.value) || 0;
      });
      setRadioStats(statsMap);
      setLoading(false);
    };
    
    fetchRadioStats();
  }, [artistId]);

  // Formatter les grands nombres
  const formatNumber = (num: number): string => {
    if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + "M";
    if (num >= 1_000) return (num / 1_000).toFixed(0) + "K";
    return num.toLocaleString("fr-CH");
  };

  // Calculer le pourcentage par rapport a la moyenne
  const getComparison = (value: number, avg: number): { percent: number; isAbove: boolean } => {
    if (!avg || avg === 0) return { percent: 0, isAbove: true };
    const percent = Math.round(((value - avg) / avg) * 100);
    return { percent: Math.abs(percent), isAbove: percent >= 0 };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  const hasData = Object.keys(radioStats).length > 0;
  const radioPlays = radioStats.radio_plays_total || 0;
  const radioStations = radioStats.radio_stations_total || 0;
  const sxmPlays = radioStats.sxm_plays_total || 0;
  const sxmRoyalties = radioStats.sxm_royalties_total || 0;

  if (!hasData) {
    return (
      <div className="text-center py-12 text-slate-500">
        <Radio className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>Aucune donnee radio disponible pour cet artiste</p>
        <p className="text-xs mt-2 text-slate-400">Les donnees radio proviennent de Songstats</p>
      </div>
    );
  }

  const playsComparison = getComparison(radioPlays, rosterAvg.radio_plays_total);
  const stationsComparison = getComparison(radioStations, rosterAvg.radio_stations_total);

  return (
    <div className="space-y-6">
      {/* Header avec titre */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
            <Radio className="w-5 h-5 text-white" />
          </div>
              <div>
            <h3 className="font-semibold text-slate-800 dark:text-slate-100">Diffusions Radio</h3>
            <p className="text-xs text-slate-500">Statistiques globales de diffusion</p>
          </div>
        </div>
        <span className="text-xs text-slate-400">Source: Songstats</span>
      </div>

      {/* Metriques principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Total Diffusions */}
        <div className="relative overflow-hidden p-5 rounded-2xl bg-gradient-to-br from-violet-500/10 via-purple-500/5 to-transparent border border-violet-500/20">
          <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-5 h-5 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
              <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Total Diffusions</span>
            </div>
            <p className="text-4xl font-bold text-violet-600 dark:text-violet-400 mb-1">
              {formatNumber(radioPlays)}
                </p>
            <p className="text-xs text-slate-500 mb-3">{radioPlays.toLocaleString("fr-CH")} passages radio</p>
            
            {rosterAvg.radio_plays_total > 0 && (
              <div className="flex items-center gap-2">
                <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                  playsComparison.isAbove 
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" 
                    : "bg-red-500/10 text-red-600 dark:text-red-400"
                }`}>
                  {playsComparison.isAbove ? (
                    <TrendingUp className="w-3 h-3" />
                  ) : (
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                    </svg>
                  )}
                  {playsComparison.percent}%
              </div>
                <span className="text-xs text-slate-400">vs moyenne roster</span>
              </div>
            )}
          </div>
        </div>

        {/* Nombre de stations */}
        <div className="relative overflow-hidden p-5 rounded-2xl bg-gradient-to-br from-violet-500/10 via-purple-500/5 to-transparent border border-violet-500/20">
          <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-5 h-5 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Stations Uniques</span>
            </div>
            <p className="text-4xl font-bold text-violet-600 dark:text-violet-400 mb-1">
              {formatNumber(radioStations)}
            </p>
            <p className="text-xs text-slate-500 mb-3">{radioStations.toLocaleString("fr-CH")} stations differentes</p>
            
            {rosterAvg.radio_stations_total > 0 && (
              <div className="flex items-center gap-2">
                <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                  stationsComparison.isAbove 
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" 
                    : "bg-red-500/10 text-red-600 dark:text-red-400"
                }`}>
                  {stationsComparison.isAbove ? (
                    <TrendingUp className="w-3 h-3" />
                  ) : (
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                    </svg>
                  )}
                  {stationsComparison.percent}%
              </div>
                <span className="text-xs text-slate-400">vs moyenne roster</span>
            </div>
            )}
          </div>
        </div>
      </div>

      {/* SiriusXM Stats (si disponibles) */}
      {(sxmPlays > 0 || sxmRoyalties > 0) && (
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-700 to-slate-900 dark:from-slate-600 dark:to-slate-800 flex items-center justify-center">
              <span className="text-xs font-bold text-white">SXM</span>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">SiriusXM</p>
              <p className="text-xs text-slate-500">Radio satellite USA/Canada</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 rounded-lg bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/50">
              <p className="text-xs text-slate-500 mb-1">Diffusions SXM</p>
              <p className="text-xl font-bold text-slate-800 dark:text-slate-100">
                {sxmPlays.toLocaleString("fr-CH")}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/50">
              <p className="text-xs text-slate-500 mb-1">Royalties SXM</p>
              <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                ${(sxmRoyalties / 100).toLocaleString("fr-CH", { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Indicateur de performance */}
      {radioPlays > 0 && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-transparent border border-amber-500/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
              {radioPlays >= 1_000_000 ? (
                <span className="text-lg">🏆</span>
              ) : radioPlays >= 100_000 ? (
                <span className="text-lg">🥈</span>
              ) : (
                <span className="text-lg">📻</span>
            )}
          </div>
            <div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {radioPlays >= 10_000_000 
                  ? "Artiste Radio Majeur" 
                  : radioPlays >= 1_000_000 
                    ? "Forte presence radio" 
                    : radioPlays >= 100_000 
                      ? "Presence radio etablie"
                      : "Presence radio emergente"}
              </p>
              <p className="text-xs text-slate-500">
                {radioStations > 0 && `Diffuse sur ${radioStations.toLocaleString("fr-CH")} stations dans le monde`}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Note informative */}
      <div className="flex items-start gap-2 p-3 rounded-lg bg-slate-100 dark:bg-slate-800/30 text-xs text-slate-500">
        <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p>
          Les statistiques radio incluent les diffusions FM/AM traditionnelles trackees par Songstats. 
          Les donnees detaillees par station seront disponibles prochainement.
        </p>
      </div>
    </div>
  );
}

// Section Discographie - Design AURA moderne (Albums & Singles Spotify uniquement)
function DiscographieSection({ artistId }: { artistId: string; companyId?: string | null }) {
  const [albums, setAlbums] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [albumViewMode, setAlbumViewMode] = useState<"grid" | "list">("list");
  const [albumSortBy, setAlbumSortBy] = useState<"date" | "name">("date");
  const [albumFilterType, setAlbumFilterType] = useState<"all" | "album" | "single" | "compilation">("all");

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      
      // Charger les albums depuis artist_albums (Spotify)
      const { data: albumsData } = await supabase
        .from("artist_albums")
        .select("*")
        .eq("artist_id", artistId)
        .order("release_date", { ascending: false });
      setAlbums(albumsData || []);
      
      setLoading(false);
    };
    fetchData();
  }, [artistId]);

  // Filtrer et trier les albums
  const filteredAlbums = useMemo(() => {
    let filtered = albums;
    
    // Filtre par type
    if (albumFilterType !== "all") {
      filtered = filtered.filter(a => a.album_type === albumFilterType);
    }
    
    // Tri
    return [...filtered].sort((a, b) => {
      if (albumSortBy === "date") {
        return new Date(b.release_date || 0).getTime() - new Date(a.release_date || 0).getTime();
      }
      return (a.album_name || "").localeCompare(b.album_name || "");
    });
  }, [albums, albumFilterType, albumSortBy]);

  // Stats globales (albums Spotify uniquement)
  const stats = useMemo(() => {
    const realAlbums = albums.filter(a => a.album_type === "album").length;
    const totalSingles = albums.filter(a => a.album_type === "single").length;
    const totalCompilations = albums.filter(a => a.album_type === "compilation").length;
    const latestRelease = albums[0];
    return { realAlbums, totalSingles, totalCompilations, latestRelease, totalAlbums: albums.length };
  }, [albums]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (albums.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500">
        <Disc3 className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>Aucune discographie disponible</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Header */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl bg-gradient-to-br from-violet-500/10 to-purple-500/10 border border-violet-500/20">
          <div className="flex items-center gap-2 mb-1">
            <Disc3 className="w-4 h-4 text-violet-400" />
            <span className="text-xs text-slate-500 dark:text-slate-400">Total Releases</span>
          </div>
          <p className="text-2xl font-bold text-violet-500">{stats.totalAlbums}</p>
        </div>
        <div className="p-4 rounded-xl bg-gradient-to-br from-purple-500/10 to-violet-500/10 border border-purple-500/20">
          <div className="flex items-center gap-2 mb-1">
            <Music className="w-4 h-4 text-purple-400" />
            <span className="text-xs text-slate-500 dark:text-slate-400">Albums</span>
          </div>
          <p className="text-2xl font-bold text-purple-500">{stats.realAlbums}</p>
        </div>
        <div className="p-4 rounded-xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20">
          <div className="flex items-center gap-2 mb-1">
            <Mic2 className="w-4 h-4 text-amber-400" />
            <span className="text-xs text-slate-500 dark:text-slate-400">Singles</span>
          </div>
          <p className="text-2xl font-bold text-amber-500">{stats.totalSingles}</p>
        </div>
        <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-500/10 to-green-500/10 border border-emerald-500/20">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-emerald-400" />
            <span className="text-xs text-slate-500 dark:text-slate-400">Dernière Sortie</span>
          </div>
          <p className="text-sm font-semibold text-emerald-500 truncate">
            {stats.latestRelease?.release_date 
              ? new Date(stats.latestRelease.release_date).toLocaleDateString("fr-FR", { month: "short", year: "numeric" })
              : "-"}
          </p>
        </div>
      </div>

      {/* VUE ALBUMS & SINGLES */}
      {albums.length > 0 && (
        <>
              {/* Filtres et controles */}
              <div className="flex flex-wrap items-center gap-3 pb-4 border-b border-slate-200 dark:border-slate-700/50">
                {/* Filtre par type */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">Type:</span>
                  <div className="flex rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
                    {(["all", "album", "single", "compilation"] as const).map((type) => (
                      <button
                        key={type}
                        onClick={() => setAlbumFilterType(type)}
                        className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                          albumFilterType === type
                            ? "bg-violet-500 text-white"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                        }`}
                      >
                        {type === "all" ? "Tous" : type === "album" ? "Albums" : type === "single" ? "Singles" : "Compil."}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tri */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">Trier:</span>
                  <div className="flex rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
                    <button
                      onClick={() => setAlbumSortBy("date")}
                      className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                        albumSortBy === "date"
                          ? "bg-violet-500 text-white"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                      }`}
                    >
                      Date
                    </button>
                    <button
                      onClick={() => setAlbumSortBy("name")}
                      className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                        albumSortBy === "name"
                          ? "bg-violet-500 text-white"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                      }`}
                    >
                      Nom
                    </button>
                  </div>
                </div>

                {/* Mode d'affichage */}
                <div className="flex items-center gap-2 ml-auto">
                  <button
                    onClick={() => setAlbumViewMode("grid")}
                    className={`p-2 rounded-lg transition-colors ${
                      albumViewMode === "grid"
                        ? "bg-violet-500 text-white"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                    }`}
                    title="Vue grille"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <rect x="3" y="3" width="7" height="7" rx="1" />
                      <rect x="14" y="3" width="7" height="7" rx="1" />
                      <rect x="3" y="14" width="7" height="7" rx="1" />
                      <rect x="14" y="14" width="7" height="7" rx="1" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setAlbumViewMode("list")}
                    className={`p-2 rounded-lg transition-colors ${
                      albumViewMode === "list"
                        ? "bg-violet-500 text-white"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                    }`}
                    title="Vue liste"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <rect x="3" y="4" width="18" height="4" rx="1" />
                      <rect x="3" y="10" width="18" height="4" rx="1" />
                      <rect x="3" y="16" width="18" height="4" rx="1" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Compteur resultats */}
              <p className="text-xs text-slate-500 py-2">
                {filteredAlbums.length} resultat{filteredAlbums.length > 1 ? "s" : ""}
              </p>

              {/* Vue Grille Albums */}
              {albumViewMode === "grid" ? (
                <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
                  {filteredAlbums.map((album, idx) => (
                    <a
                      key={album.id || idx}
                      href={album.spotify_url || "#"}
                target="_blank"
                      rel="noopener noreferrer"
                      className="group relative bg-slate-50 dark:bg-slate-800/50 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700/50 hover:border-violet-500/50 hover:shadow-lg hover:shadow-violet-500/10 transition-all duration-300"
                    >
                      {/* Cover - plus petite */}
                      <div className="aspect-square relative overflow-hidden">
                        {album.image_url ? (
                          <img
                            src={album.image_url}
                            alt={album.album_name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                            <Disc3 className="w-8 h-8 text-white/50" />
                          </div>
                        )}
                        {/* Type badge - plus petit */}
                        <span className={`absolute top-1 left-1 px-1.5 py-0.5 text-[8px] font-semibold rounded ${
                          album.album_type === "album" 
                            ? "bg-purple-500 text-white" 
                            : album.album_type === "single"
                              ? "bg-amber-500 text-white"
                              : "bg-slate-500 text-white"
                        }`}>
                          {album.album_type === "album" ? "LP" : album.album_type === "single" ? "S" : "C"}
                        </span>
                        {/* Play icon on hover */}
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center shadow-lg">
                            <Play className="w-4 h-4 text-white ml-0.5" fill="white" />
                          </div>
                        </div>
                      </div>
                      
                      {/* Infos - plus compact */}
                      <div className="p-2">
                        <p className="text-[11px] font-medium text-slate-800 dark:text-slate-100 truncate leading-tight">
                          {album.album_name}
                        </p>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          {album.release_date ? new Date(album.release_date).getFullYear() : "-"}
                        </p>
                      </div>
                    </a>
                  ))}
                </div>
              ) : (
                /* Vue Liste Albums */
                <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700/50">
                  <table className="w-full">
                    <thead className="bg-slate-100 dark:bg-slate-800/80">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider w-10">#</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Album</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider hidden sm:table-cell">Type</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider hidden md:table-cell">Date de sortie</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider hidden lg:table-cell">Titres</th>
                        <th className="px-4 py-2 text-center text-xs font-medium text-slate-500 uppercase tracking-wider w-16">Spotify</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700/50">
                      {filteredAlbums.map((album, idx) => (
                        <tr
                          key={album.id || idx}
                          className="group bg-white dark:bg-slate-800/30 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                        >
                          <td className="px-4 py-2 text-sm text-slate-400">{idx + 1}</td>
                          <td className="px-4 py-2">
                            <div className="flex items-center gap-3">
                              {album.image_url ? (
                                <img
                                  src={album.image_url}
                                  alt={album.album_name}
                                  className="w-10 h-10 rounded object-cover"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                                  <Disc3 className="w-5 h-5 text-white/70" />
                                </div>
                              )}
                              <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate max-w-[150px] lg:max-w-[250px]">
                                {album.album_name}
                              </p>
                            </div>
                          </td>
                          <td className="px-4 py-2 hidden sm:table-cell">
                            <span className={`px-2 py-0.5 text-[10px] font-semibold rounded ${
                              album.album_type === "album" 
                                ? "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400" 
                                : album.album_type === "single"
                                  ? "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400"
                                  : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400"
                            }`}>
                              {album.album_type === "album" ? "Album" : album.album_type === "single" ? "Single" : "Compilation"}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-sm text-slate-500 hidden md:table-cell">
                            {album.release_date
                              ? new Date(album.release_date).toLocaleDateString("fr-FR", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                })
                              : "-"}
                          </td>
                          <td className="px-4 py-2 text-sm text-slate-500 hidden lg:table-cell">
                            {album.total_tracks || "-"}
                          </td>
                          <td className="px-4 py-2 text-center">
                            {album.spotify_url ? (
                              <a
                                href={album.spotify_url}
                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex p-1.5 rounded-lg hover:bg-green-500/10 transition-colors"
                                title="Ouvrir sur Spotify"
                              >
                                <img 
                                  src="https://cdn.simpleicons.org/spotify/1DB954" 
                                  alt="Spotify"
                                  className="w-5 h-5"
                                />
                              </a>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
          </div>
              )}
        </>
      )}
    </div>
  );
}
