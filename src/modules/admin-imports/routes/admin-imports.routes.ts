import { Router } from "express";

import { validateRequest } from "../../../common/middlewares/validation.middleware";
import { asyncHandler } from "../../../common/utils/async-handler";
import type { AdminImportsController } from "../controller/admin-imports.controller";
import { adminImportsPolicies } from "../policies/admin-imports.policy";
import {
  schoolOnboardingApplySchema,
  schoolOnboardingDryRunSchema,
  schoolOnboardingImportHistoryParamsSchema,
  schoolOnboardingImportHistoryQuerySchema
} from "../validator/admin-imports.validator";

export const createAdminImportsRouter = (
  controller: AdminImportsController
): Router => {
  const router = Router();

  router.post(
    "/school-onboarding/dry-run",
    ...adminImportsPolicies.schoolOnboarding,
    validateRequest({ body: schoolOnboardingDryRunSchema }),
    asyncHandler((req, res) => controller.runSchoolOnboardingDryRun(req, res))
  );

  router.post(
    "/school-onboarding/apply",
    ...adminImportsPolicies.schoolOnboarding,
    validateRequest({ body: schoolOnboardingApplySchema }),
    asyncHandler((req, res) => controller.applySchoolOnboardingImport(req, res))
  );

  router.get(
    "/school-onboarding/history",
    ...adminImportsPolicies.schoolOnboarding,
    validateRequest({ query: schoolOnboardingImportHistoryQuerySchema }),
    asyncHandler((req, res) => controller.listSchoolOnboardingImportHistory(req, res))
  );

  router.get(
    "/school-onboarding/history/:importId",
    ...adminImportsPolicies.schoolOnboarding,
    validateRequest({ params: schoolOnboardingImportHistoryParamsSchema }),
    asyncHandler((req, res) => controller.getSchoolOnboardingImportHistoryDetail(req, res))
  );

  return router;
};
