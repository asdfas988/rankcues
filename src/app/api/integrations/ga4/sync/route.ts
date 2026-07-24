import { listGa4Properties } from "@/lib/data-store";
import { syncGa4Property, syncMappedGa4Properties } from "@/lib/google-analytics";
import { readRequestData, respond } from "@/lib/request-data";
import { authorizeApiRequest, isAuthFailure } from "@/lib/auth-session";
import { enforceActionLimit } from "@/lib/rate-limit";

export const maxDuration = 300;

export async function POST(request: Request) {
  const access = await authorizeApiRequest(request);
  if (isAuthFailure(access)) return access;
  const limited = await enforceActionLimit({ workspaceId: access.workspaceId, action: "ga4_sync", limit: 6, windowSeconds: 3600 });
  if (limited) return limited;
  const body = await readRequestData(request);
  try {
    const propertyId = body.propertyId ? String(body.propertyId) : null;
    if (propertyId) {
      const property = (await listGa4Properties()).find((item) => item.id === propertyId);
      if (!property) return respond(request, body, { status: "not_found", message: "GA4 property was not found." }, "/app/traffic", { status: 404 });
      const result = await syncGa4Property(property);
      return respond(request, body, { status: "completed", result }, "/app/traffic?sync=completed");
    }
    const results = await syncMappedGa4Properties();
    return respond(request, body, { status: "completed", results }, "/app/traffic?sync=completed");
  } catch (error) {
    return respond(request, body, { status: "sync_failed", message: error instanceof Error ? error.message : "GA4 sync failed." }, "/app/traffic?sync=failed", { status: 502 });
  }
}
