import { z } from "zod";
import { authorizeLinkWrite, isLinkAccessFailure, linkApiError, respondLink } from "@/lib/link-api";
import { rejectLinkOpportunity, updateManualLinkSubmission } from "@/lib/link-campaigns";
import { enforceActionLimit } from "@/lib/rate-limit";
import { readRequestData } from "@/lib/request-data";

export const runtime = "nodejs";

const actionSchema = z.object({
  action: z.enum(["reject", "submitted", "pending_review", "published"]),
  publicUrl: z.string().trim().max(2048).optional(),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ opportunityId: string }> },
) {
  const access = await authorizeLinkWrite(request);
  if (isLinkAccessFailure(access)) return access;
  const body = await readRequestData(request);
  const limited = await enforceActionLimit({
    workspaceId: access.workspaceId,
    action: "link_opportunity_update",
    limit: 60,
    windowSeconds: 3600,
  });
  if (limited) return limited;

  try {
    const { opportunityId } = await context.params;
    const input = actionSchema.parse(body);
    const result = input.action === "reject"
      ? await rejectLinkOpportunity({ workspaceId: access.workspaceId, actorEmail: access.email, opportunityId })
      : await updateManualLinkSubmission({
          workspaceId: access.workspaceId,
          actorEmail: access.email,
          opportunityId,
          action: input.action,
          publicUrl: input.publicUrl,
        });
    if (!result) {
      return respondLink(
        request,
        body,
        { status: "not_found", message: "Link opportunity not found." },
        "/app/link-campaigns",
        { status: 404, headers: { "Cache-Control": "no-store" } },
      );
    }
    return respondLink(
      request,
      body,
      { status: "updated", opportunityId, result },
      `/app/link-campaigns?opportunity=${encodeURIComponent(opportunityId)}`,
    );
  } catch (error) {
    return linkApiError(error, { request, body, fallbackPath: "/app/link-campaigns" });
  }
}
