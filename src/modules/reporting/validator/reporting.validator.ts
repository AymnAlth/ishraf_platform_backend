import { z } from "zod";

const idSchema = z
  .union([z.string().regex(/^\d+$/), z.number().int().positive()])
  .transform(String);

export const studentIdParamsSchema = z.object({
  studentId: idSchema
});
