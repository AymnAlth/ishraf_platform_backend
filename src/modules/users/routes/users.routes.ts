import { Router } from "express";

import { validateRequest } from "../../../common/middlewares/validation.middleware";
import { asyncHandler } from "../../../common/utils/async-handler";
import type { UsersController } from "../controller/users.controller";
import { usersPolicies } from "../policies/users.policy";
import {
  createUserSchema,
  listUsersQuerySchema,
  updateUserSchema,
  updateUserStatusSchema,
  userIdParamsSchema
} from "../validator/users.validator";

export const createUsersRouter = (usersController: UsersController): Router => {
  const router = Router();

  router.post(
    "/",
    ...usersPolicies.adminOnly,
    validateRequest({ body: createUserSchema }),
    asyncHandler((req, res) => usersController.create(req, res))
  );

  router.get(
    "/",
    ...usersPolicies.adminOnly,
    validateRequest({ query: listUsersQuerySchema }),
    asyncHandler((req, res) => usersController.list(req, res))
  );

  router.get(
    "/:id",
    ...usersPolicies.adminOnly,
    validateRequest({ params: userIdParamsSchema }),
    asyncHandler((req, res) => usersController.getById(req, res))
  );

  router.patch(
    "/:id",
    ...usersPolicies.adminOnly,
    validateRequest({ params: userIdParamsSchema, body: updateUserSchema }),
    asyncHandler((req, res) => usersController.update(req, res))
  );

  router.patch(
    "/:id/status",
    ...usersPolicies.adminOnly,
    validateRequest({ params: userIdParamsSchema, body: updateUserStatusSchema }),
    asyncHandler((req, res) => usersController.updateStatus(req, res))
  );

  return router;
};
