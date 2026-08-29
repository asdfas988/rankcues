export type KeywordRankingSort = "position" | "impressions" | "clicks";
export type SortDirection = "asc" | "desc";

type SortableKeywordRanking = {
  keyword: string;
  siteId: string;
  position: number;
  impressions: number;
  clicks: number;
};

export function parseKeywordRankingSort(value: string | undefined): KeywordRankingSort | null {
  return value === "position" || value === "impressions" || value === "clicks" ? value : null;
}

export function parseSortDirection(value: string | undefined, field: KeywordRankingSort | null): SortDirection {
  if (value === "asc" || value === "desc") return value;
  return field === "position" ? "asc" : "desc";
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
