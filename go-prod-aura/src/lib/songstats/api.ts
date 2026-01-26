/**
 * Service API Songstats via RapidAPI
 * Intégration complète avec tous les endpoints Songstats, Radiostats et Playlistcheck
 */

// Toutes les API Songstats passent par RapidAPI
const SONGSTATS_RAPIDAPI_URL = 'https://songstats.p.rapidapi.com/v1';
const SONGSTATS_RAPIDAPI_HOST = 'songstats.p.rapidapi.com';

// Types de réponse API
export type ArtistMetadata = {
  id: string;
  name: string;
  genres?: string[];
  country?: string;
  labels?: string[];
  image_url?: string;
  links?: {
    spotify?: string;
    apple_music?: string;
    deezer?: string;
    youtube?: string;
    instagram?: string;
    facebook?: string;
    tiktok?: string;
  };
};

export type ArtistStats = {
  spotify?: {
    followers?: number;
    monthly_listeners?: number;
    popularity?: number;
  };
  instagram?: {
    followers?: number;
  };
  tiktok?: {
    followers?: number;
    likes?: number;
  };
  youtube?: {
    subscribers?: number;
    views?: number;
  };
  facebook?: {
    followers?: number;
  };
  twitter?: {
    followers?: number;
  };
  total_streams?: number;
  updated_at?: string;
};

export type StatsHistoryPoint = {
  date: string;
  metric: string;
  value: number;
  platform?: string;
};

export type PlaylistEntry = {
  playlist_id: string;
  playlist_name: string;
  owner: string;
  type: 'editorial' | 'algorithmic' | 'user';
  followers: number;
  position?: number;
  added_at?: string;
  platform: string;
};

export type ChartEntry = {
  chart_name: string;
  country: string;
  position: number;
  peak_position?: number;
  weeks_on_chart?: number;
  date: string;
};

export type RadioPlay = {
  station: string;
  country: string;
  plays: number;
  last_play?: string;
};

export type SocialStats = {
  platform: string;
  followers?: number;
  engagement_rate?: number;
  reach?: number;
  posts?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  country_breakdown?: { country: string; count: number }[];
};

export type Track = {
  id: string;
  isrc?: string;
  name: string;
  artists: string[];
  release_date?: string;
  duration_ms?: number;
  popularity?: number;
  streams?: number;
  image_url?: string;
};

/**
 * Type pour les activités d'un artiste (Activity Feed)
 * Données très riches retournées par l'endpoint /artists/{id}/activities
 */
export type ArtistActivity = {
  source: string;
  activity_text: string;
  activity_type: string;
  activity_date: string;
  activity_url: string | null;
  activity_avatar: string | null;
  activity_tier: number; // 1 = très important, 4 = mineur
  track_info?: {
    songstats_track_id: string;
    avatar: string;
    title: string;
    release_date: string;
    site_url: string;
    artists: {
      name: string;
      songstats_artist_id: string;
    }[];
  };
};

/**
 * Classe principale pour interagir avec l'API Songstats via RapidAPI
 */
export class SongstatsAPI {
  private rapidApiKey: string;

  constructor(rapidApiKey: string) {
    this.rapidApiKey = rapidApiKey;
  }

