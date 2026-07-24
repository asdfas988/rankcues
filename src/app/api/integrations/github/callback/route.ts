import { authorizeApiRequest, isAuthFailure } from "@/lib/auth-session";
import { syncGitHubRepositories, upsertGitHubInstallation } from "@/lib/data-store";
import {
  getGitHubInstallation,
  listGitHubInstallationRepositories,
  verifyGitHubInstallState,
} from "@/lib/github-app";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  const access = await authorizeApiRequest(request);
  if (isAuthFailure(access)) return access;
  const url = new URL(request.url);
  const installationId = Number(url.searchParams.get("installation_id"));
  const state = verifyGitHubInstallState(url.searchParams.get("state") || "");
  if (
    !Number.isSafeInteger(installationId)
    || installationId <= 0
    || !state
    || state.workspaceId !== access.workspaceId
    || state.email !== access.email.toLowerCase()
  ) {
    return Response.redirect(new URL("/app/settings?github=invalid", request.url), 303);
  }
  try {
    const remote = await getGitHubInstallation(installationId);
    const repositories = await listGitHubInstallationRepositories(installationId);
    const installation = await upsertGitHubInstallation({
      installationId,
      accountLogin: remote.account?.login || `installation-${installationId}`,
      accountType: remote.account?.type || "Account",
      accountAvatarUrl: remote.account?.avatar_url || null,
      repositorySelection: remote.repository_selection || "selected",
      permissions: remote.permissions || {},
    });
    await syncGitHubRepositories(installation, repositories);
    return Response.redirect(new URL("/app/settings?github=connected", request.url), 303);
  } catch {
    return Response.redirect(new URL("/app/settings?github=error", request.url), 303);
  }
}
