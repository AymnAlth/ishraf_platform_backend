import request from "supertest";
import { describe, expect, it } from "vitest";

import type { IntegrationTestContext } from "../../helpers/integration-context";

export const registerAutomationIntegrationTests = (
  context: IntegrationTestContext
): void => {
  describe("Automation", () => {
    it("creates automation notifications for absent attendance, negative behavior, trip start, and dropped-off events", async () => {
      const adminLogin = await context.loginAsAdmin();
      await context.seedTeacherAssignment("1", "1", "1", "1");

      const firstParent = await context.createAdditionalParentAccount({
        fullName: "Primary Active Parent",
        email: "active-parent-one@example.com",
        phone: "01000000016",
        password: "ActiveParent1!"
      });
      const secondParent = await context.createAdditionalParentAccount({
        fullName: "Second Active Parent",
        email: "active-parent-two@example.com",
        phone: "01000000017",
        password: "ActiveParent2!"
      });

      await request(context.app)
        .post("/api/v1/students/1/parents")
        .set("Authorization", `Bearer ${adminLogin.accessToken}`)
        .send({
          parentId: firstParent.parentId,
          relationType: "father",
          isPrimary: true
        });
      await request(context.app)
        .post("/api/v1/students/1/parents")
        .set("Authorization", `Bearer ${adminLogin.accessToken}`)
        .send({
          parentId: secondParent.parentId,
          relationType: "mother",
          isPrimary: false
        });
      await request(context.app)
        .post("/api/v1/students/2/parents")
        .set("Authorization", `Bearer ${adminLogin.accessToken}`)
        .send({
          parentId: firstParent.parentId,
          relationType: "father",
          isPrimary: true
        });

      const firstParentLogin = await context.login(firstParent.email, firstParent.password);
      const secondParentLogin = await context.login(secondParent.email, secondParent.password);

      expect(firstParentLogin.status).toBe(200);
      expect(secondParentLogin.status).toBe(200);

      const firstParentAccessToken = firstParentLogin.body.data.tokens.accessToken as string;
      const secondParentAccessToken = secondParentLogin.body.data.tokens.accessToken as string;

      const attendanceSessionResponse = await request(context.app)
        .post("/api/v1/attendance/sessions")
        .set("Authorization", `Bearer ${adminLogin.accessToken}`)
        .send({
          classId: "1",
          subjectId: "1",
          teacherId: "1",
          academicYearId: "1",
          semesterId: "1",
          sessionDate: "2026-03-13",
          periodNo: 1
        });

      expect(attendanceSessionResponse.status).toBe(201);

      const attendanceSaveResponse = await request(context.app)
        .put(`/api/v1/attendance/sessions/${attendanceSessionResponse.body.data.id}/records`)
        .set("Authorization", `Bearer ${adminLogin.accessToken}`)
        .send({
          records: [
            {
              studentId: "1",
              status: "absent"
            },
            {
              studentId: "2",
              status: "present"
            }
          ]
        });

      expect(attendanceSaveResponse.status).toBe(200);

      const firstParentAfterAbsent = await context.listMyNotifications(firstParentAccessToken);
      const secondParentAfterAbsent = await context.listMyNotifications(secondParentAccessToken);

      expect(
        firstParentAfterAbsent.body.data.items.filter(
          (notification: { notificationType: string }) =>
            notification.notificationType === "attendance_absent"
        )
      ).toHaveLength(1);
      expect(
        secondParentAfterAbsent.body.data.items.filter(
          (notification: { notificationType: string }) =>
            notification.notificationType === "attendance_absent"
        )
      ).toHaveLength(1);

      const behaviorResponse = await request(context.app)
        .post("/api/v1/behavior/records")
        .set("Authorization", `Bearer ${adminLogin.accessToken}`)
        .send({
          studentId: "1",
          behaviorCategoryId: "6",
          teacherId: "1",
          academicYearId: "1",
          semesterId: "1",
          behaviorDate: "2026-03-13",
          description: "Repeated disruption"
        });

      expect(behaviorResponse.status).toBe(201);

      const firstParentAfterBehavior = await context.listMyNotifications(firstParentAccessToken);
      const secondParentAfterBehavior = await context.listMyNotifications(secondParentAccessToken);

      expect(
        firstParentAfterBehavior.body.data.items.filter(
          (notification: { notificationType: string }) =>
            notification.notificationType === "behavior_negative"
        )
      ).toHaveLength(1);
      expect(
        secondParentAfterBehavior.body.data.items.filter(
          (notification: { notificationType: string }) =>
            notification.notificationType === "behavior_negative"
        )
      ).toHaveLength(1);

      const routeResponse = await context.createRoute(adminLogin.accessToken, {
        routeName: "Automation Route"
      });
      const routeId = routeResponse.body.data.id as string;
      const stopResponse = await context.createRouteStop(adminLogin.accessToken, routeId, {
        stopName: "Automation Stop"
      });
      const stopId = stopResponse.body.data.stopId as string;
      const busResponse = await context.createBus(adminLogin.accessToken, {
        plateNumber: "BUS-AUTO-001"
      });
      const busId = busResponse.body.data.id as string;

      await context.createAssignment(adminLogin.accessToken, {
        studentId: "1",
        routeId,
        stopId,
        startDate: "2026-03-13"
      });
      await context.createAssignment(adminLogin.accessToken, {
        studentId: "2",
        routeId,
        stopId,
        startDate: "2026-03-13"
      });

      const tripResponse = await context.createTrip(adminLogin.accessToken, {
        busId,
        routeId,
        tripDate: "2026-03-13",
        tripType: "pickup"
      });
      const tripId = tripResponse.body.data.id as string;

      const tripStartResponse = await request(context.app)
        .post(`/api/v1/transport/trips/${tripId}/start`)
        .set("Authorization", `Bearer ${adminLogin.accessToken}`)
        .send({});

      expect(tripStartResponse.status).toBe(200);

      const firstParentAfterTripStart = await context.listMyNotifications(firstParentAccessToken);
      const secondParentAfterTripStart = await context.listMyNotifications(secondParentAccessToken);

      expect(
        firstParentAfterTripStart.body.data.items.filter(
          (notification: { notificationType: string }) =>
            notification.notificationType === "transport_trip_started"
        )
      ).toHaveLength(2);
      expect(
        secondParentAfterTripStart.body.data.items.filter(
          (notification: { notificationType: string }) =>
            notification.notificationType === "transport_trip_started"
        )
      ).toHaveLength(1);

      const droppedOffResponse = await request(context.app)
        .post(`/api/v1/transport/trips/${tripId}/events`)
        .set("Authorization", `Bearer ${adminLogin.accessToken}`)
        .send({
          studentId: "1",
          eventType: "dropped_off",
          stopId
        });

      expect(droppedOffResponse.status).toBe(201);

      const firstParentAfterDroppedOff = await context.listMyNotifications(firstParentAccessToken);
      const secondParentAfterDroppedOff = await context.listMyNotifications(secondParentAccessToken);

      expect(
        firstParentAfterDroppedOff.body.data.items.filter(
          (notification: { notificationType: string }) =>
            notification.notificationType === "transport_student_dropped_off"
        )
      ).toHaveLength(1);
      expect(
        secondParentAfterDroppedOff.body.data.items.filter(
          (notification: { notificationType: string }) =>
            notification.notificationType === "transport_student_dropped_off"
        )
      ).toHaveLength(1);
      expect(firstParentAfterDroppedOff.body.data.unreadCount).toBeGreaterThanOrEqual(4);
    });
  });
};
