import { getLinkCampaignPublicStatus } from "@/lib/link-campaigns";
import { linkApiError, runLinkJobs } from "@/lib/link-api";

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  return Boolean(secret && request.headers.get("authorization") === `Bearer ${secret}`);
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) return new Response("Unauthorized", { status: 401 });
  const feature = getLinkCampaignPublicStatus();
  if (!feature.enabled) {
    return Response.json(
      { status: "disabled", message: "The controlled link campaign experiment is disabled." },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const configuredLimit = Number(process.env.LINK_JOB_BATCH_SIZE || 3);
    const limit = Math.max(1, Math.min(Number.isFinite(configuredLimit) ? configuredLimit : 3, 10));
    const run = await runLinkJobs({ limit });
    return Response.json({
      status: run.skipped ? "disabled" : run.processed ? "processed" : "idle",
      ...run,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return linkApiError(error);
  }
}
