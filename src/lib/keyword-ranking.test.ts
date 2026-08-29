import { describe, expect, it } from "vitest";
import { parseKeywordRankingSort, parseSortDirection, sortKeywordRankings } from "./keyword-ranking";

const rows = [
  { keyword: "waiting", siteId: "a", position: 0, impressions: 0, clicks: 0 },
  { keyword: "second", siteId: "a", position: 8, impressions: 120, clicks: 4 },
  { keyword: "first", siteId: "a", position: 2, impressions: 40, clicks: 9 },
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
});
