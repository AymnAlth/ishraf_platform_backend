import { z } from "zod";

import type { SortOrder } from "../types/pagination.types";
import { DEFAULT_LIMIT, DEFAULT_PAGE, MAX_LIMIT } from "../utils/pagination.util";

export const sortOrderSchema = z.enum(["asc", "desc"]);

export const booleanQuerySchema = z.union([
  z.boolean(),
  z.enum(["true", "false"]).transform((value) => value === "true")
]);

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(DEFAULT_PAGE),
  limit: z.coerce.number().int().min(1).max(MAX_LIMIT).default(DEFAULT_LIMIT)
});

interface PaginatedQuerySchemaOptions<SortBy extends readonly [string, ...string[]]> {
  sortBy: SortBy[number];
  sortOrder?: SortOrder;
}

export const buildPaginatedQuerySchema = <
  Shape extends z.ZodRawShape,
  SortBy extends readonly [string, ...string[]]
>(
  shape: Shape,
  sortableFields: SortBy,
  defaults: PaginatedQuerySchemaOptions<SortBy>
) =>
  z
    .object({
      ...shape,
      page: paginationQuerySchema.shape.page,
      limit: paginationQuerySchema.shape.limit,
      sortBy: z.enum(sortableFields).default(defaults.sortBy),
      sortOrder: sortOrderSchema.default(defaults.sortOrder ?? "desc")
    })
    .strict();
