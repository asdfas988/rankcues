import { getActiveSites, getPersistencePublicStatus, verifyDueTasks } from "@/lib/data-store";
import { syncActiveGscSites } from "@/lib/gsc-sync";
import { crawlVerifiedSite } from "@/lib/page-crawler";
import { syncMappedGa4Properties } from "@/lib/google-analytics";
import { getBacklinkProviderPublicStatus, syncBacklinksForSite } from "@/lib/backlink-provider";

export const runtime = "nodejs";
export const maxDuration = 300;

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  return Boolean(secret && request.headers.get("authorization") === `Bearer ${secret}`);
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) return new Response("Unauthorized", { status: 401 });
  const persistence = getPersistencePublicStatus();
  if (!persistence.ready) {
    return Response.json({ status: "configuration_required", persistence }, { status: 503 });
  }

  const limit = Number(process.env.CRON_SITE_LIMIT || 10);
  const gsc = await syncActiveGscSites(limit);
  const ga4 = await syncMappedGa4Properties();
  const crawls: Array<Record<string, unknown>> = [];
  const backlinks: Array<Record<string, unknown>> = [];
  const sites = await getActiveSites(limit);
  if (process.env.CRAWL_ON_DAILY_SYNC !== "false") {
    for (const site of sites) {
      try {
        crawls.push({
          ok: true,
          ...(await crawlVerifiedSite(site, {
            maxPages: site.crawlPageLimit || Number(process.env.CRAWL_MAX_PAGES || 20),
          })),
        });
      } catch (error) {
        crawls.push({
          ok: false,
          siteId: site.id,
          siteUrl: site.siteUrl,
          error: error instanceof Error ? error.message : "Unknown crawl error.",
        });
      }
    }
  }

  if (getBacklinkProviderPublicStatus().configured) {
    for (const site of sites) {
      try { backlinks.push({ ok: true, ...(await syncBacklinksForSite(site)) }); }
      catch (error) { backlinks.push({ ok: false, siteId: site.id, siteUrl: site.siteUrl, error: error instanceof Error ? error.message : "Unknown backlink error." }); }
    }
  }

  const taskVerifications = await verifyDueTasks();
  return Response.json({ status: "completed", gsc, ga4, crawls, backlinks, taskVerifications, backlinkProvider: getBacklinkProviderPublicStatus() });
}
