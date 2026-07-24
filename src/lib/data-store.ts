import { createHash, randomUUID } from "node:crypto";
import { ensureDatabaseSchema, getDatabase, isDatabaseConfigured } from "@/lib/database";
import { decryptSecret, encryptSecret, isEncryptionConfigured } from "@/lib/secrets";

export type StoredGoogleConnection = {
  id: string;
  workspaceId: string;
  googleSubject: string;
  email: string;
  accessTokenCipher: string;
  refreshTokenCipher: string | null;
  expiresAt: Date | null;
  scopes: string[];
  status: string;
  lastError: string | null;
};

export type StoredSite = {
  id: string;
  workspaceId: string;
  connectionId: string | null;
  siteUrl: string;
  permissionLevel: string;
  active: boolean;
  lastSyncedAt: Date | null;
  displayName: string | null;
  monitorEnabled: boolean;
  crawlPageLimit: number;
  backlinkTarget: string | null;
};

export type StoredWordPressConnection = {
  id: string;
  workspaceId: string;
  siteId: string;
  baseUrl: string;
  username: string;
  remoteUserId: number | null;
  remoteDisplayName: string | null;
  capabilities: Record<string, unknown>;
  status: string;
  lastError: string | null;
  lastVerifiedAt: Date | null;
};

export type StoredGitHubInstallation = {
  id: string;
  workspaceId: string;
  installationId: number;
  accountLogin: string;
  accountType: string;
  accountAvatarUrl: string | null;
  repositorySelection: string;
  permissions: Record<string, unknown>;
  status: string;
  lastError: string | null;
  lastVerifiedAt: Date | null;
};

export type StoredGitHubRepository = {
  id: string;
  workspaceId: string;
  installationId: string;
  siteId: string | null;
  repositoryId: number;
  fullName: string;
  defaultBranch: string;
  private: boolean;
  htmlUrl: string;
  active: boolean;
};

