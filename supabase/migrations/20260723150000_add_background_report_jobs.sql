create table if not exists public.rankcues_report_jobs (
  id text primary key,
  workspace_id text not null references public.rankcues_workspaces(id) on delete cascade,
  site_id text not null references public.rankcues_sites(id) on delete cascade,
  output_locale text not null default 'en' check (output_locale in ('en', 'zh', 'es')),
  source text not null default 'manual' check (source in ('manual', 'weekly')),
  status text not null default 'queued' check (status in ('queued', 'processing', 'completed', 'failed')),
  request jsonb not null default '{}'::jsonb,
  report_id text references public.rankcues_weekly_reports(id) on delete set null,
  task_ids jsonb not null default '[]'::jsonb,
  error text,
  attempt_count integer not null default 0,
  available_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists rankcues_report_jobs_queue_idx
  on public.rankcues_report_jobs (status, available_at, created_at);

create unique index if not exists rankcues_report_jobs_one_active_site_idx
  on public.rankcues_report_jobs (workspace_id, site_id)
  where status in ('queued', 'processing');

alter table public.rankcues_report_jobs enable row level security;
revoke all on table public.rankcues_report_jobs from anon, authenticated;
