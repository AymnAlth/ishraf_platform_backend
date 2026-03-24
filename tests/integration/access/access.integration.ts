import request from "supertest";
import { describe, expect, it } from "vitest";

import { AUTH_TEST_FIXTURES } from "../../fixtures/auth.fixture";
import type { IntegrationTestContext } from "../../helpers/integration-context";

export const registerAccessIntegrationTests = (context: IntegrationTestContext): void => {
  describe("Access Control", () => {
    it("rejects admin-only users and academic-structure routes for non-admin accounts", async () => {
      const teacherLogin = await context.login(
        AUTH_TEST_FIXTURES.activePhoneUser.email,
        AUTH_TEST_FIXTURES.activePhoneUser.password
      );

      const accessToken = teacherLogin.body.data.tokens.accessToken as string;

      const usersResponse = await request(context.app)
        .get("/api/v1/users")
        .set("Authorization", `Bearer ${accessToken}`);
      const academicResponse = await request(context.app)
        .get("/api/v1/academic-structure/academic-years")
        .set("Authorization", `Bearer ${accessToken}`);
      const studentsResponse = await request(context.app)
        .get("/api/v1/students")
        .set("Authorization", `Bearer ${accessToken}`);
      const transportResponse = await request(context.app)
        .get("/api/v1/transport/buses")
        .set("Authorization", `Bearer ${accessToken}`);

      expect(usersResponse.status).toBe(403);
      expect(academicResponse.status).toBe(403);
      expect(studentsResponse.status).toBe(403);
      expect(transportResponse.status).toBe(403);
    });
  });
};
