create unique index if not exists rankcues_sites_workspace_id_idx
  on public.rankcues_sites (workspace_id, id);

create index if not exists rankcues_gsc_metrics_site_query_date_idx
  on public.rankcues_gsc_metrics (
    site_id,
    lower(regexp_replace(btrim(query), '[[:space:]]+', ' ', 'g')),
    metric_date desc
  );

create index if not exists rankcues_sync_runs_site_source_completed_idx
  on public.rankcues_sync_runs (site_id, source, completed_at desc)
  where status = 'completed';

create table if not exists public.rankcues_search_term_baselines (
  workspace_id text not null references public.rankcues_workspaces(id) on delete cascade,
  site_id text primary key references public.rankcues_sites(id) on delete cascade,
  baseline_through date not null,
  last_processed_on date not null,
  last_data_complete boolean not null default true,
  initialized_at timestamptz not null default now(),
  last_refreshed_at timestamptz not null default now(),
  unique (workspace_id, site_id),
  foreign key (workspace_id, site_id)
    references public.rankcues_sites(workspace_id, id) on delete cascade
);

alter table public.rankcues_search_term_baselines
  add column if not exists last_data_complete boolean not null default true;

create table if not exists public.rankcues_search_term_lifecycle (
  workspace_id text not null references public.rankcues_workspaces(id) on delete cascade,
  site_id text not null references public.rankcues_sites(id) on delete cascade,
  normalized_query text not null,
  query text not null,
  first_seen_on date not null,
  last_seen_on date not null,
  previous_seen_on date,
  observed_days integer not null check (observed_days > 0),
  status text not null check (status in ('baseline', 'new', 'returning', 'growing', 'active', 'lost')),
  status_date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (workspace_id, site_id, normalized_query),
  foreign key (workspace_id, site_id)
    references public.rankcues_sites(workspace_id, id) on delete cascade
);

create index if not exists rankcues_search_term_lifecycle_site_status_idx
  on public.rankcues_search_term_lifecycle (workspace_id, site_id, status, status_date desc);

create index if not exists rankcues_search_term_lifecycle_site_last_seen_idx
  on public.rankcues_search_term_lifecycle (workspace_id, site_id, last_seen_on desc);

create table if not exists public.rankcues_gsc_date_coverage (
  workspace_id text not null references public.rankcues_workspaces(id) on delete cascade,
  site_id text not null references public.rankcues_sites(id) on delete cascade,
  coverage_date date not null,
  is_complete boolean not null,
  sync_run_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (workspace_id, site_id, coverage_date),
  foreign key (workspace_id, site_id)
    references public.rankcues_sites(workspace_id, id) on delete cascade
);

create index if not exists rankcues_gsc_date_coverage_site_date_idx
  on public.rankcues_gsc_date_coverage (workspace_id, site_id, coverage_date desc);

-- Existing GSC history is the initial baseline. Fixing the cutoff at the
-- current maximum date means deployment never reports the imported history as
-- newly discovered terms.
insert into public.rankcues_search_term_baselines (
  workspace_id, site_id, baseline_through, last_processed_on
)
select s.workspace_id, s.id, max(m.metric_date), max(m.metric_date)
from public.rankcues_sites s
join public.rankcues_gsc_metrics m on m.site_id = s.id
group by s.workspace_id, s.id
on conflict (site_id) do nothing;

