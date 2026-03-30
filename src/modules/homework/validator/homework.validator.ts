import { z } from "zod";

import { buildPaginatedQuerySchema } from "../../../common/validators/query.validator";
import { HOMEWORK_SORT_FIELDS } from "../types/homework.types";

const idSchema = z
  .union([z.string().regex(/^\d+$/), z.number().int().positive()])
  .transform(String);

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, {
  message: "Date must be in YYYY-MM-DD format"
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
    .min(1, "Value is required")
    .max(maxLength, {
      message: `Value must not exceed ${maxLength} characters`
    });

export const homeworkIdParamsSchema = z.object({
  id: idSchema
});

export const homeworkStudentIdParamsSchema = z.object({
  studentId: idSchema
});

export const createHomeworkSchema = z
  .object({
    teacherId: idSchema.optional(),
    classId: idSchema,
    subjectId: idSchema,
    academicYearId: idSchema.optional(),
    semesterId: idSchema.optional(),
    title: requiredTrimmedString(200),
    description: optionalTrimmedString(4000),
    assignedDate: dateSchema,
    dueDate: dateSchema
  })
  .strict()
  .refine((payload) => payload.dueDate >= payload.assignedDate, {
    path: ["dueDate"],
    message: "dueDate must be later than or equal to assignedDate"
  });

export const listHomeworkQuerySchema = buildPaginatedQuerySchema(
  {
    classId: idSchema.optional(),
    subjectId: idSchema.optional(),
    teacherId: idSchema.optional(),
    academicYearId: idSchema.optional(),
    semesterId: idSchema.optional(),
    assignedDate: dateSchema.optional(),
    dueDate: dateSchema.optional(),
    dateFrom: dateSchema.optional(),
    dateTo: dateSchema.optional()
  },
  HOMEWORK_SORT_FIELDS,
  {
    sortBy: "dueDate"
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

export const saveHomeworkSubmissionsSchema = z
  .object({
    records: z
      .array(
        z
          .object({
            studentId: idSchema,
            status: z.enum(["submitted", "not_submitted", "late"]),
            submittedAt: z.union([dateSchema, z.null()]).optional(),
            notes: optionalTrimmedString(2000)
          })
          .strict()
      )
      .min(1, "At least one submission record is required")
  })
  .strict();


