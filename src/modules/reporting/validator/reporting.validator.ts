import { z } from "zod";

const idSchema = z
  .union([z.string().regex(/^\d+$/), z.number().int().positive()])
  .transform(String);

export const studentIdParamsSchema = z.object({
  studentId: idSchema
});

export const parentPreviewParamsSchema = z.object({
  parentUserId: idSchema
});

export const parentPreviewStudentParamsSchema = z.object({
  parentUserId: idSchema,
  studentId: idSchema
});

export const teacherPreviewParamsSchema = z.object({
  teacherUserId: idSchema
});

export const supervisorPreviewParamsSchema = z.object({
  supervisorUserId: idSchema
});
