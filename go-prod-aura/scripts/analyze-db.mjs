// Script pour analyser la structure de la base de données Supabase
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://alhoefdrjbwdzijizrxc.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFsaG9lZmRyamJ3ZHppamlenJ4YyIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzI5NjA0MjkzLCJleHAiOjIwNDUxODAyOTN9.8dCki5e3RvOJjQDdm-quIV9yjfz6w8Cz8fBdIuWsWOQ';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
  console.log('=== ANALYSE DU SCHÉMA SUPABASE ===\n');

  // Tables à analyser
  const tables = ['events', 'event_days', 'event_stages', 'artist_performances', 'offers'];
  
  for (const tableName of tables) {
    console.log(`\n--- TABLE: ${tableName} ---`);
    try {
      const { data, error } = await supabase.from(tableName).select('*').limit(1);
      if (error) {
        console.log(`  Erreur: ${error.message}`);
      } else if (data && data.length > 0) {
        const cols = Object.keys(data[0]);
        console.log(`  Colonnes (${cols.length}):`);
        cols.forEach(c => console.log(`    - ${c}: ${typeof data[0][c]} = ${JSON.stringify(data[0][c])?.substring(0, 50)}`));
      } else {
        // Essayer de récupérer la structure même si vide
        const { data: emptyData, error: emptyError } = await supabase.from(tableName).select('*').limit(0);
        console.log('  Table vide ou pas de données accessibles');
      }
    } catch (e) {
      console.log(`  Exception: ${e.message}`);
    }
  }
  
  // Analyser les relations via une performance existante
  console.log('\n\n=== ANALYSE DES RELATIONS ===\n');
  
  const { data: perf, error: perfError } = await supabase
    .from('artist_performances')
    .select(`
      id,
      artist_id,
      event_day_id,
      event_stage_id,
      booking_status,
      event_days (id, event_id, date),
      event_stages (id, event_id, name)
    `)
    .limit(1);
    
  if (perfError) {
    console.log('Erreur performances:', perfError.message);
  } else if (perf && perf.length > 0) {
    console.log('Performance exemple avec relations:');
    console.log(JSON.stringify(perf[0], null, 2));
  }
  
  // Vérifier si artist_performances a une colonne event_id directe
  console.log('\n\n=== VÉRIFICATION event_id sur artist_performances ===\n');
  const { data: perfWithEventId } = await supabase
    .from('artist_performances')
    .select('id, event_id')
    .limit(1);
  
  if (perfWithEventId && perfWithEventId.length > 0) {
    console.log('artist_performances.event_id existe:', perfWithEventId[0].event_id !== undefined);
    console.log('Valeur:', perfWithEventId[0].event_id);
  }
}

main().catch(e => console.error('Erreur:', e));