export type StoredTaskExecution = {
  id: string;
  workspaceId: string;
  taskId: string;
  connector: "wordpress" | "github";
  status: string;
  risk: "low" | "medium" | "high";
  plan: Record<string, unknown>;
  beforeSnapshot: Record<string, unknown>;
  afterSnapshot: Record<string, unknown>;
  externalId: string | null;
  externalUrl: string | null;
  error: string | null;
  approvedAt: Date | null;
  executedAt: Date | null;
  revertedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type StoredReportJob = {
  id: string;
  workspaceId: string;
  siteId: string;
  siteUrl: string;
  outputLocale: "en" | "zh" | "es";
  source: "manual" | "weekly";
  status: "queued" | "processing" | "completed" | "failed";
  request: Record<string, unknown>;
  reportId: string | null;
  taskIds: string[];
  error: string | null;
  attemptCount: number;
  availableAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type PageSnapshotInput = {
  url: string;
  capturedOn: string;
  statusCode: number;
  title: string;
  metaDescription: string;
  canonical: string;
  h1: string;
  wordCount: number;
  internalLinks: number;
  contentHash: string;
};

export type StoredPageSnapshot = PageSnapshotInput & {
  id: string;
  siteId: string;
};

export type EvidenceEventInput = {
  id?: string;
  source: "gsc" | "crawler" | "deployment" | "ga4" | "backlink" | "automation" | "manual";
  kind: string;
  occurredAt: Date;
  title: string;
  description: string;
  evidenceState: "detected" | "correlated" | "hypothesis";
  impact: "high" | "medium" | "low";
  metadata?: Record<string, unknown>;
};

export function workspaceId() {
  return process.env.DEFAULT_WORKSPACE_ID || "default";
}

export function stableId(...parts: string[]) {
  return createHash("sha256").update(parts.join("\u001f")).digest("hex").slice(0, 32);
}

function dateOnly(value: unknown) {
  if (!value) return "";
  const text = String(value);
  const iso = text.match(/^\d{4}-\d{2}-\d{2}/)?.[0];
  if (iso) return iso;
  const parsed = value instanceof Date ? value : new Date(text);
  return Number.isNaN(parsed.getTime()) ? text.slice(0, 10) : parsed.toISOString().slice(0, 10);
}

function mapConnection(row: Record<string, unknown>): StoredGoogleConnection {
  return {
    id: String(row.id),
    workspaceId: String(row.workspace_id),
    googleSubject: String(row.google_subject),
    email: String(row.email),
    accessTokenCipher: String(row.access_token_cipher),
    refreshTokenCipher: row.refresh_token_cipher ? String(row.refresh_token_cipher) : null,
    expiresAt: row.expires_at ? new Date(String(row.expires_at)) : null,
    scopes: Array.isArray(row.scopes) ? row.scopes.map(String) : [],
    status: String(row.status),
    lastError: row.last_error ? String(row.last_error) : null,
  };
}

function mapSite(row: Record<string, unknown>): StoredSite {
  return {
    id: String(row.id),
    workspaceId: String(row.workspace_id),
    connectionId: row.connection_id ? String(row.connection_id) : null,
    siteUrl: String(row.site_url),
    permissionLevel: String(row.permission_level),
    active: Boolean(row.active),
    lastSyncedAt: row.last_synced_at ? new Date(String(row.last_synced_at)) : null,
    displayName: row.display_name ? String(row.display_name) : null,
    monitorEnabled: row.monitor_enabled === undefined ? true : Boolean(row.monitor_enabled),
    crawlPageLimit: Number(row.crawl_page_limit || 20),
    backlinkTarget: row.backlink_target ? String(row.backlink_target) : null,
  };
}

function mapWordPressConnection(row: Record<string, unknown>): StoredWordPressConnection {
  return {
    id: String(row.id),
    workspaceId: String(row.workspace_id),
    siteId: String(row.site_id),
    baseUrl: String(row.base_url),
    username: String(row.username),
    remoteUserId: row.remote_user_id === null || row.remote_user_id === undefined ? null : Number(row.remote_user_id),
    remoteDisplayName: row.remote_display_name ? String(row.remote_display_name) : null,
    capabilities: (row.capabilities || {}) as Record<string, unknown>,
    status: String(row.status),
    lastError: row.last_error ? String(row.last_error) : null,
    lastVerifiedAt: row.last_verified_at ? new Date(String(row.last_verified_at)) : null,
  };
}

function mapGitHubInstallation(row: Record<string, unknown>): StoredGitHubInstallation {
  return {
    id: String(row.id),
    workspaceId: String(row.workspace_id),
    installationId: Number(row.installation_id),
    accountLogin: String(row.account_login),
    accountType: String(row.account_type),
    accountAvatarUrl: row.account_avatar_url ? String(row.account_avatar_url) : null,
    repositorySelection: String(row.repository_selection),
    permissions: (row.permissions || {}) as Record<string, unknown>,
    status: String(row.status),
    lastError: row.last_error ? String(row.last_error) : null,
    lastVerifiedAt: row.last_verified_at ? new Date(String(row.last_verified_at)) : null,
  };
}

function mapGitHubRepository(row: Record<string, unknown>): StoredGitHubRepository {
  return {
    id: String(row.id),
    workspaceId: String(row.workspace_id),
    installationId: String(row.installation_id),
    siteId: row.site_id ? String(row.site_id) : null,
    repositoryId: Number(row.repository_id),
    fullName: String(row.full_name),
    defaultBranch: String(row.default_branch),
    private: Boolean(row.private),
    htmlUrl: String(row.html_url),
    active: Boolean(row.active),
  };
}

function mapTaskExecution(row: Record<string, unknown>): StoredTaskExecution {
  const connector = String(row.connector) === "github" ? "github" : "wordpress";
  const risk = String(row.risk);
  return {
    id: String(row.id),
    workspaceId: String(row.workspace_id),
    taskId: String(row.task_id),
    connector,
    status: String(row.status),
    risk: risk === "low" || risk === "high" ? risk : "medium",
    plan: (row.plan || {}) as Record<string, unknown>,
    beforeSnapshot: (row.before_snapshot || {}) as Record<string, unknown>,
    afterSnapshot: (row.after_snapshot || {}) as Record<string, unknown>,
    externalId: row.external_id ? String(row.external_id) : null,
    externalUrl: row.external_url ? String(row.external_url) : null,
    error: row.error ? String(row.error) : null,
    approvedAt: row.approved_at ? new Date(String(row.approved_at)) : null,
    executedAt: row.executed_at ? new Date(String(row.executed_at)) : null,
    revertedAt: row.reverted_at ? new Date(String(row.reverted_at)) : null,
    createdAt: new Date(String(row.created_at)),
    updatedAt: new Date(String(row.updated_at)),
  };
}

export function getPersistencePublicStatus() {
  return {
    databaseConfigured: isDatabaseConfigured(),
    encryptionConfigured: isEncryptionConfigured(),
    ready: isDatabaseConfigured() && isEncryptionConfigured(),
    mode: isDatabaseConfigured() && isEncryptionConfigured() ? "persistent" : "demo",
  } as const;
}

export async function authorizeGoogleIdentity(email: string) {
  if (!isDatabaseConfigured()) return null;
  await ensureDatabaseSchema();
  const sql = getDatabase();
  const normalizedEmail = email.trim().toLowerCase();
  const primaryWorkspaceId = workspaceId();
  const [membership] = await sql`
    select workspace_id, role
    from rankcues_workspace_members
    where lower(email) = ${normalizedEmail} and workspace_id = ${primaryWorkspaceId}
    order by case when role = 'owner' then 0 else 1 end, created_at
    limit 1
  `;
  if (membership) {
    return { workspaceId: String(membership.workspace_id), role: String(membership.role) };
  }

  const [existingConnection] = await sql`
    select workspace_id
    from rankcues_google_connections
    where lower(email) = ${normalizedEmail} and workspace_id = ${primaryWorkspaceId}
    order by created_at
    limit 1
  `;
  const allowedEmails = (process.env.APP_ALLOWED_EMAILS || "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  const workspace = existingConnection
    ? primaryWorkspaceId
    : allowedEmails.includes(normalizedEmail)
      ? primaryWorkspaceId
      : null;
  if (!workspace) return null;

  await sql`
    insert into rankcues_workspace_members (id, workspace_id, email, role)
    values (${stableId(workspace, "member", normalizedEmail)}, ${workspace}, ${normalizedEmail}, 'owner')
    on conflict (workspace_id, email) do nothing
  `;
  return { workspaceId: workspace, role: "owner" };
}

export async function upsertGoogleConnection(input: {
  workspaceId?: string;
  googleSubject: string;
  email: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  scopes: string[];
}) {
  await ensureDatabaseSchema();
  const sql = getDatabase();
  const currentWorkspaceId = input.workspaceId || workspaceId();
  const id = stableId(currentWorkspaceId, "google", input.googleSubject);
  const accessTokenCipher = encryptSecret(input.accessToken);
  const refreshTokenCipher = input.refreshToken
    ? encryptSecret(input.refreshToken)
    : null;
  const [row] = await sql`
    insert into rankcues_google_connections (
      id, workspace_id, google_subject, email, access_token_cipher,
      refresh_token_cipher, expires_at, scopes, status, last_error
    ) values (
      ${id}, ${currentWorkspaceId}, ${input.googleSubject}, ${input.email},
      ${accessTokenCipher}, ${refreshTokenCipher}, ${input.expiresAt ?? null},
      ${sql.json(input.scopes)}, 'connected', null
    )
    on conflict (workspace_id, google_subject) do update set
      email = excluded.email,
      access_token_cipher = excluded.access_token_cipher,
      refresh_token_cipher = coalesce(
        excluded.refresh_token_cipher,
        rankcues_google_connections.refresh_token_cipher
      ),
      expires_at = excluded.expires_at,
      scopes = excluded.scopes,
      status = 'connected',
      last_error = null,
      updated_at = now()
    returning *
  `;
  return mapConnection(row);
}

export async function updateGoogleConnectionToken(input: {
  connectionId: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
}) {
  await ensureDatabaseSchema();
  const sql = getDatabase();
  const accessTokenCipher = encryptSecret(input.accessToken);
  const refreshTokenCipher = input.refreshToken
    ? encryptSecret(input.refreshToken)
    : null;
  await sql`
    update rankcues_google_connections set
      access_token_cipher = ${accessTokenCipher},
      refresh_token_cipher = coalesce(${refreshTokenCipher}, refresh_token_cipher),
      expires_at = ${input.expiresAt ?? null},
      status = 'connected',
      last_error = null,
      updated_at = now()
    where id = ${input.connectionId}
  `;
}

export async function markGoogleConnectionError(connectionId: string, error: string) {
  await ensureDatabaseSchema();
  const sql = getDatabase();
  await sql`
    update rankcues_google_connections set
      status = 'needs_attention',
      last_error = ${error.slice(0, 500)},
      updated_at = now()
    where id = ${connectionId}
  `;
}

export async function listGoogleConnections() {
  if (!isDatabaseConfigured()) return [];
  await ensureDatabaseSchema();
  const sql = getDatabase();
  const rows = await sql`
    select * from rankcues_google_connections
    where workspace_id = ${workspaceId()}
    order by updated_at desc
  `;
  return rows.map(mapConnection);
}

export async function getGoogleConnectionById(connectionId: string) {
  if (!isDatabaseConfigured()) return null;
  await ensureDatabaseSchema();
  const sql = getDatabase();
  const [row] = await sql`
    select * from rankcues_google_connections
    where id = ${connectionId} and workspace_id = ${workspaceId()}
    limit 1
  `;
  return row ? mapConnection(row) : null;
}

export async function upsertGscSites(
  connectionId: string,
  sites: Array<{ siteUrl: string; permissionLevel: string }>,
  options?: { preserveExistingConnection?: boolean; workspaceId?: string },
) {
  await ensureDatabaseSchema();
  const sql = getDatabase();
  const currentWorkspaceId = options?.workspaceId || workspaceId();
  const rows = sites.map((site) => ({
    id: stableId(currentWorkspaceId, "gsc", site.siteUrl),
    workspace_id: currentWorkspaceId,
    connection_id: connectionId,
    site_url: site.siteUrl,
    permission_level: site.permissionLevel,
    active: site.permissionLevel !== "siteUnverifiedUser",
  }));

  if (rows.length) {
    if (options?.preserveExistingConnection) {
      await sql`
        insert into rankcues_sites ${sql(
          rows,
          "id",
          "workspace_id",
          "connection_id",
          "site_url",
          "permission_level",
          "active",
        )}
        on conflict (workspace_id, site_url) do update set
          active = rankcues_sites.active or excluded.active,
          updated_at = now()
      `;
    } else {
      await sql`
        insert into rankcues_sites ${sql(
          rows,
          "id",
          "workspace_id",
          "connection_id",
          "site_url",
          "permission_level",
          "active",
        )}
        on conflict (workspace_id, site_url) do update set
          connection_id = excluded.connection_id,
          permission_level = excluded.permission_level,
          active = excluded.active,
          updated_at = now()
      `;
    }
  }

  return listGscSites();
}

export async function listGscSites() {
  if (!isDatabaseConfigured()) return [];
  await ensureDatabaseSchema();
  const sql = getDatabase();
  const rows = await sql`
    select
      s.*,
      count(distinct m.page)::integer as page_count,
      count(distinct m.query)::integer as query_count,
      coalesce(sum(m.clicks) filter (
        where m.metric_date >= current_date - interval '28 days'
      ), 0)::double precision as clicks_28d
    from rankcues_sites s
    left join rankcues_gsc_metrics m on m.site_id = s.id
    where s.workspace_id = ${workspaceId()}
    group by s.id
    order by s.updated_at desc
  `;

  return rows.map((row) => ({
    ...mapSite(row),
    pageCount: Number(row.page_count || 0),
    queryCount: Number(row.query_count || 0),
    clicks28d: Number(row.clicks_28d || 0),
  }));
}

export async function getSiteByIdOrUrl(value: string) {
  if (!isDatabaseConfigured()) return null;
  await ensureDatabaseSchema();
  const sql = getDatabase();
  const [row] = await sql`
    select * from rankcues_sites
    where workspace_id = ${workspaceId()}
      and (id = ${value} or site_url = ${value})
    limit 1
  `;
  return row ? mapSite(row) : null;
}

export async function getConnectionForSite(siteId: string) {
  await ensureDatabaseSchema();
  const sql = getDatabase();
  const [row] = await sql`
    select c.* from rankcues_google_connections c
    join rankcues_sites s on s.connection_id = c.id
    where s.id = ${siteId} and s.workspace_id = ${workspaceId()}
    limit 1
  `;
  return row ? mapConnection(row) : null;
}

export function revealConnectionTokens(connection: StoredGoogleConnection) {
  return {
    accessToken: decryptSecret(connection.accessTokenCipher),
    refreshToken: connection.refreshTokenCipher
      ? decryptSecret(connection.refreshTokenCipher)
      : null,
  };
}

export async function saveGscMetrics(
  siteId: string,
  rows: Array<{
    date: string;
    page: string;
    query: string;
    device: string;
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
  }>,
) {
  await ensureDatabaseSchema();
  const sql = getDatabase();
  const chunkSize = 1_000;

  for (let offset = 0; offset < rows.length; offset += chunkSize) {
    const chunk = rows.slice(offset, offset + chunkSize).map((row) => ({
      site_id: siteId,
      metric_date: row.date,
      page: row.page,
      query: row.query,
      device: row.device,
      clicks: row.clicks,
      impressions: row.impressions,
      ctr: row.ctr,
      position: row.position,
    }));
    if (!chunk.length) continue;

    await sql`
      insert into rankcues_gsc_metrics ${sql(
        chunk,
        "site_id",
        "metric_date",
        "page",
        "query",
        "device",
        "clicks",
        "impressions",
        "ctr",
        "position",
      )}
      on conflict (site_id, metric_date, page, query, device) do update set
        clicks = excluded.clicks,
        impressions = excluded.impressions,
        ctr = excluded.ctr,
        position = excluded.position,
        updated_at = now()
    `;
  }

  await sql`
    update rankcues_sites set last_synced_at = now(), updated_at = now()
    where id = ${siteId}
  `;
}

export async function createSyncRun(siteId: string, source: string) {
  await ensureDatabaseSchema();
  const sql = getDatabase();
  const id = randomUUID();
  await sql`
    update rankcues_sync_runs
    set status = 'failed', error = coalesce(error, 'Run expired before completion.'), completed_at = now()
    where site_id = ${siteId} and source = ${source} and status = 'running'
      and started_at < now() - interval '30 minutes'
  `;
  try {
    await sql`
      insert into rankcues_sync_runs (id, site_id, source, status)
      values (${id}, ${siteId}, ${source}, 'running')
    `;
  } catch (error) {
    if ((error as { code?: string }).code === "23505") {
      throw new Error(`A ${source} run is already active for this site.`);
    }
    throw error;
  }
  return id;
}

export async function finishSyncRun(input: {
  id: string;
  status: "completed" | "failed";
  rowsWritten?: number;
  details?: Record<string, unknown>;
  error?: string;
}) {
  await ensureDatabaseSchema();
  const sql = getDatabase();
  await sql`
    update rankcues_sync_runs set
      status = ${input.status},
      rows_written = ${input.rowsWritten ?? 0},
      details = ${sql.json(JSON.parse(JSON.stringify(input.details ?? {})))},
      error = ${input.error?.slice(0, 1000) ?? null},
      completed_at = now()
    where id = ${input.id}
  `;
}

export async function saveEvidenceEvent(siteId: string, event: EvidenceEventInput) {
  await ensureDatabaseSchema();
  const sql = getDatabase();
  const id = event.id || stableId(
    siteId,
    event.source,
    event.kind,
    event.occurredAt.toISOString(),
    event.title,
  );
  await sql`
    insert into rankcues_events (
      id, site_id, source, kind, occurred_at, title, description,
      evidence_state, impact, metadata
    ) values (
      ${id}, ${siteId}, ${event.source}, ${event.kind}, ${event.occurredAt},
      ${event.title}, ${event.description}, ${event.evidenceState},
      ${event.impact}, ${sql.json(JSON.parse(JSON.stringify(event.metadata ?? {})))}
    )
    on conflict (id) do update set
      title = excluded.title,
      description = excluded.description,
      evidence_state = excluded.evidence_state,
      impact = excluded.impact,
      metadata = excluded.metadata
  `;
  return id;
}

export async function getLatestPageSnapshot(siteId: string, url: string, beforeDate?: string) {
  await ensureDatabaseSchema();
  const sql = getDatabase();
  const [row] = await sql`
    select * from rankcues_page_snapshots
    where site_id = ${siteId} and url = ${url}
      and (${beforeDate ?? null}::date is null or captured_on < ${beforeDate ?? null}::date)
    order by captured_on desc
    limit 1
  `;
  if (!row) return null;
  return {
    id: String(row.id),
    siteId: String(row.site_id),
    url: String(row.url),
    capturedOn: String(row.captured_on).slice(0, 10),
    statusCode: Number(row.status_code),
    title: String(row.title),
    metaDescription: String(row.meta_description),
    canonical: String(row.canonical),
    h1: String(row.h1),
    wordCount: Number(row.word_count),
    internalLinks: Number(row.internal_links),
    contentHash: String(row.content_hash),
  } satisfies StoredPageSnapshot;
}

export async function savePageSnapshot(siteId: string, snapshot: PageSnapshotInput) {
  await ensureDatabaseSchema();
  const sql = getDatabase();
  const id = stableId(siteId, snapshot.url, snapshot.capturedOn);
  await sql`
    insert into rankcues_page_snapshots (
      id, site_id, url, captured_on, status_code, title, meta_description,
      canonical, h1, word_count, internal_links, content_hash
    ) values (
      ${id}, ${siteId}, ${snapshot.url}, ${snapshot.capturedOn},
      ${snapshot.statusCode}, ${snapshot.title}, ${snapshot.metaDescription},
      ${snapshot.canonical}, ${snapshot.h1}, ${snapshot.wordCount},
      ${snapshot.internalLinks}, ${snapshot.contentHash}
    )
    on conflict (site_id, url, captured_on) do update set
      status_code = excluded.status_code,
      title = excluded.title,
      meta_description = excluded.meta_description,
      canonical = excluded.canonical,
      h1 = excluded.h1,
      word_count = excluded.word_count,
      internal_links = excluded.internal_links,
      content_hash = excluded.content_hash
  `;
  return id;
}

export async function getActiveSites(limit = 20) {
  if (!isDatabaseConfigured()) return [];
  await ensureDatabaseSchema();
  const sql = getDatabase();
  const rows = await sql`
    select * from rankcues_sites
    where workspace_id = ${workspaceId()}
      and active = true
      and permission_level <> 'siteUnverifiedUser'
    order by coalesce(last_synced_at, to_timestamp(0)) asc
    limit ${Math.max(1, Math.min(limit, 100))}
  `;
  return rows.map(mapSite);
}

export async function getWeeklyEvidence(siteId: string) {
  await ensureDatabaseSchema();
  const sql = getDatabase();
  const [site] = await sql`
    select * from rankcues_sites where id = ${siteId} limit 1
  `;
  if (!site) return null;

  const totals = await sql`
    with bounds as (
      select max(metric_date) as end_date
      from rankcues_gsc_metrics
      where site_id = ${siteId}
    )
    select
      bounds.end_date,
      sum(clicks) filter (where metric_date between bounds.end_date - 6 and bounds.end_date)::double precision as current_clicks,
      sum(clicks) filter (where metric_date between bounds.end_date - 13 and bounds.end_date - 7)::double precision as previous_clicks,
      sum(impressions) filter (where metric_date between bounds.end_date - 6 and bounds.end_date)::double precision as current_impressions,
      sum(impressions) filter (where metric_date between bounds.end_date - 13 and bounds.end_date - 7)::double precision as previous_impressions
    from rankcues_gsc_metrics cross join bounds
    where site_id = ${siteId}
      and metric_date between bounds.end_date - 13 and bounds.end_date
    group by bounds.end_date
  `;

  const pages = await sql`
    with bounds as (
      select max(metric_date) as end_date
      from rankcues_gsc_metrics
      where site_id = ${siteId}
    )
    select
      page,
      sum(clicks) filter (where metric_date between bounds.end_date - 6 and bounds.end_date)::double precision as current_clicks,
      sum(clicks) filter (where metric_date between bounds.end_date - 13 and bounds.end_date - 7)::double precision as previous_clicks,
      sum(impressions) filter (where metric_date between bounds.end_date - 6 and bounds.end_date)::double precision as current_impressions,
      sum(impressions) filter (where metric_date between bounds.end_date - 13 and bounds.end_date - 7)::double precision as previous_impressions,
      avg(position) filter (where metric_date between bounds.end_date - 6 and bounds.end_date)::double precision as current_position,
      avg(position) filter (where metric_date between bounds.end_date - 13 and bounds.end_date - 7)::double precision as previous_position
    from rankcues_gsc_metrics cross join bounds
    where site_id = ${siteId}
      and metric_date between bounds.end_date - 13 and bounds.end_date
    group by page, bounds.end_date
    order by abs(
      coalesce(sum(clicks) filter (where metric_date between bounds.end_date - 6 and bounds.end_date), 0) -
      coalesce(sum(clicks) filter (where metric_date between bounds.end_date - 13 and bounds.end_date - 7), 0)
    ) desc
    limit 20
  `;

  const queries = await sql`
    with bounds as (
      select max(metric_date) as end_date
      from rankcues_gsc_metrics where site_id = ${siteId}
    )
    select query,
      sum(clicks) filter (where metric_date between bounds.end_date - 6 and bounds.end_date)::double precision as current_clicks,
      sum(clicks) filter (where metric_date between bounds.end_date - 13 and bounds.end_date - 7)::double precision as previous_clicks,
      sum(impressions) filter (where metric_date between bounds.end_date - 6 and bounds.end_date)::double precision as current_impressions,
      sum(impressions) filter (where metric_date between bounds.end_date - 13 and bounds.end_date - 7)::double precision as previous_impressions,
      avg(position) filter (where metric_date between bounds.end_date - 6 and bounds.end_date)::double precision as current_position,
      avg(position) filter (where metric_date between bounds.end_date - 13 and bounds.end_date - 7)::double precision as previous_position
    from rankcues_gsc_metrics cross join bounds
    where site_id = ${siteId}
      and metric_date between bounds.end_date - 13 and bounds.end_date
      and query <> ''
    group by query, bounds.end_date
    order by greatest(
      coalesce(sum(impressions) filter (where metric_date between bounds.end_date - 6 and bounds.end_date), 0),
      coalesce(sum(impressions) filter (where metric_date between bounds.end_date - 13 and bounds.end_date - 7), 0)
    ) desc
    limit 100
  `;

  const events = await sql`
    select source, kind, occurred_at, title, description, evidence_state, impact, metadata
    from rankcues_events
    where site_id = ${siteId} and occurred_at >= now() - interval '21 days'
    order by occurred_at desc
    limit 30
  `;

  const ga4 = await sql`
    with bounds as (
      select max(m.metric_date) as end_date
      from rankcues_ga4_metrics m
      join rankcues_ga4_properties p on p.id = m.property_id
      where p.site_id = ${siteId}
    )
    select bounds.end_date,
      sum(m.sessions) filter (where m.metric_date between bounds.end_date - 6 and bounds.end_date)::double precision as current_sessions,
      sum(m.sessions) filter (where m.metric_date between bounds.end_date - 13 and bounds.end_date - 7)::double precision as previous_sessions,
      sum(m.key_events) filter (where m.metric_date between bounds.end_date - 6 and bounds.end_date)::double precision as current_key_events,
      avg(m.engagement_rate) filter (where m.metric_date between bounds.end_date - 6 and bounds.end_date)::double precision as engagement_rate
    from rankcues_ga4_metrics m
    join rankcues_ga4_properties p on p.id = m.property_id
    cross join bounds
    where p.site_id = ${siteId}
    group by bounds.end_date
  `;

  const backlinkSnapshots = await sql`
    select captured_on, backlinks, referring_domains, new_backlinks, lost_backlinks, rank
    from rankcues_backlink_snapshots
    where site_id = ${siteId}
    order by captured_on desc limit 2
  `;

  const crawlCoverage = await sql`
    select count(distinct url)::integer as monitored_pages,
      max(captured_on) as last_capture
    from rankcues_page_snapshots where site_id = ${siteId}
  `;

  const taskOutcomes = await sql`
    select title, priority, status, approval_status, measurement_status,
      recommendation, outcome_summary, baseline, result, completed_at, verified_at
    from rankcues_tasks
    where site_id = ${siteId}
      and created_at >= now() - interval '90 days'
      and approval_status <> 'rejected'
    order by coalesce(verified_at, completed_at, created_at) desc
    limit 20
  `;

  return {
    site: mapSite(site),
    comparison: {
      currentDays: 7,
      previousDays: 7,
      totals: totals[0] ?? {},
      pages,
      queries,
    },
    contextEvents: events,
    trafficContext: ga4[0] ?? null,
    backlinkContext: backlinkSnapshots,
    crawlCoverage: crawlCoverage[0] ?? null,
    executionContext: taskOutcomes,
    caveat:
      "Search Console returns top rows rather than a guaranteed exhaustive export. Treat change events as evidence, not proof of causation.",
  };
}

export async function getSiteAnalytics(siteId: string) {
  await ensureDatabaseSchema();
  const sql = getDatabase();
  const daily = await sql`
    select
      metric_date,
      sum(clicks)::double precision as clicks,
      sum(impressions)::double precision as impressions,
      (case when sum(impressions) > 0 then sum(clicks) / sum(impressions) else 0 end)::double precision as ctr,
      avg(position)::double precision as position
    from rankcues_gsc_metrics
    where site_id = ${siteId}
      and metric_date >= current_date - interval '27 days'
    group by metric_date
    order by metric_date
  `;
  const queries = await sql`
    with bounds as (
      select max(metric_date) as end_date from rankcues_gsc_metrics where site_id = ${siteId}
    )
    select
      query,
      sum(clicks) filter (where metric_date between bounds.end_date - 6 and bounds.end_date)::double precision as clicks,
      sum(clicks) filter (where metric_date between bounds.end_date - 13 and bounds.end_date - 7)::double precision as previous_clicks,
      sum(impressions) filter (where metric_date between bounds.end_date - 6 and bounds.end_date)::double precision as impressions,
      avg(position) filter (where metric_date between bounds.end_date - 6 and bounds.end_date)::double precision as position
    from rankcues_gsc_metrics cross join bounds
    where site_id = ${siteId}
      and metric_date between bounds.end_date - 13 and bounds.end_date
      and query <> ''
    group by query, bounds.end_date
    order by impressions desc, clicks desc
    limit 50
  `;
  const pages = await sql`
    with bounds as (
      select max(metric_date) as end_date from rankcues_gsc_metrics where site_id = ${siteId}
    )
    select
      page,
      sum(clicks) filter (where metric_date between bounds.end_date - 6 and bounds.end_date)::double precision as clicks,
      sum(clicks) filter (where metric_date between bounds.end_date - 13 and bounds.end_date - 7)::double precision as previous_clicks,
      sum(impressions) filter (where metric_date between bounds.end_date - 6 and bounds.end_date)::double precision as impressions,
      avg(position) filter (where metric_date between bounds.end_date - 6 and bounds.end_date)::double precision as position
    from rankcues_gsc_metrics cross join bounds
    where site_id = ${siteId}
      and metric_date between bounds.end_date - 13 and bounds.end_date
    group by page, bounds.end_date
    order by clicks desc, impressions desc
    limit 30
  `;
  const syncRuns = await sql`
    select id, source, status, rows_written, details, error, started_at, completed_at
    from rankcues_sync_runs
    where site_id = ${siteId}
    order by started_at desc
    limit 10
  `;

  return {
    daily: daily.map((row) => ({
      date: dateOnly(row.metric_date),
      clicks: Number(row.clicks || 0),
      impressions: Number(row.impressions || 0),
      ctr: Number(row.ctr || 0),
      position: Number(row.position || 0),
    })),
    queries: queries.map((row) => ({
      query: String(row.query),
      clicks: Number(row.clicks || 0),
      previousClicks: Number(row.previous_clicks || 0),
      impressions: Number(row.impressions || 0),
      position: Number(row.position || 0),
    })),
    pages: pages.map((row) => ({
      page: String(row.page),
      clicks: Number(row.clicks || 0),
      previousClicks: Number(row.previous_clicks || 0),
      impressions: Number(row.impressions || 0),
      position: Number(row.position || 0),
    })),
    syncRuns: syncRuns.map((row) => ({
      id: String(row.id),
      source: String(row.source),
      status: String(row.status),
      rowsWritten: Number(row.rows_written || 0),
      details: row.details as Record<string, unknown>,
      error: row.error ? String(row.error) : null,
      startedAt: new Date(String(row.started_at)),
      completedAt: row.completed_at ? new Date(String(row.completed_at)) : null,
    })),
  };
}

export async function saveWeeklyReport(input: {
  siteId: string;
  periodStart: string;
  periodEnd: string;
  title?: string;
  outputLocale?: "en" | "zh" | "es";
  report: unknown;
  provider: unknown;
  usage: unknown;
}) {
  await ensureDatabaseSchema();
  const sql = getDatabase();
  const id = stableId(input.siteId, input.periodStart, input.periodEnd);
  const reportObject = input.report && typeof input.report === "object" && !Array.isArray(input.report)
    ? input.report as Record<string, unknown>
    : {};
  const existingMeta = reportObject._meta && typeof reportObject._meta === "object" && !Array.isArray(reportObject._meta)
    ? reportObject._meta as Record<string, unknown>
    : {};
  const storedReport = input.outputLocale
    ? { ...reportObject, _meta: { ...existingMeta, outputLocale: input.outputLocale } }
    : reportObject;
  await sql`
    insert into rankcues_weekly_reports (
      id, site_id, period_start, period_end, title, report, provider, usage
    ) values (
      ${id}, ${input.siteId}, ${input.periodStart}, ${input.periodEnd}, ${input.title ?? null},
      ${sql.json(JSON.parse(JSON.stringify(storedReport)))},
      ${sql.json(JSON.parse(JSON.stringify(input.provider ?? {})))},
      ${sql.json(JSON.parse(JSON.stringify(input.usage ?? {})))}
    )
    on conflict (site_id, period_start, period_end) do update set
      report = excluded.report,
      title = coalesce(excluded.title, rankcues_weekly_reports.title),
      provider = excluded.provider,
      usage = excluded.usage,
      generated_at = now()
  `;
  return id;
}

function mapReportJob(row: Record<string, unknown>): StoredReportJob {
  const locale = row.output_locale === "zh" || row.output_locale === "es" ? row.output_locale : "en";
  const source = row.source === "weekly" ? "weekly" : "manual";
  const status = ["queued", "processing", "completed", "failed"].includes(String(row.status))
    ? String(row.status) as StoredReportJob["status"]
    : "failed";
  return {
    id: String(row.id),
    workspaceId: String(row.workspace_id),
    siteId: String(row.site_id),
    siteUrl: String(row.site_url || ""),
    outputLocale: locale,
    source,
    status,
    request: (row.request || {}) as Record<string, unknown>,
    reportId: row.report_id ? String(row.report_id) : null,
    taskIds: Array.isArray(row.task_ids) ? row.task_ids.map(String) : [],
    error: row.error ? String(row.error) : null,
    attemptCount: Number(row.attempt_count || 0),
    availableAt: new Date(String(row.available_at)),
    startedAt: row.started_at ? new Date(String(row.started_at)) : null,
    completedAt: row.completed_at ? new Date(String(row.completed_at)) : null,
    createdAt: new Date(String(row.created_at)),
    updatedAt: new Date(String(row.updated_at)),
  };
}

export async function createReportJob(input: {
  workspaceId?: string;
  siteId: string;
  outputLocale: "en" | "zh" | "es";
  source?: "manual" | "weekly";
  request?: Record<string, unknown>;
}) {
  await ensureDatabaseSchema();
  const sql = getDatabase();
  const currentWorkspaceId = input.workspaceId || workspaceId();
  const id = stableId(currentWorkspaceId, input.siteId, "report-job", randomUUID());
  const [created] = await sql`
    insert into rankcues_report_jobs (
      id, workspace_id, site_id, output_locale, source, request
    )
    select
      ${id}, ${currentWorkspaceId}, s.id, ${input.outputLocale},
      ${input.source || "manual"},
      ${sql.json(JSON.parse(JSON.stringify(input.request || {})))}
    from rankcues_sites s
    where s.id = ${input.siteId}
      and s.workspace_id = ${currentWorkspaceId}
      and s.active = true
      and s.permission_level <> 'siteUnverifiedUser'
    on conflict (workspace_id, site_id)
      where status in ('queued', 'processing')
      do nothing
    returning *
  `;
  if (created) {
    return mapReportJob({ ...created, site_url: "" });
  }

  const [existing] = await sql`
    select j.*, s.site_url
    from rankcues_report_jobs j
    join rankcues_sites s on s.id = j.site_id
    where j.workspace_id = ${currentWorkspaceId}
      and j.site_id = ${input.siteId}
      and j.status in ('queued', 'processing')
    order by j.created_at desc
    limit 1
  `;
  if (!existing) {
    throw new Error("The selected Search Console property is not active or verified.");
  }
  return mapReportJob(existing);
}

export async function getReportJob(jobId: string, currentWorkspaceId = workspaceId()) {
  if (!isDatabaseConfigured()) return null;
  await ensureDatabaseSchema();
  const sql = getDatabase();
  const [row] = await sql`
    select j.*, s.site_url
    from rankcues_report_jobs j
    join rankcues_sites s on s.id = j.site_id
    where j.id = ${jobId} and j.workspace_id = ${currentWorkspaceId}
    limit 1
  `;
  return row ? mapReportJob(row) : null;
}

export async function listReportJobs(siteId?: string, limit = 20) {
  if (!isDatabaseConfigured()) return [];
  await ensureDatabaseSchema();
  const sql = getDatabase();
  const selectedSiteId = siteId || null;
  const rows = await sql`
    select j.*, s.site_url
    from rankcues_report_jobs j
    join rankcues_sites s on s.id = j.site_id
    where j.workspace_id = ${workspaceId()}
      and (${selectedSiteId}::text is null or j.site_id = ${selectedSiteId})
    order by
      case j.status when 'processing' then 1 when 'queued' then 2 else 3 end,
      j.created_at desc
    limit ${Math.max(1, Math.min(limit, 100))}
  `;
  return rows.map(mapReportJob);
}

export async function claimQueuedReportJob(jobId?: string) {
  await ensureDatabaseSchema();
  const sql = getDatabase();
  const selectedJobId = jobId || null;
  await sql`
    update rankcues_report_jobs
    set
      status = 'queued',
      available_at = now(),
      started_at = null,
      error = coalesce(error, 'The previous worker stopped before completion; retrying.'),
      updated_at = now()
    where status = 'processing'
      and started_at < now() - interval '20 minutes'
      and attempt_count < 3
  `;
  await sql`
    update rankcues_report_jobs
    set
      status = 'failed',
      completed_at = now(),
      error = coalesce(error, 'The background report exceeded its retry limit.'),
      updated_at = now()
    where status = 'processing'
      and started_at < now() - interval '20 minutes'
      and attempt_count >= 3
  `;
  const [row] = await sql`
    with candidate as (
      select id
      from rankcues_report_jobs
      where status = 'queued'
        and available_at <= now()
        and (${selectedJobId}::text is null or id = ${selectedJobId})
      order by created_at
      for update skip locked
      limit 1
    )
    update rankcues_report_jobs j
    set
      status = 'processing',
      attempt_count = j.attempt_count + 1,
      started_at = now(),
      completed_at = null,
      error = null,
      updated_at = now()
    from candidate
    where j.id = candidate.id
    returning j.*, (
      select site_url from rankcues_sites where id = j.site_id
    ) as site_url
  `;
  return row ? mapReportJob(row) : null;
}

export async function completeReportJob(input: {
  jobId: string;
  reportId: string;
  taskIds: string[];
}) {
  await ensureDatabaseSchema();
  const sql = getDatabase();
  const [row] = await sql`
    update rankcues_report_jobs
    set
      status = 'completed',
      report_id = ${input.reportId},
      task_ids = ${sql.json(input.taskIds)},
      error = null,
      completed_at = now(),
      updated_at = now()
    where id = ${input.jobId}
    returning *, (
      select site_url from rankcues_sites where id = rankcues_report_jobs.site_id
    ) as site_url
  `;
  return row ? mapReportJob(row) : null;
}

export async function failReportJob(input: {
  jobId: string;
  attemptCount: number;
  error: string;
}) {
  await ensureDatabaseSchema();
  const sql = getDatabase();
  const retry = input.attemptCount < 3;
  const retryMinutes = Math.max(2, input.attemptCount * 3);
  const [row] = await sql`
    update rankcues_report_jobs
    set
      status = ${retry ? "queued" : "failed"},
      error = ${input.error.slice(0, 4000)},
      available_at = case
        when ${retry} then now() + (${retryMinutes} * interval '1 minute')
        else available_at
      end,
      completed_at = case when ${retry} then null else now() end,
      updated_at = now()
    where id = ${input.jobId}
    returning *, (
      select site_url from rankcues_sites where id = rankcues_report_jobs.site_id
    ) as site_url
  `;
  return row ? mapReportJob(row) : null;
}

export async function getPortfolioOverview() {
  if (!isDatabaseConfigured()) return null;
  await ensureDatabaseSchema();
  const sql = getDatabase();
  const sites = await sql`
    with bounds as (
      select site_id, max(metric_date) as end_date
      from rankcues_gsc_metrics
      group by site_id
    ), metrics as (
      select
        m.site_id,
        sum(m.clicks) filter (where m.metric_date between b.end_date - 6 and b.end_date)::double precision as current_clicks,
        sum(m.clicks) filter (where m.metric_date between b.end_date - 13 and b.end_date - 7)::double precision as previous_clicks,
        count(distinct m.page)::integer as page_count,
        count(distinct m.query)::integer as query_count,
        b.end_date
      from rankcues_gsc_metrics m
      join bounds b on b.site_id = m.site_id
      where m.metric_date between b.end_date - 13 and b.end_date
      group by m.site_id, b.end_date
    )
    select
      s.id, s.site_url, s.permission_level, s.last_synced_at,
      coalesce(metrics.current_clicks, 0)::double precision as current_clicks,
      coalesce(metrics.previous_clicks, 0)::double precision as previous_clicks,
      coalesce(metrics.page_count, 0)::integer as page_count,
      coalesce(metrics.query_count, 0)::integer as query_count,
      metrics.end_date
    from rankcues_sites s
    left join metrics on metrics.site_id = s.id
    where s.workspace_id = ${workspaceId()}
      and s.active = true
      and s.permission_level <> 'siteUnverifiedUser'
    order by coalesce(s.last_synced_at, to_timestamp(0)) desc
  `;
  const events = await sql`
    select e.*, s.site_url
    from rankcues_events e
    join rankcues_sites s on s.id = e.site_id
    where s.workspace_id = ${workspaceId()}
      and e.occurred_at >= now() - interval '21 days'
    order by
      case e.impact when 'high' then 1 when 'medium' then 2 else 3 end,
      e.occurred_at desc
    limit 12
  `;
  const [reportCount] = await sql`
    select count(*)::integer as count
    from rankcues_weekly_reports r
    join rankcues_sites s on s.id = r.site_id
    where s.workspace_id = ${workspaceId()}
      and r.generated_at >= now() - interval '7 days'
  `;
  const daily = await sql`
    select
      m.metric_date,
      sum(m.clicks)::double precision as clicks,
      sum(m.impressions)::double precision as impressions
    from rankcues_gsc_metrics m
    join rankcues_sites s on s.id = m.site_id
    where s.workspace_id = ${workspaceId()}
      and s.active = true
      and s.permission_level <> 'siteUnverifiedUser'
      and m.metric_date >= current_date - interval '27 days'
    group by m.metric_date
    order by m.metric_date
  `;

  return {
    sites: sites.map((row) => ({
      id: String(row.id),
      siteUrl: String(row.site_url),
      permissionLevel: String(row.permission_level),
      lastSyncedAt: row.last_synced_at ? new Date(String(row.last_synced_at)) : null,
      currentClicks: Number(row.current_clicks || 0),
      previousClicks: Number(row.previous_clicks || 0),
      pageCount: Number(row.page_count || 0),
      queryCount: Number(row.query_count || 0),
      dataThrough: row.end_date ? dateOnly(row.end_date) : null,
    })),
    events: events.map((row) => ({
      id: String(row.id),
      siteId: String(row.site_id),
      siteUrl: String(row.site_url),
      source: String(row.source),
      kind: String(row.kind),
      occurredAt: new Date(String(row.occurred_at)),
      title: String(row.title),
      description: String(row.description),
      evidenceState: String(row.evidence_state),
      impact: String(row.impact),
      metadata: row.metadata as Record<string, unknown>,
    })),
    daily: daily.map((row) => ({
      date: dateOnly(row.metric_date),
      clicks: Number(row.clicks || 0),
      impressions: Number(row.impressions || 0),
    })),
    reportsGenerated: Number(reportCount?.count || 0),
  };
}

export async function listWorkspaces() {
  if (!isDatabaseConfigured()) return [];
  await ensureDatabaseSchema();
  const sql = getDatabase();
  const rows = await sql`
    select w.*,
      count(distinct s.id)::integer as site_count
    from rankcues_workspaces w
    left join rankcues_sites s on s.workspace_id = w.id
    group by w.id
    order by w.created_at
  `;
  return rows.map((row) => ({
    id: String(row.id),
    name: String(row.name),
    slug: String(row.slug),
    siteCount: Number(row.site_count || 0),
    createdAt: new Date(String(row.created_at)),
  }));
}

export async function createWorkspace(input: { name: string; slug?: string }) {
  await ensureDatabaseSchema();
  const sql = getDatabase();
  const normalizedSlug = (input.slug || input.name)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
  if (!normalizedSlug) throw new Error("Organization name must contain letters or numbers.");
  const id = stableId("workspace", normalizedSlug);
  const [row] = await sql`
    insert into rankcues_workspaces (id, name, slug)
    values (${id}, ${input.name.trim().slice(0, 80)}, ${normalizedSlug})
    on conflict (slug) do update set name = excluded.name, updated_at = now()
    returning *
  `;
  return { id: String(row.id), name: String(row.name), slug: String(row.slug) };
}

export type Ga4PropertyInput = {
  accountId: string;
  propertyId: string;
  displayName: string;
  currencyCode?: string | null;
  timeZone?: string | null;
};

export async function upsertGa4Properties(connectionId: string, properties: Ga4PropertyInput[]) {
  await ensureDatabaseSchema();
  const sql = getDatabase();
  const currentWorkspaceId = workspaceId();
  for (const property of properties) {
    const id = stableId(currentWorkspaceId, "ga4", property.propertyId);
    await sql`
      insert into rankcues_ga4_properties (
        id, workspace_id, connection_id, account_id, property_id,
        display_name, currency_code, time_zone
      ) values (
        ${id}, ${currentWorkspaceId}, ${connectionId}, ${property.accountId},
        ${property.propertyId}, ${property.displayName},
        ${property.currencyCode ?? null}, ${property.timeZone ?? null}
      )
      on conflict (workspace_id, property_id) do update set
        connection_id = excluded.connection_id,
        account_id = excluded.account_id,
        display_name = excluded.display_name,
        currency_code = coalesce(excluded.currency_code, rankcues_ga4_properties.currency_code),
        time_zone = coalesce(excluded.time_zone, rankcues_ga4_properties.time_zone),
        active = true,
        updated_at = now()
    `;
  }
  return listGa4Properties();
}

export async function listGa4Properties() {
  if (!isDatabaseConfigured()) return [];
  await ensureDatabaseSchema();
  const sql = getDatabase();
  const rows = await sql`
    select p.*, s.site_url,
      coalesce(sum(m.sessions) filter (where m.metric_date >= current_date - interval '27 days'), 0)::double precision as sessions_28d,
      coalesce(sum(m.key_events) filter (where m.metric_date >= current_date - interval '27 days'), 0)::double precision as key_events_28d
    from rankcues_ga4_properties p
    left join rankcues_sites s on s.id = p.site_id
    left join rankcues_ga4_metrics m on m.property_id = p.id
    where p.workspace_id = ${workspaceId()}
    group by p.id, s.site_url
    order by p.display_name
  `;
  return rows.map((row) => ({
    id: String(row.id),
    connectionId: String(row.connection_id),
    siteId: row.site_id ? String(row.site_id) : null,
    siteUrl: row.site_url ? String(row.site_url) : null,
    accountId: String(row.account_id),
    propertyId: String(row.property_id),
    displayName: String(row.display_name),
    currencyCode: row.currency_code ? String(row.currency_code) : null,
    timeZone: row.time_zone ? String(row.time_zone) : null,
    active: Boolean(row.active),
    lastSyncedAt: row.last_synced_at ? new Date(String(row.last_synced_at)) : null,
    lastError: row.last_error ? String(row.last_error) : null,
    sessions28d: Number(row.sessions_28d || 0),
    keyEvents28d: Number(row.key_events_28d || 0),
  }));
}

export async function mapGa4PropertyToSite(propertyId: string, siteId: string | null) {
  await ensureDatabaseSchema();
  const sql = getDatabase();
  const [row] = await sql`
    update rankcues_ga4_properties set
      site_id = ${siteId}, updated_at = now()
    where id = ${propertyId} and workspace_id = ${workspaceId()}
    returning id
  `;
  if (!row) throw new Error("GA4 property was not found in this organization.");
}

export type Ga4MetricInput = {
  date: string;
  landingPage: string;
  sourceMedium: string;
  sessions: number;
  activeUsers: number;
  newUsers: number;
  keyEvents: number;
  engagedSessions: number;
  engagementRate: number;
  averageSessionDuration: number;
};

export async function saveGa4Metrics(propertyId: string, rows: Ga4MetricInput[]) {
  await ensureDatabaseSchema();
  const sql = getDatabase();
  const chunkSize = 500;
  for (let offset = 0; offset < rows.length; offset += chunkSize) {
    const chunk = rows.slice(offset, offset + chunkSize).map((row) => ({
      property_id: propertyId,
      metric_date: row.date,
      landing_page: row.landingPage || "(not set)",
      source_medium: row.sourceMedium || "(not set)",
      sessions: row.sessions,
      active_users: row.activeUsers,
      new_users: row.newUsers,
      key_events: row.keyEvents,
      engaged_sessions: row.engagedSessions,
      engagement_rate: row.engagementRate,
      average_session_duration: row.averageSessionDuration,
    }));
    if (!chunk.length) continue;
    await sql`
      insert into rankcues_ga4_metrics ${sql(
        chunk,
        "property_id", "metric_date", "landing_page", "source_medium",
        "sessions", "active_users", "new_users", "key_events",
        "engaged_sessions", "engagement_rate", "average_session_duration"
      )}
      on conflict (property_id, metric_date, landing_page, source_medium) do update set
        sessions = excluded.sessions,
        active_users = excluded.active_users,
        new_users = excluded.new_users,
        key_events = excluded.key_events,
        engaged_sessions = excluded.engaged_sessions,
        engagement_rate = excluded.engagement_rate,
        average_session_duration = excluded.average_session_duration,
        updated_at = now()
    `;
  }
  await sql`
    update rankcues_ga4_properties set last_synced_at = now(), last_error = null, updated_at = now()
    where id = ${propertyId}
  `;
}

export async function markGa4PropertyError(propertyId: string, message: string) {
  await ensureDatabaseSchema();
  const sql = getDatabase();
  await sql`
    update rankcues_ga4_properties set last_error = ${message.slice(0, 500)}, updated_at = now()
    where id = ${propertyId}
  `;
}

export async function getTrafficOverview(siteId?: string) {
  if (!isDatabaseConfigured()) return { totals: null, daily: [], landingPages: [], properties: [] };
  await ensureDatabaseSchema();
  const sql = getDatabase();
  const selectedSiteId = siteId || null;
  const totals = await sql`
    with bounds as (
      select max(m.metric_date) as end_date
      from rankcues_ga4_metrics m
      join rankcues_ga4_properties p on p.id = m.property_id
      where p.workspace_id = ${workspaceId()}
        and (${selectedSiteId}::text is null or p.site_id = ${selectedSiteId})
    )
    select bounds.end_date,
      sum(m.sessions) filter (where m.metric_date between bounds.end_date - 6 and bounds.end_date)::double precision as sessions,
      sum(m.sessions) filter (where m.metric_date between bounds.end_date - 13 and bounds.end_date - 7)::double precision as previous_sessions,
      sum(m.active_users) filter (where m.metric_date between bounds.end_date - 6 and bounds.end_date)::double precision as active_users,
      sum(m.key_events) filter (where m.metric_date between bounds.end_date - 6 and bounds.end_date)::double precision as key_events,
      avg(m.engagement_rate) filter (where m.metric_date between bounds.end_date - 6 and bounds.end_date)::double precision as engagement_rate
    from rankcues_ga4_metrics m
    join rankcues_ga4_properties p on p.id = m.property_id
    cross join bounds
    where p.workspace_id = ${workspaceId()}
      and (${selectedSiteId}::text is null or p.site_id = ${selectedSiteId})
    group by bounds.end_date
  `;
  const daily = await sql`
    select m.metric_date,
      sum(m.sessions)::double precision as sessions,
      sum(m.active_users)::double precision as active_users,
      sum(m.key_events)::double precision as key_events
    from rankcues_ga4_metrics m
    join rankcues_ga4_properties p on p.id = m.property_id
    where p.workspace_id = ${workspaceId()}
      and (${selectedSiteId}::text is null or p.site_id = ${selectedSiteId})
      and m.metric_date >= current_date - interval '27 days'
    group by m.metric_date order by m.metric_date
  `;
  const landingPages = await sql`
    select m.landing_page,
      sum(m.sessions)::double precision as sessions,
      sum(m.active_users)::double precision as active_users,
      sum(m.key_events)::double precision as key_events,
      avg(m.engagement_rate)::double precision as engagement_rate
    from rankcues_ga4_metrics m
    join rankcues_ga4_properties p on p.id = m.property_id
    where p.workspace_id = ${workspaceId()}
      and (${selectedSiteId}::text is null or p.site_id = ${selectedSiteId})
      and m.metric_date >= current_date - interval '27 days'
    group by m.landing_page order by sessions desc limit 50
  `;
  return {
    totals: totals[0] ? {
      dataThrough: totals[0].end_date ? String(totals[0].end_date).slice(0, 10) : null,
      sessions: Number(totals[0].sessions || 0),
      previousSessions: Number(totals[0].previous_sessions || 0),
      activeUsers: Number(totals[0].active_users || 0),
      keyEvents: Number(totals[0].key_events || 0),
      engagementRate: Number(totals[0].engagement_rate || 0),
    } : null,
    daily: daily.map((row) => ({ date: dateOnly(row.metric_date), sessions: Number(row.sessions || 0), activeUsers: Number(row.active_users || 0), keyEvents: Number(row.key_events || 0) })),
    landingPages: landingPages.map((row) => ({ landingPage: String(row.landing_page), sessions: Number(row.sessions || 0), activeUsers: Number(row.active_users || 0), keyEvents: Number(row.key_events || 0), engagementRate: Number(row.engagement_rate || 0) })),
    properties: await listGa4Properties(),
  };
}

export async function saveBacklinkSnapshot(siteId: string, input: {
  capturedOn: string;
  backlinks: number;
  referringDomains: number;
  referringPages: number;
  dofollow: number;
  newBacklinks: number;
  lostBacklinks: number;
  rank?: number | null;
  raw?: unknown;
}) {
  await ensureDatabaseSchema();
  const sql = getDatabase();
  const id = stableId(siteId, "backlink-summary", input.capturedOn);
  await sql`
    insert into rankcues_backlink_snapshots (
      id, site_id, captured_on, backlinks, referring_domains, referring_pages,
      dofollow, new_backlinks, lost_backlinks, rank, raw
    ) values (
      ${id}, ${siteId}, ${input.capturedOn}, ${input.backlinks},
      ${input.referringDomains}, ${input.referringPages}, ${input.dofollow},
      ${input.newBacklinks}, ${input.lostBacklinks}, ${input.rank ?? null},
      ${sql.json(JSON.parse(JSON.stringify(input.raw ?? {})))}
    )
    on conflict (site_id, captured_on) do update set
      backlinks = excluded.backlinks,
      referring_domains = excluded.referring_domains,
      referring_pages = excluded.referring_pages,
      dofollow = excluded.dofollow,
      new_backlinks = excluded.new_backlinks,
      lost_backlinks = excluded.lost_backlinks,
      rank = excluded.rank,
      raw = excluded.raw
  `;
}

export type BacklinkInput = {
  sourceUrl: string;
  sourceDomain: string;
  targetUrl: string;
  anchor: string;
  dofollow: boolean;
  sourceRank?: number | null;
  firstSeen?: string | null;
  lastSeen: string;
  status?: string;
  raw?: unknown;
};

export async function saveBacklinks(siteId: string, rows: BacklinkInput[]) {
  await ensureDatabaseSchema();
  const sql = getDatabase();
  for (const row of rows.slice(0, 1000)) {
    const id = stableId(siteId, row.sourceUrl, row.targetUrl);
    await sql`
      insert into rankcues_backlinks (
        id, site_id, source_url, source_domain, target_url, anchor,
        dofollow, source_rank, first_seen, last_seen, status, raw
      ) values (
        ${id}, ${siteId}, ${row.sourceUrl}, ${row.sourceDomain}, ${row.targetUrl},
        ${row.anchor}, ${row.dofollow}, ${row.sourceRank ?? null},
        ${row.firstSeen ?? null}, ${row.lastSeen}, ${row.status || "live"},
        ${sql.json(JSON.parse(JSON.stringify(row.raw ?? {})))}
      )
      on conflict (site_id, source_url, target_url) do update set
        anchor = excluded.anchor,
        dofollow = excluded.dofollow,
        source_rank = excluded.source_rank,
        first_seen = coalesce(rankcues_backlinks.first_seen, excluded.first_seen),
        last_seen = excluded.last_seen,
        lost_at = case when excluded.status = 'lost' then excluded.last_seen else null end,
        status = excluded.status,
        raw = excluded.raw,
        updated_at = now()
    `;
  }
}

export async function getBacklinkOverview(siteId?: string) {
  if (!isDatabaseConfigured()) return { latest: null, history: [], backlinks: [] };
  await ensureDatabaseSchema();
  const sql = getDatabase();
  const selectedSiteId = siteId || null;
  const latest = await sql`
    select distinct on (b.site_id) b.*, s.site_url
    from rankcues_backlink_snapshots b
    join rankcues_sites s on s.id = b.site_id
    where s.workspace_id = ${workspaceId()}
      and (${selectedSiteId}::text is null or b.site_id = ${selectedSiteId})
    order by b.site_id, b.captured_on desc
  `;
  const history = await sql`
    select b.*, s.site_url
    from rankcues_backlink_snapshots b
    join rankcues_sites s on s.id = b.site_id
    where s.workspace_id = ${workspaceId()}
      and (${selectedSiteId}::text is null or b.site_id = ${selectedSiteId})
      and b.captured_on >= current_date - interval '90 days'
    order by b.captured_on
  `;
  const backlinks = await sql`
    select b.*, s.site_url
    from rankcues_backlinks b
    join rankcues_sites s on s.id = b.site_id
    where s.workspace_id = ${workspaceId()}
      and (${selectedSiteId}::text is null or b.site_id = ${selectedSiteId})
    order by case b.status when 'lost' then 1 else 0 end, b.source_rank desc nulls last, b.last_seen desc
    limit 100
  `;
  const summarize = (row: Record<string, unknown>) => ({
    siteId: String(row.site_id), siteUrl: String(row.site_url),
    capturedOn: String(row.captured_on).slice(0, 10), backlinks: Number(row.backlinks || 0),
    referringDomains: Number(row.referring_domains || 0), referringPages: Number(row.referring_pages || 0),
    dofollow: Number(row.dofollow || 0), newBacklinks: Number(row.new_backlinks || 0),
    lostBacklinks: Number(row.lost_backlinks || 0), rank: row.rank == null ? null : Number(row.rank),
  });
  return {
    latest: latest.length ? latest.map(summarize) : null,
    history: history.map(summarize),
    backlinks: backlinks.map((row) => ({
      id: String(row.id), siteId: String(row.site_id), siteUrl: String(row.site_url),
      sourceUrl: String(row.source_url), sourceDomain: String(row.source_domain),
      targetUrl: String(row.target_url), anchor: String(row.anchor), dofollow: Boolean(row.dofollow),
      sourceRank: row.source_rank == null ? null : Number(row.source_rank), status: String(row.status),
      firstSeen: row.first_seen ? new Date(String(row.first_seen)) : null,
      lastSeen: new Date(String(row.last_seen)), lostAt: row.lost_at ? new Date(String(row.lost_at)) : null,
    })),
  };
}

export type KeywordRankingFilters = {
  siteId?: string;
  search?: string;
  device?: "ALL" | "DESKTOP" | "MOBILE" | "TABLET";
  trackedOnly?: boolean;
};

export async function getKeywordRankings(filters: KeywordRankingFilters = {}) {
  if (!isDatabaseConfigured()) return [];
  await ensureDatabaseSchema();
  const sql = getDatabase();
  const selectedSiteId = filters.siteId || null;
  const search = filters.search?.trim() || "";
  const searchLike = `%${search.toLowerCase()}%`;
  const device = filters.device || "ALL";
  const observed = await sql`
    with bounds as (
      select m.site_id, max(m.metric_date) as end_date
      from rankcues_gsc_metrics m group by m.site_id
    ), grouped as (
      select m.site_id, s.site_url, m.query, b.end_date,
        sum(m.clicks) filter (where m.metric_date between b.end_date - 6 and b.end_date)::double precision as clicks,
        sum(m.clicks) filter (where m.metric_date between b.end_date - 13 and b.end_date - 7)::double precision as previous_clicks,
        sum(m.impressions) filter (where m.metric_date between b.end_date - 6 and b.end_date)::double precision as impressions,
        sum(m.impressions) filter (where m.metric_date between b.end_date - 13 and b.end_date - 7)::double precision as previous_impressions,
        (
          sum(m.position * m.impressions) filter (where m.metric_date between b.end_date - 6 and b.end_date) /
          nullif(sum(m.impressions) filter (where m.metric_date between b.end_date - 6 and b.end_date), 0)
        )::double precision as position,
        (
          sum(m.position * m.impressions) filter (where m.metric_date between b.end_date - 13 and b.end_date - 7) /
          nullif(sum(m.impressions) filter (where m.metric_date between b.end_date - 13 and b.end_date - 7), 0)
        )::double precision as previous_position,
        (array_agg(m.page order by
          case when m.metric_date between b.end_date - 6 and b.end_date then 0 else 1 end,
          m.clicks desc, m.impressions desc
        ))[1] as page
      from rankcues_gsc_metrics m
      join bounds b on b.site_id = m.site_id
      join rankcues_sites s on s.id = m.site_id
      where s.workspace_id = ${workspaceId()}
        and (${selectedSiteId}::text is null or m.site_id = ${selectedSiteId})
        and (${device} = 'ALL' or upper(m.device) = ${device})
        and (${search} = '' or lower(m.query) like ${searchLike})
        and m.query <> '' and m.metric_date between b.end_date - 13 and b.end_date
      group by m.site_id, s.site_url, m.query, b.end_date
    ), ranked as (
      select grouped.*,
        row_number() over (partition by site_id order by coalesce(impressions, 0) desc, coalesce(clicks, 0) desc) as site_rank
      from grouped
    )
    select * from ranked where site_rank <= 250
    order by coalesce(impressions, 0) desc, coalesce(clicks, 0) desc
    limit 800
  `;
  const tracked = await sql`
    select t.*, s.site_url
    from rankcues_tracked_keywords t
    join rankcues_sites s on s.id = t.site_id
    where t.workspace_id = ${workspaceId()} and t.active = true
      and (${selectedSiteId}::text is null or t.site_id = ${selectedSiteId})
      and (${device} = 'ALL' or t.device = 'ALL' or t.device = ${device})
      and (${search} = '' or lower(t.keyword) like ${searchLike})
    order by t.updated_at desc
  `;
  const trackedByKey = new Map<string, Record<string, unknown>>();
  for (const row of tracked) trackedByKey.set(`${String(row.site_id)}\u001f${String(row.keyword).toLowerCase()}`, row);
  const rankings = observed.map((row) => {
    const trackedRow = trackedByKey.get(`${String(row.site_id)}\u001f${String(row.query).toLowerCase()}`);
    if (trackedRow) trackedByKey.delete(`${String(row.site_id)}\u001f${String(row.query).toLowerCase()}`);
    return {
      id: stableId(String(row.site_id), String(row.query).toLowerCase(), device),
      siteId: String(row.site_id), siteUrl: String(row.site_url), keyword: String(row.query),
      page: String(row.page || ""), clicks: Number(row.clicks || 0), previousClicks: Number(row.previous_clicks || 0),
      impressions: Number(row.impressions || 0), previousImpressions: Number(row.previous_impressions || 0),
      position: Number(row.position || 0), previousPosition: Number(row.previous_position || 0),
      dataThrough: dateOnly(row.end_date), tracked: Boolean(trackedRow),
      trackedId: trackedRow ? String(trackedRow.id) : null,
      trackedDevice: trackedRow ? String(trackedRow.device) : null,
    };
  });
  for (const row of trackedByKey.values()) {
    rankings.unshift({
      id: stableId(String(row.site_id), String(row.keyword).toLowerCase(), device),
      siteId: String(row.site_id), siteUrl: String(row.site_url), keyword: String(row.keyword),
      page: "", clicks: 0, previousClicks: 0, impressions: 0, previousImpressions: 0,
      position: 0, previousPosition: 0, dataThrough: "", tracked: true,
      trackedId: String(row.id), trackedDevice: String(row.device),
    });
  }
  const result = filters.trackedOnly ? rankings.filter((row) => row.tracked) : rankings;
  return result.slice(0, 500);
}

export async function getKeywordRankHistory(input: { siteId: string; keyword: string; device?: string; days?: number }) {
  if (!isDatabaseConfigured()) return [];
  await ensureDatabaseSchema();
  const sql = getDatabase();
  const days = Math.max(7, Math.min(input.days || 35, 120));
  const device = ["DESKTOP", "MOBILE", "TABLET"].includes(input.device || "") ? input.device! : "ALL";
  const rows = await sql`
    select metric_date,
      sum(clicks)::double precision as clicks,
      sum(impressions)::double precision as impressions,
      (sum(position * impressions) / nullif(sum(impressions), 0))::double precision as position
    from rankcues_gsc_metrics
    where site_id = ${input.siteId} and lower(query) = lower(${input.keyword})
      and (${device} = 'ALL' or upper(device) = ${device})
      and metric_date >= current_date - (${days} * interval '1 day')
    group by metric_date order by metric_date
  `;
  return rows.map((row) => ({
    date: dateOnly(row.metric_date), clicks: Number(row.clicks || 0),
    impressions: Number(row.impressions || 0), position: Number(row.position || 0),
  }));
}

export async function setTrackedKeyword(input: { siteId: string; keyword: string; device?: string; active?: boolean; source?: string }) {
  await ensureDatabaseSchema();
  const sql = getDatabase();
  const keyword = input.keyword.trim().replace(/\s+/g, " ").slice(0, 300);
  if (!keyword) throw new Error("Keyword is required.");
  const device = ["DESKTOP", "MOBILE", "TABLET"].includes(input.device || "") ? input.device! : "ALL";
  const [site] = await sql`select id from rankcues_sites where id = ${input.siteId} and workspace_id = ${workspaceId()} limit 1`;
  if (!site) throw new Error("A valid site is required.");
  const id = stableId(workspaceId(), input.siteId, keyword.toLowerCase(), device);
  await sql`
    insert into rankcues_tracked_keywords (id, workspace_id, site_id, keyword, device, source, active)
    values (${id}, ${workspaceId()}, ${input.siteId}, ${keyword}, ${device}, ${input.source || "manual"}, ${input.active !== false})
    on conflict (id) do update set active = excluded.active, source = excluded.source, updated_at = now()
  `;
  return id;
}

export async function untrackKeyword(id: string) {
  await ensureDatabaseSchema();
  const sql = getDatabase();
  await sql`update rankcues_tracked_keywords set active = false, updated_at = now() where id = ${id} and workspace_id = ${workspaceId()}`;
}

export async function getKeywordPortfolio(siteId?: string) {
  const rows = await getKeywordRankings({ siteId });
  return rows.map((row) => ({ ...row, query: row.keyword }));
}

export async function getChangeFeed(siteId?: string, limit = 100) {
  if (!isDatabaseConfigured()) return [];
  await ensureDatabaseSchema();
  const sql = getDatabase();
  const selectedSiteId = siteId || null;
  const rows = await sql`
    select e.*, s.site_url
    from rankcues_events e join rankcues_sites s on s.id = e.site_id
    where s.workspace_id = ${workspaceId()}
      and (${selectedSiteId}::text is null or e.site_id = ${selectedSiteId})
    order by e.occurred_at desc
    limit ${Math.max(1, Math.min(limit, 500))}
  `;
  return rows.map((row) => ({
    id: String(row.id), siteId: String(row.site_id), siteUrl: String(row.site_url),
    source: String(row.source), kind: String(row.kind), occurredAt: new Date(String(row.occurred_at)),
    title: String(row.title), description: String(row.description), evidenceState: String(row.evidence_state),
    impact: String(row.impact), metadata: row.metadata as Record<string, unknown>,
  }));
}

export async function listReports(siteId?: string) {
  if (!isDatabaseConfigured()) return [];
  await ensureDatabaseSchema();
  const sql = getDatabase();
  const selectedSiteId = siteId || null;
  const rows = await sql`
    select r.*, s.site_url
    from rankcues_weekly_reports r join rankcues_sites s on s.id = r.site_id
    where s.workspace_id = ${workspaceId()}
      and (${selectedSiteId}::text is null or r.site_id = ${selectedSiteId})
    order by r.period_end desc, r.generated_at desc
  `;
  return rows.map((row) => {
    const report = row.report as Record<string, unknown>;
    const meta = report?._meta && typeof report._meta === "object" && !Array.isArray(report._meta)
      ? report._meta as Record<string, unknown>
      : {};
    const storedLocale = meta.outputLocale;
    const outputLocale = storedLocale === "en" || storedLocale === "zh" || storedLocale === "es" ? storedLocale : null;
    return {
      id: String(row.id), siteId: String(row.site_id), siteUrl: String(row.site_url),
      title: row.title ? String(row.title) : `Weekly investigation · ${String(row.period_end).slice(0, 10)}`,
      status: String(row.status || "completed"), periodStart: String(row.period_start).slice(0, 10),
      periodEnd: String(row.period_end).slice(0, 10), report, outputLocale,
      provider: row.provider as Record<string, unknown>, usage: row.usage as Record<string, unknown>,
      generatedAt: new Date(String(row.generated_at)),
    };
  });
}

export async function getAutomationOverview() {
  if (!isDatabaseConfigured()) return { runs: [], activeSites: 0, monitoredSites: 0 };
  await ensureDatabaseSchema();
  const sql = getDatabase();
  const runs = await sql`
    select r.*, s.site_url
    from rankcues_sync_runs r left join rankcues_sites s on s.id = r.site_id
    where (s.workspace_id = ${workspaceId()} or s.id is null)
    order by r.started_at desc limit 50
  `;
  const [counts] = await sql`
    select count(*) filter (where active)::integer as active_sites,
      count(*) filter (where active and monitor_enabled)::integer as monitored_sites
    from rankcues_sites where workspace_id = ${workspaceId()}
  `;
  return {
    activeSites: Number(counts?.active_sites || 0),
    monitoredSites: Number(counts?.monitored_sites || 0),
    runs: runs.map((row) => ({
      id: String(row.id), siteUrl: row.site_url ? String(row.site_url) : null,
      source: String(row.source), status: String(row.status), rowsWritten: Number(row.rows_written || 0),
      details: row.details as Record<string, unknown>, error: row.error ? String(row.error) : null,
      startedAt: new Date(String(row.started_at)), completedAt: row.completed_at ? new Date(String(row.completed_at)) : null,
    })),
  };
}

export async function listTasks(siteId?: string) {
  if (!isDatabaseConfigured()) return [];
  await ensureDatabaseSchema();
  const sql = getDatabase();
  const missingReports = await sql`
    select r.id, r.site_id, r.report
    from rankcues_weekly_reports r
    join rankcues_sites s on s.id = r.site_id
    where s.workspace_id = ${workspaceId()}
      and jsonb_typeof(r.report->'findings') = 'array'
      and not exists (select 1 from rankcues_tasks t where t.report_id = r.id)
    order by r.generated_at desc limit 10
  `;
  for (const row of missingReports) {
    const report = (row.report || {}) as { findings?: unknown };
    if (Array.isArray(report.findings)) {
      await createTasksFromWeeklyReport({
        reportId: String(row.id),
        siteId: String(row.site_id),
        findings: report.findings as Array<{
          title: string; impact: "high" | "medium" | "low"; confidence: number;
          affectedEntity: string; evidence: Array<{ state: string; statement: string; source: string }>;
          recommendedAction: string; verificationWindow: string;
        }>,
      });
    }
  }
  const selectedSiteId = siteId || null;
  const rows = await sql`
    select t.*, s.site_url from rankcues_tasks t
    left join rankcues_sites s on s.id = t.site_id
    where t.workspace_id = ${workspaceId()}
      and (${selectedSiteId}::text is null or t.site_id = ${selectedSiteId})
    order by case t.approval_status when 'pending' then 1 when 'approved' then 2 else 3 end,
      case t.status when 'in_progress' then 1 when 'open' then 2 else 3 end,
      case t.priority when 'high' then 1 when 'medium' then 2 else 3 end, t.created_at desc
  `;
  return rows.map((row) => ({
    id: String(row.id), siteId: row.site_id ? String(row.site_id) : null,
    siteUrl: row.site_url ? String(row.site_url) : null, eventId: row.event_id ? String(row.event_id) : null,
    title: String(row.title), description: String(row.description), status: String(row.status),
    priority: String(row.priority), source: String(row.source), dueAt: row.due_at ? new Date(String(row.due_at)) : null,
    reportId: row.report_id ? String(row.report_id) : null,
    findingIndex: row.finding_index === null || row.finding_index === undefined ? null : Number(row.finding_index),
    recommendation: String(row.recommendation || ""),
    evidence: (row.evidence || {}) as Record<string, unknown>,
    baseline: (row.baseline || {}) as Record<string, unknown>,
    result: (row.result || {}) as Record<string, unknown>,
    approvalStatus: String(row.approval_status || "approved"),
    measurementStatus: String(row.measurement_status || "not_scheduled"),
    verificationWindowDays: Number(row.verification_window_days || 28),
    verificationDueAt: row.verification_due_at ? new Date(String(row.verification_due_at)) : null,
    verifiedAt: row.verified_at ? new Date(String(row.verified_at)) : null,
    outcomeSummary: String(row.outcome_summary || ""),
    completedAt: row.completed_at ? new Date(String(row.completed_at)) : null,
    createdAt: new Date(String(row.created_at)),
  }));
}

export type TaskMeasurementSnapshot = {
  capturedAt: string;
  gsc: null | { dataThrough: string | null; clicks: number; impressions: number; ctr: number; position: number };
  ga4: null | { dataThrough: string | null; sessions: number; activeUsers: number; keyEvents: number };
  backlinks: null | { capturedOn: string; backlinks: number; referringDomains: number };
};

async function captureTaskMeasurement(siteId: string): Promise<TaskMeasurementSnapshot> {
  const sql = getDatabase();
  const [gsc] = await sql`
    with bounds as (
      select max(metric_date) as end_date from rankcues_gsc_metrics where site_id = ${siteId}
    )
    select bounds.end_date,
      sum(clicks)::double precision as clicks,
      sum(impressions)::double precision as impressions,
      case when sum(impressions) > 0 then sum(clicks) / sum(impressions) else 0 end::double precision as ctr,
      avg(position)::double precision as position
    from rankcues_gsc_metrics cross join bounds
    where site_id = ${siteId} and metric_date between bounds.end_date - 6 and bounds.end_date
    group by bounds.end_date
  `;
  const [ga4] = await sql`
    with bounds as (
      select max(m.metric_date) as end_date
      from rankcues_ga4_metrics m join rankcues_ga4_properties p on p.id = m.property_id
      where p.site_id = ${siteId}
    )
    select bounds.end_date, sum(m.sessions)::double precision as sessions,
      sum(m.active_users)::double precision as active_users,
      sum(m.key_events)::double precision as key_events
    from rankcues_ga4_metrics m
    join rankcues_ga4_properties p on p.id = m.property_id cross join bounds
    where p.site_id = ${siteId} and m.metric_date between bounds.end_date - 6 and bounds.end_date
    group by bounds.end_date
  `;
  const [backlinks] = await sql`
    select captured_on, backlinks, referring_domains
    from rankcues_backlink_snapshots where site_id = ${siteId}
    order by captured_on desc limit 1
  `;
  return {
    capturedAt: new Date().toISOString(),
    gsc: gsc?.end_date ? {
      dataThrough: String(gsc.end_date).slice(0, 10), clicks: Number(gsc.clicks || 0),
      impressions: Number(gsc.impressions || 0), ctr: Number(gsc.ctr || 0), position: Number(gsc.position || 0),
    } : null,
    ga4: ga4?.end_date ? {
      dataThrough: String(ga4.end_date).slice(0, 10), sessions: Number(ga4.sessions || 0),
      activeUsers: Number(ga4.active_users || 0), keyEvents: Number(ga4.key_events || 0),
    } : null,
    backlinks: backlinks ? {
      capturedOn: String(backlinks.captured_on).slice(0, 10), backlinks: Number(backlinks.backlinks || 0),
      referringDomains: Number(backlinks.referring_domains || 0),
    } : null,
  };
}

async function persistTaskMeasurement(taskId: string, phase: "baseline" | "result", snapshot: TaskMeasurementSnapshot) {
  const sql = getDatabase();
  const id = stableId(taskId, phase);
  const json = sql.json(JSON.parse(JSON.stringify(snapshot)));
  await sql`
    insert into rankcues_task_measurements (id, task_id, phase, snapshot, measured_at)
    values (${id}, ${taskId}, ${phase}, ${json}, now())
    on conflict (task_id, phase) do update set snapshot = excluded.snapshot, measured_at = now()
  `;
}

export async function createTask(input: { siteId?: string | null; eventId?: string | null; title: string; description?: string; priority?: string; source?: string }) {
  await ensureDatabaseSchema();
  const sql = getDatabase();
  const id = randomUUID();
  const baseline = input.siteId ? await captureTaskMeasurement(input.siteId) : null;
  await sql`
    insert into rankcues_tasks (id, workspace_id, site_id, event_id, title, description, priority, source, baseline)
    values (${id}, ${workspaceId()}, ${input.siteId ?? null}, ${input.eventId ?? null},
      ${input.title.trim().slice(0, 180)}, ${(input.description || "").slice(0, 2000)},
      ${input.priority || "medium"}, ${input.source || "manual"},
      ${sql.json(JSON.parse(JSON.stringify(baseline || {})))})
  `;
  if (baseline) await persistTaskMeasurement(id, "baseline", baseline);
  return id;
}

function verificationDays(value: string) {
  const match = value.match(/\d+/);
  return Math.max(7, Math.min(90, match ? Number(match[0]) : 28));
}

export async function createTasksFromWeeklyReport(input: {
  reportId: string;
  siteId: string;
  findings: Array<{
    title: string;
    impact: "high" | "medium" | "low";
    confidence: number;
    affectedEntity: string;
    evidence: Array<{ state: string; statement: string; source: string }>;
    recommendedAction: string;
    verificationWindow: string;
  }>;
}) {
  await ensureDatabaseSchema();
  const sql = getDatabase();
  const baseline = await captureTaskMeasurement(input.siteId);
  const ids: string[] = [];
  for (const [index, finding] of input.findings.entries()) {
    const id = stableId(workspaceId(), input.reportId, "finding", String(index));
    const evidence = {
      confidence: finding.confidence,
      affectedEntity: finding.affectedEntity,
      items: finding.evidence,
      verificationWindow: finding.verificationWindow,
    };
    await sql`
      insert into rankcues_tasks (
        id, workspace_id, site_id, report_id, finding_index, title, description,
        recommendation, evidence, baseline, status, approval_status,
        measurement_status, priority, source, verification_window_days
      ) values (
        ${id}, ${workspaceId()}, ${input.siteId}, ${input.reportId}, ${index},
        ${finding.title.slice(0, 180)}, ${finding.affectedEntity.slice(0, 2000)},
        ${finding.recommendedAction.slice(0, 4000)},
        ${sql.json(JSON.parse(JSON.stringify(evidence)))},
        ${sql.json(JSON.parse(JSON.stringify(baseline)))},
        'open', 'pending', 'not_scheduled', ${finding.impact}, 'ai_report',
        ${verificationDays(finding.verificationWindow)}
      )
      on conflict (report_id, finding_index) where report_id is not null and finding_index is not null
      do update set title = excluded.title, description = excluded.description,
        recommendation = excluded.recommendation, evidence = excluded.evidence,
        priority = excluded.priority, verification_window_days = excluded.verification_window_days,
        updated_at = now()
    `;
    await persistTaskMeasurement(id, "baseline", baseline);
    ids.push(id);
  }
  return ids;
}

function numberAt(snapshot: Record<string, unknown>, group: string, metric: string) {
  const value = (snapshot[group] as Record<string, unknown> | null | undefined)?.[metric];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function evaluateTaskOutcome(baseline: Record<string, unknown>, result: Record<string, unknown>) {
  const signals: Array<{ label: string; change: number; direction: "positive" | "negative" | "flat" }> = [];
  const add = (label: string, before: number | null, after: number | null, lowerIsBetter = false) => {
    if (before === null || after === null || before === 0) return;
    const raw = ((after - before) / Math.abs(before)) * 100;
    const adjusted = lowerIsBetter ? -raw : raw;
    signals.push({ label, change: raw, direction: adjusted >= 5 ? "positive" : adjusted <= -5 ? "negative" : "flat" });
  };
  add("GSC clicks", numberAt(baseline, "gsc", "clicks"), numberAt(result, "gsc", "clicks"));
  add("GSC impressions", numberAt(baseline, "gsc", "impressions"), numberAt(result, "gsc", "impressions"));
  add("Average position", numberAt(baseline, "gsc", "position"), numberAt(result, "gsc", "position"), true);
  add("GA4 sessions", numberAt(baseline, "ga4", "sessions"), numberAt(result, "ga4", "sessions"));
  add("GA4 key events", numberAt(baseline, "ga4", "keyEvents"), numberAt(result, "ga4", "keyEvents"));
  add("Referring domains", numberAt(baseline, "backlinks", "referringDomains"), numberAt(result, "backlinks", "referringDomains"));
  const positive = signals.filter((signal) => signal.direction === "positive").length;
  const negative = signals.filter((signal) => signal.direction === "negative").length;
  const status = signals.length === 0 ? "inconclusive" : positive >= 2 && positive > negative ? "improved" : negative >= 2 && negative > positive ? "regressed" : "neutral";
  const details = signals.map((signal) => `${signal.label} ${signal.change >= 0 ? "+" : ""}${signal.change.toFixed(1)}%`).join("; ");
  return { status, summary: signals.length ? `${status}: ${details}` : "inconclusive: no comparable GSC, GA4, or backlink measurements were available.", signals };
}

export async function updateTaskWorkflow(id: string, action: "approve" | "reject" | "start" | "complete" | "reopen") {
  await ensureDatabaseSchema();
  const sql = getDatabase();
  const [task] = await sql`select * from rankcues_tasks where id = ${id} and workspace_id = ${workspaceId()} limit 1`;
  if (!task) return null;
  if (action === "reject") {
    await sql`update rankcues_tasks set approval_status = 'rejected', updated_at = now() where id = ${id}`;
  } else if (action === "approve") {
    await sql`update rankcues_tasks set approval_status = 'approved', status = 'open', updated_at = now() where id = ${id}`;
  } else if (action === "start") {
    await sql`update rankcues_tasks set approval_status = 'approved', status = 'in_progress', updated_at = now() where id = ${id}`;
  } else if (action === "complete") {
    const days = Number(task.verification_window_days || 28);
    const existingBaseline = (task.baseline || {}) as Record<string, unknown>;
    const baseline = task.site_id && Object.keys(existingBaseline).length === 0
      ? await captureTaskMeasurement(String(task.site_id))
      : existingBaseline;
    if (task.site_id && "capturedAt" in baseline) {
      await persistTaskMeasurement(id, "baseline", baseline as TaskMeasurementSnapshot);
    }
    await sql`
      update rankcues_tasks set approval_status = 'approved', status = 'done', completed_at = now(),
        baseline = ${sql.json(JSON.parse(JSON.stringify(baseline)))},
        measurement_status = case when site_id is null then 'inconclusive' else 'scheduled' end,
        verification_due_at = case when site_id is null then null else now() + (${days} * interval '1 day') end,
        verified_at = case when site_id is null then now() else null end,
        result = '{}'::jsonb,
        outcome_summary = case when site_id is null then 'inconclusive: portfolio tasks do not map to a single measurable site.' else '' end,
        updated_at = now()
      where id = ${id}
    `;
  } else {
    await sql`
      update rankcues_tasks set status = 'open', completed_at = null,
        measurement_status = 'not_scheduled', verification_due_at = null,
        verified_at = null, result = '{}'::jsonb, outcome_summary = '', updated_at = now()
      where id = ${id}
    `;
  }
  return { id, action };
}

export async function verifyTaskOutcome(id: string, force = false) {
  await ensureDatabaseSchema();
  const sql = getDatabase();
  const [task] = await sql`select * from rankcues_tasks where id = ${id} and workspace_id = ${workspaceId()} limit 1`;
  if (!task || !task.site_id || task.status !== "done") return null;
  if (!force && task.verification_due_at && new Date(String(task.verification_due_at)) > new Date()) return null;
  const result = await captureTaskMeasurement(String(task.site_id));
  const baseline = (task.baseline || {}) as Record<string, unknown>;
  const outcome = evaluateTaskOutcome(baseline, result as unknown as Record<string, unknown>);
  await persistTaskMeasurement(id, "result", result);
  await sql`
    update rankcues_tasks set result = ${sql.json(JSON.parse(JSON.stringify(result)))},
      measurement_status = ${outcome.status}, outcome_summary = ${outcome.summary},
      verified_at = now(), updated_at = now()
    where id = ${id}
  `;
  await saveEvidenceEvent(String(task.site_id), {
    id: stableId(String(task.site_id), "task-verification", id, result.capturedAt.slice(0, 10)),
    source: "automation", kind: "task_verification", occurredAt: new Date(),
    title: `Task verification: ${String(task.title)}`,
    description: outcome.summary,
    evidenceState: "detected", impact: outcome.status === "regressed" ? "high" : outcome.status === "improved" ? "medium" : "low",
    metadata: { taskId: id, outcome: outcome.status, signals: outcome.signals },
  });
  return { id, ...outcome };
}

export async function verifyDueTasks(limit = 50) {
  await ensureDatabaseSchema();
  const sql = getDatabase();
  const rows = await sql`
    select id from rankcues_tasks
    where workspace_id = ${workspaceId()} and status = 'done'
      and measurement_status = 'scheduled' and verification_due_at <= now()
    order by verification_due_at limit ${Math.max(1, Math.min(limit, 200))}
  `;
  const results = [];
  for (const row of rows) {
    try { results.push({ ok: true, ...(await verifyTaskOutcome(String(row.id))) }); }
    catch (error) { results.push({ ok: false, id: String(row.id), error: error instanceof Error ? error.message : "Verification failed." }); }
  }
  return results;
}

export async function getWorkspaceLocale() {
  if (!isDatabaseConfigured()) return "en";
  await ensureDatabaseSchema();
  const sql = getDatabase();
  const [row] = await sql`select preferred_locale from rankcues_workspaces where id = ${workspaceId()} limit 1`;
  const locale = String(row?.preferred_locale || "en");
  return locale === "zh" || locale === "es" ? locale : "en";
}

export async function setWorkspaceLocale(locale: "en" | "zh" | "es") {
  await ensureDatabaseSchema();
  const sql = getDatabase();
  await sql`
    update rankcues_workspaces set preferred_locale = ${locale}, updated_at = now()
    where id = ${workspaceId()}
  `;
}

export async function upsertWordPressConnection(input: {
  siteId: string;
  baseUrl: string;
  username: string;
  applicationPassword: string;
  remoteUserId?: number | null;
  remoteDisplayName?: string | null;
  capabilities?: Record<string, unknown>;
}) {
  await ensureDatabaseSchema();
  const sql = getDatabase();
  const currentWorkspaceId = workspaceId();
  const id = stableId(currentWorkspaceId, "wordpress", input.siteId);
  const passwordCipher = encryptSecret(input.applicationPassword);
  const [row] = await sql`
    insert into rankcues_wordpress_connections (
      id, workspace_id, site_id, base_url, username, application_password_cipher,
      remote_user_id, remote_display_name, capabilities, status, last_error, last_verified_at
    ) values (
      ${id}, ${currentWorkspaceId}, ${input.siteId}, ${input.baseUrl}, ${input.username},
      ${passwordCipher}, ${input.remoteUserId ?? null}, ${input.remoteDisplayName ?? null},
      ${sql.json(JSON.parse(JSON.stringify(input.capabilities || {})))},
      'connected', null, now()
    )
    on conflict (workspace_id, site_id) do update set
      base_url = excluded.base_url,
      username = excluded.username,
      application_password_cipher = excluded.application_password_cipher,
      remote_user_id = excluded.remote_user_id,
      remote_display_name = excluded.remote_display_name,
      capabilities = excluded.capabilities,
      status = 'connected',
      last_error = null,
      last_verified_at = now(),
      updated_at = now()
    returning *
  `;
  return mapWordPressConnection(row);
}

export async function listWordPressConnections() {
  if (!isDatabaseConfigured()) return [];
  await ensureDatabaseSchema();
  const sql = getDatabase();
  const rows = await sql`
    select c.*, s.site_url
    from rankcues_wordpress_connections c
    join rankcues_sites s on s.id = c.site_id
    where c.workspace_id = ${workspaceId()}
    order by c.updated_at desc
  `;
  return rows.map((row) => ({
    ...mapWordPressConnection(row),
    siteUrl: String(row.site_url),
  }));
}

export async function getWordPressCredentialsForSite(siteId: string) {
  await ensureDatabaseSchema();
  const sql = getDatabase();
  const [row] = await sql`
    select * from rankcues_wordpress_connections
    where workspace_id = ${workspaceId()} and site_id = ${siteId} and status = 'connected'
    limit 1
  `;
  if (!row) return null;
  return {
    ...mapWordPressConnection(row),
    applicationPassword: decryptSecret(String(row.application_password_cipher)),
  };
}

export async function disconnectWordPressConnection(id: string) {
  await ensureDatabaseSchema();
  const sql = getDatabase();
  const result = await sql`
    delete from rankcues_wordpress_connections
    where id = ${id} and workspace_id = ${workspaceId()}
    returning id
  `;
  return result.length > 0;
}

export async function markWordPressConnectionError(id: string, error: string) {
  await ensureDatabaseSchema();
  const sql = getDatabase();
  await sql`
    update rankcues_wordpress_connections
    set status = 'needs_attention', last_error = ${error.slice(0, 500)}, updated_at = now()
    where id = ${id} and workspace_id = ${workspaceId()}
  `;
}

export async function upsertGitHubInstallation(input: {
  installationId: number;
  accountLogin: string;
  accountType: string;
  accountAvatarUrl?: string | null;
  repositorySelection: string;
  permissions: Record<string, unknown>;
}) {
  await ensureDatabaseSchema();
  const sql = getDatabase();
  const currentWorkspaceId = workspaceId();
  const id = stableId(currentWorkspaceId, "github-installation", String(input.installationId));
  const [row] = await sql`
    insert into rankcues_github_installations (
      id, workspace_id, installation_id, account_login, account_type,
      account_avatar_url, repository_selection, permissions, status,
      last_error, last_verified_at
    ) values (
      ${id}, ${currentWorkspaceId}, ${input.installationId}, ${input.accountLogin},
      ${input.accountType}, ${input.accountAvatarUrl ?? null}, ${input.repositorySelection},
      ${sql.json(JSON.parse(JSON.stringify(input.permissions)))}, 'connected', null, now()
    )
    on conflict (workspace_id, installation_id) do update set
      account_login = excluded.account_login,
      account_type = excluded.account_type,
      account_avatar_url = excluded.account_avatar_url,
      repository_selection = excluded.repository_selection,
      permissions = excluded.permissions,
      status = 'connected',
      last_error = null,
      last_verified_at = now(),
      updated_at = now()
    returning *
  `;
  return mapGitHubInstallation(row);
}

export async function syncGitHubRepositories(installation: StoredGitHubInstallation, repositories: Array<{
  id: number;
  fullName: string;
  defaultBranch: string;
  private: boolean;
  htmlUrl: string;
}>) {
  await ensureDatabaseSchema();
  const sql = getDatabase();
  await sql`
    update rankcues_github_repositories
    set active = false, updated_at = now()
    where workspace_id = ${workspaceId()} and installation_id = ${installation.id}
  `;
  for (const repository of repositories.slice(0, 500)) {
    const id = stableId(workspaceId(), "github-repository", String(repository.id));
    await sql`
      insert into rankcues_github_repositories (
        id, workspace_id, installation_id, repository_id, full_name,
        default_branch, private, html_url, active
      ) values (
        ${id}, ${workspaceId()}, ${installation.id}, ${repository.id}, ${repository.fullName},
        ${repository.defaultBranch}, ${repository.private}, ${repository.htmlUrl}, true
      )
      on conflict (workspace_id, repository_id) do update set
        installation_id = excluded.installation_id,
        full_name = excluded.full_name,
        default_branch = excluded.default_branch,
        private = excluded.private,
        html_url = excluded.html_url,
        active = true,
        updated_at = now()
    `;
  }
}

export async function listGitHubInstallations() {
  if (!isDatabaseConfigured()) return [];
  await ensureDatabaseSchema();
  const sql = getDatabase();
  const rows = await sql`
    select * from rankcues_github_installations
    where workspace_id = ${workspaceId()}
    order by updated_at desc
  `;
  return rows.map(mapGitHubInstallation);
}

export async function listGitHubRepositories() {
  if (!isDatabaseConfigured()) return [];
  await ensureDatabaseSchema();
  const sql = getDatabase();
  const rows = await sql`
    select * from rankcues_github_repositories
    where workspace_id = ${workspaceId()} and active = true
    order by full_name
  `;
  return rows.map(mapGitHubRepository);
}

export async function mapGitHubRepositoryToSite(repositoryId: string, siteId: string | null) {
  await ensureDatabaseSchema();
  const sql = getDatabase();
  if (siteId) {
    await sql`
      update rankcues_github_repositories
      set site_id = null, updated_at = now()
      where workspace_id = ${workspaceId()} and site_id = ${siteId}
    `;
  }
  const [row] = await sql`
    update rankcues_github_repositories
    set site_id = ${siteId}, updated_at = now()
    where id = ${repositoryId} and workspace_id = ${workspaceId()} and active = true
    returning *
  `;
  return row ? mapGitHubRepository(row) : null;
}

export async function getGitHubRepositoryForSite(siteId: string) {
  await ensureDatabaseSchema();
  const sql = getDatabase();
  const [row] = await sql`
    select r.*, i.installation_id as remote_installation_id
    from rankcues_github_repositories r
    join rankcues_github_installations i on i.id = r.installation_id
    where r.workspace_id = ${workspaceId()} and r.site_id = ${siteId}
      and r.active = true and i.status = 'connected'
    limit 1
  `;
  return row ? {
    ...mapGitHubRepository(row),
    remoteInstallationId: Number(row.remote_installation_id),
  } : null;
}

export async function disconnectGitHubInstallation(id: string) {
  await ensureDatabaseSchema();
  const sql = getDatabase();
  const result = await sql`
    delete from rankcues_github_installations
    where id = ${id} and workspace_id = ${workspaceId()}
    returning id
  `;
  return result.length > 0;
}

export async function getTaskForExecution(taskId: string) {
  await ensureDatabaseSchema();
  const sql = getDatabase();
  const [row] = await sql`
    select t.*, s.site_url
    from rankcues_tasks t
    left join rankcues_sites s on s.id = t.site_id
    where t.id = ${taskId} and t.workspace_id = ${workspaceId()}
    limit 1
  `;
  if (!row) return null;
  return {
    id: String(row.id),
    siteId: row.site_id ? String(row.site_id) : null,
    siteUrl: row.site_url ? String(row.site_url) : null,
    title: String(row.title),
    description: String(row.description || ""),
    recommendation: String(row.recommendation || ""),
    evidence: (row.evidence || {}) as Record<string, unknown>,
    status: String(row.status),
    approvalStatus: String(row.approval_status || "approved"),
    source: String(row.source),
  };
}

export async function createTaskExecution(input: {
  taskId: string;
  connector: "wordpress" | "github";
  beforeSnapshot?: Record<string, unknown>;
}) {
  await ensureDatabaseSchema();
  const sql = getDatabase();
  const id = randomUUID();
  const [row] = await sql`
    insert into rankcues_task_executions (
      id, workspace_id, task_id, connector, status, before_snapshot
    ) values (
      ${id}, ${workspaceId()}, ${input.taskId}, ${input.connector}, 'preparing',
      ${sql.json(JSON.parse(JSON.stringify(input.beforeSnapshot || {})))}
    )
    returning *
  `;
  return mapTaskExecution(row);
}

export async function setTaskExecutionPreview(id: string, input: {
  risk: "low" | "medium" | "high";
  plan: Record<string, unknown>;
  beforeSnapshot?: Record<string, unknown>;
}) {
  await ensureDatabaseSchema();
  const sql = getDatabase();
  const [row] = await sql`
    update rankcues_task_executions
    set status = 'preview_ready', risk = ${input.risk},
      plan = ${sql.json(JSON.parse(JSON.stringify(input.plan)))},
      before_snapshot = ${sql.json(JSON.parse(JSON.stringify(input.beforeSnapshot || {})))},
      error = null, updated_at = now()
    where id = ${id} and workspace_id = ${workspaceId()}
    returning *
  `;
  return row ? mapTaskExecution(row) : null;
}

export async function getTaskExecutionById(id: string) {
  await ensureDatabaseSchema();
  const sql = getDatabase();
  const [row] = await sql`
    select * from rankcues_task_executions
    where id = ${id} and workspace_id = ${workspaceId()}
    limit 1
  `;
  return row ? mapTaskExecution(row) : null;
}

export async function claimTaskExecution(id: string) {
  await ensureDatabaseSchema();
  const sql = getDatabase();
  const [row] = await sql`
    update rankcues_task_executions
    set status = 'executing', approved_at = now(), error = null, updated_at = now()
    where id = ${id} and workspace_id = ${workspaceId()} and status = 'preview_ready'
    returning *
  `;
  return row ? mapTaskExecution(row) : null;
}

export async function listLatestTaskExecutions() {
  if (!isDatabaseConfigured()) return [];
  await ensureDatabaseSchema();
  const sql = getDatabase();
  const rows = await sql`
    select distinct on (task_id) *
    from rankcues_task_executions
    where workspace_id = ${workspaceId()}
    order by task_id, created_at desc
  `;
  return rows.map(mapTaskExecution);
}

export async function setTaskExecutionStatus(id: string, input: {
  status: "executing" | "draft_created" | "pr_created" | "failed" | "reverted";
  afterSnapshot?: Record<string, unknown>;
  externalId?: string | null;
  externalUrl?: string | null;
  error?: string | null;
  approved?: boolean;
}) {
  await ensureDatabaseSchema();
  const sql = getDatabase();
  const afterSnapshot = sql.json(JSON.parse(JSON.stringify(input.afterSnapshot || {})));
  const [row] = await sql`
    update rankcues_task_executions
    set status = ${input.status},
      after_snapshot = case when ${Boolean(input.afterSnapshot)} then ${afterSnapshot} else after_snapshot end,
      external_id = coalesce(${input.externalId ?? null}, external_id),
      external_url = coalesce(${input.externalUrl ?? null}, external_url),
      error = ${input.error ?? null},
      approved_at = case when ${Boolean(input.approved)} then now() else approved_at end,
      executed_at = case when ${["draft_created", "pr_created"].includes(input.status)} then now() else executed_at end,
      reverted_at = case when ${input.status === "reverted"} then now() else reverted_at end,
      updated_at = now()
    where id = ${id} and workspace_id = ${workspaceId()}
    returning *
  `;
  if (row && ["draft_created", "pr_created"].includes(input.status)) {
    await sql`
      update rankcues_tasks
      set status = 'in_progress', approval_status = 'approved', updated_at = now()
      where id = ${String(row.task_id)} and workspace_id = ${workspaceId()}
    `;
  }
  return row ? mapTaskExecution(row) : null;
}
