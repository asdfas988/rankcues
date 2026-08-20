import { isIP } from "node:net";

export const linkOpportunityStatuses = [
  "discovered",
  "approved",
  "submitted",
  "pending_review",
  "published",
  "verified",
  "needs_action",
  "rejected",
  "removed",
] as const;

export type LinkOpportunityStatus = typeof linkOpportunityStatuses[number];
export type LinkSubmissionMode = "manual" | "official_api";
export type LinkPermissionState = "unknown" | "verified" | "denied";
export type LinkRisk = "low" | "medium" | "high" | "blocked";

const allowedTransitions: Record<LinkOpportunityStatus, ReadonlySet<LinkOpportunityStatus>> = {
  discovered: new Set(["approved", "rejected"]),
  approved: new Set(["submitted", "needs_action", "rejected"]),
  submitted: new Set(["pending_review", "published", "needs_action", "rejected"]),
  pending_review: new Set(["published", "verified", "needs_action", "rejected"]),
  published: new Set(["verified", "needs_action", "removed"]),
  verified: new Set(["removed"]),
  needs_action: new Set(["approved", "submitted", "pending_review", "published", "rejected"]),
  rejected: new Set(["discovered"]),
  removed: new Set(["approved", "published", "verified"]),
};

export function canTransitionLinkStatus(from: LinkOpportunityStatus, to: LinkOpportunityStatus) {
  return from === to || allowedTransitions[from].has(to);
}

function isPrivateIpv4(host: string) {
  const parts = host.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return true;
  const [a, b] = parts;
  return a === 0
    || a === 10
    || a === 127
    || (a === 169 && b === 254)
    || (a === 172 && b >= 16 && b <= 31)
    || (a === 192 && b === 168)
    || a >= 224;
}

function isPrivateIpv6(host: string) {
  const normalized = host.toLowerCase().replace(/^\[|\]$/g, "");
  if (normalized === "::" || normalized === "::1") return true;
  if (normalized.startsWith("fc") || normalized.startsWith("fd") || normalized.startsWith("fe8") || normalized.startsWith("fe9") || normalized.startsWith("fea") || normalized.startsWith("feb")) return true;
  const mapped = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)?.[1];
  return mapped ? isPrivateIpv4(mapped) : false;
}

export function isPublicHostname(hostname: string) {
  const host = hostname.trim().toLowerCase().replace(/\.$/, "");
  if (!host || host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal") || host.endsWith(".lan") || host.endsWith(".home")) return false;
  const ipVersion = isIP(host);
  if (ipVersion === 4) return !isPrivateIpv4(host);
  if (ipVersion === 6) return !isPrivateIpv6(host);
  return host.includes(".");
}

export function normalizePublicHttpsUrl(value: unknown) {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text || text.length > 2048) return null;
  try {
    const url = new URL(text);
    if (url.protocol !== "https:" || url.username || url.password || (url.port && url.port !== "443") || !isPublicHostname(url.hostname)) return null;
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

function comparableHostname(value: string) {
  return value.toLowerCase().replace(/^www\./, "").replace(/\.$/, "");
}

function comparablePath(value: string) {
  return value.replace(/\/+$/, "") || "/";
}

export function linkMatchesTarget(candidate: string, target: string) {
  const candidateUrl = normalizePublicHttpsUrl(candidate);
  const targetUrl = normalizePublicHttpsUrl(target);
  if (!candidateUrl || !targetUrl) return false;
  const candidateParsed = new URL(candidateUrl);
  const targetParsed = new URL(targetUrl);
  if (comparableHostname(candidateParsed.hostname) !== comparableHostname(targetParsed.hostname)
    || comparablePath(candidateParsed.pathname) !== comparablePath(targetParsed.pathname)) return false;
  for (const [key, value] of targetParsed.searchParams) {
    if (!candidateParsed.searchParams.getAll(key).includes(value)) return false;
  }
  return true;
}

export type ImportedLinkOpportunity = {
  sourceUrl: string;
  submissionUrl: string;
  destinationName: string;
  policyEvidenceUrl: string | null;
};

export function parseOpportunityImport(value: unknown, maximum = 300) {
  const lines = typeof value === "string" ? value.split(/\r?\n/) : [];
  const accepted: ImportedLinkOpportunity[] = [];
  const errors: Array<{ line: number; message: string }> = [];
  const seen = new Set<string>();

  for (let index = 0; index < lines.length && accepted.length < maximum; index += 1) {
    const line = lines[index].trim();
    if (!line || line.startsWith("#")) continue;
    const fields = line.includes("\t") ? line.split("\t") : line.split(/\s*\|\s*/);
    const sourceUrl = normalizePublicHttpsUrl(fields[0]);
    const submissionUrl = normalizePublicHttpsUrl(fields[1] || fields[0]);
    const policyEvidenceUrl = fields[3] ? normalizePublicHttpsUrl(fields[3]) : null;
    if (!sourceUrl || !submissionUrl) {
      errors.push({ line: index + 1, message: "Use public HTTPS URLs for the source and submission page." });
      continue;
    }
    const identity = `${sourceUrl}\u001f${submissionUrl}`;
    if (seen.has(identity)) continue;
    seen.add(identity);
    accepted.push({
      sourceUrl,
      submissionUrl,
      destinationName: fields[2]?.trim().slice(0, 160) || new URL(sourceUrl).hostname.replace(/^www\./, ""),
      policyEvidenceUrl,
    });
  }

  return { accepted, errors, truncated: accepted.length >= maximum && lines.length > maximum };
}

export function classifyLinkOpportunity(input: { url: string; title?: string; spamScore?: number | null }) {
  const text = `${input.url} ${input.title || ""}`.toLowerCase();
  const category = /director|catalog|marketplace|software|tools|alternatives|apps/.test(text)
    ? "directory"
    : /resource|links|useful|recommended/.test(text)
      ? "resource_page"
      : "editorial";
  const spamScore = Number(input.spamScore || 0);
  const risk: LinkRisk = spamScore >= 70 ? "blocked" : spamScore >= 45 ? "high" : spamScore >= 25 ? "medium" : "low";
  return { category, risk } as const;
}