  /**
   * Effectue une requête GET vers l'API Songstats via RapidAPI
   */
  private async fetchSongstats<T>(endpoint: string): Promise<T> {
    const url = `${SONGSTATS_RAPIDAPI_URL}${endpoint}`;
    console.log(`🌐 Requête Songstats: ${endpoint}`);
    
    const response = await fetch(url, {
      headers: {
        'X-RapidAPI-Key': this.rapidApiKey,
        'X-RapidAPI-Host': SONGSTATS_RAPIDAPI_HOST,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`❌ Erreur ${response.status} pour ${endpoint}`);
      throw new Error(`Songstats API error: ${response.status} ${response.statusText}`);
    }

    console.log(`✅ Succès pour ${endpoint}`);
    return response.json();
  }

  /**
   * Effectue une requête GET vers Radiostats API via RapidAPI
   */
  private async fetchRadiostats<T>(endpoint: string): Promise<T> {
    // Radiostats fait partie de l'API Songstats sur RapidAPI
    return this.fetchSongstats<T>(`/radiostats${endpoint}`);
  }

  // ========================================================================
  // ARTIST ENDPOINTS
  // ========================================================================

  /**
   * Récupère les métadonnées complètes d'un artiste
   */
  async getArtistMetadata(artistId: string): Promise<ArtistMetadata> {
    return this.fetchSongstats<ArtistMetadata>(`/artists/${artistId}`);
  }

  /**
   * Récupère le catalogue complet des tracks d'un artiste
   */
  async getArtistCatalog(artistId: string): Promise<Track[]> {
    const response = await this.fetchSongstats<{ tracks: Track[] }>(`/artists/${artistId}/catalog`);
    return response.tracks || [];
  }

  /**
   * Récupère les statistiques globales récentes d'un artiste
   */
  async getArtistStats(artistId: string): Promise<ArtistStats> {
    return this.fetchSongstats<ArtistStats>(`/artists/${artistId}/stats`);
  }

  /**
   * Récupère l'historique temporel des métriques d'un artiste
   */
  async getArtistStatsHistory(
    artistId: string,
    startDate?: string,
    endDate?: string,
    metrics?: string[]
  ): Promise<StatsHistoryPoint[]> {
    let endpoint = `/artists/${artistId}/stats/history`;
    const params = new URLSearchParams();
    
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    if (metrics) params.append('metrics', metrics.join(','));
    
    if (params.toString()) endpoint += `?${params.toString()}`;
    
    const response = await this.fetchSongstats<{ history: StatsHistoryPoint[] }>(endpoint);
    return response.history || [];
  }

  /**
   * Récupère les playlists où l'artiste est présent
   */
  async getArtistPlaylists(artistId: string): Promise<PlaylistEntry[]> {
    const response = await this.fetchSongstats<{ playlists: PlaylistEntry[] }>(`/artists/${artistId}/playlists`);
    return response.playlists || [];
  }

  /**
   * Récupère la présence de l'artiste dans les charts
   */
  async getArtistCharts(artistId: string): Promise<ChartEntry[]> {
    const response = await this.fetchSongstats<{ charts: ChartEntry[] }>(`/artists/${artistId}/charts`);
    return response.charts || [];
  }

  /**
   * Récupère les diffusions radios de l'artiste
   */
  async getArtistRadios(artistId: string): Promise<RadioPlay[]> {
    const response = await this.fetchRadiostats<{ radios: RadioPlay[] }>(`/${artistId}`);
    return response.radios || [];
  }

  /**
   * Récupère les stations de radio diffusant l'artiste
   */
  async getArtistRadioStations(artistId: string): Promise<any> {
    return this.fetchRadiostats(`/${artistId}/stations`);
  }

  /**
   * Récupère les données sociales détaillées de l'artiste
   */
  async getArtistSocial(artistId: string): Promise<SocialStats[]> {
    const response = await this.fetchSongstats<{ social: SocialStats[] }>(`/artists/${artistId}/social`);
    return response.social || [];
  }

  /**
   * Récupère les activités récentes de l'artiste (playlists, charts, etc.)
   * C'est l'endpoint le plus riche pour le "Activity Feed"
   */
  async getArtistActivities(artistId: string): Promise<ArtistActivity[]> {
    const response = await this.fetchSongstats<{ 
      data: ArtistActivity[];
      artist_info: {
        songstats_artist_id: string;
        avatar: string;
        site_url: string;
        name: string;
      };
      source_ids: string[];
    }>(`/artists/${artistId}/activities`);
    return response.data || [];
  }

  // ========================================================================
  // TRACK ENDPOINTS
  // ========================================================================

  /**
   * Récupère les métadonnées complètes d'un track
   */
  async getTrackMetadata(trackId: string): Promise<Track> {
    return this.fetchSongstats<Track>(`/tracks/${trackId}`);
  }

  /**
   * Récupère les statistiques actuelles d'un track
   */
  async getTrackStats(trackId: string): Promise<any> {
    return this.fetchSongstats(`/tracks/${trackId}/stats/current`);
  }

  /**
   * Récupère l'historique des stats d'un track
   */
  async getTrackStatsHistory(trackId: string, startDate?: string, endDate?: string): Promise<StatsHistoryPoint[]> {
    let endpoint = `/tracks/${trackId}/stats/history`;
    const params = new URLSearchParams();
    
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    
    if (params.toString()) endpoint += `?${params.toString()}`;
    
    const response = await this.fetchSongstats<{ history: StatsHistoryPoint[] }>(endpoint);
    return response.history || [];
  }

  /**
   * Récupère les playlists contenant le track
   */
  async getTrackPlaylists(trackId: string): Promise<PlaylistEntry[]> {
    const response = await this.fetchSongstats<{ playlists: PlaylistEntry[] }>(`/tracks/${trackId}/playlists`);
    return response.playlists || [];
  }

  /**
   * Récupère les classements du track dans les charts
   */
  async getTrackCharts(trackId: string): Promise<ChartEntry[]> {
    const response = await this.fetchSongstats<{ charts: ChartEntry[] }>(`/tracks/${trackId}/charts`);
    return response.charts || [];
  }

  /**
   * Récupère les diffusions radios du track
   */
  async getTrackRadios(trackId: string): Promise<RadioPlay[]> {
    const response = await this.fetchRadiostats<{ radios: RadioPlay[] }>(`/${trackId}`);
    return response.radios || [];
  }

  /**
   * Récupère les statistiques sociales du track
   */
  async getTrackSocial(trackId: string): Promise<SocialStats[]> {
    const response = await this.fetchSongstats<{ social: SocialStats[] }>(`/tracks/${trackId}/social`);
    return response.social || [];
  }

  // ========================================================================
  // LABEL ENDPOINTS
  // ========================================================================

  /**
   * Récupère les informations d'un label
   */
  async getLabelInfo(labelId: string): Promise<any> {
    return this.fetchSongstats(`/labels/${labelId}`);
  }

  /**
   * Récupère le catalogue complet d'un label
   */
  async getLabelCatalog(labelId: string): Promise<any> {
    return this.fetchSongstats(`/labels/${labelId}/catalog`);
  }

  /**
   * Récupère les statistiques globales d'un label
   */
  async getLabelStats(labelId: string): Promise<any> {
    return this.fetchSongstats(`/labels/${labelId}/stats`);
  }

  /**
   * Récupère l'historique des performances d'un label
   */
  async getLabelStatsHistory(labelId: string): Promise<StatsHistoryPoint[]> {
    const response = await this.fetchSongstats<{ history: StatsHistoryPoint[] }>(`/labels/${labelId}/stats/history`);
    return response.history || [];
  }

  // ========================================================================
  // PLAYLIST ENDPOINTS (RapidAPI)
  // ========================================================================

  /**
   * Récupère les métadonnées détaillées d'une playlist
   */
  async getPlaylistMetadata(playlistId: string): Promise<any> {
    return this.fetchSongstats(`/playlists/${playlistId}`);
  }

  /**
   * Récupère les statistiques avancées d'une playlist
   */
  async getPlaylistStats(playlistId: string): Promise<any> {
    return this.fetchSongstats(`/playlists/${playlistId}/stats`);
  }

  /**
   * Récupère la liste des playlists principales par territoire
   */
  async getTopPlaylists(country?: string): Promise<any> {
    let endpoint = '/playlists/top';
    if (country) endpoint += `?country=${country}`;
    return this.fetchSongstats(endpoint);
  }

  /**
   * Récupère la liste des meilleurs curateurs
   */
  async getTopCurators(): Promise<any> {
    return this.fetchSongstats('/curators/top');
  }

  // ========================================================================
  // HELPER: Récupération complète des données d'un artiste
  // ========================================================================

  /**
   * Récupère TOUTES les données disponibles pour un artiste
   * Fait les requêtes séquentiellement pour respecter la limite de 1 req/sec du plan Basic
   * @param onProgress Callback optionnel pour suivre la progression (current, total, message)
   */
  async getArtistFullData(
    artistId: string, 
    onProgress?: (current: number, total: number, message: string) => void
  ) {
    // Helper pour faire une requête avec gestion d'erreur
    const fetchWithError = async <T>(fn: () => Promise<T>): Promise<{ value: T | null, error: string | null }> => {
      try {
        const value = await fn();
        return { value, error: null };
      } catch (err: any) {
        return { value: null, error: err.message };
      }
    };

    // Helper pour attendre 2 secondes entre chaque requête (marge de sécurité pour rate limit 1 req/sec)
    const wait = () => new Promise(resolve => setTimeout(resolve, 2000));

    try {
      const total = 9; // Augmenté de 8 à 9 pour inclure activities
      
      // Requête 1: Métadonnées
      onProgress?.(1, total, "Métadonnées artiste");
      const metadata = await fetchWithError(() => this.getArtistMetadata(artistId));
      await wait();

      // Requête 2: Stats actuelles
      onProgress?.(2, total, "Statistiques actuelles");
      const stats = await fetchWithError(() => this.getArtistStats(artistId));
      await wait();

      // Requête 3: Historique
      onProgress?.(3, total, "Historique des stats");
      const history = await fetchWithError(() => this.getArtistStatsHistory(artistId));
      await wait();

      // Requête 4: Catalogue
      onProgress?.(4, total, "Catalogue de morceaux");
      const catalog = await fetchWithError(() => this.getArtistCatalog(artistId));
      await wait();

      // Requête 5: Playlists
      onProgress?.(5, total, "Playlists");
      const playlists = await fetchWithError(() => this.getArtistPlaylists(artistId));
      await wait();

      // Requête 6: Charts
      onProgress?.(6, total, "Classements");
      const charts = await fetchWithError(() => this.getArtistCharts(artistId));
      await wait();

      // Requête 7: Radios
      onProgress?.(7, total, "Diffusions radio");
      const radios = await fetchWithError(() => this.getArtistRadios(artistId));
      await wait();

      // Requête 8: Social
      onProgress?.(8, total, "Réseaux sociaux");
      const social = await fetchWithError(() => this.getArtistSocial(artistId));
      await wait();

      // Requête 9: Activities (Activity Feed - données très riches)
      onProgress?.(9, total, "Flux d'activités");
      const activities = await fetchWithError(() => this.getArtistActivities(artistId));

      return {
        metadata: metadata.value,
        stats: stats.value,
        history: history.value || [],
        playlists: playlists.value || [],
        charts: charts.value || [],
        radios: radios.value || [],
        social: social.value || [],
        catalog: catalog.value || [],
        activities: activities.value || [],
        errors: {
          metadata: metadata.error,
          stats: stats.error,
          history: history.error,
          playlists: playlists.error,
          charts: charts.error,
          radios: radios.error,
          social: social.error,
          catalog: catalog.error,
          activities: activities.error,
        },
      };
    } catch (error: any) {
      throw new Error(`Failed to fetch artist full data: ${error.message}`);
    }
  }
}

/**
 * Instance singleton de l'API Songstats via RapidAPI
 * Utilise uniquement la clé RapidAPI pour l'authentification
 */
export const songstatsApi = new SongstatsAPI(
  import.meta.env.VITE_RAPIDAPI_KEY || ''
);

/**
 * Hook React pour utiliser l'API Songstats
 */
export function useSongstatsAPI() {
  return songstatsApi;
}

