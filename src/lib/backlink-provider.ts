import { z } from "zod";
import { classifyLinkOpportunity, isPublicHostname, normalizePublicHttpsUrl } from "@/lib/link-campaign-model";
import type { DiscoveredLinkOpportunityInput } from "@/lib/link-campaigns";
import {
  createSyncRun,
  finishSyncRun,
  getBacklinkOverview,
  saveBacklinks,
  saveBacklinkSnapshot,
  saveEvidenceEvent,
  stableId,
  type StoredSite,
} from "@/lib/data-store";

const taskResponseSchema = z.object({
  tasks: z.array(z.object({
    status_code: z.number().optional(),
    status_message: z.string().optional(),
    result: z.array(z.record(z.string(), z.unknown())).nullable().optional(),
  })).optional(),
});

export function getBacklinkProviderPublicStatus() {
  return {
    provider: "DataForSEO",
    configured: Boolean(process.env.DATAFORSEO_LOGIN && process.env.DATAFORSEO_PASSWORD),
    capability: "live backlink summary and link-level monitoring",
  };
}

function credentials() {
  const login = process.env.DATAFORSEO_LOGIN;
  const password = process.env.DATAFORSEO_PASSWORD;
  if (!login || !password) throw new Error("Set DATAFORSEO_LOGIN and DATAFORSEO_PASSWORD to enable backlink monitoring.");
  return `Basic ${Buffer.from(`${login}:${password}`).toString("base64")}`;
}

async function callDataForSeo(path: string, task: Record<string, unknown>) {
  const response = await fetch(`https://api.dataforseo.com/v3/backlinks/${path}/live`, {
    method: "POST",
    headers: { authorization: credentials(), "content-type": "application/json" },
    body: JSON.stringify([task]),
    cache: "no-store",
    signal: AbortSignal.timeout(45_000),
  });
  const json = await response.json().catch(() => null);
  if (!response.ok) throw new Error(`DataForSEO request failed: ${response.status} ${response.statusText}`);
  const parsed = taskResponseSchema.parse(json);
  const taskResult = parsed.tasks?.[0];
  if (!taskResult || (taskResult.status_code && taskResult.status_code >= 40000)) {
    throw new Error(`DataForSEO task failed: ${taskResult?.status_message || "No result returned."}`);
  }
  return taskResult.result?.[0] ?? {};
}

function number(value: unknown) {
  const result = Number(value || 0);
  return Number.isFinite(result) ? result : 0;
}

function string(value: unknown) {
  return typeof value === "string" ? value : "";
}

function siteTarget(site: StoredSite) {
  if (site.backlinkTarget) return site.backlinkTarget;
  if (site.siteUrl.startsWith("sc-domain:")) return site.siteUrl.slice("sc-domain:".length);
  return new URL(site.siteUrl).hostname;
}

