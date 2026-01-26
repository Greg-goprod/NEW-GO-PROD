// Script pour analyser la structure de la base de données Supabase
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://alhoefdrjbwdzijizrxc.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFsaG9lZmRyamJ3ZHppamlenJ4YyIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzI5NjA0MjkzLCJleHAiOjIwNDUxODAyOTN9.8dCki5e3RvOJjQDdm-quIV9yjfz6w8Cz8fBdIuWsWOQ';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function analyzeSchema() {
  console.log('=== ANALYSE DU SCHÉMA SUPABASE ===\n');

  // 1. Lister les tables principales
  const { data: tables, error: tablesError } = await supabase.rpc('exec_sql', {
    sql: `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `
  });

  if (tablesError) {
    console.error('Erreur tables:', tablesError.message);
    
    // Fallback: essayer une requête directe
    console.log('\n--- Tentative via requête directe ---\n');
    
    // Analyser les tables liées aux événements
    const eventTables = ['events', 'event_days', 'event_stages', 'artist_performances', 'offers'];
    
    for (const tableName of eventTables) {
      console.log(`\n=== TABLE: ${tableName} ===`);
      const { data, error } = await supabase.from(tableName).select('*').limit(1);
      if (error) {
        console.log(`  Erreur: ${error.message}`);
      } else if (data && data.length > 0) {
        console.log('  Colonnes:', Object.keys(data[0]).join(', '));
      } else {
        console.log('  (table vide ou inaccessible)');
      }
    }
    return;
  }

  console.log('Tables trouvées:', tables);
}

analyzeSchema().catch(console.error);
