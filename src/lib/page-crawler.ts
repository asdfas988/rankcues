import { createHash } from "node:crypto";
import { resolve4, resolve6 } from "node:dns/promises";
import { isIP } from "node:net";
import * as cheerio from "cheerio";
import {
  createSyncRun,
  finishSyncRun,
  getLatestPageSnapshot,
  saveEvidenceEvent,
  savePageSnapshot,
  stableId,
  type StoredSite,
} from "@/lib/data-store";

function isPrivateIp(address: string) {
  if (address === "::1" || address === "::") return true;
  const normalized = address.toLowerCase();
  if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true;
  if (/^fe[89ab]/.test(normalized)) return true;
  if (normalized.startsWith("::ffff:")) return isPrivateIp(normalized.slice(7));

  if (isIP(address) === 4) {
    const [a, b] = address.split(".").map(Number);
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 198 && (b === 18 || b === 19)) ||
      a >= 224
    );
  }

  return false;
}

async function assertPublicUrl(value: string) {
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error("Crawler only supports HTTP and HTTPS URLs.");
  }
  if (url.username || url.password) {
    throw new Error("Crawler URLs cannot contain credentials.");
  }

  const addresses = isIP(url.hostname)
    ? [url.hostname]
    : [
        ...(await resolve4(url.hostname).catch(() => [])),
        ...(await resolve6(url.hostname).catch(() => [])),
      ];
  if (!addresses.length || addresses.some(isPrivateIp)) {
    throw new Error("Crawler target must resolve only to public IP addresses.");
  }
  return url;
}

async function safeFetch(value: string, init?: RequestInit) {
  let current = value;
  for (let redirect = 0; redirect <= 4; redirect += 1) {
    await assertPublicUrl(current);
    const response = await fetch(current, {
      ...init,
      redirect: "manual",
      signal: AbortSignal.timeout(12_000),
      headers: {
        "user-agent": "RankCuesBot/0.1 (+https://rankcues.com/bot)",
        accept: "text/html,application/xml,text/xml,text/plain;q=0.8,*/*;q=0.5",
        ...init?.headers,
      },
      cache: "no-store",
    });
    if (![301, 302, 303, 307, 308].includes(response.status)) return response;
    const location = response.headers.get("location");
    if (!location) return response;
    current = new URL(location, current).toString();
  }
  throw new Error("Crawler stopped after too many redirects.");
}

function siteBaseUrl(siteUrl: string) {
  if (siteUrl.startsWith("sc-domain:")) {
    return new URL(`https://${siteUrl.slice("sc-domain:".length)}/`);
  }
  return new URL(siteUrl);
}

function xmlLocations(xml: string) {
  return [...xml.matchAll(/<loc(?:\s[^>]*)?>([\s\S]*?)<\/loc>/gi)]
    .map((match) => match[1].replace(/&amp;/g, "&").trim())
    .filter(Boolean);
}

type RobotsRule = { allow: boolean; path: string };

