import request from "supertest";
import { describe, expect, it } from "vitest";

import type { IntegrationTestContext } from "../../helpers/integration-context";

export const registerTransportIntegrationTests = (
  context: IntegrationTestContext
): void => {
  describe("Transport", () => {
    it("creates and lists transport buses, routes, and stops while keeping static endpoints admin-only", async () => {
      const adminLogin = await context.loginAsAdmin();
      const driverLogin = await context.loginAsDriver();

      const createBusResponse = await context.createBus(adminLogin.accessToken);
      const createRouteResponse = await context.createRoute(adminLogin.accessToken);
      const routeId = createRouteResponse.body.data.id as string;
      const createStopResponse = await context.createRouteStop(adminLogin.accessToken, routeId);

      const listBusesResponse = await request(context.app)
        .get("/api/v1/transport/buses")
        .set("Authorization", `Bearer ${adminLogin.accessToken}`);
      const listStopsResponse = await request(context.app)
        .get(`/api/v1/transport/routes/${routeId}/stops`)
        .set("Authorization", `Bearer ${adminLogin.accessToken}`);
      const driverStaticResponse = await request(context.app)
        .get("/api/v1/transport/buses")
        .set("Authorization", `Bearer ${driverLogin.accessToken}`);

      expect(createBusResponse.status).toBe(201);
      expect(createBusResponse.body.data.driver.driverId).toBe("1");
      expect(createRouteResponse.status).toBe(201);
      expect(createStopResponse.status).toBe(201);
      expect(listBusesResponse.status).toBe(200);
      expect(listBusesResponse.body.data).toHaveLength(1);
      expect(listStopsResponse.status).toBe(200);
      expect(listStopsResponse.body.data[0].stopName).toBe("Main Stop");
      expect(driverStaticResponse.status).toBe(403);
    });

    it("creates active transport assignments, blocks duplicates, and allows reassignment after deactivation", async () => {
      const adminLogin = await context.loginAsAdmin();

      const routeResponse = await context.createRoute(adminLogin.accessToken);
      const routeId = routeResponse.body.data.id as string;
      const firstStopResponse = await context.createRouteStop(adminLogin.accessToken, routeId);
      const secondStopResponse = await context.createRouteStop(adminLogin.accessToken, routeId, {
        stopName: "Second Stop",
        stopOrder: 2
      });

      const firstAssignmentResponse = await context.createAssignment(adminLogin.accessToken, {
        studentId: "1",
        routeId,
        stopId: firstStopResponse.body.data.stopId as string
      });
      const duplicateAssignmentResponse = await context.createAssignment(adminLogin.accessToken, {
        studentId: "1",
        routeId,
        stopId: secondStopResponse.body.data.stopId as string
      });

      const deactivateResponse = await request(context.app)
        .patch(
          `/api/v1/transport/assignments/${firstAssignmentResponse.body.data.assignmentId}/deactivate`
        )
        .set("Authorization", `Bearer ${adminLogin.accessToken}`)
        .send({});

      const replacementAssignmentResponse = await context.createAssignment(adminLogin.accessToken, {
        studentId: "1",
        routeId,
        stopId: secondStopResponse.body.data.stopId as string
      });
      const activeAssignmentsResponse = await request(context.app)
        .get("/api/v1/transport/assignments/active")
        .set("Authorization", `Bearer ${adminLogin.accessToken}`);

      expect(firstAssignmentResponse.status).toBe(201);
      expect(duplicateAssignmentResponse.status).toBe(409);
      expect(deactivateResponse.status).toBe(200);
      expect(deactivateResponse.body.data.isActive).toBe(false);
      expect(replacementAssignmentResponse.status).toBe(201);
      expect(activeAssignmentsResponse.status).toBe(200);
      expect(activeAssignmentsResponse.body.data).toHaveLength(1);
      expect(activeAssignmentsResponse.body.data[0].stop.stopName).toBe("Second Stop");
    });

    it("creates trips, enforces status transitions, and records locations only while started", async () => {
      const adminLogin = await context.loginAsAdmin();
      const driverLogin = await context.loginAsDriver();

      const routeResponse = await context.createRoute(adminLogin.accessToken);
      const routeId = routeResponse.body.data.id as string;
      await context.createRouteStop(adminLogin.accessToken, routeId);
      await context.createRouteStop(adminLogin.accessToken, routeId, {
        stopName: "Second Stop",
        stopOrder: 2
      });
      const busResponse = await context.createBus(adminLogin.accessToken);
      const busId = busResponse.body.data.id as string;

      const createTripResponse = await context.createTrip(driverLogin.accessToken, {
        busId,
        routeId
      });
      const tripId = createTripResponse.body.data.id as string;

      const invalidEndResponse = await request(context.app)
        .post(`/api/v1/transport/trips/${tripId}/end`)
        .set("Authorization", `Bearer ${driverLogin.accessToken}`)
        .send({});
      const startResponse = await request(context.app)
        .post(`/api/v1/transport/trips/${tripId}/start`)
        .set("Authorization", `Bearer ${driverLogin.accessToken}`)
        .send({});
      const locationResponse = await request(context.app)
        .post(`/api/v1/transport/trips/${tripId}/locations`)
        .set("Authorization", `Bearer ${driverLogin.accessToken}`)
        .send({
          latitude: 14.2233445,
          longitude: 44.2233445
        });
      const endResponse = await request(context.app)
        .post(`/api/v1/transport/trips/${tripId}/end`)
        .set("Authorization", `Bearer ${driverLogin.accessToken}`)
        .send({});
      const locationAfterEndResponse = await request(context.app)
        .post(`/api/v1/transport/trips/${tripId}/locations`)
        .set("Authorization", `Bearer ${driverLogin.accessToken}`)
        .send({
          latitude: 14.3233445,
          longitude: 44.3233445
        });
      const tripDetailResponse = await request(context.app)
        .get(`/api/v1/transport/trips/${tripId}`)
        .set("Authorization", `Bearer ${driverLogin.accessToken}`);

      expect(createTripResponse.status).toBe(201);
      expect(createTripResponse.body.data.tripStatus).toBe("scheduled");
      expect(invalidEndResponse.status).toBe(400);
      expect(startResponse.status).toBe(200);
      expect(startResponse.body.data.tripStatus).toBe("started");
      expect(locationResponse.status).toBe(201);
      expect(endResponse.status).toBe(200);
      expect(endResponse.body.data.tripStatus).toBe("ended");
      expect(locationAfterEndResponse.status).toBe(400);
      expect(tripDetailResponse.status).toBe(200);
      expect(tripDetailResponse.body.data.routeStops).toHaveLength(2);
      expect(tripDetailResponse.body.data.latestLocation.latitude).toBeCloseTo(14.2233445);
    });

    it("records trip student events and returns trip detail summaries", async () => {
      const adminLogin = await context.loginAsAdmin();
      const driverLogin = await context.loginAsDriver();

      const routeResponse = await context.createRoute(adminLogin.accessToken);
      const routeId = routeResponse.body.data.id as string;
      const firstStopResponse = await context.createRouteStop(adminLogin.accessToken, routeId);
      const secondStopResponse = await context.createRouteStop(adminLogin.accessToken, routeId, {
        stopName: "Second Stop",
        stopOrder: 2
      });
      const busResponse = await context.createBus(adminLogin.accessToken);
      const busId = busResponse.body.data.id as string;

      await context.createAssignment(adminLogin.accessToken, {
        studentId: "1",
        routeId,
        stopId: firstStopResponse.body.data.stopId as string
      });
      await context.createAssignment(adminLogin.accessToken, {
        studentId: "2",
        routeId,
        stopId: secondStopResponse.body.data.stopId as string
      });

      const tripResponse = await context.createTrip(driverLogin.accessToken, {
        busId,
        routeId
      });
      const tripId = tripResponse.body.data.id as string;
      await request(context.app)
        .post(`/api/v1/transport/trips/${tripId}/start`)
        .set("Authorization", `Bearer ${driverLogin.accessToken}`)
        .send({});

      const boardedResponse = await request(context.app)
        .post(`/api/v1/transport/trips/${tripId}/events`)
        .set("Authorization", `Bearer ${driverLogin.accessToken}`)
        .send({
          studentId: "1",
          eventType: "boarded",
          stopId: firstStopResponse.body.data.stopId
        });
      const absentValidationResponse = await request(context.app)
        .post(`/api/v1/transport/trips/${tripId}/events`)
        .set("Authorization", `Bearer ${driverLogin.accessToken}`)
        .send({
          studentId: "2",
          eventType: "absent",
          stopId: secondStopResponse.body.data.stopId
        });
      const absentResponse = await request(context.app)
        .post(`/api/v1/transport/trips/${tripId}/events`)
        .set("Authorization", `Bearer ${driverLogin.accessToken}`)
        .send({
          studentId: "2",
          eventType: "absent"
        });
      const eventsResponse = await request(context.app)
        .get(`/api/v1/transport/trips/${tripId}/events`)
        .set("Authorization", `Bearer ${driverLogin.accessToken}`);
      const detailResponse = await request(context.app)
        .get(`/api/v1/transport/trips/${tripId}`)
        .set("Authorization", `Bearer ${driverLogin.accessToken}`);

      expect(boardedResponse.status).toBe(201);
      expect(boardedResponse.body.data.eventType).toBe("boarded");
      expect(absentValidationResponse.status).toBe(400);
      expect(absentResponse.status).toBe(201);
      expect(eventsResponse.status).toBe(200);
      expect(eventsResponse.body.data).toHaveLength(2);
      expect(detailResponse.status).toBe(200);
      expect(detailResponse.body.data.eventSummary.boardedCount).toBe(1);
      expect(detailResponse.body.data.eventSummary.absentCount).toBe(1);
    });
  });
};
