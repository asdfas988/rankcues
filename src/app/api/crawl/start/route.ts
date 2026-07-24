import { getPersistencePublicStatus, getSiteByIdOrUrl } from "@/lib/data-store";
import { crawlVerifiedSite } from "@/lib/page-crawler";
import { readRequestData, respond } from "@/lib/request-data";
import { authorizeApiRequest, isAuthFailure } from "@/lib/auth-session";
import { enforceActionLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: Request) {
  const access = await authorizeApiRequest(request);
  if (isAuthFailure(access)) return access;
  const limited = await enforceActionLimit({ workspaceId: access.workspaceId, action: "crawl", limit: 4, windowSeconds: 3600 });
  if (limited) return limited;
  const body = await readRequestData(request);
  const persistence = getPersistencePublicStatus();
  if (!persistence.ready) {
    return respond(
      request,
      body,
      {
        status: "configuration_required",
        message: "Configure persistent storage before running external crawls.",
        persistence,
      },
      "/app/connect?crawl=storage-required",
      { status: 503 },
    );
  }

  const siteValue = body.siteId?.toString() || body.site?.toString();
  const site = siteValue ? await getSiteByIdOrUrl(siteValue) : null;
  if (!site) {
    return respond(
      request,
      body,
      {
        status: "not_found",
        message: "Only a registered Search Console property can be crawled.",
      },
      "/app/connect?crawl=not-found",
      { status: 404 },
    );
  }

  try {
    const result = await crawlVerifiedSite(site, {
      maxPages: Number(body.maxPages || 20),
    });
    return respond(
      request,
      body,
      { status: "completed", result },
      "/app/connect?crawl=completed",
    );
  } catch (error) {
    return respond(
      request,
      body,
      {
        status: "failed",
        message: error instanceof Error ? error.message : "Unknown crawl error.",
      },
      "/app/connect?crawl=failed",
      { status: 502 },
    );
  }
}
