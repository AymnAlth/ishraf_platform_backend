import { Router } from "express";

import { validateRequest } from "../../../common/middlewares/validation.middleware";
import { asyncHandler } from "../../../common/utils/async-handler";
import type { SystemSettingsController } from "../controller/system-settings.controller";
import { systemSettingsPolicies } from "../policies/system-settings.policy";
import {
  systemSettingsAuditQuerySchema,
  systemSettingsGroupParamsSchema,
  validateSystemSettingsPatchBody
} from "../validator/system-settings.validator";

export const createSystemSettingsRouter = (
  controller: SystemSettingsController
): Router => {
  const router = Router();

  router.get(
    "/",
    ...systemSettingsPolicies.admin,
    asyncHandler((req, res) => controller.listSettings(req, res))
  );

  router.get(
    "/audit",
    ...systemSettingsPolicies.admin,
    validateRequest({ query: systemSettingsAuditQuerySchema }),
    asyncHandler((req, res) => controller.listAuditLogs(req, res))
  );

  router.get(
    "/integrations/status",
    ...systemSettingsPolicies.admin,
    asyncHandler((req, res) => controller.getIntegrationsStatus(req, res))
  );

  router.get(
    "/:group",
    ...systemSettingsPolicies.admin,
    validateRequest({ params: systemSettingsGroupParamsSchema }),
    asyncHandler((req, res) => controller.getSettingsGroup(req, res))
  );

  router.patch(
    "/:group",
    ...systemSettingsPolicies.admin,
    validateRequest({ params: systemSettingsGroupParamsSchema }),
    validateSystemSettingsPatchBody,
    asyncHandler((req, res) => controller.updateSettingsGroup(req, res))
  );

  return router;
};
