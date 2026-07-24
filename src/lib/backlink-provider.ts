import { z } from "zod";
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
