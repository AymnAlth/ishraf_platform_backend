import type { Role } from "../../../config/constants";

export interface AuthUserDto {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  role: Role;
  isActive: boolean;
}

export interface CurrentUserResponseDto extends AuthUserDto {
  lastLoginAt: string | null;
}

export interface LoginTokensDto {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LoginResponseDto {
  user: AuthUserDto;
  tokens: LoginTokensDto;
}

export interface RefreshTokenResponseDto {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface ForgotPasswordResponseDto {
  delivery: "accepted";
  resetToken?: string;
  expiresInMinutes?: number;
}
