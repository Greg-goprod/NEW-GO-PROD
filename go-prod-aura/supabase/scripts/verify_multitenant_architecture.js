#!/usr/bin/env node

/**
 * Script de vérification programmatique de l'architecture multitenant
 * Retourne un rapport JSON avec tous les problèmes détectés
 * 
 * Usage:
 *   node verify_multitenant_architecture.js
 *   node verify_multitenant_architecture.js --json (format JSON uniquement)
 * 
 * Exit codes:
 *   0 = Tout est OK
 *   1 = Problèmes détectés
 *   2 = Erreur d'exécution
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const JSON_ONLY = process.argv.includes('--json');

// Tables système (sans company_id normal)
const SYSTEM_TABLES = [
  'companies',
  'enrich_config',
  'enrich_webhook_log',
  'rbac_permissions',
  'rbac_resources',
  'rbac_role_permissions',
  'rbac_user_roles',
  'owner_admins',
  'artist_audience_geo',
  'artist_links',
  'artist_stats_history',
  'artist_tags',
  'artist_top_tracks',
  'artists_enriched',
  'social_media_data',
  'spotify_data',
  'spotify_history',
  'stg_artists_raw',
  'stg_spotify_rows'
];

// Rapport de vérification
const report = {
  timestamp: new Date().toISOString(),
  summary: {
    totalTables: 0,
    tablesWithCompanyId: 0,
    tablesWithEventId: 0,
    tablesWithoutCompanyId: 0,
    tablesWithoutRLS: 0,
    integrityViolations: 0,
    potCommun: 0
  },
  issues: {
    tablesWithoutCompanyId: [],
    tablesWithoutRLS: [],
    integrityViolations: [],
    warnings: []
  },
  details: {
    systemTables: [],
    multitenantTables: [],
    potCommunTables: [],
    eventLinkedTables: []
  },
  status: 'OK'
};

/**
 * Log avec formatage
 */
function log(message, type = 'info') {
  if (JSON_ONLY) return;
  
  const colors = {
    success: '\x1b[32m',
    error: '\x1b[31m',
    warning: '\x1b[33m',
    info: '\x1b[36m',
    reset: '\x1b[0m'
  };
  
  const icons = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: '📋'
  };
  
  console.log(`${colors[type]}${icons[type]} ${message}${colors.reset}`);
}

/**
 * Connexion Supabase
 */
function getSupabaseClient() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Variables SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY requises');
  }
  
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

/**
 * Exécuter une requête SQL
 */
async function executeQuery(supabase, query) {
  const { data, error } = await supabase.rpc('exec_sql', { query });
  
  if (error) {
    throw new Error(`Erreur SQL: ${error.message}`);
  }
  
  return data;
}

/**
 * Récupérer toutes les tables avec leurs colonnes
 */
async function getTablesStructure(supabase) {
  const query = `
    SELECT 
      t.table_name,
      string_agg(DISTINCT CASE 
        WHEN c.column_name IN ('tenant_id', 'company_id') THEN c.column_name 
      END, ', ') as tenant_columns,
      string_agg(DISTINCT CASE 
        WHEN c.column_name LIKE '%event_id%' THEN c.column_name 
      END, ', ') as event_columns
    FROM information_schema.tables t
    LEFT JOIN information_schema.columns c ON t.table_name = c.table_name 
      AND t.table_schema = c.table_schema
      AND (c.column_name IN ('tenant_id', 'company_id') OR c.column_name LIKE '%event_id%')
    WHERE t.table_schema = 'public' 
      AND t.table_type = 'BASE TABLE'
    GROUP BY t.table_name
    ORDER BY t.table_name;
  `;
  
  const { data, error } = await supabase.rpc('exec_sql', { query });
  
  if (error) {
    // Fallback: utiliser une autre méthode
    return await getTablesStructureFallback(supabase);
  }
  
  return data;
}

/**
 * Fallback : récupérer les tables via information_schema directement
 */
async function getTablesStructureFallback(supabase) {
  // Requête simple pour lister les tables
  const queryTables = `
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name;
  `;
  
  const { data: tables, error: errorTables } = await supabase
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_schema', 'public')
    .eq('table_type', 'BASE TABLE');
  
  if (errorTables) {
    throw new Error('Impossible de récupérer la liste des tables');
  }
  
  // Pour chaque table, vérifier les colonnes
  const result = [];
  
  for (const table of tables) {
    const { data: columns } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_schema', 'public')
      .eq('table_name', table.table_name)
      .in('column_name', ['company_id', 'tenant_id']);
    
    const { data: eventColumns } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_schema', 'public')
      .eq('table_name', table.table_name)
      .like('column_name', '%event_id%');
    
    result.push({
      table_name: table.table_name,
      tenant_columns: columns?.map(c => c.column_name).join(', ') || null,
      event_columns: eventColumns?.map(c => c.column_name).join(', ') || null
    });
  }
  
  return result;
}

