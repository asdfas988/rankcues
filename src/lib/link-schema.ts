import { ensureDatabaseSchema, getDatabase, isDatabaseConfigured } from "@/lib/database";

let linkSchemaPromise: Promise<void> | null = null;

const linkSchemaSql = `
create table if not exists rankcues_link_targets (
  id text primary key, slug text not null unique, name text not null,
  homepage_url text not null, submission_url text not null, policy_url text,
  submission_mode text not null default 'manual' check (submission_mode in ('manual','official_api')),
  connector_key text, policy_status text not null default 'pending' check (policy_status in ('pending','approved','blocked')),
  automation_allowed boolean not null default false, supports_idempotency boolean not null default false,
  active boolean not null default true, config jsonb not null default '{}'::jsonb,
  reviewed_by_email text, reviewed_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check (automation_allowed = false or (submission_mode = 'official_api' and policy_status = 'approved' and connector_key is not null))
);
create table if not exists rankcues_link_workspace_settings (
  workspace_id text primary key references rankcues_workspaces(id) on delete cascade,
  enabled boolean not null default false,
  daily_submission_limit integer not null default 10 check (daily_submission_limit between 1 and 30),
  enabled_by_email text, enabled_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists rankcues_link_connections (
  id text primary key, workspace_id text not null references rankcues_workspaces(id) on delete cascade,
  target_id text not null references rankcues_link_targets(id) on delete cascade,
  auth_type text not null check (auth_type in ('oauth','api_key','remote_executor')),
  credentials_cipher text, account_label text not null default '', scopes jsonb not null default '[]'::jsonb,
  status text not null default 'connected' check (status in ('connected','needs_reauth','error','revoked')),
  expires_at timestamptz, last_verified_at timestamptz, last_error text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (workspace_id, target_id)
);
create table if not exists rankcues_link_campaigns (
  id text primary key, workspace_id text not null references rankcues_workspaces(id) on delete cascade,
  site_id text not null references rankcues_sites(id) on delete cascade, name text not null,
  status text not null default 'draft' check (status in ('draft','active','paused','completed')),
  discovery_limit integer not null default 100 check (discovery_limit between 30 and 300),
  target_url text not null, profile jsonb not null default '{}'::jsonb,
  approved_by_email text, approved_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists rankcues_link_campaigns_workspace_site_idx on rankcues_link_campaigns (workspace_id, site_id, created_at desc);
create table if not exists rankcues_link_opportunities (
  id text primary key, workspace_id text not null references rankcues_workspaces(id) on delete cascade,
  campaign_id text not null references rankcues_link_campaigns(id) on delete cascade,
  site_id text not null references rankcues_sites(id) on delete cascade,
  target_id text references rankcues_link_targets(id) on delete set null,
  source text not null check (source in ('manual_import','dataforseo_gap','lost_link','partner')),
  category text not null default 'editorial' check (category in ('directory','resource_page','unlinked_mention','lost_link','partner','editorial')),
  destination_name text not null, destination_domain text not null, source_url text not null,
  submission_url text, target_url text not null,
  relevance_score integer not null default 50 check (relevance_score between 0 and 100),
  authority_score double precision, spam_score double precision, rationale text not null default '',
  risk text not null default 'medium' check (risk in ('low','medium','high','blocked')),
  status text not null default 'discovered' check (status in ('discovered','approved','submitted','pending_review','published','verified','needs_action','rejected','removed')),
  submission_mode text not null default 'manual' check (submission_mode in ('manual','official_api')),
  permission_state text not null default 'unknown' check (permission_state in ('unknown','verified','denied')),
  policy_evidence_url text, connector_key text, public_listing_url text, last_error text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (workspace_id, campaign_id, source_url, target_url)
);
create index if not exists rankcues_link_opportunities_campaign_status_idx on rankcues_link_opportunities (workspace_id, campaign_id, status, relevance_score desc);
create table if not exists rankcues_link_submissions (
  id text primary key, workspace_id text not null references rankcues_workspaces(id) on delete cascade,
  campaign_id text not null references rankcues_link_campaigns(id) on delete cascade,
  opportunity_id text not null references rankcues_link_opportunities(id) on delete cascade,
  site_id text not null references rankcues_sites(id) on delete cascade,
  status text not null default 'approved' check (status in ('approved','submitted','pending_review','published','verified','needs_action','rejected','removed')),
  submission_mode text not null check (submission_mode in ('manual','official_api')),
  connector_key text, idempotency_key text not null, payload jsonb not null default '{}'::jsonb,
  payload_hash text not null, approved_payload_hash text not null, approval_version integer not null default 1,
  created_by_email text not null, approved_by_email text not null, approved_at timestamptz not null default now(),
  remote_submission_id text, public_url text, submitted_at timestamptz, pending_review_at timestamptz,
  published_at timestamptz, verified_at timestamptz, removed_at timestamptz, next_verify_at timestamptz,
  verification_failures integer not null default 0, last_checked_at timestamptz,
  last_error_code text, last_error text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (workspace_id, opportunity_id), unique (workspace_id, idempotency_key)
);
create index if not exists rankcues_link_submissions_verify_idx on rankcues_link_submissions (status, next_verify_at) where next_verify_at is not null;
create table if not exists rankcues_link_jobs (
  id text primary key, workspace_id text not null references rankcues_workspaces(id) on delete cascade,
  submission_id text not null references rankcues_link_submissions(id) on delete cascade,
  kind text not null check (kind in ('submit','verify')),
  status text not null default 'queued' check (status in ('queued','processing','succeeded','failed','cancelled')),
  dedupe_key text not null, request_hash text not null, approval_version integer not null,
  request jsonb not null default '{}'::jsonb, result jsonb not null default '{}'::jsonb,
  attempt_count integer not null default 0, max_attempts integer not null default 3 check (max_attempts between 1 and 5),
  available_at timestamptz not null default now(), lease_token text, leased_by text, lease_expires_at timestamptz,
  remote_idempotency_key text, write_started_at timestamptz, error_class text, error text,
  started_at timestamptz, completed_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (workspace_id, dedupe_key)
);
create unique index if not exists rankcues_link_jobs_one_active_idx on rankcues_link_jobs (submission_id, kind) where status in ('queued','processing');
create index if not exists rankcues_link_jobs_queue_idx on rankcues_link_jobs (status, available_at, created_at);
create table if not exists rankcues_link_verifications (
  id text primary key, workspace_id text not null references rankcues_workspaces(id) on delete cascade,
  submission_id text not null references rankcues_link_submissions(id) on delete cascade,
  status text not null check (status in ('verified','missing','blocked','error')),
  page_url text not null, target_url text not null, http_status integer, indexable boolean,
  link_rel jsonb not null default '[]'::jsonb, evidence jsonb not null default '{}'::jsonb,
  checked_at timestamptz not null default now()
);
create index if not exists rankcues_link_verifications_submission_idx on rankcues_link_verifications (submission_id, checked_at desc);
create table if not exists rankcues_link_events (
  id text primary key, workspace_id text not null references rankcues_workspaces(id) on delete cascade,
  campaign_id text not null references rankcues_link_campaigns(id) on delete cascade,
  opportunity_id text references rankcues_link_opportunities(id) on delete set null,
  submission_id text references rankcues_link_submissions(id) on delete set null,
  job_id text references rankcues_link_jobs(id) on delete set null,
  actor_type text not null check (actor_type in ('user','worker','system')), actor_email text,
  event_type text not null, from_status text, to_status text, metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists rankcues_link_events_campaign_idx on rankcues_link_events (workspace_id, campaign_id, created_at desc);
create unique index if not exists rankcues_sites_workspace_id_idx on rankcues_sites (workspace_id, id);
create unique index if not exists rankcues_link_campaigns_workspace_id_idx on rankcues_link_campaigns (workspace_id, id);
create unique index if not exists rankcues_link_opportunities_workspace_id_idx on rankcues_link_opportunities (workspace_id, id);
create unique index if not exists rankcues_link_submissions_workspace_id_idx on rankcues_link_submissions (workspace_id, id);
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'rankcues_link_campaigns_workspace_site_fk') then
    alter table rankcues_link_campaigns add constraint rankcues_link_campaigns_workspace_site_fk foreign key (workspace_id, site_id) references rankcues_sites(workspace_id, id) on delete cascade;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'rankcues_link_opportunities_workspace_campaign_fk') then
    alter table rankcues_link_opportunities add constraint rankcues_link_opportunities_workspace_campaign_fk foreign key (workspace_id, campaign_id) references rankcues_link_campaigns(workspace_id, id) on delete cascade;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'rankcues_link_opportunities_workspace_site_fk') then
    alter table rankcues_link_opportunities add constraint rankcues_link_opportunities_workspace_site_fk foreign key (workspace_id, site_id) references rankcues_sites(workspace_id, id) on delete cascade;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'rankcues_link_submissions_workspace_campaign_fk') then
    alter table rankcues_link_submissions add constraint rankcues_link_submissions_workspace_campaign_fk foreign key (workspace_id, campaign_id) references rankcues_link_campaigns(workspace_id, id) on delete cascade;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'rankcues_link_submissions_workspace_opportunity_fk') then
    alter table rankcues_link_submissions add constraint rankcues_link_submissions_workspace_opportunity_fk foreign key (workspace_id, opportunity_id) references rankcues_link_opportunities(workspace_id, id) on delete cascade;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'rankcues_link_submissions_workspace_site_fk') then
    alter table rankcues_link_submissions add constraint rankcues_link_submissions_workspace_site_fk foreign key (workspace_id, site_id) references rankcues_sites(workspace_id, id) on delete cascade;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'rankcues_link_jobs_workspace_submission_fk') then
    alter table rankcues_link_jobs add constraint rankcues_link_jobs_workspace_submission_fk foreign key (workspace_id, submission_id) references rankcues_link_submissions(workspace_id, id) on delete cascade;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'rankcues_link_verifications_workspace_submission_fk') then
    alter table rankcues_link_verifications add constraint rankcues_link_verifications_workspace_submission_fk foreign key (workspace_id, submission_id) references rankcues_link_submissions(workspace_id, id) on delete cascade;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'rankcues_link_events_workspace_campaign_fk') then
    alter table rankcues_link_events add constraint rankcues_link_events_workspace_campaign_fk foreign key (workspace_id, campaign_id) references rankcues_link_campaigns(workspace_id, id) on delete cascade;
  end if;
end $$;
alter table rankcues_link_targets enable row level security;
alter table rankcues_link_workspace_settings enable row level security;
alter table rankcues_link_connections enable row level security;
alter table rankcues_link_campaigns enable row level security;
alter table rankcues_link_opportunities enable row level security;
alter table rankcues_link_submissions enable row level security;
alter table rankcues_link_jobs enable row level security;
alter table rankcues_link_verifications enable row level security;
alter table rankcues_link_events enable row level security;
revoke all on table rankcues_link_targets from anon, authenticated;
revoke all on table rankcues_link_workspace_settings from anon, authenticated;
revoke all on table rankcues_link_connections from anon, authenticated;
revoke all on table rankcues_link_campaigns from anon, authenticated;
revoke all on table rankcues_link_opportunities from anon, authenticated;
revoke all on table rankcues_link_submissions from anon, authenticated;
revoke all on table rankcues_link_jobs from anon, authenticated;
revoke all on table rankcues_link_verifications from anon, authenticated;
revoke all on table rankcues_link_events from anon, authenticated;
`;

