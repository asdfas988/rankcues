import { getCloudflareContext } from "@opennextjs/cloudflare";
import postgres from "postgres";

type DatabaseClient = ReturnType<typeof postgres>;
type HyperdriveBinding = { connectionString: string };

let client: DatabaseClient | null = null;
let schemaPromise: Promise<void> | null = null;
const requestClients = new WeakMap<object, DatabaseClient>();

export class DatabaseNotConfiguredError extends Error {
  constructor() {
    super("DATABASE_URL is required for persistent RankCues data.");
    this.name = "DatabaseNotConfiguredError";
  }
}

export function isDatabaseConfigured() {
  return Boolean(process.env.DATABASE_URL);
}

export function getDatabase() {
  const hyperdrive = getHyperdriveBinding();
  if (hyperdrive) {
    const existing = requestClients.get(hyperdrive.requestContext);
    if (existing) return existing;

    const requestClient = postgres(hyperdrive.binding.connectionString, {
      max: 1,
      fetch_types: false,
      // The Worker talks to the local Hyperdrive proxy without TLS;
      // Hyperdrive encrypts the separate upstream connection to Supabase.
      ssl: false,
      // Keep statements unnamed so the same client is also safe if the
      // Hyperdrive origin is changed back to transaction-pool mode later.
      prepare: false,
      connect_timeout: 10,
    });
    requestClients.set(hyperdrive.requestContext, requestClient);
    return requestClient;
  }

  const directConnectionString = process.env.DATABASE_URL;
  if (!directConnectionString) throw new DatabaseNotConfiguredError();
  if (!client) {
    const ssl = process.env.DATABASE_SSL === "require" ? "require" : undefined;
    client = postgres(directConnectionString, {
      max: Number(process.env.DATABASE_POOL_SIZE || 4),
      prepare: false,
      connect_timeout: 10,
      ...(ssl ? { ssl } : {}),
    });
  }
  return client;
}

export async function ensureDatabaseSchema() {
  if (process.env.DATABASE_SCHEMA_MANAGED === "true") return;

  if (!schemaPromise) {
    schemaPromise = createSchema().catch((error) => {
      schemaPromise = null;
      throw error;
    });
  }

  return schemaPromise;
}

function getHyperdriveBinding() {
  try {
    const { env, ctx } = getCloudflareContext();
    const binding = (env as CloudflareEnv & { HYPERDRIVE?: HyperdriveBinding }).HYPERDRIVE;
    return binding ? { binding, requestContext: ctx as object } : null;
  } catch {
    return null;
  }
}

