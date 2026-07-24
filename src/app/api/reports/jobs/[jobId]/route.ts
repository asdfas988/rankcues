import { authorizeApiRequest, isAuthFailure } from "@/lib/auth-session";
import { getReportJob } from "@/lib/data-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ jobId: string }> },
) {
  const access = await authorizeApiRequest(request);
  if (isAuthFailure(access)) return access;
  const { jobId } = await context.params;
  const job = await getReportJob(jobId, access.workspaceId);
  if (!job) {
    return Response.json(
      { status: "not_found", message: "Report job not found." },
      { status: 404, headers: { "Cache-Control": "no-store" } },
    );
  }
  return Response.json(
    { status: "ok", job },
    { headers: { "Cache-Control": "no-store" } },
  );
}