async function bootstrapApprovedWorkspaceSetting() {
  if (process.env.LINK_CAMPAIGNS_DEFAULT_ENABLED !== "true") return;
  const workspaceId = process.env.DEFAULT_WORKSPACE_ID || "default";
  const sql = getDatabase();
  await sql`
    insert into rankcues_link_workspace_settings (
      workspace_id, enabled, enabled_by_email, enabled_at
    )
    select id, true, 'system:link-campaign-bootstrap', now()
    from rankcues_workspaces where id = ${workspaceId}
    on conflict (workspace_id) do nothing
  `;
}

export async function ensureLinkCampaignSchema() {
  if (!isDatabaseConfigured()) throw new Error("DATABASE_URL is required for link campaigns.");
  await ensureDatabaseSchema();
  if (!linkSchemaPromise) {
    linkSchemaPromise = (async () => {
      const sql = getDatabase();
      const [readiness] = await sql`
        select
          to_regclass('public.rankcues_link_targets') as targets,
          to_regclass('public.rankcues_link_workspace_settings') as settings,
          to_regclass('public.rankcues_link_connections') as connections,
          to_regclass('public.rankcues_link_campaigns') as campaigns,
          to_regclass('public.rankcues_link_opportunities') as opportunities,
          to_regclass('public.rankcues_link_submissions') as submissions,
          to_regclass('public.rankcues_link_jobs') as jobs,
          to_regclass('public.rankcues_link_verifications') as verifications,
          to_regclass('public.rankcues_link_events') as events,
          (select count(*) = 9 from pg_constraint where conname = any(array[
            'rankcues_link_campaigns_workspace_site_fk',
            'rankcues_link_opportunities_workspace_campaign_fk',
            'rankcues_link_opportunities_workspace_site_fk',
            'rankcues_link_submissions_workspace_campaign_fk',
            'rankcues_link_submissions_workspace_opportunity_fk',
            'rankcues_link_submissions_workspace_site_fk',
            'rankcues_link_jobs_workspace_submission_fk',
            'rankcues_link_verifications_workspace_submission_fk',
            'rankcues_link_events_workspace_campaign_fk'
          ])) as tenant_constraints
      `;
      const ready = readiness && Object.values(readiness).every(Boolean);
      if (ready) {
        await bootstrapApprovedWorkspaceSetting();
        return;
      }
      if (process.env.LINK_CAMPAIGNS_AUTO_MIGRATE !== "true") {
        throw new Error("Link campaign schema is not installed. Apply the controlled link campaigns migration.");
      }
      await sql.unsafe(linkSchemaSql);
      const [verified] = await sql`
        select
          to_regclass('public.rankcues_link_targets') as targets,
          to_regclass('public.rankcues_link_workspace_settings') as settings,
          to_regclass('public.rankcues_link_connections') as connections,
          to_regclass('public.rankcues_link_campaigns') as campaigns,
          to_regclass('public.rankcues_link_opportunities') as opportunities,
          to_regclass('public.rankcues_link_submissions') as submissions,
          to_regclass('public.rankcues_link_jobs') as jobs,
          to_regclass('public.rankcues_link_verifications') as verifications,
          to_regclass('public.rankcues_link_events') as events,
          (select count(*) = 9 from pg_constraint where conname = any(array[
            'rankcues_link_campaigns_workspace_site_fk',
            'rankcues_link_opportunities_workspace_campaign_fk',
            'rankcues_link_opportunities_workspace_site_fk',
            'rankcues_link_submissions_workspace_campaign_fk',
            'rankcues_link_submissions_workspace_opportunity_fk',
            'rankcues_link_submissions_workspace_site_fk',
            'rankcues_link_jobs_workspace_submission_fk',
            'rankcues_link_verifications_workspace_submission_fk',
            'rankcues_link_events_workspace_campaign_fk'
          ])) as tenant_constraints
      `;
      if (!verified || !Object.values(verified).every(Boolean)) {
        throw new Error("Link campaign schema migration did not create every required table.");
      }
      await bootstrapApprovedWorkspaceSetting();
    })().catch((error) => {
      linkSchemaPromise = null;
      throw error;
    });
  }
  return linkSchemaPromise;
}
