import { z } from "zod";

import { buildPaginatedQuerySchema } from "../../../common/validators/query.validator";
import { BEHAVIOR_RECORD_SORT_FIELDS } from "../types/behavior.types";

const idSchema = z
  .union([z.string().regex(/^\d+$/), z.number().int().positive()])
  .transform(String);

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, {
  message: "Date must be in YYYY-MM-DD format"
});

const severitySchema = z
  .union([z.number().int(), z.string().regex(/^\d+$/).transform(Number)])
  .refine((value) => value >= 1 && value <= 5, {
    message: "Severity must be between 1 and 5"
  });

const optionalTrimmedString = (maxLength: number) =>
  z
    .union([z.string(), z.null()])
    .transform((value) => (typeof value === "string" ? value.trim() : value))
    .refine((value) => value === null || value.length <= maxLength, {
      message: `Value must not exceed ${maxLength} characters`
    })
    .optional();

const requiredTrimmedString = (maxLength: number) =>
  z
    .string()
    .trim()
    .min(1, {
      message: "Value is required"
    })
    .max(maxLength, {
      message: `Value must not exceed ${maxLength} characters`
    });

const hasAtLeastOneField = (payload: Record<string, unknown>): boolean =>
  Object.values(payload).some((value) => value !== undefined);

export const behaviorRecordIdParamsSchema = z.object({
  id: idSchema
});

export const behaviorStudentIdParamsSchema = z.object({
  studentId: idSchema
});

export const createBehaviorCategorySchema = z
  .object({
    code: requiredTrimmedString(30),
    name: requiredTrimmedString(100),
    behaviorType: z.enum(["positive", "negative"]),
    defaultSeverity: severitySchema,
    isActive: z.boolean().optional()
  })
  .strict();

export const createBehaviorRecordSchema = z
  .object({
    studentId: idSchema,
    behaviorCategoryId: idSchema,
    academicYearId: idSchema,
    semesterId: idSchema,
    description: optionalTrimmedString(2000),
    severity: severitySchema.optional(),
    behaviorDate: dateSchema,
    teacherId: idSchema.optional(),
    supervisorId: idSchema.optional()
  })
  .strict();

export const listBehaviorRecordsQuerySchema = buildPaginatedQuerySchema(
  {
    studentId: idSchema.optional(),
    behaviorCategoryId: idSchema.optional(),
    behaviorType: z.enum(["positive", "negative"]).optional(),
    academicYearId: idSchema.optional(),
    semesterId: idSchema.optional(),
    teacherId: idSchema.optional(),
    supervisorId: idSchema.optional(),
    behaviorDate: dateSchema.optional(),
    dateFrom: dateSchema.optional(),
    dateTo: dateSchema.optional()
  },
  BEHAVIOR_RECORD_SORT_FIELDS,
  {
    sortBy: "behaviorDate"
  }
)
  .strict()
  .refine(
    (payload) =>
      !payload.dateFrom || !payload.dateTo || payload.dateTo >= payload.dateFrom,
    {
      path: ["dateTo"],
      message: "dateTo must be later than or equal to dateFrom"
    }
  );

export const updateBehaviorRecordSchema = z
  .object({
    behaviorCategoryId: idSchema.optional(),
    academicYearId: idSchema.optional(),
    semesterId: idSchema.optional(),
    description: optionalTrimmedString(2000),
    severity: severitySchema.optional(),
    behaviorDate: dateSchema.optional()
  })
  .strict()
  .refine(hasAtLeastOneField, {
    message: "At least one field is required"
  });
