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

    it("accepts the driver user id for bus creation while preserving legacy driver profile ids", async () => {
      const adminLogin = await context.loginAsAdmin();

      const createWithUserIdResponse = await context.createBus(adminLogin.accessToken, {
        plateNumber: "BUS-USER-ID",
        driverId: "1004"
      });
      const createWithProfileIdResponse = await context.createBus(adminLogin.accessToken, {
        plateNumber: "BUS-PROFILE-ID",
        driverId: "1"
      });
      const createWithNonDriverUserResponse = await context.createBus(adminLogin.accessToken, {
        plateNumber: "BUS-NON-DRIVER",
        driverId: "1001"
      });

      expect(createWithUserIdResponse.status).toBe(201);
      expect(createWithUserIdResponse.body.data.driver.userId).toBe("1004");
      expect(createWithUserIdResponse.body.data.driver.driverId).toBe("1");

      expect(createWithProfileIdResponse.status).toBe(201);
      expect(createWithProfileIdResponse.body.data.driver.userId).toBe("1004");
      expect(createWithProfileIdResponse.body.data.driver.driverId).toBe("1");

      expect(createWithNonDriverUserResponse.status).toBe(404);
      expect(createWithNonDriverUserResponse.body.message).toBe("Driver not found");
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

    it("manages recurring route assignments and ensures daily trips without duplicates", async () => {
      const adminLogin = await context.loginAsAdmin();
      const driverLogin = await context.loginAsDriver();

      const routeResponse = await context.createRoute(adminLogin.accessToken);
      const routeId = routeResponse.body.data.id as string;
      await context.createRouteStop(adminLogin.accessToken, routeId);
      const busResponse = await context.createBus(adminLogin.accessToken);
      const busId = busResponse.body.data.id as string;

      const createRouteAssignmentResponse = await context.createRouteAssignment(
        adminLogin.accessToken,
        {
          busId,
          routeId,
          startDate: "2026-03-13"
        }
      );
      const routeAssignmentId = createRouteAssignmentResponse.body.data.routeAssignmentId as string;

      const listRouteAssignmentsResponse = await request(context.app)
        .get("/api/v1/transport/route-assignments")
        .set("Authorization", `Bearer ${adminLogin.accessToken}`);
      const myRouteAssignmentsResponse = await request(context.app)
        .get("/api/v1/transport/route-assignments/me")
        .set("Authorization", `Bearer ${driverLogin.accessToken}`);
      const ensureDailyResponse = await context.ensureDailyTrip(driverLogin.accessToken, {
        routeAssignmentId,
        tripDate: "2026-03-13",
        tripType: "pickup"
      });
      const ensureDailyAgainResponse = await context.ensureDailyTrip(driverLogin.accessToken, {
        routeAssignmentId,
        tripDate: "2026-03-13",
        tripType: "pickup"
      });

      expect(createRouteAssignmentResponse.status).toBe(201);
      expect(listRouteAssignmentsResponse.status).toBe(200);
      expect(listRouteAssignmentsResponse.body.data).toHaveLength(1);
      expect(myRouteAssignmentsResponse.status).toBe(200);
      expect(myRouteAssignmentsResponse.body.data).toHaveLength(1);
      expect(myRouteAssignmentsResponse.body.data[0].bus.id).toBe(busId);
      expect(ensureDailyResponse.status).toBe(200);
      expect(ensureDailyResponse.body.data.created).toBe(true);
      expect(ensureDailyResponse.body.data.trip.tripStatus).toBe("scheduled");
      expect(ensureDailyAgainResponse.status).toBe(200);
      expect(ensureDailyAgainResponse.body.data.created).toBe(false);
      expect(ensureDailyAgainResponse.body.data.trip.id).toBe(
        ensureDailyResponse.body.data.trip.id
      );
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

    it("returns the full trip student roster including not-yet-marked students and derived last-event state", async () => {
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
      await context.saveStudentHomeLocation(adminLogin.accessToken, "1", {
        addressLabel: "Student One Home",
        addressText: "Behind the neighborhood mosque",
        latitude: 15.4411,
        longitude: 44.2411
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

      await request(context.app)
        .post(`/api/v1/transport/trips/${tripId}/events`)
        .set("Authorization", `Bearer ${driverLogin.accessToken}`)
        .send({
          studentId: "1",
          eventType: "boarded",
          stopId: firstStopResponse.body.data.stopId
        });

      const rosterResponse = await request(context.app)
        .get(`/api/v1/transport/trips/${tripId}/students`)
        .set("Authorization", `Bearer ${driverLogin.accessToken}`);
      const filteredRosterResponse = await request(context.app)
        .get(`/api/v1/transport/trips/${tripId}/students`)
        .query({
          search: "Student Two",
          stopId: secondStopResponse.body.data.stopId
        })
        .set("Authorization", `Bearer ${driverLogin.accessToken}`);

      expect(rosterResponse.status).toBe(200);
      expect(rosterResponse.body.data.tripId).toBe(tripId);
      expect(rosterResponse.body.data.tripStatus).toBe("started");
      expect(rosterResponse.body.data.students).toHaveLength(2);
      expect(rosterResponse.body.data.students[0]).toMatchObject({
        studentId: "1",
        academicNo: "STU-1001",
        fullName: "Student One",
        assignedStop: {
          stopId: firstStopResponse.body.data.stopId,
          stopName: "Main Stop",
          latitude: 14.2233445,
          longitude: 44.2233445,
          stopOrder: 1
        },
        homeLocation: {
          latitude: 15.4411,
          longitude: 44.2411,
          addressLabel: "Student One Home",
          addressText: "Behind the neighborhood mosque"
        },
        currentTripEventType: "boarded",
        lastEvent: {
          eventType: "boarded",
          stopId: firstStopResponse.body.data.stopId
        }
      });
      expect(rosterResponse.body.data.students[0].lastEvent.eventTime).toBeTypeOf("string");
      expect(rosterResponse.body.data.students[1]).toMatchObject({
        studentId: "2",
        academicNo: "STU-1002",
        fullName: "Student Two",
        assignedStop: {
          stopId: secondStopResponse.body.data.stopId,
          stopName: "Second Stop",
          latitude: 14.2233445,
          longitude: 44.2233445,
          stopOrder: 2
        },
        homeLocation: null,
        currentTripEventType: "not_marked",
        lastEvent: {
          eventType: null,
          eventTime: null,
          stopId: null
        }
      });
      expect(filteredRosterResponse.status).toBe(200);
      expect(filteredRosterResponse.body.data.students).toHaveLength(1);
      expect(filteredRosterResponse.body.data.students[0].studentId).toBe("2");
    });

    it("validates trip student events against assignment coverage on the trip date", async () => {
      const adminLogin = await context.loginAsAdmin();
      const driverLogin = await context.loginAsDriver();

      const routeResponse = await context.createRoute(adminLogin.accessToken);
      const routeId = routeResponse.body.data.id as string;
      const stopResponse = await context.createRouteStop(adminLogin.accessToken, routeId);
      const busResponse = await context.createBus(adminLogin.accessToken);
      const busId = busResponse.body.data.id as string;

      await context.createAssignment(adminLogin.accessToken, {
        studentId: "1",
        routeId,
        stopId: stopResponse.body.data.stopId as string,
        startDate: "2026-03-20"
      });

      const tripResponse = await context.createTrip(driverLogin.accessToken, {
        busId,
        routeId,
        tripDate: "2026-03-13",
        tripType: "pickup"
      });
      const tripId = tripResponse.body.data.id as string;

      await request(context.app)
        .post(`/api/v1/transport/trips/${tripId}/start`)
        .set("Authorization", `Bearer ${driverLogin.accessToken}`)
        .send({});

      const eventResponse = await request(context.app)
        .post(`/api/v1/transport/trips/${tripId}/events`)
        .set("Authorization", `Bearer ${driverLogin.accessToken}`)
        .send({
          studentId: "1",
          eventType: "boarded",
          stopId: stopResponse.body.data.stopId
        });

      expect(eventResponse.status).toBe(400);
      expect(eventResponse.body.errors[0].code).toBe("STUDENT_TRIP_DATE_ASSIGNMENT_NOT_FOUND");
    });
  });
};
