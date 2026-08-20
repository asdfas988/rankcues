import { z } from "zod";
import { authorizeApiRequest, isAuthFailure, type RankCuesSession } from "@/lib/auth-session";
import * as backlinkProvider from "@/lib/backlink-provider";
import * as linkCampaigns from "@/lib/link-campaigns";
import { ensureLinkCampaignSchema } from "@/lib/link-schema";
import { getDatabase } from "@/lib/database";
import { readRequestData, respond } from "@/lib/request-data";

export type LinkManagerAccess = RankCuesSession & { role: "owner" | "admin" };

function noStoreJson(payload: unknown, status: number) {
  return Response.json(payload, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function workspaceDefaultsToEnabled() {
  return process.env.LINK_CAMPAIGNS_DEFAULT_ENABLED === "true";
}

async function isWorkspaceLinkFeatureEnabled(workspaceId: string) {
  await ensureLinkCampaignSchema();
  const sql = getDatabase();
  const [row] = await sql`
    select enabled
    from rankcues_link_workspace_settings
    where workspace_id = ${workspaceId}
    limit 1
  `;
  return row ? Boolean(row.enabled) : workspaceDefaultsToEnabled();
}

export async function authorizeLinkRead(request: Request) {
  const access = await authorizeApiRequest(request);
  if (isAuthFailure(access)) return access;
  if (!linkCampaigns.getLinkCampaignPublicStatus().enabled) {
    return noStoreJson({
      status: "feature_disabled",
      message: "The controlled link campaign experiment is not enabled.",
    }, 503);
  }
  try {
    const role = await linkCampaigns.getLinkWorkspaceRole(access.workspaceId, access.email);
    if (!role) {
      return noStoreJson({
        status: "forbidden",
        message: "Your workspace membership is no longer active.",
      }, 403);
    }
  } catch (error) {
    return linkApiError(error);
  }
  return access;
}

export async function authorizeLinkWrite(request: Request): Promise<LinkManagerAccess | Response> {
  const access = await authorizeLinkRead(request);
  if (access instanceof Response) return access;
  try {
    const role = await linkCampaigns.requireLinkManager(access.workspaceId, access.email);
    if (!role) {
      return noStoreJson({
        status: "forbidden",
        message: "Only workspace owners and admins can change link campaigns.",
      }, 403);
    }
    if (!(await isWorkspaceLinkFeatureEnabled(access.workspaceId))) {
      return noStoreJson({
        status: "workspace_disabled",
        message: "The controlled link campaign experiment is disabled for this workspace.",
      }, 403);
    }
    return { ...access, role };
  } catch (error) {
    return linkApiError(error);
  }
}

export function isLinkAccessFailure(value: RankCuesSession | LinkManagerAccess | Response): value is Response {
  return value instanceof Response;
}

function safeLinkRedirect(value: unknown, fallbackPath: string) {
  const candidate = typeof value === "string" ? value.trim() : "";
  if (!candidate.startsWith("/app/link-campaigns") || candidate.startsWith("//")) return fallbackPath;
  try {
    const parsed = new URL(candidate, "https://rankcues.invalid");
    const allowedPath = parsed.pathname === "/app/link-campaigns" || parsed.pathname.startsWith("/app/link-campaigns/");
    if (parsed.origin !== "https://rankcues.invalid" || !allowedPath) return fallbackPath;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallbackPath;
  }
}

function safeResponseBody(body: Record<string, unknown>, fallbackPath: string) {
  return { ...body, redirectTo: safeLinkRedirect(body.redirectTo, fallbackPath) };
}

export function respondLink(
  request: Request,
  body: Record<string, unknown>,
  payload: unknown,
  fallbackPath: string,
  init?: ResponseInit,
) {
  return respond(request, safeResponseBody(body, fallbackPath), payload, fallbackPath, init);
}

export async function readLinkRequestData(request: Request, multiFields: string[] = []) {
  const contentType = request.headers.get("content-type") || "";
  if (contentType.includes("application/json") || multiFields.length === 0) {
    return readRequestData(request);
  }
  const formData = await request.formData().catch(() => new FormData());
  const body: Record<string, unknown> = Object.fromEntries(formData.entries());
  for (const field of multiFields) {
    const values = formData.getAll(field).filter((value): value is string => typeof value === "string");
    if (values.length) body[field] = values;
  }
  return body;
}

type LinkErrorOptions = {
  request: Request;
  body: Record<string, unknown>;
  fallbackPath: string;
};

export function linkApiError(error: unknown, options?: LinkErrorOptions) {
  let payload: Record<string, unknown>;
  let status: number;
  if (error instanceof z.ZodError) {
    payload = {
      status: "invalid_request",
      message: "Check the submitted link campaign fields.",
      issues: error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })),
    };
    status = 400;
  } else {
    const message = error instanceof Error ? error.message : "The link campaign operation failed.";
    const normalized = message.toLowerCase();
    if (normalized.includes("not found")) {
      payload = { status: "not_found", message };
      status = 404;
    } else if (
      normalized.includes("current state")
      || normalized.includes("changed")
      || normalized.includes("activate the campaign")
      || normalized.includes("only newly")
      || normalized.includes("no longer")
    ) {
      payload = { status: "conflict", message };
      status = 409;
    } else if (
      normalized.includes("must belong")
      || normalized.includes("required")
      || normalized.includes("blocked")
      || normalized.includes("public https")
      || normalized.includes("at least one valid competitor")
      || normalized.includes("profile is too large")
      || normalized.includes("invalid public url")
    ) {
      payload = { status: "invalid_request", message };
      status = 400;
    } else if (
      normalized.includes("schema is not installed")
      || normalized.includes("database_url")
      || normalized.includes("dataforseo_login")
    ) {
      payload = { status: "configuration_required", message };
      status = 503;
    } else {
      console.error("Link campaign API operation failed", error);
      payload = { status: "operation_failed", message: "The link campaign operation could not be completed." };
      status = 502;
    }
  }

  if (!options) return noStoreJson(payload, status);
  const safeBody = safeResponseBody(options.body, options.fallbackPath);
  const redirect = new URL(String(safeBody.redirectTo), "https://rankcues.invalid");
  redirect.searchParams.set("linkStatus", String(payload.status));
  redirect.searchParams.set("linkMessage", String(payload.message || "Request failed.").slice(0, 240));
  safeBody.redirectTo = `${redirect.pathname}${redirect.search}${redirect.hash}`;
  return respond(options.request, safeBody, payload, options.fallbackPath, { status });
}

