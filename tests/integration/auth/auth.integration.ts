import request from "supertest";
import { describe, expect, it } from "vitest";

import { env } from "../../../src/config/env";
import { AUTH_TEST_FIXTURES } from "../../fixtures/auth.fixture";
import type { IntegrationTestContext } from "../../helpers/integration-context";

export const registerAuthIntegrationTests = (context: IntegrationTestContext): void => {
  describe("Auth", () => {
    it("logs in successfully with email and returns nested tokens", async () => {
      const response = await context.login(
        AUTH_TEST_FIXTURES.activeEmailUser.email,
        AUTH_TEST_FIXTURES.activeEmailUser.password
      );

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.fullName).toBe(
        AUTH_TEST_FIXTURES.activeEmailUser.fullName
      );
      expect(response.body.data.tokens.accessToken).toBeTypeOf("string");
      expect(response.body.data.tokens.refreshToken).toBeTypeOf("string");
    });

    it("logs in successfully with phone", async () => {
      const response = await context.login(
        AUTH_TEST_FIXTURES.activePhoneUser.phone,
        AUTH_TEST_FIXTURES.activePhoneUser.password
      );

      expect(response.status).toBe(200);
      expect(response.body.data.user.phone).toBe(AUTH_TEST_FIXTURES.activePhoneUser.phone);
    });

    it("rejects invalid credentials with the same message", async () => {
      const wrongPasswordResponse = await context.login(
        AUTH_TEST_FIXTURES.activeEmailUser.email,
        "wrong-password"
      );
      const unknownUserResponse = await context.login("missing@example.com", "wrong-password");

      expect(wrongPasswordResponse.status).toBe(401);
      expect(unknownUserResponse.status).toBe(401);
      expect(wrongPasswordResponse.body.message).toBe("Invalid credentials");
      expect(unknownUserResponse.body.message).toBe("Invalid credentials");
    });

    it("rejects inactive users", async () => {
      const response = await context.login(
        AUTH_TEST_FIXTURES.inactiveUser.email,
        AUTH_TEST_FIXTURES.inactiveUser.password
      );

      expect(response.status).toBe(403);
    });

    it("applies login rate limiting after repeated failed attempts", async () => {
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const response = await context.login(
          AUTH_TEST_FIXTURES.activeEmailUser.email,
          "wrong-password"
        );

        expect(response.status).toBe(401);
      }

      const rateLimitedResponse = await context.login(
        AUTH_TEST_FIXTURES.activeEmailUser.email,
        "wrong-password"
      );

      expect(rateLimitedResponse.status).toBe(429);
      expect(rateLimitedResponse.body.message).toBe(
        "Too many login attempts. Please try again later."
      );
    });

    it("rotates refresh tokens successfully", async () => {
      const loginResponse = await context.login(
        AUTH_TEST_FIXTURES.activeEmailUser.email,
        AUTH_TEST_FIXTURES.activeEmailUser.password
      );

      const refreshResponse = await request(context.app).post("/api/v1/auth/refresh").send({
        refreshToken: loginResponse.body.data.tokens.refreshToken
      });

      expect(refreshResponse.status).toBe(200);
      expect(refreshResponse.body.data.accessToken).toBeTypeOf("string");
      expect(refreshResponse.body.data.refreshToken).toBeTypeOf("string");
      expect(refreshResponse.body.data.refreshToken).not.toBe(
        loginResponse.body.data.tokens.refreshToken
      );

      const secondRefreshResponse = await request(context.app).post("/api/v1/auth/refresh").send({
        refreshToken: loginResponse.body.data.tokens.refreshToken
      });

      expect(secondRefreshResponse.status).toBe(401);
    });

    it("revokes a refresh token on logout and stays idempotent", async () => {
      const loginResponse = await context.login(
        AUTH_TEST_FIXTURES.activeEmailUser.email,
        AUTH_TEST_FIXTURES.activeEmailUser.password
      );

      const logoutResponse = await request(context.app).post("/api/v1/auth/logout").send({
        refreshToken: loginResponse.body.data.tokens.refreshToken
      });
      const secondLogoutResponse = await request(context.app).post("/api/v1/auth/logout").send({
        refreshToken: loginResponse.body.data.tokens.refreshToken
      });
      const refreshResponse = await request(context.app).post("/api/v1/auth/refresh").send({
        refreshToken: loginResponse.body.data.tokens.refreshToken
      });

      expect(logoutResponse.status).toBe(200);
      expect(logoutResponse.body.data).toBeNull();
      expect(secondLogoutResponse.status).toBe(200);
      expect(refreshResponse.status).toBe(401);
    });

    it("changes the password and revokes existing refresh tokens", async () => {
      const loginResponse = await context.login(
        AUTH_TEST_FIXTURES.activeEmailUser.email,
        AUTH_TEST_FIXTURES.activeEmailUser.password
      );

      const changePasswordResponse = await request(context.app)
        .post("/api/v1/auth/change-password")
        .set("Authorization", `Bearer ${loginResponse.body.data.tokens.accessToken}`)
        .send({
          currentPassword: AUTH_TEST_FIXTURES.activeEmailUser.password,
          newPassword: "UpdatedPassword123!"
        });

      const refreshWithOldToken = await request(context.app).post("/api/v1/auth/refresh").send({
        refreshToken: loginResponse.body.data.tokens.refreshToken
      });
      const oldPasswordLoginResponse = await context.login(
        AUTH_TEST_FIXTURES.activeEmailUser.email,
        AUTH_TEST_FIXTURES.activeEmailUser.password
      );
      const newPasswordLoginResponse = await context.login(
        AUTH_TEST_FIXTURES.activeEmailUser.email,
        "UpdatedPassword123!"
      );

      expect(changePasswordResponse.status).toBe(200);
      expect(changePasswordResponse.body.data).toBeNull();
      expect(refreshWithOldToken.status).toBe(401);
      expect(oldPasswordLoginResponse.status).toBe(401);
      expect(newPasswordLoginResponse.status).toBe(200);
    });

    it("issues a reset token for active users and resets the password", async () => {
      const loginResponse = await context.login(
        AUTH_TEST_FIXTURES.activeEmailUser.email,
        AUTH_TEST_FIXTURES.activeEmailUser.password
      );

      const forgotPasswordResponse = await request(context.app)
        .post("/api/v1/auth/forgot-password")
        .send({
          identifier: AUTH_TEST_FIXTURES.activeEmailUser.email
        });

      expect(forgotPasswordResponse.status).toBe(200);
      expect(forgotPasswordResponse.body.data.delivery).toBe("accepted");
      expect(forgotPasswordResponse.body.data.resetToken).toBeTypeOf("string");

      const resetPasswordResponse = await request(context.app)
        .post("/api/v1/auth/reset-password")
        .send({
          token: forgotPasswordResponse.body.data.resetToken,
          newPassword: "ResetPassword123!"
        });

      const refreshWithOldToken = await request(context.app).post("/api/v1/auth/refresh").send({
        refreshToken: loginResponse.body.data.tokens.refreshToken
      });
      const oldPasswordLoginResponse = await context.login(
        AUTH_TEST_FIXTURES.activeEmailUser.email,
        AUTH_TEST_FIXTURES.activeEmailUser.password
      );
      const newPasswordLoginResponse = await context.login(
        AUTH_TEST_FIXTURES.activeEmailUser.email,
        "ResetPassword123!"
      );

      expect(resetPasswordResponse.status).toBe(200);
      expect(resetPasswordResponse.body.data).toBeNull();
      expect(refreshWithOldToken.status).toBe(401);
      expect(oldPasswordLoginResponse.status).toBe(401);
      expect(newPasswordLoginResponse.status).toBe(200);
    });

    it("does not expose the reset token when the environment flag is disabled", async () => {
      const originalExposure = env.AUTH_EXPOSE_RESET_TOKEN_IN_RESPONSE;
      env.AUTH_EXPOSE_RESET_TOKEN_IN_RESPONSE = false;

      try {
        const forgotPasswordResponse = await request(context.app)
          .post("/api/v1/auth/forgot-password")
          .send({
            identifier: AUTH_TEST_FIXTURES.activeEmailUser.email
          });

        expect(forgotPasswordResponse.status).toBe(200);
        expect(forgotPasswordResponse.body.data.delivery).toBe("accepted");
        expect(forgotPasswordResponse.body.data.resetToken).toBeUndefined();
      } finally {
        env.AUTH_EXPOSE_RESET_TOKEN_IN_RESPONSE = originalExposure;
      }
    });

    it("returns a generic forgot-password response for unknown users and rejects invalid reset tokens", async () => {
      const forgotPasswordResponse = await request(context.app)
        .post("/api/v1/auth/forgot-password")
        .send({
          identifier: "missing@example.com"
        });

      const resetPasswordResponse = await request(context.app)
        .post("/api/v1/auth/reset-password")
        .send({
          token: "invalid-reset-token",
          newPassword: "ResetPassword123!"
        });

      expect(forgotPasswordResponse.status).toBe(200);
      expect(forgotPasswordResponse.body.data.delivery).toBe("accepted");
      expect(forgotPasswordResponse.body.data.resetToken).toBeUndefined();
      expect(resetPasswordResponse.status).toBe(401);
      expect(resetPasswordResponse.body.message).toBe("Invalid or expired reset token");
    });

    it("applies password-reset rate limiting for forgot-password and reset-password requests", async () => {
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const forgotResponse = await request(context.app)
          .post("/api/v1/auth/forgot-password")
          .send({
            identifier: AUTH_TEST_FIXTURES.activeEmailUser.email
          });

        expect(forgotResponse.status).toBe(200);
      }

      const rateLimitedForgotResponse = await request(context.app)
        .post("/api/v1/auth/forgot-password")
        .send({
          identifier: AUTH_TEST_FIXTURES.activeEmailUser.email
        });

      expect(rateLimitedForgotResponse.status).toBe(429);
      expect(rateLimitedForgotResponse.body.message).toBe(
        "Too many password reset requests. Please try again later."
      );

      for (let attempt = 0; attempt < 5; attempt += 1) {
        const resetResponse = await request(context.app)
          .post("/api/v1/auth/reset-password")
          .send({
            token: `invalid-reset-token-${attempt}`,
            newPassword: "ResetPassword123!"
          });

        expect(resetResponse.status).toBe(401);
      }

      const rateLimitedResetResponse = await request(context.app)
        .post("/api/v1/auth/reset-password")
        .send({
          token: "invalid-reset-token-final",
          newPassword: "ResetPassword123!"
        });

      expect(rateLimitedResetResponse.status).toBe(429);
      expect(rateLimitedResetResponse.body.message).toBe(
        "Too many password reset requests. Please try again later."
      );
    });

    it("returns the current user profile from /me", async () => {
      const loginResponse = await context.login(
        AUTH_TEST_FIXTURES.activeEmailUser.email,
        AUTH_TEST_FIXTURES.activeEmailUser.password
      );

      const meResponse = await request(context.app)
        .get("/api/v1/auth/me")
        .set("Authorization", `Bearer ${loginResponse.body.data.tokens.accessToken}`);
      const unauthorizedResponse = await request(context.app).get("/api/v1/auth/me");

      expect(meResponse.status).toBe(200);
      expect(meResponse.body.data.id).toBe(AUTH_TEST_FIXTURES.activeEmailUser.id);
      expect(meResponse.body.data.fullName).toBe(
        AUTH_TEST_FIXTURES.activeEmailUser.fullName
      );
      expect(meResponse.body.data.lastLoginAt).toBeTypeOf("string");
      expect(unauthorizedResponse.status).toBe(401);
    });
  });
};
