import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getAiProviderPublicStatus } from "@/lib/ai-provider";
import { createReportJob, getActiveSites, getPersistencePublicStatus, getSiteByIdOrUrl, getWeeklyEvidence, getWorkspaceLocale } from "@/lib/data-store";
import { readRequestData, respond } from "@/lib/request-data";
import { authorizeApiRequest, isAuthFailure } from "@/lib/auth-session";
import { enforceActionLimit } from "@/lib/rate-limit";
import { processQueuedReportJobs } from "@/lib/report-jobs";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const access = await authorizeApiRequest(request);
  if (isAuthFailure(access)) return access;
  const limited = await enforceActionLimit({ workspaceId: access.workspaceId, action: "ai_report", limit: 6, windowSeconds: 3600 });
  if (limited) return limited;
  const body = await readRequestData(request);
  const provider = getAiProviderPublicStatus();
  const persistence = getPersistencePublicStatus();

  if (!persistence.ready) {
    return respond(request, body, { status: "configuration_required", message: "Persistent storage is required before AI analysis can run." }, "/app/settings", { status: 503 });
  }
  if (!provider.configured) {
    return respond(request, body, { status: "service_unavailable", provider, message: "Managed AI analysis is temporarily unavailable. Existing reports remain readable." }, "/app/reports?provider=unavailable", { status: 503 });
  }

  try {
    const requestedSite = body.siteId?.toString() || body.site?.toString();
    const site = requestedSite ? await getSiteByIdOrUrl(requestedSite) : (await getActiveSites(1))[0] ?? null;
    if (!site) {
      return respond(request, body, { status: "site_required", message: "Connect and sync a Search Console property before generating a report." }, "/app/connect", { status: 400 });
    }
    const evidence = await getWeeklyEvidence(site.id);
    if (!evidence) {
      return respond(request, body, { status: "evidence_required", message: "No live Search Console evidence is available for this property." }, `/app/sites/${site.id}`, { status: 400 });
    }
    const outputLocale = await getWorkspaceLocale();
    const job = await createReportJob({
      workspaceId: access.workspaceId,
      siteId: site.id,
      outputLocale,
      source: "manual",
      request: body,
    });

    try {
      const { ctx } = getCloudflareContext();
      ctx.waitUntil(processQueuedReportJobs({ jobId: job.id, limit: 1 }));
    } catch {
      // Local development has no Cloudflare execution context. The scheduler
      // remains the durable processor for every queued report.
    }

    const reportsPath = `/app/reports?site=${encodeURIComponent(site.id)}&job=${encodeURIComponent(job.id)}`;
    return respond(
      request,
      body,
      {
        status: job.status,
        evidenceMode: "persistent",
        site: { id: site.id, siteUrl: site.siteUrl },
        job,
      },
      reportsPath,
      { status: 202 },
    );
  } catch (error) {
    return respond(request, body, { status: "queue_failed", provider, message: error instanceof Error ? error.message : "Unknown AI error." }, "/app/settings?provider=error", { status: 502 });
  }
}
