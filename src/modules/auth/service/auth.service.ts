import { randomBytes } from "node:crypto";

import { env } from "../../../config/env";
import { ForbiddenError } from "../../../common/errors/forbidden-error";
import { NotFoundError } from "../../../common/errors/not-found-error";
import { UnauthorizedError } from "../../../common/errors/unauthorized-error";
import { comparePassword, hashPassword } from "../../../common/utils/password.util";
import {
  getAccessTokenExpiresInSeconds,
  getRefreshTokenExpiryDate,
  hashToken,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken
} from "../../../common/utils/token.util";
import { db } from "../../../database/db";
import type {
  CurrentUserResponseDto,
  ForgotPasswordResponseDto,
  LoginResponseDto,
  RefreshTokenResponseDto
} from "../dto/auth-response.dto";
import type { ChangePasswordRequestDto } from "../dto/change-password.dto";
import type { ForgotPasswordRequestDto } from "../dto/forgot-password.dto";
import type { LoginRequestDto } from "../dto/login.dto";
import type { LogoutRequestDto } from "../dto/logout.dto";
import type { RefreshTokenRequestDto } from "../dto/refresh-token.dto";
import type { ResetPasswordRequestDto } from "../dto/reset-password.dto";
import {
  toCurrentUserResponseDto,
  toForgotPasswordResponseDto,
  toLoginResponseDto,
  toRefreshTokenResponseDto
} from "../mapper/auth.mapper";
import type { AuthRepository } from "../repository/auth.repository";
import type { AuthRequestContext, AuthUserRow } from "../types/auth.types";

const assertActiveUser = (user: AuthUserRow): void => {
  if (!user.isActive) {
    throw new ForbiddenError("User account is inactive");
  }
};

const invalidRefreshTokenError = (): UnauthorizedError =>
  new UnauthorizedError("Invalid or expired refresh token");

const invalidResetTokenError = (): UnauthorizedError =>
  new UnauthorizedError("Invalid or expired reset token");

const buildAccessToken = (user: AuthUserRow): string =>
  signAccessToken({
    userId: user.id,
    role: user.role,
    email: user.email,
    isActive: user.isActive
  });

const getPasswordResetExpiryDate = (): Date =>
  new Date(Date.now() + env.PASSWORD_RESET_TOKEN_TTL_MINUTES * 60 * 1000);

const shouldExposeResetToken = (): boolean => env.AUTH_EXPOSE_RESET_TOKEN_IN_RESPONSE;

export class AuthService {
  constructor(private readonly authRepository: AuthRepository) {}

  async login(
    payload: LoginRequestDto,
    context: AuthRequestContext
  ): Promise<LoginResponseDto> {
    const user = await this.authRepository.findUserByIdentifier(payload.identifier);

    if (!user) {
      throw new UnauthorizedError("Invalid credentials");
    }

    assertActiveUser(user);

    const passwordMatches = await comparePassword(payload.password, user.passwordHash);

    if (!passwordMatches) {
      throw new UnauthorizedError("Invalid credentials");
    }

    const refreshToken = signRefreshToken({
      userId: user.id
    });
    const refreshTokenHash = hashToken(refreshToken);
    const refreshTokenExpiresAt = getRefreshTokenExpiryDate();
    const accessToken = buildAccessToken(user);

    const lastLoginAt = await db.withTransaction(async (client) => {
      await this.authRepository.createRefreshToken(
        {
          userId: user.id,
          tokenHash: refreshTokenHash,
          deviceInfo: context.deviceInfo,
          ipAddress: context.ipAddress,
          expiresAt: refreshTokenExpiresAt
        },
        client
      );

      return this.authRepository.updateLastLoginAt(user.id, client);
    });

    return toLoginResponseDto(
      {
        ...user,
        lastLoginAt
      },
      accessToken,
      refreshToken,
      getAccessTokenExpiresInSeconds()
    );
  }

