/**
 * Script pour appliquer la migration finance directement via l'API Supabase
 * Utilise fetch pour appeler l'endpoint SQL de Supabase
 */

import { readFileSync } from 'fs';

// Read .env manually
const envContent = readFileSync('.env', 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length > 0) {
    envVars[key.trim()] = valueParts.join('=').trim();
  }
});

process.env = { ...process.env, ...envVars };

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('ERROR: Missing VITE_SUPABASE_URL or VITE_SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

// Project ref from URL
const projectRef = SUPABASE_URL.replace('https://', '').split('.')[0];
console.log(`Project ref: ${projectRef}`);

// Read the migration file
const migrationSQL = readFileSync('supabase/migrations/20260128_200000_finance_module.sql', 'utf8');

// Split into individual statements (simple split, handles most cases)
function splitStatements(sql) {
  const statements = [];
  let current = '';
  let inString = false;
  let stringChar = '';
  let inComment = false;
  let inBlockComment = false;

  for (let i = 0; i < sql.length; i++) {
    const char = sql[i];
    const nextChar = sql[i + 1];

    // Handle block comments /* */
    if (!inString && char === '/' && nextChar === '*') {
      inBlockComment = true;
      current += char;
      continue;
    }
    if (inBlockComment && char === '*' && nextChar === '/') {
      inBlockComment = false;
      current += char;
      continue;
    }

    // Handle line comments --
    if (!inString && !inBlockComment && char === '-' && nextChar === '-') {
      inComment = true;
      current += char;
      continue;
    }
    if (inComment && char === '\n') {
      inComment = false;
      current += char;
      continue;
    }

    // Handle strings
    if (!inComment && !inBlockComment && (char === "'" || char === '"') && sql[i - 1] !== '\\') {
      if (!inString) {
        inString = true;
        stringChar = char;
      } else if (char === stringChar) {
        inString = false;
      }
    }

    // Handle semicolons
    if (!inString && !inComment && !inBlockComment && char === ';') {
      current += char;
      const stmt = current.trim();
      if (stmt && !stmt.match(/^--/)) {
        statements.push(stmt);
      }
      current = '';
      continue;
    }

    current += char;
  }

  // Don't forget the last statement if no trailing semicolon
  const lastStmt = current.trim();
  if (lastStmt && !lastStmt.match(/^--/) && lastStmt.length > 5) {
    statements.push(lastStmt);
  }

  return statements;
}

const statements = splitStatements(migrationSQL);
console.log(`\nFound ${statements.length} SQL statements to execute\n`);

// Execute each statement
async function executeSQL(sql, index) {
  const preview = sql.substring(0, 100).replace(/\n/g, ' ').replace(/\s+/g, ' ');
  console.log(`[${index + 1}/${statements.length}] ${preview}...`);

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ sql_query: sql }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`HTTP ${response.status}: ${text}`);
    }

    console.log(`  ✓ Success`);
    return true;
  } catch (err) {
    console.log(`  ✗ Error: ${err.message}`);
    return false;
  }
}

// Execute via postgres.js connection through management API
// Alternative: use the SQL Editor API endpoint
async function executeSQLViaSQLEditor(sql) {
  // This requires the access token from supabase login
  // For now, let's try the simpler approach with pg
  console.log('Attempting to execute SQL...');
  
  // Use the pooler connection string
  const connectionString = `postgresql://postgres.${projectRef}:${SERVICE_ROLE_KEY}@aws-0-eu-north-1.pooler.supabase.com:6543/postgres`;
  
  console.log('Connection will use pooler endpoint');
  
  // Since we can't use pg directly without installing it, let's use a different approach
  // We'll create the tables using Supabase client with raw SQL via an Edge Function
  
  return false;
}

// Main execution
async function main() {
  console.log('='.repeat(60));
  console.log('FINANCE MODULE MIGRATION');
  console.log('='.repeat(60));
  console.log(`\nTarget: ${SUPABASE_URL}\n`);

  // First, check if exec_sql function exists
  let hasExecSql = false;
  try {
    const checkResponse = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ sql_query: 'SELECT 1' }),
    });
    hasExecSql = checkResponse.ok;
  } catch (e) {
    hasExecSql = false;
  }

  if (!hasExecSql) {
    console.log('NOTE: exec_sql function not available.');
    console.log('Please run this migration manually in the Supabase SQL Editor.');
    console.log('\nMigration file: supabase/migrations/20260128_200000_finance_module.sql');
    console.log('\nYou can copy the contents and paste them in:');
    console.log(`${SUPABASE_URL.replace('.supabase.co', '')}/project/${projectRef}/sql/new`);
    
    // Output a summary of what will be created
    console.log('\n' + '='.repeat(60));
    console.log('TABLES TO CREATE:');
    console.log('='.repeat(60));
    console.log('1. invoice_categories - Catégories de factures');
    console.log('2. invoices - Factures fournisseurs');
    console.log('3. payments - Paiements');
    console.log('4. invoice_files - Fichiers attachés');
    console.log('5. invoice_activity_log - Journal d\'activité');
    console.log('\nSTORAGE BUCKETS:');
    console.log('- invoices (PDF factures)');
    console.log('- payment-proofs (Preuves de paiement)');
    
    process.exit(0);
  }

  // Execute statements
  let success = 0;
  let failed = 0;

  for (let i = 0; i < statements.length; i++) {
    const result = await executeSQL(statements[i], i);
    if (result) success++;
    else failed++;
  }

  console.log('\n' + '='.repeat(60));
  console.log('MIGRATION COMPLETE');
  console.log('='.repeat(60));
  console.log(`Success: ${success}`);
  console.log(`Failed: ${failed}`);
}

main().catch(console.error);
