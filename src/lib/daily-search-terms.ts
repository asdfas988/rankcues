import { createHash } from "node:crypto";
import { ensureDatabaseSchema, getDatabase, isDatabaseConfigured } from "./database";

export const DAILY_SEARCH_TERM_STATUSES = [
  "baseline",
  "new",
  "returning",
  "growing",
  "active",
  "lost",
] as const;

export type DailySearchTermStatus = (typeof DAILY_SEARCH_TERM_STATUSES)[number];
export type DailySearchTermStatusFilter = DailySearchTermStatus | "all";

export type DailySearchTermStatusSignals = {
  asOfDate: string;
  baselineThrough: string;
  firstSeenOn: string;
  lastSeenOn: string;
  previousSeenOn: string | null;
  clicks: number;
  impressions: number;
  position: number;
  previousClicks: number;
  previousImpressions: number;
  previousPosition: number;
  dataComplete?: boolean;
  gapComplete?: boolean;
};

export type DailySearchTermRow = {
  id: string;
  siteId: string;
  siteUrl: string;
  query: string;
  status: DailySearchTermStatus;
  firstSeenOn: string;
  lastSeenOn: string;
  previousSeenOn: string | null;
  observedDays: number;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  previousClicks: number;
  previousImpressions: number;
  previousPosition: number;
  landingPage: string | null;
  landingPageShare: number;
  pageCount: number;
};

export type DailySearchTermCounts = Record<DailySearchTermStatus | "total", number>;

export type DailySearchTermLedger = {
  siteId: string;
  siteUrl: string;
  dataDate: string | null;
  availableDates: string[];
  baselineThrough: string | null;
  lastSyncedAt: string | null;
  dataComplete: boolean;
  rows: DailySearchTermRow[];
  counts: DailySearchTermCounts;
  page: number;
  pageSize: number;
  total: number;
  pageCount: number;
};

export type DailySearchTermLedgerInput = {
  workspaceId?: string;
  siteId: string;
  date?: string;
  status?: DailySearchTermStatusFilter;
  search?: string;
  page?: number;
  pageSize?: number;
};

const LOST_AFTER_MISSING_DAYS = 7;
const LOST_VISIBLE_THROUGH_MISSING_DAYS = 28;
const SEARCH_TERM_HISTORY_DAYS = 120;
const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;

function dateOnly(value: unknown) {
  if (!value) return "";
  const text = String(value);
  const iso = text.match(/^\d{4}-\d{2}-\d{2}/)?.[0];
  if (iso) return iso;
  const parsed = value instanceof Date ? value : new Date(text);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString().slice(0, 10);
}

