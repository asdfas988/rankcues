export type KeywordRankingSort = "position" | "impressions" | "clicks";
export type SortDirection = "asc" | "desc";
export type KeywordRankingSegment = "tracked" | "observed" | "top10" | "moving";

type SortableKeywordRanking = {
  keyword: string;
  siteId: string;
  position: number;
  impressions: number;
  clicks: number;
};

type SegmentableKeywordRanking = SortableKeywordRanking & {
  tracked: boolean;
  previousPosition: number;
};

export function parseKeywordRankingSort(value: string | undefined): KeywordRankingSort | null {
  return value === "position" || value === "impressions" || value === "clicks" ? value : null;
}

export function parseSortDirection(value: string | undefined, field: KeywordRankingSort | null): SortDirection {
  if (value === "asc" || value === "desc") return value;
  return field === "position" ? "asc" : "desc";
}

export function parseKeywordRankingSegment(value: string | undefined): KeywordRankingSegment | null {
  return value === "tracked" || value === "observed" || value === "top10" || value === "moving" ? value : null;
}

export function filterKeywordRankings<T extends SegmentableKeywordRanking>(rows: T[], segment: KeywordRankingSegment | null) {
  if (!segment) return rows;
  return rows.filter((row) => {
    if (segment === "tracked") return row.tracked;
    if (segment === "observed") return row.impressions > 0;
    if (segment === "top10") return row.position > 0 && row.position <= 10;
    return row.previousPosition > 0 && row.position > 0 && Math.abs(row.previousPosition - row.position) >= 2;
  });
}

export function sortKeywordRankings<T extends SortableKeywordRanking>(
  rows: T[],
  field: KeywordRankingSort | null,
  direction: SortDirection,
) {
  if (!field) return rows;
  const multiplier = direction === "asc" ? 1 : -1;

  return [...rows].sort((left, right) => {
    if (field === "position") {
      const leftMissing = left.position <= 0;
      const rightMissing = right.position <= 0;
      if (leftMissing !== rightMissing) return leftMissing ? 1 : -1;
    }

    const difference = left[field] - right[field];
    if (difference) return difference * multiplier;
    return left.keyword.localeCompare(right.keyword) || left.siteId.localeCompare(right.siteId);
  });
}