function parseRobotsRules(text: string) {
  const groups: Array<{ agents: string[]; rules: RobotsRule[] }> = [];
  let group = { agents: [] as string[], rules: [] as RobotsRule[] };
  for (const sourceLine of text.split(/\r?\n/)) {
    const line = sourceLine.replace(/\s*#.*$/, "").trim();
    if (!line) continue;
    const separator = line.indexOf(":");
    if (separator === -1) continue;
    const field = line.slice(0, separator).trim().toLowerCase();
    const value = line.slice(separator + 1).trim();
    if (field === "user-agent") {
      if (group.rules.length) {
        groups.push(group);
        group = { agents: [], rules: [] };
      }
      group.agents.push(value.toLowerCase());
    } else if ((field === "allow" || field === "disallow") && group.agents.length) {
      if (value) group.rules.push({ allow: field === "allow", path: value });
    }
  }
  if (group.agents.length) groups.push(group);

  const exact = groups.filter((entry) => entry.agents.some((agent) => agent === "rankcuesbot"));
  const selected = exact.length
    ? exact
    : groups.filter((entry) => entry.agents.some((agent) => agent === "*"));
  return selected.flatMap((entry) => entry.rules);
}

function isRobotsAllowed(value: string, rules: RobotsRule[]) {
  const url = new URL(value);
  const target = `${url.pathname}${url.search}`;
  const matches = rules
    .filter((rule) => target.startsWith(rule.path))
    .sort((a, b) => b.path.length - a.path.length || Number(b.allow) - Number(a.allow));
  return matches[0]?.allow ?? true;
}

async function discoverUrls(site: StoredSite, maxPages: number) {
  const base = siteBaseUrl(site.siteUrl);
  const sitemapCandidates: string[] = [];
  let robotsRules: RobotsRule[] = [];

  try {
    const robots = await safeFetch(new URL("/robots.txt", base).toString());
    if (robots.ok) {
      const text = await robots.text();
      robotsRules = parseRobotsRules(text);
      for (const line of text.split(/\r?\n/)) {
        const match = line.match(/^sitemap:\s*(.+)$/i);
        if (match?.[1]) sitemapCandidates.push(match[1].trim());
      }
    }
  } catch {
    // Sitemap fallback below keeps crawl setup resilient.
  }

  if (!sitemapCandidates.length) {
    sitemapCandidates.push(new URL("/sitemap.xml", base).toString());
  }

  const discovered = new Set<string>();
  for (const sitemapUrl of sitemapCandidates.slice(0, 3)) {
    try {
      const response = await safeFetch(sitemapUrl);
      if (!response.ok) continue;
      const locations = xmlLocations(await response.text());
      const childSitemaps = locations.filter((url) => /\.xml(?:\?|$)/i.test(url));
      const pageUrls = locations.filter((url) => !/\.xml(?:\?|$)/i.test(url));
      for (const url of pageUrls) discovered.add(url);

      for (const child of childSitemaps.slice(0, 5)) {
        if (discovered.size >= maxPages) break;
        const childResponse = await safeFetch(child);
        if (!childResponse.ok) continue;
        for (const url of xmlLocations(await childResponse.text())) discovered.add(url);
      }
    } catch {
      // A broken sitemap should not prevent crawling the verified homepage.
    }
  }

  if (!discovered.size) discovered.add(base.toString());
  return [...discovered]
    .filter((value) => {
      try {
        return new URL(value).hostname === base.hostname && isRobotsAllowed(value, robotsRules);
      } catch {
        return false;
      }
    })
    .slice(0, maxPages);
}

function cleanText(value: string | undefined) {
  return (value || "").replace(/\s+/g, " ").trim();
}

async function capturePage(url: string, expectedHostname: string) {
  const response = await safeFetch(url);
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("text/html")) {
    throw new Error(`Skipped non-HTML response: ${contentType || "unknown"}`);
  }
  const html = await response.text();
  const $ = cheerio.load(html);
  const documentUrl = new URL(response.url || url);
  if (documentUrl.hostname !== expectedHostname) {
    throw new Error("Crawler stopped because the page redirected outside the verified property.");
  }
  const internalLinks = new Set<string>();
  $("a[href]").each((_, element) => {
    try {
      const link = new URL($(element).attr("href") || "", documentUrl);
      if (link.hostname === documentUrl.hostname) internalLinks.add(link.toString());
    } catch {
      // Ignore malformed links; the audit layer can report them separately later.
    }
  });

  const contentRoot = $("main").first().length
    ? $("main").first().clone()
    : $("article").first().length
      ? $("article").first().clone()
      : $("body").first().clone();
  contentRoot.find("script,style,noscript,svg,nav,footer,form").remove();
  const content = cleanText(contentRoot.text());

  return {
    url: documentUrl.toString(),
    capturedOn: new Date().toISOString().slice(0, 10),
    statusCode: response.status,
    title: cleanText($("title").first().text()),
    metaDescription: cleanText($("meta[name='description']").attr("content")),
    canonical: cleanText($("link[rel='canonical']").attr("href")),
    h1: cleanText($("h1").first().text()),
    wordCount: content ? content.split(/\s+/).length : 0,
    internalLinks: internalLinks.size,
    contentHash: createHash("sha256").update(content).digest("hex"),
  };
}

