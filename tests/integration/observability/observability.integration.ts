import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { performanceTelemetryService } from "../../../src/common/services/performance-telemetry.service";
import type { IntegrationTestContext } from "../../helpers/integration-context";

export const registerObservabilityIntegrationTests = (
  context: IntegrationTestContext
): void => {
  describe("Observability", () => {
    beforeEach(() => {
      performanceTelemetryService.reset();
    });

    it("blocks non-admins from observability performance routes", async () => {
      const teacherLogin = await context.loginAsTeacher();

      const responses = await Promise.all([
        request(context.app)
          .get("/api/v1/observability/performance/summary")
          .set("Authorization", `Bearer ${teacherLogin.accessToken}`),
        request(context.app)
          .get("/api/v1/observability/performance/requests")
          .set("Authorization", `Bearer ${teacherLogin.accessToken}`),
        request(context.app)
          .get("/api/v1/observability/performance/queries")
          .set("Authorization", `Bearer ${teacherLogin.accessToken}`)
      ]);

      expect(responses.map((response) => response.status)).toEqual([403, 403, 403]);
    });

    it("returns request and query telemetry samples to admins", async () => {
      const adminLogin = await context.loginAsAdmin();

      performanceTelemetryService.reset();

      const readinessResponse = await request(context.app).get("/health/ready");
      const summaryResponse = await request(context.app)
        .get("/api/v1/observability/performance/summary")
        .set("Authorization", `Bearer ${adminLogin.accessToken}`);
      const requestsResponse = await request(context.app)
        .get("/api/v1/observability/performance/requests?route=health/ready&limit=5")
        .set("Authorization", `Bearer ${adminLogin.accessToken}`);
      const queriesResponse = await request(context.app)
        .get("/api/v1/observability/performance/queries?route=health/ready&limit=5")
        .set("Authorization", `Bearer ${adminLogin.accessToken}`);

      expect(readinessResponse.status).toBe(200);
      expect(summaryResponse.status).toBe(200);
      expect(summaryResponse.body.data.enabled).toBe(true);
      expect(summaryResponse.body.data.requests.sampleCount).toBeGreaterThanOrEqual(1);
      expect(summaryResponse.body.data.queries.sampleCount).toBeGreaterThanOrEqual(1);
      expect(summaryResponse.body.data.requests.topRoutes).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            method: "GET",
            routePattern: "/health/ready"
          })
        ])
      );

      expect(requestsResponse.status).toBe(200);
      expect(requestsResponse.body.data.items).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            method: "GET",
            routePattern: "/health/ready",
            statusCode: 200
          })
        ])
      );

      expect(queriesResponse.status).toBe(200);
      expect(queriesResponse.body.data.items).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            method: "GET",
            routePattern: "/health/ready",
            normalizedSql: "SELECT 1"
          })
        ])
      );
    });
  });
};
