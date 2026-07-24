import { syncBacklinksForSite } from "@/lib/backlink-provider";
import { getActiveSites, getSiteByIdOrUrl } from "@/lib/data-store";
import { readRequestData, respond } from "@/lib/request-data";
import { authorizeApiRequest, isAuthFailure } from "@/lib/auth-session";
import { enforceActionLimit } from "@/lib/rate-limit";

export const maxDuration = 300;

export async function POST(request: Request) {
  const access = await authorizeApiRequest(request);
  if (isAuthFailure(access)) return access;
  const limited = await enforceActionLimit({ workspaceId: access.workspaceId, action: "backlink_sync", limit: 4, windowSeconds: 3600 });
  if (limited) return limited;
  const body = await readRequestData(request);
  const requested = body.siteId ? String(body.siteId) : null;
  const sites = requested ? [await getSiteByIdOrUrl(requested)].filter(Boolean) : await getActiveSites(1);
  const results: Array<Record<string, unknown>> = [];
  for (const site of sites) {
    if (!site) continue;
    try { results.push({ ok: true, ...(await syncBacklinksForSite(site)) }); }
    catch (error) { results.push({ ok: false, siteId: site.id, siteUrl: site.siteUrl, error: error instanceof Error ? error.message : "Backlink sync failed." }); }
  }
  const ok = results.some((result) => result.ok);
  return respond(request, body, { status: ok ? "completed" : "failed", results }, `/app/backlinks?sync=${ok ? "completed" : "failed"}`, { status: ok ? 200 : 502 });
}