with daily_queries as (
  select
    s.workspace_id,
    m.site_id,
    lower(regexp_replace(btrim(m.query), '[[:space:]]+', ' ', 'g')) as normalized_query,
    min(regexp_replace(btrim(m.query), '[[:space:]]+', ' ', 'g')) as query,
    m.metric_date
  from public.rankcues_gsc_metrics m
  join public.rankcues_sites s on s.id = m.site_id
  where btrim(m.query) <> ''
  group by s.workspace_id, m.site_id, normalized_query, m.metric_date
), ranked as (
  select
    *,
    row_number() over (
      partition by workspace_id, site_id, normalized_query
      order by metric_date desc
    ) as recency
  from daily_queries
), rollup as (
  select
    workspace_id,
    site_id,
    normalized_query,
    min(query) filter (where recency = 1) as query,
    min(metric_date) as first_seen_on,
    max(metric_date) as last_seen_on,
    max(metric_date) filter (where recency = 2) as previous_seen_on,
    count(*)::integer as observed_days
  from ranked
  group by workspace_id, site_id, normalized_query
)
insert into public.rankcues_search_term_lifecycle (
  workspace_id, site_id, normalized_query, query, first_seen_on,
  last_seen_on, previous_seen_on, observed_days, status, status_date
)
select
  r.workspace_id,
  r.site_id,
  r.normalized_query,
  r.query,
  r.first_seen_on,
  r.last_seen_on,
  r.previous_seen_on,
  r.observed_days,
  'baseline',
  b.baseline_through
from rollup r
join public.rankcues_search_term_baselines b
  on b.workspace_id = r.workspace_id and b.site_id = r.site_id
on conflict (workspace_id, site_id, normalized_query) do nothing;

-- Recover the strongest safe daily coverage signal from prior completed runs.
-- Legacy truncated history runs are deliberately recorded as incomplete; only
-- newer runs with an explicit daily snapshot may prove their end date complete.
with valid_runs as (
  select
    run.id,
    run.site_id,
    site.workspace_id,
    (run.details->>'startDate')::date as start_date,
    (run.details->>'endDate')::date as end_date,
    coalesce(
      nullif(run.details->>'historyTruncated', '')::boolean,
      nullif(run.details->>'truncated', '')::boolean,
      false
    ) as history_truncated,
    run.details ? 'dailyTruncated' as has_daily_snapshot,
    coalesce(nullif(run.details->>'dailyTruncated', '')::boolean, true) as daily_truncated
  from public.rankcues_sync_runs run
  join public.rankcues_sites site on site.id = run.site_id
  where run.source = 'gsc'
    and run.status = 'completed'
    and run.details->>'startDate' ~ '^\d{4}-\d{2}-\d{2}$'
    and run.details->>'endDate' ~ '^\d{4}-\d{2}-\d{2}$'
), expanded as (
  select
    run.workspace_id,
    run.site_id,
    day::date as coverage_date,
    case
      when not run.history_truncated then true
      when day::date = run.end_date and run.has_daily_snapshot then not run.daily_truncated
      else false
    end as is_complete,
    run.id as sync_run_id
  from valid_runs run
  cross join lateral generate_series(
    run.start_date::timestamp,
    run.end_date::timestamp,
    interval '1 day'
  ) day
  where run.end_date >= run.start_date
    and run.end_date - run.start_date <= 120
), consolidated as (
  select
    workspace_id,
    site_id,
    coverage_date,
    bool_or(is_complete) as is_complete,
    coalesce(
      max(sync_run_id) filter (where is_complete),
      max(sync_run_id)
    ) as sync_run_id
  from expanded
  group by workspace_id, site_id, coverage_date
)
insert into public.rankcues_gsc_date_coverage (
  workspace_id, site_id, coverage_date, is_complete, sync_run_id
)
select workspace_id, site_id, coverage_date, is_complete, sync_run_id
from consolidated
on conflict (workspace_id, site_id, coverage_date) do update set
  is_complete = rankcues_gsc_date_coverage.is_complete or excluded.is_complete,
  sync_run_id = case
    when excluded.is_complete then excluded.sync_run_id
    else coalesce(rankcues_gsc_date_coverage.sync_run_id, excluded.sync_run_id)
  end,
  updated_at = now();

alter table public.rankcues_search_term_baselines enable row level security;
alter table public.rankcues_search_term_lifecycle enable row level security;
alter table public.rankcues_gsc_date_coverage enable row level security;

revoke all on table public.rankcues_search_term_baselines from anon, authenticated;
revoke all on table public.rankcues_search_term_lifecycle from anon, authenticated;
revoke all on table public.rankcues_gsc_date_coverage from anon, authenticated;
