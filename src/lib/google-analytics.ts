import { z } from "zod";
import {
  createSyncRun,
  finishSyncRun,
  getGoogleConnectionById,
  listGa4Properties,
  markGa4PropertyError,
  markGoogleConnectionError,
  revealConnectionTokens,
  saveEvidenceEvent,
  saveGa4Metrics,
  stableId,
  updateGoogleConnectionToken,
  upsertGa4Properties,
  type Ga4MetricInput,
} from "@/lib/data-store";
import { refreshGoogleToken } from "@/lib/google-search-console";

const accountSummariesSchema = z.object({
  accountSummaries: z.array(z.object({
    account: z.string(),
    displayName: z.string().optional(),
    propertySummaries: z.array(z.object({
      property: z.string(),
      displayName: z.string(),
    })).optional(),
  })).optional(),
  nextPageToken: z.string().optional(),
});

const reportSchema = z.object({
  dimensionHeaders: z.array(z.object({ name: z.string() })).optional(),
  metricHeaders: z.array(z.object({ name: z.string(), type: z.string().optional() })).optional(),
  rows: z.array(z.object({
    dimensionValues: z.array(z.object({ value: z.string().optional() })).optional(),
    metricValues: z.array(z.object({ value: z.string().optional() })).optional(),
  })).optional(),
  rowCount: z.number().optional(),
});

async function googleJson(response: Response, label: string) {
  const json = await response.json().catch(() => null) as Record<string, unknown> | null;
  if (!response.ok) {
    const nested = json?.error as Record<string, unknown> | undefined;
    const detail = typeof nested?.message === "string" ? nested.message : `${response.status} ${response.statusText}`;
    throw new Error(`${label} failed: ${detail}`);
  }
  return json;
}

