import { discoverGa4PropertiesForConnection } from "@/lib/google-analytics";
import { listGa4Properties, listGoogleConnections } from "@/lib/data-store";
import { authorizeApiRequest, isAuthFailure } from "@/lib/auth-session";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const access = await authorizeApiRequest(request);
  if (isAuthFailure(access)) return access;
  return Response.json({ status: "ready", provider: "google_analytics_4", properties: await listGa4Properties(access.workspaceId) }, {
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST(request: Request) {
  const access = await authorizeApiRequest(request);
  if (isAuthFailure(access)) return access;
  const connections = (await listGoogleConnections(access.workspaceId)).filter((connection) => !connection.googleSubject.startsWith("service-account:"));
  if (!connections.length) {
    return Response.json({ status: "failed", message: "Connect a Google account before discovering GA4 properties.", results: [] }, {
      status: 400,
      headers: { "Cache-Control": "no-store" },
    });
  }
  const results: Array<Record<string, unknown>> = [];
  for (const connection of connections) {
    try {
      const properties = await discoverGa4PropertiesForConnection(connection.id, access.workspaceId);
      results.push({ ok: true, connectionId: connection.id, email: connection.email, properties: properties.length });
    } catch (error) {
      const failure = error as Error & { code?: string; reconnectRequired?: boolean };
      results.push({
        ok: false,
        connectionId: connection.id,
        email: connection.email,
        code: failure.code || "discovery_failed",
        message: failure.message || "GA4 discovery failed.",
        reconnectRequired: Boolean(failure.reconnectRequired),
      });
    }
  }
  return Response.json({
    status: results.some((result) => result.ok) ? "completed" : "failed",
    results,
    properties: await listGa4Properties(access.workspaceId),
  }, {
    status: results.some((result) => result.ok) ? 200 : 502,
    headers: { "Cache-Control": "no-store" },
  });
}
