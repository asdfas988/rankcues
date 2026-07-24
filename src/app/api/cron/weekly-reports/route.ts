import { getAiProviderPublicStatus } from "@/lib/ai-provider";
import {
  createReportJob,
  getActiveSites,
  getPersistencePublicStatus,
  getWorkspaceLocale,
  getWeeklyEvidence,
} from "@/lib/data-store";

export const runtime = "nodejs";
export const maxDuration = 60;

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  return Boolean(secret && request.headers.get("authorization") === `Bearer ${secret}`);
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) return new Response("Unauthorized", { status: 401 });
  const persistence = getPersistencePublicStatus();
  const provider = getAiProviderPublicStatus();
  if (!persistence.ready || !provider.configured) {
    return Response.json(
      { status: "configuration_required", persistence, provider },
      { status: 503 },
    );
  }

  const sites = await getActiveSites(Number(process.env.WEEKLY_REPORT_SITE_LIMIT || 10));
  const outputLocale = await getWorkspaceLocale();
  const results: Array<Record<string, unknown>> = [];

  for (const site of sites) {
    try {
      const evidence = await getWeeklyEvidence(site.id);
      if (!evidence) {
        results.push({
          ok: false,
          siteId: site.id,
          siteUrl: site.siteUrl,
          status: "evidence_required",
        });
        continue;
      }
      const job = await createReportJob({
        siteId: site.id,
        outputLocale,
        source: "weekly",
        request: { trigger: "weekly_schedule" },
      });
      results.push({
        ok: true,
        siteId: site.id,
        siteUrl: site.siteUrl,
        jobId: job.id,
        status: job.status,
      });
    } catch (error) {
      results.push({
        ok: false,
        siteId: site.id,
        siteUrl: site.siteUrl,
        error: error instanceof Error ? error.message : "Unknown report queue error.",
      });
    }
  }

  return Response.json({ status: "queued", results });
}
