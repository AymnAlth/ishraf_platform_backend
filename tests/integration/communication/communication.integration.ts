import request from "supertest";
import { describe, expect, it } from "vitest";

import { AUTH_TEST_FIXTURES } from "../../fixtures/auth.fixture";
import type { IntegrationTestContext } from "../../helpers/integration-context";
import { SEEDED_DRIVER, SEEDED_SUPERVISOR } from "../../setup/seed-test-data";

export const registerCommunicationIntegrationTests = (
  context: IntegrationTestContext
): void => {
  const toAccessToken = (response: { status: number; body: { data?: { tokens?: { accessToken: string } } } }): string => {
    if (response.status !== 200 || !response.body.data?.tokens?.accessToken) {
      throw new Error(`Parent login failed with status ${response.status}`);
    }

    return response.body.data.tokens.accessToken;
  };

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

    it("allows admins to send bulk direct messages as individual copies", async () => {
      const adminLogin = await context.loginAsAdmin();
      const teacherLogin = await context.loginAsTeacher();
      const supervisorLogin = await context.loginAsSupervisor();
      const driverLogin = await context.loginAsDriver();

      const bulkResponse = await request(context.app)
        .post("/api/v1/communication/messages/bulk")
        .set("Authorization", `Bearer ${adminLogin.accessToken}`)
        .send({
          receiverUserIds: [SEEDED_SUPERVISOR.id],
          targetRoles: ["teacher", "driver"],
          messageBody: "Operational update for today"
        });
      const teacherInbox = await request(context.app)
        .get("/api/v1/communication/messages/inbox")
        .set("Authorization", `Bearer ${teacherLogin.accessToken}`);
      const supervisorInbox = await request(context.app)
        .get("/api/v1/communication/messages/inbox")
        .set("Authorization", `Bearer ${supervisorLogin.accessToken}`);
      const driverInbox = await request(context.app)
        .get("/api/v1/communication/messages/inbox")
        .set("Authorization", `Bearer ${driverLogin.accessToken}`);

      expect(bulkResponse.status).toBe(201);
      expect(bulkResponse.body.data).toMatchObject({
        resolvedRecipients: 3,
        duplicatesRemoved: 0,
        successCount: 3,
        failedCount: 0
      });
      expect(teacherInbox.status).toBe(200);
      expect(supervisorInbox.status).toBe(200);
      expect(driverInbox.status).toBe(200);
      expect(teacherInbox.body.data.messages).toHaveLength(1);
      expect(supervisorInbox.body.data.messages).toHaveLength(1);
      expect(driverInbox.body.data.messages).toHaveLength(1);
      expect(teacherInbox.body.data.messages[0].messageBody).toBe("Operational update for today");
      expect(supervisorInbox.body.data.messages[0].messageBody).toBe(
        "Operational update for today"
      );
      expect(driverInbox.body.data.messages[0].messageBody).toBe("Operational update for today");
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

    it("supports multi-role announcements without changing all-users visibility", async () => {
      const adminLogin = await context.loginAsAdmin();
      const teacherLogin = await context.loginAsTeacher();
      const driverLogin = await context.loginAsDriver();
      const supervisorLogin = await context.loginAsSupervisor();

      const multiRoleAnnouncement = await context.createAnnouncement(adminLogin.accessToken, {
        title: "Shared notice",
        content: "Teachers and drivers should review the updated roster",
        targetRole: null,
        targetRoles: ["teacher", "driver"]
      });
      const allUsersAnnouncement = await context.createAnnouncement(adminLogin.accessToken, {
        title: "General notice",
        content: "This is for everyone",
        targetRole: null
      });

      const teacherFeedResponse = await request(context.app)
        .get("/api/v1/communication/announcements/active")
        .set("Authorization", `Bearer ${teacherLogin.accessToken}`);
      const driverFeedResponse = await request(context.app)
        .get("/api/v1/communication/announcements/active")
        .set("Authorization", `Bearer ${driverLogin.accessToken}`);
      const supervisorFeedResponse = await request(context.app)
        .get("/api/v1/communication/announcements/active")
        .set("Authorization", `Bearer ${supervisorLogin.accessToken}`);

      expect(multiRoleAnnouncement.status).toBe(201);
      expect(multiRoleAnnouncement.body.data.targetRole).toBeNull();
      expect(multiRoleAnnouncement.body.data.targetRoles).toEqual(["driver", "teacher"]);
      expect(allUsersAnnouncement.status).toBe(201);
      expect(
        teacherFeedResponse.body.data.some((item: { title: string }) => item.title === "Shared notice")
      ).toBe(true);
      expect(
        driverFeedResponse.body.data.some((item: { title: string }) => item.title === "Shared notice")
      ).toBe(true);
      expect(
        supervisorFeedResponse.body.data.some((item: { title: string }) => item.title === "Shared notice")
      ).toBe(false);
      expect(
        teacherFeedResponse.body.data.some((item: { title: string }) => item.title === "General notice")
      ).toBe(true);
      expect(
        driverFeedResponse.body.data.some((item: { title: string }) => item.title === "General notice")
      ).toBe(true);
      expect(
        supervisorFeedResponse.body.data.some((item: { title: string }) => item.title === "General notice")
      ).toBe(true);
    });

    it("creates notifications, returns personal notification feeds, and protects read ownership", async () => {
      const adminLogin = await context.loginAsAdmin();
      const teacherLogin = await context.loginAsTeacher();
      const driverLogin = await context.loginAsDriver();

      const createNotificationResponse = await context.createNotification(adminLogin.accessToken, {
        userId: AUTH_TEST_FIXTURES.activePhoneUser.id,
        title: "New announcement",
        message: "Please review the new general announcement",
        notificationType: "announcement",
        referenceType: "announcement",
        referenceId: "1"
      });
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

    it("allows admins to send bulk notifications using mixed selectors", async () => {
      const adminLogin = await context.loginAsAdmin();
      const teacherLogin = await context.loginAsTeacher();
      const supervisorLogin = await context.loginAsSupervisor();
      const driverLogin = await context.loginAsDriver();

      const bulkResponse = await request(context.app)
        .post("/api/v1/communication/notifications/bulk")
        .set("Authorization", `Bearer ${adminLogin.accessToken}`)
        .send({
          userIds: [SEEDED_SUPERVISOR.id],
          targetRoles: ["teacher", "driver"],
          title: "Operations reminder",
          message: "Please check the updated plan",
          notificationType: "operations"
        });
      const teacherNotifications = await request(context.app)
        .get("/api/v1/communication/notifications/me")
        .set("Authorization", `Bearer ${teacherLogin.accessToken}`);
      const supervisorNotifications = await request(context.app)
        .get("/api/v1/communication/notifications/me")
        .set("Authorization", `Bearer ${supervisorLogin.accessToken}`);
      const driverNotifications = await request(context.app)
        .get("/api/v1/communication/notifications/me")
        .set("Authorization", `Bearer ${driverLogin.accessToken}`);

      expect(bulkResponse.status).toBe(201);
      expect(bulkResponse.body.data).toMatchObject({
        resolvedRecipients: 3,
        successCount: 3,
        failedCount: 0
      });
      expect(teacherNotifications.body.data.notifications).toHaveLength(1);
      expect(supervisorNotifications.body.data.notifications).toHaveLength(1);
      expect(driverNotifications.body.data.notifications).toHaveLength(1);
      expect(teacherNotifications.body.data.notifications[0].notificationType).toBe("operations");
      expect(supervisorNotifications.body.data.notifications[0].notificationType).toBe(
        "operations"
      );
      expect(driverNotifications.body.data.notifications[0].notificationType).toBe("operations");
    });

    it("blocks non-admin users from the new bulk communication endpoints", async () => {
      const teacherLogin = await context.loginAsTeacher();

      const bulkMessagesResponse = await request(context.app)
        .post("/api/v1/communication/messages/bulk")
        .set("Authorization", `Bearer ${teacherLogin.accessToken}`)
        .send({
          receiverUserIds: [SEEDED_DRIVER.id],
          messageBody: "Unauthorized attempt"
        });
      const bulkNotificationsResponse = await request(context.app)
        .post("/api/v1/communication/notifications/bulk")
        .set("Authorization", `Bearer ${teacherLogin.accessToken}`)
        .send({
          userIds: [SEEDED_DRIVER.id],
          title: "Unauthorized attempt",
          message: "Unauthorized attempt",
          notificationType: "ops"
        });

      expect(bulkMessagesResponse.status).toBe(403);
      expect(bulkNotificationsResponse.status).toBe(403);
    });

    it("lists available message recipients for the authenticated user with search and role filtering", async () => {
      const driverLogin = await context.loginAsDriver();

      const recipientsResponse = await request(context.app)
        .get("/api/v1/communication/recipients")
        .set("Authorization", `Bearer ${driverLogin.accessToken}`);
      const filteredResponse = await request(context.app)
        .get("/api/v1/communication/recipients")
        .query({
          search: "Supervisor",
          role: "supervisor"
        })
        .set("Authorization", `Bearer ${driverLogin.accessToken}`);

      expect(recipientsResponse.status).toBe(200);
      expect(recipientsResponse.body.data.items).toHaveLength(3);
      expect(recipientsResponse.body.data.pagination).toMatchObject({
        page: 1,
        limit: 20,
        totalItems: 3,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false
      });
      expect(
        recipientsResponse.body.data.items.some(
          (recipient: { userId: string }) => recipient.userId === SEEDED_DRIVER.id
        )
      ).toBe(false);
      expect(filteredResponse.status).toBe(200);
      expect(filteredResponse.body.data.items).toHaveLength(1);
      expect(filteredResponse.body.data.items[0]).toMatchObject({
        fullName: "Mona Supervisor",
        role: "supervisor"
      });
    });

    it("returns only parent-scoped contacts and enforces the same scope for direct messages", async () => {
      const adminLogin = await context.loginAsAdmin();
      const parentAccount = await context.createAdditionalParentAccount();
      const additionalTeacher = await context.createAdditionalTeacher();

      await context.pool.query(
        `
          INSERT INTO student_parents (
            student_id,
            parent_id,
            relation_type,
            is_primary
          )
          VALUES ($1, $2, $3, $4)
        `,
        ["1", parentAccount.parentId, "mother", false]
      );

      await context.seedTeacherAssignment("1", "1", "1", "1");
      await context.seedSupervisorAssignment("1", "1", "1");

      const routeResponse = await context.createRoute(adminLogin.accessToken, {
        routeName: "Parent Contact Route"
      });
      const routeId = routeResponse.body.data.id as string;
      const stopResponse = await context.createRouteStop(adminLogin.accessToken, routeId, {
        stopName: "Parent Contact Stop"
      });
      const stopId = stopResponse.body.data.id as string;
      const busResponse = await context.createBus(adminLogin.accessToken, {
        plateNumber: "BUS-PC-001"
      });
      const busId = busResponse.body.data.id as string;

      await context.createRouteAssignment(adminLogin.accessToken, {
        busId,
        routeId,
        startDate: "2026-03-13"
      });
      await context.createAssignment(adminLogin.accessToken, {
        studentId: "1",
        routeId,
        stopId,
        startDate: "2026-03-13"
      });

      const parentAccessToken = toAccessToken(
        await context.login(parentAccount.email, parentAccount.password)
      );

      const recipientsResponse = await request(context.app)
        .get("/api/v1/communication/recipients/parent-contacts")
        .set("Authorization", `Bearer ${parentAccessToken}`);
      const allowedMessageResponse = await request(context.app)
        .post("/api/v1/communication/messages")
        .set("Authorization", `Bearer ${parentAccessToken}`)
        .send({
          receiverUserId: AUTH_TEST_FIXTURES.activePhoneUser.id,
          messageBody: "Can we review this week's progress?"
        });
      const blockedMessageResponse = await request(context.app)
        .post("/api/v1/communication/messages")
        .set("Authorization", `Bearer ${parentAccessToken}`)
        .send({
          receiverUserId: additionalTeacher.userId,
          messageBody: "This teacher is not assigned to my child"
        });

      expect(recipientsResponse.status).toBe(200);
      expect(
        recipientsResponse.body.data.items.map((item: { userId: string }) => item.userId).sort()
      ).toEqual(
        [
          AUTH_TEST_FIXTURES.activeEmailUser.id,
          AUTH_TEST_FIXTURES.activePhoneUser.id,
          SEEDED_DRIVER.id,
          SEEDED_SUPERVISOR.id
        ].sort()
      );
      expect(
        recipientsResponse.body.data.items.some(
          (item: { userId: string }) => item.userId === additionalTeacher.userId
        )
      ).toBe(false);
      expect(
        recipientsResponse.body.data.items.some(
          (item: { role: string }) => item.role === "parent"
        )
      ).toBe(false);
      expect(allowedMessageResponse.status).toBe(201);
      expect(blockedMessageResponse.status).toBe(403);
    });

    it("registers, updates, and unregisters FCM devices for the authenticated user", async () => {
      const teacherLogin = await context.loginAsTeacher();
      const driverLogin = await context.loginAsDriver();

      const registerResponse = await request(context.app)
        .post("/api/v1/communication/devices")
        .set("Authorization", `Bearer ${teacherLogin.accessToken}`)
        .send({
          providerKey: "fcm",
          platform: "android",
          appId: "teacher-app",
          deviceToken: "teacher-device-token-1",
          deviceName: "Teacher Pixel",
          subscriptions: ["transportRealtime"]
        });
      const deviceId = registerResponse.body.data.deviceId as string;

      const updateResponse = await request(context.app)
        .patch(`/api/v1/communication/devices/${deviceId}`)
        .set("Authorization", `Bearer ${teacherLogin.accessToken}`)
        .send({
          deviceToken: "teacher-device-token-2",
          deviceName: null,
          subscriptions: ["transportRealtime"]
        });
      const foreignUpdateResponse = await request(context.app)
        .patch(`/api/v1/communication/devices/${deviceId}`)
        .set("Authorization", `Bearer ${driverLogin.accessToken}`)
        .send({
          deviceName: "Foreign edit"
        });
      const unregisterResponse = await request(context.app)
        .delete(`/api/v1/communication/devices/${deviceId}`)
        .set("Authorization", `Bearer ${teacherLogin.accessToken}`);

      expect(registerResponse.status).toBe(201);
      expect(registerResponse.body.data).toMatchObject({
        providerKey: "fcm",
        platform: "android",
        appId: "teacher-app",
        deviceName: "Teacher Pixel",
        isActive: true,
        subscriptions: ["transportRealtime"]
      });
      expect(registerResponse.body.data.lastSeenAt).toBeTypeOf("string");
      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.data).toMatchObject({
        deviceId,
        deviceName: null,
        isActive: true,
        subscriptions: ["transportRealtime"]
      });
      expect(foreignUpdateResponse.status).toBe(404);
      expect(unregisterResponse.status).toBe(200);
      expect(unregisterResponse.body.data).toMatchObject({
        deviceId,
        isActive: false
      });
      expect(unregisterResponse.body.data.unregisteredAt).toBeTypeOf("string");
    });

    it("rebinds an existing device token to the latest authenticated user", async () => {
      const teacherLogin = await context.loginAsTeacher();
      const driverLogin = await context.loginAsDriver();

      const teacherRegisterResponse = await request(context.app)
        .post("/api/v1/communication/devices")
        .set("Authorization", `Bearer ${teacherLogin.accessToken}`)
        .send({
          providerKey: "fcm",
          platform: "android",
          appId: "teacher-app",
          deviceToken: "shared-device-token",
          deviceName: "Teacher Device",
          subscriptions: ["transportRealtime"]
        });
      const driverRegisterResponse = await request(context.app)
        .post("/api/v1/communication/devices")
        .set("Authorization", `Bearer ${driverLogin.accessToken}`)
        .send({
          providerKey: "fcm",
          platform: "android",
          appId: "driver-app",
          deviceToken: "shared-device-token",
          deviceName: "Driver Device",
          subscriptions: ["transportRealtime"]
        });
      const teacherUpdateResponse = await request(context.app)
        .patch(`/api/v1/communication/devices/${teacherRegisterResponse.body.data.deviceId}`)
        .set("Authorization", `Bearer ${teacherLogin.accessToken}`)
        .send({
          deviceName: "Teacher Still Owns It"
        });

      expect(teacherRegisterResponse.status).toBe(201);
      expect(driverRegisterResponse.status).toBe(201);
      expect(driverRegisterResponse.body.data).toMatchObject({
        appId: "driver-app",
        deviceName: "Driver Device",
        isActive: true
      });
      expect(teacherUpdateResponse.status).toBe(404);
    });
  });
};