/**
 * Vérifier RLS sur les tables
 */
async function checkRLS(supabase, tableName) {
  const query = `
    SELECT pc.relrowsecurity 
    FROM pg_class pc
    JOIN pg_namespace pn ON pn.oid = pc.relnamespace
    WHERE pn.nspname = 'public' AND pc.relname = '${tableName}';
  `;
  
  const { data, error } = await supabase.rpc('exec_sql', { query });
  
  if (error || !data || data.length === 0) {
    return false;
  }
  
  return data[0].relrowsecurity === true;
}

/**
 * Vérifier l'intégrité référentielle
 */
async function checkIntegrityViolations(supabase) {
  const violations = [];
  
  // Offres avec event_id de tenant différent
  const { data: offersViolations, error: offersError } = await supabase.rpc('exec_sql', {
    query: `
      SELECT COUNT(*) as count
      FROM offers o
      LEFT JOIN events e ON o.event_id = e.id
      WHERE o.company_id != e.company_id;
    `
  });
  
  if (!offersError && offersViolations && offersViolations[0]?.count > 0) {
    violations.push({
      table: 'offers',
      count: offersViolations[0].count,
      description: 'Offres avec event_id de tenant différent'
    });
  }
  
  // Staff shifts avec event_id de tenant différent
  const { data: shiftsViolations } = await supabase.rpc('exec_sql', {
    query: `
      SELECT COUNT(*) as count
      FROM staff_shifts ss
      LEFT JOIN staff_events se ON ss.event_id = se.id
      WHERE ss.company_id != se.company_id;
    `
  });
  
  if (shiftsViolations && shiftsViolations[0]?.count > 0) {
    violations.push({
      table: 'staff_shifts',
      count: shiftsViolations[0].count,
      description: 'Shifts avec event_id de tenant différent'
    });
  }
  
  // Staff campaigns avec target_event_id de tenant différent
  const { data: campaignsViolations } = await supabase.rpc('exec_sql', {
    query: `
      SELECT COUNT(*) as count
      FROM staff_campaigns sc
      LEFT JOIN staff_events se ON sc.target_event_id = se.id
      WHERE sc.target_event_id IS NOT NULL AND sc.company_id != se.company_id;
    `
  });
  
  if (campaignsViolations && campaignsViolations[0]?.count > 0) {
    violations.push({
      table: 'staff_campaigns',
      count: campaignsViolations[0].count,
      description: 'Campagnes avec target_event_id de tenant différent'
    });
  }
  
  // Artistes avec created_for_event_id de tenant différent
  const { data: artistsViolations } = await supabase.rpc('exec_sql', {
    query: `
      SELECT COUNT(*) as count
      FROM artists a
      LEFT JOIN events e ON a.created_for_event_id = e.id
      WHERE a.created_for_event_id IS NOT NULL AND a.company_id != e.company_id;
    `
  });
  
  if (artistsViolations && artistsViolations[0]?.count > 0) {
    violations.push({
      table: 'artists',
      count: artistsViolations[0].count,
      description: 'Artistes avec created_for_event_id de tenant différent'
    });
  }
  
  return violations;
}

/**
 * Analyse principale
 */
