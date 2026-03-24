import { Router } from "express";

import { validateRequest } from "../../../common/middlewares/validation.middleware";
import { asyncHandler } from "../../../common/utils/async-handler";
import type { BehaviorController } from "../controller/behavior.controller";
import { behaviorPolicies } from "../policies/behavior.policy";
import {
  behaviorRecordIdParamsSchema,
  behaviorStudentIdParamsSchema,
  createBehaviorCategorySchema,
  createBehaviorRecordSchema,
  listBehaviorRecordsQuerySchema,
  updateBehaviorRecordSchema
} from "../validator/behavior.validator";

export const createBehaviorRouter = (controller: BehaviorController): Router => {
  const router = Router();

  router.post(
    "/categories",
    ...behaviorPolicies.manageCategories,
    validateRequest({ body: createBehaviorCategorySchema }),
    asyncHandler((req, res) => controller.createCategory(req, res))
  );

  router.get(
    "/categories",
    ...behaviorPolicies.readCategories,
    asyncHandler((req, res) => controller.listCategories(req, res))
  );

  router.post(
    "/records",
    ...behaviorPolicies.manageRecords,
    validateRequest({ body: createBehaviorRecordSchema }),
    asyncHandler((req, res) => controller.createRecord(req, res))
  );

  router.get(
    "/records",
    ...behaviorPolicies.manageRecords,
    validateRequest({ query: listBehaviorRecordsQuerySchema }),
    asyncHandler((req, res) => controller.listRecords(req, res))
  );

  router.get(
    "/records/:id",
    ...behaviorPolicies.manageRecords,
    validateRequest({ params: behaviorRecordIdParamsSchema }),
    asyncHandler((req, res) => controller.getRecordById(req, res))
  );

  router.patch(
    "/records/:id",
    ...behaviorPolicies.manageRecords,
    validateRequest({
      params: behaviorRecordIdParamsSchema,
      body: updateBehaviorRecordSchema
    }),
    asyncHandler((req, res) => controller.updateRecord(req, res))
  );

  router.get(
    "/students/:studentId/records",
    ...behaviorPolicies.manageRecords,
    validateRequest({ params: behaviorStudentIdParamsSchema }),
    asyncHandler((req, res) => controller.listStudentRecords(req, res))
  );

  return router;
};
