import { getBacklinkProviderPublicStatus } from "@/lib/backlink-provider";
import { authorizeApiRequest, isAuthFailure } from "@/lib/auth-session";

export async function GET(request: Request) {
  const access = await authorizeApiRequest(request);
  if (isAuthFailure(access)) return access;
  return Response.json(getBacklinkProviderPublicStatus());
}
