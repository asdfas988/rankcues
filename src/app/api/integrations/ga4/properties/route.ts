import { discoverGa4PropertiesForConnection } from "@/lib/google-analytics";
import { listGa4Properties, listGoogleConnections } from "@/lib/data-store";
import { authorizeApiRequest, isAuthFailure } from "@/lib/auth-session";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const access = await authorizeApiRequest(request);
  if (isAuthFailure(access)) return access;
  return Response.json({ status: "ready", provider: "google_analytics_4", properties: await listGa4Properties() });
}

export async function POST(request: Request) {
  const access = await authorizeApiRequest(request);
  if (isAuthFailure(access)) return access;
  const connections = (await listGoogleConnections()).filter((connection) => !connection.googleSubject.startsWith("service-account:"));
  const results: Array<Record<string, unknown>> = [];
  for (const connection of connections) {
    try {
      const properties = await discoverGa4PropertiesForConnection(connection.id);
      results.push({ ok: true, connectionId: connection.id, email: connection.email, properties: properties.length });
    } catch (error) {
      results.push({ ok: false, connectionId: connection.id, email: connection.email, error: error instanceof Error ? error.message : "GA4 discovery failed." });
    }
  }
  return Response.json({ status: results.some((result) => result.ok) ? "completed" : "failed", results, properties: await listGa4Properties() }, { status: results.some((result) => result.ok) ? 200 : 502 });
}
