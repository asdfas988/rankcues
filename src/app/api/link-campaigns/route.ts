import { z } from "zod";
import { authorizeLinkRead, authorizeLinkWrite, isLinkAccessFailure, linkApiError, respondLink } from "@/lib/link-api";
import { createLinkCampaign, getLinkCampaignPageData } from "@/lib/link-campaigns";
import { linkOpportunityStatuses } from "@/lib/link-campaign-model";
import { enforceActionLimit } from "@/lib/rate-limit";
import { readRequestData } from "@/lib/request-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const querySchema = z.object({
  siteId: z.string().trim().min(1).max(200).optional(),
  campaignId: z.string().trim().min(1).max(200).optional(),
  opportunityId: z.string().trim().min(1).max(200).optional(),
  status: z.enum([...linkOpportunityStatuses, "all"]).optional(),
});

const profileSchema = z.preprocess((value) => {
  if (typeof value !== "string") return value ?? {};
  if (!value.trim()) return {};
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}, z.record(z.string(), z.unknown()));

const createSchema = z.object({
  siteId: z.string().trim().min(1).max(200),
  name: z.string().trim().min(1).max(160),
  targetUrl: z.string().trim().max(2048),
  discoveryLimit: z.coerce.number().int().min(30).max(300).default(100),
  profile: profileSchema.default({}),
  brandName: z.string().trim().max(160).optional(),
  description: z.string().trim().max(5000).optional(),
  category: z.string().trim().max(160).optional(),
  contactEmail: z.union([z.string().trim().email().max(320), z.literal("")]).optional(),
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
    return Response.json(
      { status: "ok", ...data },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return linkApiError(error);
  }
}

export async function POST(request: Request) {
  const access = await authorizeLinkWrite(request);
  if (isLinkAccessFailure(access)) return access;
  const body = await readRequestData(request);
  const limited = await enforceActionLimit({
    workspaceId: access.workspaceId,
    action: "link_campaign_create",
    limit: 10,
    windowSeconds: 3600,
  });
  if (limited) return limited;

  try {
    const input = createSchema.parse(body);
    const profile = {
      ...input.profile,
      ...(input.brandName ? { brandName: input.brandName } : {}),
      ...(input.description ? { description: input.description } : {}),
      ...(input.category ? { category: input.category } : {}),
      ...(input.contactEmail ? { contactEmail: input.contactEmail } : {}),
    };
    const campaign = await createLinkCampaign({
      workspaceId: access.workspaceId,
      actorEmail: access.email,
      siteId: input.siteId,
      name: input.name,
      targetUrl: input.targetUrl,
      discoveryLimit: input.discoveryLimit,
      profile,
    });
    return respondLink(
      request,
      body,
      { status: "created", campaign },
      `/app/link-campaigns?campaign=${encodeURIComponent(String(campaign.id))}`,
      { status: 201 },
    );
  } catch (error) {
    return linkApiError(error, { request, body, fallbackPath: "/app/link-campaigns" });
  }
}