export type BacklinkGapDiscoveryInput = {
  workspaceId: string;
  actorEmail: string;
  campaignId: string;
  competitorDomains: string[];
  limit: number;
};

export async function runBacklinkGapDiscovery(input: BacklinkGapDiscoveryInput) {
  await ensureLinkCampaignSchema();
  const sql = getDatabase();
  const [campaign] = await sql`
    select target_url, discovery_limit
    from rankcues_link_campaigns
    where id = ${input.campaignId}
      and workspace_id = ${input.workspaceId}
      and status <> 'completed'
    limit 1
  `;
  if (!campaign) throw new Error("Link campaign not found.");
  const limit = Math.max(1, Math.min(input.limit, Number(campaign.discovery_limit || 100), 300));
  const opportunities = await backlinkProvider.discoverBacklinkGap({
    target: String(campaign.target_url),
    competitors: input.competitorDomains,
    limit,
  });
  return linkCampaigns.saveLinkOpportunities({
    workspaceId: input.workspaceId,
    actorEmail: input.actorEmail,
    campaignId: input.campaignId,
    opportunities,
  });
}

export type ProcessLinkJobsInput = { limit: number };

export async function runLinkJobs(input: ProcessLinkJobsInput) {
  return linkCampaigns.processLinkJobs({ limit: input.limit });
}
