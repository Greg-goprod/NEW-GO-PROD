/**
 * ============================================
 * IMPORT VIA API SUPABASE
 * ============================================
 * Script TypeScript pour importer des données via l'API Supabase
 * Alternative à l'import SQL direct
 * 
 * INSTALLATION :
 * npm install @supabase/supabase-js papaparse
 * npm install --save-dev @types/papaparse tsx
 * 
 * UTILISATION :
 * 1. Placer vos fichiers CSV dans database/old-data/
 * 2. Configurer les variables d'environnement (ou .env)
 * 3. Exécuter : npx tsx database/import-via-api.ts
 * 
 * AVANTAGES :
 * - Import progressif avec feedback
 * - Gestion des erreurs par batch
 * - Compatible avec RLS
 * - Validation en temps réel
 * 
 * ============================================
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import Papa from 'papaparse';

// ============================================
// CONFIGURATION
// ============================================
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'YOUR_SERVICE_ROLE_KEY'; // ⚠️ Service role pour bypasser RLS
const BATCH_SIZE = 50; // Nombre d'enregistrements par batch
const DEFAULT_COMPANY_ID = '00000000-0000-0000-0000-000000000001';

// Chemins des fichiers CSV
const DATA_DIR = path.join(__dirname, 'old-data');
const FILES = {
  artists: path.join(DATA_DIR, 'artists.csv'),
  spotify: path.join(DATA_DIR, 'spotify_data.csv'),
  social: path.join(DATA_DIR, 'social_media_data.csv'),
  events: path.join(DATA_DIR, 'events.csv'),
  event_artists: path.join(DATA_DIR, 'event_artists.csv'),
};

// ============================================
// TYPES
// ============================================
type Artist = {
  id?: string;
  name: string;
  status: 'active' | 'inactive' | 'archived';
  email?: string;
  phone?: string;
  location?: string;
  company_id: string;
  created_at?: string;
};

type SpotifyData = {
  id?: string;
  artist_id: string;
  image_url?: string;
  followers?: number;
  popularity?: number;
  external_url?: string;
  genres?: string[];
  created_at?: string;
};

type SocialMediaData = {
  id?: string;
  artist_id: string;
  instagram_url?: string;
  facebook_url?: string;
  youtube_url?: string;
  tiktok_url?: string;
  twitter_url?: string;
  created_at?: string;
};

type Event = {
  id?: string;
  name: string;
  event_date: string;
  venue?: string;
  city?: string;
  country?: string;
  status: 'planned' | 'confirmed' | 'cancelled' | 'completed';
  company_id: string;
  created_at?: string;
};

type EventArtist = {
  event_id: string;
  artist_id: string;
  performance_order?: number;
  fee_amount?: number;
  fee_currency?: string;
};

// ============================================
// UTILITAIRES
// ============================================
class ImportLogger {
  private logs: string[] = [];
  private errors: string[] = [];
  private warnings: string[] = [];

  info(message: string) {
    const log = `[INFO] ${message}`;
    console.log(log);
    this.logs.push(log);
  }

  error(message: string, error?: any) {
    const log = `[ERROR] ${message}${error ? ': ' + error.message : ''}`;
    console.error(log);
    this.errors.push(log);
  }

  warning(message: string) {
    const log = `[WARN] ${message}`;
    console.warn(log);
    this.warnings.push(log);
  }

  success(message: string) {
    const log = `[SUCCESS] ${message}`;
    console.log(`\x1b[32m${log}\x1b[0m`);
    this.logs.push(log);
  }

  getSummary() {
    return {
      total: this.logs.length,
      errors: this.errors.length,
      warnings: this.warnings.length,
      logs: this.logs,
      errorDetails: this.errors,
      warningDetails: this.warnings,
    };
  }

  printSummary() {
    console.log('\n========================================');
    console.log('RÉSUMÉ DE L\'IMPORT');
    console.log('========================================');
    console.log(`Total logs: ${this.logs.length}`);
    console.log(`Erreurs: ${this.errors.length}`);
    console.log(`Warnings: ${this.warnings.length}`);
    
    if (this.errors.length > 0) {
      console.log('\n⚠️  ERREURS :');
      this.errors.forEach(e => console.log(`  - ${e}`));
    }
    
    if (this.warnings.length > 0) {
      console.log('\n⚠️  WARNINGS :');
      this.warnings.forEach(w => console.log(`  - ${w}`));
    }
    
    console.log('========================================\n');
  }
}

const logger = new ImportLogger();

// ============================================
// FONCTIONS D'IMPORT
// ============================================

/**
 * Lire un fichier CSV et le parser
 */
