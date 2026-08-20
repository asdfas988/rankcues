import { z } from "zod";
import { authorizeLinkWrite, isLinkAccessFailure, linkApiError, respondLink } from "@/lib/link-api";
import { setLinkCampaignStatus } from "@/lib/link-campaigns";
import { enforceActionLimit } from "@/lib/rate-limit";
import { readRequestData } from "@/lib/request-data";

export const runtime = "nodejs";

const statusSchema = z.object({
  status: z.enum(["active", "paused", "completed"]),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ campaignId: string }> },
) {
  const access = await authorizeLinkWrite(request);
  if (isLinkAccessFailure(access)) return access;
  const body = await readRequestData(request);
  const limited = await enforceActionLimit({
    workspaceId: access.workspaceId,
    action: "link_campaign_status",
    limit: 30,
    windowSeconds: 3600,
  });
  if (limited) return limited;

  try {
    const { campaignId } = await context.params;
    const { status } = statusSchema.parse(body);
    const campaign = await setLinkCampaignStatus({
      workspaceId: access.workspaceId,
      actorEmail: access.email,
      campaignId,
      status,
    });
    if (!campaign) {
      return respondLink(
        request,
        body,
        { status: "not_found", message: "Link campaign not found." },
        "/app/link-campaigns",
        { status: 404, headers: { "Cache-Control": "no-store" } },
      );
    }
    return respondLink(
      request,
      body,
      { status: "updated", campaign },
      `/app/link-campaigns?campaign=${encodeURIComponent(campaignId)}`,
    );
  } catch (error) {
    return linkApiError(error, { request, body, fallbackPath: "/app/link-campaigns" });
  }
}
