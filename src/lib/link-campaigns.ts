import { createHash, randomUUID } from "node:crypto";
import { load } from "cheerio";
import { z } from "zod";
import { getDatabase, isDatabaseConfigured } from "@/lib/database";
import { ensureLinkCampaignSchema } from "@/lib/link-schema";
import {
  canTransitionLinkStatus,
  classifyLinkOpportunity,
  linkMatchesTarget,
  normalizePublicHttpsUrl,
  type ImportedLinkOpportunity,
  type LinkOpportunityStatus,
  type LinkPermissionState,
  type LinkRisk,
  type LinkSubmissionMode,
} from "@/lib/link-campaign-model";
import { stableId } from "@/lib/data-store";

export type StoredLinkCampaign = {
  id: string;
  workspaceId: string;
  siteId: string;
  siteUrl: string;
  name: string;
  status: "draft" | "active" | "paused" | "completed";
  discoveryLimit: number;
  targetUrl: string;
  profile: Record<string, unknown>;
  approvedByEmail: string | null;
  approvedAt: Date | null;
  createdAt: Date;
  discoveredCount: number;
  verifiedCount: number;
  needsActionCount: number;
};

export type StoredLinkOpportunity = {
  id: string;
  campaignId: string;
  siteId: string;
  source: "manual_import" | "dataforseo_gap" | "lost_link" | "partner";
  category: "directory" | "resource_page" | "unlinked_mention" | "lost_link" | "partner" | "editorial";
  destinationName: string;
  destinationDomain: string;
  sourceUrl: string;
  submissionUrl: string | null;
  targetUrl: string;
  relevanceScore: number;
  authorityScore: number | null;
  spamScore: number | null;
  rationale: string;
  risk: LinkRisk;
  status: LinkOpportunityStatus;
  submissionMode: LinkSubmissionMode;
  permissionState: LinkPermissionState;
  policyEvidenceUrl: string | null;
  publicListingUrl: string | null;
  lastError: string | null;
  metadata: Record<string, unknown>;
  submissionId: string | null;
  httpStatus: number | null;
  indexable: boolean | null;
  linkRel: string[];
  lastCheckedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type StoredLinkEvent = {
  id: string;
  eventType: string;
  actorType: "user" | "worker" | "system";
  actorEmail: string | null;
  fromStatus: string | null;
  toStatus: string | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
};

export type LinkCampaignPageData = {
  sites: Array<{ id: string; siteUrl: string }>;
  campaigns: StoredLinkCampaign[];
  selectedCampaign: StoredLinkCampaign | null;
  opportunities: StoredLinkOpportunity[];
  selectedOpportunity: StoredLinkOpportunity | null;
  events: StoredLinkEvent[];
  counts: Record<LinkOpportunityStatus, number>;
  workspaceEnabled: boolean;
  role: string | null;
  canManage: boolean;
  authorizedTargetCount: number;
};

export type DiscoveredLinkOpportunityInput = {
  sourceUrl: string;
  submissionUrl?: string | null;
  destinationName: string;
  source: "manual_import" | "dataforseo_gap" | "lost_link" | "partner";
  category?: StoredLinkOpportunity["category"];
  relevanceScore?: number;
  authorityScore?: number | null;
  spamScore?: number | null;
  rationale?: string;
  risk?: LinkRisk;
  metadata?: Record<string, unknown>;
  policyEvidenceUrl?: string | null;
};

const executorResponseSchema = z.object({
  status: z.enum(["submitted", "pending_review", "needs_action", "rejected"]),
  externalId: z.string().max(500).optional(),
  publicUrl: z.string().url().optional(),
  message: z.string().max(2000).optional(),
});

export function getLinkCampaignPublicStatus() {
  const enabled = process.env.LINK_CAMPAIGNS_ENABLED === "true";
  const executorUrl = normalizePublicHttpsUrl(process.env.LINK_EXECUTOR_URL);
  const autoExecutionConfigured = Boolean(
    enabled
    && process.env.LINK_AUTO_EXECUTION_ENABLED === "true"
    && executorUrl
    && process.env.LINK_EXECUTOR_TOKEN,
  );
  return {
    enabled,
    autoExecutionConfigured,
    executorHost: executorUrl ? new URL(executorUrl).hostname : null,
    maximumBatchSize: Math.max(1, Math.min(Number(process.env.LINK_MAX_BATCH_SIZE || 30), 30)),
  } as const;
}

function numberOrNull(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function mapCampaign(row: Record<string, unknown>): StoredLinkCampaign {
  return {
    id: String(row.id),
    workspaceId: String(row.workspace_id),
    siteId: String(row.site_id),
    siteUrl: String(row.site_url || ""),
    name: String(row.name),
    status: String(row.status) as StoredLinkCampaign["status"],
    discoveryLimit: Number(row.discovery_limit || 100),
    targetUrl: String(row.target_url),
    profile: (row.profile || {}) as Record<string, unknown>,
    approvedByEmail: row.approved_by_email ? String(row.approved_by_email) : null,
    approvedAt: row.approved_at ? new Date(String(row.approved_at)) : null,
    createdAt: new Date(String(row.created_at)),
    discoveredCount: Number(row.discovered_count || 0),
    verifiedCount: Number(row.verified_count || 0),
    needsActionCount: Number(row.needs_action_count || 0),
  };
}

function mapOpportunity(row: Record<string, unknown>): StoredLinkOpportunity {
  return {
    id: String(row.id),
    campaignId: String(row.campaign_id),
    siteId: String(row.site_id),
    source: String(row.source) as StoredLinkOpportunity["source"],
    category: String(row.category) as StoredLinkOpportunity["category"],
    destinationName: String(row.destination_name),
    destinationDomain: String(row.destination_domain),
    sourceUrl: String(row.source_url),
    submissionUrl: row.submission_url ? String(row.submission_url) : null,
    targetUrl: String(row.target_url),
    relevanceScore: Number(row.relevance_score || 0),
    authorityScore: numberOrNull(row.authority_score),
    spamScore: numberOrNull(row.spam_score),
    rationale: String(row.rationale || ""),
    risk: String(row.risk) as LinkRisk,
    status: String(row.status) as LinkOpportunityStatus,
    submissionMode: String(row.submission_mode) as LinkSubmissionMode,
    permissionState: String(row.permission_state) as LinkPermissionState,
    policyEvidenceUrl: row.policy_evidence_url ? String(row.policy_evidence_url) : null,
    publicListingUrl: row.public_url ? String(row.public_url) : row.public_listing_url ? String(row.public_listing_url) : null,
    lastError: row.submission_error ? String(row.submission_error) : row.last_error ? String(row.last_error) : null,
    metadata: (row.metadata || {}) as Record<string, unknown>,
    submissionId: row.submission_id ? String(row.submission_id) : null,
    httpStatus: numberOrNull(row.http_status),
    indexable: row.indexable === null || row.indexable === undefined ? null : Boolean(row.indexable),
    linkRel: Array.isArray(row.link_rel) ? row.link_rel.map(String) : [],
    lastCheckedAt: row.last_checked_at ? new Date(String(row.last_checked_at)) : null,
    createdAt: new Date(String(row.created_at)),
    updatedAt: new Date(String(row.updated_at)),
  };
}

function emptyCounts(): Record<LinkOpportunityStatus, number> {
  return {
    discovered: 0,
    approved: 0,
    submitted: 0,
    pending_review: 0,
    published: 0,
    verified: 0,
    needs_action: 0,
    rejected: 0,
    removed: 0,
  };
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`).join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

function payloadHash(value: unknown) {
  return createHash("sha256").update(canonicalJson(value)).digest("hex");
}

function workspaceDefaultsToEnabled() {
  return process.env.LINK_CAMPAIGNS_DEFAULT_ENABLED === "true";
}

export async function getLinkWorkspaceRole(workspaceId: string, email: string) {
  if (!isDatabaseConfigured()) return null;
  await ensureLinkCampaignSchema();
  const sql = getDatabase();
  const [row] = await sql`
    select role from rankcues_workspace_members
    where workspace_id = ${workspaceId} and lower(email) = ${email.trim().toLowerCase()}
    limit 1
  `;
  return row?.role ? String(row.role) : null;
}

export async function requireLinkManager(workspaceId: string, email: string) {
  const role = await getLinkWorkspaceRole(workspaceId, email);
  return role === "owner" || role === "admin" ? role : null;
}

async function workspaceLinkEnabled(workspaceId: string) {
  const sql = getDatabase();
  const [row] = await sql`select enabled from rankcues_link_workspace_settings where workspace_id = ${workspaceId} limit 1`;
  return row ? Boolean(row.enabled) : workspaceDefaultsToEnabled();
}

export async function setLinkWorkspaceEnabled(input: { workspaceId: string; actorEmail: string; enabled: boolean }) {
  await ensureLinkCampaignSchema();
  const sql = getDatabase();
  await sql`
    insert into rankcues_link_workspace_settings (workspace_id, enabled, enabled_by_email, enabled_at)
    values (${input.workspaceId}, ${input.enabled}, ${input.actorEmail}, ${input.enabled ? new Date() : null})
    on conflict (workspace_id) do update set
      enabled = excluded.enabled,
      enabled_by_email = excluded.enabled_by_email,
      enabled_at = excluded.enabled_at,
      updated_at = now()
  `;
  return { enabled: input.enabled };
}

export async function getLinkCampaignPageData(input: {
  workspaceId: string;
  email: string;
  siteId?: string;
  campaignId?: string;
  status?: LinkOpportunityStatus | "all";
  opportunityId?: string;
}): Promise<LinkCampaignPageData> {
  await ensureLinkCampaignSchema();
  const role = await getLinkWorkspaceRole(input.workspaceId, input.email);
  if (!role) throw new Error("Your workspace membership is no longer active.");
  const sql = getDatabase();
  const selectedSiteId = input.siteId || null;
  const sites = await sql`
    select id, site_url from rankcues_sites
    where workspace_id = ${input.workspaceId} and active = true and permission_level <> 'siteUnverifiedUser'
    order by coalesce(display_name, site_url)
  `;
  const campaignRows = await sql`
    select c.*, s.site_url,
      count(o.id)::int as discovered_count,
      count(distinct o.destination_domain) filter (where o.status = 'verified')::int as verified_count,
      count(o.id) filter (where o.status = 'needs_action')::int as needs_action_count
    from rankcues_link_campaigns c
    join rankcues_sites s on s.id = c.site_id and s.workspace_id = c.workspace_id
    left join rankcues_link_opportunities o on o.campaign_id = c.id and o.workspace_id = c.workspace_id
    where c.workspace_id = ${input.workspaceId}
      and (${selectedSiteId}::text is null or c.site_id = ${selectedSiteId})
    group by c.id, s.site_url
    order by c.created_at desc
    limit 100
  `;
  const campaigns = campaignRows.map(mapCampaign);
  const selectedCampaign = campaigns.find((campaign) => campaign.id === input.campaignId) || campaigns[0] || null;
  const selectedStatus = input.status && input.status !== "all" ? input.status : null;
  const opportunityRows = selectedCampaign ? await sql`
    select o.*, sub.id as submission_id, sub.public_url, sub.last_error as submission_error,
      sub.last_checked_at, v.http_status, v.indexable, v.link_rel
    from rankcues_link_opportunities o
    left join rankcues_link_submissions sub
      on sub.opportunity_id = o.id and sub.workspace_id = o.workspace_id
    left join lateral (
      select http_status, indexable, link_rel
      from rankcues_link_verifications
      where submission_id = sub.id and workspace_id = o.workspace_id
      order by checked_at desc limit 1
    ) v on true
    where o.workspace_id = ${input.workspaceId}
      and o.campaign_id = ${selectedCampaign.id}
      and (${selectedStatus}::text is null or o.status = ${selectedStatus})
    order by
      case o.status when 'needs_action' then 1 when 'discovered' then 2 when 'published' then 3 else 4 end,
      o.relevance_score desc, o.created_at desc
    limit 300
  ` : [];
  const opportunities = opportunityRows.map(mapOpportunity);
  const selectedOpportunity = opportunities.find((opportunity) => opportunity.id === input.opportunityId) || opportunities[0] || null;
  const countRows = selectedCampaign ? await sql`
    select status, count(*)::int as count from rankcues_link_opportunities
    where workspace_id = ${input.workspaceId} and campaign_id = ${selectedCampaign.id}
    group by status
  ` : [];
  const counts = emptyCounts();
  for (const row of countRows) {
    const status = String(row.status) as LinkOpportunityStatus;
    if (status in counts) counts[status] = Number(row.count || 0);
  }
  const eventRows = selectedCampaign ? await sql`
    select id, event_type, actor_type, actor_email, from_status, to_status, metadata, created_at
    from rankcues_link_events
    where workspace_id = ${input.workspaceId} and campaign_id = ${selectedCampaign.id}
    order by created_at desc limit 100
  ` : [];
  const events = eventRows.map((row) => ({
    id: String(row.id), eventType: String(row.event_type), actorType: String(row.actor_type) as StoredLinkEvent["actorType"],
    actorEmail: row.actor_email ? String(row.actor_email) : null,
    fromStatus: row.from_status ? String(row.from_status) : null, toStatus: row.to_status ? String(row.to_status) : null,
    metadata: (row.metadata || {}) as Record<string, unknown>, createdAt: new Date(String(row.created_at)),
  }));
  const [authorizedTargets] = await sql`
    select count(*)::int as count from rankcues_link_targets t
    where t.active = true and t.automation_allowed = true and t.policy_status = 'approved'
      and exists (
        select 1 from rankcues_link_connections c
        where c.target_id = t.id and c.workspace_id = ${input.workspaceId} and c.status = 'connected'
      )
  `;
  return {
    sites: sites.map((site) => ({ id: String(site.id), siteUrl: String(site.site_url) })),
    campaigns,
    selectedCampaign,
    opportunities,
    selectedOpportunity,
    events,
    counts,
    workspaceEnabled: await workspaceLinkEnabled(input.workspaceId),
    role,
    canManage: role === "owner" || role === "admin",
    authorizedTargetCount: Number(authorizedTargets?.count || 0),
  };
}

function siteOwnsTarget(siteUrl: string, targetUrl: string) {
  const target = normalizePublicHttpsUrl(targetUrl);
  if (!target) return false;
  const targetParsed = new URL(target);
  const normalizedTargetHost = targetParsed.hostname.replace(/^www\./, "").toLowerCase();
  if (siteUrl.startsWith("sc-domain:")) {
    const domain = siteUrl.slice("sc-domain:".length).replace(/^www\./, "").toLowerCase();
    return normalizedTargetHost === domain || normalizedTargetHost.endsWith(`.${domain}`);
  }
  try {
    const property = new URL(siteUrl);
    return target.startsWith(property.toString());
  } catch {
    return false;
  }
}

export async function createLinkCampaign(input: {
  workspaceId: string;
  actorEmail: string;
  siteId: string;
  name: string;
  targetUrl: string;
  discoveryLimit: number;
  profile: Record<string, unknown>;
}) {
  await ensureLinkCampaignSchema();
  const sql = getDatabase();
  const [site] = await sql`
    select id, site_url from rankcues_sites
    where id = ${input.siteId} and workspace_id = ${input.workspaceId}
      and active = true and permission_level <> 'siteUnverifiedUser'
    limit 1
  `;
  const targetUrl = normalizePublicHttpsUrl(input.targetUrl);
  if (!site || !targetUrl || !siteOwnsTarget(String(site.site_url), targetUrl)) {
    throw new Error("The target URL must belong to the selected verified Search Console property.");
  }
  const profile = JSON.parse(JSON.stringify(input.profile)) as Record<string, unknown>;
  if (canonicalJson(profile).length > 20_000) throw new Error("The campaign profile is too large.");
  const id = stableId(input.workspaceId, input.siteId, "link-campaign", randomUUID());
  const [created] = await sql`
    insert into rankcues_link_campaigns (
      id, workspace_id, site_id, name, discovery_limit, target_url, profile
    ) values (
      ${id}, ${input.workspaceId}, ${input.siteId}, ${input.name.trim().slice(0, 160)},
      ${Math.max(30, Math.min(input.discoveryLimit, 300))}, ${targetUrl},
      ${sql.json(JSON.parse(JSON.stringify(profile)))}
    ) returning *
  `;
  await recordLinkEvent({
    workspaceId: input.workspaceId, campaignId: id, actorType: "user", actorEmail: input.actorEmail,
    eventType: "campaign_created", toStatus: "draft", metadata: { targetUrl },
  });
  return created;
}

export async function setLinkCampaignStatus(input: {
  workspaceId: string;
  actorEmail: string;
  campaignId: string;
  status: "active" | "paused" | "completed";
}) {
  await ensureLinkCampaignSchema();
  if (input.status === "active" && !(await workspaceLinkEnabled(input.workspaceId))) {
    throw new Error("Enable the experimental workspace module before activating a campaign.");
  }
  const sql = getDatabase();
  return sql.begin(async (transaction) => {
    const [current] = await transaction`
      select status from rankcues_link_campaigns
      where id = ${input.campaignId} and workspace_id = ${input.workspaceId}
      limit 1 for update
    `;
    if (!current) return null;
    if (String(current.status) === "completed" && input.status !== "completed") {
      throw new Error("A completed campaign can no longer be reactivated.");
    }
    if (input.status === "paused" || input.status === "completed") {
      const [started] = await transaction`
        select count(*)::int as count from rankcues_link_jobs job
        join rankcues_link_submissions sub
          on sub.id = job.submission_id and sub.workspace_id = job.workspace_id
        where sub.campaign_id = ${input.campaignId} and sub.workspace_id = ${input.workspaceId}
          and job.kind = 'submit' and job.status = 'processing' and job.write_started_at is not null
      `;
      if (Number(started?.count || 0) > 0) {
        throw new Error("An approved external request has already started; wait for its result before pausing this campaign.");
      }
    }
    const [updated] = await transaction`
      update rankcues_link_campaigns set
        status = ${input.status},
        approved_by_email = case when ${input.status} = 'active' then ${input.actorEmail} else approved_by_email end,
        approved_at = case when ${input.status} = 'active' then now() else approved_at end,
        updated_at = now()
      where id = ${input.campaignId} and workspace_id = ${input.workspaceId}
      returning *
    `;
    if (input.status === "completed") {
      await transaction`
        update rankcues_link_jobs job set status = 'cancelled', completed_at = now(),
          lease_token = null, leased_by = null, lease_expires_at = null,
          error_class = 'campaign_completed', error = 'Campaign completed before the external request started.',
          updated_at = now()
        from rankcues_link_submissions sub
        where sub.id = job.submission_id and sub.workspace_id = job.workspace_id
          and sub.campaign_id = ${input.campaignId} and sub.workspace_id = ${input.workspaceId}
          and job.kind = 'submit' and job.status in ('queued','processing') and job.write_started_at is null
      `;
    }
    await transaction`
      insert into rankcues_link_events (
        id, workspace_id, campaign_id, actor_type, actor_email,
        event_type, from_status, to_status, metadata
      ) values (
        ${stableId(input.workspaceId, input.campaignId, "campaign_status_changed", randomUUID())},
        ${input.workspaceId}, ${input.campaignId}, 'user', ${input.actorEmail},
        'campaign_status_changed', ${String(current.status)}, ${input.status}, '{}'::jsonb
      )
    `;
    return updated;
  });
}

export async function saveLinkOpportunities(input: {
  workspaceId: string;
  actorEmail: string;
  campaignId: string;
  opportunities: DiscoveredLinkOpportunityInput[];
}) {
  await ensureLinkCampaignSchema();
  const sql = getDatabase();
  const [campaign] = await sql`
    select c.id, c.site_id, c.target_url, c.discovery_limit,
      (select count(*)::int from rankcues_link_opportunities o
        where o.workspace_id = c.workspace_id and o.campaign_id = c.id) as opportunity_count
    from rankcues_link_campaigns c
    where c.id = ${input.campaignId} and c.workspace_id = ${input.workspaceId} and c.status <> 'completed'
    limit 1
  `;
  if (!campaign) throw new Error("The campaign is not available for discovery.");
  const maximum = Math.min(Number(campaign.discovery_limit || 100), 300);
  const remaining = Math.max(0, maximum - Number(campaign.opportunity_count || 0));
  const rows = input.opportunities.slice(0, remaining).flatMap((item) => {
    const sourceUrl = normalizePublicHttpsUrl(item.sourceUrl);
    const submissionUrl = item.submissionUrl ? normalizePublicHttpsUrl(item.submissionUrl) : sourceUrl;
    if (!sourceUrl || !submissionUrl) return [];
    const inferred = classifyLinkOpportunity({ url: sourceUrl, title: item.destinationName, spamScore: item.spamScore });
    const risk = item.risk || inferred.risk;
    return [{
      id: stableId(input.workspaceId, input.campaignId, sourceUrl, String(campaign.target_url)),
      workspace_id: input.workspaceId,
      campaign_id: input.campaignId,
      site_id: String(campaign.site_id),
      source: item.source,
      category: item.category || inferred.category,
      destination_name: item.destinationName.trim().slice(0, 160),
      destination_domain: new URL(sourceUrl).hostname.replace(/^www\./, ""),
      source_url: sourceUrl,
      submission_url: submissionUrl,
      target_url: String(campaign.target_url),
      relevance_score: Math.max(0, Math.min(Number(item.relevanceScore ?? 50), 100)),
      authority_score: item.authorityScore ?? null,
      spam_score: item.spamScore ?? null,
      rationale: (item.rationale || "Imported for human review before any external action.").slice(0, 2000),
      risk,
      policy_evidence_url: item.policyEvidenceUrl || null,
      metadata: item.metadata || {},
    }];
  });
  if (!rows.length) return { written: 0 };
  const written = await sql`
    insert into rankcues_link_opportunities (
      id, workspace_id, campaign_id, site_id, target_id, source, category, destination_name,
      destination_domain, source_url, submission_url, target_url, relevance_score,
      authority_score, spam_score, rationale, risk, permission_state, policy_evidence_url, metadata
    )
    select x.id, x.workspace_id, x.campaign_id, x.site_id, target.id, x.source, x.category,
      x.destination_name, x.destination_domain, x.source_url, x.submission_url,
      x.target_url, x.relevance_score, x.authority_score, x.spam_score,
      x.rationale, x.risk,
      case when target.policy_status = 'approved' then 'verified' else 'unknown' end,
      x.policy_evidence_url, x.metadata
    from jsonb_to_recordset(${sql.json(JSON.parse(JSON.stringify(rows)))}::jsonb) as x(
      id text, workspace_id text, campaign_id text, site_id text, source text,
      category text, destination_name text, destination_domain text, source_url text,
      submission_url text, target_url text, relevance_score integer,
      authority_score double precision, spam_score double precision, rationale text,
      risk text, policy_evidence_url text, metadata jsonb
    )
    left join lateral (
      select id, policy_status from rankcues_link_targets
      where active = true and submission_url = x.submission_url
      order by reviewed_at desc nulls last limit 1
    ) target on true
    on conflict (workspace_id, campaign_id, source_url, target_url) do update set
      destination_name = excluded.destination_name,
      submission_url = excluded.submission_url,
      relevance_score = excluded.relevance_score,
      authority_score = excluded.authority_score,
      spam_score = excluded.spam_score,
      rationale = excluded.rationale,
      risk = excluded.risk,
      target_id = excluded.target_id,
      permission_state = excluded.permission_state,
      metadata = excluded.metadata,
      updated_at = now()
    where rankcues_link_opportunities.status = 'discovered'
    returning id
  `;
  await recordLinkEvent({
    workspaceId: input.workspaceId, campaignId: input.campaignId, actorType: "user", actorEmail: input.actorEmail,
    eventType: "opportunities_discovered", metadata: { written: written.length, requested: rows.length },
  });
  return { written: written.length };
}

export async function importLinkOpportunities(input: {
  workspaceId: string;
  actorEmail: string;
  campaignId: string;
  rows: ImportedLinkOpportunity[];
}) {
  return saveLinkOpportunities({
    workspaceId: input.workspaceId,
    actorEmail: input.actorEmail,
    campaignId: input.campaignId,
    opportunities: input.rows.map((row) => ({
      ...row,
      source: "manual_import" as const,
      rationale: row.policyEvidenceUrl
        ? "Imported with policy evidence for review; automatic execution still requires an approved platform connector."
        : "Imported for manual review. No platform automation permission has been recorded.",
    })),
  });
}

export async function discoverLostLinkOpportunities(input: { workspaceId: string; actorEmail: string; campaignId: string }) {
  await ensureLinkCampaignSchema();
  const sql = getDatabase();
  const [campaign] = await sql`
    select site_id from rankcues_link_campaigns where id = ${input.campaignId} and workspace_id = ${input.workspaceId} limit 1
  `;
  if (!campaign) throw new Error("Campaign not found.");
  const rows = await sql`
    select source_url, source_domain, target_url, source_rank, anchor, last_seen
    from rankcues_backlinks b
    join rankcues_sites s on s.id = b.site_id
    where b.site_id = ${String(campaign.site_id)} and s.workspace_id = ${input.workspaceId} and b.status = 'lost'
    order by b.source_rank desc nulls last, b.last_seen desc limit 300
  `;
  return saveLinkOpportunities({
    ...input,
    opportunities: rows.map((row) => ({
      sourceUrl: String(row.source_url), submissionUrl: String(row.source_url),
      destinationName: String(row.source_domain), source: "lost_link" as const, category: "lost_link" as const,
      relevanceScore: 90, authorityScore: numberOrNull(row.source_rank), risk: "low" as const,
      rationale: `Recover a previously observed link${row.anchor ? ` using the prior anchor “${String(row.anchor).slice(0, 120)}”` : ""}.`,
      metadata: { lastSeen: row.last_seen, originalTargetUrl: row.target_url },
    })),
  });
}

async function recordLinkEvent(input: {
  workspaceId: string;
  campaignId: string;
  opportunityId?: string;
  submissionId?: string;
  jobId?: string;
  actorType: "user" | "worker" | "system";
  actorEmail?: string;
  eventType: string;
  fromStatus?: string;
  toStatus?: string;
  metadata?: Record<string, unknown>;
}) {
  const sql = getDatabase();
  const id = stableId(input.workspaceId, input.campaignId, input.eventType, randomUUID());
  await sql`
    insert into rankcues_link_events (
      id, workspace_id, campaign_id, opportunity_id, submission_id, job_id,
      actor_type, actor_email, event_type, from_status, to_status, metadata
    ) values (
      ${id}, ${input.workspaceId}, ${input.campaignId}, ${input.opportunityId || null},
      ${input.submissionId || null}, ${input.jobId || null}, ${input.actorType},
      ${input.actorEmail || null}, ${input.eventType}, ${input.fromStatus || null},
      ${input.toStatus || null}, ${sql.json(JSON.parse(JSON.stringify(input.metadata || {})))}
    )
  `;
}

export async function approveLinkOpportunity(input: {
  workspaceId: string;
  actorEmail: string;
  opportunityId: string;
}) {
  await ensureLinkCampaignSchema();
  const sql = getDatabase();
  const feature = getLinkCampaignPublicStatus();
  const submissionId = stableId(input.workspaceId, input.opportunityId, "link-submission");
  const idempotencyKey = stableId(input.workspaceId, submissionId, "approval", "1");
  return sql.begin(async (transaction) => {
    await transaction`
      insert into rankcues_link_workspace_settings (workspace_id, enabled, enabled_by_email, enabled_at)
      select id, ${workspaceDefaultsToEnabled()},
        ${workspaceDefaultsToEnabled() ? "system:workspace-default" : null},
        ${workspaceDefaultsToEnabled() ? new Date() : null}
      from rankcues_workspaces where id = ${input.workspaceId}
      on conflict (workspace_id) do nothing
    `;
    const [settings] = await transaction`
      select enabled, daily_submission_limit from rankcues_link_workspace_settings
      where workspace_id = ${input.workspaceId} for update
    `;
    if (!settings?.enabled) throw new Error("The experimental workspace module is disabled.");

    const [row] = await transaction`
      select o.*, c.profile, c.status as campaign_status,
        t.automation_allowed, t.policy_status, t.supports_idempotency,
        t.connector_key as target_connector_key,
        conn.id as connection_id, conn.status as connection_status
      from rankcues_link_opportunities o
      join rankcues_link_campaigns c on c.id = o.campaign_id and c.workspace_id = o.workspace_id
      left join rankcues_link_targets t on t.id = o.target_id and t.active = true
      left join rankcues_link_connections conn
        on conn.target_id = t.id and conn.workspace_id = o.workspace_id
      where o.id = ${input.opportunityId} and o.workspace_id = ${input.workspaceId}
      limit 1 for update of o
    `;
    if (!row) return null;
    if (String(row.campaign_status) !== "active") throw new Error("Activate the campaign before approving opportunities.");
    if (String(row.status) !== "discovered") throw new Error("Only newly discovered opportunities can be approved.");
    if (String(row.risk) === "blocked" || String(row.permission_state) === "denied") {
      throw new Error("This destination is blocked by the campaign safety policy.");
    }

    const [dailyUsage] = await transaction`
      select count(*)::int as approved_today from rankcues_link_submissions
      where workspace_id = ${input.workspaceId} and submission_mode = 'official_api'
        and approved_at >= date_trunc('day', now())
    `;
    const connectorEligible = Boolean(
      row.target_id
      && row.automation_allowed
      && row.policy_status === "approved"
      && row.supports_idempotency
      && row.target_connector_key
      && row.connection_id
      && row.connection_status === "connected"
      && feature.autoExecutionConfigured,
    );
    const officialApiEligible = connectorEligible
      && Number(dailyUsage?.approved_today || 0) < Number(settings.daily_submission_limit || 10);
    const submissionMode: LinkSubmissionMode = officialApiEligible ? "official_api" : "manual";
    const nextStatus: LinkOpportunityStatus = officialApiEligible ? "approved" : "needs_action";
    const manualReason = connectorEligible
      ? "The workspace daily automatic-submission limit is reached; manual handoff is required."
      : "Manual action is required; RankCues will not bypass login, email verification, or CAPTCHA.";
    const payload = {
      profile: row.profile || {},
      targetUrl: String(row.target_url),
      destination: {
        name: String(row.destination_name),
        sourceUrl: String(row.source_url),
        submissionUrl: row.submission_url ? String(row.submission_url) : null,
      },
    };
    const hash = payloadHash(payload);
    const connectorKey = officialApiEligible ? String(row.target_connector_key) : null;
    const [updated] = await transaction`
      update rankcues_link_opportunities set
        status = ${nextStatus}, submission_mode = ${submissionMode},
        connector_key = ${connectorKey}, last_error = ${officialApiEligible ? null : manualReason},
        updated_at = now()
      where id = ${input.opportunityId} and workspace_id = ${input.workspaceId} and status = 'discovered'
      returning id
    `;
    if (!updated) throw new Error("The opportunity changed while it was being approved.");
    await transaction`
      insert into rankcues_link_submissions (
        id, workspace_id, campaign_id, opportunity_id, site_id, status,
        submission_mode, connector_key, idempotency_key, payload, payload_hash,
        approved_payload_hash, created_by_email, approved_by_email, last_error
      ) values (
        ${submissionId}, ${input.workspaceId}, ${String(row.campaign_id)}, ${input.opportunityId},
        ${String(row.site_id)}, ${nextStatus}, ${submissionMode}, ${connectorKey}, ${idempotencyKey},
        ${transaction.json(JSON.parse(JSON.stringify(payload)))}, ${hash}, ${hash},
        ${input.actorEmail}, ${input.actorEmail}, ${officialApiEligible ? null : manualReason}
      )
    `;

    let jobId: string | null = null;
    if (officialApiEligible) {
      const dedupeKey = `submit:${submissionId}:v1`;
      jobId = stableId(input.workspaceId, dedupeKey);
      await transaction`
        insert into rankcues_link_jobs (
          id, workspace_id, submission_id, kind, dedupe_key, request_hash,
          approval_version, request, remote_idempotency_key
        ) values (
          ${jobId}, ${input.workspaceId}, ${submissionId}, 'submit', ${dedupeKey}, ${hash},
          1, ${transaction.json(JSON.parse(JSON.stringify(payload)))}, ${stableId("rankcues-link", jobId)}
        )
      `;
    }
    await transaction`
      insert into rankcues_link_events (
        id, workspace_id, campaign_id, opportunity_id, submission_id, job_id,
        actor_type, actor_email, event_type, from_status, to_status, metadata
      ) values (
        ${stableId(input.workspaceId, String(row.campaign_id), "opportunity_approved", randomUUID())},
        ${input.workspaceId}, ${String(row.campaign_id)}, ${input.opportunityId}, ${submissionId}, ${jobId},
        'user', ${input.actorEmail}, 'opportunity_approved', 'discovered', ${nextStatus},
        ${transaction.json({ submissionMode, automaticExecution: officialApiEligible })}
      )
    `;
    return { opportunityId: input.opportunityId, submissionId, status: nextStatus, submissionMode };
  });
}

export async function approveLinkOpportunityBatch(input: {
  workspaceId: string;
  actorEmail: string;
  opportunityIds: string[];
}) {
  const limit = getLinkCampaignPublicStatus().maximumBatchSize;
  const ids = [...new Set(input.opportunityIds.filter(Boolean))].slice(0, limit);
  const results: Array<{ opportunityId: string; ok: boolean; status?: string; error?: string }> = [];
  for (const opportunityId of ids) {
    try {
      const result = await approveLinkOpportunity({ ...input, opportunityId });
      results.push({ opportunityId, ok: Boolean(result), status: result?.status });
    } catch (error) {
      results.push({ opportunityId, ok: false, error: error instanceof Error ? error.message : "Approval failed." });
    }
  }
  return results;
}

export async function rejectLinkOpportunity(input: { workspaceId: string; actorEmail: string; opportunityId: string }) {
  await ensureLinkCampaignSchema();
  const sql = getDatabase();
  return sql.begin(async (transaction) => {
    const [current] = await transaction`
      select o.id, o.campaign_id, o.status, sub.id as submission_id
      from rankcues_link_opportunities o
      left join rankcues_link_submissions sub
        on sub.opportunity_id = o.id and sub.workspace_id = o.workspace_id
      where o.id = ${input.opportunityId} and o.workspace_id = ${input.workspaceId}
      limit 1 for update of o
    `;
    if (!current) return null;
    const fromStatus = String(current.status) as LinkOpportunityStatus;
    if (!canTransitionLinkStatus(fromStatus, "rejected")) throw new Error("This opportunity can no longer be rejected from its current state.");
    if (current.submission_id) {
      const [started] = await transaction`
        select id from rankcues_link_jobs
        where workspace_id = ${input.workspaceId} and submission_id = ${String(current.submission_id)}
          and kind = 'submit' and status = 'processing' and write_started_at is not null
        limit 1
      `;
      if (started) throw new Error("The approved external request has already started and can no longer be rejected.");
      await transaction`
        update rankcues_link_jobs set status = 'cancelled', completed_at = now(),
          lease_token = null, leased_by = null, lease_expires_at = null,
          error_class = 'rejected', error = 'Opportunity rejected before the external request started.',
          updated_at = now()
        where workspace_id = ${input.workspaceId} and submission_id = ${String(current.submission_id)}
          and kind = 'submit' and status in ('queued','processing') and write_started_at is null
      `;
    }
    const [updated] = await transaction`
      update rankcues_link_opportunities set status = 'rejected', updated_at = now()
      where id = ${input.opportunityId} and workspace_id = ${input.workspaceId} and status = ${fromStatus}
      returning id
    `;
    if (!updated) throw new Error("The opportunity changed before rejection was saved.");
    await transaction`
      update rankcues_link_submissions set status = 'rejected', updated_at = now()
      where opportunity_id = ${input.opportunityId} and workspace_id = ${input.workspaceId}
    `;
    await transaction`
      insert into rankcues_link_events (
        id, workspace_id, campaign_id, opportunity_id, submission_id,
        actor_type, actor_email, event_type, from_status, to_status, metadata
      ) values (
        ${stableId(input.workspaceId, String(current.campaign_id), "opportunity_rejected", randomUUID())},
        ${input.workspaceId}, ${String(current.campaign_id)}, ${input.opportunityId},
        ${current.submission_id ? String(current.submission_id) : null}, 'user', ${input.actorEmail},
        'opportunity_rejected', ${fromStatus}, 'rejected', '{}'::jsonb
      )
    `;
    return { status: "rejected" as const };
  });
}

export async function updateManualLinkSubmission(input: {
  workspaceId: string;
  actorEmail: string;
  opportunityId: string;
  action: "submitted" | "pending_review" | "published";
  publicUrl?: string;
}) {
  await ensureLinkCampaignSchema();
  const sql = getDatabase();
  const publicUrl = input.publicUrl ? normalizePublicHttpsUrl(input.publicUrl) : null;
  if (input.action === "published" && !publicUrl) throw new Error("A public HTTPS listing URL is required before verification.");
  return sql.begin(async (transaction) => {
    const [current] = await transaction`
      select o.id, o.campaign_id, o.status, sub.id as submission_id,
        sub.approval_version, sub.public_url
      from rankcues_link_opportunities o
      join rankcues_link_submissions sub on sub.opportunity_id = o.id and sub.workspace_id = o.workspace_id
      where o.id = ${input.opportunityId} and o.workspace_id = ${input.workspaceId}
      limit 1 for update of o, sub
    `;
    if (!current) return null;
    const fromStatus = String(current.status) as LinkOpportunityStatus;
    if (!canTransitionLinkStatus(fromStatus, input.action)) throw new Error("That status change is not allowed.");
    const finalPublicUrl = publicUrl || (current.public_url ? String(current.public_url) : null);
    const nextVerifyAt = publicUrl ? new Date() : null;
    const [updated] = await transaction`
      update rankcues_link_opportunities set
        status = ${input.action}, public_listing_url = coalesce(${publicUrl}, public_listing_url),
        last_error = null, updated_at = now()
      where id = ${input.opportunityId} and workspace_id = ${input.workspaceId} and status = ${fromStatus}
      returning id
    `;
    if (!updated) throw new Error("The opportunity changed before the update was saved.");
    await transaction`
      update rankcues_link_submissions set
        status = ${input.action}, public_url = coalesce(${publicUrl}, public_url),
        submitted_at = case when ${input.action} in ('submitted','pending_review','published') then coalesce(submitted_at, now()) else submitted_at end,
        pending_review_at = case when ${input.action} = 'pending_review' then now() else pending_review_at end,
        published_at = case when ${input.action} = 'published' then now() else published_at end,
        next_verify_at = coalesce(${nextVerifyAt}, next_verify_at),
        last_error_code = null, last_error = null, updated_at = now()
      where id = ${String(current.submission_id)} and workspace_id = ${input.workspaceId}
    `;
    let jobId: string | null = null;
    if (publicUrl) {
      const dedupeKey = `verify:${String(current.submission_id)}:${randomUUID()}`;
      const candidateJobId = stableId(input.workspaceId, dedupeKey);
      const request = { publicUrl: finalPublicUrl };
      const [created] = await transaction`
        insert into rankcues_link_jobs (
          id, workspace_id, submission_id, kind, dedupe_key, request_hash,
          approval_version, request, remote_idempotency_key
        ) values (
          ${candidateJobId}, ${input.workspaceId}, ${String(current.submission_id)}, 'verify',
          ${dedupeKey}, ${payloadHash(request)}, ${Number(current.approval_version || 1)},
          ${transaction.json(JSON.parse(JSON.stringify(request)))}, ${stableId("rankcues-link", candidateJobId)}
        ) on conflict do nothing returning id
      `;
      if (created) jobId = String(created.id);
      else {
        const [active] = await transaction`
          select id from rankcues_link_jobs
          where workspace_id = ${input.workspaceId} and submission_id = ${String(current.submission_id)}
            and kind = 'verify' and status in ('queued','processing')
          order by created_at desc limit 1
        `;
        jobId = active ? String(active.id) : null;
      }
    }
    await transaction`
      insert into rankcues_link_events (
        id, workspace_id, campaign_id, opportunity_id, submission_id, job_id,
        actor_type, actor_email, event_type, from_status, to_status, metadata
      ) values (
        ${stableId(input.workspaceId, String(current.campaign_id), `submission_${input.action}`, randomUUID())},
        ${input.workspaceId}, ${String(current.campaign_id)}, ${input.opportunityId},
        ${String(current.submission_id)}, ${jobId}, 'user', ${input.actorEmail},
        ${`submission_${input.action}`}, ${fromStatus}, ${input.action},
        ${transaction.json(JSON.parse(JSON.stringify({ publicUrl: finalPublicUrl })))}
      )
    `;
    return { status: input.action, publicUrl: finalPublicUrl };
  });
}

export async function requestLinkVerification(input: { workspaceId: string; actorEmail: string; opportunityId: string }) {
  await ensureLinkCampaignSchema();
  const sql = getDatabase();
  const [row] = await sql`
    select sub.id as submission_id, o.campaign_id, o.status
    from rankcues_link_opportunities o
    join rankcues_link_submissions sub on sub.opportunity_id = o.id and sub.workspace_id = o.workspace_id
    where o.id = ${input.opportunityId} and o.workspace_id = ${input.workspaceId}
      and sub.public_url is not null
    limit 1
  `;
  if (!row) throw new Error("Add the public listing URL before requesting verification.");
  const job = await enqueueLinkJob({ workspaceId: input.workspaceId, submissionId: String(row.submission_id), kind: "verify", force: true });
  await recordLinkEvent({
    workspaceId: input.workspaceId, campaignId: String(row.campaign_id), opportunityId: input.opportunityId,
    submissionId: String(row.submission_id), jobId: job.id, actorType: "user", actorEmail: input.actorEmail,
    eventType: "verification_requested", fromStatus: String(row.status), toStatus: String(row.status),
  });
  return job;
}

type StoredLinkJob = {
  id: string;
  workspaceId: string;
  submissionId: string;
  kind: "submit" | "verify";
  attemptCount: number;
  maxAttempts: number;
  leaseToken: string;
  approvalVersion: number;
  request: Record<string, unknown>;
  remoteIdempotencyKey: string;
};

async function enqueueLinkJob(input: { workspaceId: string; submissionId: string; kind: "submit" | "verify"; force?: boolean }) {
  const sql = getDatabase();
  const [submission] = await sql`
    select id, approval_version, payload, payload_hash, public_url
    from rankcues_link_submissions
    where id = ${input.submissionId} and workspace_id = ${input.workspaceId}
    limit 1
  `;
  if (!submission) throw new Error("Submission not found.");
  const bucket = input.kind === "verify"
    ? input.force ? randomUUID() : new Date().toISOString().slice(0, 13)
    : `v${Number(submission.approval_version || 1)}`;
  const dedupeKey = `${input.kind}:${input.submissionId}:${bucket}`;
  const request = input.kind === "submit" ? submission.payload || {} : { publicUrl: submission.public_url };
  const requestHash = payloadHash(request);
  const id = stableId(input.workspaceId, dedupeKey);
  const [created] = await sql`
    insert into rankcues_link_jobs (
      id, workspace_id, submission_id, kind, dedupe_key, request_hash,
      approval_version, request, remote_idempotency_key
    ) values (
      ${id}, ${input.workspaceId}, ${input.submissionId}, ${input.kind}, ${dedupeKey},
      ${requestHash}, ${Number(submission.approval_version || 1)},
      ${sql.json(JSON.parse(JSON.stringify(request)))}, ${stableId("rankcues-link", id)}
    )
    on conflict do nothing
    returning *
  `;
  if (created) return { id: String(created.id), status: String(created.status) };
  const [existing] = await sql`
    select id, status from rankcues_link_jobs
    where workspace_id = ${input.workspaceId} and submission_id = ${input.submissionId}
      and (dedupe_key = ${dedupeKey} or (kind = ${input.kind} and status in ('queued','processing')))
    order by case when dedupe_key = ${dedupeKey} then 0 else 1 end, created_at desc
    limit 1
  `;
  if (!existing) throw new Error("The link job could not be enqueued.");
  return { id: String(existing.id), status: String(existing.status) };
}

async function enqueueDueLinkVerifications(limit: number) {
  const sql = getDatabase();
  const rows = await sql`
    select sub.workspace_id, sub.id
    from rankcues_link_submissions sub
    left join rankcues_link_workspace_settings settings on settings.workspace_id = sub.workspace_id
    where sub.public_url is not null
      and sub.status in ('submitted','pending_review','published','verified')
      and sub.next_verify_at is not null and sub.next_verify_at <= now()
      and coalesce(settings.enabled, ${workspaceDefaultsToEnabled()}) = true
    order by sub.next_verify_at limit ${Math.max(1, Math.min(limit, 30))}
  `;
  for (const row of rows) {
    await enqueueLinkJob({ workspaceId: String(row.workspace_id), submissionId: String(row.id), kind: "verify" });
  }
}

async function recoverExpiredLinkJobs(limit = 30) {
  const sql = getDatabase();
  const terminalSubmitFailures: Array<{
    workspaceId: string;
    submissionId: string;
    jobId: string;
    message: string;
  }> = [];
  for (let index = 0; index < limit; index += 1) {
    const recovered = await sql.begin(async (transaction) => {
      const [expired] = await transaction`
        select * from rankcues_link_jobs
        where status = 'processing' and lease_expires_at < now()
        order by lease_expires_at
        limit 1 for update skip locked
      `;
      if (!expired) return null;
      const terminal = Number(expired.attempt_count || 0) >= Number(expired.max_attempts || 3);
      const message = "The previous worker lease expired.";

      if (terminal && String(expired.kind) === "verify") {
        const [current] = await transaction`
          select sub.campaign_id, sub.opportunity_id, sub.status as submission_status,
            sub.verification_failures, sub.public_url,
            o.status as opportunity_status, o.target_url
          from rankcues_link_submissions sub
          join rankcues_link_opportunities o
            on o.id = sub.opportunity_id and o.workspace_id = sub.workspace_id
          where sub.id = ${String(expired.submission_id)}
            and sub.workspace_id = ${String(expired.workspace_id)}
          limit 1 for update of sub, o
        `;
        const currentStatus = current?.submission_status
          ? String(current.submission_status) as LinkOpportunityStatus
          : null;
        const opportunityStatus = current?.opportunity_status
          ? String(current.opportunity_status) as LinkOpportunityStatus
          : null;
        const request = (expired.request || {}) as Record<string, unknown>;
        const requestedPublicUrl = typeof request.publicUrl === "string" ? request.publicUrl : null;
        const verifiable = currentStatus === opportunityStatus
          && Boolean(current?.public_url && current?.target_url)
          && (!requestedPublicUrl || String(current.public_url) === requestedPublicUrl)
          && (["submitted", "pending_review", "published", "verified"] as LinkOpportunityStatus[])
            .includes(currentStatus as LinkOpportunityStatus);
        if (current && currentStatus && verifiable) {
          const failureCount = Number(current.verification_failures || 0) + 1;
          const nextStatus: LinkOpportunityStatus = failureCount >= 6 ? "needs_action" : currentStatus;
          const nextVerifyAt = nextStatus === "needs_action"
            ? null
            : new Date(Date.now() + 24 * 60 * 60_000);
          const [submissionUpdated] = await transaction`
            update rankcues_link_submissions set
              status = ${nextStatus}, verification_failures = ${failureCount},
              last_checked_at = now(), next_verify_at = ${nextVerifyAt},
              last_error_code = 'verification_error', last_error = ${message}, updated_at = now()
            where id = ${String(expired.submission_id)} and workspace_id = ${String(expired.workspace_id)}
              and status = ${currentStatus}
            returning id
          `;
          const [opportunityUpdated] = await transaction`
            update rankcues_link_opportunities set
              status = ${nextStatus}, last_error = ${message}, updated_at = now()
            where id = ${String(current.opportunity_id)} and workspace_id = ${String(expired.workspace_id)}
              and status = ${currentStatus}
            returning id
          `;
          if (!submissionUpdated || !opportunityUpdated) {
            throw new LinkJobError("The submission changed before the expired verification could be stored.");
          }
          await transaction`
            insert into rankcues_link_verifications (
              id, workspace_id, submission_id, status, page_url, target_url, evidence
            ) values (
              ${stableId(String(expired.id), "verification_expired", randomUUID())},
              ${String(expired.workspace_id)}, ${String(expired.submission_id)}, 'error',
              ${String(current.public_url)}, ${String(current.target_url)},
              ${transaction.json(JSON.parse(JSON.stringify({ message, attempts: Number(expired.attempt_count || 0) })))}
            )
          `;
          await transaction`
            insert into rankcues_link_events (
              id, workspace_id, campaign_id, opportunity_id, submission_id, job_id,
              actor_type, event_type, from_status, to_status, metadata
            ) values (
              ${stableId(String(expired.id), "verification_expired_event", randomUUID())},
              ${String(expired.workspace_id)}, ${String(current.campaign_id)},
              ${String(current.opportunity_id)}, ${String(expired.submission_id)}, ${String(expired.id)},
              'worker', ${nextStatus === "needs_action" ? "verification_needs_action" : "verification_lease_expired"},
              ${currentStatus}, ${nextStatus},
              ${transaction.json(JSON.parse(JSON.stringify({ message, attempts: Number(expired.attempt_count || 0) })))}
            )
          `;
        }
      }

      const [jobUpdated] = await transaction`
        update rankcues_link_jobs set
          status = ${terminal ? "failed" : "queued"},
          available_at = ${terminal ? expired.available_at : new Date()},
          error_class = 'lease_expired', error = ${message},
          lease_token = null, leased_by = null, lease_expires_at = null, updated_at = now(),
          completed_at = ${terminal ? new Date() : null}
        where id = ${String(expired.id)} and status = 'processing'
        returning id
      `;
      if (!jobUpdated) throw new LinkJobError("The expired worker lease changed before recovery was committed.");
      return {
        terminal,
        kind: String(expired.kind),
        workspaceId: String(expired.workspace_id),
        submissionId: String(expired.submission_id),
        jobId: String(expired.id),
        message,
      };
    });
    if (!recovered) break;
    if (recovered.terminal && recovered.kind === "submit") {
      terminalSubmitFailures.push(recovered);
    }
  }
  for (const failure of terminalSubmitFailures) {
    await markFailedSubmissionNeedsAction(failure);
  }
}

async function claimLinkJob(workerId: string): Promise<StoredLinkJob | null> {
  const sql = getDatabase();
  await recoverExpiredLinkJobs();
  const leaseToken = randomUUID();
  const [row] = await sql`
    with candidate as (
      select j.id from rankcues_link_jobs j
      join rankcues_link_submissions sub
        on sub.id = j.submission_id and sub.workspace_id = j.workspace_id
      join rankcues_link_campaigns campaign
        on campaign.id = sub.campaign_id and campaign.workspace_id = j.workspace_id
      left join rankcues_link_workspace_settings settings on settings.workspace_id = j.workspace_id
      where j.status = 'queued' and j.available_at <= now()
        and coalesce(settings.enabled, ${workspaceDefaultsToEnabled()}) = true
        and (j.kind = 'verify' or campaign.status = 'active')
      order by j.created_at
      for update skip locked limit 1
    )
    update rankcues_link_jobs j set
      status = 'processing', attempt_count = j.attempt_count + 1,
      lease_token = ${leaseToken}, leased_by = ${workerId},
      lease_expires_at = now() + interval '2 minutes', started_at = now(), updated_at = now()
    from candidate where j.id = candidate.id
    returning j.*
  `;
  if (!row) return null;
  return {
    id: String(row.id), workspaceId: String(row.workspace_id), submissionId: String(row.submission_id),
    kind: String(row.kind) as StoredLinkJob["kind"], attemptCount: Number(row.attempt_count || 0),
    maxAttempts: Number(row.max_attempts || 3), leaseToken, approvalVersion: Number(row.approval_version || 1),
    request: (row.request || {}) as Record<string, unknown>, remoteIdempotencyKey: String(row.remote_idempotency_key),
  };
}

async function completeLinkJob(job: StoredLinkJob, result: Record<string, unknown>) {
  const sql = getDatabase();
  const [updated] = await sql`
    update rankcues_link_jobs set
      status = 'succeeded', result = ${sql.json(JSON.parse(JSON.stringify(result)))},
      completed_at = now(), lease_token = null, leased_by = null, lease_expires_at = null,
      error = null, error_class = null, updated_at = now()
    where id = ${job.id} and status = 'processing' and lease_token = ${job.leaseToken}
      and lease_expires_at > now()
    returning id
  `;
  return Boolean(updated);
}

async function renewLinkJobLease(job: StoredLinkJob) {
  const sql = getDatabase();
  const [updated] = await sql`
    update rankcues_link_jobs set lease_expires_at = now() + interval '2 minutes', updated_at = now()
    where id = ${job.id} and status = 'processing' and lease_token = ${job.leaseToken}
      and lease_expires_at > now()
    returning id
  `;
  if (!updated) throw new LinkJobError("The worker lease expired before the result could be stored.");
}

async function markFailedSubmissionNeedsAction(input: {
  workspaceId: string;
  submissionId: string;
  jobId: string;
  message: string;
}) {
  const sql = getDatabase();
  const [row] = await sql`
    select sub.campaign_id, sub.opportunity_id, o.status as opportunity_status
    from rankcues_link_submissions sub
    join rankcues_link_opportunities o
      on o.id = sub.opportunity_id and o.workspace_id = sub.workspace_id
    where sub.id = ${input.submissionId} and sub.workspace_id = ${input.workspaceId}
    limit 1
  `;
  if (!row || String(row.opportunity_status) !== "approved") return;
  await sql`
    update rankcues_link_submissions set status = 'needs_action',
      last_error_code = 'job_failed', last_error = ${input.message.slice(0, 2000)}, updated_at = now()
    where id = ${input.submissionId} and workspace_id = ${input.workspaceId} and status = 'approved'
  `;
  const [updated] = await sql`
    update rankcues_link_opportunities set status = 'needs_action',
      last_error = ${input.message.slice(0, 2000)}, updated_at = now()
    where id = ${String(row.opportunity_id)} and workspace_id = ${input.workspaceId} and status = 'approved'
    returning id
  `;
  if (!updated) return;
  await recordLinkEvent({
    workspaceId: input.workspaceId,
    campaignId: String(row.campaign_id),
    opportunityId: String(row.opportunity_id),
    submissionId: input.submissionId,
    jobId: input.jobId,
    actorType: "worker",
    eventType: "submission_job_failed",
    fromStatus: "approved",
    toStatus: "needs_action",
    metadata: { error: input.message.slice(0, 2000) },
  });
}

async function failLinkJob(job: StoredLinkJob, error: unknown, retryable: boolean) {
  const sql = getDatabase();
  const message = error instanceof Error ? error.message : "Unknown link job error.";
  const shouldRetry = retryable && job.attemptCount < job.maxAttempts;
  const delayMinutes = job.attemptCount <= 1 ? 2 : 10;
  const availableAt = new Date(Date.now() + delayMinutes * 60_000);
  const updated = await sql.begin(async (transaction) => {
    const [leased] = await transaction`
      select id from rankcues_link_jobs
      where id = ${job.id} and workspace_id = ${job.workspaceId}
        and status = 'processing' and lease_token = ${job.leaseToken}
        and lease_expires_at > now()
      limit 1 for update
    `;
    if (!leased) return false;

    if (!shouldRetry && job.kind === "verify") {
      const [current] = await transaction`
        select sub.campaign_id, sub.opportunity_id, sub.status as submission_status,
          sub.verification_failures, sub.public_url,
          o.status as opportunity_status, o.target_url
        from rankcues_link_submissions sub
        join rankcues_link_opportunities o
          on o.id = sub.opportunity_id and o.workspace_id = sub.workspace_id
        where sub.id = ${job.submissionId} and sub.workspace_id = ${job.workspaceId}
        limit 1 for update of sub, o
      `;
      const currentStatus = current?.submission_status
        ? String(current.submission_status) as LinkOpportunityStatus
        : null;
      const opportunityStatus = current?.opportunity_status
        ? String(current.opportunity_status) as LinkOpportunityStatus
        : null;
      const requestedPublicUrl = typeof job.request.publicUrl === "string" ? job.request.publicUrl : null;
      const verifiable = currentStatus === opportunityStatus
        && Boolean(current?.public_url && current?.target_url)
        && (!requestedPublicUrl || String(current.public_url) === requestedPublicUrl)
        && (["submitted", "pending_review", "published", "verified"] as LinkOpportunityStatus[])
          .includes(currentStatus as LinkOpportunityStatus);
      if (current && currentStatus && verifiable) {
        const failureCount = Number(current.verification_failures || 0) + 1;
        const nextStatus: LinkOpportunityStatus = failureCount >= 6 ? "needs_action" : currentStatus;
        const nextVerifyAt = nextStatus === "needs_action"
          ? null
          : new Date(Date.now() + 24 * 60 * 60_000);
        const storedMessage = message.slice(0, 2000);
        const [submissionUpdated] = await transaction`
          update rankcues_link_submissions set
            status = ${nextStatus}, verification_failures = ${failureCount},
            last_checked_at = now(), next_verify_at = ${nextVerifyAt},
            last_error_code = 'verification_error', last_error = ${storedMessage}, updated_at = now()
          where id = ${job.submissionId} and workspace_id = ${job.workspaceId}
            and status = ${currentStatus}
          returning id
        `;
        const [opportunityUpdated] = await transaction`
          update rankcues_link_opportunities set
            status = ${nextStatus}, last_error = ${storedMessage}, updated_at = now()
          where id = ${String(current.opportunity_id)} and workspace_id = ${job.workspaceId}
            and status = ${currentStatus}
          returning id
        `;
        if (!submissionUpdated || !opportunityUpdated) {
          throw new LinkJobError("The submission changed before the verification failure could be stored.");
        }
        await transaction`
          insert into rankcues_link_verifications (
            id, workspace_id, submission_id, status, page_url, target_url, evidence
          ) values (
            ${stableId(job.id, "verification_error", randomUUID())}, ${job.workspaceId}, ${job.submissionId},
            'error', ${String(current.public_url)}, ${String(current.target_url)},
            ${transaction.json(JSON.parse(JSON.stringify({ message: storedMessage, retryable, attempts: job.attemptCount })))}
          )
        `;
        await transaction`
          insert into rankcues_link_events (
            id, workspace_id, campaign_id, opportunity_id, submission_id, job_id,
            actor_type, event_type, from_status, to_status, metadata
          ) values (
            ${stableId(job.id, "verification_failed", randomUUID())}, ${job.workspaceId},
            ${String(current.campaign_id)}, ${String(current.opportunity_id)}, ${job.submissionId}, ${job.id},
            'worker', ${nextStatus === "needs_action" ? "verification_needs_action" : "verification_failed"},
            ${currentStatus}, ${nextStatus},
            ${transaction.json(JSON.parse(JSON.stringify({ message: storedMessage, retryable, attempts: job.attemptCount })))}
          )
        `;
      }
    }

    const [jobUpdated] = await transaction`
      update rankcues_link_jobs set
        status = ${shouldRetry ? "queued" : "failed"},
        available_at = ${availableAt}, completed_at = ${shouldRetry ? null : new Date()},
        error_class = ${retryable ? "temporary" : "permanent"}, error = ${message.slice(0, 2000)},
        lease_token = null, leased_by = null, lease_expires_at = null, updated_at = now()
      where id = ${job.id} and status = 'processing' and lease_token = ${job.leaseToken}
      returning id
    `;
    if (!jobUpdated) throw new LinkJobError("The worker lease changed before the failure could be stored.");
    return true;
  });
  if (updated && !shouldRetry && job.kind === "submit") {
    await markFailedSubmissionNeedsAction({
      workspaceId: job.workspaceId,
      submissionId: job.submissionId,
      jobId: job.id,
      message,
    });
  }
  return { retrying: shouldRetry, error: message };
}

type PublicPageInspection = {
  pageUrl: string;
  httpStatus: number;
  indexable: boolean;
  matched: boolean;
  linkRel: string[];
  matchedHref: string | null;
  title: string;
};

class LinkJobError extends Error {
  retryable: boolean;

  constructor(message: string, retryable = false) {
    super(message);
    this.name = "LinkJobError";
    this.retryable = retryable;
  }
}

async function readLimitedText(response: Response, maximumBytes = 1_000_000) {
  if (!response.body) return "";
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let received = 0;
  let pageText = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value.byteLength;
      if (received > maximumBytes) throw new LinkJobError("The public page is larger than the verification limit.");
      pageText += decoder.decode(value, { stream: true });
    }
    pageText += decoder.decode();
    return pageText;
  } finally {
    await reader.cancel().catch(() => undefined);
  }
}

function inspectLinkHtml(input: {
  html: string;
  pageUrl: string;
  targetUrl: string;
  httpStatus: number;
  xRobotsTag?: string | null;
}): PublicPageInspection {
  const $ = load(input.html);
  const robots = `${input.xRobotsTag || ""},${$('meta[name="robots" i]').attr("content") || ""}`.toLowerCase();
  let matchedHref: string | null = null;
  let linkRel: string[] = [];
  $("a[href]").each((_, element) => {
    if (matchedHref) return;
    const href = $(element).attr("href");
    if (!href) return;
    try {
      const absolute = new URL(href, input.pageUrl).toString();
      if (!linkMatchesTarget(absolute, input.targetUrl)) return;
      matchedHref = absolute;
      linkRel = [...new Set(
        ($(element).attr("rel") || "")
          .toLowerCase()
          .split(/\s+/)
          .filter(Boolean),
      )];
      if (!linkRel.length) linkRel = ["follow"];
    } catch {
      // Invalid anchors are ignored; the page itself remains valid evidence.
    }
  });
  return {
    pageUrl: input.pageUrl,
    httpStatus: input.httpStatus,
    indexable: !/(^|[,\s])(noindex|none)([,\s]|$)/.test(robots),
    matched: Boolean(matchedHref),
    linkRel,
    matchedHref,
    title: $("title").first().text().trim().slice(0, 300),
  };
}

async function fetchPublicLinkPage(pageUrl: string, targetUrl: string): Promise<PublicPageInspection> {
  const initialUrl = normalizePublicHttpsUrl(pageUrl);
  if (!initialUrl) throw new LinkJobError("The public listing URL must be a public HTTPS URL.");
  let currentUrl: string = initialUrl;
  for (let redirectCount = 0; redirectCount <= 3; redirectCount += 1) {
    let response: Response;
    try {
      response = await fetch(currentUrl, {
        method: "GET",
        redirect: "manual",
        headers: {
          accept: "text/html,application/xhtml+xml;q=0.9",
          "user-agent": "RankCues-LinkVerifier/1.0 (+https://rankcues.com)",
        },
        signal: AbortSignal.timeout(12_000),
      });
    } catch (error) {
      throw new LinkJobError(error instanceof Error ? `Public page request failed: ${error.message}` : "Public page request failed.", true);
    }
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");
      const redirected: string | null = location ? normalizePublicHttpsUrl(new URL(location, currentUrl).toString()) : null;
      if (!redirected) throw new LinkJobError("The public page redirected to a non-public or non-HTTPS URL.");
      currentUrl = redirected;
      continue;
    }
    if (response.status === 429 || response.status >= 500) {
      throw new LinkJobError(`The public page returned HTTP ${response.status}.`, true);
    }
    if (![200, 404, 410].includes(response.status)) {
      throw new LinkJobError(`The public page returned HTTP ${response.status}.`);
    }
    const contentType = response.headers.get("content-type") || "";
    const html = response.status === 200 && /(?:text\/html|application\/xhtml\+xml)/i.test(contentType)
      ? await readLimitedText(response)
      : "";
    if (response.status === 200 && !html) throw new LinkJobError("The public URL did not return an HTML page.");
    return inspectLinkHtml({
      html,
      pageUrl: currentUrl,
      targetUrl,
      httpStatus: response.status,
      xRobotsTag: response.headers.get("x-robots-tag"),
    });
  }
  throw new LinkJobError("The public page exceeded the redirect limit.");
}

async function runLinkVerificationJob(job: StoredLinkJob) {
  const sql = getDatabase();
  const [row] = await sql`
    select sub.public_url, o.target_url
    from rankcues_link_submissions sub
    join rankcues_link_opportunities o
      on o.id = sub.opportunity_id and o.workspace_id = sub.workspace_id
    where sub.id = ${job.submissionId} and sub.workspace_id = ${job.workspaceId}
    limit 1
  `;
  if (!row || !row.public_url) throw new LinkJobError("The submission does not have a public listing URL.");
  const fetchedPublicUrl = String(row.public_url);
  const fetchedTargetUrl = String(row.target_url);
  const inspection = await fetchPublicLinkPage(fetchedPublicUrl, fetchedTargetUrl);

  return sql.begin(async (transaction) => {
    const [leased] = await transaction`
      select id from rankcues_link_jobs
      where id = ${job.id} and workspace_id = ${job.workspaceId}
        and status = 'processing' and lease_token = ${job.leaseToken}
        and lease_expires_at > now()
      limit 1 for update
    `;
    if (!leased) throw new LinkJobError("The worker lease expired before the verification result could be stored.");
    const [current] = await transaction`
      select sub.*, o.status as opportunity_status, o.target_url,
        o.id as opportunity_id, o.campaign_id
      from rankcues_link_submissions sub
      join rankcues_link_opportunities o
        on o.id = sub.opportunity_id and o.workspace_id = sub.workspace_id
      where sub.id = ${job.submissionId} and sub.workspace_id = ${job.workspaceId}
      limit 1 for update of sub, o
    `;
    if (!current || String(current.public_url || "") !== fetchedPublicUrl || String(current.target_url) !== fetchedTargetUrl) {
      throw new LinkJobError("The public listing or target URL changed while verification was running.");
    }
    const fromStatus = String(current.opportunity_status) as LinkOpportunityStatus;
    if (!(["submitted", "pending_review", "published", "verified"] as LinkOpportunityStatus[]).includes(fromStatus)
      || String(current.status) !== fromStatus) {
      throw new LinkJobError("The submission state changed while verification was running.");
    }

    const verificationStatus = inspection.matched ? "verified" : "missing";
    const [previousVerification] = !inspection.matched && fromStatus === "verified" ? await transaction`
      select status, checked_at, checked_at <= now() - interval '24 hours' as old_enough
      from rankcues_link_verifications
      where workspace_id = ${job.workspaceId} and submission_id = ${job.submissionId}
      order by checked_at desc limit 1
    ` : [];
    let nextStatus: LinkOpportunityStatus = fromStatus;
    let nextVerifyAt = new Date(Date.now() + 24 * 60 * 60_000);
    let lastError: string | null = null;
    if (inspection.matched) {
      nextStatus = "verified";
      nextVerifyAt = new Date(Date.now() + 30 * 24 * 60 * 60_000);
    } else if (fromStatus === "verified") {
      const consecutiveMissing = previousVerification?.status === "missing" && Boolean(previousVerification.old_enough);
      nextStatus = consecutiveMissing ? "removed" : "verified";
      lastError = consecutiveMissing
        ? "The previously verified link was missing in two checks at least 24 hours apart."
        : "The link was missing once; RankCues will confirm again after 24 hours.";
    } else {
      const failures = Number(current.verification_failures || 0) + 1;
      nextStatus = failures >= 6 ? "needs_action" : fromStatus === "submitted" ? "pending_review" : fromStatus;
      lastError = "The public page is reachable, but the approved target link was not found.";
    }

    await transaction`
      insert into rankcues_link_verifications (
        id, workspace_id, submission_id, status, page_url, target_url,
        http_status, indexable, link_rel, evidence
      ) values (
        ${stableId(job.id, "verification", randomUUID())}, ${job.workspaceId}, ${job.submissionId},
        ${verificationStatus}, ${inspection.pageUrl}, ${fetchedTargetUrl},
        ${inspection.httpStatus}, ${inspection.indexable}, ${transaction.json(inspection.linkRel)},
        ${transaction.json(JSON.parse(JSON.stringify({ matchedHref: inspection.matchedHref, title: inspection.title })))}
      )
    `;
    await transaction`
      update rankcues_link_submissions set
        status = ${nextStatus},
        published_at = case when ${inspection.matched} then coalesce(published_at, now()) else published_at end,
        verified_at = case when ${inspection.matched} then now() else verified_at end,
        removed_at = case when ${nextStatus} = 'removed' then now() else removed_at end,
        verification_failures = case when ${inspection.matched} then 0 else verification_failures + 1 end,
        last_checked_at = now(), next_verify_at = ${nextStatus === "removed" ? null : nextVerifyAt},
        last_error_code = ${inspection.matched ? null : "link_missing"}, last_error = ${lastError},
        public_url = ${inspection.pageUrl}, updated_at = now()
      where id = ${job.submissionId} and workspace_id = ${job.workspaceId}
        and status = ${fromStatus}
    `;
    const [opportunityUpdated] = await transaction`
      update rankcues_link_opportunities set
        status = ${nextStatus}, public_listing_url = ${inspection.pageUrl},
        last_error = ${lastError}, updated_at = now()
      where id = ${String(current.opportunity_id)} and workspace_id = ${job.workspaceId}
        and status = ${fromStatus}
      returning id
    `;
    if (!opportunityUpdated) throw new LinkJobError("The opportunity changed before verification was committed.");
    const eventMetadata = {
      pageUrl: inspection.pageUrl,
      httpStatus: inspection.httpStatus,
      indexable: inspection.indexable,
      linkRel: inspection.linkRel,
    };
    await transaction`
      insert into rankcues_link_events (
        id, workspace_id, campaign_id, opportunity_id, submission_id, job_id,
        actor_type, event_type, from_status, to_status, metadata
      ) values (
        ${stableId(job.id, "verification_event", randomUUID())}, ${job.workspaceId},
        ${String(current.campaign_id)}, ${String(current.opportunity_id)}, ${job.submissionId}, ${job.id},
        'worker', ${inspection.matched ? "public_link_verified" : nextStatus === "removed" ? "verified_link_removed" : "public_link_missing"},
        ${fromStatus}, ${nextStatus}, ${transaction.json(JSON.parse(JSON.stringify(eventMetadata)))}
      )
    `;
    const jobResult = {
      status: verificationStatus,
      businessStatus: nextStatus,
      pageUrl: inspection.pageUrl,
      httpStatus: inspection.httpStatus,
      indexable: inspection.indexable,
      linkRel: inspection.linkRel,
    };
    const [completed] = await transaction`
      update rankcues_link_jobs set status = 'succeeded',
        result = ${transaction.json(JSON.parse(JSON.stringify(jobResult)))},
        completed_at = now(), lease_token = null, leased_by = null, lease_expires_at = null,
        error = null, error_class = null, updated_at = now()
      where id = ${job.id} and status = 'processing' and lease_token = ${job.leaseToken}
      returning id
    `;
    if (!completed) throw new LinkJobError("The worker lease changed before verification was committed.");
    return { status: nextStatus, verified: inspection.matched };
  });
}

async function markRemoteSubmissionOutcome(input: {
  job: StoredLinkJob;
  row: Record<string, unknown>;
  outcome: z.infer<typeof executorResponseSchema>;
}) {
  await renewLinkJobLease(input.job);
  const sql = getDatabase();
  const publicUrl = input.outcome.publicUrl ? normalizePublicHttpsUrl(input.outcome.publicUrl) : null;
  if (input.outcome.publicUrl && !publicUrl) throw new LinkJobError("The authorized connector returned an invalid public URL.");
  const nextStatus = input.outcome.status;
  const message = input.outcome.message || null;
  await sql`
    update rankcues_link_submissions set
      status = ${nextStatus}, remote_submission_id = ${input.outcome.externalId || null},
      public_url = coalesce(${publicUrl}, public_url),
      submitted_at = case when ${nextStatus} in ('submitted','pending_review') then coalesce(submitted_at, now()) else submitted_at end,
      pending_review_at = case when ${nextStatus} = 'pending_review' then now() else pending_review_at end,
      next_verify_at = case when ${publicUrl}::text is not null then now() else next_verify_at end,
      last_error_code = case when ${nextStatus} in ('needs_action','rejected') then ${nextStatus} else null end,
      last_error = ${message}, updated_at = now()
    where id = ${input.job.submissionId} and workspace_id = ${input.job.workspaceId}
      and approval_version = ${input.job.approvalVersion}
  `;
  await sql`
    update rankcues_link_opportunities set
      status = ${nextStatus}, public_listing_url = coalesce(${publicUrl}, public_listing_url),
      last_error = ${message}, updated_at = now()
    where id = ${String(input.row.opportunity_id)} and workspace_id = ${input.job.workspaceId}
  `;
  await recordLinkEvent({
    workspaceId: input.job.workspaceId,
    campaignId: String(input.row.campaign_id),
    opportunityId: String(input.row.opportunity_id),
    submissionId: input.job.submissionId,
    jobId: input.job.id,
    actorType: "worker",
    eventType: `connector_${nextStatus}`,
    fromStatus: String(input.row.opportunity_status),
    toStatus: nextStatus,
    metadata: { publicUrl, externalId: input.outcome.externalId || null, message },
  });
  if (publicUrl) await enqueueLinkJob({ workspaceId: input.job.workspaceId, submissionId: input.job.submissionId, kind: "verify", force: true });
  await completeLinkJob(input.job, { ...input.outcome, publicUrl });
  return { status: nextStatus, publicUrl };
}

async function runLinkSubmissionJob(job: StoredLinkJob) {
  const feature = getLinkCampaignPublicStatus();
  const executorBase = normalizePublicHttpsUrl(process.env.LINK_EXECUTOR_URL);
  const executorToken = process.env.LINK_EXECUTOR_TOKEN;
  if (!feature.autoExecutionConfigured || !executorBase || !executorToken) {
    throw new LinkJobError("Authorized automatic submission is not configured.");
  }
  const sql = getDatabase();
  const [row] = await sql`
    select sub.*, o.id as opportunity_id, o.campaign_id, o.target_id,
      o.status as opportunity_status, t.connector_key as target_connector_key,
      t.automation_allowed, t.policy_status, t.supports_idempotency,
      conn.id as connection_id, conn.status as connection_status,
      campaign.status as campaign_status,
      coalesce(settings.enabled, ${workspaceDefaultsToEnabled()}) as workspace_enabled
    from rankcues_link_submissions sub
    join rankcues_link_opportunities o
      on o.id = sub.opportunity_id and o.workspace_id = sub.workspace_id
    join rankcues_link_targets t on t.id = o.target_id and t.active = true
    join rankcues_link_connections conn
      on conn.target_id = t.id and conn.workspace_id = sub.workspace_id
    join rankcues_link_campaigns campaign
      on campaign.id = sub.campaign_id and campaign.workspace_id = sub.workspace_id
    left join rankcues_link_workspace_settings settings on settings.workspace_id = sub.workspace_id
    where sub.id = ${job.submissionId} and sub.workspace_id = ${job.workspaceId}
    limit 1
  `;
  const requestHash = row ? payloadHash(row.payload || {}) : "";
  if (!row
    || String(row.status) !== "approved"
    || String(row.opportunity_status) !== "approved"
    || String(row.submission_mode) !== "official_api"
    || Number(row.approval_version) !== job.approvalVersion
    || String(row.payload_hash) !== requestHash
    || String(row.approved_payload_hash) !== requestHash
    || !row.automation_allowed
    || String(row.policy_status) !== "approved"
    || !row.supports_idempotency
    || String(row.connection_status) !== "connected"
    || String(row.campaign_status) !== "active"
    || !row.workspace_enabled
    || !row.target_connector_key
    || String(row.connector_key) !== String(row.target_connector_key)) {
    throw new LinkJobError("The approved submission snapshot or connector authorization is no longer valid.");
  }
  const marked = await sql.begin(async (transaction) => {
    const [current] = await transaction`
      select campaign.status as campaign_status,
        coalesce(settings.enabled, ${workspaceDefaultsToEnabled()}) as workspace_enabled
      from rankcues_link_submissions sub
      join rankcues_link_campaigns campaign
        on campaign.id = sub.campaign_id and campaign.workspace_id = sub.workspace_id
      left join rankcues_link_workspace_settings settings on settings.workspace_id = sub.workspace_id
      where sub.id = ${job.submissionId} and sub.workspace_id = ${job.workspaceId}
      limit 1 for share of campaign
    `;
    if (!current || String(current.campaign_status) !== "active" || !current.workspace_enabled) return null;
    const [claimed] = await transaction`
      update rankcues_link_jobs set write_started_at = coalesce(write_started_at, now()),
        lease_expires_at = now() + interval '2 minutes', updated_at = now()
      where id = ${job.id} and status = 'processing' and lease_token = ${job.leaseToken}
        and lease_expires_at > now()
      returning id
    `;
    return claimed || null;
  });
  if (!marked) throw new LinkJobError("The worker lease expired before the external request started.");

  const endpoint = new URL("/v1/submissions", executorBase).toString();
  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      redirect: "error",
      headers: {
        authorization: `Bearer ${executorToken}`,
        "content-type": "application/json",
        "idempotency-key": job.remoteIdempotencyKey,
      },
      body: JSON.stringify({
        jobId: job.id,
        connectorKey: String(row.target_connector_key),
        connectionId: String(row.connection_id),
        payload: row.payload || {},
      }),
      signal: AbortSignal.timeout(20_000),
    });
  } catch (error) {
    throw new LinkJobError(error instanceof Error ? `Authorized connector request failed: ${error.message}` : "Authorized connector request failed.", true);
  }
  const responseText = await readLimitedText(response, 64_000);
  let responseBody: unknown = {};
  try {
    responseBody = responseText ? JSON.parse(responseText) : {};
  } catch {
    throw new LinkJobError(`The authorized connector returned invalid JSON (HTTP ${response.status}).`, response.status >= 500);
  }
  if (!response.ok) {
    const message = typeof responseBody === "object" && responseBody && "message" in responseBody
      ? String((responseBody as { message?: unknown }).message)
      : `Authorized connector returned HTTP ${response.status}.`;
    if (response.status === 401 || response.status === 403) {
      return markRemoteSubmissionOutcome({ job, row, outcome: { status: "needs_action", message } });
    }
    if (response.status === 400 || response.status === 404 || response.status === 422) {
      return markRemoteSubmissionOutcome({ job, row, outcome: { status: "rejected", message } });
    }
    throw new LinkJobError(message, response.status === 429 || response.status >= 500);
  }
  const outcome = executorResponseSchema.parse(responseBody);
  return markRemoteSubmissionOutcome({ job, row, outcome });
}

export async function processLinkJobs(input: { limit?: number } = {}) {
  const feature = getLinkCampaignPublicStatus();
  if (!feature.enabled) return { skipped: true, reason: "feature_disabled", processed: 0, results: [] };
  await ensureLinkCampaignSchema();
  const limit = Math.max(1, Math.min(input.limit || 5, 10));
  await enqueueDueLinkVerifications(limit);
  const workerId = `link-worker:${randomUUID()}`;
  const results: Array<Record<string, unknown>> = [];
  for (let index = 0; index < limit; index += 1) {
    const job = await claimLinkJob(workerId);
    if (!job) break;
    try {
      const result = job.kind === "verify"
        ? await runLinkVerificationJob(job)
        : await runLinkSubmissionJob(job);
      results.push({ jobId: job.id, kind: job.kind, ok: true, ...result });
    } catch (error) {
      const retryable = error instanceof LinkJobError && error.retryable;
      const failure = await failLinkJob(job, error, retryable);
      results.push({ jobId: job.id, kind: job.kind, ok: false, ...failure });
    }
  }
  return { skipped: false, processed: results.length, results };
}
