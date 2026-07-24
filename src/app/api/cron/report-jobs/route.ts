import { getAiProviderPublicStatus } from "@/lib/ai-provider";
import { getPersistencePublicStatus } from "@/lib/data-store";
import { processQueuedReportJobs } from "@/lib/report-jobs";

export const runtime = "nodejs";
export const maxDuration = 300;

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
  const results = await processQueuedReportJobs({
    limit: Number(process.env.REPORT_JOB_BATCH_SIZE || 1),
  });
  return Response.json({
    status: results.length ? "processed" : "idle",
    results,
  });
}
