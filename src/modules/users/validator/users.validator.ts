import { z } from "zod";

import { ROLE_VALUES } from "../../../config/constants";
import {
  booleanQuerySchema,
  buildPaginatedQuerySchema
} from "../../../common/validators/query.validator";
import { DRIVER_STATUS_VALUES, USER_LIST_SORT_FIELDS } from "../types/users.types";

const trimmedString = (fieldName: string, maxLength: number) =>
  z.string().trim().min(1, `${fieldName} is required`).max(maxLength);

const optionalTrimmedString = (fieldName: string, maxLength: number) =>
  z.string().trim().min(1, `${fieldName} is required`).max(maxLength).optional();

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Email must be a valid email address")
  .max(255);

const phoneSchema = z
  .string()
  .trim()
  .min(1, "Phone is required")
  .max(50, "Phone must be at most 50 characters");

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(72, "Password must be at most 72 characters");

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, {
  message: "Date must be in YYYY-MM-DD format"
});

const createUserBaseFields = {
  fullName: trimmedString("Full name", 150),
  email: emailSchema.optional(),
  phone: phoneSchema.optional(),
  password: passwordSchema
} as const;

const createAdminSchema = z
  .object({
    ...createUserBaseFields,
    role: z.literal("admin"),
    profile: z.null().optional()
  })
  .strict()
  .refine((payload) => payload.email || payload.phone, {
    path: ["email"],
    message: "Either email or phone is required"
  });

const createParentSchema = z
  .object({
    ...createUserBaseFields,
    role: z.literal("parent"),
    profile: z
      .object({
        address: optionalTrimmedString("Address", 500),
        relationType: optionalTrimmedString("Relation type", 50)
      })
      .strict()
  })
  .strict()
  .refine((payload) => payload.email || payload.phone, {
    path: ["email"],
    message: "Either email or phone is required"
  });

const createTeacherSchema = z
  .object({
    ...createUserBaseFields,
    role: z.literal("teacher"),
    profile: z
      .object({
        specialization: optionalTrimmedString("Specialization", 255),
        qualification: optionalTrimmedString("Qualification", 255),
        hireDate: dateSchema.optional()
      })
      .strict()
  })
  .strict()
  .refine((payload) => payload.email || payload.phone, {
    path: ["email"],
    message: "Either email or phone is required"
  });

const createSupervisorSchema = z
  .object({
    ...createUserBaseFields,
    role: z.literal("supervisor"),
    profile: z
      .object({
        department: optionalTrimmedString("Department", 255)
      })
      .strict()
  })
  .strict()
  .refine((payload) => payload.email || payload.phone, {
    path: ["email"],
    message: "Either email or phone is required"
  });

const createDriverSchema = z
  .object({
    ...createUserBaseFields,
    role: z.literal("driver"),
    profile: z
      .object({
        licenseNumber: trimmedString("License number", 100),
        driverStatus: z.enum(DRIVER_STATUS_VALUES).optional().default("active")
      })
      .strict()
  })
  .strict()
  .refine((payload) => payload.email || payload.phone, {
    path: ["email"],
    message: "Either email or phone is required"
  });

export const createUserSchema = z.discriminatedUnion("role", [
  createAdminSchema,
  createParentSchema,
  createTeacherSchema,
  createSupervisorSchema,
  createDriverSchema
]);

const updateProfileSchema = z
  .object({
    address: optionalTrimmedString("Address", 500),
    relationType: optionalTrimmedString("Relation type", 50),
    specialization: optionalTrimmedString("Specialization", 255),
    qualification: optionalTrimmedString("Qualification", 255),
    hireDate: dateSchema.optional(),
    department: optionalTrimmedString("Department", 255),
    licenseNumber: optionalTrimmedString("License number", 100),
    driverStatus: z.enum(DRIVER_STATUS_VALUES).optional()
  })
  .strict()
  .refine(
    (payload) => Object.values(payload).some((value) => value !== undefined),
    {
      message: "At least one profile field is required"
    }
  );

export const updateUserSchema = z
  .object({
    fullName: optionalTrimmedString("Full name", 150),
    email: emailSchema.optional(),
    phone: phoneSchema.optional(),
    profile: updateProfileSchema.optional()
  })
  .strict()
  .refine(
    (payload) =>
      payload.fullName !== undefined ||
      payload.email !== undefined ||
      payload.phone !== undefined ||
      payload.profile !== undefined,
    {
      message: "At least one field is required"
    }
  );

export const updateUserStatusSchema = z
  .object({
    isActive: z.boolean()
  })
  .strict();

export const listUsersQuerySchema = buildPaginatedQuerySchema(
  {
    role: z.enum(ROLE_VALUES).optional(),
    isActive: booleanQuerySchema.optional()
  },
  USER_LIST_SORT_FIELDS,
  {
    sortBy: "createdAt"
  }
);

export const userIdParamsSchema = z.object({
  id: z.string().regex(/^\d+$/, "User id must be a numeric string")
});
