import { z } from "zod";

import { paginationQuerySchema } from "../../../common/validators/query.validator";
import {
  SCHOOL_ONBOARDING_SHEET_IDS,
  SCHOOL_ONBOARDING_TEMPLATE_VERSION
} from "../school-onboarding.constants";

const idSchema = z
  .union([z.string().regex(/^\d+$/), z.number().int().positive()])
  .transform(String);

const nonEmptyString = (maxLength: number) =>
  z.string().trim().min(1, "Value is required").max(maxLength);

const optionalStringValueSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);

const workbookRowSchema = z
  .object({
    rowNumber: z.number().int().min(1),
    values: z.record(z.string(), optionalStringValueSchema)
  })
  .strict();

const workbookSheetSchema = z
  .object({
    sheetId: z.enum(SCHOOL_ONBOARDING_SHEET_IDS),
    present: z.boolean(),
    headers: z.array(z.string()),
    rows: z.array(workbookRowSchema)
  })
  .strict();

const workbookSheetsShape = Object.fromEntries(
  SCHOOL_ONBOARDING_SHEET_IDS.map((sheetId) => [sheetId, workbookSheetSchema])
) as Record<(typeof SCHOOL_ONBOARDING_SHEET_IDS)[number], typeof workbookSheetSchema>;

export const schoolOnboardingDryRunSchema = z
  .object({
    templateVersion: nonEmptyString(50).default(SCHOOL_ONBOARDING_TEMPLATE_VERSION),
    fileName: nonEmptyString(255),
    fileHash: nonEmptyString(255),
    fileSize: z.number().int().min(0).optional(),
    config: z
      .object({
        activateAfterImport: z.boolean(),
        targetAcademicYearName: z.string().trim().min(1).max(50).optional(),
        targetSemesterName: z.string().trim().min(1).max(50).optional()
      })
      .strict(),
    workbook: z
      .object({
        sheets: z.object(workbookSheetsShape).strict()
      })
      .strict()
  })
  .strict();

export const schoolOnboardingApplySchema = z
  .object({
    dryRunId: idSchema,
    fallbackPassword: z.string().min(8).max(72).optional(),
    confirmActivateContext: z.boolean().optional()
  })
  .strict();

export const schoolOnboardingImportHistoryParamsSchema = z.object({
  importId: idSchema
});

export const schoolOnboardingImportHistoryQuerySchema = z
  .object({
    page: paginationQuerySchema.shape.page,
    limit: paginationQuerySchema.shape.limit
  })
  .strict();

