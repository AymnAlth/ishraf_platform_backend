import type { NextFunction, Request, Response } from "express";
import { z, ZodError } from "zod";

import { ValidationError } from "../../../common/errors/validation-error";
import { buildPaginatedQuerySchema } from "../../../common/validators/query.validator";
import {
  getSystemSettingsGroupPatchBodySchema,
  systemSettingGroupSchema
} from "../system-settings.registry";
import type {
  SystemSettingsGroupParamsDto,
  SystemSettingsPatchRequestDto
} from "../dto/system-settings.dto";

const idSchema = z
  .union([z.string().regex(/^\d+$/), z.number().int().positive()])
  .transform(String);

const isoDateTimePattern =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?(?:Z|[+-]\d{2}:\d{2})$/;

const isoDateTimeStringSchema = z.string().trim().min(1).refine(
  (value) => {
    if (!isoDateTimePattern.test(value)) {
      return false;
    }

    return !Number.isNaN(Date.parse(value));
  },
  {
    message: "Value must be a valid ISO datetime"
  }
);

const mapZodIssues = (error: ZodError) =>
  error.issues.map((issue) => ({
    field: issue.path.join("."),
    code: issue.code,
    message: issue.message
  }));

export const systemSettingsGroupParamsSchema = z.object({
  group: systemSettingGroupSchema
});

export const systemSettingsAuditQuerySchema = buildPaginatedQuerySchema(
  {
    group: systemSettingGroupSchema.optional(),
    key: z.string().trim().min(1).max(100).optional(),
    changedByUserId: idSchema.optional(),
    since: isoDateTimeStringSchema.optional(),
    until: isoDateTimeStringSchema.optional()
  },
  ["createdAt"],
  {
    sortBy: "createdAt"
  }
).refine((payload) => !payload.since || !payload.until || payload.until >= payload.since, {
  path: ["until"],
  message: "until must be later than or equal to since"
});

export const validateSystemSettingsPatchBody = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  try {
    const params =
      (req.validated?.params as SystemSettingsGroupParamsDto | undefined) ??
      systemSettingsGroupParamsSchema.parse(req.params);
    const parsedBody = getSystemSettingsGroupPatchBodySchema(params.group).parse(
      req.body
    ) as SystemSettingsPatchRequestDto;

    req.validated = {
      ...req.validated,
      params,
      body: parsedBody
    };
    next();
  } catch (error) {
    if (error instanceof ZodError) {
      next(new ValidationError("Validation failed", mapZodIssues(error)));
      return;
    }

    next(error);
  }
};
