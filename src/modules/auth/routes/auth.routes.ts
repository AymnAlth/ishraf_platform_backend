import { Router } from "express";

import { validateRequest } from "../../../common/middlewares/validation.middleware";
import { asyncHandler } from "../../../common/utils/async-handler";
import type { AuthController } from "../controller/auth.controller";
import { authPolicies } from "../policies/auth.policy";
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  logoutSchema,
  refreshTokenSchema,
  resetPasswordSchema
} from "../validator/auth.validator";

export const createAuthRouter = (authController: AuthController): Router => {
  const router = Router();

  router.post(
    "/login",
    validateRequest({ body: loginSchema }),
    asyncHandler((req, res) => authController.login(req, res))
  );

  router.post(
    "/forgot-password",
    validateRequest({ body: forgotPasswordSchema }),
    asyncHandler((req, res) => authController.forgotPassword(req, res))
  );

  router.post(
    "/reset-password",
    validateRequest({ body: resetPasswordSchema }),
    asyncHandler((req, res) => authController.resetPassword(req, res))
  );

  router.post(
    "/refresh",
    validateRequest({ body: refreshTokenSchema }),
    asyncHandler((req, res) => authController.refresh(req, res))
  );

  router.post(
    "/logout",
    validateRequest({ body: logoutSchema }),
    asyncHandler((req, res) => authController.logout(req, res))
  );

  router.post(
    "/change-password",
    ...authPolicies.activeUser,
    validateRequest({ body: changePasswordSchema }),
    asyncHandler((req, res) => authController.changePassword(req, res))
  );

  router.get(
    "/me",
    ...authPolicies.activeUser,
    asyncHandler((req, res) => authController.me(req, res))
  );

  return router;
};
