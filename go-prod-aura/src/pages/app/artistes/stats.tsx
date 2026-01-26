import { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { BarChart3, Search, Music, Clock, X, User, ChevronDown, Share2, Activity, Users, Radio, Mic2, Disc3, ExternalLink, TrendingUp, Play, Camera, Headphones, List, Globe } from "lucide-react";
import { PageHeader } from "../../../components/aura/PageHeader";
import { supabase } from "../../../lib/supabaseClient";
import { getCurrentCompanyId } from "../../../lib/tenant";
// Composants de la page detail artiste - chargent depuis Supabase directement
import { ArtistStatsOverview } from "../../../components/artist/ArtistStatsOverview";
import { ArtistHistoryChart } from "../../../components/artist/ArtistHistoryChart";
import { ArtistConcerts } from "../../../components/artist/ArtistConcerts";
import { ContainerSongstats } from "../../../components/artist/ContainerSongstats";
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
        title="Stats artistes"
        subtitle="Statistiques détaillées et évolution des artistes via Songstats"
        icon={BarChart3}
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
                  {enrichedData.discogs_releases_count > 0 && (
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

// Fonction pour construire un lien de fallback selon la source et le type d'activite
function buildFallbackUrl(activity: any): string | null {
  const raw = activity.metadata?.raw;
  const trackInfo = raw?.track_info;
  const activityText = raw?.activity_text || activity.description || "";
  const source = activity.source;
  const activityType = activity.activity_type;

  // Si activity_url existe, l'utiliser directement
  if (raw?.activity_url) {
    return raw.activity_url;
  }

  // Fallback: lien Songstats du track
  if (trackInfo?.site_url) {
    return trackInfo.site_url;
  }

  // Essayer d'extraire des IDs depuis le texte pour construire des liens
  
  // Spotify: extraire ID de playlist depuis l'URL mentionnee
  if (source === "spotify" && activityText) {
    const playlistMatch = activityText.match(/spotify\.com\/playlist\/([a-zA-Z0-9]+)/);
    if (playlistMatch) {
      return `https://open.spotify.com/playlist/${playlistMatch[1]}`;
    }
  }

  // YouTube: extraire video ID
  if (source === "youtube" && activityText) {
    const ytMatch = activityText.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
    if (ytMatch) {
      return `https://www.youtube.com/watch?v=${ytMatch[1]}`;
    }
  }

  // TikTok: extraire video ID
  if (source === "tiktok" && activityText) {
    const tiktokMatch = activityText.match(/tiktok\.com\/@[^/]+\/video\/(\d+)/);
    if (tiktokMatch) {
      return `https://www.tiktok.com/@/video/${tiktokMatch[1]}`;
    }
  }

  // Shazam: lien vers la page Shazam charts
  if (source === "shazam" && activityType?.includes("chart")) {
    return "https://www.shazam.com/charts";
  }

  // Beatport: lien vers les charts
  if (source === "beatport" && activityType?.includes("chart")) {
    return "https://www.beatport.com/charts";
  }

  // Apple Music: lien vers Apple Music
  if (source === "apple_music" || source === "itunes") {
    if (activityType?.includes("chart")) {
      return "https://music.apple.com/charts";
    }
  }

  // Deezer: lien vers Deezer
  if (source === "deezer") {
    return "https://www.deezer.com/explore";
  }

  return null;
}

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
  const [artistName, setArtistName] = useState<string>("");
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
        setArtistName(artist.name);
        
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

// Plateformes principales a afficher (dans l'ordre)
const MAIN_PLATFORMS = [
  { key: "spotify", name: "Spotify" },
  { key: "youtube", name: "YouTube" },
  { key: "apple_music", name: "Apple Music" },
  { key: "amazon_music", name: "Amazon Music" },
  { key: "deezer", name: "Deezer" },
  { key: "tidal", name: "Tidal" },
  { key: "soundcloud", name: "SoundCloud" },
];

// Composant SVG pour chaque plateforme (fiable, pas de probleme d'image brisee)
function PlatformIcon({ platform, isActive, className = "w-5 h-5" }: { platform: string; isActive: boolean; className?: string }) {
  const fillColor = isActive ? undefined : "#9CA3AF";
  
  switch (platform) {
    case "spotify":
      return (
        <svg className={className} viewBox="0 0 24 24" fill={fillColor || "#1DB954"}>
          <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
        </svg>
      );
    case "youtube":
      return (
        <svg className={className} viewBox="0 0 24 24" fill={fillColor || "#FF0000"}>
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
        </svg>
      );
    case "apple_music":
      return (
        <svg className={className} viewBox="0 0 24 24" fill={fillColor || "#FA243C"}>
          <path d="M23.994 6.124a9.23 9.23 0 00-.24-2.19c-.317-1.31-1.062-2.31-2.18-3.043a5.022 5.022 0 00-1.877-.726 10.496 10.496 0 00-1.564-.15c-.04-.003-.083-.01-.124-.013H5.986c-.152.01-.303.017-.455.026-.747.043-1.49.123-2.193.401-1.336.53-2.3 1.452-2.865 2.78-.192.448-.292.925-.363 1.408-.056.392-.088.785-.1 1.18 0 .032-.007.062-.01.093v12.223c.01.14.017.283.027.424.05.815.154 1.624.497 2.373.65 1.42 1.738 2.353 3.234 2.801.42.127.856.187 1.293.228.555.053 1.11.06 1.667.06h11.03a12.5 12.5 0 001.57-.1c.822-.106 1.596-.35 2.295-.81a5.046 5.046 0 001.88-2.207c.186-.42.293-.87.37-1.324.113-.675.138-1.358.137-2.04-.002-3.8 0-7.595-.003-11.393zm-6.423 3.99v5.712c0 .417-.058.827-.244 1.206-.29.59-.76.962-1.388 1.14-.35.1-.706.157-1.07.173-.95.042-1.785-.455-2.105-1.245-.38-.94.093-2.03 1.066-2.395.315-.118.65-.18.992-.223.478-.06.96-.104 1.436-.165.245-.03.4-.164.456-.41.01-.043.015-.088.015-.133V9.04c0-.18-.06-.294-.216-.323-.468-.086-.94-.158-1.41-.238l-3.86-.63c-.073-.01-.147-.02-.22-.02-.22.01-.336.11-.36.332-.006.065-.007.13-.007.195v7.98c0 .47-.052.933-.263 1.36-.3.61-.792.99-1.447 1.164-.343.09-.69.137-1.04.153-.95.04-1.772-.45-2.107-1.217-.4-.915.06-1.994 1.023-2.38.313-.125.643-.197.978-.246.494-.072.99-.127 1.486-.19.26-.033.418-.17.47-.427.012-.056.016-.113.016-.17V5.63c0-.156.017-.31.063-.46.09-.288.308-.44.59-.498.2-.042.4-.063.602-.09L17.07 3.77c.297-.043.596-.08.896-.104.18-.014.316.09.373.27.025.08.037.165.037.25v5.927z"/>
        </svg>
      );
    case "amazon_music":
      return (
        <svg className={className} viewBox="0 0 24 24" fill={fillColor || "#00A8E1"}>
          <path d="M19.64 18.36C17.65 19.81 14.66 20.67 12 20.67c-3.96 0-7.53-1.47-10.22-3.9-.21-.19-.02-.45.23-.3 2.91 1.69 6.51 2.71 10.23 2.71 2.51 0 5.27-.52 7.81-1.6.38-.16.7.25.39.48m1.12-1.27c-.29-.37-1.9-.17-2.63-.09-.22.03-.25-.17-.06-.31 1.29-.9 3.4-.64 3.65-.34.25.31-.07 2.43-1.27 3.44-.19.15-.36.07-.28-.13.27-.68.88-2.2.59-2.57"/>
          <path d="M17.46 14.03v-.69c0-.1.08-.17.17-.17h3.02c.1 0 .18.07.18.17v.59c0 .1-.08.22-.23.43l-1.56 2.23c.58-.01 1.19.07 1.72.37.12.07.15.16.16.26v.73c0 .1-.11.22-.23.16-.94-.49-2.19-.55-3.23.01-.11.06-.22-.06-.22-.16v-.7c0-.11 0-.29.11-.45l1.81-2.59h-1.57c-.1 0-.18-.07-.18-.17m-6.7 3.42h-.92c-.09-.01-.16-.07-.17-.15V11.4c0-.1.08-.17.18-.17h.86c.09 0 .16.07.17.15v.78h.02c.23-.72.65-1.05 1.22-1.05.59 0 .95.33 1.22 1.05.23-.72.74-1.05 1.3-1.05.39 0 .82.16 1.08.53.29.41.23 1 .23 1.52v3.22c0 .1-.08.17-.18.17h-.91c-.1-.01-.17-.08-.17-.17v-2.71c0-.2.02-.71-.03-.89-.07-.3-.28-.38-.56-.38-.23 0-.47.15-.57.4-.1.24-.09.65-.09.88v2.71c0 .1-.08.17-.18.17h-.91c-.1-.01-.17-.08-.17-.17v-2.71c0-.54.09-1.33-.59-1.33-.69 0-.66.77-.66 1.33v2.71c0 .1-.08.17-.18.17m-3.3-6.16c1.35 0 2.08 1.16 2.08 2.64s-.81 2.56-2.08 2.56c-1.32 0-2.04-1.16-2.04-2.61 0-1.46.73-2.59 2.04-2.59m.77 2.64c0-.51-.04-1.12-.26-1.39-.19-.23-.49-.29-.69-.29-.2 0-.51.06-.69.29-.22.27-.26.88-.26 1.39 0 .51.02 1.16.26 1.42.19.23.51.26.69.26.19 0 .51-.03.69-.26.25-.27.26-.92.26-1.42m-5.46 3.52h-.92c-.09-.01-.17-.08-.17-.17V11.4a.18.18 0 01.18-.17h.85c.08 0 .15.06.17.13v.83h.02c.26-.73.63-1.08 1.27-1.08.42 0 .82.15 1.08.57.25.39.25 1.05.25 1.52v3.22c-.01.09-.09.16-.18.16h-.92c-.09-.01-.16-.07-.17-.16v-2.78c0-.54.06-1.31-.59-1.31-.23 0-.45.16-.55.39-.14.3-.16.59-.16.91v2.78c0 .1-.08.17-.18.17"/>
        </svg>
      );
    case "deezer":
      return (
        <svg className={className} viewBox="0 0 24 24">
          <path fill={fillColor || "#FF0092"} d="M18.81 11.62h3.68v1.7h-3.68z"/>
          <path fill={fillColor || "#FEAA2D"} d="M18.81 8.87h3.68v1.7h-3.68z"/>
          <path fill={fillColor || "#00C7F2"} d="M18.81 6.11h3.68v1.72h-3.68z"/>
          <path fill={fillColor || "#3BC8A9"} d="M18.81 14.37h3.68v1.7h-3.68zM13.06 14.37h3.68v1.7h-3.68z"/>
          <path fill={fillColor || "#9B83D4"} d="M18.81 17.12h3.68v1.72h-3.68zM13.06 17.12h3.68v1.72h-3.68zM7.32 17.12H11v1.72H7.32zM1.58 17.12h3.68v1.72H1.58z"/>
          <path fill={fillColor || "#FF0092"} d="M13.06 11.62h3.68v1.7h-3.68zM7.32 11.62H11v1.7H7.32z"/>
          <path fill={fillColor || "#FEAA2D"} d="M7.32 8.87H11v1.7H7.32z"/>
          <path fill={fillColor || "#3BC8A9"} d="M7.32 14.37H11v1.7H7.32zM1.58 14.37h3.68v1.7H1.58z"/>
        </svg>
      );
    case "tidal":
      return (
        <svg className={className} viewBox="0 0 24 24" fill={fillColor || "#000000"}>
          <path d="M12.012 3.992L8.008 7.996 4.004 3.992 0 7.996 4.004 12l4.004-4.004L12.012 12l4.004-4.004L20.02 12l4.004-4.004-4.004-4.004-4.004 4.004-4.004-4.004z"/>
          <path d="M12.012 12l-4.004 4.004L4.004 12 0 16.004l4.004 4.004 4.004-4.004 4.004 4.004 4.004-4.004L20.02 20.008l4.004-4.004L20.02 12l-4.004 4.004L12.012 12z"/>
        </svg>
      );
    case "soundcloud":
      return (
        <svg className={className} viewBox="0 0 24 24" fill={fillColor || "#FF5500"}>
          <path d="M1.175 12.225c-.051 0-.094.046-.101.1l-.233 2.154.233 2.105c.007.058.05.098.101.098.05 0 .09-.04.099-.098l.255-2.105-.27-2.154c-.009-.06-.049-.1-.1-.1m-.899.828c-.06 0-.091.037-.104.094L0 14.479l.165 1.308c.014.057.045.094.09.094s.089-.037.099-.094l.19-1.308-.19-1.334c-.01-.057-.044-.094-.09-.094m1.83-1.229c-.061 0-.12.045-.12.104l-.21 2.563.225 2.458c0 .06.045.104.106.104.061 0 .12-.044.12-.104l.24-2.474-.24-2.563c0-.06-.06-.104-.12-.104m.945-.089c-.075 0-.135.06-.15.135l-.193 2.64.21 2.544c.016.077.075.138.149.138.075 0 .135-.061.15-.138l.24-2.544-.24-2.64c-.015-.075-.075-.135-.15-.135m1.065.202c-.09 0-.166.075-.18.165l-.18 2.46.195 2.55c.015.09.09.165.18.165.091 0 .166-.075.166-.165l.21-2.55-.21-2.46c0-.09-.076-.165-.166-.165m.99-.48c-.105 0-.195.09-.21.195l-.165 2.94.18 2.595c.015.105.105.18.21.18.105 0 .18-.09.195-.18l.195-2.595-.195-2.94c-.015-.105-.09-.195-.195-.195m1.005-.195c-.12 0-.21.089-.225.209l-.15 3.12.165 2.61c.015.12.105.21.225.21.12 0 .21-.09.21-.21l.18-2.61-.165-3.12c-.015-.12-.09-.21-.225-.21m1.065.195c-.135 0-.24.105-.255.24l-.135 2.925.15 2.625c.015.135.12.24.255.24.12 0 .24-.105.24-.24l.165-2.625-.165-2.925c-.015-.135-.105-.24-.24-.24m1.035-.495c-.15 0-.27.12-.285.27l-.12 3.42.135 2.61c.015.15.135.27.285.27.135 0 .255-.12.27-.27l.15-2.61-.15-3.42c-.015-.15-.12-.27-.27-.27m1.065.18c-.165 0-.3.135-.315.3l-.105 3.24.12 2.595c.015.165.15.3.315.3.149 0 .285-.135.285-.3l.135-2.595-.12-3.24c-.015-.165-.135-.3-.3-.3m1.065.285c-.165 0-.315.149-.33.33l-.09 2.955.105 2.595c.015.165.165.315.33.315.165 0 .315-.15.315-.315l.12-2.595-.105-2.955c-.015-.181-.165-.33-.33-.33m1.08.63c-.18 0-.33.165-.345.36l-.075 2.325.09 2.58c.015.18.165.345.345.345.18 0 .33-.165.33-.345l.105-2.58-.09-2.325c-.015-.195-.165-.36-.345-.36m1.095-.78c-.195 0-.36.18-.375.39l-.06 3.105.075 2.565c.015.195.18.36.375.36.18 0 .345-.165.36-.36l.09-2.565-.075-3.105c-.015-.21-.18-.39-.375-.39m1.095.195c-.21 0-.375.18-.39.405l-.06 2.895.075 2.565c.015.21.18.375.39.375.195 0 .36-.18.375-.375l.09-2.565-.075-2.895c-.015-.225-.18-.405-.39-.405m1.5.6c-.225 0-.405.195-.42.435l-.045 2.295.06 2.55c.015.225.195.405.42.405.21 0 .39-.18.405-.405l.075-2.55-.06-2.295c-.015-.24-.195-.435-.42-.435m1.095-.375c-.24 0-.42.195-.435.45l-.045 2.67.06 2.535c.015.24.21.42.435.42.225 0 .42-.195.42-.42l.075-2.535-.06-2.67c-.015-.255-.195-.45-.435-.45"/>
        </svg>
      );
    default:
      return (
        <svg className={className} viewBox="0 0 24 24" fill="#6B7280">
          <path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/>
        </svg>
      );
  }
}

// Aliases pour normaliser les noms de plateformes
const PLATFORM_ALIASES: Record<string, string> = {
  applemusic: "apple_music",
  apple: "apple_music",
  amazon: "amazon_music",
  amazonmusic: "amazon_music",
  youtube_music: "youtube",
  youtubemusic: "youtube",
};

// Normaliser le nom de la plateforme
function normalizePlatformKey(source: string): string {
  const normalized = source.toLowerCase().replace(/[^a-z0-9]/g, "_");
  return PLATFORM_ALIASES[normalized] || PLATFORM_ALIASES[source.toLowerCase()] || normalized;
}


// Obtenir les liens pour les 7 plateformes principales
function getMainPlatformLinks(links: any[]): { platform: { key: string; name: string }, url: string | null }[] {
  // Creer une map des liens par plateforme normalisee
  const linksByPlatform = new Map<string, string>();
  links.forEach(link => {
    const normalizedKey = normalizePlatformKey(link.source);
    if (!linksByPlatform.has(normalizedKey)) {
      linksByPlatform.set(normalizedKey, link.url);
    }
  });
  
  // Retourner les 7 plateformes avec leur URL (ou null si pas de lien)
  return MAIN_PLATFORMS.map(platform => ({
    platform,
    url: linksByPlatform.get(platform.key) || null
  }));
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
