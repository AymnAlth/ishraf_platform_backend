import { Router } from "express";

import { validateRequest } from "../../../common/middlewares/validation.middleware";
import { asyncHandler } from "../../../common/utils/async-handler";
import type { AssessmentsController } from "../controller/assessments.controller";
import { assessmentsPolicies } from "../policies/assessments.policy";
import {
  assessmentIdParamsSchema,
  createAssessmentSchema,
  createAssessmentTypeSchema,
  listAssessmentsQuerySchema,
  saveAssessmentScoresSchema,
  studentAssessmentIdParamsSchema,
  updateStudentAssessmentSchema
} from "../validator/assessments.validator";

export const createAssessmentsRouter = (controller: AssessmentsController): Router => {
  const router = Router();

  router.post(
    "/types",
    ...assessmentsPolicies.manageTypes,
    validateRequest({ body: createAssessmentTypeSchema }),
    asyncHandler((req, res) => controller.createType(req, res))
  );

  router.get(
    "/types",
    ...assessmentsPolicies.readTypes,
    asyncHandler((req, res) => controller.listTypes(req, res))
  );

  router.post(
    "/",
    ...assessmentsPolicies.manageAssessments,
    validateRequest({ body: createAssessmentSchema }),
    asyncHandler((req, res) => controller.create(req, res))
  );

  router.get(
    "/",
    ...assessmentsPolicies.manageAssessments,
    validateRequest({ query: listAssessmentsQuerySchema }),
    asyncHandler((req, res) => controller.list(req, res))
  );

  router.get(
    "/:id",
    ...assessmentsPolicies.manageAssessments,
    validateRequest({ params: assessmentIdParamsSchema }),
    asyncHandler((req, res) => controller.getById(req, res))
  );

  router.get(
    "/:id/scores",
    ...assessmentsPolicies.manageAssessments,
    validateRequest({ params: assessmentIdParamsSchema }),
    asyncHandler((req, res) => controller.getScores(req, res))
  );

  router.put(
    "/:id/scores",
    ...assessmentsPolicies.manageAssessments,
    validateRequest({
      params: assessmentIdParamsSchema,
      body: saveAssessmentScoresSchema
    }),
    asyncHandler((req, res) => controller.saveScores(req, res))
  );

  router.patch(
    "/scores/:studentAssessmentId",
    ...assessmentsPolicies.manageAssessments,
    validateRequest({
      params: studentAssessmentIdParamsSchema,
      body: updateStudentAssessmentSchema
    }),
    asyncHandler((req, res) => controller.updateScore(req, res))
  );

  return router;
};
