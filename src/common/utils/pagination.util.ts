import type {
  PaginatedData,
  PaginationMeta,
  PaginationWindow,
  SortColumnMap,
  SortOrder
} from "../types/pagination.types";

export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;

const toColumnList = (columns: string | readonly string[]): readonly string[] =>
  typeof columns === "string" ? [columns] : columns;

export const buildPaginationWindow = (
  page: number = DEFAULT_PAGE,
  limit: number = DEFAULT_LIMIT
): PaginationWindow => ({
  page,
  limit,
  offset: (page - 1) * limit
});

export const buildPaginationMeta = (
  page: number,
  limit: number,
  totalItems: number
): PaginationMeta => {
  const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / limit);

  return {
    page,
    limit,
    totalItems,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1 && totalItems > 0
  };
};

export const toPaginatedData = <T>(
  items: T[],
  page: number,
  limit: number,
  totalItems: number
): PaginatedData<T> => ({
  items,
  pagination: buildPaginationMeta(page, limit, totalItems)
});

export const buildOrderByClause = <SortBy extends string>(
  sortColumns: SortColumnMap<SortBy>,
  sortBy: SortBy,
  sortOrder: SortOrder,
  tieBreakers: readonly string[] = []
): string => {
  const direction = sortOrder.toUpperCase();
  const selectedColumns = toColumnList(sortColumns[sortBy]);
  const uniqueColumns = [
    ...selectedColumns,
    ...tieBreakers.filter((column) => !selectedColumns.includes(column))
  ];

  return uniqueColumns.map((column) => `${column} ${direction}`).join(", ");
};

export const buildLimitOffsetClause = (startIndex: number): string =>
  `LIMIT $${startIndex} OFFSET $${startIndex + 1}`;
