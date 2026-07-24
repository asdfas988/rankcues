import { getPersistencePublicStatus } from "@/lib/data-store";
import { syncActiveGscSites } from "@/lib/gsc-sync";
import { readRequestData, respond } from "@/lib/request-data";
import { authorizeApiRequest, isAuthFailure } from "@/lib/auth-session";
import { enforceActionLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: Request) {
  const access = await authorizeApiRequest(request);
  if (isAuthFailure(access)) return access;
  const limited = await enforceActionLimit({ workspaceId: access.workspaceId, action: "gsc_sync_all", limit: 2, windowSeconds: 3600 });
  if (limited) return limited;
  const body = await readRequestData(request);
  const persistence = getPersistencePublicStatus();
  if (!persistence.ready) {
    return respond(request, body, { status: "configuration_required", persistence }, "/app/connect?sync=storage-required", { status: 503 });
  }

  try {
    const results = await syncActiveGscSites(3);
    const failed = results.filter((item) => item.ok === false);
    return respond(
      request,
      body,
      { status: failed.length ? "partial" : "completed", synced: results.length - failed.length, failed: failed.length, results },
      failed.length ? "/app/connect?sync=partial" : "/app/connect?sync=all-completed",
      failed.length === results.length && results.length > 0 ? { status: 502 } : undefined,
    );
  } catch (error) {
    return respond(request, body, { status: "failed", message: error instanceof Error ? error.message : "Unknown sync error." }, "/app/connect?sync=failed", { status: 502 });
  }
}
