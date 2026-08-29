import { describe, expect, it } from "vitest";
import { filterKeywordRankings, parseKeywordRankingSegment, parseKeywordRankingSort, parseSortDirection, sortKeywordRankings } from "./keyword-ranking";

const rows = [
  { keyword: "waiting", siteId: "a", position: 0, previousPosition: 9, impressions: 0, clicks: 0, tracked: true },
  { keyword: "second", siteId: "a", position: 8, previousPosition: 11, impressions: 120, clicks: 4, tracked: false },
  { keyword: "first", siteId: "a", position: 2, previousPosition: 3, impressions: 40, clicks: 9, tracked: true },
];

describe("keyword ranking sorting", () => {
  it("uses metric-specific default directions", () => {
    expect(parseSortDirection(undefined, parseKeywordRankingSort("position"))).toBe("asc");
    expect(parseSortDirection(undefined, parseKeywordRankingSort("impressions"))).toBe("desc");
  });

  it("sorts impressions and clicks in either direction", () => {
    expect(sortKeywordRankings(rows, "impressions", "desc").map((row) => row.keyword)).toEqual(["second", "first", "waiting"]);
    expect(sortKeywordRankings(rows, "clicks", "asc").map((row) => row.keyword)).toEqual(["waiting", "second", "first"]);
  });

  it("keeps rankings without GSC data after observed rankings", () => {
    expect(sortKeywordRankings(rows, "position", "asc").map((row) => row.keyword)).toEqual(["first", "second", "waiting"]);
    expect(sortKeywordRankings(rows, "position", "desc").map((row) => row.keyword)).toEqual(["second", "first", "waiting"]);
  });

  it("filters each metric-card segment with the same rules used by its count", () => {
    expect(filterKeywordRankings(rows, "tracked").map((row) => row.keyword)).toEqual(["waiting", "first"]);
    expect(filterKeywordRankings(rows, "observed").map((row) => row.keyword)).toEqual(["second", "first"]);
    expect(filterKeywordRankings(rows, "top10").map((row) => row.keyword)).toEqual(["second", "first"]);
    expect(filterKeywordRankings(rows, "moving").map((row) => row.keyword)).toEqual(["second"]);
  });

  it("rejects unknown metric-card segments", () => {
    expect(parseKeywordRankingSegment("moving")).toBe("moving");
    expect(parseKeywordRankingSegment("unknown")).toBeNull();
  });
});
