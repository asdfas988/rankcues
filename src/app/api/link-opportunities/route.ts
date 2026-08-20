import { z } from "zod";
import { authorizeLinkRead, isLinkAccessFailure, linkApiError } from "@/lib/link-api";
import { getLinkCampaignPageData } from "@/lib/link-campaigns";
import { linkOpportunityStatuses } from "@/lib/link-campaign-model";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const querySchema = z.object({
  campaignId: z.string().trim().min(1).max(200),
  opportunityId: z.string().trim().min(1).max(200).optional(),
  status: z.enum([...linkOpportunityStatuses, "all"]).optional(),
});

export async function GET(request: Request) {
  const access = await authorizeLinkRead(request);
  if (isLinkAccessFailure(access)) return access;
  try {
    const query = querySchema.parse(Object.fromEntries(new URL(request.url).searchParams));
    const data = await getLinkCampaignPageData({
      workspaceId: access.workspaceId,
      email: access.email,
      ...query,
    });
    if (!data.selectedCampaign || data.selectedCampaign.id !== query.campaignId) {
      return Response.json(
        { status: "not_found", message: "Link campaign not found." },
        { status: 404, headers: { "Cache-Control": "no-store" } },
      );
    }
    return Response.json({
      status: "ok",
      campaign: data.selectedCampaign,
      opportunities: data.opportunities,
      selectedOpportunity: data.selectedOpportunity,
      counts: data.counts,
      events: data.events,
      workspaceEnabled: data.workspaceEnabled,
      canManage: data.canManage,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return linkApiError(error);
  }
}
