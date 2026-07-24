import { mapGa4PropertyToSite } from "@/lib/data-store";
import { readRequestData, respond } from "@/lib/request-data";
import { authorizeApiRequest, isAuthFailure } from "@/lib/auth-session";

export async function POST(request: Request) {
  const access = await authorizeApiRequest(request);
  if (isAuthFailure(access)) return access;
  const body = await readRequestData(request);
  const propertyId = String(body.propertyId || "");
  const siteId = body.siteId ? String(body.siteId) : null;
  if (!propertyId) return respond(request, body, { status: "invalid_request", message: "propertyId is required." }, "/app/traffic", { status: 400 });
  try {
    await mapGa4PropertyToSite(propertyId, siteId);
    return respond(request, body, { status: "mapped", propertyId, siteId }, "/app/traffic?ga4=mapped");
  } catch (error) {
    return respond(request, body, { status: "mapping_failed", message: error instanceof Error ? error.message : "Mapping failed." }, "/app/traffic?ga4=error", { status: 400 });
  }
}
