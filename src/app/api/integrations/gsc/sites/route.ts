import {
  getPersistencePublicStatus,
  listGoogleConnections,
  listGscSites,
} from "@/lib/data-store";
import { getGooglePublicStatus } from "@/lib/google-search-console";
import {
  ensureGoogleServiceAccountConnection,
  getGoogleServiceAccountPublicStatus,
} from "@/lib/google-service-account";
import { authorizeApiRequest, isAuthFailure } from "@/lib/auth-session";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const access = await authorizeApiRequest(request);
  if (isAuthFailure(access)) return access;
  const persistence = getPersistencePublicStatus();
  const google = getGooglePublicStatus();
  const serviceAccount = getGoogleServiceAccountPublicStatus();
  if (!persistence.ready) {
    return Response.json(
      {
        status: "configuration_required",
        provider: "google_search_console",
        message: "Persistent storage must be configured before Google properties can be listed.",
        google,
        serviceAccount,
        persistence,
        connections: [],
        sites: [],
      },
      { status: 503 },
    );
  }

  let connections = await listGoogleConnections();
  let serviceAccountError: string | null = null;
  if (!connections.length && serviceAccount.configured) {
    try {
      await ensureGoogleServiceAccountConnection();
    } catch (error) {
      serviceAccountError =
        error instanceof Error ? error.message : "Service-account connection failed.";
    }
  }

  const sites = await listGscSites();
  if (!connections.length) connections = await listGoogleConnections();
  return Response.json({
    status: connections.length ? "connected" : "not_connected",
    provider: "google_search_console",
    google,
    serviceAccount: { ...serviceAccount, lastError: serviceAccountError },
    persistence,
    connections: connections.map((connection) => ({
      id: connection.id,
      email: connection.email,
      status: connection.status,
      lastError: connection.lastError,
    })),
    sites,
  });
}
