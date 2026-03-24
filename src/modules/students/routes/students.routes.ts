import { Router } from "express";

import { validateRequest } from "../../../common/middlewares/validation.middleware";
import { asyncHandler } from "../../../common/utils/async-handler";
import type { StudentsController } from "../controller/students.controller";
import { studentsPolicies } from "../policies/students.policy";
import {
  createStudentSchema,
  linkStudentParentSchema,
  listStudentsQuerySchema,
  promoteStudentSchema,
  studentIdParamsSchema,
  studentParentParamsSchema,
  updateStudentSchema
} from "../validator/students.validator";

export const createStudentsRouter = (controller: StudentsController): Router => {
  const router = Router();

  router.post(
    "/",
    ...studentsPolicies.adminOnly,
    validateRequest({ body: createStudentSchema }),
    asyncHandler((req, res) => controller.create(req, res))
  );

  router.get(
    "/",
    ...studentsPolicies.adminOnly,
    validateRequest({ query: listStudentsQuerySchema }),
    asyncHandler((req, res) => controller.list(req, res))
  );

  router.get(
    "/:id",
    ...studentsPolicies.adminOnly,
    validateRequest({ params: studentIdParamsSchema }),
    asyncHandler((req, res) => controller.getById(req, res))
  );

  router.patch(
    "/:id",
    ...studentsPolicies.adminOnly,
    validateRequest({ params: studentIdParamsSchema, body: updateStudentSchema }),
    asyncHandler((req, res) => controller.update(req, res))
  );

  router.post(
    "/:id/parents",
    ...studentsPolicies.adminOnly,
    validateRequest({ params: studentIdParamsSchema, body: linkStudentParentSchema }),
    asyncHandler((req, res) => controller.linkParent(req, res))
  );

  router.get(
    "/:id/parents",
    ...studentsPolicies.adminOnly,
    validateRequest({ params: studentIdParamsSchema }),
    asyncHandler((req, res) => controller.listParents(req, res))
  );

  router.patch(
    "/:studentId/parents/:parentId/primary",
    ...studentsPolicies.adminOnly,
    validateRequest({ params: studentParentParamsSchema }),
    asyncHandler((req, res) => controller.setPrimaryParent(req, res))
  );

  router.post(
    "/:id/promotions",
    ...studentsPolicies.adminOnly,
    validateRequest({ params: studentIdParamsSchema, body: promoteStudentSchema }),
    asyncHandler((req, res) => controller.promote(req, res))
  );

  return router;
};
