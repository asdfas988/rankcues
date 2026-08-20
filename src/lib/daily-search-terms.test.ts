import { describe, expect, it } from "vitest";
import {
  deriveDailySearchTermStatus,
  hasCompleteDailyCoverage,
  isGscSyncCoverageComplete,
  isDailySearchTermGrowing,
  normalizeSearchTerm,
  type DailySearchTermStatusSignals,
} from "./daily-search-terms";

function signals(
  overrides: Partial<DailySearchTermStatusSignals> = {},
): DailySearchTermStatusSignals {
  return {
    asOfDate: "2026-08-19",
    baselineThrough: "2026-08-10",
    firstSeenOn: "2026-08-01",
    lastSeenOn: "2026-08-19",
    previousSeenOn: "2026-08-18",
    clicks: 4,
    impressions: 40,
    position: 8,
    previousClicks: 4,
    previousImpressions: 40,
    previousPosition: 8,
    ...overrides,
  };
}

describe("normalizeSearchTerm", () => {
  it("collapses Unicode whitespace, trims, and ignores case", () => {
    expect(normalizeSearchTerm("  DAILY\tSearch\n词  ")).toBe("daily search 词");
  });
});

describe("deriveDailySearchTermStatus", () => {
  it("marks all observations through the initial cutoff as baseline", () => {
    expect(deriveDailySearchTermStatus(signals({
      asOfDate: "2026-08-10",
      lastSeenOn: "2026-08-10",
      previousSeenOn: null,
    }))).toBe("baseline");
  });

  it("marks the first post-baseline observation as new", () => {
    expect(deriveDailySearchTermStatus(signals({
      asOfDate: "2026-08-11",
      firstSeenOn: "2026-08-11",
      lastSeenOn: "2026-08-11",
      previousSeenOn: null,
    }))).toBe("new");
  });

  it("requires seven complete missing days before a term is returning", () => {
    expect(deriveDailySearchTermStatus(signals({
      previousSeenOn: "2026-08-11",
    }))).toBe("returning");
    expect(deriveDailySearchTermStatus(signals({
      previousSeenOn: "2026-08-12",
    }))).toBe("active");
  });

  it("marks a term lost on its seventh consecutive missing day", () => {
    expect(deriveDailySearchTermStatus(signals({
      asOfDate: "2026-08-17",
      lastSeenOn: "2026-08-10",
      previousSeenOn: "2026-08-09",
      clicks: 0,
      impressions: 0,
      position: 0,
    }))).toBe("lost");
    expect(deriveDailySearchTermStatus(signals({
      asOfDate: "2026-08-16",
      lastSeenOn: "2026-08-10",
      previousSeenOn: "2026-08-09",
      clicks: 0,
      impressions: 0,
      position: 0,
    }))).toBe("active");
  });

  it("requires complete coverage for every day in a lost or returning gap", () => {
    expect(deriveDailySearchTermStatus(signals({
      asOfDate: "2026-08-17",
      lastSeenOn: "2026-08-10",
      gapComplete: false,
    }))).toBe("active");
    expect(deriveDailySearchTermStatus(signals({
      previousSeenOn: "2026-08-11",
      gapComplete: false,
    }))).toBe("active");
  });

  it("does not turn stale pre-baseline history into a lost alert", () => {
    expect(deriveDailySearchTermStatus(signals({
      lastSeenOn: "2026-08-09",
      previousSeenOn: "2026-08-08",
      clicks: 0,
      impressions: 0,
      position: 0,
    }))).toBe("baseline");
  });

  it("suppresses all movement transitions when the daily GSC result was truncated", () => {
    expect(deriveDailySearchTermStatus(signals({
      lastSeenOn: "2026-08-10",
      previousSeenOn: "2026-08-09",
      dataComplete: false,
    }))).toBe("active");
    expect(deriveDailySearchTermStatus(signals({
      firstSeenOn: "2026-08-19",
      previousSeenOn: null,
      dataComplete: false,
    }))).toBe("active");
    expect(deriveDailySearchTermStatus(signals({
      previousSeenOn: "2026-08-11",
      dataComplete: false,
    }))).toBe("active");
    expect(deriveDailySearchTermStatus(signals({
      clicks: 20,
      impressions: 200,
      position: 3,
      previousClicks: 1,
      previousImpressions: 10,
      previousPosition: 12,
      dataComplete: false,
    }))).toBe("active");
  });

  it("reconstructs an older date from its as-of facts, without a current-status input", () => {
    const historicalSignals = signals({
      asOfDate: "2026-08-10",
      lastSeenOn: "2026-08-10",
      previousSeenOn: "2026-08-09",
    });
    expect(deriveDailySearchTermStatus(historicalSignals)).toBe("baseline");
  });

  it("only uses consecutive observations for growing status", () => {
    const growth = {
      clicks: 4,
      impressions: 30,
      position: 7,
      previousClicks: 1,
      previousImpressions: 10,
      previousPosition: 12,
    };
    expect(deriveDailySearchTermStatus(signals(growth))).toBe("growing");
    expect(deriveDailySearchTermStatus(signals({
      ...growth,
      previousSeenOn: "2026-08-17",
    }))).toBe("active");
  });
});

describe("isDailySearchTermGrowing", () => {
  it("requires both relative and absolute volume growth", () => {
    expect(isDailySearchTermGrowing({
      clicks: 11,
      previousClicks: 10,
      impressions: 109,
      previousImpressions: 100,
      position: 10,
      previousPosition: 10,
    })).toBe(false);
    expect(isDailySearchTermGrowing({
      clicks: 12,
      previousClicks: 10,
      impressions: 125,
      previousImpressions: 100,
      position: 10,
      previousPosition: 10,
    })).toBe(true);
  });

  it("recognizes a material position improvement with enough impressions", () => {
    expect(isDailySearchTermGrowing({
      clicks: 0,
      previousClicks: 0,
      impressions: 10,
      previousImpressions: 10,
      position: 7,
      previousPosition: 10,
    })).toBe(true);
  });
});

describe("hasCompleteDailyCoverage", () => {
  it("checks every date after the last observation through the selected date", () => {
    const completeDates = new Set([
      "2026-08-11",
      "2026-08-12",
      "2026-08-13",
      "2026-08-14",
      "2026-08-15",
      "2026-08-16",
      "2026-08-17",
    ]);
    expect(hasCompleteDailyCoverage("2026-08-10", "2026-08-17", completeDates)).toBe(true);
    completeDates.delete("2026-08-14");
    expect(hasCompleteDailyCoverage("2026-08-10", "2026-08-17", completeDates)).toBe(false);
  });
});

describe("isGscSyncCoverageComplete", () => {
  it("uses the daily snapshot only for the run end date", () => {
    const details = {
      startDate: "2026-08-01",
      endDate: "2026-08-19",
      historyTruncated: true,
      dailyTruncated: false,
      truncated: false,
    };
    expect(isGscSyncCoverageComplete(details, "2026-08-19")).toBe(true);
    expect(isGscSyncCoverageComplete(details, "2026-08-18")).toBe(false);
  });

  it("treats every covered date as complete for an untruncated history run", () => {
    expect(isGscSyncCoverageComplete({
      startDate: "2026-08-01",
      endDate: "2026-08-19",
      historyTruncated: false,
      dailyTruncated: false,
    }, "2026-08-12")).toBe(true);
  });

  it("falls back conservatively for legacy truncated runs", () => {
    expect(isGscSyncCoverageComplete({
      startDate: "2026-08-01",
      endDate: "2026-08-19",
      truncated: true,
    }, "2026-08-19")).toBe(false);
  });
});
