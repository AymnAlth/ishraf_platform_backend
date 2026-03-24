import { Router } from "express";

import { validateRequest } from "../../../common/middlewares/validation.middleware";
import { asyncHandler } from "../../../common/utils/async-handler";
import type { HomeworkController } from "../controller/homework.controller";
import { homeworkPolicies } from "../policies/homework.policy";
import {
  createHomeworkSchema,
  homeworkIdParamsSchema,
  homeworkStudentIdParamsSchema,
  listHomeworkQuerySchema,
  saveHomeworkSubmissionsSchema
} from "../validator/homework.validator";

export const createHomeworkRouter = (controller: HomeworkController): Router => {
  const router = Router();

  router.post(
    "/",
    ...homeworkPolicies.manageHomework,
    validateRequest({ body: createHomeworkSchema }),
    asyncHandler((req, res) => controller.create(req, res))
  );

  router.get(
    "/",
    ...homeworkPolicies.readHomework,
    validateRequest({ query: listHomeworkQuerySchema }),
    asyncHandler((req, res) => controller.list(req, res))
  );

  router.get(
    "/students/:studentId",
    ...homeworkPolicies.studentHomework,
    validateRequest({ params: homeworkStudentIdParamsSchema }),
    asyncHandler((req, res) => controller.listStudentHomework(req, res))
  );

  router.get(
    "/:id",
    ...homeworkPolicies.readHomework,
    validateRequest({ params: homeworkIdParamsSchema }),
    asyncHandler((req, res) => controller.getById(req, res))
  );

  router.put(
    "/:id/submissions",
    ...homeworkPolicies.manageHomework,
    validateRequest({
      params: homeworkIdParamsSchema,
      body: saveHomeworkSubmissionsSchema
    }),
    asyncHandler((req, res) => controller.saveSubmissions(req, res))
  );

  return router;
};