  async forgotPassword(
    payload: ForgotPasswordRequestDto
  ): Promise<ForgotPasswordResponseDto> {
    const user = await this.authRepository.findUserByIdentifier(payload.identifier);

    if (!user || !user.isActive) {
      return toForgotPasswordResponseDto(undefined, env.PASSWORD_RESET_TOKEN_TTL_MINUTES);
    }

    const resetToken = randomBytes(32).toString("hex");
    const resetTokenHash = hashToken(resetToken);
    const expiresAt = getPasswordResetExpiryDate();

    await db.withTransaction(async (client) => {
      await this.authRepository.revokeAllUserPasswordResetTokens(user.id, client);
      await this.authRepository.createPasswordResetToken(
        {
          userId: user.id,
          tokenHash: resetTokenHash,
          expiresAt
        },
        client
      );
    });

    return toForgotPasswordResponseDto(
      shouldExposeResetToken() ? resetToken : undefined,
      env.PASSWORD_RESET_TOKEN_TTL_MINUTES
    );
  }

  async resetPassword(payload: ResetPasswordRequestDto): Promise<void> {
    const resetTokenHash = hashToken(payload.token);
    const resetToken = await this.authRepository.findValidPasswordResetToken(resetTokenHash);

    if (!resetToken) {
      throw invalidResetTokenError();
    }

    const user = await this.authRepository.findUserById(resetToken.userId);

    if (!user) {
      throw new NotFoundError("User not found");
    }

    assertActiveUser(user);

    const nextPasswordHash = await hashPassword(payload.newPassword);

    await db.withTransaction(async (client) => {
      await this.authRepository.updatePasswordHash(user.id, nextPasswordHash, client);
      await this.authRepository.markPasswordResetTokenUsed(resetToken.id, client);
      await this.authRepository.revokeAllUserPasswordResetTokens(user.id, client);
      await this.authRepository.revokeAllUserRefreshTokens(user.id, client);
    });
  }

  async refresh(
    payload: RefreshTokenRequestDto,
    context: AuthRequestContext
  ): Promise<RefreshTokenResponseDto> {
    let decoded;

    try {
      decoded = verifyRefreshToken(payload.refreshToken);
    } catch {
      throw invalidRefreshTokenError();
    }

    const currentTokenHash = hashToken(payload.refreshToken);
    const existingToken = await this.authRepository.findValidRefreshToken(currentTokenHash);

    if (!existingToken || existingToken.userId !== decoded.sub) {
      throw invalidRefreshTokenError();
    }

    const user = await this.authRepository.findUserById(decoded.sub);

    if (!user) {
      throw invalidRefreshTokenError();
    }

    assertActiveUser(user);

    const nextAccessToken = buildAccessToken(user);
    const nextRefreshToken = signRefreshToken({
      userId: user.id
    });
    const nextRefreshTokenHash = hashToken(nextRefreshToken);
    const nextRefreshTokenExpiresAt = getRefreshTokenExpiryDate();

    await db.withTransaction(async (client) => {
      await this.authRepository.revokeRefreshToken(currentTokenHash, client);
      await this.authRepository.createRefreshToken(
        {
          userId: user.id,
          tokenHash: nextRefreshTokenHash,
          deviceInfo: context.deviceInfo,
          ipAddress: context.ipAddress,
          expiresAt: nextRefreshTokenExpiresAt
        },
        client
      );
    });

    return toRefreshTokenResponseDto(
      nextAccessToken,
      nextRefreshToken,
      getAccessTokenExpiresInSeconds()
    );
  }

  async logout(payload: LogoutRequestDto): Promise<void> {
    await this.authRepository.revokeRefreshToken(hashToken(payload.refreshToken));
  }

  async changePassword(
    userId: string,
    payload: ChangePasswordRequestDto
  ): Promise<void> {
    const user = await this.authRepository.findUserById(userId);

    if (!user) {
      throw new NotFoundError("User not found");
    }

    const passwordMatches = await comparePassword(
      payload.currentPassword,
      user.passwordHash
    );

    if (!passwordMatches) {
      throw new UnauthorizedError("Current password is incorrect");
    }

    const nextPasswordHash = await hashPassword(payload.newPassword);

    await db.withTransaction(async (client) => {
      await this.authRepository.updatePasswordHash(user.id, nextPasswordHash, client);
      await this.authRepository.revokeAllUserRefreshTokens(user.id, client);
      await this.authRepository.revokeAllUserPasswordResetTokens(user.id, client);
    });
  }

  async getCurrentUser(userId: string): Promise<CurrentUserResponseDto> {
    const user = await this.authRepository.findUserById(userId);

    if (!user) {
      throw new NotFoundError("User not found");
    }

    return toCurrentUserResponseDto(user);
  }
}
