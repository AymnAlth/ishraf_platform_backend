import request from "supertest";
import { describe, expect, it } from "vitest";

import { AUTH_TEST_FIXTURES } from "../../fixtures/auth.fixture";
import type { IntegrationTestContext } from "../../helpers/integration-context";
import { SEEDED_DRIVER } from "../../setup/seed-test-data";

export const registerUsersIntegrationTests = (context: IntegrationTestContext): void => {
  describe("Users", () => {
    it("creates a teacher user with profile data in one request", async () => {
      const { accessToken } = await context.loginAsAdmin();

      const response = await request(context.app)
        .post("/api/v1/users")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          fullName: "New Teacher",
          email: "newteacher@eshraf.local",
          phone: "700000010",
          password: "StrongPass123",
          role: "teacher",
          profile: {
            specialization: "Mathematics",
            qualification: "Bachelor",
            hireDate: "2025-09-01"
          }
        });

      expect(response.status).toBe(201);
      expect(response.body.data.role).toBe("teacher");
      expect(response.body.data.profile).toEqual({
        specialization: "Mathematics",
        qualification: "Bachelor",
        hireDate: "2025-09-01"
      });
    });

    it("rolls back user creation when the role profile insert fails", async () => {
      const { accessToken } = await context.loginAsAdmin();

      const response = await request(context.app)
        .post("/api/v1/users")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          fullName: "Duplicate Driver",
          email: "dupdriver@eshraf.local",
          phone: "700000020",
          password: "StrongPass123",
          role: "driver",
          profile: {
            licenseNumber: SEEDED_DRIVER.profile.licenseNumber
          }
        });

      const userCount = await context.pool.query<{ count: string }>(
        `
          SELECT COUNT(*) AS count
          FROM users
          WHERE email = $1
        `,
        ["dupdriver@eshraf.local"]
      );

      expect(response.status).toBe(409);
      expect(userCount.rows[0].count).toBe("0");
    });

    it("lists users and returns role-specific profile data", async () => {
      const { accessToken } = await context.loginAsAdmin();

      const response = await request(context.app)
        .get("/api/v1/users")
        .set("Authorization", `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.items).toHaveLength(5);
      expect(response.body.data.pagination).toMatchObject({
        page: 1,
        limit: 20,
        totalItems: 5,
        totalPages: 1
      });

      const teacherUser = response.body.data.items.find(
        (user: { email: string }) => user.email === AUTH_TEST_FIXTURES.activePhoneUser.email
      );

      expect(teacherUser.profile).toEqual({
        specialization: "Mathematics",
        qualification: "Bachelor",
        hireDate: "2025-09-01"
      });
    });

    it("gets one user with a unified profile response", async () => {
      const { accessToken } = await context.loginAsAdmin();

      const response = await request(context.app)
        .get(`/api/v1/users/${SEEDED_DRIVER.id}`)
        .set("Authorization", `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.id).toBe(SEEDED_DRIVER.id);
      expect(response.body.data.profile).toEqual({
        licenseNumber: SEEDED_DRIVER.profile.licenseNumber,
        driverStatus: SEEDED_DRIVER.profile.driverStatus
      });
    });

    it("updates base fields and profile fields without changing the role", async () => {
      const { accessToken } = await context.loginAsAdmin();

      const response = await request(context.app)
        .patch(`/api/v1/users/${AUTH_TEST_FIXTURES.activePhoneUser.id}`)
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          fullName: "Updated Teacher",
          phone: "700000099",
          profile: {
            specialization: "Physics"
          }
        });

      expect(response.status).toBe(200);
      expect(response.body.data.fullName).toBe("Updated Teacher");
      expect(response.body.data.phone).toBe("700000099");
      expect(response.body.data.role).toBe("teacher");
      expect(response.body.data.profile).toEqual({
        specialization: "Physics",
        qualification: "Bachelor",
        hireDate: "2025-09-01"
      });
    });

    it("disables a user and revokes the stored refresh tokens", async () => {
      const seededDriverLogin = await context.login(SEEDED_DRIVER.email, SEEDED_DRIVER.password);
      const { accessToken } = await context.loginAsAdmin();

      const disableResponse = await request(context.app)
        .patch(`/api/v1/users/${SEEDED_DRIVER.id}/status`)
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          isActive: false
        });

      const refreshTokenStatus = await context.pool.query<{ revoked_at: string | null }>(
        `
          SELECT revoked_at
          FROM auth_refresh_tokens
          WHERE user_id = $1
        `,
        [SEEDED_DRIVER.id]
      );
      const refreshResponse = await request(context.app).post("/api/v1/auth/refresh").send({
        refreshToken: seededDriverLogin.body.data.tokens.refreshToken
      });

      expect(disableResponse.status).toBe(200);
      expect(disableResponse.body.data.isActive).toBe(false);
      expect(refreshTokenStatus.rows[0].revoked_at).not.toBeNull();
      expect(refreshResponse.status).toBe(401);
    });
  });
};
