import { authorizeLinkWrite, isLinkAccessFailure, linkApiError, respondLink } from "@/lib/link-api";
import { requestLinkVerification } from "@/lib/link-campaigns";
import { enforceActionLimit } from "@/lib/rate-limit";
import { readRequestData } from "@/lib/request-data";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ opportunityId: string }> },
) {
  const access = await authorizeLinkWrite(request);
  if (isLinkAccessFailure(access)) return access;
  const body = await readRequestData(request);
  const limited = await enforceActionLimit({
    workspaceId: access.workspaceId,
    action: "link_verification_request",
    limit: 30,
    windowSeconds: 3600,
  });
  if (limited) return limited;

  try {
    const { opportunityId } = await context.params;
    const job = await requestLinkVerification({
      workspaceId: access.workspaceId,
      actorEmail: access.email,
      opportunityId,
    });
    return respondLink(
      request,
      body,
      { status: "queued", opportunityId, job },
      `/app/link-campaigns?opportunity=${encodeURIComponent(opportunityId)}`,
      { status: 202 },
    );
  } catch (error) {
    return linkApiError(error, { request, body, fallbackPath: "/app/link-campaigns" });
  }
}
