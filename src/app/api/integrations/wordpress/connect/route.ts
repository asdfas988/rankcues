import { authorizeApiRequest, isAuthFailure } from "@/lib/auth-session";
import { getSiteByIdOrUrl, upsertWordPressConnection } from "@/lib/data-store";
import { enforceActionLimit } from "@/lib/rate-limit";
import { readRequestData, respond } from "@/lib/request-data";
import { normalizeWordPressBaseUrl, verifyWordPressConnection } from "@/lib/wordpress";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const access = await authorizeApiRequest(request);
  if (isAuthFailure(access)) return access;
  const limited = await enforceActionLimit({
    workspaceId: access.workspaceId,
    action: "wordpress_connect",
    limit: 10,
    windowSeconds: 3600,
  });
  if (limited) return limited;
  const body = await readRequestData(request);
  try {
    const siteId = String(body.siteId || "");
    const username = String(body.username || "").trim();
    const applicationPassword = String(body.applicationPassword || "").replace(/\s+/g, "");
    const baseUrl = normalizeWordPressBaseUrl(String(body.baseUrl || ""));
    const site = siteId ? await getSiteByIdOrUrl(siteId) : null;
    if (!site || !username || applicationPassword.length < 12) {
      return respond(request, body, {
        status: "invalid_request",
        message: "Choose a monitored site and provide a WordPress username and Application Password.",
      }, "/app/settings?wordpress=invalid", { status: 400 });
    }
    const wordpressHost = new URL(baseUrl).hostname.toLowerCase().replace(/^www\./, "");
    const monitoredHost = site.siteUrl.startsWith("sc-domain:")
      ? site.siteUrl.replace(/^sc-domain:/, "").toLowerCase().replace(/^www\./, "")
      : new URL(site.siteUrl).hostname.toLowerCase().replace(/^www\./, "");
    if (
      wordpressHost !== monitoredHost
      && !wordpressHost.endsWith(`.${monitoredHost}`)
      && !monitoredHost.endsWith(`.${wordpressHost}`)
    ) {
      return respond(request, body, {
        status: "site_mismatch",
        message: "The WordPress host does not match the selected monitored property.",
      }, "/app/settings?wordpress=invalid", { status: 400 });
    }
    const verified = await verifyWordPressConnection({ baseUrl, username, applicationPassword });
    const connection = await upsertWordPressConnection({
      siteId: site.id,
      baseUrl,
      username,
      applicationPassword,
      remoteUserId: verified.userId,
      remoteDisplayName: verified.displayName,
      capabilities: verified.capabilities,
    });
    return respond(request, body, {
      status: "connected",
      connection: {
        id: connection.id,
        siteId: connection.siteId,
        baseUrl: connection.baseUrl,
        displayName: connection.remoteDisplayName,
      },
    }, "/app/settings?wordpress=connected");
  } catch (error) {
    return respond(request, body, {
      status: "connection_failed",
      message: error instanceof Error ? error.message : "WordPress connection failed.",
    }, "/app/settings?wordpress=error", { status: 400 });
  }
}
