import type { JSX } from 'react';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

interface SocialLink {
  source: string;
  url: string;
}

interface EnrichedData {
  website_official?: string;
  twitter_username?: string;
  instagram_username?: string;
  facebook_id?: string;
  youtube_channel_id?: string;
  tiktok_username?: string;
  soundcloud_id?: string;
  spotify_artist_id?: string;
  deezer_artist_id?: string;
  apple_music_artist_id?: string;
  url_musicbrainz?: string;
  url_discogs?: string;
  url_wikipedia_en?: string;
  url_wikipedia_fr?: string;
  url_wikidata?: string;
  url_theaudiodb?: string;
}

interface ArtistPlatformsBarProps {
  artistId: string;
}

// Toutes les plateformes a afficher (dans l'ordre demande - website en premier!)
const ALL_PLATFORMS = [
  'website',
  'instagram',
  'facebook',
  'tiktok',
  'twitter',
  'youtube',
  'spotify',
  'apple_music',
  'deezer',
  'tidal',
  'amazon',
  'bandsintown',
  'soundcloud',
  'beatport',
  'tracklist',
  'traxsource',
  'musicbrainz',
  'anghami',
  'discogs',
  'wikipedia',
  'wikidata',
  'theaudiodb',
] as const;

// Configuration des plateformes avec icones SVG
const PLATFORM_CONFIG: Record<string, { 
  name: string; 
  color: string; 
  icon: JSX.Element;
}> = {
  website: {
    name: 'Site Officiel',
    color: '#6366F1',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10"/>
        <line x1="2" y1="12" x2="22" y2="12"/>
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
      </svg>
    ),
  },
  spotify: {
    name: 'Spotify',
    color: '#1DB954',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.44-.494.15-1.017-.122-1.167-.616-.15-.494.122-1.017.616-1.167 4.239-1.26 9.6-.66 13.2 1.68.479.3.578 1.02.262 1.5zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.18-1.2-.18-1.38-.719-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z"/>
      </svg>
    ),
  },
  apple_music: {
    name: 'Apple Music',
    color: '#FA243C',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M23.994 6.124a9.23 9.23 0 00-.24-2.19c-.317-1.31-1.062-2.31-2.18-3.043a5.022 5.022 0 00-1.877-.726 10.496 10.496 0 00-1.564-.15c-.04-.003-.083-.01-.124-.013H5.986c-.152.01-.303.017-.455.026-.747.043-1.49.123-2.193.401-1.336.53-2.3 1.452-2.865 2.78-.192.448-.292.925-.363 1.408-.056.392-.088.785-.1 1.18 0 .032-.007.062-.01.093v12.223c.01.14.017.283.027.424.05.815.154 1.624.497 2.373.65 1.42 1.738 2.353 3.234 2.801.42.127.856.187 1.293.228.555.053 1.11.06 1.667.06h11.03a12.5 12.5 0 001.57-.1c.822-.106 1.596-.35 2.295-.81a5.046 5.046 0 001.88-2.207c.186-.42.293-.87.37-1.324.113-.675.138-1.358.137-2.04-.002-3.8 0-7.595-.003-11.393zm-6.423 3.99v5.712c0 .417-.058.827-.244 1.206-.29.59-.76.962-1.388 1.14-.35.1-.706.157-1.07.173-.95.042-1.785-.455-2.105-1.36a1.817 1.817 0 01.617-2.062c.387-.3.838-.464 1.305-.554.352-.068.707-.124 1.06-.186.36-.064.62-.24.72-.594.03-.11.04-.224.04-.337V9.95c0-.193-.052-.333-.233-.4-.145-.055-.3-.083-.46-.108-1.05-.158-2.1-.307-3.147-.48-.09-.015-.185-.015-.32-.02v6.666c0 .326-.04.652-.162.96-.31.795-.89 1.283-1.7 1.494-.35.09-.71.14-1.073.15-.976.027-1.82-.49-2.123-1.447-.253-.795.016-1.593.68-2.065.387-.272.83-.424 1.287-.512.397-.077.8-.14 1.2-.21.27-.048.47-.174.57-.444.04-.107.06-.224.06-.34V6.39c0-.3.07-.543.3-.736.13-.108.277-.18.443-.213.26-.05.52-.09.78-.14l3.463-.6 2.24-.387c.08-.014.16-.025.24-.03.26-.013.47.12.545.373.04.133.05.277.05.418z"/>
      </svg>
    ),
  },
  instagram: {
    name: 'Instagram',
    color: '#E4405F',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
      </svg>
    ),
  },
  facebook: {
    name: 'Facebook',
    color: '#1877F2',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
      </svg>
    ),
  },
  twitter: {
    name: 'X',
    color: '#000000',
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
      </svg>
    ),
  },
  youtube: {
    name: 'YouTube',
    color: '#FF0000',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
      </svg>
    ),
  },
  tiktok: {
    name: 'TikTok',
    color: '#000000',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
      </svg>
    ),
  },
  soundcloud: {
    name: 'SoundCloud',
    color: '#FF5500',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M1.175 12.225c-.051 0-.094.046-.101.1l-.233 2.154.233 2.105c.007.058.05.098.101.098.05 0 .09-.04.099-.098l.255-2.105-.27-2.154c0-.057-.045-.1-.09-.1m-.899.828c-.04 0-.078.037-.083.077l-.222 1.326.222 1.28c.005.04.042.077.083.077s.078-.037.083-.077l.249-1.28-.249-1.326c-.005-.04-.042-.077-.083-.077m1.8-1.024c-.061 0-.11.05-.117.111l-.209 2.179.209 2.098c.008.06.056.111.116.111.061 0 .11-.05.117-.111l.235-2.098-.235-2.179c-.007-.06-.056-.111-.116-.111"/>
      </svg>
    ),
  },
  deezer: {
    name: 'Deezer',
    color: '#FEAA2D',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.81 4.16v3.03H24V4.16zM6.27 8.38v3.027h5.189V8.38zm12.54 0v3.027H24V8.38zM6.27 12.566v3.027h5.189v-3.027zm6.271 0v3.027h5.19v-3.027zm6.27 0v3.027H24v-3.027zM0 16.752v3.027h5.19v-3.027zm6.27 0v3.027h5.189v-3.027zm6.271 0v3.027h5.19v-3.027zm6.27 0v3.027H24v-3.027z"/>
      </svg>
    ),
  },
  tidal: {
    name: 'Tidal',
    color: '#000000',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12.012 3.992L8.008 7.996 4.004 3.992 0 7.996l4.004 4.004L8.008 16l4.004-4.004L16.016 16l4.004-4.004L24.024 7.996l-4.004-4.004-4.004 4.004z"/>
      </svg>
    ),
  },
  amazon: {
    name: 'Amazon Music',
    color: '#FF9900',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M.045 18.02c.072-.116.187-.124.348-.022 3.636 2.11 7.594 3.166 11.87 3.166 2.852 0 5.668-.533 8.447-1.595l.315-.14c.138-.06.234-.1.293-.13.226-.088.39-.046.525.13.12.174.09.336-.12.48-.256.18-.6.395-1.027.645-.596.345-1.318.7-2.16 1.063-1.15.494-2.46.884-3.93 1.168-1.47.284-2.918.426-4.343.426-1.74 0-3.435-.2-5.09-.598-1.65-.4-3.14-.96-4.47-1.684-.236-.124-.36-.24-.367-.347-.007-.113.04-.21.14-.29l.57-.45z"/>
      </svg>
    ),
  },
  beatport: {
    name: 'Beatport',
    color: '#94D500',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M21.429 17.055c-.636 2.78-3.287 4.907-6.114 4.907-2.606 0-4.776-1.468-5.896-3.596h2.924c.852 1.133 2.117 1.867 3.543 1.867 2.21 0 4.057-1.586 4.464-3.675.384-2.19-1.004-4.23-3.214-4.658-2.21-.427-4.406.95-4.792 3.14H9.416c.682-3.367 4.027-5.62 7.479-4.955 3.453.665 5.59 4.003 4.534 6.97z"/>
      </svg>
    ),
  },
  traxsource: {
    name: 'Traxsource',
    color: '#E74C3C',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
      </svg>
    ),
  },
  bandsintown: {
    name: 'Bandsintown',
    color: '#00CEC8',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18 4H6v8H4V4c0-1.1.9-2 2-2h12c1.1 0 2 .9 2 2v8h-2V4zM1 22h7v-6H1v6zm2-4h3v2H3v-2zm6 4h7v-6H9v6zm2-4h3v2h-3v-2zm6 4h7v-6h-7v6zm2-4h3v2h-3v-2z"/>
      </svg>
    ),
  },
  musicbrainz: {
    name: 'MusicBrainz',
    color: '#BA478F',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 2.824a9.176 9.176 0 110 18.352 9.176 9.176 0 010-18.352z"/>
      </svg>
    ),
  },
  anghami: {
    name: 'Anghami',
    color: '#8B5CF6',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 14.5c-2.49 0-4.5-2.01-4.5-4.5S9.51 7.5 12 7.5s4.5 2.01 4.5 4.5-2.01 4.5-4.5 4.5z"/>
      </svg>
    ),
  },
  tracklist: {
    name: '1001 Tracklists',
    color: '#1A1A1A',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/>
      </svg>
    ),
  },
  discogs: {
    name: 'Discogs',
    color: '#333333',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 21.6c-5.3 0-9.6-4.3-9.6-9.6S6.7 2.4 12 2.4s9.6 4.3 9.6 9.6-4.3 9.6-9.6 9.6zm0-16.8c-4 0-7.2 3.2-7.2 7.2s3.2 7.2 7.2 7.2 7.2-3.2 7.2-7.2-3.2-7.2-7.2-7.2zm0 12c-2.6 0-4.8-2.2-4.8-4.8s2.2-4.8 4.8-4.8 4.8 2.2 4.8 4.8-2.2 4.8-4.8 4.8z"/>
      </svg>
    ),
  },
  wikipedia: {
    name: 'Wikipedia',
    color: '#000000',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12.09 13.119c-.936 1.932-2.217 4.548-2.853 5.728-.616 1.074-1.127.975-1.601.101-1.267-2.34-2.3-4.876-3.549-7.316-.374-.726-.75-1.451-1.122-2.178-.24-.47-.482-.938-.738-1.398-.193-.347-.453-.457-.82-.293-.29.13-.644.124-.938.13-.068.001-.135-.016-.227-.027.064-.14.097-.26.157-.37.714-1.314 1.435-2.625 2.145-3.942.15-.277.317-.44.642-.374.324.067.575.263.676.59.22.711.414 1.431.618 2.148.063.22.122.442.197.715.21-.544.393-1.04.594-1.528.496-1.209 1.003-2.413 1.49-3.626.17-.421.393-.788.91-.836.545-.05.933.276 1.144.75.598 1.34 1.174 2.69 1.765 4.034.047.107.107.208.2.386.192-.454.362-.861.537-1.265.52-1.2 1.04-2.4 1.57-3.596.146-.33.366-.568.726-.618.467-.065.796.156.993.578.35.753.682 1.515 1.018 2.275.614 1.39 1.226 2.783 1.839 4.174.107.243.21.489.33.768.054-.106.094-.172.122-.244.554-1.454 1.113-2.906 1.656-4.364.187-.502.41-.99.877-1.284.306-.193.64-.258.98-.155.44.133.683.465.783.904.134.593.22 1.196.324 1.795.036.21.063.422.118.79.217-.64.405-1.213.606-1.78.277-.78.566-1.555.844-2.334.168-.473.494-.743.99-.737.51.007.871.316 1.015.805.217.738.397 1.488.59 2.233.073.28.138.562.232.949.122-.327.227-.612.335-.896.28-.737.555-1.476.843-2.21.147-.375.395-.667.814-.715.452-.052.796.162.995.571.135.278.253.566.347.86.45 1.42.87 2.848 1.312 4.27.05.16.14.306.283.615.106-.37.188-.654.268-.939.249-.884.494-1.77.748-2.652.117-.408.425-.677.85-.7.458-.025.806.217.97.648.316.836.605 1.682.902 2.526.064.18.116.364.205.646.11-.266.197-.476.283-.687.306-.753.607-1.508.918-2.258.15-.363.403-.628.812-.656.42-.028.764.174.943.56.24.518.45 1.05.67 1.578.04.094.074.192.133.347.19-.488.357-.927.537-1.36.247-.597.5-1.191.759-1.782.165-.376.463-.616.876-.627.404-.01.72.207.9.573.247.502.47 1.016.698 1.526.052.116.093.237.166.426.1-.24.18-.43.259-.621.257-.62.51-1.242.772-1.86.168-.396.48-.657.918-.657.426 0 .738.248.912.638.262.585.503 1.179.75 1.77.043.103.077.21.134.37.1-.228.183-.412.263-.598.235-.548.466-1.098.705-1.644.19-.434.535-.69 1.013-.665.436.023.75.266.915.67.272.663.52 1.336.776 2.005.038.1.067.203.12.37.082-.196.148-.35.21-.506.235-.586.465-1.175.705-1.759.173-.42.5-.688.953-.685.443.002.77.27.936.682.278.689.537 1.385.8 2.08.034.09.056.186.101.338.08-.192.143-.34.204-.49.23-.57.454-1.142.69-1.71.183-.442.524-.72 1.01-.706.46.013.788.29.955.72.285.733.553 1.472.822 2.21.034.092.054.19.095.338z"/>
      </svg>
    ),
  },
  wikidata: {
    name: 'Wikidata',
    color: '#006699',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
      </svg>
    ),
  },
  theaudiodb: {
    name: 'TheAudioDB',
    color: '#F57C00',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
      </svg>
    ),
  },
};

