import { z } from "zod";

import { buildPaginatedQuerySchema } from "../../../common/validators/query.validator";
import { ATTENDANCE_STATUS_VALUES } from "../types/attendance.types";
import { ATTENDANCE_SESSION_SORT_FIELDS } from "../types/attendance.types";

const idSchema = z
  .union([z.string().regex(/^\d+$/), z.number().int().positive()])
  .transform(String);

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, {
  message: "Date must be in YYYY-MM-DD format"
});

const positiveIntSchema = z
  .union([z.number().int().positive(), z.string().regex(/^\d+$/).transform(Number)])
  .refine((value) => value > 0, {
    message: "Value must be greater than zero"
  });

const optionalTrimmedString = (maxLength: number) =>
  z
    .union([z.string(), z.null()])
    .transform((value) => (typeof value === "string" ? value.trim() : value))
    .refine((value) => value === null || value.length <= maxLength, {
      message: `Value must not exceed ${maxLength} characters`
    })
    .optional();

const hasAtLeastOneField = (payload: Record<string, unknown>): boolean =>
  Object.values(payload).some((value) => value !== undefined);

export const attendanceSessionIdParamsSchema = z.object({
  id: idSchema
});

export const attendanceRecordIdParamsSchema = z.object({
  attendanceId: idSchema
});

export const createAttendanceSessionSchema = z
  .object({
    classId: idSchema,
    subjectId: idSchema,
    academicYearId: idSchema,
    semesterId: idSchema,
    sessionDate: dateSchema,
    periodNo: positiveIntSchema,
    title: optionalTrimmedString(200),
    notes: optionalTrimmedString(1000),
    teacherId: idSchema.optional()
  })
  .strict();

export const listAttendanceSessionsQuerySchema = buildPaginatedQuerySchema(
  {
    classId: idSchema.optional(),
    subjectId: idSchema.optional(),
    teacherId: idSchema.optional(),
    academicYearId: idSchema.optional(),
    semesterId: idSchema.optional(),
    sessionDate: dateSchema.optional(),
    dateFrom: dateSchema.optional(),
    dateTo: dateSchema.optional()
  },
  ATTENDANCE_SESSION_SORT_FIELDS,
  {
    sortBy: "sessionDate"
  }
)
  .refine(
    (payload) =>
      !payload.dateFrom || !payload.dateTo || payload.dateTo >= payload.dateFrom,
    {
      path: ["dateTo"],
      message: "dateTo must be later than or equal to dateFrom"
    }
  );

export const saveAttendanceRecordsSchema = z
  .object({
    records: z.array(
      z
        .object({
          studentId: idSchema,
          status: z.enum(ATTENDANCE_STATUS_VALUES),
          notes: optionalTrimmedString(1000)
        })
        .strict()
    )
  })
  .strict();

export const updateAttendanceRecordSchema = z
  .object({
    status: z.enum(ATTENDANCE_STATUS_VALUES).optional(),
    notes: optionalTrimmedString(1000)
  })
  .strict()
  .refine(hasAtLeastOneField, {
    message: "At least one field is required"
  });
