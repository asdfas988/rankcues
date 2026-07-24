import { getBacklinkProviderPublicStatus, syncBacklinksForSite } from "@/lib/backlink-provider";
import { getActiveSites, getSiteByIdOrUrl } from "@/lib/data-store";
import { syncGa4Property } from "@/lib/google-analytics";
import { syncGscSite } from "@/lib/gsc-sync";
import { crawlVerifiedSite } from "@/lib/page-crawler";
import { listGa4Properties } from "@/lib/data-store";
import { readRequestData, respond } from "@/lib/request-data";
import { authorizeApiRequest, isAuthFailure } from "@/lib/auth-session";
import { enforceActionLimit } from "@/lib/rate-limit";

export const maxDuration = 300;

export async function POST(request: Request) {
  const access = await authorizeApiRequest(request);
  if (isAuthFailure(access)) return access;
  const limited = await enforceActionLimit({ workspaceId: access.workspaceId, action: "manual_collection", limit: 3, windowSeconds: 900 });
  if (limited) return limited;
  const body = await readRequestData(request);
  const requested = body.siteId ? String(body.siteId) : null;
  const selected = requested ? await getSiteByIdOrUrl(requested) : null;
  const sites = selected ? [selected] : await getActiveSites(1);
  const results: Array<Record<string, unknown>> = [];
  for (const site of sites) {
    try { results.push({ source: "gsc", ok: true, ...(await syncGscSite(site)) }); }
    catch (error) { results.push({ source: "gsc", ok: false, siteId: site.id, error: error instanceof Error ? error.message : "GSC sync failed." }); }
    try { results.push({ source: "crawler", ok: true, ...(await crawlVerifiedSite(site, { maxPages: site.crawlPageLimit })) }); }
    catch (error) { results.push({ source: "crawler", ok: false, siteId: site.id, error: error instanceof Error ? error.message : "Crawl failed." }); }
    if (getBacklinkProviderPublicStatus().configured) {
      try { results.push({ source: "backlink", ok: true, ...(await syncBacklinksForSite(site)) }); }
      catch (error) { results.push({ source: "backlink", ok: false, siteId: site.id, error: error instanceof Error ? error.message : "Backlink sync failed." }); }
    }
  }
  const mappedProperties = (await listGa4Properties()).filter((property) => property.siteId && (!requested || property.siteId === requested));
  for (const property of mappedProperties) {
    try { results.push({ source: "ga4", ok: true, ...(await syncGa4Property(property)) }); }
    catch (error) { results.push({ source: "ga4", ok: false, propertyId: property.id, error: error instanceof Error ? error.message : "GA4 sync failed." }); }
  }
  const redirect = String(body.mode || "") === "changes" ? "/app/audit?refresh=completed" : "/app/automations?run=completed";
  return respond(request, body, { status: "completed", results }, redirect);
}