export function ArtistPlatformsBar({ artistId }: ArtistPlatformsBarProps) {
  const [availableLinks, setAvailableLinks] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAllLinks();
  }, [artistId]);

  const fetchAllLinks = async () => {
    try {
      // 1. Fetch links from artist_links_songstats
      const { data: songstatsLinks } = await supabase
        .from('artist_links_songstats')
        .select('source, url')
        .eq('artist_id', artistId);

      // 2. Fetch enriched data from artists_enriched
      const { data: enrichedData } = await supabase
        .from('artists_enriched')
        .select(`
          website_official,
          twitter_username,
          instagram_username,
          facebook_id,
          youtube_channel_id,
          tiktok_username,
          soundcloud_id,
          spotify_artist_id,
          deezer_artist_id,
          apple_music_artist_id,
          url_musicbrainz,
          url_discogs,
          url_wikipedia_en,
          url_wikipedia_fr,
          url_wikidata,
          url_theaudiodb
        `)
        .eq('artist_id', artistId)
        .single();

      // Create links map
      const linksMap = new Map<string, string>();
      
      // Add songstats links
      (songstatsLinks || []).forEach((link: SocialLink) => {
        linksMap.set(link.source.toLowerCase(), link.url);
      });
      
      // Add enriched data links (these override if present)
      if (enrichedData) {
        const ed = enrichedData as EnrichedData;
        
        // Website (priority)
        if (ed.website_official) {
          linksMap.set('website', ed.website_official.startsWith('http') ? ed.website_official : `https://${ed.website_official}`);
        }
        
        // Social media from Wikidata usernames
        if (ed.twitter_username && !linksMap.has('twitter')) {
          linksMap.set('twitter', `https://twitter.com/${ed.twitter_username}`);
        }
        if (ed.instagram_username && !linksMap.has('instagram')) {
          linksMap.set('instagram', `https://instagram.com/${ed.instagram_username}`);
        }
        if (ed.facebook_id && !linksMap.has('facebook')) {
          linksMap.set('facebook', `https://facebook.com/${ed.facebook_id}`);
        }
        if (ed.youtube_channel_id && !linksMap.has('youtube')) {
          linksMap.set('youtube', `https://youtube.com/channel/${ed.youtube_channel_id}`);
        }
        if (ed.tiktok_username && !linksMap.has('tiktok')) {
          linksMap.set('tiktok', `https://tiktok.com/@${ed.tiktok_username}`);
        }
        if (ed.soundcloud_id && !linksMap.has('soundcloud')) {
          linksMap.set('soundcloud', `https://soundcloud.com/${ed.soundcloud_id}`);
        }
        
        // Platform IDs to URLs
        if (ed.spotify_artist_id && !linksMap.has('spotify')) {
          linksMap.set('spotify', `https://open.spotify.com/artist/${ed.spotify_artist_id}`);
        }
        if (ed.deezer_artist_id && !linksMap.has('deezer')) {
          linksMap.set('deezer', `https://deezer.com/artist/${ed.deezer_artist_id}`);
        }
        if (ed.apple_music_artist_id && !linksMap.has('apple_music')) {
          linksMap.set('apple_music', `https://music.apple.com/artist/${ed.apple_music_artist_id}`);
        }
        
        // Direct URLs from enrichment
        if (ed.url_musicbrainz) linksMap.set('musicbrainz', ed.url_musicbrainz);
        if (ed.url_discogs) linksMap.set('discogs', ed.url_discogs);
        if (ed.url_wikipedia_en) linksMap.set('wikipedia', ed.url_wikipedia_en);
        else if (ed.url_wikipedia_fr) linksMap.set('wikipedia', ed.url_wikipedia_fr);
        if (ed.url_wikidata) linksMap.set('wikidata', ed.url_wikidata);
        if (ed.url_theaudiodb) linksMap.set('theaudiodb', ed.url_theaudiodb);
      }
      
      setAvailableLinks(linksMap);
    } catch (err) {
      console.error('Error fetching links:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-950/40 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
        <div className="flex gap-2 justify-start">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="w-9 h-9 bg-slate-200 dark:bg-slate-700 rounded-full animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-950/40 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
      <div className="flex flex-wrap gap-2 justify-start">
        {ALL_PLATFORMS.map((platform) => {
          const config = PLATFORM_CONFIG[platform];
          if (!config) return null;
          
          const url = availableLinks.get(platform);
          const isAvailable = !!url;
          
          const IconWrapper = (
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                isAvailable 
                  ? 'text-white shadow-lg hover:scale-110 cursor-pointer' 
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500'
              }`}
              style={isAvailable ? { backgroundColor: config.color } : undefined}
              title={`${config.name}${isAvailable ? '' : ' (non disponible)'}`}
            >
              {config.icon}
            </div>
          );
          
          if (isAvailable) {
            return (
              <a
                key={platform}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative"
              >
                {IconWrapper}
                {/* Tooltip */}
                <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-slate-900 dark:bg-slate-700 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                  {config.name}
                </div>
              </a>
            );
          }
          
          return (
            <div key={platform} className="group relative">
              {IconWrapper}
              {/* Tooltip */}
              <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-slate-900 dark:bg-slate-700 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                {config.name}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