async function recordSnapshotChanges(
  site: StoredSite,
  previous: Awaited<ReturnType<typeof getLatestPageSnapshot>>,
  current: Awaited<ReturnType<typeof capturePage>>,
) {
  if (!previous) return 0;
  const changes: string[] = [];
  if (previous.statusCode !== current.statusCode) changes.push(`status ${previous.statusCode} → ${current.statusCode}`);
  if (previous.title !== current.title) changes.push("title changed");
  if (previous.metaDescription !== current.metaDescription) changes.push("meta description changed");
  if (previous.canonical !== current.canonical) changes.push("canonical changed");
  if (previous.h1 !== current.h1) changes.push("H1 changed");
  const wordDelta = Math.abs(current.wordCount - previous.wordCount);
  if (
    previous.contentHash !== current.contentHash &&
    wordDelta >= Math.max(20, previous.wordCount * 0.05)
  ) {
    changes.push(`main content changed (${previous.wordCount} → ${current.wordCount} words)`);
  }
  if (!changes.length) return 0;

  const highImpact =
    previous.statusCode !== current.statusCode || previous.canonical !== current.canonical;
  await saveEvidenceEvent(site.id, {
    id: stableId(site.id, "crawler", "page_change", current.capturedOn, current.url),
    source: "crawler",
    kind: "page_change",
    occurredAt: new Date(`${current.capturedOn}T12:00:00.000Z`),
    title: `${changes.length} page change${changes.length === 1 ? "" : "s"} detected`,
    description: `${current.url}: ${changes.join(", ")}.`,
    evidenceState: "detected",
    impact: highImpact ? "high" : "medium",
    metadata: { url: current.url, changes, previous, current },
  });
  return 1;
}

export async function crawlVerifiedSite(site: StoredSite, options?: { maxPages?: number }) {
  const runId = await createSyncRun(site.id, "crawler");
  const maxPages = Math.max(1, Math.min(options?.maxPages ?? 20, 100));

  try {
    const urls = await discoverUrls(site, maxPages);
    const expectedHostname = siteBaseUrl(site.siteUrl).hostname;
    let captured = 0;
    let eventsCreated = 0;
    const failures: Array<{ url: string; error: string }> = [];

    for (const url of urls) {
      try {
        const snapshot = await capturePage(url, expectedHostname);
        const previous = await getLatestPageSnapshot(site.id, snapshot.url, snapshot.capturedOn);
        eventsCreated += await recordSnapshotChanges(site, previous, snapshot);
        await savePageSnapshot(site.id, snapshot);
        captured += 1;
      } catch (error) {
        failures.push({
          url,
          error: error instanceof Error ? error.message : "Unknown crawl error.",
        });
      }
    }

    if (captured > 0) {
      await saveEvidenceEvent(site.id, {
        id: stableId(site.id, "crawler", "crawl_baseline", new Date().toISOString().slice(0, 10)),
        source: "crawler",
        kind: "crawl_baseline",
        occurredAt: new Date(),
        title: "Page-change baseline refreshed",
        description: `${captured} page snapshots were captured. Future crawls compare titles, descriptions, canonicals, headings, status codes and main content against this baseline.`,
        evidenceState: "detected",
        impact: "low",
        metadata: { captured, discovered: urls.length, failures: failures.length },
      });
      eventsCreated += 1;
    }

    await finishSyncRun({
      id: runId,
      status: "completed",
      rowsWritten: captured,
      details: { discovered: urls.length, captured, eventsCreated, failures },
    });
    return { siteId: site.id, siteUrl: site.siteUrl, discovered: urls.length, captured, eventsCreated, failures };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown crawl error.";
    await finishSyncRun({ id: runId, status: "failed", error: message });
    throw error;
  }
}
