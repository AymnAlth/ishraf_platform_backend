export type SortOrder = "asc" | "desc";

export interface PaginationQuery {
  page: number;
  limit: number;
}

export interface SortQuery<SortBy extends string = string> {
  sortBy: SortBy;
  sortOrder: SortOrder;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PaginatedData<T> {
  items: T[];
  pagination: PaginationMeta;
}

export interface PaginatedQueryResult<T> {
  rows: T[];
  totalItems: number;
}

export interface PaginationWindow {
  page: number;
  limit: number;
  offset: number;
}

export type SortColumnMap<SortBy extends string> = Record<
  SortBy,
  string | readonly string[]
>;
