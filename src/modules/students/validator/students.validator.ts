import { z } from "zod";

import { buildPaginatedQuerySchema } from "../../../common/validators/query.validator";
import {
  STUDENT_LIST_SORT_FIELDS,
  STUDENT_GENDER_VALUES,
  STUDENT_STATUS_VALUES
} from "../types/students.types";

const idSchema = z
  .union([z.string().regex(/^\d+$/), z.number().int().positive()])
  .transform(String);

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, {
  message: "Date must be in YYYY-MM-DD format"
});

const nonEmptyString = (fieldName: string, maxLength: number) =>
  z.string().trim().min(1, `${fieldName} is required`).max(maxLength);

const optionalNonEmptyString = (fieldName: string, maxLength: number) =>
  z.string().trim().min(1, `${fieldName} is required`).max(maxLength).optional();

export const studentIdParamsSchema = z.object({
  id: idSchema
});

export const studentParentParamsSchema = z.object({
  studentId: idSchema,
  parentId: idSchema
});

export const listStudentsQuerySchema = buildPaginatedQuerySchema(
  {
    classId: idSchema.optional(),
    academicYearId: idSchema.optional(),
    status: z.enum(STUDENT_STATUS_VALUES).optional(),
    gender: z.enum(STUDENT_GENDER_VALUES).optional()
  },
  STUDENT_LIST_SORT_FIELDS,
  {
    sortBy: "createdAt"
  }
);

export const createStudentSchema = z
  .object({
    academicNo: nonEmptyString("Academic number", 50),
    fullName: nonEmptyString("Full name", 150),
    dateOfBirth: dateSchema,
    gender: z.enum(STUDENT_GENDER_VALUES),
    classId: idSchema,
    status: z.enum(STUDENT_STATUS_VALUES).optional().default("active"),
    enrollmentDate: dateSchema.optional()
  })
  .strict();

export const updateStudentSchema = z
  .object({
    academicNo: optionalNonEmptyString("Academic number", 50),
    fullName: optionalNonEmptyString("Full name", 150),
    dateOfBirth: dateSchema.optional(),
    gender: z.enum(STUDENT_GENDER_VALUES).optional(),
    status: z.enum(STUDENT_STATUS_VALUES).optional()
  })
  .strict()
  .refine(
    (payload) =>
      payload.academicNo !== undefined ||
      payload.fullName !== undefined ||
      payload.dateOfBirth !== undefined ||
      payload.gender !== undefined ||
      payload.status !== undefined,
    {
      message: "At least one field is required"
    }
  );

export const linkStudentParentSchema = z
  .object({
    parentId: idSchema,
    relationType: nonEmptyString("Relation type", 50),
    isPrimary: z.boolean().optional().default(false)
  })
  .strict();

export const promoteStudentSchema = z
  .object({
    toClassId: idSchema,
    academicYearId: idSchema,
    notes: z.string().trim().min(1, "Notes are required").optional()
  })
  .strict();
