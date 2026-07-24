import { authorizeApiRequest, isAuthFailure } from "@/lib/auth-session";
import {
  listGitHubInstallations,
  syncGitHubRepositories,
  upsertGitHubInstallation,
} from "@/lib/data-store";
import { getGitHubInstallation, listGitHubInstallationRepositories } from "@/lib/github-app";
import { readRequestData, respond } from "@/lib/request-data";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const access = await authorizeApiRequest(request);
  if (isAuthFailure(access)) return access;
  const body = await readRequestData(request);
  const localId = String(body.installationId || "");
  const installation = (await listGitHubInstallations()).find((item) => item.id === localId);
  if (!installation) {
    return respond(request, body, { status: "not_found" }, "/app/settings?github=invalid", { status: 404 });
  }
  try {
    const remote = await getGitHubInstallation(installation.installationId);
    const repositories = await listGitHubInstallationRepositories(installation.installationId);
    const refreshed = await upsertGitHubInstallation({
      installationId: installation.installationId,
      accountLogin: remote.account?.login || installation.accountLogin,
      accountType: remote.account?.type || installation.accountType,
      accountAvatarUrl: remote.account?.avatar_url || installation.accountAvatarUrl,
      repositorySelection: remote.repository_selection || installation.repositorySelection,
      permissions: remote.permissions || installation.permissions,
    });
    await syncGitHubRepositories(refreshed, repositories);
    return respond(request, body, { status: "synced", repositories: repositories.length }, "/app/settings?github=synced");
  } catch (error) {
    return respond(request, body, {
      status: "sync_failed",
      message: error instanceof Error ? error.message : "GitHub sync failed.",
    }, "/app/settings?github=error", { status: 502 });
  }
}
