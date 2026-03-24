import request from "supertest";
import { describe, expect, it } from "vitest";

import { AUTH_TEST_FIXTURES } from "../../fixtures/auth.fixture";
import type { IntegrationTestContext } from "../../helpers/integration-context";
import { SEEDED_DRIVER } from "../../setup/seed-test-data";

export const registerCommunicationIntegrationTests = (
  context: IntegrationTestContext
): void => {
  describe("Communication", () => {
    it("sends direct messages and exposes inbox, sent, and conversation views privately", async () => {
      const teacherLogin = await context.loginAsTeacher();
      const driverLogin = await context.loginAsDriver();

      const sendResponse = await request(context.app)
        .post("/api/v1/communication/messages")
        .set("Authorization", `Bearer ${teacherLogin.accessToken}`)
        .send({
          receiverUserId: SEEDED_DRIVER.id,
          messageBody: "The pickup trip will start in 10 minutes"
        });
      const sentResponse = await request(context.app)
        .get("/api/v1/communication/messages/sent")
        .set("Authorization", `Bearer ${teacherLogin.accessToken}`);
      const inboxResponse = await request(context.app)
        .get("/api/v1/communication/messages/inbox")
        .set("Authorization", `Bearer ${driverLogin.accessToken}`);
      const conversationResponse = await request(context.app)
        .get(`/api/v1/communication/messages/conversations/${AUTH_TEST_FIXTURES.activePhoneUser.id}`)
        .set("Authorization", `Bearer ${driverLogin.accessToken}`);

      expect(sendResponse.status).toBe(201);
      expect(sendResponse.body.data.receiver.userId).toBe(SEEDED_DRIVER.id);
      expect(sentResponse.status).toBe(200);
      expect(sentResponse.body.data.items).toHaveLength(1);
      expect(sentResponse.body.data.pagination).toMatchObject({
        page: 1,
        limit: 20,
        totalItems: 1,
        totalPages: 1
      });
      expect(inboxResponse.status).toBe(200);
      expect(inboxResponse.body.data.unreadCount).toBe(1);
      expect(inboxResponse.body.data.messages[0].sender.userId).toBe(
        AUTH_TEST_FIXTURES.activePhoneUser.id
      );
      expect(conversationResponse.status).toBe(200);
      expect(conversationResponse.body.data.items).toHaveLength(1);
      expect(conversationResponse.body.data.pagination).toMatchObject({
        page: 1,
        limit: 20,
        totalItems: 1,
        totalPages: 1
      });
    });

    it("marks messages as read idempotently and hides foreign messages", async () => {
      const adminLogin = await context.loginAsAdmin();
      const teacherLogin = await context.loginAsTeacher();

      const sendResponse = await request(context.app)
        .post("/api/v1/communication/messages")
        .set("Authorization", `Bearer ${adminLogin.accessToken}`)
        .send({
          receiverUserId: AUTH_TEST_FIXTURES.activePhoneUser.id,
          messageBody: "Please review the new announcement"
        });
      const messageId = sendResponse.body.data.id as string;

      const firstReadResponse = await request(context.app)
        .patch(`/api/v1/communication/messages/${messageId}/read`)
        .set("Authorization", `Bearer ${teacherLogin.accessToken}`)
        .send({});
      const secondReadResponse = await request(context.app)
        .patch(`/api/v1/communication/messages/${messageId}/read`)
        .set("Authorization", `Bearer ${teacherLogin.accessToken}`)
        .send({});
      const foreignReadResponse = await request(context.app)
        .patch(`/api/v1/communication/messages/${messageId}/read`)
        .set("Authorization", `Bearer ${adminLogin.accessToken}`)
        .send({});

      expect(firstReadResponse.status).toBe(200);
      expect(firstReadResponse.body.data.readAt).toBeTypeOf("string");
      expect(secondReadResponse.status).toBe(200);
      expect(secondReadResponse.body.data.readAt).toBeTypeOf("string");
      expect(foreignReadResponse.status).toBe(404);
    });

    it("creates announcements and filters active feeds by role and expiry", async () => {
      const adminLogin = await context.loginAsAdmin();
      const teacherLogin = await context.loginAsTeacher();
      const driverLogin = await context.loginAsDriver();

      const generalAnnouncement = await context.createAnnouncement(adminLogin.accessToken);
      const teacherAnnouncement = await context.createAnnouncement(adminLogin.accessToken, {
        title: "Teacher notice",
        content: "Teachers meeting at noon",
        targetRole: "teacher"
      });
      const driverAnnouncement = await context.createAnnouncement(adminLogin.accessToken, {
        title: "Driver notice",
        content: "Drivers meeting at 7 AM",
        targetRole: "driver"
      });
      const expiringAnnouncement = await context.createAnnouncement(adminLogin.accessToken, {
        title: "Past notice",
        content: "This notice has expired"
      });

      await context.pool.query(
        `
          UPDATE announcements
          SET published_at = $2::timestamptz,
              expires_at = $3::timestamptz
          WHERE id = $1
        `,
        [expiringAnnouncement.body.data.id, "2026-03-10T08:00:00.000Z", "2026-03-11T08:00:00.000Z"]
      );

      const adminListResponse = await request(context.app)
        .get("/api/v1/communication/announcements")
        .set("Authorization", `Bearer ${adminLogin.accessToken}`);
      const teacherFeedResponse = await request(context.app)
        .get("/api/v1/communication/announcements/active")
        .set("Authorization", `Bearer ${teacherLogin.accessToken}`);
      const driverFeedResponse = await request(context.app)
        .get("/api/v1/communication/announcements/active")
        .set("Authorization", `Bearer ${driverLogin.accessToken}`);

      expect(generalAnnouncement.status).toBe(201);
      expect(teacherAnnouncement.status).toBe(201);
      expect(driverAnnouncement.status).toBe(201);
      expect(adminListResponse.status).toBe(200);
      expect(adminListResponse.body.data).toHaveLength(4);
      expect(teacherFeedResponse.status).toBe(200);
      expect(teacherFeedResponse.body.data).toHaveLength(2);
      expect(
        teacherFeedResponse.body.data.some(
          (announcement: { title: string }) => announcement.title === "Teacher notice"
        )
      ).toBe(true);
      expect(
        teacherFeedResponse.body.data.some(
          (announcement: { title: string }) => announcement.title === "Driver notice"
        )
      ).toBe(false);
      expect(
        teacherFeedResponse.body.data.some(
          (announcement: { title: string }) => announcement.title === "Past notice"
        )
      ).toBe(false);
      expect(driverFeedResponse.status).toBe(200);
      expect(driverFeedResponse.body.data).toHaveLength(2);
    });

    it("creates notifications, returns personal notification feeds, and protects read ownership", async () => {
      const adminLogin = await context.loginAsAdmin();
      const teacherLogin = await context.loginAsTeacher();
      const driverLogin = await context.loginAsDriver();

      const createNotificationResponse = await context.createNotification(
        adminLogin.accessToken,
        {
          userId: AUTH_TEST_FIXTURES.activePhoneUser.id,
          title: "New announcement",
          message: "Please review the new general announcement",
          notificationType: "announcement",
          referenceType: "announcement",
          referenceId: "1"
        }
      );
      const notificationId = createNotificationResponse.body.data.id as string;

      const listNotificationsResponse = await request(context.app)
        .get("/api/v1/communication/notifications/me")
        .set("Authorization", `Bearer ${teacherLogin.accessToken}`);
      const markReadResponse = await request(context.app)
        .patch(`/api/v1/communication/notifications/${notificationId}/read`)
        .set("Authorization", `Bearer ${teacherLogin.accessToken}`)
        .send({});
      const secondReadResponse = await request(context.app)
        .patch(`/api/v1/communication/notifications/${notificationId}/read`)
        .set("Authorization", `Bearer ${teacherLogin.accessToken}`)
        .send({});
      const foreignReadResponse = await request(context.app)
        .patch(`/api/v1/communication/notifications/${notificationId}/read`)
        .set("Authorization", `Bearer ${driverLogin.accessToken}`)
        .send({});
      const listAfterReadResponse = await request(context.app)
        .get("/api/v1/communication/notifications/me")
        .set("Authorization", `Bearer ${teacherLogin.accessToken}`);

      expect(createNotificationResponse.status).toBe(201);
      expect(listNotificationsResponse.status).toBe(200);
      expect(listNotificationsResponse.body.data.unreadCount).toBe(1);
      expect(listNotificationsResponse.body.data.notifications).toHaveLength(1);
      expect(markReadResponse.status).toBe(200);
      expect(markReadResponse.body.data.isRead).toBe(true);
      expect(secondReadResponse.status).toBe(200);
      expect(foreignReadResponse.status).toBe(404);
      expect(listAfterReadResponse.status).toBe(200);
      expect(listAfterReadResponse.body.data.unreadCount).toBe(0);
    });
  });
};