function normalizeBacklinkGapTarget(value: string) {
  const text = value.trim();
  if (!text || text.length > 500) return null;
  try {
    const url = new URL(text);
    if (!['http:', 'https:'].includes(url.protocol) || !isPublicHostname(url.hostname)) return null;
    url.hash = "";
    return url.toString();
  } catch {
    const domain = text.toLowerCase().replace(/^www\./, "").replace(/\.$/, "");
    return isPublicHostname(domain) && /^[a-z0-9.-]+$/i.test(domain) ? domain : null;
  }
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

export async function discoverBacklinkGap(input: {
  target: string;
  competitors: string[];
  limit?: number;
}): Promise<DiscoveredLinkOpportunityInput[]> {
  const target = normalizeBacklinkGapTarget(input.target);
  if (!target) throw new Error("Use a valid public domain or URL for the backlink target.");
  const competitors = [...new Set(input.competitors.map(normalizeBacklinkGapTarget).filter((value): value is string => Boolean(value)))]
    .filter((value) => value !== target)
    .slice(0, 20);
  if (!competitors.length) throw new Error("Add at least one valid competitor domain or URL.");
  const targets = Object.fromEntries(competitors.map((competitor, index) => [String(index + 1), competitor]));
  const result = await callDataForSeo("page_intersection", {
    targets,
    exclude_targets: [target],
    backlinks_status_type: "live",
    intersection_mode: "all",
    include_subdomains: true,
    exclude_internal_backlinks: true,
    rank_scale: "one_hundred",
    limit: Math.max(1, Math.min(input.limit || 100, 300)),
    order_by: ["1.domain_from_rank,desc"],
  });
  const items = Array.isArray(result.items) ? result.items : [];
  const discovered = new Map<string, DiscoveredLinkOpportunityInput>();
  for (const item of items) {
    const intersection = record(record(item)?.page_intersection);
    if (!intersection) continue;
    const matches = Object.entries(intersection).flatMap(([targetKey, entries]) =>
      Array.isArray(entries)
        ? entries.map((entry) => ({ targetKey, entry: record(entry) })).filter((value): value is { targetKey: string; entry: Record<string, unknown> } => Boolean(value.entry))
        : [],
    );
    const first = matches.find(({ entry }) => normalizePublicHttpsUrl(entry.url_from));
    if (!first) continue;
    const sourceUrl = normalizePublicHttpsUrl(first.entry.url_from);
    if (!sourceUrl) continue;
    const samePage = matches.filter(({ entry }) => normalizePublicHttpsUrl(entry.url_from) === sourceUrl);
    const linkedKeys = [...new Set(samePage.map(({ targetKey }) => targetKey))];
    const strongest = samePage.reduce((best, current) =>
      number(current.entry.domain_from_rank) > number(best.entry.domain_from_rank) ? current : best,
    first);
    const spamScore = samePage.reduce((maximum, current) => Math.max(maximum, number(current.entry.backlink_spam_score)), 0);
    const authorityScore = Math.max(0, Math.min(number(strongest.entry.domain_from_rank), 100));
    const inferred = classifyLinkOpportunity({
      url: sourceUrl,
      title: string(strongest.entry.page_from_title),
      spamScore,
    });
    const relevanceScore = Math.max(0, Math.min(45 + linkedKeys.length * 12 + Math.round(authorityScore * 0.2), 100));
    const existing = discovered.get(sourceUrl);
    if (existing && (existing.relevanceScore || 0) >= relevanceScore) continue;
    discovered.set(sourceUrl, {
      sourceUrl,
      submissionUrl: sourceUrl,
      destinationName: string(strongest.entry.page_from_title) || string(strongest.entry.domain_from) || new URL(sourceUrl).hostname,
      source: "dataforseo_gap",
      category: inferred.category,
      relevanceScore,
      authorityScore,
      spamScore,
      risk: inferred.risk,
      rationale: `This page links to ${linkedKeys.length} of ${competitors.length} competitor targets but not to your selected property. Review relevance and destination policy before outreach or submission.`,
      metadata: {
        provider: "DataForSEO",
        linkedCompetitorCount: linkedKeys.length,
        matchedTargetKeys: linkedKeys,
        pageRank: number(strongest.entry.page_from_rank),
        platformTypes: Array.isArray(strongest.entry.domain_from_platform_type) ? strongest.entry.domain_from_platform_type : [],
        pageStatusCode: number(strongest.entry.page_from_status_code),
      },
    });
  }
  return [...discovered.values()]
    .sort((left, right) => (right.relevanceScore || 0) - (left.relevanceScore || 0))
    .slice(0, Math.max(1, Math.min(input.limit || 100, 300)));
}

export async function syncBacklinksForSite(site: StoredSite) {
  const runId = await createSyncRun(site.id, "backlink");
  const target = siteTarget(site);
  const capturedOn = new Date().toISOString().slice(0, 10);
  try {
    const previous = (await getBacklinkOverview(site.id)).latest?.[0] ?? null;
    const [summary, detail] = await Promise.all([
      callDataForSeo("summary", { target, include_subdomains: true, internal_list_limit: 10 }),
      callDataForSeo("backlinks", { target, include_subdomains: true, limit: 500, order_by: ["rank,desc"] }),
    ]);
    const items = Array.isArray(detail.items) ? detail.items as Array<Record<string, unknown>> : [];
    const backlinks = number(summary.backlinks ?? summary.total_backlinks);
    const referringDomains = number(summary.referring_domains);
    const newBacklinks = number(summary.new_backlinks);
    const lostBacklinks = number(summary.lost_backlinks);
    await saveBacklinkSnapshot(site.id, {
      capturedOn,
      backlinks,
      referringDomains,
      referringPages: number(summary.referring_pages),
      dofollow: number(summary.dofollow ?? summary.referring_links_types),
      newBacklinks,
      lostBacklinks,
      rank: number(summary.rank),
      raw: summary,
    });
    await saveBacklinks(site.id, items.map((item) => ({
      sourceUrl: string(item.url_from),
      sourceDomain: string(item.domain_from),
      targetUrl: string(item.url_to),
      anchor: string(item.anchor),
      dofollow: Boolean(item.dofollow),
      sourceRank: number(item.rank),
      firstSeen: string(item.first_seen) || null,
      lastSeen: string(item.last_seen) || new Date().toISOString(),
      status: item.is_lost ? "lost" : "live",
      raw: item,
    })).filter((item) => item.sourceUrl && item.targetUrl));

    if (!previous) {
      await saveEvidenceEvent(site.id, {
        id: stableId(site.id, "backlink", "measurement_baseline", capturedOn),
        source: "backlink", kind: "measurement_baseline", occurredAt: new Date(),
        title: "Backlink baseline created",
        description: `${backlinks.toLocaleString()} backlinks across ${referringDomains.toLocaleString()} referring domains are now monitored.`,
        evidenceState: "detected", impact: "low", metadata: { target, backlinks, referringDomains },
      });
    } else {
      const domainDelta = referringDomains - previous.referringDomains;
      const linkDelta = backlinks - previous.backlinks;
      if (domainDelta !== 0 || newBacklinks > 0 || lostBacklinks > 0) {
        await saveEvidenceEvent(site.id, {
          id: stableId(site.id, "backlink", "profile_change", capturedOn),
          source: "backlink", kind: "profile_change", occurredAt: new Date(),
          title: `${domainDelta >= 0 ? "+" : ""}${domainDelta} referring domains detected`,
          description: `Backlinks changed by ${linkDelta >= 0 ? "+" : ""}${linkDelta}; provider reported ${newBacklinks} new and ${lostBacklinks} lost links.`,
          evidenceState: "detected", impact: Math.abs(domainDelta) >= 5 || lostBacklinks >= 10 ? "high" : "medium",
          metadata: { target, domainDelta, linkDelta, newBacklinks, lostBacklinks },
        });
      }
    }
    await finishSyncRun({ id: runId, status: "completed", rowsWritten: items.length, details: { target, backlinks, referringDomains, newBacklinks, lostBacklinks } });
    return { siteId: site.id, siteUrl: site.siteUrl, target, backlinks, referringDomains, rowsWritten: items.length };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown backlink sync error.";
    await finishSyncRun({ id: runId, status: "failed", error: message });
    throw error;
  }
}
