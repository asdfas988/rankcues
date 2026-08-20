import { z } from "zod";
import { authorizeLinkWrite, isLinkAccessFailure, linkApiError, respondLink, runBacklinkGapDiscovery } from "@/lib/link-api";
import { discoverLostLinkOpportunities, importLinkOpportunities } from "@/lib/link-campaigns";
import { parseOpportunityImport } from "@/lib/link-campaign-model";
import { enforceActionLimit } from "@/lib/rate-limit";
import { readRequestData } from "@/lib/request-data";

export const runtime = "nodejs";
export const maxDuration = 120;

function splitList(value: unknown) {
  if (Array.isArray(value)) return value;
  return typeof value === "string" ? value.split(/[\s,;]+/) : [];
}

const competitorSchema = z.string().trim().min(3).max(253).transform((value, context) => {
  let hostname = value.toLowerCase().replace(/^\*\./, "");
  try {
    hostname = new URL(value.includes("://") ? value : `https://${value}`).hostname.toLowerCase();
  } catch {
    context.addIssue({ code: "custom", message: "Use a valid public competitor domain." });
    return z.NEVER;
  }
  if (!hostname.includes(".") || hostname === "localhost") {
    context.addIssue({ code: "custom", message: "Use a valid public competitor domain." });
    return z.NEVER;
  }
  return hostname.replace(/^www\./, "");
});

const discoverySchema = z.object({
  mode: z.enum(["manual_import", "lost_link", "dataforseo_gap"]),
  rows: z.string().max(500_000).optional(),
  competitors: z.preprocess(splitList, z.array(competitorSchema).max(10)).default([]),
  limit: z.coerce.number().int().min(1).max(300).default(100),
}).superRefine((value, context) => {
  if (value.mode === "manual_import" && !value.rows?.trim()) {
    context.addIssue({ code: "custom", path: ["rows"], message: "Paste at least one opportunity URL." });
  }
  if (value.mode === "dataforseo_gap" && value.competitors.length === 0) {
    context.addIssue({ code: "custom", path: ["competitors"], message: "Add at least one competitor domain." });
  }
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
    action: "link_opportunity_discovery",
    limit: 8,
    windowSeconds: 3600,
  });
  if (limited) return limited;

  try {
    const { campaignId } = await context.params;
    const input = discoverySchema.parse(body);
    let result: unknown;
    let importErrors: Array<{ line: number; message: string }> = [];

    if (input.mode === "manual_import") {
      const parsed = parseOpportunityImport(input.rows, input.limit);
      if (!parsed.accepted.length) {
        throw new Error(parsed.errors[0]?.message || "No valid public HTTPS opportunity URLs were provided.");
      }
      importErrors = parsed.errors;
      result = await importLinkOpportunities({
        workspaceId: access.workspaceId,
        actorEmail: access.email,
        campaignId,
        rows: parsed.accepted,
      });
    } else if (input.mode === "lost_link") {
      result = await discoverLostLinkOpportunities({
        workspaceId: access.workspaceId,
        actorEmail: access.email,
        campaignId,
      });
    } else {
      result = await runBacklinkGapDiscovery({
        workspaceId: access.workspaceId,
        actorEmail: access.email,
        campaignId,
        competitorDomains: [...new Set(input.competitors)],
        limit: input.limit,
      });
    }

    return respondLink(
      request,
      body,
      { status: "discovered", mode: input.mode, result, importErrors },
      `/app/link-campaigns?campaign=${encodeURIComponent(campaignId)}`,
    );
  } catch (error) {
    return linkApiError(error, { request, body, fallbackPath: "/app/link-campaigns" });
  }
}