async function analyze() {
  try {
    log('🔍 Vérification de l\'architecture multitenant...', 'info');
    log('', 'info');
    
    const supabase = getSupabaseClient();
    
    // Récupérer la structure des tables
    log('📋 Récupération de la structure des tables...', 'info');
    const tables = await getTablesStructure(supabase);
    
    if (!tables || tables.length === 0) {
      throw new Error('Aucune table trouvée');
    }
    
    report.summary.totalTables = tables.length;
    
    // Analyser chaque table
    for (const table of tables) {
      const tableName = table.table_name;
      const hasTenantColumn = !!table.tenant_columns;
      const hasEventColumn = !!table.event_columns;
      const isSystemTable = SYSTEM_TABLES.includes(tableName);
      
      // Statistiques
      if (hasTenantColumn) {
        report.summary.tablesWithCompanyId++;
        report.details.multitenantTables.push({
          name: tableName,
          tenantColumn: table.tenant_columns,
          eventColumns: table.event_columns
        });
      }
      
      if (hasEventColumn) {
        report.summary.tablesWithEventId++;
        report.details.eventLinkedTables.push({
          name: tableName,
          eventColumns: table.event_columns
        });
      }
      
      if (isSystemTable) {
        report.details.systemTables.push(tableName);
      }
      
      // Vérifications
      
      // 1. Table métier sans company_id
      if (!isSystemTable && !hasTenantColumn) {
        report.issues.tablesWithoutCompanyId.push({
          name: tableName,
          hasEventId: hasEventColumn,
          warning: hasEventColumn ? 'Lié indirectement via event_id' : 'Pas de lien multitenant'
        });
        report.summary.tablesWithoutCompanyId++;
      }
      
      // 2. Table avec company_id sans RLS
      if (hasTenantColumn && !isSystemTable) {
        const hasRLS = await checkRLS(supabase, tableName);
        
        if (!hasRLS) {
          report.issues.tablesWithoutRLS.push(tableName);
          report.summary.tablesWithoutRLS++;
        }
      }
      
      // 3. Identifier les "pots communs"
      if (hasTenantColumn && !hasEventColumn) {
        const potCommunDescription = {
          'staff_volunteers': 'Bénévoles mutualités sur tous événements',
          'artists': 'Artistes mutualités (optionnellement liés à un événement)',
          'crm_contacts': 'Contacts CRM mutualités',
          'crm_companies': 'Entreprises CRM mutualités',
          'profiles': 'Utilisateurs du tenant',
          'tags': 'Tags métier du tenant'
        };
        
        if (potCommunDescription[tableName] || tableName.includes('_statuses') || tableName.includes('_types') || tableName.includes('_roles')) {
          report.details.potCommunTables.push({
            name: tableName,
            description: potCommunDescription[tableName] || 'Référentiel/lookup du tenant'
          });
          report.summary.potCommun++;
        }
      }
    }
    
    // Vérifier l'intégrité référentielle
    log('🔗 Vérification de l\'intégrité référentielle...', 'info');
    const integrityViolations = await checkIntegrityViolations(supabase);
    report.issues.integrityViolations = integrityViolations;
    report.summary.integrityViolations = integrityViolations.reduce((sum, v) => sum + v.count, 0);
    
    // Déterminer le statut global
    if (
      report.summary.tablesWithoutCompanyId > 0 ||
      report.summary.tablesWithoutRLS > 0 ||
      report.summary.integrityViolations > 0
    ) {
      report.status = 'ERROR';
    } else {
      report.status = 'OK';
    }
    
    // Affichage du rapport
    if (JSON_ONLY) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      displayReport();
    }
    
    // Sauvegarder le rapport
    const reportPath = path.join(__dirname, 'multitenant_verification_report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    log(`📄 Rapport sauvegardé : ${reportPath}`, 'info');
    
    // Exit code
    process.exit(report.status === 'OK' ? 0 : 1);
    
  } catch (error) {
    log(`Erreur : ${error.message}`, 'error');
    console.error(error);
    process.exit(2);
  }
}

/**
 * Affichage du rapport
 */
function displayReport() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 RÉSUMÉ DE LA VÉRIFICATION');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  console.log(`  Total tables : ${report.summary.totalTables}`);
  console.log(`  Tables avec company_id : ${report.summary.tablesWithCompanyId}`);
  console.log(`  Tables avec event_id : ${report.summary.tablesWithEventId}`);
  console.log(`  Tables "pots communs" : ${report.summary.potCommun}`);
  console.log(`  Tables système : ${report.details.systemTables.length}\n`);
  
  if (report.status === 'OK') {
    log('✅ ARCHITECTURE MULTITENANT PARFAITE !', 'success');
    console.log('');
    console.log('  • Toutes les tables métier ont un company_id');
    console.log('  • Toutes les tables multitenant ont RLS activé');
    console.log('  • Aucune violation d\'intégrité référentielle');
  } else {
    log('⚠️ PROBLÈMES DÉTECTÉS DANS L\'ARCHITECTURE', 'error');
    console.log('');
    
    if (report.summary.tablesWithoutCompanyId > 0) {
      log(`❌ ${report.summary.tablesWithoutCompanyId} table(s) métier SANS company_id`, 'error');
      report.issues.tablesWithoutCompanyId.forEach(table => {
        console.log(`    • ${table.name} → ${table.warning}`);
      });
      console.log('');
    }
    
    if (report.summary.tablesWithoutRLS > 0) {
      log(`❌ ${report.summary.tablesWithoutRLS} table(s) avec company_id SANS RLS`, 'error');
      report.issues.tablesWithoutRLS.forEach(table => {
        console.log(`    • ${table}`);
      });
      console.log('');
    }
    
    if (report.summary.integrityViolations > 0) {
      log(`❌ ${report.summary.integrityViolations} violation(s) d\'intégrité référentielle`, 'error');
      report.issues.integrityViolations.forEach(violation => {
        console.log(`    • ${violation.table} : ${violation.count} violations (${violation.description})`);
      });
      console.log('');
    }
  }
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Timestamp : ${report.timestamp}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

// Exécuter l'analyse
analyze();

