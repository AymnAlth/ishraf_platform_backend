import { z } from "zod";

import { buildPaginatedQuerySchema } from "../../../common/validators/query.validator";
import { ASSESSMENT_LIST_SORT_FIELDS } from "../types/assessments.types";

const idSchema = z
  .union([z.string().regex(/^\d+$/), z.number().int().positive()])
  .transform(String);

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, {
  message: "Date must be in YYYY-MM-DD format"
});

const decimalNumberSchema = z
  .union([
    z.number(),
    z
      .string()
      .regex(/^\d+(\.\d+)?$/)
      .transform(Number)
  ])
  .refine((value) => Number.isFinite(value), {
    message: "Value must be a valid number"
  });

const positiveDecimalSchema = decimalNumberSchema.refine((value) => value > 0, {
  message: "Value must be greater than zero"
});

const nonNegativeDecimalSchema = decimalNumberSchema.refine((value) => value >= 0, {
  message: "Value must be zero or greater"
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

const booleanSchema = z.union([z.boolean(), z.enum(["true", "false"]).transform((value) => value === "true")]);

const hasAtLeastOneField = (payload: Record<string, unknown>): boolean =>
  Object.values(payload).some((value) => value !== undefined);

export const assessmentIdParamsSchema = z.object({
  id: idSchema
});

export const studentAssessmentIdParamsSchema = z.object({
  studentAssessmentId: idSchema
});

export const createAssessmentTypeSchema = z
  .object({
    code: requiredTrimmedString(30),
    name: requiredTrimmedString(100),
    description: optionalTrimmedString(2000),
    isActive: z.boolean().optional()
  })
  .strict();

export const createAssessmentSchema = z
  .object({
    assessmentTypeId: idSchema,
    classId: idSchema,
    subjectId: idSchema,
    teacherId: idSchema.optional(),
    academicYearId: idSchema,
    semesterId: idSchema,
    title: requiredTrimmedString(200),
    description: optionalTrimmedString(2000),
    maxScore: positiveDecimalSchema,
    weight: nonNegativeDecimalSchema.optional(),
    assessmentDate: dateSchema,
    isPublished: z.boolean().optional()
  })
  .strict();

export const listAssessmentsQuerySchema = buildPaginatedQuerySchema(
  {
    assessmentTypeId: idSchema.optional(),
    classId: idSchema.optional(),
    subjectId: idSchema.optional(),
    teacherId: idSchema.optional(),
    academicYearId: idSchema.optional(),
    semesterId: idSchema.optional(),
    assessmentDate: dateSchema.optional(),
    dateFrom: dateSchema.optional(),
    dateTo: dateSchema.optional(),
    isPublished: booleanSchema.optional()
  },
  ASSESSMENT_LIST_SORT_FIELDS,
  {
    sortBy: "assessmentDate"
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

export const saveAssessmentScoresSchema = z
  .object({
    records: z
      .array(
        z
          .object({
            studentId: idSchema,
            score: nonNegativeDecimalSchema,
            remarks: optionalTrimmedString(2000)
          })
          .strict()
      )
      .min(1, {
        message: "At least one record is required"
      })
  })
  .strict();

export const updateStudentAssessmentSchema = z
  .object({
    score: nonNegativeDecimalSchema.optional(),
    remarks: optionalTrimmedString(2000)
  })
  .strict()
  .refine(hasAtLeastOneField, {
    message: "At least one field is required"
  });
