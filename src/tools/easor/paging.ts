/** The paging fields of a list result. */
export interface PageInfo {
  totalCount?: number;
  offset: number;
  hasMore: boolean;
  nextOffset?: number;
}

/**
 * Describes a page of results.
 * @param offset - The offset of the page.
 * @param count - How many items the page has.
 * @param totalCount - How many items match in total, if the API told.
 */
export function pageInfo(offset: number, count: number, totalCount: number | undefined): PageInfo {
  const hasMore = totalCount !== undefined ? offset + count < totalCount : false;
  return { totalCount, offset, hasMore, nextOffset: hasMore ? offset + count : undefined };
}
