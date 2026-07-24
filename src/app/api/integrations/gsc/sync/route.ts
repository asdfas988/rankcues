import { getPersistencePublicStatus, getSiteByIdOrUrl } from "@/lib/data-store";
import { syncGscSite } from "@/lib/gsc-sync";
import { readRequestData, respond } from "@/lib/request-data";
import { authorizeApiRequest, isAuthFailure } from "@/lib/auth-session";
import { enforceActionLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: Request) {
  const access = await authorizeApiRequest(request);
  if (isAuthFailure(access)) return access;
  const limited = await enforceActionLimit({ workspaceId: access.workspaceId, action: "gsc_sync", limit: 6, windowSeconds: 3600 });
  if (limited) return limited;
  const body = await readRequestData(request);
  const persistence = getPersistencePublicStatus();
  if (!persistence.ready) {
    return respond(
      request,
      body,
      { status: "configuration_required", persistence },
      "/app/connect?sync=storage-required",
      { status: 503 },
    );
  }

  const siteValue = body.siteId?.toString() || body.site?.toString();
  if (!siteValue) {
    return respond(
      request,
      body,
      { status: "invalid_request", message: "siteId or site is required." },
      "/app/connect?sync=missing-site",
      { status: 400 },
    );
  }
  const site = await getSiteByIdOrUrl(siteValue);
  if (!site) {
    return respond(
      request,
      body,
      { status: "not_found", message: "The site is not registered in this workspace." },
      "/app/connect?sync=not-found",
      { status: 404 },
    );
  }

  try {
    const result = await syncGscSite(site, {
      days: Number(body.days || 35),
    });
    return respond(
      request,
      body,
      { status: "completed", result },
      "/app/connect?sync=completed",
    );
  } catch (error) {
    return respond(
      request,
      body,
      {
        status: "failed",
        message: error instanceof Error ? error.message : "Unknown GSC sync error.",
      },
      "/app/connect?sync=failed",
      { status: 502 },
    );
  }
}
