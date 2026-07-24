import { listWorkspaces } from "@/lib/data-store";
import { readRequestData, respond } from "@/lib/request-data";
import { authorizeApiRequest, isAuthFailure } from "@/lib/auth-session";

export async function GET(request: Request) {
  const access = await authorizeApiRequest(request);
  if (isAuthFailure(access)) return access;
  return Response.json({ status: "ready", organizations: await listWorkspaces() });
}

export async function POST(request: Request) {
  const access = await authorizeApiRequest(request);
  if (isAuthFailure(access)) return access;
  const body = await readRequestData(request);
  return respond(request, body, {
    status: "private_beta_restricted",
    message: "Additional organizations and invitations are disabled until tenant isolation is complete.",
  }, "/app/settings?organization=restricted", { status: 501 });
}
