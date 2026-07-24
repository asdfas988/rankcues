import { authorizeApiRequest, isAuthFailure } from "@/lib/auth-session";
import { disconnectGitHubInstallation } from "@/lib/data-store";
import { readRequestData, respond } from "@/lib/request-data";

export async function POST(request: Request) {
  const access = await authorizeApiRequest(request);
  if (isAuthFailure(access)) return access;
  const body = await readRequestData(request);
  const installationId = String(body.installationId || "");
  if (!installationId) {
    return respond(request, body, { status: "invalid_request" }, "/app/settings?github=invalid", { status: 400 });
  }
  const removed = await disconnectGitHubInstallation(installationId);
  return respond(request, body, { status: removed ? "disconnected" : "not_found" }, "/app/settings?github=disconnected");
}
