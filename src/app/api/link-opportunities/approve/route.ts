import { z } from "zod";
import { authorizeLinkWrite, isLinkAccessFailure, linkApiError, readLinkRequestData, respondLink } from "@/lib/link-api";
import { approveLinkOpportunityBatch } from "@/lib/link-campaigns";
import { getLinkCampaignPublicStatus } from "@/lib/link-campaigns";
import { enforceActionLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

function opportunityIds(value: unknown) {
  if (Array.isArray(value)) return value;
  return typeof value === "string" ? value.split(/[\s,;]+/) : [];
}

const approveSchema = z.object({
  opportunityId: z.string().trim().min(1).max(200).optional(),
  opportunityIds: z.preprocess(opportunityIds, z.array(z.string().trim().min(1).max(200))).default([]),
}).transform((value, context) => {
  const ids = [...new Set([...(value.opportunityId ? [value.opportunityId] : []), ...value.opportunityIds])];
  if (!ids.length) {
    context.addIssue({ code: "custom", path: ["opportunityIds"], message: "Select at least one opportunity." });
    return z.NEVER;
  }
  const maximum = getLinkCampaignPublicStatus().maximumBatchSize;
  if (ids.length > maximum) {
    context.addIssue({ code: "too_big", origin: "array", maximum, inclusive: true, path: ["opportunityIds"], message: `Approve no more than ${maximum} opportunities at once.` });
    return z.NEVER;
  }
  return ids;
});

export async function POST(request: Request) {
  const access = await authorizeLinkWrite(request);
  if (isLinkAccessFailure(access)) return access;
  const body = await readLinkRequestData(request, ["opportunityIds"]);
  const limited = await enforceActionLimit({
    workspaceId: access.workspaceId,
    action: "link_opportunity_approval",
    limit: 60,
    windowSeconds: 3600,
  });
  if (limited) return limited;

  try {
    const ids = approveSchema.parse(body);
    const results = await approveLinkOpportunityBatch({
      workspaceId: access.workspaceId,
      actorEmail: access.email,
      opportunityIds: ids,
    });
    const approved = results.filter((result) => result.ok).length;
    return respondLink(request, body, {
      status: approved === results.length ? "approved" : approved ? "partially_approved" : "not_approved",
      approved,
      failed: results.length - approved,
      results,
    }, "/app/link-campaigns");
  } catch (error) {
    return linkApiError(error, { request, body, fallbackPath: "/app/link-campaigns" });
  }
}
