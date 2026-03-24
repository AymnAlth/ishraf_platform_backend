import type { Request, Response } from "express";

import { buildSuccessResponse } from "../../../common/base/http-response";
import { ForbiddenError } from "../../../common/errors/forbidden-error";
import { UnauthorizedError } from "../../../common/errors/unauthorized-error";
import type { ChangePasswordRequestDto } from "../dto/change-password.dto";
import type { ForgotPasswordRequestDto } from "../dto/forgot-password.dto";
import type { LoginRequestDto } from "../dto/login.dto";
import type { LogoutRequestDto } from "../dto/logout.dto";
import type { RefreshTokenRequestDto } from "../dto/refresh-token.dto";
import type { ResetPasswordRequestDto } from "../dto/reset-password.dto";
import {
  assertForgotPasswordAttemptAllowed,
  assertLoginAttemptAllowed,
  assertResetPasswordAttemptAllowed,
  buildForgotPasswordRateLimitKey,
  buildLoginRateLimitKey,
  buildResetPasswordRateLimitKey,
  clearLoginAttempts,
  registerForgotPasswordAttempt,
  registerFailedLoginAttempt,
  registerResetPasswordAttempt
} from "../policies/auth.policy";
import type { AuthService } from "../service/auth.service";

const buildRequestContext = (req: Request) => ({
  deviceInfo: req.header("user-agent") ?? null,
  ipAddress: req.ip ?? null
});

const isTrackedLoginFailure = (error: unknown): boolean =>
  error instanceof UnauthorizedError || error instanceof ForbiddenError;

export class AuthController {
  constructor(private readonly authService: AuthService) {}

  async login(req: Request, res: Response): Promise<void> {
    const payload = req.validated?.body as LoginRequestDto;
    const rateLimitKey = buildLoginRateLimitKey(payload.identifier, req.ip ?? null);

    assertLoginAttemptAllowed(rateLimitKey);

    try {
      const response = await this.authService.login(payload, buildRequestContext(req));

      clearLoginAttempts(rateLimitKey);
      res.status(200).json(buildSuccessResponse("Login successful", response));
    } catch (error) {
      if (isTrackedLoginFailure(error)) {
        registerFailedLoginAttempt(rateLimitKey);
      }

      throw error;
    }
  }

  async forgotPassword(req: Request, res: Response): Promise<void> {
    const payload = req.validated?.body as ForgotPasswordRequestDto;
    const rateLimitKey = buildForgotPasswordRateLimitKey(payload.identifier, req.ip ?? null);

    assertForgotPasswordAttemptAllowed(rateLimitKey);
    registerForgotPasswordAttempt(rateLimitKey);

    const response = await this.authService.forgotPassword(payload);

    res.status(200).json(buildSuccessResponse("Password reset requested successfully", response));
  }

  async resetPassword(req: Request, res: Response): Promise<void> {
    const payload = req.validated?.body as ResetPasswordRequestDto;
    const rateLimitKey = buildResetPasswordRateLimitKey(req.ip ?? null);

    assertResetPasswordAttemptAllowed(rateLimitKey);
    registerResetPasswordAttempt(rateLimitKey);

    await this.authService.resetPassword(payload);

    res.status(200).json(buildSuccessResponse("Password reset successfully", null));
  }

  async refresh(req: Request, res: Response): Promise<void> {
    const payload = req.validated?.body as RefreshTokenRequestDto;
    const response = await this.authService.refresh(payload, buildRequestContext(req));

    res.status(200).json(buildSuccessResponse("Token refreshed successfully", response));
  }

  async logout(req: Request, res: Response): Promise<void> {
    const payload = req.validated?.body as LogoutRequestDto;

    await this.authService.logout(payload);

    res.status(200).json(buildSuccessResponse("Logout successful", null));
  }

  async changePassword(req: Request, res: Response): Promise<void> {
    const payload = req.validated?.body as ChangePasswordRequestDto;

    await this.authService.changePassword(req.authUser!.userId, payload);

    res
      .status(200)
      .json(buildSuccessResponse("Password changed successfully", null));
  }

  async me(req: Request, res: Response): Promise<void> {
    const response = await this.authService.getCurrentUser(req.authUser!.userId);

    res.status(200).json(
      buildSuccessResponse("Current user fetched successfully", response)
    );
  }
}
