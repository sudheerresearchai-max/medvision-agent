-- ============================================================================
-- MedVision Agent — Supabase schema (OPTIONAL persistence layer)
--
-- Research prototype only — NOT approved for clinical diagnosis.
-- Do NOT store protected health information (PHI) in these tables.
--
-- Apply in Supabase Dashboard → SQL Editor.
-- Tables: cases, jobs, results, reports
-- ============================================================================

create extension if not exists "pgcrypto"; -- gen_random_uuid()

-- ----------------------------------------------------------------------------
-- cases: one row per analysis request
-- ----------------------------------------------------------------------------
create table if not exists cases (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  status          text not null default 'completed'
                    check (status in ('pending','running','completed','failed')),
  organ           text check (organ in ('brain','lung','pancreas')),
  modality        text check (modality in ('MRI','CT','PET','unknown')),
  routing_reason  text,
  clinical_text   text,             -- user-supplied notes (keep de-identified!)
  pdf_text        text,             -- extracted report text (de-identified!)
  clinical_info   jsonb,            -- structured extraction output
  warnings        jsonb,            -- safety/context warnings array
  trace           jsonb,            -- full agent step trace
  payload         jsonb,            -- full AnalysisResult snapshot (demo convenience)
  deid_label      text              -- optional caller-side pseudonymous label
);

create index if not exists cases_created_at_idx on cases (created_at desc);
create index if not exists cases_organ_idx on cases (organ);

-- ----------------------------------------------------------------------------
-- jobs: orchestration runs (one case usually has one job in this MVP)
-- ----------------------------------------------------------------------------
create table if not exists jobs (
  id          uuid primary key default gen_random_uuid(),
  case_id     uuid not null references cases(id) on delete cascade,
  state       text not null default 'queued'
                check (state in ('queued','running','succeeded','failed','cancelled')),
  engine      text not null default 'vercel-agent',
  error       text,
  started_at  timestamptz,
  finished_at timestamptz,
  created_at  timestamptz not null default now()
);

create index if not exists jobs_case_idx on jobs (case_id);

-- ----------------------------------------------------------------------------
-- results: model inference outputs
-- ----------------------------------------------------------------------------
create table if not exists results (
  id              uuid primary key default gen_random_uuid(),
  case_id         uuid not null references cases(id) on delete cascade,
  model_key       text not null,            -- brain | lung | pancreas
  model_file      text,                     -- e.g. lung_unet.onnx
  engine          text not null default 'onnx',  -- onnx | mock
  confidence      numeric(5,4),             -- PLACEHOLDER value, uncalibrated
  width_px        integer,
  height_px       integer,
  area_px         integer,
  area_fraction   numeric(8,6),
  bbox_x          integer,
  bbox_y          integer,
  bbox_w          integer,
  bbox_h          integer,
  centroid_x      numeric(8,2),
  centroid_y      numeric(8,2),
  eq_diameter_px  numeric(10,2),
  mask_png_base64 text,                     -- RGBA red-on-transparent mask
  overlay_b64     text,
  metrics_json    jsonb,
  created_at      timestamptz not null default now()
);

create index if not exists results_case_idx on results (case_id);

-- ----------------------------------------------------------------------------
-- reports: generated structured reports (versioned)
-- ----------------------------------------------------------------------------
create table if not exists reports (
  id          uuid primary key default gen_random_uuid(),
  case_id     uuid not null references cases(id) on delete cascade,
  version     integer not null default 1,
  format      text not null default 'markdown' check (format in ('markdown','json','text')),
  content     text not null,
  created_at  timestamptz not null default now(),
  unique (case_id, version)
);

create index if not exists reports_case_idx on reports (case_id);

-- ----------------------------------------------------------------------------
-- Row Level Security
-- The web app uses the SERVICE ROLE key server-side only (bypasses RLS).
-- RLS is enabled with NO policies => anonymous/authenticated clients via the
-- anon key can read/write nothing. Deliberately conservative for a demo.
-- ----------------------------------------------------------------------------
alter table cases   enable row level security;
alter table jobs    enable row level security;
alter table results enable row level security;
alter table reports enable row level security;

-- No policies are created on purpose. If you later want authenticated users to
-- read their own cases, add something like:
--
-- create policy "own cases read"
--   on cases for select to authenticated
--   using (deid_label = auth.jwt() ->> 'sub');
