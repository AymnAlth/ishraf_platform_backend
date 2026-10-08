import { z } from "zod";

const blankStringToUndefined = (value: unknown): unknown => {
  if (typeof value !== "string") {
    return value;
  }

  return value.trim().length === 0 ? undefined : value;
};

const booleanQuerySchema = z
  .preprocess(blankStringToUndefined, z.union([z.boolean(), z.enum(["true", "false"])]).optional())
  .transform((value) => (typeof value === "boolean" ? value : value === "true"));

export const observabilityPerformanceSampleQuerySchema = z.object({
  route: z.preprocess(blankStringToUndefined, z.string().trim().min(1).max(200).optional()),
  slowOnly: booleanQuerySchema.default(false),
  limit: z.coerce.number().int().min(1).max(100).default(20)
});