function validDateOnly(value: unknown) {
  const date = dateOnly(value);
  if (!date || String(value).slice(0, 10) !== date) return null;
  const parsed = new Date(`${date}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date
    ? null
    : date;
}

function calendarDayDifference(earlier: string, later: string) {
  const start = Date.parse(`${earlier}T00:00:00.000Z`);
  const end = Date.parse(`${later}T00:00:00.000Z`);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return 0;
  return Math.round((end - start) / 86_400_000);
}

function addCalendarDays(date: string, days: number) {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

export function hasCompleteDailyCoverage(
  startExclusive: string,
  endInclusive: string,
  completeDates: ReadonlySet<string>,
) {
  const dayCount = calendarDayDifference(startExclusive, endInclusive);
  if (dayCount < 0) return false;
  for (let day = 1; day <= dayCount; day += 1) {
    if (!completeDates.has(addCalendarDays(startExclusive, day))) return false;
  }
  return true;
}

function booleanValue(value: unknown) {
  return value === true || value === "true";
}

export function isGscSyncCoverageComplete(
  details: Record<string, unknown>,
  dataDate: string,
) {
  const isExactDailySnapshot = dateOnly(details.endDate) === dataDate
    && Object.prototype.hasOwnProperty.call(details, "dailyTruncated");
  if (isExactDailySnapshot) return !booleanValue(details.dailyTruncated);
  if (Object.prototype.hasOwnProperty.call(details, "historyTruncated")) {
    return !booleanValue(details.historyTruncated);
  }
  return !booleanValue(details.truncated);
}

function numeric(value: unknown) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}

function defaultWorkspaceId() {
  return process.env.DEFAULT_WORKSPACE_ID || "default";
}

function rowId(...parts: string[]) {
  return createHash("sha256").update(parts.join("\u001f")).digest("hex").slice(0, 32);
}

function integer(value: unknown, fallback: number, minimum: number, maximum: number) {
  const number = Math.trunc(numeric(value));
  return Math.max(minimum, Math.min(number || fallback, maximum));
}

export function normalizeSearchTerm(value: string) {
  return value.trim().replace(/\s+/gu, " ").toLowerCase();
}

export function isDailySearchTermGrowing(signals: Pick<
  DailySearchTermStatusSignals,
  "clicks" | "impressions" | "position" | "previousClicks" | "previousImpressions" | "previousPosition"
>) {
  const clickDelta = signals.clicks - signals.previousClicks;
  const impressionDelta = signals.impressions - signals.previousImpressions;
  const clickGrowth = signals.previousClicks > 0
    ? clickDelta >= 2 && clickDelta / signals.previousClicks >= 0.25
    : signals.clicks >= 3;
  const impressionGrowth = signals.previousImpressions > 0
    ? impressionDelta >= 10 && impressionDelta / signals.previousImpressions >= 0.25
    : signals.impressions >= 20;
  const positionGrowth = signals.previousPosition > 0
    && signals.position > 0
    && signals.previousPosition - signals.position >= 3
    && signals.impressions >= 10;
  return clickGrowth || impressionGrowth || positionGrowth;
}

export function deriveDailySearchTermStatus(
  signals: DailySearchTermStatusSignals,
): DailySearchTermStatus {
  const observedOnDate = signals.lastSeenOn === signals.asOfDate;

  if (signals.asOfDate <= signals.baselineThrough) return "baseline";

  // A truncated daily snapshot cannot support any movement claim safely,
  // including positive deltas, because either side may be incomplete.
  if (signals.dataComplete === false) {
    return signals.lastSeenOn < signals.baselineThrough ? "baseline" : "active";
  }

  if (!observedOnDate) {
    const missingDays = calendarDayDifference(signals.lastSeenOn, signals.asOfDate);
    // Only terms observed on or after the initial baseline can become lost. This
    // prevents a first deployment from reporting already-stale history as losses.
    if (
      signals.lastSeenOn >= signals.baselineThrough
      && missingDays >= LOST_AFTER_MISSING_DAYS
      && signals.gapComplete !== false
    ) return "lost";
    return signals.lastSeenOn < signals.baselineThrough ? "baseline" : "active";
  }

  if (signals.firstSeenOn > signals.baselineThrough && signals.firstSeenOn === signals.asOfDate) {
    return "new";
  }

  if (signals.previousSeenOn) {
    const observationGap = calendarDayDifference(signals.previousSeenOn, signals.asOfDate);
    if (
      observationGap - 1 >= LOST_AFTER_MISSING_DAYS
      && signals.gapComplete !== false
    ) return "returning";
    if (observationGap === 1 && isDailySearchTermGrowing(signals)) return "growing";
  }

  return "active";
}

function emptyCounts(): DailySearchTermCounts {
  return {
    total: 0,
    baseline: 0,
    new: 0,
    returning: 0,
    growing: 0,
    active: 0,
    lost: 0,
  };
}

function isoTimestamp(value: unknown) {
  if (!value) return null;
  const parsed = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

type LifecycleAggregate = {
  normalized_query: unknown;
  query: unknown;
  first_seen_on: unknown;
  last_seen_on: unknown;
  previous_seen_on: unknown;
  observed_days: unknown;
  last_clicks: unknown;
  last_impressions: unknown;
  last_position: unknown;
  previous_clicks: unknown;
  previous_impressions: unknown;
  previous_position: unknown;
  new_observed_days: unknown;
  stored_first_seen_on: unknown;
  stored_last_seen_on: unknown;
  stored_previous_seen_on: unknown;
  stored_observed_days: unknown;
};

export async function recordGscDateCoverage(input: {
  siteId: string;
  workspaceId?: string;
  startDate: string;
  endDate: string;
  historyComplete: boolean;
  dailySnapshotDate?: string;
  dailySnapshotComplete?: boolean;
  syncRunId?: string;
}) {
  if (!isDatabaseConfigured()) return null;
  const startDate = validDateOnly(input.startDate);
  const endDate = validDateOnly(input.endDate);
  if (!startDate || !endDate) throw new Error("GSC coverage requires valid start and end dates.");
  const dayCount = calendarDayDifference(startDate, endDate) + 1;
  if (dayCount < 1 || dayCount > SEARCH_TERM_HISTORY_DAYS) {
    throw new Error(`GSC coverage range must contain 1-${SEARCH_TERM_HISTORY_DAYS} days.`);
  }

  await ensureDatabaseSchema();
  const sql = getDatabase();
  const currentWorkspaceId = input.workspaceId || defaultWorkspaceId();
  const [site] = await sql`
    select id
    from rankcues_sites
    where id = ${input.siteId} and workspace_id = ${currentWorkspaceId}
    limit 1
  `;
  if (!site) return null;

  const dailySnapshotDate = validDateOnly(input.dailySnapshotDate);
  const rows = Array.from({ length: dayCount }, (_, index) => {
    const coverageDate = addCalendarDays(startDate, index);
    return {
      workspace_id: currentWorkspaceId,
      site_id: input.siteId,
      coverage_date: coverageDate,
      is_complete: input.historyComplete || (
        coverageDate === dailySnapshotDate && input.dailySnapshotComplete === true
      ),
      sync_run_id: input.syncRunId || null,
    };
  });

  await sql`
    insert into rankcues_gsc_date_coverage ${sql(
      rows,
      "workspace_id",
      "site_id",
      "coverage_date",
      "is_complete",
      "sync_run_id",
    )}
    on conflict (workspace_id, site_id, coverage_date) do update set
      is_complete = rankcues_gsc_date_coverage.is_complete or excluded.is_complete,
      sync_run_id = case
        when excluded.is_complete then excluded.sync_run_id
        else coalesce(rankcues_gsc_date_coverage.sync_run_id, excluded.sync_run_id)
      end,
      updated_at = now()
  `;

  return {
    datesRecorded: rows.length,
    completeDates: rows.filter((row) => row.is_complete).length,
  };
}

export async function refreshDailySearchTermLifecycle(input: {
  siteId: string;
  workspaceId?: string;
  dataDate?: string;
  dataComplete?: boolean;
}) {
  if (!isDatabaseConfigured()) return null;
  await ensureDatabaseSchema();
  const sql = getDatabase();
  const currentWorkspaceId = input.workspaceId || defaultWorkspaceId();

  const [site] = await sql`
    select s.id, s.site_url, max(m.metric_date) as data_date
    from rankcues_sites s
    left join rankcues_gsc_metrics m on m.site_id = s.id
    where s.id = ${input.siteId} and s.workspace_id = ${currentWorkspaceId}
    group by s.id, s.site_url
    limit 1
  `;
  if (!site) return null;

  const requestedDataDate = validDateOnly(input.dataDate);
  const latestMetricDate = dateOnly(site.data_date);
  const dataDate = requestedDataDate || latestMetricDate;
  if (!dataDate) return { siteId: String(site.id), dataDate: null, rowsUpdated: 0 };

  const coverageRows = await sql`
    select coverage_date, is_complete
    from rankcues_gsc_date_coverage
    where workspace_id = ${currentWorkspaceId}
      and site_id = ${input.siteId}
      and coverage_date >= ${dataDate}::date - ${SEARCH_TERM_HISTORY_DAYS - 1}::integer
      and coverage_date <= ${dataDate}::date
  `;
  const coverageByDate = new Map(
    coverageRows.map((row) => [dateOnly(row.coverage_date), booleanValue(row.is_complete)]),
  );
  const completeCoverageDates = new Set(
    [...coverageByDate.entries()]
      .filter(([, isComplete]) => isComplete)
      .map(([coverageDate]) => coverageDate),
  );
  const dataComplete = coverageByDate.has(dataDate)
    ? coverageByDate.get(dataDate) === true
    : input.dataComplete !== false;

  const [existingBaseline] = await sql`
    select baseline_through, last_processed_on
    from rankcues_search_term_baselines
    where workspace_id = ${currentWorkspaceId} and site_id = ${input.siteId}
    limit 1
  `;
  const initializedNow = !existingBaseline;
  const initialBaselineThrough = requestedDataDate || latestMetricDate || dataDate;

  if (
    existingBaseline
    && dateOnly(existingBaseline.last_processed_on) > dataDate
  ) {
    return {
      siteId: String(site.id),
      dataDate: dateOnly(existingBaseline.last_processed_on),
      dataComplete,
      rowsUpdated: 0,
    };
  }

  await sql`
    insert into rankcues_search_term_baselines (
      workspace_id, site_id, baseline_through, last_processed_on, last_data_complete
    ) values (
      ${currentWorkspaceId}, ${input.siteId}, ${initialBaselineThrough},
      ${dataDate}, ${dataComplete}
    )
    on conflict (site_id) do nothing
  `;

  const [baseline] = await sql`
    select baseline_through
    from rankcues_search_term_baselines
    where workspace_id = ${currentWorkspaceId} and site_id = ${input.siteId}
    limit 1
  `;
  if (!baseline) return null;
  const baselineThrough = dateOnly(baseline.baseline_through);

  const previousProcessedOn = dateOnly(existingBaseline?.last_processed_on) || "0001-01-01";
  const aggregates = await sql`
    with daily as (
      select
        lower(regexp_replace(btrim(m.query), '[[:space:]]+', ' ', 'g')) as normalized_query,
        min(regexp_replace(btrim(m.query), '[[:space:]]+', ' ', 'g')) as query,
        m.metric_date,
        sum(m.clicks)::double precision as clicks,
        sum(m.impressions)::double precision as impressions,
        case
          when sum(m.impressions) > 0
            then (sum(m.position * m.impressions) / sum(m.impressions))::double precision
          else avg(m.position)::double precision
        end as position
      from rankcues_gsc_metrics m
      join rankcues_sites s on s.id = m.site_id
      where m.site_id = ${input.siteId}
        and s.workspace_id = ${currentWorkspaceId}
        and m.metric_date <= ${dataDate}::date
        and (
          ${initializedNow}
          or m.metric_date >= ${dataDate}::date - ${SEARCH_TERM_HISTORY_DAYS - 1}::integer
        )
        and btrim(m.query) <> ''
      group by normalized_query, m.metric_date
    ), ranked as (
      select
        *,
        row_number() over (partition by normalized_query order by metric_date desc) as recency
      from daily
    ), rollup as (
      select
        normalized_query,
        min(query) filter (where recency = 1) as query,
        min(metric_date) as first_seen_on,
        max(metric_date) as last_seen_on,
        max(metric_date) filter (where recency = 2) as previous_seen_on,
        count(*)::integer as observed_days,
        count(*) filter (where metric_date > ${previousProcessedOn}::date)::integer as new_observed_days,
        max(clicks) filter (where recency = 1)::double precision as last_clicks,
        max(impressions) filter (where recency = 1)::double precision as last_impressions,
        max(position) filter (where recency = 1)::double precision as last_position,
        coalesce(max(clicks) filter (where recency = 2), 0)::double precision as previous_clicks,
        coalesce(max(impressions) filter (where recency = 2), 0)::double precision as previous_impressions,
        coalesce(max(position) filter (where recency = 2), 0)::double precision as previous_position
      from ranked
      group by normalized_query
    )
    select
      r.*,
      l.first_seen_on as stored_first_seen_on,
      l.last_seen_on as stored_last_seen_on,
      l.previous_seen_on as stored_previous_seen_on,
      l.observed_days as stored_observed_days
    from rollup r
    left join rankcues_search_term_lifecycle l
      on l.workspace_id = ${currentWorkspaceId}
      and l.site_id = ${input.siteId}
      and l.normalized_query = r.normalized_query
  ` as unknown as LifecycleAggregate[];

  const lifecycleRows = aggregates.map((row) => {
    const windowFirstSeenOn = dateOnly(row.first_seen_on);
    const windowLastSeenOn = dateOnly(row.last_seen_on);
    const windowPreviousSeenOn = dateOnly(row.previous_seen_on) || null;
    const storedFirstSeenOn = dateOnly(row.stored_first_seen_on);
    const storedLastSeenOn = dateOnly(row.stored_last_seen_on);
    const storedPreviousSeenOn = dateOnly(row.stored_previous_seen_on) || null;
    const firstSeenOn = storedFirstSeenOn && storedFirstSeenOn < windowFirstSeenOn
      ? storedFirstSeenOn
      : windowFirstSeenOn;
    const lastSeenOn = storedLastSeenOn && storedLastSeenOn > windowLastSeenOn
      ? storedLastSeenOn
      : windowLastSeenOn;
    const previousSeenOn = storedLastSeenOn && storedLastSeenOn < windowLastSeenOn
      ? [windowPreviousSeenOn, storedLastSeenOn].filter(Boolean).sort().at(-1) || null
      : windowPreviousSeenOn || storedPreviousSeenOn;
    const storedObservedDays = Math.max(0, Math.trunc(numeric(row.stored_observed_days)));
    const observedDays = initializedNow || !storedObservedDays
      ? Math.max(1, Math.trunc(numeric(row.observed_days)))
      : storedObservedDays + Math.max(0, Math.trunc(numeric(row.new_observed_days)));
    const gapStartsAfter = lastSeenOn === dataDate ? previousSeenOn : lastSeenOn;
    const gapComplete = gapStartsAfter
      ? hasCompleteDailyCoverage(gapStartsAfter, dataDate, completeCoverageDates)
      : true;
    const status = initializedNow ? "baseline" : deriveDailySearchTermStatus({
      asOfDate: dataDate,
      baselineThrough,
      firstSeenOn,
      lastSeenOn,
      previousSeenOn,
      clicks: lastSeenOn === dataDate ? numeric(row.last_clicks) : 0,
      impressions: lastSeenOn === dataDate ? numeric(row.last_impressions) : 0,
      position: lastSeenOn === dataDate ? numeric(row.last_position) : 0,
      previousClicks: numeric(row.previous_clicks),
      previousImpressions: numeric(row.previous_impressions),
      previousPosition: numeric(row.previous_position),
      dataComplete,
      gapComplete,
    });
    return {
      workspace_id: currentWorkspaceId,
      site_id: input.siteId,
      normalized_query: String(row.normalized_query),
      query: String(row.query),
      first_seen_on: firstSeenOn,
      last_seen_on: lastSeenOn,
      previous_seen_on: previousSeenOn,
      observed_days: observedDays,
      status,
      status_date: dataDate,
    };
  }).filter((row) => initializedNow || dataComplete || row.last_seen_on === dataDate);

  for (let offset = 0; offset < lifecycleRows.length; offset += 1_000) {
    const chunk = lifecycleRows.slice(offset, offset + 1_000);
    if (!chunk.length) continue;
    await sql`
      insert into rankcues_search_term_lifecycle ${sql(
        chunk,
        "workspace_id",
        "site_id",
        "normalized_query",
        "query",
        "first_seen_on",
        "last_seen_on",
        "previous_seen_on",
        "observed_days",
        "status",
        "status_date",
      )}
      on conflict (workspace_id, site_id, normalized_query) do update set
        query = excluded.query,
        first_seen_on = excluded.first_seen_on,
        last_seen_on = excluded.last_seen_on,
        previous_seen_on = excluded.previous_seen_on,
        observed_days = excluded.observed_days,
        status = excluded.status,
        status_date = excluded.status_date,
        updated_at = now()
    `;
  }

  await sql`
    update rankcues_search_term_baselines set
      last_data_complete = case
        when ${dataDate}::date >= last_processed_on then ${dataComplete}
        else last_data_complete
      end,
      last_processed_on = greatest(last_processed_on, ${dataDate}::date),
      last_refreshed_at = now()
    where workspace_id = ${currentWorkspaceId} and site_id = ${input.siteId}
  `;

  return {
    siteId: String(site.id),
    dataDate,
    dataComplete,
    rowsUpdated: lifecycleRows.length,
  };
}

type LedgerAggregate = LifecycleAggregate & {
  landing_page: unknown;
  landing_page_impressions: unknown;
  page_count: unknown;
};

export async function getDailySearchTermLedger(
  input: DailySearchTermLedgerInput,
): Promise<DailySearchTermLedger | null> {
  if (!isDatabaseConfigured()) return null;
  await ensureDatabaseSchema();
  const sql = getDatabase();
  const currentWorkspaceId = input.workspaceId || defaultWorkspaceId();

  let [site] = await sql`
    select
      s.id, s.site_url, s.last_synced_at, b.baseline_through,
      b.last_processed_on, b.last_data_complete
    from rankcues_sites s
    left join rankcues_search_term_baselines b
      on b.workspace_id = s.workspace_id and b.site_id = s.id
    where s.id = ${input.siteId} and s.workspace_id = ${currentWorkspaceId}
    limit 1
  `;
  if (!site) return null;

  if (!site.baseline_through) {
    await refreshDailySearchTermLifecycle({
      siteId: input.siteId,
      workspaceId: currentWorkspaceId,
    });
    [site] = await sql`
      select
        s.id, s.site_url, s.last_synced_at, b.baseline_through,
        b.last_processed_on, b.last_data_complete
      from rankcues_sites s
      left join rankcues_search_term_baselines b
        on b.workspace_id = s.workspace_id and b.site_id = s.id
      where s.id = ${input.siteId} and s.workspace_id = ${currentWorkspaceId}
      limit 1
    `;
  }

  const dateRows = await sql`
    select dates.metric_date
    from (
      select distinct m.metric_date
      from rankcues_gsc_metrics m
      join rankcues_sites s on s.id = m.site_id
      where m.site_id = ${input.siteId} and s.workspace_id = ${currentWorkspaceId}
      union
      select b.last_processed_on as metric_date
      from rankcues_search_term_baselines b
      where b.site_id = ${input.siteId} and b.workspace_id = ${currentWorkspaceId}
      union
      select coverage.coverage_date as metric_date
      from rankcues_gsc_date_coverage coverage
      where coverage.site_id = ${input.siteId}
        and coverage.workspace_id = ${currentWorkspaceId}
    ) dates
    order by dates.metric_date desc
    limit ${SEARCH_TERM_HISTORY_DAYS}
  `;
  const availableDates = dateRows.map((row) => dateOnly(row.metric_date)).filter(Boolean);
  const requestedDate = validDateOnly(input.date);
  const dataDate = requestedDate && availableDates.includes(requestedDate)
    ? requestedDate
    : availableDates[0] || null;
  const pageSize = integer(input.pageSize, DEFAULT_PAGE_SIZE, 1, MAX_PAGE_SIZE);
  const requestedPage = integer(input.page, 1, 1, Number.MAX_SAFE_INTEGER);
  const baselineThrough = dateOnly(site.baseline_through) || null;
  const lifecycleDate = dateOnly(site.last_processed_on);

  if (!dataDate || !baselineThrough) {
    return {
      siteId: String(site.id),
      siteUrl: String(site.site_url),
      dataDate,
      availableDates,
      baselineThrough,
      lastSyncedAt: isoTimestamp(site.last_synced_at),
      dataComplete: site.last_data_complete !== false,
      rows: [],
      counts: emptyCounts(),
      page: 1,
      pageSize,
      total: 0,
      pageCount: 0,
    };
  }

  const dailyCoverageRows = await sql`
    select coverage_date, is_complete
    from rankcues_gsc_date_coverage
    where workspace_id = ${currentWorkspaceId}
      and site_id = ${input.siteId}
      and coverage_date >= ${dataDate}::date - ${SEARCH_TERM_HISTORY_DAYS - 1}::integer
      and coverage_date <= ${dataDate}::date
  `;
  const coverageByDate = new Map(
    dailyCoverageRows.map((row) => [dateOnly(row.coverage_date), booleanValue(row.is_complete)]),
  );
  const completeCoverageDates = new Set(
    [...coverageByDate.entries()]
      .filter(([, isComplete]) => isComplete)
      .map(([coverageDate]) => coverageDate),
  );

  const coverageRuns = coverageByDate.has(dataDate) ? [] : await sql`
    select run.details
    from rankcues_sync_runs run
    join rankcues_sites owner on owner.id = run.site_id
    where run.site_id = ${input.siteId}
      and owner.workspace_id = ${currentWorkspaceId}
      and run.source = 'gsc'
      and run.status = 'completed'
      and nullif(run.details->>'startDate', '')::date <= ${dataDate}::date
      and nullif(run.details->>'endDate', '')::date >= ${dataDate}::date
    order by run.completed_at desc
    limit 20
  `;
  const completedByLegacyRun = coverageRuns.some((row) => (
    row.details
    && typeof row.details === "object"
    && isGscSyncCoverageComplete(row.details as Record<string, unknown>, dataDate)
  ));
  const dataComplete = coverageByDate.has(dataDate)
    ? coverageByDate.get(dataDate) === true
    : coverageRuns.length
      ? completedByLegacyRun
    : dataDate === dateOnly(site.last_processed_on)
      ? site.last_data_complete !== false
      : dataDate <= baselineThrough;

  const aggregateRows = await sql`
    with daily as (
      select
        lower(regexp_replace(btrim(m.query), '[[:space:]]+', ' ', 'g')) as normalized_query,
        min(regexp_replace(btrim(m.query), '[[:space:]]+', ' ', 'g')) as query,
        m.metric_date,
        sum(m.clicks)::double precision as clicks,
        sum(m.impressions)::double precision as impressions,
        case
          when sum(m.impressions) > 0
            then (sum(m.position * m.impressions) / sum(m.impressions))::double precision
          else avg(m.position)::double precision
        end as position
      from rankcues_gsc_metrics m
      join rankcues_sites s on s.id = m.site_id
      where m.site_id = ${input.siteId}
        and s.workspace_id = ${currentWorkspaceId}
        and m.metric_date >= ${dataDate}::date - ${SEARCH_TERM_HISTORY_DAYS - 1}::integer
        and m.metric_date <= ${dataDate}::date
        and btrim(m.query) <> ''
      group by normalized_query, m.metric_date
    ), ranked as (
      select
        *,
        row_number() over (partition by normalized_query order by metric_date desc) as recency
      from daily
    ), summary as (
      select
        normalized_query,
        min(query) filter (where recency = 1) as query,
        min(metric_date) as first_seen_on,
        max(metric_date) as last_seen_on,
        max(metric_date) filter (where recency = 2) as previous_seen_on,
        count(*)::integer as observed_days,
        max(clicks) filter (where recency = 1)::double precision as last_clicks,
        max(impressions) filter (where recency = 1)::double precision as last_impressions,
        max(position) filter (where recency = 1)::double precision as last_position,
        coalesce(max(clicks) filter (where recency = 2), 0)::double precision as previous_clicks,
        coalesce(max(impressions) filter (where recency = 2), 0)::double precision as previous_impressions,
        coalesce(max(position) filter (where recency = 2), 0)::double precision as previous_position
      from ranked
      group by normalized_query
    ), candidates as (
      select
        summary.normalized_query,
        summary.query,
        coalesce(lifecycle.first_seen_on, summary.first_seen_on) as first_seen_on,
        summary.last_seen_on,
        case
          when ${dataDate === lifecycleDate}
            then coalesce(lifecycle.previous_seen_on, summary.previous_seen_on)
          else summary.previous_seen_on
        end as previous_seen_on,
        case
          when ${dataDate === lifecycleDate}
            then greatest(coalesce(lifecycle.observed_days, 0), summary.observed_days)
          else summary.observed_days
        end::integer as observed_days,
        summary.last_clicks,
        summary.last_impressions,
        summary.last_position,
        summary.previous_clicks,
        summary.previous_impressions,
        summary.previous_position
      from summary
      left join rankcues_search_term_lifecycle lifecycle
        on lifecycle.workspace_id = ${currentWorkspaceId}
        and lifecycle.site_id = ${input.siteId}
        and lifecycle.normalized_query = summary.normalized_query
      where summary.last_seen_on = ${dataDate}::date
        or (
          summary.last_seen_on >= ${baselineThrough}::date
          and ${dataComplete}
          and ${dataDate}::date - summary.last_seen_on >= ${LOST_AFTER_MISSING_DAYS}
          and ${dataDate}::date - summary.last_seen_on <= ${LOST_VISIBLE_THROUGH_MISSING_DAYS}
        )
    ), page_daily_base as (
      select
        lower(regexp_replace(btrim(m.query), '[[:space:]]+', ' ', 'g')) as normalized_query,
        m.metric_date,
        m.page,
        sum(m.clicks)::double precision as clicks,
        sum(m.impressions)::double precision as impressions
      from rankcues_gsc_metrics m
      join candidates c
        on c.normalized_query = lower(regexp_replace(btrim(m.query), '[[:space:]]+', ' ', 'g'))
        and c.last_seen_on = m.metric_date
      join rankcues_sites s on s.id = m.site_id
      where m.site_id = ${input.siteId} and s.workspace_id = ${currentWorkspaceId}
      group by normalized_query, m.metric_date, m.page
    ), page_daily as (
      select
        *,
        row_number() over (
          partition by normalized_query, metric_date
          order by impressions desc, clicks desc, page
        ) as page_rank,
        count(*) over (partition by normalized_query, metric_date)::integer as page_count
      from page_daily_base
    )
    select
      c.*,
      p.page as landing_page,
      coalesce(p.impressions, 0)::double precision as landing_page_impressions,
      coalesce(p.page_count, 0)::integer as page_count
    from candidates c
    left join page_daily p
      on p.normalized_query = c.normalized_query
      and p.metric_date = c.last_seen_on
      and p.page_rank = 1
  ` as unknown as LedgerAggregate[];

  const siteId = String(site.id);
  const siteUrl = String(site.site_url);
  const normalizedSearch = normalizeSearchTerm(input.search || "");
  const validStatus = input.status && (
    input.status === "all" || DAILY_SEARCH_TERM_STATUSES.includes(input.status)
  ) ? input.status : "all";

  const matchingRows = aggregateRows.map((row): DailySearchTermRow => {
    const firstSeenOn = dateOnly(row.first_seen_on);
    const lastSeenOn = dateOnly(row.last_seen_on);
    const previousSeenOn = dateOnly(row.previous_seen_on) || null;
    const observedOnDate = lastSeenOn === dataDate;
    const lastClicks = numeric(row.last_clicks);
    const lastImpressions = numeric(row.last_impressions);
    const lastPosition = numeric(row.last_position);
    const previousClicks = observedOnDate ? numeric(row.previous_clicks) : lastClicks;
    const previousImpressions = observedOnDate ? numeric(row.previous_impressions) : lastImpressions;
    const previousPosition = observedOnDate ? numeric(row.previous_position) : lastPosition;
    const clicks = observedOnDate ? lastClicks : 0;
    const impressions = observedOnDate ? lastImpressions : 0;
    const position = observedOnDate ? lastPosition : 0;
    const gapStartsAfter = observedOnDate ? previousSeenOn : lastSeenOn;
    const gapComplete = gapStartsAfter
      ? hasCompleteDailyCoverage(gapStartsAfter, dataDate, completeCoverageDates)
      : true;
    const status = deriveDailySearchTermStatus({
      asOfDate: dataDate,
      baselineThrough,
      firstSeenOn,
      lastSeenOn,
      previousSeenOn,
      clicks,
      impressions,
      position,
      previousClicks,
      previousImpressions,
      previousPosition,
      dataComplete,
      gapComplete,
    });
    return {
      id: rowId(siteId, String(row.normalized_query), dataDate),
      siteId,
      siteUrl,
      query: String(row.query),
      status,
      firstSeenOn,
      lastSeenOn,
      previousSeenOn,
      observedDays: Math.max(1, Math.trunc(numeric(row.observed_days))),
      clicks,
      impressions,
      ctr: impressions > 0 ? clicks / impressions : 0,
      position,
      previousClicks,
      previousImpressions,
      previousPosition,
      landingPage: row.landing_page ? String(row.landing_page) : null,
      landingPageShare: lastImpressions > 0
        ? Math.min(1, numeric(row.landing_page_impressions) / lastImpressions)
        : 0,
      pageCount: Math.max(0, Math.trunc(numeric(row.page_count))),
    };
  }).filter((row) => row.lastSeenOn === dataDate || row.status === "lost")
    .filter((row) => !normalizedSearch || normalizeSearchTerm(row.query).includes(normalizedSearch));

  const counts = emptyCounts();
  counts.total = matchingRows.length;
  for (const row of matchingRows) counts[row.status] += 1;

  const statusRows = validStatus === "all"
    ? matchingRows
    : matchingRows.filter((row) => row.status === validStatus);
  const statusOrder: Record<DailySearchTermStatus, number> = {
    new: 0,
    returning: 1,
    growing: 2,
    lost: 3,
    active: 4,
    baseline: 5,
  };
  statusRows.sort((left, right) => (
    statusOrder[left.status] - statusOrder[right.status]
    || right.impressions - left.impressions
    || right.clicks - left.clicks
    || left.query.localeCompare(right.query)
  ));

  const total = statusRows.length;
  const pageCount = total ? Math.ceil(total / pageSize) : 0;
  const page = pageCount ? Math.min(requestedPage, pageCount) : 1;
  const start = (page - 1) * pageSize;

  return {
    siteId,
    siteUrl,
    dataDate,
    availableDates,
    baselineThrough,
    lastSyncedAt: isoTimestamp(site.last_synced_at),
    dataComplete,
    rows: statusRows.slice(start, start + pageSize),
    counts,
    page,
    pageSize,
    total,
    pageCount,
  };
}