async function readCSV<T>(filePath: string): Promise<T[]> {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(filePath)) {
      logger.warning(`Fichier non trouvé : ${filePath}`);
      resolve([]);
      return;
    }

    const fileContent = fs.readFileSync(filePath, 'utf-8');
    
    Papa.parse<T>(fileContent, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        logger.info(`CSV parsé : ${results.data.length} lignes dans ${path.basename(filePath)}`);
        resolve(results.data);
      },
      error: (error) => {
        logger.error(`Erreur de parsing CSV : ${filePath}`, error);
        reject(error);
      },
    });
  });
}

/**
 * Insérer des données par batch
 */
async function insertBatch<T>(
  supabase: SupabaseClient,
  table: string,
  data: T[],
  batchSize: number = BATCH_SIZE
): Promise<{ inserted: number; failed: number }> {
  let inserted = 0;
  let failed = 0;

  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
    
    try {
      const { error } = await supabase
        .from(table)
        .insert(batch);

      if (error) {
        logger.error(`Batch ${i / batchSize + 1} failed for table ${table}`, error);
        failed += batch.length;
      } else {
        inserted += batch.length;
        logger.info(`✓ Batch ${i / batchSize + 1} inserted (${inserted}/${data.length})`);
      }
    } catch (err: any) {
      logger.error(`Exception during batch insert for table ${table}`, err);
      failed += batch.length;
    }
  }

  return { inserted, failed };
}

/**
 * Créer la company par défaut
 */
async function ensureDefaultCompany(supabase: SupabaseClient) {
  logger.info('Vérification de la company par défaut...');
  
  const { data, error } = await supabase
    .from('companies')
    .select('id')
    .eq('id', DEFAULT_COMPANY_ID)
    .single();

  if (error && error.code === 'PGRST116') {
    // Company n'existe pas, la créer
    logger.info('Création de la company par défaut...');
    const { error: insertError } = await supabase
      .from('companies')
      .insert({
        id: DEFAULT_COMPANY_ID,
        name: 'GC Entertainment',
      });

    if (insertError) {
      logger.error('Erreur lors de la création de la company', insertError);
      throw insertError;
    }
    
    logger.success('Company par défaut créée');
  } else if (error) {
    logger.error('Erreur lors de la vérification de la company', error);
    throw error;
  } else {
    logger.info('Company par défaut existe déjà');
  }
}

/**
 * Importer les artists
 */
async function importArtists(supabase: SupabaseClient): Promise<Map<string, string>> {
  logger.info('\n--- IMPORT ARTISTS ---');
  
  const artistsRaw = await readCSV<any>(FILES.artists);
  
  if (artistsRaw.length === 0) {
    logger.warning('Aucun artist à importer');
    return new Map();
  }

  // Mapper l'ancien schéma vers le nouveau
  const artists: Artist[] = artistsRaw.map((row) => ({
    id: row.id || undefined, // Préserver les UUID si présents
    name: row.name,
    status: mapStatus(row.status),
    email: row.email || undefined,
    phone: row.phone || undefined,
    location: row.location || undefined,
    company_id: row.company_id || DEFAULT_COMPANY_ID,
    created_at: row.created_at || new Date().toISOString(),
  }));

  const { inserted, failed } = await insertBatch(supabase, 'artists', artists);
  
  logger.success(`Artists importés : ${inserted}/${artists.length} (échecs : ${failed})`);

  // Récupérer les IDs pour les relations
  const { data: insertedArtists, error } = await supabase
    .from('artists')
    .select('id, name');

  if (error) {
    logger.error('Erreur lors de la récupération des artists', error);
    return new Map();
  }

  const idMap = new Map<string, string>();
  insertedArtists?.forEach((artist) => {
    idMap.set(artist.name, artist.id);
  });

  return idMap;
}

