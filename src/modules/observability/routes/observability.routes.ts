import { Router } from "express";

import { validateRequest } from "../../../common/middlewares/validation.middleware";
import { asyncHandler } from "../../../common/utils/async-handler";
import type { ObservabilityController } from "../controller/observability.controller";
import { observabilityPolicies } from "../policies/observability.policy";
import { observabilityPerformanceSampleQuerySchema } from "../validator/observability.validator";

export const createObservabilityRouter = (controller: ObservabilityController): Router => {
  const router = Router();

  router.get(
    "/performance/summary",
    ...observabilityPolicies.admin,
    asyncHandler((req, res) => controller.getPerformanceSummary(req, res))
  );

  router.get(
    "/performance/requests",
    ...observabilityPolicies.admin,
    validateRequest({ query: observabilityPerformanceSampleQuerySchema }),
    asyncHandler((req, res) => controller.listRequestSamples(req, res))
  );

  router.get(
    "/performance/queries",
    ...observabilityPolicies.admin,
    validateRequest({ query: observabilityPerformanceSampleQuerySchema }),
    asyncHandler((req, res) => controller.listQuerySamples(req, res))
  );

  return router;
};
