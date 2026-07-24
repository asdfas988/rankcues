import {
  createSyncRun,
  finishSyncRun,
  getActiveSites,
  getConnectionForSite,
  getWeeklyEvidence,
  markGoogleConnectionError,
  revealConnectionTokens,
  saveEvidenceEvent,
  saveGscMetrics,
  stableId,
  type StoredSite,
  updateGoogleConnectionToken,
} from "@/lib/data-store";
import {
  queryGoogleSearchAnalytics,
  refreshGoogleToken,
} from "@/lib/google-search-console";
import {
  getGoogleServiceAccountAccessToken,
  isGoogleServiceAccountSubject,
} from "@/lib/google-service-account";

function dateOnly(value: Date) {
  return value.toISOString().slice(0, 10);
}

function addDays(value: Date, days: number) {
  const next = new Date(value);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

async function getFreshAccessToken(site: StoredSite) {
  const connection = await getConnectionForSite(site.id);
  if (!connection) {
    throw new Error(`No Google connection is attached to ${site.siteUrl}.`);
  }

  const tokens = revealConnectionTokens(connection);
  const expiresSoon =
    !connection.expiresAt || connection.expiresAt.getTime() <= Date.now() + 5 * 60_000;
  if (!expiresSoon) return { accessToken: tokens.accessToken, connection };
  if (isGoogleServiceAccountSubject(connection.googleSubject)) {
    try {
      const token = await getGoogleServiceAccountAccessToken();
      await updateGoogleConnectionToken({
        connectionId: connection.id,
        accessToken: token.accessToken,
        expiresAt: token.expiresAt,
      });
      return { accessToken: token.accessToken, connection };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Google service-account token refresh failed.";
      await markGoogleConnectionError(connection.id, message);
      throw error;
    }
  }
  if (!tokens.refreshToken) {
    throw new Error("Google access expired and no refresh token is stored. Reconnect Google.");
  }

  try {
    const refreshed = await refreshGoogleToken(tokens.refreshToken);
    const expiresAt = refreshed.expires_in
      ? new Date(Date.now() + refreshed.expires_in * 1000)
      : undefined;
    await updateGoogleConnectionToken({
      connectionId: connection.id,
      accessToken: refreshed.access_token,
      refreshToken: refreshed.refresh_token,
      expiresAt,
    });
    return { accessToken: refreshed.access_token, connection };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Google token refresh failed.";
    await markGoogleConnectionError(connection.id, message);
    throw error;
  }
}

function numeric(value: unknown) {
  const number = Number(value || 0);
  return Number.isFinite(number) ? number : 0;
}

async function detectGscMovements(site: StoredSite, endDate: string) {
  const evidence = await getWeeklyEvidence(site.id);
  if (!evidence) return 0;
  let created = 0;

  const totals = evidence.comparison.totals as Record<string, unknown>;
  await saveEvidenceEvent(site.id, {
    id: stableId(site.id, "gsc", "measurement_baseline", endDate),
    source: "gsc",
    kind: "measurement_baseline",
    occurredAt: new Date(`${endDate}T12:00:00.000Z`),
    title: "Search performance baseline refreshed",
    description: `RankCues captured the latest comparable Search Console window through ${endDate}: ${numeric(totals.current_clicks).toFixed(0)} clicks and ${numeric(totals.current_impressions).toFixed(0)} impressions.`,
    evidenceState: "detected",
    impact: "low",
    metadata: totals,
  });
  created += 1;

  for (const rawRow of (evidence.comparison.pages as Array<Record<string, unknown>>).slice(0, 20)) {
    const previousClicks = numeric(rawRow.previous_clicks);
    const currentClicks = numeric(rawRow.current_clicks);
    const previousImpressions = numeric(rawRow.previous_impressions);
    const currentImpressions = numeric(rawRow.current_impressions);
    const previousPosition = numeric(rawRow.previous_position);
    const currentPosition = numeric(rawRow.current_position);
    const clickDelta = currentClicks - previousClicks;
    const clickDeltaPercent = previousClicks > 0 ? (clickDelta / previousClicks) * 100 : currentClicks > 0 ? 100 : 0;
    const impressionDelta = currentImpressions - previousImpressions;
    const impressionDeltaPercent = previousImpressions > 0 ? (impressionDelta / previousImpressions) * 100 : currentImpressions > 0 ? 100 : 0;
    const positionDelta = previousPosition > 0 && currentPosition > 0 ? previousPosition - currentPosition : 0;
    const enoughEvidence = Math.max(previousImpressions, currentImpressions) >= 20;
    const material = Math.abs(positionDelta) >= 2.5 || Math.abs(clickDelta) >= 2 || Math.abs(impressionDeltaPercent) >= 50;
    if (!enoughEvidence || !material) continue;

    const page = String(rawRow.page || site.siteUrl);
    const primaryChange = Math.abs(positionDelta) >= 2.5
      ? `average position ${positionDelta > 0 ? "improved" : "declined"} ${Math.abs(positionDelta).toFixed(1)}`
      : clickDelta !== 0
        ? `clicks ${clickDelta > 0 ? "increased" : "decreased"} ${Math.abs(clickDeltaPercent).toFixed(1)}%`
        : `impressions ${impressionDelta >= 0 ? "increased" : "decreased"} ${Math.abs(impressionDeltaPercent).toFixed(1)}%`;
    const impact = Math.abs(positionDelta) >= 7 || Math.abs(clickDelta) >= 20 ? "high" : "medium";
    await saveEvidenceEvent(site.id, {
      id: stableId(site.id, "gsc", "page_movement", endDate, page),
      source: "gsc",
      kind: "page_movement",
      occurredAt: new Date(`${endDate}T12:00:00.000Z`),
      title: `Page ${primaryChange}`,
      description: `${page} changed from ${previousClicks.toFixed(0)} to ${currentClicks.toFixed(0)} clicks and ${previousImpressions.toFixed(0)} to ${currentImpressions.toFixed(0)} impressions across comparable seven-day windows.`,
      evidenceState: "detected",
      impact,
      metadata: {
        page, previousClicks, currentClicks,
        clickDeltaPercent: Number(clickDeltaPercent.toFixed(2)),
        previousImpressions, currentImpressions,
        impressionDeltaPercent: Number(impressionDeltaPercent.toFixed(2)),
        currentPosition, previousPosition,
        positionDelta: Number(positionDelta.toFixed(2)),
      },
    });
    created += 1;
  }

  for (const rawRow of (evidence.comparison.queries as Array<Record<string, unknown>>).slice(0, 80)) {
    if (created >= 25) break;
    const query = String(rawRow.query || "");
    const previousImpressions = numeric(rawRow.previous_impressions);
    const currentImpressions = numeric(rawRow.current_impressions);
    const previousClicks = numeric(rawRow.previous_clicks);
    const currentClicks = numeric(rawRow.current_clicks);
    const previousPosition = numeric(rawRow.previous_position);
    const currentPosition = numeric(rawRow.current_position);
    const positionDelta = previousPosition > 0 && currentPosition > 0 ? previousPosition - currentPosition : 0;
    const impressionDelta = currentImpressions - previousImpressions;
    const impressionDeltaPercent = previousImpressions > 0 ? (impressionDelta / previousImpressions) * 100 : currentImpressions > 0 ? 100 : 0;
    if (Math.max(previousImpressions, currentImpressions) < 10) continue;
    if (Math.abs(positionDelta) < 3 && Math.abs(currentClicks - previousClicks) < 2 && Math.abs(impressionDeltaPercent) < 60) continue;

    const queryTitle = previousPosition <= 0 && currentPosition > 0
      ? `Keyword “${query}” entered the tracked results`
      : currentPosition <= 0 && previousPosition > 0
        ? `Keyword “${query}” left the tracked results`
        : positionDelta > 0
          ? `Keyword “${query}” gained visibility`
          : positionDelta < 0
            ? `Keyword “${query}” lost visibility`
            : `Keyword “${query}” changed impression volume`;
    const positionStatement = previousPosition <= 0 && currentPosition > 0
      ? `The query entered this GSC window at average position ${currentPosition.toFixed(1)}`
      : `Average position moved from ${previousPosition.toFixed(1)} to ${currentPosition.toFixed(1)}`;

    await saveEvidenceEvent(site.id, {
      id: stableId(site.id, "gsc", "query_movement", endDate, query),
      source: "gsc",
      kind: "query_movement",
      occurredAt: new Date(`${endDate}T12:01:00.000Z`),
      title: queryTitle,
      description: `${positionStatement}; impressions moved from ${previousImpressions.toFixed(0)} to ${currentImpressions.toFixed(0)}.`,
      evidenceState: "detected",
      impact: Math.abs(positionDelta) >= 8 || Math.max(previousImpressions, currentImpressions) >= 500 ? "high" : "medium",
      metadata: { query, previousClicks, currentClicks, previousImpressions, currentImpressions, previousPosition, currentPosition, positionDelta: Number(positionDelta.toFixed(2)) },
    });
    created += 1;
  }

  return created;
}

export async function syncGscSite(site: StoredSite, options?: { days?: number }) {
  const runId = await createSyncRun(site.id, "gsc");
  const days = Math.max(14, Math.min(options?.days ?? 35, 120));
  const end = addDays(new Date(), -3);
  const start = addDays(end, -(days - 1));
  const startDate = dateOnly(start);
  const endDate = dateOnly(end);

  try {
    const { accessToken } = await getFreshAccessToken(site);
    const result = await queryGoogleSearchAnalytics({
      accessToken,
      siteUrl: site.siteUrl,
      startDate,
      endDate,
      maxRows: Number(process.env.GSC_MAX_ROWS_PER_SYNC || 50_000),
    });
    await saveGscMetrics(site.id, result.rows);
    const eventsCreated = await detectGscMovements(site, endDate);
    await finishSyncRun({
      id: runId,
      status: "completed",
      rowsWritten: result.rows.length,
      details: {
        startDate,
        endDate,
        truncated: result.truncated,
        eventsCreated,
        metadata: result.metadata,
      },
    });

    return {
      siteId: site.id,
      siteUrl: site.siteUrl,
      startDate,
      endDate,
      rowsWritten: result.rows.length,
      truncated: result.truncated,
      eventsCreated,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown GSC sync error.";
    await finishSyncRun({ id: runId, status: "failed", error: message });
    throw error;
  }
}

export async function syncActiveGscSites(limit?: number) {
  const sites = await getActiveSites(limit ?? Number(process.env.CRON_SITE_LIMIT || 10));
  const results: Array<Record<string, unknown>> = [];

  for (const site of sites) {
    try {
      results.push({ ok: true, ...(await syncGscSite(site)) });
    } catch (error) {
      results.push({
        ok: false,
        siteId: site.id,
        siteUrl: site.siteUrl,
        error: error instanceof Error ? error.message : "Unknown sync error.",
      });
    }
  }

  return results;
}