async function createSchema() {
  const sql = getDatabase();
  const defaultWorkspaceId = process.env.DEFAULT_WORKSPACE_ID || "default";

  await sql`
    create table if not exists rankcues_workspaces (
      id text primary key,
      name text not null,
      slug text not null unique,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `;

  await sql`
    insert into rankcues_workspaces (id, name, slug)
    values (${defaultWorkspaceId}, 'RankCues Workspace', ${defaultWorkspaceId})
    on conflict (id) do nothing
  `;

  await sql`
    create table if not exists rankcues_google_connections (
      id text primary key,
      workspace_id text not null,
      google_subject text not null,
      email text not null,
      access_token_cipher text not null,
      refresh_token_cipher text,
      expires_at timestamptz,
      scopes jsonb not null default '[]'::jsonb,
      status text not null default 'connected',
      last_error text,
      ga4_discovery_status text not null default 'not_checked',
      ga4_discovery_error_code text,
      ga4_discovery_error text,
      ga4_discovered_at timestamptz,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      unique (workspace_id, google_subject)
    )
  `;

  await sql`
    create table if not exists rankcues_sites (
      id text primary key,
      workspace_id text not null,
      connection_id text references rankcues_google_connections(id) on delete set null,
      site_url text not null,
      permission_level text not null default 'siteUnverifiedUser',
      active boolean not null default true,
      last_synced_at timestamptz,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      unique (workspace_id, site_url)
    )
  `;

  await sql`
    create table if not exists rankcues_gsc_metrics (
      site_id text not null references rankcues_sites(id) on delete cascade,
      metric_date date not null,
      page text not null,
      query text not null,
      device text not null,
      clicks double precision not null,
      impressions double precision not null,
      ctr double precision not null,
      position double precision not null,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      primary key (site_id, metric_date, page, query, device)
    )
  `;

  await sql`
    create index if not exists rankcues_gsc_metrics_site_date_idx
      on rankcues_gsc_metrics (site_id, metric_date desc)
  `;

  await sql`
    create index if not exists rankcues_gsc_metrics_site_query_date_idx
      on rankcues_gsc_metrics (
        site_id,
        lower(regexp_replace(btrim(query), '[[:space:]]+', ' ', 'g')),
        metric_date desc
      )
  `;

  await sql`
    create unique index if not exists rankcues_sites_workspace_id_idx
      on rankcues_sites (workspace_id, id)
  `;

  await sql`
    create table if not exists rankcues_search_term_baselines (
      workspace_id text not null references rankcues_workspaces(id) on delete cascade,
      site_id text primary key references rankcues_sites(id) on delete cascade,
      baseline_through date not null,
      last_processed_on date not null,
      last_data_complete boolean not null default true,
      initialized_at timestamptz not null default now(),
      last_refreshed_at timestamptz not null default now(),
      unique (workspace_id, site_id),
      foreign key (workspace_id, site_id)
        references rankcues_sites(workspace_id, id) on delete cascade
    )
  `;

  await sql`
    alter table rankcues_search_term_baselines
      add column if not exists last_data_complete boolean not null default true
  `;

  await sql`
    create table if not exists rankcues_search_term_lifecycle (
      workspace_id text not null references rankcues_workspaces(id) on delete cascade,
      site_id text not null references rankcues_sites(id) on delete cascade,
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
        references rankcues_sites(workspace_id, id) on delete cascade
    )
  `;

  await sql`
    create index if not exists rankcues_search_term_lifecycle_site_status_idx
      on rankcues_search_term_lifecycle (workspace_id, site_id, status, status_date desc)
  `;

  await sql`
    create index if not exists rankcues_search_term_lifecycle_site_last_seen_idx
      on rankcues_search_term_lifecycle (workspace_id, site_id, last_seen_on desc)
  `;

  await sql`
    create table if not exists rankcues_tracked_keywords (
      id text primary key,
      workspace_id text not null references rankcues_workspaces(id) on delete cascade,
      site_id text not null references rankcues_sites(id) on delete cascade,
      keyword text not null,
      device text not null default 'ALL',
      source text not null default 'manual',
      active boolean not null default true,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `;

  await sql`
    create unique index if not exists rankcues_tracked_keywords_identity_idx
      on rankcues_tracked_keywords (workspace_id, site_id, lower(keyword), device)
  `;

  await sql`
    create index if not exists rankcues_tracked_keywords_site_active_idx
      on rankcues_tracked_keywords (site_id, active, updated_at desc)
  `;

  await sql`
    create table if not exists rankcues_events (
      id text primary key,
      site_id text not null references rankcues_sites(id) on delete cascade,
      source text not null,
      kind text not null,
      occurred_at timestamptz not null,
      title text not null,
      description text not null,
      evidence_state text not null,
      impact text not null,
      metadata jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now()
    )
  `;

  await sql`
    create index if not exists rankcues_events_site_time_idx
      on rankcues_events (site_id, occurred_at desc)
  `;

  await sql`
    create table if not exists rankcues_page_snapshots (
      id text primary key,
      site_id text not null references rankcues_sites(id) on delete cascade,
      url text not null,
      captured_on date not null,
      status_code integer not null,
      title text not null,
      meta_description text not null,
      canonical text not null,
      h1 text not null,
      word_count integer not null,
      internal_links integer not null,
      content_hash text not null,
      created_at timestamptz not null default now(),
      unique (site_id, url, captured_on)
    )
  `;

  await sql`
    create index if not exists rankcues_page_snapshots_site_url_idx
      on rankcues_page_snapshots (site_id, url, captured_on desc)
  `;

  await sql`
    create table if not exists rankcues_sync_runs (
      id text primary key,
      site_id text references rankcues_sites(id) on delete cascade,
      source text not null,
      status text not null,
      rows_written integer not null default 0,
      details jsonb not null default '{}'::jsonb,
      error text,
      started_at timestamptz not null default now(),
      completed_at timestamptz
    )
  `;

  await sql`
    update rankcues_sync_runs
    set status = 'failed', error = coalesce(error, 'Run expired before completion.'), completed_at = now()
    where status = 'running' and started_at < now() - interval '30 minutes'
  `;

  await sql`
    create unique index if not exists rankcues_sync_runs_one_active_idx
      on rankcues_sync_runs (site_id, source)
      where status = 'running'
  `;

  await sql`
    create index if not exists rankcues_sync_runs_site_source_completed_idx
      on rankcues_sync_runs (site_id, source, completed_at desc)
      where status = 'completed'
  `;

  await sql`
    create table if not exists rankcues_gsc_date_coverage (
      workspace_id text not null references rankcues_workspaces(id) on delete cascade,
      site_id text not null references rankcues_sites(id) on delete cascade,
      coverage_date date not null,
      is_complete boolean not null,
      sync_run_id text,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      primary key (workspace_id, site_id, coverage_date),
      foreign key (workspace_id, site_id)
        references rankcues_sites(workspace_id, id) on delete cascade
    )
  `;

  await sql`
    create index if not exists rankcues_gsc_date_coverage_site_date_idx
      on rankcues_gsc_date_coverage (workspace_id, site_id, coverage_date desc)
  `;

  await sql`
    create table if not exists rankcues_action_windows (
      id text primary key,
      workspace_id text not null references rankcues_workspaces(id) on delete cascade,
      action text not null,
      window_key bigint not null,
      request_count integer not null default 1,
      expires_at timestamptz not null,
      updated_at timestamptz not null default now(),
      unique (workspace_id, action, window_key)
    )
  `;

  await sql`
    create index if not exists rankcues_action_windows_expiry_idx
      on rankcues_action_windows (expires_at)
  `;

  await sql`
    create table if not exists rankcues_weekly_reports (
      id text primary key,
      site_id text not null references rankcues_sites(id) on delete cascade,
      period_start date not null,
      period_end date not null,
      report jsonb not null,
      provider jsonb not null default '{}'::jsonb,
      usage jsonb not null default '{}'::jsonb,
      generated_at timestamptz not null default now(),
      unique (site_id, period_start, period_end)
    )
  `;

  await sql`
    create table if not exists rankcues_report_jobs (
      id text primary key,
      workspace_id text not null references rankcues_workspaces(id) on delete cascade,
      site_id text not null references rankcues_sites(id) on delete cascade,
      output_locale text not null default 'en' check (output_locale in ('en', 'zh', 'es')),
      source text not null default 'manual' check (source in ('manual', 'weekly')),
      status text not null default 'queued' check (status in ('queued', 'processing', 'completed', 'failed')),
      request jsonb not null default '{}'::jsonb,
      report_id text references rankcues_weekly_reports(id) on delete set null,
      task_ids jsonb not null default '[]'::jsonb,
      error text,
      attempt_count integer not null default 0,
      available_at timestamptz not null default now(),
      started_at timestamptz,
      completed_at timestamptz,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `;

  await sql`
    create index if not exists rankcues_report_jobs_queue_idx
      on rankcues_report_jobs (status, available_at, created_at)
  `;

  await sql`
    create unique index if not exists rankcues_report_jobs_one_active_site_idx
      on rankcues_report_jobs (workspace_id, site_id)
      where status in ('queued', 'processing')
  `;

  await sql`
    create table if not exists rankcues_ga4_properties (
      id text primary key,
      workspace_id text not null references rankcues_workspaces(id) on delete cascade,
      connection_id text not null references rankcues_google_connections(id) on delete cascade,
      site_id text references rankcues_sites(id) on delete set null,
      account_id text not null,
      property_id text not null,
      display_name text not null,
      currency_code text,
      time_zone text,
      active boolean not null default true,
      last_synced_at timestamptz,
      last_error text,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      unique (workspace_id, property_id)
    )
  `;

  await sql`
    create index if not exists rankcues_ga4_properties_site_idx
      on rankcues_ga4_properties (site_id, active)
  `;

  await sql`
    create table if not exists rankcues_ga4_metrics (
      property_id text not null references rankcues_ga4_properties(id) on delete cascade,
      metric_date date not null,
      landing_page text not null,
      source_medium text not null,
      sessions double precision not null default 0,
      active_users double precision not null default 0,
      new_users double precision not null default 0,
      key_events double precision not null default 0,
      engaged_sessions double precision not null default 0,
      engagement_rate double precision not null default 0,
      average_session_duration double precision not null default 0,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      primary key (property_id, metric_date, landing_page, source_medium)
    )
  `;

  await sql`
    create index if not exists rankcues_ga4_metrics_property_date_idx
      on rankcues_ga4_metrics (property_id, metric_date desc)
  `;

  await sql`
    create table if not exists rankcues_backlink_snapshots (
      id text primary key,
      site_id text not null references rankcues_sites(id) on delete cascade,
      captured_on date not null,
      backlinks integer not null default 0,
      referring_domains integer not null default 0,
      referring_pages integer not null default 0,
      dofollow integer not null default 0,
      new_backlinks integer not null default 0,
      lost_backlinks integer not null default 0,
      rank double precision,
      raw jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now(),
      unique (site_id, captured_on)
    )
  `;

  await sql`
    create table if not exists rankcues_backlinks (
      id text primary key,
      site_id text not null references rankcues_sites(id) on delete cascade,
      source_url text not null,
      source_domain text not null,
      target_url text not null,
      anchor text not null default '',
      dofollow boolean not null default false,
      source_rank double precision,
      first_seen timestamptz,
      last_seen timestamptz not null,
      lost_at timestamptz,
      status text not null default 'live',
      raw jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      unique (site_id, source_url, target_url)
    )
  `;

  await sql`
    create index if not exists rankcues_backlinks_site_status_idx
      on rankcues_backlinks (site_id, status, last_seen desc)
  `;

  await sql`
    create table if not exists rankcues_tasks (
      id text primary key,
      workspace_id text not null references rankcues_workspaces(id) on delete cascade,
      site_id text references rankcues_sites(id) on delete cascade,
      event_id text references rankcues_events(id) on delete set null,
      title text not null,
      description text not null default '',
      status text not null default 'open',
      priority text not null default 'medium',
      source text not null default 'manual',
      due_at timestamptz,
      completed_at timestamptz,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `;

  await sql`
    create index if not exists rankcues_tasks_workspace_status_idx
      on rankcues_tasks (workspace_id, status, priority, created_at desc)
  `;

  await sql`
    create table if not exists rankcues_workspace_members (
      id text primary key,
      workspace_id text not null references rankcues_workspaces(id) on delete cascade,
      email text not null,
      role text not null default 'owner',
      created_at timestamptz not null default now(),
      unique (workspace_id, email)
    )
  `;

  await sql`
    alter table rankcues_google_connections
      add column if not exists ga4_discovery_status text not null default 'not_checked',
      add column if not exists ga4_discovery_error_code text,
      add column if not exists ga4_discovery_error text,
      add column if not exists ga4_discovered_at timestamptz
  `;

  await sql`
    alter table rankcues_sites
      add column if not exists display_name text,
      add column if not exists monitor_enabled boolean not null default true,
      add column if not exists crawl_page_limit integer not null default 20,
      add column if not exists backlink_target text
  `;

  await sql`
    alter table rankcues_workspaces
      add column if not exists preferred_locale text not null default 'en'
  `;

  await sql`
    alter table rankcues_weekly_reports
      add column if not exists title text,
      add column if not exists status text not null default 'completed',
      add column if not exists updated_at timestamptz not null default now()
  `;

  await sql`
    alter table rankcues_tasks
      add column if not exists report_id text references rankcues_weekly_reports(id) on delete set null,
      add column if not exists finding_index integer,
      add column if not exists recommendation text not null default '',
      add column if not exists evidence jsonb not null default '{}'::jsonb,
      add column if not exists baseline jsonb not null default '{}'::jsonb,
      add column if not exists result jsonb not null default '{}'::jsonb,
      add column if not exists approval_status text not null default 'approved',
      add column if not exists measurement_status text not null default 'not_scheduled',
      add column if not exists verification_window_days integer not null default 28,
      add column if not exists verification_due_at timestamptz,
      add column if not exists verified_at timestamptz,
      add column if not exists outcome_summary text not null default ''
  `;

  await sql`
    create unique index if not exists rankcues_tasks_report_finding_idx
      on rankcues_tasks (report_id, finding_index)
      where report_id is not null and finding_index is not null
  `;

  await sql`
    create index if not exists rankcues_tasks_verification_due_idx
      on rankcues_tasks (measurement_status, verification_due_at)
  `;

  await sql`
    create table if not exists rankcues_task_measurements (
      id text primary key,
      task_id text not null references rankcues_tasks(id) on delete cascade,
      phase text not null,
      snapshot jsonb not null default '{}'::jsonb,
      measured_at timestamptz not null default now(),
      unique (task_id, phase)
    )
  `;

  await sql`
    create index if not exists rankcues_task_measurements_task_idx
      on rankcues_task_measurements (task_id, measured_at desc)
  `;

  await sql`
    create table if not exists rankcues_wordpress_connections (
      id text primary key,
      workspace_id text not null references rankcues_workspaces(id) on delete cascade,
      site_id text not null references rankcues_sites(id) on delete cascade,
      base_url text not null,
      username text not null,
      application_password_cipher text not null,
      remote_user_id bigint,
      remote_display_name text,
      capabilities jsonb not null default '{}'::jsonb,
      status text not null default 'connected',
      last_error text,
      last_verified_at timestamptz,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      unique (workspace_id, site_id)
    )
  `;

  await sql`
    create table if not exists rankcues_github_installations (
      id text primary key,
      workspace_id text not null references rankcues_workspaces(id) on delete cascade,
      installation_id bigint not null,
      account_login text not null,
      account_type text not null,
      account_avatar_url text,
      repository_selection text not null default 'selected',
      permissions jsonb not null default '{}'::jsonb,
      status text not null default 'connected',
      last_error text,
      last_verified_at timestamptz,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      unique (workspace_id, installation_id)
    )
  `;

  await sql`
    create table if not exists rankcues_github_repositories (
      id text primary key,
      workspace_id text not null references rankcues_workspaces(id) on delete cascade,
      installation_id text not null references rankcues_github_installations(id) on delete cascade,
      site_id text references rankcues_sites(id) on delete set null,
      repository_id bigint not null,
      full_name text not null,
      default_branch text not null,
      private boolean not null default false,
      html_url text not null,
      active boolean not null default true,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      unique (workspace_id, repository_id)
    )
  `;

  await sql`
    create unique index if not exists rankcues_github_repositories_site_idx
      on rankcues_github_repositories (workspace_id, site_id)
      where site_id is not null
  `;

  await sql`
    create table if not exists rankcues_task_executions (
      id text primary key,
      workspace_id text not null references rankcues_workspaces(id) on delete cascade,
      task_id text not null references rankcues_tasks(id) on delete cascade,
      connector text not null check (connector in ('wordpress', 'github')),
      status text not null default 'preparing' check (
        status in ('preparing', 'preview_ready', 'executing', 'draft_created', 'pr_created', 'failed', 'reverted')
      ),
      risk text not null default 'medium' check (risk in ('low', 'medium', 'high')),
      plan jsonb not null default '{}'::jsonb,
      before_snapshot jsonb not null default '{}'::jsonb,
      after_snapshot jsonb not null default '{}'::jsonb,
      external_id text,
      external_url text,
      error text,
      approved_at timestamptz,
      executed_at timestamptz,
      reverted_at timestamptz,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `;

  await sql`
    create index if not exists rankcues_task_executions_task_idx
      on rankcues_task_executions (task_id, created_at desc)
  `;

  await sql`
    do $$
    declare table_name text;
    begin
      foreach table_name in array array[
        'rankcues_workspaces', 'rankcues_workspace_members', 'rankcues_action_windows',
        'rankcues_google_connections', 'rankcues_sites', 'rankcues_gsc_metrics',
        'rankcues_search_term_baselines', 'rankcues_search_term_lifecycle',
        'rankcues_gsc_date_coverage',
        'rankcues_events', 'rankcues_page_snapshots', 'rankcues_sync_runs',
        'rankcues_weekly_reports', 'rankcues_report_jobs', 'rankcues_ga4_properties',
        'rankcues_ga4_metrics', 'rankcues_backlink_snapshots',
        'rankcues_backlinks', 'rankcues_tasks', 'rankcues_task_measurements',
        'rankcues_tracked_keywords', 'rankcues_wordpress_connections',
        'rankcues_github_installations', 'rankcues_github_repositories',
        'rankcues_task_executions'
      ] loop
        execute format('alter table public.%I enable row level security', table_name);
        execute format('revoke all on table public.%I from anon, authenticated', table_name);
      end loop;
    end $$
  `;
}