export async function listGoogleAnalyticsProperties(accessToken: string) {
  const properties: Array<{ accountId: string; propertyId: string; displayName: string }> = [];
  let pageToken = "";
  do {
    const url = new URL("https://analyticsadmin.googleapis.com/v1alpha/accountSummaries");
    url.searchParams.set("pageSize", "200");
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    const response = await fetch(url, {
      headers: { authorization: `Bearer ${accessToken}` },
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });
    const parsed = accountSummariesSchema.parse(await googleJson(response, "Analytics property listing"));
    for (const account of parsed.accountSummaries ?? []) {
      for (const property of account.propertySummaries ?? []) {
        properties.push({
          accountId: account.account.replace(/^accounts\//, ""),
          propertyId: property.property.replace(/^properties\//, ""),
          displayName: property.displayName,
        });
      }
    }
    pageToken = parsed.nextPageToken || "";
  } while (pageToken);
  return properties;
}

async function freshAccessToken(connectionId: string) {
  const connection = await getGoogleConnectionById(connectionId);
  if (!connection) throw new Error("Google connection was not found.");
  const tokens = revealConnectionTokens(connection);
  if (connection.expiresAt && connection.expiresAt.getTime() > Date.now() + 5 * 60_000) {
    return tokens.accessToken;
  }
  if (!tokens.refreshToken) throw new Error("Reconnect Google to grant Analytics access.");
  try {
    const refreshed = await refreshGoogleToken(tokens.refreshToken);
    await updateGoogleConnectionToken({
      connectionId,
      accessToken: refreshed.access_token,
      refreshToken: refreshed.refresh_token,
      expiresAt: refreshed.expires_in ? new Date(Date.now() + refreshed.expires_in * 1000) : undefined,
    });
    return refreshed.access_token;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Google token refresh failed.";
    await markGoogleConnectionError(connectionId, message);
    throw error;
  }
}

export async function discoverGa4PropertiesForConnection(connectionId: string) {
  const accessToken = await freshAccessToken(connectionId);
  const properties = await listGoogleAnalyticsProperties(accessToken);
  return upsertGa4Properties(connectionId, properties);
}

function numeric(value: string | undefined) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function queryGa4Property(input: { accessToken: string; propertyId: string; startDate: string; endDate: string }) {
  const response = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${encodeURIComponent(input.propertyId)}:runReport`, {
    method: "POST",
    headers: { authorization: `Bearer ${input.accessToken}`, "content-type": "application/json" },
    body: JSON.stringify({
      dateRanges: [{ startDate: input.startDate, endDate: input.endDate }],
      dimensions: [{ name: "date" }, { name: "landingPagePlusQueryString" }, { name: "sessionSourceMedium" }],
      metrics: [
        { name: "sessions" }, { name: "activeUsers" }, { name: "newUsers" },
        { name: "keyEvents" }, { name: "engagedSessions" },
        { name: "engagementRate" }, { name: "averageSessionDuration" },
      ],
      limit: "100000",
      keepEmptyRows: false,
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(30_000),
  });
  const parsed = reportSchema.parse(await googleJson(response, "Analytics report"));
  return (parsed.rows ?? []).map((row): Ga4MetricInput => {
    const dimensions = row.dimensionValues ?? [];
    const metrics = row.metricValues ?? [];
    const compactDate = dimensions[0]?.value || "";
    const date = compactDate.length === 8
      ? `${compactDate.slice(0, 4)}-${compactDate.slice(4, 6)}-${compactDate.slice(6, 8)}`
      : compactDate;
    return {
      date,
      landingPage: dimensions[1]?.value || "(not set)",
      sourceMedium: dimensions[2]?.value || "(not set)",
      sessions: numeric(metrics[0]?.value), activeUsers: numeric(metrics[1]?.value),
      newUsers: numeric(metrics[2]?.value), keyEvents: numeric(metrics[3]?.value),
      engagedSessions: numeric(metrics[4]?.value), engagementRate: numeric(metrics[5]?.value),
      averageSessionDuration: numeric(metrics[6]?.value),
    };
  });
}

export async function syncGa4Property(property: Awaited<ReturnType<typeof listGa4Properties>>[number]) {
  const runId = await createSyncRun(property.siteId || "", "ga4");
  const end = new Date();
  end.setUTCDate(end.getUTCDate() - 2);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 34);
  const startDate = start.toISOString().slice(0, 10);
  const endDate = end.toISOString().slice(0, 10);
  try {
    const accessToken = await freshAccessToken(property.connectionId);
    const rows = await queryGa4Property({ accessToken, propertyId: property.propertyId, startDate, endDate });
    await saveGa4Metrics(property.id, rows);
    if (property.siteId) {
      await saveEvidenceEvent(property.siteId, {
        id: stableId(property.siteId, "ga4", "measurement_baseline", endDate),
        source: "ga4",
        kind: "measurement_baseline",
        occurredAt: new Date(`${endDate}T12:05:00.000Z`),
        title: "Traffic context baseline refreshed",
        description: `${rows.length} GA4 landing-page and acquisition rows were captured through ${endDate}.`,
        evidenceState: "detected",
        impact: "low",
        metadata: { propertyId: property.propertyId, rows: rows.length, startDate, endDate },
      });
    }
    await finishSyncRun({ id: runId, status: "completed", rowsWritten: rows.length, details: { propertyId: property.propertyId, startDate, endDate } });
    return { propertyId: property.id, displayName: property.displayName, rowsWritten: rows.length };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown GA4 sync error.";
    await markGa4PropertyError(property.id, message);
    await finishSyncRun({ id: runId, status: "failed", error: message });
    throw error;
  }
}

export async function syncMappedGa4Properties() {
  const properties = (await listGa4Properties()).filter((property) => property.active && property.siteId);
  const results: Array<Record<string, unknown>> = [];
  for (const property of properties) {
    try { results.push({ ok: true, ...(await syncGa4Property(property)) }); }
    catch (error) { results.push({ ok: false, propertyId: property.id, displayName: property.displayName, error: error instanceof Error ? error.message : "Unknown GA4 sync error." }); }
  }
  return results;
}
