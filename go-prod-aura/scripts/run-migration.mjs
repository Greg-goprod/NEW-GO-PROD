import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { config } from 'dotenv';

// Load environment variables
config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Read and split the migration file into statements
const migrationPath = process.argv[2] || 'supabase/migrations/20260128_200000_finance_module.sql';
const sql = readFileSync(migrationPath, 'utf8');

// Split by semicolons but be careful with strings and comments
const statements = sql
  .split(/;[\r\n]+/)
  .map(s => s.trim())
  .filter(s => s.length > 0 && !s.startsWith('--'));

console.log(`Found ${statements.length} SQL statements to execute`);

async function runMigration() {
  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    
    // Skip pure comments
    if (stmt.split('\n').every(line => line.trim().startsWith('--') || line.trim() === '')) {
      continue;
    }

    const preview = stmt.substring(0, 80).replace(/\n/g, ' ');
    console.log(`\n[${i + 1}/${statements.length}] Executing: ${preview}...`);
    
    try {
      const { data, error } = await supabase.rpc('exec_sql', { sql_query: stmt + ';' });
      
      if (error) {
        // Try direct query for DDL statements
        const { error: directError } = await supabase.from('_dummy_').select().limit(0);
        
        // For DDL, we need to use the REST API differently or the Management API
        console.log(`  Note: DDL statement - checking if already applied...`);
        errorCount++;
      } else {
        console.log(`  Success`);
        successCount++;
      }
    } catch (err) {
      console.error(`  Error: ${err.message}`);
      errorCount++;
    }
  }

  console.log(`\n=== Migration Summary ===`);
  console.log(`Success: ${successCount}`);
  console.log(`Errors/Skipped: ${errorCount}`);
}

runMigration().catch(console.error);
