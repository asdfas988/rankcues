import { authorizeApiRequest, isAuthFailure } from "@/lib/auth-session";
import { getSiteByIdOrUrl, mapGitHubRepositoryToSite } from "@/lib/data-store";
import { readRequestData, respond } from "@/lib/request-data";

export async function POST(request: Request) {
  const access = await authorizeApiRequest(request);
  if (isAuthFailure(access)) return access;
  const body = await readRequestData(request);
  const repositoryId = String(body.repositoryId || "");
  const siteId = String(body.siteId || "");
  const site = siteId ? await getSiteByIdOrUrl(siteId) : null;
  if (!repositoryId || !site) {
    return respond(request, body, { status: "invalid_request" }, "/app/settings?github=invalid", { status: 400 });
  }
  const repository = await mapGitHubRepositoryToSite(repositoryId, site.id);
  return respond(request, body, {
    status: repository ? "mapped" : "not_found",
    repository,
  }, "/app/settings?github=mapped", repository ? undefined : { status: 404 });
}