/**
 * Importer les spotify_data
 */
async function importSpotifyData(
  supabase: SupabaseClient,
  artistIdMap: Map<string, string>
) {
  logger.info('\n--- IMPORT SPOTIFY DATA ---');
  
  const spotifyRaw = await readCSV<any>(FILES.spotify);
  
  if (spotifyRaw.length === 0) {
    logger.warning('Aucune spotify_data à importer');
    return;
  }

  // Mapper et valider les artist_id
  const spotifyData: SpotifyData[] = spotifyRaw
    .map((row) => {
      const artistId = artistIdMap.get(row.artist_name) || row.artist_id;
      
      if (!artistId) {
        logger.warning(`Spotify data sans artist_id valide : ${row.artist_name || 'unknown'}`);
        return null;
      }

      return {
        artist_id: artistId,
        image_url: row.image_url || undefined,
        followers: parseInt(row.followers) || undefined,
        popularity: parseInt(row.popularity) || undefined,
        external_url: row.external_url || undefined,
        genres: row.genres ? JSON.parse(row.genres) : [],
        created_at: row.created_at || new Date().toISOString(),
      };
    })
    .filter((item): item is SpotifyData => item !== null);

  const { inserted, failed } = await insertBatch(supabase, 'spotify_data', spotifyData);
  
  logger.success(`Spotify data importées : ${inserted}/${spotifyData.length} (échecs : ${failed})`);
}

/**
 * Importer les social_media_data
 */
async function importSocialMediaData(
  supabase: SupabaseClient,
  artistIdMap: Map<string, string>
) {
  logger.info('\n--- IMPORT SOCIAL MEDIA DATA ---');
  
  const socialRaw = await readCSV<any>(FILES.social);
  
  if (socialRaw.length === 0) {
    logger.warning('Aucune social_media_data à importer');
    return;
  }

  const socialData: SocialMediaData[] = socialRaw
    .map((row) => {
      const artistId = artistIdMap.get(row.artist_name) || row.artist_id;
      
      if (!artistId) {
        logger.warning(`Social media data sans artist_id valide : ${row.artist_name || 'unknown'}`);
        return null;
      }

      return {
        artist_id: artistId,
        instagram_url: row.instagram_url || undefined,
        facebook_url: row.facebook_url || undefined,
        youtube_url: row.youtube_url || undefined,
        tiktok_url: row.tiktok_url || undefined,
        twitter_url: row.twitter_url || undefined,
        created_at: row.created_at || new Date().toISOString(),
      };
    })
    .filter((item): item is SocialMediaData => item !== null);

  const { inserted, failed } = await insertBatch(supabase, 'social_media_data', socialData);
  
  logger.success(`Social media data importées : ${inserted}/${socialData.length} (échecs : ${failed})`);
}

/**
 * Importer les events
 */
async function importEvents(supabase: SupabaseClient): Promise<Map<string, string>> {
  logger.info('\n--- IMPORT EVENTS ---');
  
  const eventsRaw = await readCSV<any>(FILES.events);
  
  if (eventsRaw.length === 0) {
    logger.warning('Aucun event à importer');
    return new Map();
  }

  const events: Event[] = eventsRaw.map((row) => ({
    id: row.id || undefined,
    name: row.name,
    event_date: row.event_date,
    venue: row.venue || undefined,
    city: row.city || undefined,
    country: row.country || undefined,
    status: mapEventStatus(row.status),
    company_id: row.company_id || DEFAULT_COMPANY_ID,
    created_at: row.created_at || new Date().toISOString(),
  }));

  const { inserted, failed } = await insertBatch(supabase, 'events', events);
  
  logger.success(`Events importés : ${inserted}/${events.length} (échecs : ${failed})`);

  // Récupérer les IDs
  const { data: insertedEvents, error } = await supabase
    .from('events')
    .select('id, name');

  if (error) {
    logger.error('Erreur lors de la récupération des events', error);
    return new Map();
  }

  const idMap = new Map<string, string>();
  insertedEvents?.forEach((event) => {
    idMap.set(event.name, event.id);
  });

  return idMap;
}

