/**
 * MedVision Agent — Supabase connection test script.
 *
 * Run with:  npm run test:supabase
 *
 * Checks:
 *  1. Env vars are present
 *  2. Can connect to Supabase
 *  3. All 4 tables exist (cases, jobs, results, reports)
 *  4. Can insert a dummy case row
 *  5. Can fetch it back
 *  6. Cleans up (deletes the test row)
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

// ── Colours ──────────────────────────────────────────────────────────────────
const GREEN = '\x1b[32m';
const RED   = '\x1b[31m';
const CYAN  = '\x1b[36m';
const BOLD  = '\x1b[1m';
const RESET = '\x1b[0m';
const ok    = (msg: string) => console.log(`${GREEN}  ✅ ${msg}${RESET}`);
const fail  = (msg: string) => console.log(`${RED}  ❌ ${msg}${RESET}`);
const info  = (msg: string) => console.log(`${CYAN}  ℹ  ${msg}${RESET}`);
const head  = (msg: string) => console.log(`\n${BOLD}${msg}${RESET}`);

async function main(): Promise<void> {
  let errors = 0;

  // ── Step 1: Env vars ───────────────────────────────────────────────────────
  head('Step 1 — Environment variables');
  const SUPABASE_URL              = process.env.SUPABASE_URL?.trim();
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const SUPABASE_ANON_KEY         = process.env.SUPABASE_ANON_KEY?.trim();

  if (SUPABASE_URL) {
    ok(`SUPABASE_URL = ${SUPABASE_URL}`);
  } else {
    fail('SUPABASE_URL is not set in .env.local'); errors++;
  }
  if (SUPABASE_SERVICE_ROLE_KEY) {
    ok(`SUPABASE_SERVICE_ROLE_KEY = ${SUPABASE_SERVICE_ROLE_KEY.slice(0, 20)}…`);
  } else {
    fail('SUPABASE_SERVICE_ROLE_KEY is not set in .env.local'); errors++;
  }
  if (SUPABASE_ANON_KEY) {
    ok(`SUPABASE_ANON_KEY = ${SUPABASE_ANON_KEY.slice(0, 20)}…`);
  } else {
    info('SUPABASE_ANON_KEY not set (optional for now)');
  }

  if (errors > 0) {
    console.log(
      `\n${RED}${BOLD}Stopped: fill in SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY` +
      ` in web-app/.env.local first.${RESET}\n`,
    );
    process.exit(1);
  }

  // ── Step 2: Connect ────────────────────────────────────────────────────────
  head('Step 2 — Connecting to Supabase');
  const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  ok('Client created');

  // ── Step 3: Table existence ────────────────────────────────────────────────
  head('Step 3 — Checking tables exist');
  const TABLES = ['cases', 'jobs', 'results', 'reports'] as const;

  for (const table of TABLES) {
    const { error } = await supabase.from(table).select('id').limit(0);
    if (error) {
      fail(`Table "${table}" not found or inaccessible: ${error.message}`);
      errors++;
    } else {
      ok(`Table "${table}" exists`);
    }
  }

  if (errors > 0) {
    console.log(
      `\n${RED}${BOLD}Tables missing — did you run supabase/schema.sql in the SQL Editor?${RESET}\n`,
    );
    process.exit(1);
  }

  // ── Step 4: Insert test row ────────────────────────────────────────────────
  head('Step 4 — Insert test row into "cases"');
  const { data: inserted, error: insertErr } = await supabase
    .from('cases')
    .insert({
      status: 'completed',
      organ: 'brain',
      modality: 'MRI',
      routing_reason: '[MEDVISION CONNECTION TEST — SAFE TO DELETE]',
      payload: { __test: true, ts: new Date().toISOString() },
    })
    .select('id')
    .single();

  if (insertErr || !inserted?.id) {
    fail(`Insert failed: ${insertErr?.message ?? 'no id returned'}`); errors++;
  } else {
    ok(`Inserted test row with id = ${inserted.id}`);
  }

  const testId = inserted?.id as string | undefined;

  // ── Step 5: Fetch back ─────────────────────────────────────────────────────
  if (testId) {
    head('Step 5 — Fetch test row back');
    const { data: fetched, error: fetchErr } = await supabase
      .from('cases')
      .select('id, organ, routing_reason')
      .eq('id', testId)
      .single();

    if (fetchErr || !fetched) {
      fail(`Fetch failed: ${fetchErr?.message ?? 'row not found'}`); errors++;
    } else {
      ok(`Fetched: id=${fetched.id}, organ=${fetched.organ}`);
    }

    // ── Step 6: Cleanup ──────────────────────────────────────────────────────
    head('Step 6 — Cleanup (delete test row)');
    const { error: delErr } = await supabase.from('cases').delete().eq('id', testId);
    if (delErr) {
      fail(`Delete failed: ${delErr.message}`); errors++;
    } else {
      ok('Test row deleted — database is clean');
    }
  }

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log('');
  if (errors === 0) {
    console.log(`${GREEN}${BOLD}🎉  All checks passed! Supabase is ready.${RESET}`);
    console.log(`${CYAN}  Next: run  npm run dev  and open http://localhost:3000${RESET}\n`);
  } else {
    console.log(`${RED}${BOLD}❌  ${errors} check(s) failed. Fix the issues above and re-run.${RESET}\n`);
    process.exit(1);
  }
}

main().catch((err: unknown) => {
  console.error(`\n${RED}${BOLD}Unexpected error:${RESET}`, err);
  process.exit(1);
});
