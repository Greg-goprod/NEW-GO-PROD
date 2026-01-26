// =============================================================================
// Edge Function: enrich-orchestrator v1
// Description: Orchestrateur central pour l'enrichissement complet des artistes
// Appelle toutes les fonctions d'enrichissement dans l'ordre optimal
// =============================================================================
// deno-lint-ignore-file no-explicit-any

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

console.log("[Orchestrator] v1 LOADED");

// =============================================================================
// Types
// =============================================================================
interface OrchestrationRequest {
  artist_id?: string;        // Single artist
  artist_ids?: string[];     // Multiple artists
  steps?: string[];          // Which steps to run (default: all)
  dry_run?: boolean;         // Log only, don't execute
}

interface StepResult {
  step: string;
  success: boolean;
  duration_ms: number;
  data?: any;
  error?: string;
}

// =============================================================================
// All enrichment steps in order
// =============================================================================
const ALL_STEPS = [
  'queue-stats',           // Songstats + Spotify + Bandsintown
  'enrich-multisource',    // MusicBrainz, TheAudioDB, Wikipedia, etc.
  'fetch-concerts',        // Bandsintown dedicated (if needed separately)
];

// =============================================================================
// Helper: Call another Edge Function
// =============================================================================
async function callEdgeFunction(
  functionName: string, 
  body: any,
  timeoutMs: number = 120000
): Promise<{ ok: boolean; data?: any; error?: string }> {
  const url = `${SUPABASE_URL}/functions/v1/${functionName}`;
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    const data = await res.json();
    
    if (!res.ok) {
      return { ok: false, error: data.error || `HTTP ${res.status}` };
    }
    
    return { ok: true, data };
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      return { ok: false, error: `Timeout after ${timeoutMs}ms` };
    }
    return { ok: false, error: err.message };
  }
}

// =============================================================================
// Step Runners
// =============================================================================
async function runQueueStats(artist_id: string, company_id: string): Promise<StepResult> {
  const start = Date.now();
  console.log(`[Orchestrator] Step 1: queue-stats for ${artist_id}`);
  
  // Queue the artist for enrichment and process immediately
  const { error: queueError } = await supabase
    .from('artist_enrich_queue')
    .upsert({
      artist_id,
      company_id,
      status: 'pending',
      priority: 'urgent',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'artist_id' });
  
  if (queueError) {
    return {
      step: 'queue-stats',
      success: false,
      duration_ms: Date.now() - start,
      error: queueError.message,
    };
  }
  
  // Call queue-stats to process
  const result = await callEdgeFunction('queue-stats', {
    company_id,
    batch_size: 1,
  });
  
  return {
    step: 'queue-stats',
    success: result.ok,
    duration_ms: Date.now() - start,
    data: result.data,
    error: result.error,
  };
}

async function runEnrichMultisource(artist_id: string): Promise<StepResult> {
  const start = Date.now();
  console.log(`[Orchestrator] Step 2: enrich-artist-multisource for ${artist_id}`);
  
  const result = await callEdgeFunction('enrich-artist-multisource', {
    artist_id,
  });
  
  return {
    step: 'enrich-multisource',
    success: result.ok,
    duration_ms: Date.now() - start,
    data: result.data,
    error: result.error,
  };
}

async function runFetchConcerts(artist_id: string): Promise<StepResult> {
  const start = Date.now();
  console.log(`[Orchestrator] Step 3: fetch-concerts for ${artist_id}`);
  
  const result = await callEdgeFunction('fetch-concerts', {
    artist_id,
  });
  
  return {
    step: 'fetch-concerts',
    success: result.ok,
    duration_ms: Date.now() - start,
    data: result.data,
    error: result.error,
  };
}

// =============================================================================
// Main Orchestration Logic
// =============================================================================
async function orchestrateEnrichment(
  artist_id: string,
  steps: string[],
  dry_run: boolean
): Promise<{ artist_id: string; results: StepResult[]; total_duration_ms: number }> {
  const startTotal = Date.now();
  const results: StepResult[] = [];
  
  // Get artist info
  const { data: artist } = await supabase
    .from('artists')
    .select('name, company_id')
    .eq('id', artist_id)
    .single();
  
  if (!artist) {
    return {
      artist_id,
      results: [{
        step: 'init',
        success: false,
        duration_ms: Date.now() - startTotal,
        error: 'Artist not found',
      }],
      total_duration_ms: Date.now() - startTotal,
    };
  }
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`[Orchestrator] Starting enrichment for: ${artist.name}`);
  console.log(`[Orchestrator] Steps: ${steps.join(' -> ')}`);
  console.log(`[Orchestrator] Dry run: ${dry_run}`);
  console.log(`${'='.repeat(60)}\n`);
  
  if (dry_run) {
    return {
      artist_id,
      results: steps.map(step => ({
        step,
        success: true,
        duration_ms: 0,
        data: { dry_run: true },
      })),
      total_duration_ms: Date.now() - startTotal,
    };
  }
  
  // Run each step in sequence
  for (const step of steps) {
    let stepResult: StepResult;
    
    switch (step) {
      case 'queue-stats':
        stepResult = await runQueueStats(artist_id, artist.company_id);
        break;
      case 'enrich-multisource':
        stepResult = await runEnrichMultisource(artist_id);
        break;
      case 'fetch-concerts':
        stepResult = await runFetchConcerts(artist_id);
        break;
      default:
        stepResult = {
          step,
          success: false,
          duration_ms: 0,
          error: `Unknown step: ${step}`,
        };
    }
    
    results.push(stepResult);
    console.log(`[Orchestrator] ${step}: ${stepResult.success ? 'SUCCESS' : 'FAILED'} (${stepResult.duration_ms}ms)`);
    
    // Small delay between steps
    await new Promise(r => setTimeout(r, 500));
  }
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`[Orchestrator] Completed: ${artist.name}`);
  console.log(`[Orchestrator] Results: ${results.filter(r => r.success).length}/${results.length} steps succeeded`);
  console.log(`${'='.repeat(60)}\n`);
  
  return {
    artist_id,
    results,
    total_duration_ms: Date.now() - startTotal,
  };
}

// =============================================================================
// HTTP Handler
// =============================================================================
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  
  try {
    const body: OrchestrationRequest = await req.json();
    const { artist_id, artist_ids, steps = ALL_STEPS, dry_run = false } = body;
    
    // Validate input
    const ids = artist_ids || (artist_id ? [artist_id] : []);
    if (ids.length === 0) {
      return new Response(
        JSON.stringify({ ok: false, error: 'artist_id or artist_ids required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Validate steps
    const validSteps = steps.filter(s => ALL_STEPS.includes(s));
    if (validSteps.length === 0) {
      return new Response(
        JSON.stringify({ ok: false, error: `Invalid steps. Valid: ${ALL_STEPS.join(', ')}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log(`[Orchestrator] Processing ${ids.length} artist(s) with steps: ${validSteps.join(', ')}`);
    
    // Process each artist
    const allResults = [];
    for (const id of ids) {
      const result = await orchestrateEnrichment(id, validSteps, dry_run);
      allResults.push(result);
    }
    
    // Summary
    const totalSuccess = allResults.filter(r => r.results.every(s => s.success)).length;
    const totalDuration = allResults.reduce((sum, r) => sum + r.total_duration_ms, 0);
    
    return new Response(
      JSON.stringify({
        ok: true,
        summary: {
          total_artists: ids.length,
          fully_successful: totalSuccess,
          total_duration_ms: totalDuration,
        },
        results: allResults,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (err: any) {
    console.error('[Orchestrator] Error:', err);
    return new Response(
      JSON.stringify({ ok: false, error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

