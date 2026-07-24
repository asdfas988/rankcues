import { authorizeApiRequest, isAuthFailure } from "@/lib/auth-session";
import { createGitHubInstallState, getGitHubAppPublicStatus } from "@/lib/github-app";

export async function GET(request: Request) {
  const access = await authorizeApiRequest(request);
  if (isAuthFailure(access)) return access;
  const status = getGitHubAppPublicStatus();
  if (!status.configured || !status.installUrl) {
    return Response.redirect(new URL("/app/settings?github=unavailable", request.url), 303);
  }
  const state = createGitHubInstallState({
    workspaceId: access.workspaceId,
    email: access.email,
    returnTo: "/app/settings",
  });
  const destination = new URL(status.installUrl);
  destination.searchParams.set("state", state);
  return Response.redirect(destination, 303);
}
