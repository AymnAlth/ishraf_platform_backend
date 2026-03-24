import { z } from "zod";

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

const ensureDateOrder = <T extends { startDate?: string; endDate?: string }>(
  payload: T
): boolean => {
  if (!payload.startDate || !payload.endDate) {
    return true;
  }

  return payload.endDate > payload.startDate;
};

export const entityIdParamsSchema = z.object({
  id: idSchema
});

export const academicYearParamsSchema = z.object({
  academicYearId: idSchema
});

export const createAcademicYearSchema = z
  .object({
    name: nonEmptyString("Name", 50),
    startDate: dateSchema,
    endDate: dateSchema,
    isActive: z.boolean().optional().default(false)
  })
  .strict()
  .refine(ensureDateOrder, {
    path: ["endDate"],
    message: "End date must be later than start date"
  });

export const updateAcademicYearSchema = z
  .object({
    name: nonEmptyString("Name", 50).optional(),
    startDate: dateSchema.optional(),
    endDate: dateSchema.optional(),
    isActive: z.boolean().optional()
  })
  .strict()
  .refine(
    (payload) =>
      payload.name !== undefined ||
      payload.startDate !== undefined ||
      payload.endDate !== undefined ||
      payload.isActive !== undefined,
    {
      message: "At least one field is required"
    }
  )
  .refine(ensureDateOrder, {
    path: ["endDate"],
    message: "End date must be later than start date"
  });

export const createSemesterSchema = z
  .object({
    name: nonEmptyString("Name", 50),
    startDate: dateSchema,
    endDate: dateSchema,
    isActive: z.boolean().optional().default(false)
  })
  .strict()
  .refine(ensureDateOrder, {
    path: ["endDate"],
    message: "End date must be later than start date"
  });

export const updateSemesterSchema = z
  .object({
    name: nonEmptyString("Name", 50).optional(),
    startDate: dateSchema.optional(),
    endDate: dateSchema.optional(),
    isActive: z.boolean().optional()
  })
  .strict()
  .refine(
    (payload) =>
      payload.name !== undefined ||
      payload.startDate !== undefined ||
      payload.endDate !== undefined ||
      payload.isActive !== undefined,
    {
      message: "At least one field is required"
    }
  )
  .refine(ensureDateOrder, {
    path: ["endDate"],
    message: "End date must be later than start date"
  });

export const createGradeLevelSchema = z
  .object({
    name: nonEmptyString("Name", 100),
    levelOrder: z.number().int().positive("Level order must be greater than zero")
  })
  .strict();

export const createClassSchema = z
  .object({
    gradeLevelId: idSchema,
    academicYearId: idSchema,
    className: nonEmptyString("Class name", 50),
    section: nonEmptyString("Section", 50),
    capacity: z.number().int().positive("Capacity must be greater than zero").optional(),
    isActive: z.boolean().optional().default(true)
  })
  .strict();

export const createSubjectSchema = z
  .object({
    name: nonEmptyString("Name", 100),
    gradeLevelId: idSchema,
    code: optionalNonEmptyString("Code", 50),
    isActive: z.boolean().optional().default(true)
  })
  .strict();

export const createTeacherAssignmentSchema = z
  .object({
    teacherId: idSchema,
    classId: idSchema,
    subjectId: idSchema,
    academicYearId: idSchema
  })
  .strict();

export const createSupervisorAssignmentSchema = z
  .object({
    supervisorId: idSchema,
    classId: idSchema,
    academicYearId: idSchema
  }) 
  .strict();
