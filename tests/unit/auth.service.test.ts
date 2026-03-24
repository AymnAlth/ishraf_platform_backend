import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ForbiddenError } from "../../src/common/errors/forbidden-error";
import { UnauthorizedError } from "../../src/common/errors/unauthorized-error";
import { hashPassword } from "../../src/common/utils/password.util";
import { signRefreshToken } from "../../src/common/utils/token.util";
import { env } from "../../src/config/env";
import { db } from "../../src/database/db";
import { AuthService } from "../../src/modules/auth/service/auth.service";
import type { AuthRepository } from "../../src/modules/auth/repository/auth.repository";
import type {
  AuthRefreshTokenRow,
  AuthUserRow
} from "../../src/modules/auth/types/auth.types";

const createUser = async (overrides: Partial<AuthUserRow> = {}): Promise<AuthUserRow> => ({
  id: "11111111-1111-4111-8111-111111111111",
  fullName: "Sara Admin",
  email: "admin@example.com",
  phone: "01000000001",
  passwordHash: await hashPassword("Password123!"),
  role: "admin",
  isActive: true,
  lastLoginAt: null,
  ...overrides
});

describe("AuthService", () => {
  const repositoryMock = {
    findUserByIdentifier: vi.fn(),
    findUserById: vi.fn(),
    updateLastLoginAt: vi.fn(),
    updatePasswordHash: vi.fn(),
    createRefreshToken: vi.fn(),
    createPasswordResetToken: vi.fn(),
    findValidRefreshToken: vi.fn(),
    findValidPasswordResetToken: vi.fn(),
    revokeRefreshToken: vi.fn(),
    revokeAllUserRefreshTokens: vi.fn(),
    revokeAllUserPasswordResetTokens: vi.fn(),
    markPasswordResetTokenUsed: vi.fn()
  };

  let authService: AuthService;
  let originalResetTokenExposure: boolean;

  beforeEach(() => {
    authService = new AuthService(repositoryMock as unknown as AuthRepository);
    originalResetTokenExposure = env.AUTH_EXPOSE_RESET_TOKEN_IN_RESPONSE;

    vi.restoreAllMocks();
    vi.spyOn(db, "withTransaction").mockImplementation(async (callback) => {
      const fakeClient = {
        query: vi.fn(),
        release: vi.fn()
      };

      return callback(fakeClient as never);
    });

    Object.values(repositoryMock).forEach((mockFn) => mockFn.mockReset());
  });

  afterEach(() => {
    env.AUTH_EXPOSE_RESET_TOKEN_IN_RESPONSE = originalResetTokenExposure;
  });

  it("logs in successfully and returns nested tokens", async () => {
    const user = await createUser();

    vi.mocked(repositoryMock.findUserByIdentifier).mockResolvedValue(user);
    vi.mocked(repositoryMock.createRefreshToken).mockResolvedValue(undefined);
    vi.mocked(repositoryMock.updateLastLoginAt).mockResolvedValue(
      new Date("2026-03-13T10:00:00.000Z")
    );

    const response = await authService.login(
      {
        identifier: "admin@example.com",
        password: "Password123!"
      },
      {
        deviceInfo: "vitest",
        ipAddress: "127.0.0.1"
      }
    );

    expect(response.user.fullName).toBe("Sara Admin");
    expect(response.user).not.toHaveProperty("lastLoginAt");
    expect(response.tokens.accessToken).toBeTypeOf("string");
    expect(response.tokens.refreshToken).toBeTypeOf("string");
    expect(repositoryMock.createRefreshToken).toHaveBeenCalledOnce();
  });

  it("rejects invalid credentials", async () => {
    const user = await createUser();

    vi.mocked(repositoryMock.findUserByIdentifier).mockResolvedValue(user);

    await expect(
      authService.login(
        {
          identifier: "admin@example.com",
          password: "wrong-password"
        },
        {
          deviceInfo: null,
          ipAddress: null
        }
      )
    ).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it("rejects inactive users on login", async () => {
    const user = await createUser({ isActive: false });

    vi.mocked(repositoryMock.findUserByIdentifier).mockResolvedValue(user);

    await expect(
      authService.login(
        {
          identifier: "inactive@example.com",
          password: "Password123!"
        },
        {
          deviceInfo: null,
          ipAddress: null
        }
      )
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("rejects refresh when the stored token is missing or revoked", async () => {
    const refreshToken = signRefreshToken({
      userId: "11111111-1111-4111-8111-111111111111"
    });

    vi.mocked(repositoryMock.findValidRefreshToken).mockResolvedValue(null);

    await expect(
      authService.refresh(
        {
          refreshToken
        },
        {
          deviceInfo: null,
          ipAddress: null
        }
      )
    ).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it("rotates refresh tokens successfully", async () => {
    const user = await createUser();
    const currentRefreshToken = signRefreshToken({
      userId: user.id
    });
    const storedToken: AuthRefreshTokenRow = {
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      userId: user.id,
      tokenHash: "hash",
      deviceInfo: "old-device",
      ipAddress: "127.0.0.1",
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: null,
      createdAt: new Date("2026-03-13T10:00:00.000Z")
    };

    vi.mocked(repositoryMock.findValidRefreshToken).mockResolvedValue(storedToken);
    vi.mocked(repositoryMock.findUserById).mockResolvedValue(user);
    vi.mocked(repositoryMock.revokeRefreshToken).mockResolvedValue(undefined);
    vi.mocked(repositoryMock.createRefreshToken).mockResolvedValue(undefined);

    const response = await authService.refresh(
      {
        refreshToken: currentRefreshToken
      },
      {
        deviceInfo: "new-device",
        ipAddress: "127.0.0.2"
      }
    );

    expect(response.accessToken).toBeTypeOf("string");
    expect(response.refreshToken).toBeTypeOf("string");
    expect(repositoryMock.revokeRefreshToken).toHaveBeenCalledOnce();
    expect(repositoryMock.createRefreshToken).toHaveBeenCalledOnce();
  });

  it("rejects change-password when the current password does not match", async () => {
    const user = await createUser();

    vi.mocked(repositoryMock.findUserById).mockResolvedValue(user);

    await expect(
      authService.changePassword(user.id, {
        currentPassword: "wrong-password",
        newPassword: "NewPassword123!"
      })
    ).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it("returns a reset token from forgot-password only when exposure is enabled", async () => {
    const user = await createUser();

    vi.mocked(repositoryMock.findUserByIdentifier).mockResolvedValue(user);
    vi.mocked(repositoryMock.revokeAllUserPasswordResetTokens).mockResolvedValue(undefined);
    vi.mocked(repositoryMock.createPasswordResetToken).mockResolvedValue(undefined);

    env.AUTH_EXPOSE_RESET_TOKEN_IN_RESPONSE = true;
    const exposedResponse = await authService.forgotPassword({
      identifier: user.email!
    });

    env.AUTH_EXPOSE_RESET_TOKEN_IN_RESPONSE = false;
    const hiddenResponse = await authService.forgotPassword({
      identifier: user.email!
    });

    expect(exposedResponse.delivery).toBe("accepted");
    expect(exposedResponse.resetToken).toBeTypeOf("string");
    expect(hiddenResponse.delivery).toBe("accepted");
    expect(hiddenResponse.resetToken).toBeUndefined();
  });
});
