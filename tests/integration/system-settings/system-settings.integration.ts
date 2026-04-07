import request from "supertest";
import { describe, expect, it } from "vitest";

import { AUTH_TEST_FIXTURES } from "../../fixtures/auth.fixture";
import type { IntegrationTestContext } from "../../helpers/integration-context";

export const registerSystemSettingsIntegrationTests = (
  context: IntegrationTestContext
): void => {
  describe("System Settings", () => {
    it("blocks non-admins from every system-settings route", async () => {
      const teacherLogin = await context.loginAsTeacher();

      const responses = await Promise.all([
        request(context.app)
          .get("/api/v1/system-settings")
          .set("Authorization", `Bearer ${teacherLogin.accessToken}`),
        request(context.app)
          .get("/api/v1/system-settings/imports")
          .set("Authorization", `Bearer ${teacherLogin.accessToken}`),
        request(context.app)
          .patch("/api/v1/system-settings/imports")
          .set("Authorization", `Bearer ${teacherLogin.accessToken}`)
          .send({
            reason: "Teacher is not allowed to change settings",
            values: {
              schoolOnboardingEnabled: false
            }
          }),
        request(context.app)
          .get("/api/v1/system-settings/audit")
          .set("Authorization", `Bearer ${teacherLogin.accessToken}`),
        request(context.app)
          .get("/api/v1/system-settings/integrations/status")
          .set("Authorization", `Bearer ${teacherLogin.accessToken}`)
      ]);

      expect(responses.map((response) => response.status)).toEqual([403, 403, 403, 403, 403]);
    });

    it("returns default groups and allows direct group reads", async () => {
      const adminLogin = await context.loginAsAdmin();

      const listResponse = await request(context.app)
        .get("/api/v1/system-settings")
        .set("Authorization", `Bearer ${adminLogin.accessToken}`);

      const groupResponse = await request(context.app)
        .get("/api/v1/system-settings/imports")
        .set("Authorization", `Bearer ${adminLogin.accessToken}`);

      expect(listResponse.status).toBe(200);
      expect(listResponse.body.data.groups.map((group: { group: string }) => group.group)).toEqual([
        "pushNotifications",
        "transportMaps",
        "analytics",
        "imports"
      ]);
      expect(groupResponse.status).toBe(200);
      expect(groupResponse.body.data).toMatchObject({
        group: "imports",
        description: expect.any(String)
      });
      expect(
        groupResponse.body.data.entries.find((entry: { key: string }) => entry.key === "schoolOnboardingEnabled")
      ).toMatchObject({
        value: true,
        defaultValue: true,
        source: "default"
      });
    });

    it("creates overrides, clears them back to defaults, and keeps audit history idempotent", async () => {
      const adminLogin = await context.loginAsAdmin();

      const createOverrideResponse = await request(context.app)
        .patch("/api/v1/system-settings/imports")
        .set("Authorization", `Bearer ${adminLogin.accessToken}`)
        .send({
          reason: "Freeze onboarding during rollout",
          values: {
            schoolOnboardingEnabled: false
          }
        });

      const repeatedOverrideResponse = await request(context.app)
        .patch("/api/v1/system-settings/imports")
        .set("Authorization", `Bearer ${adminLogin.accessToken}`)
        .send({
          reason: "Freeze onboarding during rollout",
          values: {
            schoolOnboardingEnabled: false
          }
        });

      const clearOverrideResponse = await request(context.app)
        .patch("/api/v1/system-settings/imports")
        .set("Authorization", `Bearer ${adminLogin.accessToken}`)
        .send({
          reason: "Restore onboarding default",
          values: {
            schoolOnboardingEnabled: true
          }
        });

      const repeatedClearResponse = await request(context.app)
        .patch("/api/v1/system-settings/imports")
        .set("Authorization", `Bearer ${adminLogin.accessToken}`)
        .send({
          reason: "Restore onboarding default",
          values: {
            schoolOnboardingEnabled: true
          }
        });

      const groupResponse = await request(context.app)
        .get("/api/v1/system-settings/imports")
        .set("Authorization", `Bearer ${adminLogin.accessToken}`);

      const filteredAuditResponse = await request(context.app)
        .get(
          "/api/v1/system-settings/audit?group=imports&key=schoolOnboardingEnabled&changedByUserId=1001&since=2000-01-01T00:00:00.000Z&until=2100-01-01T00:00:00.000Z&sortOrder=asc"
        )
        .set("Authorization", `Bearer ${adminLogin.accessToken}`);

      const emptyAuditResponse = await request(context.app)
        .get("/api/v1/system-settings/audit?group=imports&since=2100-01-01T00:00:00.000Z")
        .set("Authorization", `Bearer ${adminLogin.accessToken}`);

      expect(createOverrideResponse.status).toBe(200);
      expect(
        createOverrideResponse.body.data.entries.find(
          (entry: { key: string }) => entry.key === "schoolOnboardingEnabled"
        )
      ).toMatchObject({
        value: false,
        defaultValue: true,
        source: "override"
      });
      expect(repeatedOverrideResponse.status).toBe(200);
      expect(clearOverrideResponse.status).toBe(200);
      expect(repeatedClearResponse.status).toBe(200);
      expect(groupResponse.status).toBe(200);
      expect(
        groupResponse.body.data.entries.find(
          (entry: { key: string }) => entry.key === "schoolOnboardingEnabled"
        )
      ).toMatchObject({
        value: true,
        defaultValue: true,
        source: "default"
      });
      expect(filteredAuditResponse.status).toBe(200);
      expect(filteredAuditResponse.body.data.items).toHaveLength(2);
      expect(filteredAuditResponse.body.data.items.map((item: { action: string }) => item.action)).toEqual([
        "created",
        "cleared"
      ]);
      expect(filteredAuditResponse.body.data.items[0]).toMatchObject({
        group: "imports",
        key: "schoolOnboardingEnabled",
        changedBy: {
          userId: AUTH_TEST_FIXTURES.activeEmailUser.id,
          fullName: AUTH_TEST_FIXTURES.activeEmailUser.fullName
        }
      });
      expect(emptyAuditResponse.status).toBe(200);
      expect(emptyAuditResponse.body.data.items).toHaveLength(0);
    });

    it("returns integration status summaries and disables admin-imports when onboarding is switched off", async () => {
      const adminLogin = await context.loginAsAdmin();

      await request(context.app)
        .patch("/api/v1/system-settings/pushNotifications")
        .set("Authorization", `Bearer ${adminLogin.accessToken}`)
        .send({
          reason: "Enable push pilot",
          values: {
            fcmEnabled: true
          }
        });

      await request(context.app)
        .patch("/api/v1/system-settings/imports")
        .set("Authorization", `Bearer ${adminLogin.accessToken}`)
        .send({
          reason: "Freeze onboarding during rollout",
          values: {
            schoolOnboardingEnabled: false
          }
        });

      await context.pool.query(
        `
          INSERT INTO integration_outbox (
            provider_key,
            event_type,
            aggregate_type,
            aggregate_id,
            status,
            payload_json,
            headers_json
          )
          VALUES
            ('pushNotifications', 'transport.realtime.updated', 'trip', '1', 'pending', '{}'::jsonb, '{}'::jsonb),
            ('pushNotifications', 'transport.realtime.updated', 'trip', '2', 'failed', '{}'::jsonb, '{}'::jsonb)
        `
      );

      const integrationsStatusResponse = await request(context.app)
        .get("/api/v1/system-settings/integrations/status")
        .set("Authorization", `Bearer ${adminLogin.accessToken}`);

      const adminImportsHistoryResponse = await request(context.app)
        .get("/api/v1/admin-imports/school-onboarding/history")
        .set("Authorization", `Bearer ${adminLogin.accessToken}`);

      expect(integrationsStatusResponse.status).toBe(200);
      expect(
        integrationsStatusResponse.body.data.integrations.find(
          (item: { providerKey: string }) => item.providerKey === "pushNotifications"
        )
      ).toMatchObject({
        providerKey: "pushNotifications",
        featureEnabled: true,
        pendingOutboxCount: 1,
        failedOutboxCount: 1
      });
      expect(adminImportsHistoryResponse.status).toBe(409);
      expect(adminImportsHistoryResponse.body.errors).toContainEqual(
        expect.objectContaining({
          field: "group",
          code: "FEATURE_DISABLED"
        })
      );
    });
  });
};
