// ============================================
// TYPES CENTRALISÉS - Go-Prod-AURA
// ============================================

export * from './user';
export * from './contracts';

// ============================================
// VIEW MODES
// ============================================
export type ViewMode = 'grid' | 'list';

// ============================================
// ARTIST TYPES
// ============================================
export type ArtistStatus = 'active' | 'inactive' | 'archived';

export interface SpotifyData {
  id?: string;
  artist_id?: string;
  spotify_id?: string;
  spotify_url?: string;
  image_url?: string;
  followers?: number;
  popularity?: number;
  external_url?: string;
  genres?: string[];
  created_at?: string;
  updated_at?: string;
}

export interface SocialMediaData {
  id?: string;
  artist_id?: string;
  instagram_url?: string;
  facebook_url?: string;
  youtube_url?: string;
  tiktok_url?: string;
  twitter_url?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Artist {
  id: string;
  name: string;
  status: ArtistStatus;
  email?: string;
  phone?: string;
  location?: string;
  country?: string;
  city?: string;
  bio?: string;
  company_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ArtistWithAllData extends Artist {
  spotify_data?: SpotifyData;
  social_media_data?: SocialMediaData;
  tags?: string[];
  event_names?: string[];
  upcoming_count?: number;
}

// ============================================
// EVENT TYPES
// ============================================
export type EventStatus = 'planned' | 'confirmed' | 'cancelled' | 'completed';

export interface Event {
  id: string;
  name: string;
  event_date: string;
  venue?: string;
  city?: string;
  country?: string;
  status: EventStatus;
  company_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface EventArtist {
  id?: string;
  event_id: string;
  artist_id: string;
  performance_order?: number;
  fee_amount?: number;
  fee_currency?: string;
  created_at?: string;
}

// ============================================
// COMPANY TYPES
// ============================================
export interface Company {
  id: string;
  name: string;
  created_at?: string;
  updated_at?: string;
}

// ============================================
// TAG TYPES
// ============================================
export interface Tag {
  id: string;
  name: string;
  created_at?: string;
}

export interface ArtistTag {
  artist_id: string;
  tag_id: string;
  created_at?: string;
}


