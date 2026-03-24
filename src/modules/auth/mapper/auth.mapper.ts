import type {
  AuthUserDto,
  CurrentUserResponseDto,
  ForgotPasswordResponseDto,
  LoginResponseDto,
  RefreshTokenResponseDto
} from "../dto/auth-response.dto";
import type { AuthUserRow } from "../types/auth.types";

export const toAuthUserDto = (row: AuthUserRow): AuthUserDto => ({
  id: row.id,
  fullName: row.fullName,
  email: row.email,
  phone: row.phone,
  role: row.role,
  isActive: row.isActive
});

export const toLoginResponseDto = (
  user: AuthUserRow,
  accessToken: string,
  refreshToken: string,
  expiresIn: number
): LoginResponseDto => ({
  user: toAuthUserDto(user),
  tokens: {
    accessToken,
    refreshToken,
    expiresIn
  }
});

export const toRefreshTokenResponseDto = (
  accessToken: string,
  refreshToken: string,
  expiresIn: number
): RefreshTokenResponseDto => ({
  accessToken,
  refreshToken,
  expiresIn
});

export const toForgotPasswordResponseDto = (
  resetToken: string | undefined,
  expiresInMinutes: number
): ForgotPasswordResponseDto => ({
  delivery: "accepted",
  ...(resetToken
    ? {
        resetToken,
        expiresInMinutes
      }
    : {})
});

export const toCurrentUserResponseDto = (
  user: AuthUserRow
): CurrentUserResponseDto => ({
  ...toAuthUserDto(user),
  lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : null
});
