import request from "supertest";
import { describe, expect, it } from "vitest";

import type { IntegrationTestContext } from "../../helpers/integration-context";

export const registerAppSecurityIntegrationTests = (
  context: IntegrationTestContext
): void => {
  describe("App Security and Readiness", () => {
    it("serves health and readiness endpoints successfully", async () => {
      const healthResponse = await request(context.app).get("/health");
      const readinessResponse = await request(context.app).get("/health/ready");

      expect(healthResponse.status).toBe(200);
      expect(healthResponse.body.success).toBe(true);
      expect(readinessResponse.status).toBe(200);
      expect(readinessResponse.body.success).toBe(true);
    });

    it("returns baseline security headers and omits x-powered-by", async () => {
      const response = await request(context.app).get("/health");

      expect(response.status).toBe(200);
      expect(response.headers["x-powered-by"]).toBeUndefined();
      expect(response.headers["x-dns-prefetch-control"]).toBe("off");
      expect(response.headers["x-frame-options"]).toBe("SAMEORIGIN");
    });

    it("allows configured CORS origins and blocks unknown origins", async () => {
      const allowedOrigin = "http://localhost:3000";

      const allowedResponse = await request(context.app)
        .get("/health")
        .set("Origin", allowedOrigin);
      const blockedResponse = await request(context.app)
        .get("/health")
        .set("Origin", "https://evil.example.com");

      expect(allowedResponse.status).toBe(200);
      expect(allowedResponse.headers["access-control-allow-origin"]).toBe(allowedOrigin);
      expect(blockedResponse.status).toBe(403);
      expect(blockedResponse.body.message).toBe("CORS origin is not allowed");
    });
  });
};
