create table if not exists public.rankcues_wordpress_connections (
  id text primary key,
  workspace_id text not null references public.rankcues_workspaces(id) on delete cascade,
  site_id text not null references public.rankcues_sites(id) on delete cascade,
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
);

create table if not exists public.rankcues_github_installations (
  id text primary key,
  workspace_id text not null references public.rankcues_workspaces(id) on delete cascade,
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
);

create table if not exists public.rankcues_github_repositories (
  id text primary key,
  workspace_id text not null references public.rankcues_workspaces(id) on delete cascade,
  installation_id text not null references public.rankcues_github_installations(id) on delete cascade,
  site_id text references public.rankcues_sites(id) on delete set null,
  repository_id bigint not null,
  full_name text not null,
  default_branch text not null,
  private boolean not null default false,
  html_url text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, repository_id)
);

create unique index if not exists rankcues_github_repositories_site_idx
  on public.rankcues_github_repositories (workspace_id, site_id)
  where site_id is not null;

create table if not exists public.rankcues_task_executions (
  id text primary key,
  workspace_id text not null references public.rankcues_workspaces(id) on delete cascade,
  task_id text not null references public.rankcues_tasks(id) on delete cascade,
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
);

create index if not exists rankcues_task_executions_task_idx
  on public.rankcues_task_executions (task_id, created_at desc);

alter table public.rankcues_wordpress_connections enable row level security;
alter table public.rankcues_github_installations enable row level security;
alter table public.rankcues_github_repositories enable row level security;
alter table public.rankcues_task_executions enable row level security;

revoke all on table public.rankcues_wordpress_connections from anon, authenticated;
revoke all on table public.rankcues_github_installations from anon, authenticated;
revoke all on table public.rankcues_github_repositories from anon, authenticated;
revoke all on table public.rankcues_task_executions from anon, authenticated;