/**
 * Importer les event_artists
 */
async function importEventArtists(
  supabase: SupabaseClient,
  artistIdMap: Map<string, string>,
  eventIdMap: Map<string, string>
) {
  logger.info('\n--- IMPORT EVENT_ARTISTS ---');
  
  const eventArtistsRaw = await readCSV<any>(FILES.event_artists);
  
  if (eventArtistsRaw.length === 0) {
    logger.warning('Aucune relation event_artists à importer');
    return;
  }

  const eventArtists: EventArtist[] = eventArtistsRaw
    .map((row) => {
      const artistId = artistIdMap.get(row.artist_name) || row.artist_id;
      const eventId = eventIdMap.get(row.event_name) || row.event_id;
      
      if (!artistId || !eventId) {
        logger.warning(`Relation event_artist invalide : artist=${row.artist_name}, event=${row.event_name}`);
        return null;
      }

      return {
        event_id: eventId,
        artist_id: artistId,
        performance_order: parseInt(row.performance_order) || undefined,
        fee_amount: parseFloat(row.fee_amount) || undefined,
        fee_currency: row.fee_currency || 'CHF',
      };
    })
    .filter((item): item is EventArtist => item !== null);

  const { inserted, failed } = await insertBatch(supabase, 'event_artists', eventArtists);
  
  logger.success(`Event-Artist relations importées : ${inserted}/${eventArtists.length} (échecs : ${failed})`);
}

// ============================================
// HELPERS
// ============================================
function mapStatus(oldStatus: string): 'active' | 'inactive' | 'archived' {
  const statusMap: Record<string, 'active' | 'inactive' | 'archived'> = {
    'actif': 'active',
    'active': 'active',
    'inactif': 'inactive',
    'inactive': 'inactive',
    'archivé': 'archived',
    'archived': 'archived',
  };
  return statusMap[oldStatus?.toLowerCase()] || 'active';
}

function mapEventStatus(oldStatus: string): 'planned' | 'confirmed' | 'cancelled' | 'completed' {
  const statusMap: Record<string, 'planned' | 'confirmed' | 'cancelled' | 'completed'> = {
    'planifié': 'planned',
    'planned': 'planned',
    'confirmé': 'confirmed',
    'confirmed': 'confirmed',
    'annulé': 'cancelled',
    'cancelled': 'cancelled',
    'terminé': 'completed',
    'completed': 'completed',
  };
  return statusMap[oldStatus?.toLowerCase()] || 'planned';
}

// ============================================
// MAIN
// ============================================
async function main() {
  console.log('\n========================================');
  console.log('IMPORT DE DONNÉES - Go-Prod-AURA');
  console.log('========================================\n');

  // Vérifier la config
  if (SUPABASE_URL === 'YOUR_SUPABASE_URL' || SUPABASE_SERVICE_KEY === 'YOUR_SERVICE_ROLE_KEY') {
    logger.error('Configuration Supabase manquante. Vérifiez les variables d\'environnement.');
    process.exit(1);
  }

  // Créer le client Supabase (avec service role pour bypasser RLS)
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  try {
    // 1. Créer la company par défaut
    await ensureDefaultCompany(supabase);

    // 2. Importer les artists
    const artistIdMap = await importArtists(supabase);

    // 3. Importer les spotify_data
    await importSpotifyData(supabase, artistIdMap);

    // 4. Importer les social_media_data
    await importSocialMediaData(supabase, artistIdMap);

    // 5. Importer les events
    const eventIdMap = await importEvents(supabase);

    // 6. Importer les event_artists
    await importEventArtists(supabase, artistIdMap, eventIdMap);

    // 7. Résumé final
    logger.printSummary();
    
    logger.success('Import terminé avec succès !');
    
  } catch (error: any) {
    logger.error('Erreur fatale lors de l\'import', error);
    logger.printSummary();
    process.exit(1);
  }
}

// Exécuter
main();




