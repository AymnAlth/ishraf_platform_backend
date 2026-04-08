import { createHash } from "node:crypto";

import request from "supertest";
import { describe, expect, it, vi } from "vitest";

import { firebaseRealtimeAuthService } from "../../../src/integrations/firebase/firebase-realtime-auth.service";
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

    it("records stop attendance, closes the stop snapshot, and finalizes trip status to completed", async () => {
      const adminLogin = await context.loginAsAdmin();
      const driverLogin = await context.loginAsDriver();

      const routeResponse = await context.createRoute(adminLogin.accessToken, {
        routeName: "Attendance Finalization Route"
      });
      const routeId = routeResponse.body.data.id as string;
      const stopResponse = await context.createRouteStop(adminLogin.accessToken, routeId, {
        stopName: "Attendance Stop",
        stopOrder: 1,
        latitude: 14.2,
        longitude: 44.2
      });
      const stopId = stopResponse.body.data.stopId as string;
      const busResponse = await context.createBus(adminLogin.accessToken, {
        plateNumber: "BUS-ATT-001"
      });
      const busId = busResponse.body.data.id as string;

      await context.createAssignment(adminLogin.accessToken, {
        studentId: "1",
        routeId,
        stopId,
        startDate: "2026-03-13"
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

      await context.pool.query(
        `
          INSERT INTO transport_trip_eta_stop_snapshots (
            trip_id,
            stop_id,
            stop_order,
            stop_name,
            eta_at,
            remaining_distance_meters,
            remaining_duration_seconds,
            is_next_stop,
            is_completed,
            approaching_notified,
            arrived_notified,
            updated_at
          )
          VALUES ($1, $2, 1, 'Attendance Stop', NOW(), 120, 45, TRUE, FALSE, FALSE, FALSE, NOW())
        `,
        [tripId, stopId]
      );

      const attendanceResponse = await request(context.app)
        .post(`/api/v1/transport/trips/${tripId}/stops/${stopId}/attendance`)
        .set("Authorization", `Bearer ${driverLogin.accessToken}`)
        .send({
          attendances: [{ studentId: "1", status: "present" }]
        });

      const tripStatusRow = await context.pool.query<{
        trip_status: string;
        ended_at: string | null;
      }>(
        `
          SELECT trip_status, ended_at::text
          FROM trips
          WHERE id = $1
          LIMIT 1
        `,
        [tripId]
      );
      const eventRow = await context.pool.query<{ event_type: string }>(
        `
          SELECT event_type
          FROM trip_student_events
          WHERE trip_id = $1
            AND student_id = 1
          ORDER BY id DESC
          LIMIT 1
        `,
        [tripId]
      );
      const stopSnapshotRow = await context.pool.query<{
        is_completed: boolean;
        remaining_distance_meters: string | null;
      }>(
        `
          SELECT is_completed, remaining_distance_meters::text
          FROM transport_trip_eta_stop_snapshots
          WHERE trip_id = $1
            AND stop_id = $2
          LIMIT 1
        `,
        [tripId, stopId]
      );

      const locationAfterCompletionResponse = await request(context.app)
        .post(`/api/v1/transport/trips/${tripId}/locations`)
        .set("Authorization", `Bearer ${driverLogin.accessToken}`)
        .send({
          latitude: 14.21,
          longitude: 44.21
        });

      expect(attendanceResponse.status).toBe(200);
      expect(attendanceResponse.body.data.tripStatus).toBe("completed");
      expect(attendanceResponse.body.data.tripCompleted).toBe(true);
      expect(attendanceResponse.body.data.stopCompleted).toBe(true);
      expect(attendanceResponse.body.data.recordedEvents[0].eventType).toBe("boarded");
      expect(tripStatusRow.rows[0]?.trip_status).toBe("completed");
      expect(tripStatusRow.rows[0]?.ended_at).not.toBeNull();
      expect(eventRow.rows[0]?.event_type).toBe("boarded");
      expect(stopSnapshotRow.rows[0]?.is_completed).toBe(true);
      expect(stopSnapshotRow.rows[0]?.remaining_distance_meters).toBe("0");
      expect(locationAfterCompletionResponse.status).toBe(400);
    });

    it("returns trip ETA snapshots for driver and admin without changing trip location semantics", async () => {
      const adminLogin = await context.loginAsAdmin();
      const driverLogin = await context.loginAsDriver();

      const routeResponse = await context.createRoute(adminLogin.accessToken, {
        routeName: "ETA Route"
      });
      const routeId = routeResponse.body.data.id as string;
      const firstStopResponse = await context.createRouteStop(adminLogin.accessToken, routeId, {
        stopName: "ETA Stop 1",
        latitude: 14.2,
        longitude: 44.2,
        stopOrder: 1
      });
      const secondStopResponse = await context.createRouteStop(adminLogin.accessToken, routeId, {
        stopName: "ETA Stop 2",
        latitude: 14.2,
        longitude: 44.21,
        stopOrder: 2
      });
      const busResponse = await context.createBus(adminLogin.accessToken, {
        plateNumber: "BUS-ETA-001"
      });
      const tripResponse = await context.createTrip(driverLogin.accessToken, {
        busId: busResponse.body.data.id as string,
        routeId
      });
      const tripId = tripResponse.body.data.id as string;

      await request(context.app)
        .post(`/api/v1/transport/trips/${tripId}/start`)
        .set("Authorization", `Bearer ${driverLogin.accessToken}`)
        .send({});
      const locationResponse = await request(context.app)
        .post(`/api/v1/transport/trips/${tripId}/locations`)
        .set("Authorization", `Bearer ${driverLogin.accessToken}`)
        .send({
          latitude: 14.2,
          longitude: 44.205
        });
      const stopSignatureHash = createHash("sha256")
        .update(
          JSON.stringify([
            {
              stopId: firstStopResponse.body.data.stopId,
              stopOrder: 1,
              latitude: 14.2,
              longitude: 44.2
            },
            {
              stopId: secondStopResponse.body.data.stopId,
              stopOrder: 2,
              latitude: 14.2,
              longitude: 44.21
            }
          ])
        )
        .digest("hex");
      const routeMapCacheInsert = await context.pool.query<{ id: string }>(
        `
          INSERT INTO transport_route_map_cache (
            route_id,
            stop_signature_hash,
            provider_key,
            encoded_polyline,
            total_distance_meters,
            total_duration_seconds,
            stop_metrics_json
          )
          VALUES ($1, $2, 'googleRoutes', '', 1000, 120, $3::jsonb)
          RETURNING id::text AS id
        `,
        [
          routeId,
          stopSignatureHash,
          JSON.stringify([
            {
              stopId: firstStopResponse.body.data.stopId,
              stopOrder: 1,
              cumulativeDistanceMeters: 0
            },
            {
              stopId: secondStopResponse.body.data.stopId,
              stopOrder: 2,
              cumulativeDistanceMeters: 1000
            }
          ])
        ]
      );

      await context.pool.query(
        `
          INSERT INTO transport_trip_eta_snapshots (
            trip_id,
            route_id,
            route_map_cache_id,
            status,
            calculation_mode,
            based_on_latitude,
            based_on_longitude,
            based_on_recorded_at,
            projected_distance_meters,
            remaining_distance_meters,
            remaining_duration_seconds,
            estimated_speed_mps,
            next_stop_id,
            next_stop_order,
            next_stop_eta_at,
            final_eta_at,
            provider_refreshed_at,
            computed_at,
            last_deviation_meters
          )
          VALUES (
            $1, $2, $3, 'fresh', 'provider_snapshot',
            14.2, 44.205, NOW(), 500, 500, 60, 8.3,
            $4, 2, NOW() + INTERVAL '60 seconds', NOW() + INTERVAL '60 seconds',
            NOW(), NOW(), 12
          )
        `,
        [tripId, routeId, routeMapCacheInsert.rows[0].id, secondStopResponse.body.data.stopId]
      );
      await context.pool.query(
        `
          INSERT INTO transport_trip_eta_stop_snapshots (
            trip_id,
            stop_id,
            stop_order,
            stop_name,
            eta_at,
            remaining_distance_meters,
            remaining_duration_seconds,
            is_next_stop,
            is_completed
          )
          VALUES
            ($1, $2, 1, 'ETA Stop 1', NULL, 0, 0, false, true),
            ($1, $3, 2, 'ETA Stop 2', NOW() + INTERVAL '60 seconds', 500, 60, true, false)
        `,
        [tripId, firstStopResponse.body.data.stopId, secondStopResponse.body.data.stopId]
      );

      const driverEtaResponse = await request(context.app)
        .get(`/api/v1/transport/trips/${tripId}/eta`)
        .set("Authorization", `Bearer ${driverLogin.accessToken}`);
      const adminEtaResponse = await request(context.app)
        .get(`/api/v1/transport/trips/${tripId}/eta`)
        .set("Authorization", `Bearer ${adminLogin.accessToken}`);

      expect(locationResponse.status).toBe(201);
      expect(driverEtaResponse.status).toBe(200);
      expect(driverEtaResponse.body.data.etaSummary).toMatchObject({
        status: "fresh",
        calculationMode: "provider_snapshot",
        nextStop: {
          stopId: secondStopResponse.body.data.stopId,
          stopName: "ETA Stop 2",
          stopOrder: 2
        },
        remainingDistanceMeters: 500,
        remainingDurationSeconds: 60
      });
      expect(driverEtaResponse.body.data.remainingStops).toHaveLength(2);
      expect(adminEtaResponse.status).toBe(200);
    });

    it("returns parent trip live-status with nearest active stop snapshot and enforces parent-trip ownership", async () => {
      const adminLogin = await context.loginAsAdmin();
      const driverLogin = await context.loginAsDriver();
      const linkedParent = await context.createAdditionalParentAccount({
        email: "batch6-parent-linked@example.com",
        phone: "01000000031"
      });
      const unrelatedParent = await context.createAdditionalParentAccount({
        email: "batch6-parent-unrelated@example.com",
        phone: "01000000032"
      });

      await request(context.app)
        .post("/api/v1/students/1/parents")
        .set("Authorization", `Bearer ${adminLogin.accessToken}`)
        .send({
          parentId: linkedParent.parentId,
          relationType: "father",
          isPrimary: false
        });
      await request(context.app)
        .post("/api/v1/students/2/parents")
        .set("Authorization", `Bearer ${adminLogin.accessToken}`)
        .send({
          parentId: linkedParent.parentId,
          relationType: "father",
          isPrimary: false
        });

      const routeResponse = await context.createRoute(adminLogin.accessToken, {
        routeName: "Batch6 Parent Live Route"
      });
      const routeId = routeResponse.body.data.id as string;
      const firstStopResponse = await context.createRouteStop(adminLogin.accessToken, routeId, {
        stopName: "Batch6 Stop 1",
        latitude: 14.61,
        longitude: 44.61,
        stopOrder: 1
      });
      const secondStopResponse = await context.createRouteStop(adminLogin.accessToken, routeId, {
        stopName: "Batch6 Stop 2",
        latitude: 14.62,
        longitude: 44.62,
        stopOrder: 2
      });
      const busResponse = await context.createBus(adminLogin.accessToken, {
        plateNumber: "BUS-B6-LIVE-001"
      });
      const busId = busResponse.body.data.id as string;

      await context.createAssignment(adminLogin.accessToken, {
        studentId: "1",
        routeId,
        stopId: firstStopResponse.body.data.stopId as string,
        startDate: "2026-03-13"
      });
      await context.createAssignment(adminLogin.accessToken, {
        studentId: "2",
        routeId,
        stopId: secondStopResponse.body.data.stopId as string,
        startDate: "2026-03-13"
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

      const stopSignatureHash = createHash("sha256")
        .update(
          JSON.stringify([
            {
              stopId: firstStopResponse.body.data.stopId,
              stopOrder: 1,
              latitude: 14.61,
              longitude: 44.61
            },
            {
              stopId: secondStopResponse.body.data.stopId,
              stopOrder: 2,
              latitude: 14.62,
              longitude: 44.62
            }
          ])
        )
        .digest("hex");

      const routeMapCacheInsert = await context.pool.query<{ id: string }>(
        `
          INSERT INTO transport_route_map_cache (
            route_id,
            stop_signature_hash,
            provider_key,
            encoded_polyline,
            total_distance_meters,
            total_duration_seconds,
            stop_metrics_json
          )
          VALUES ($1, $2, 'googleRoutes', $3, 1400, 210, $4::jsonb)
          RETURNING id::text AS id
        `,
        [
          routeId,
          stopSignatureHash,
          "encoded-batch6-live-polyline",
          JSON.stringify([
            {
              stopId: firstStopResponse.body.data.stopId,
              stopOrder: 1,
              cumulativeDistanceMeters: 0
            },
            {
              stopId: secondStopResponse.body.data.stopId,
              stopOrder: 2,
              cumulativeDistanceMeters: 1400
            }
          ])
        ]
      );

      await context.pool.query(
        `
          INSERT INTO transport_trip_eta_snapshots (
            trip_id,
            route_id,
            route_map_cache_id,
            status,
            calculation_mode,
            based_on_latitude,
            based_on_longitude,
            based_on_recorded_at,
            projected_distance_meters,
            remaining_distance_meters,
            remaining_duration_seconds,
            estimated_speed_mps,
            next_stop_id,
            next_stop_order,
            next_stop_eta_at,
            final_eta_at,
            provider_refreshed_at,
            computed_at,
            last_deviation_meters
          )
          VALUES (
            $1, $2, $3, 'fresh', 'provider_snapshot',
            14.615, 44.615, NOW(), 900, 900, 140, 6.4,
            $4, 1, NOW() + INTERVAL '140 seconds', NOW() + INTERVAL '140 seconds',
            NOW(), NOW(), 20
          )
        `,
        [tripId, routeId, routeMapCacheInsert.rows[0].id, firstStopResponse.body.data.stopId]
      );
      await context.pool.query(
        `
          INSERT INTO transport_trip_eta_stop_snapshots (
            trip_id,
            stop_id,
            stop_order,
            stop_name,
            eta_at,
            remaining_distance_meters,
            remaining_duration_seconds,
            is_next_stop,
            is_completed,
            approaching_notified,
            arrived_notified,
            updated_at
          )
          VALUES
            ($1, $2, 1, 'Batch6 Stop 1', NOW() + INTERVAL '75 seconds', 120, 75, true, false, true, false, NOW()),
            ($1, $3, 2, 'Batch6 Stop 2', NOW() + INTERVAL '160 seconds', 460, 160, false, false, false, false, NOW())
        `,
        [tripId, firstStopResponse.body.data.stopId, secondStopResponse.body.data.stopId]
      );

      const linkedParentLogin = await context.login(linkedParent.email, linkedParent.password);
      const unrelatedParentLogin = await context.login(unrelatedParent.email, unrelatedParent.password);

      const linkedResponse = await request(context.app)
        .get(`/api/v1/transport/trips/${tripId}/live-status`)
        .set("Authorization", `Bearer ${linkedParentLogin.body.data.tokens.accessToken}`);
      const unrelatedResponse = await request(context.app)
        .get(`/api/v1/transport/trips/${tripId}/live-status`)
        .set("Authorization", `Bearer ${unrelatedParentLogin.body.data.tokens.accessToken}`);

      expect(linkedResponse.status).toBe(200);
      expect(linkedResponse.body.data.tripId).toBe(tripId);
      expect(linkedResponse.body.data.tripStatus).toBe("started");
      expect(linkedResponse.body.data.firebaseRtdbPath).toBe(
        `/transport/live-trips/${tripId}/latestLocation`
      );
      expect(linkedResponse.body.data.routePolyline).toEqual({
        encodedPolyline: "encoded-batch6-live-polyline"
      });
      expect(linkedResponse.body.data.myStopSnapshot).toMatchObject({
        stopId: firstStopResponse.body.data.stopId,
        stopName: "Batch6 Stop 1",
        stopOrder: 1,
        remainingDistanceMeters: 120,
        remainingDurationSeconds: 75,
        isCompleted: false,
        approachingNotified: true,
        arrivedNotified: false
      });
      expect(unrelatedResponse.status).toBe(403);
    });

    it("returns admin trip summary for completed trips with attendance analytics", async () => {
      const adminLogin = await context.loginAsAdmin();
      const driverLogin = await context.loginAsDriver();

      const routeResponse = await context.createRoute(adminLogin.accessToken, {
        routeName: "Batch6 Summary Route"
      });
      const routeId = routeResponse.body.data.id as string;
      const stopResponse = await context.createRouteStop(adminLogin.accessToken, routeId, {
        stopName: "Batch6 Summary Stop",
        stopOrder: 1
      });
      const stopId = stopResponse.body.data.stopId as string;
      const busResponse = await context.createBus(adminLogin.accessToken, {
        plateNumber: "BUS-B6-SUMMARY-001"
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

      await context.pool.query(
        `
          INSERT INTO transport_trip_eta_stop_snapshots (
            trip_id,
            stop_id,
            stop_order,
            stop_name,
            eta_at,
            remaining_distance_meters,
            remaining_duration_seconds,
            is_next_stop,
            is_completed,
            approaching_notified,
            arrived_notified,
            updated_at
          )
          VALUES ($1, $2, 1, 'Batch6 Summary Stop', NOW(), 80, 45, TRUE, FALSE, FALSE, FALSE, NOW())
        `,
        [tripId, stopId]
      );

      const attendanceResponse = await request(context.app)
        .post(`/api/v1/transport/trips/${tripId}/stops/${stopId}/attendance`)
        .set("Authorization", `Bearer ${driverLogin.accessToken}`)
        .send({
          attendances: [
            { studentId: "1", status: "present" },
            { studentId: "2", status: "absent" }
          ]
        });

      expect(attendanceResponse.status).toBe(200);
      expect(attendanceResponse.body.data.tripStatus).toBe("completed");

      const summaryResponse = await request(context.app)
        .get(`/api/v1/transport/trips/${tripId}/summary`)
        .set("Authorization", `Bearer ${adminLogin.accessToken}`);

      expect(summaryResponse.status).toBe(200);
      expect(summaryResponse.body.data).toMatchObject({
        tripId,
        tripStatus: "completed",
        scheduledStartTime: null,
        startDelayMinutes: null,
        attendance: {
          totalStudents: 2,
          presentCount: 1,
          absentCount: 1
        }
      });
      expect(summaryResponse.body.data.actualStartTime).toBeTypeOf("string");
      expect(summaryResponse.body.data.actualEndTime).toBeTypeOf("string");
    });

    it("rejects admin trip summary when trip status is not completed", async () => {
      const adminLogin = await context.loginAsAdmin();
      const driverLogin = await context.loginAsDriver();

      const routeResponse = await context.createRoute(adminLogin.accessToken, {
        routeName: "Batch6 Summary Reject Route"
      });
      const routeId = routeResponse.body.data.id as string;
      await context.createRouteStop(adminLogin.accessToken, routeId, {
        stopName: "Batch6 Summary Reject Stop"
      });
      const busResponse = await context.createBus(adminLogin.accessToken, {
        plateNumber: "BUS-B6-SUMMARY-REJECT-001"
      });
      const busId = busResponse.body.data.id as string;

      const tripResponse = await context.createTrip(driverLogin.accessToken, {
        busId,
        routeId,
        tripDate: "2026-03-13",
        tripType: "pickup"
      });
      const tripId = tripResponse.body.data.id as string;

      const summaryResponse = await request(context.app)
        .get(`/api/v1/transport/trips/${tripId}/summary`)
        .set("Authorization", `Bearer ${adminLogin.accessToken}`);

      expect(summaryResponse.status).toBe(409);
      expect(summaryResponse.body.errors).toContainEqual(
        expect.objectContaining({
          field: "tripStatus",
          code: "TRIP_SUMMARY_REQUIRES_COMPLETED_STATUS"
        })
      );
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
    it("issues realtime tokens for admin, driver owners, and linked parents while rejecting disabled or unrelated access", async () => {
      const adminLogin = await context.loginAsAdmin();
      const driverLogin = await context.loginAsDriver();

      const linkedParent = await context.createAdditionalParentAccount({
        fullName: "Realtime Parent",
        email: "realtime-parent@example.com",
        phone: "01000000018",
        password: "RealtimeParent1!"
      });
      const unrelatedParent = await context.createAdditionalParentAccount({
        fullName: "Unrelated Parent",
        email: "unrelated-parent@example.com",
        phone: "01000000019",
        password: "UnrelatedParent1!"
      });

      await request(context.app)
        .post("/api/v1/students/1/parents")
        .set("Authorization", `Bearer ${adminLogin.accessToken}`)
        .send({
          parentId: linkedParent.parentId,
          relationType: "father",
          isPrimary: true
        });

      const linkedParentLogin = await context.login(linkedParent.email, linkedParent.password);
      const unrelatedParentLogin = await context.login(unrelatedParent.email, unrelatedParent.password);

      expect(linkedParentLogin.status).toBe(200);
      expect(unrelatedParentLogin.status).toBe(200);

      const linkedParentAccessToken = linkedParentLogin.body.data.tokens.accessToken as string;
      const unrelatedParentAccessToken = unrelatedParentLogin.body.data.tokens.accessToken as string;

      const routeResponse = await context.createRoute(adminLogin.accessToken, {
        routeName: "Realtime Route"
      });
      const routeId = routeResponse.body.data.id as string;
      const stopResponse = await context.createRouteStop(adminLogin.accessToken, routeId, {
        stopName: "Realtime Stop"
      });
      const stopId = stopResponse.body.data.stopId as string;
      const busResponse = await context.createBus(adminLogin.accessToken, {
        plateNumber: "BUS-REALTIME-001"
      });
      const busId = busResponse.body.data.id as string;

      await context.createAssignment(adminLogin.accessToken, {
        studentId: "1",
        routeId,
        stopId,
        startDate: "2026-03-13"
      });

      const tripResponse = await context.createTrip(driverLogin.accessToken, {
        busId,
        routeId,
        tripDate: "2026-03-13",
        tripType: "pickup"
      });
      const tripId = tripResponse.body.data.id as string;

      const disabledResponse = await request(context.app)
        .get("/api/v1/transport/realtime-token")
        .query({ tripId })
        .set("Authorization", `Bearer ${driverLogin.accessToken}`);

      expect(disabledResponse.status).toBe(409);
      expect(disabledResponse.body.errors).toContainEqual(
        expect.objectContaining({
          field: "group",
          code: "FEATURE_DISABLED"
        })
      );

      const enableRealtimeResponse = await request(context.app)
        .patch("/api/v1/system-settings/pushNotifications")
        .set("Authorization", `Bearer ${adminLogin.accessToken}`)
        .send({
          reason: "Enable realtime transport auth testing",
          values: {
            transportRealtimeEnabled: true
          }
        });

      expect(enableRealtimeResponse.status).toBe(200);

      const createDriverResponse = await request(context.app)
        .post("/api/v1/users")
        .set("Authorization", `Bearer ${adminLogin.accessToken}`)
        .send({
          fullName: "Second Driver",
          email: "second-driver@example.com",
          phone: "01000000020",
          password: "DriverTwo123!",
          role: "driver",
          profile: {
            licenseNumber: "DRV-SECOND-01",
            driverStatus: "active"
          }
        });

      expect(createDriverResponse.status).toBe(201);

      const secondDriverLogin = await context.login("second-driver@example.com", "DriverTwo123!");

      expect(secondDriverLogin.status).toBe(200);

      const isConfiguredSpy = vi.spyOn(firebaseRealtimeAuthService, "isConfigured").mockReturnValue(true);
      const createTokenSpy = vi
        .spyOn(firebaseRealtimeAuthService, "createTransportRealtimeToken")
        .mockImplementation(async ({ tripId: requestedTripId, access }) => ({
          customToken: `token-${access}-${requestedTripId}`,
          databaseUrl: "https://firebase.example.test",
          path: `/transport/live-trips/${requestedTripId}/latestLocation`,
          tripId: requestedTripId,
          access,
          refreshAfterSeconds: access === "write" ? 240 : 840
        }));

      try {
        const adminRealtimeResponse = await request(context.app)
          .get("/api/v1/transport/realtime-token")
          .query({ tripId })
          .set("Authorization", `Bearer ${adminLogin.accessToken}`);
        const driverRealtimeResponse = await request(context.app)
          .get("/api/v1/transport/realtime-token")
          .query({ tripId })
          .set("Authorization", `Bearer ${driverLogin.accessToken}`);
        const linkedParentRealtimeResponse = await request(context.app)
          .get("/api/v1/transport/realtime-token")
          .query({ tripId })
          .set("Authorization", `Bearer ${linkedParentAccessToken}`);
        const unrelatedParentRealtimeResponse = await request(context.app)
          .get("/api/v1/transport/realtime-token")
          .query({ tripId })
          .set("Authorization", `Bearer ${unrelatedParentAccessToken}`);
        const secondDriverRealtimeResponse = await request(context.app)
          .get("/api/v1/transport/realtime-token")
          .query({ tripId })
          .set("Authorization", `Bearer ${secondDriverLogin.body.data.tokens.accessToken}`);

        expect(adminRealtimeResponse.status).toBe(200);
        expect(adminRealtimeResponse.body.data).toMatchObject({
          tripId,
          access: "read",
          customToken: `token-read-${tripId}`,
          path: `/transport/live-trips/${tripId}/latestLocation`,
          refreshAfterSeconds: 840
        });
        expect(driverRealtimeResponse.status).toBe(200);
        expect(driverRealtimeResponse.body.data).toMatchObject({
          tripId,
          access: "write",
          customToken: `token-write-${tripId}`,
          refreshAfterSeconds: 240
        });
        expect(linkedParentRealtimeResponse.status).toBe(200);
        expect(linkedParentRealtimeResponse.body.data.access).toBe("read");
        expect(unrelatedParentRealtimeResponse.status).toBe(403);
        expect(secondDriverRealtimeResponse.status).toBe(403);
        expect(createTokenSpy).toHaveBeenCalledTimes(3);
      } finally {
        createTokenSpy.mockRestore();
        isConfiguredSpy.mockRestore();
      }
    });

    it("enqueues transport realtime outbox rows only after push notifications and realtime are enabled", async () => {
      const adminLogin = await context.loginAsAdmin();
      const driverLogin = await context.loginAsDriver();

      const routeResponse = await context.createRoute(adminLogin.accessToken, {
        routeName: "Push Route"
      });
      const routeId = routeResponse.body.data.id as string;
      const stopResponse = await context.createRouteStop(adminLogin.accessToken, routeId, {
        stopName: "Push Stop"
      });
      const stopId = stopResponse.body.data.stopId as string;
      const busResponse = await context.createBus(adminLogin.accessToken, {
        plateNumber: "BUS-PUSH-001"
      });
      const busId = busResponse.body.data.id as string;

      await context.createAssignment(adminLogin.accessToken, {
        studentId: "1",
        routeId,
        stopId,
        startDate: "2026-03-13"
      });

      const disabledTripResponse = await context.createTrip(driverLogin.accessToken, {
        busId,
        routeId,
        tripDate: "2026-03-13",
        tripType: "pickup"
      });
      const disabledTripId = disabledTripResponse.body.data.id as string;

      await request(context.app)
        .post(`/api/v1/transport/trips/${disabledTripId}/start`)
        .set("Authorization", `Bearer ${driverLogin.accessToken}`)
        .send({});
      await request(context.app)
        .post(`/api/v1/transport/trips/${disabledTripId}/events`)
        .set("Authorization", `Bearer ${driverLogin.accessToken}`)
        .send({
          studentId: "1",
          eventType: "dropped_off",
          stopId
        });
      await request(context.app)
        .post(`/api/v1/transport/trips/${disabledTripId}/end`)
        .set("Authorization", `Bearer ${driverLogin.accessToken}`)
        .send({});

      const disabledOutboxRows = await context.pool.query<{ count: string }>(
        `
          SELECT COUNT(*) AS count
          FROM integration_outbox
          WHERE provider_key = 'pushNotifications'
        `
      );

      expect(disabledOutboxRows.rows[0].count).toBe("0");

      const enablePushResponse = await request(context.app)
        .patch("/api/v1/system-settings/pushNotifications")
        .set("Authorization", `Bearer ${adminLogin.accessToken}`)
        .send({
          reason: "Enable push notifications for realtime transport rollout",
          values: {
            fcmEnabled: true,
            transportRealtimeEnabled: true
          }
        });

      expect(enablePushResponse.status).toBe(200);

      const enabledTripResponse = await context.createTrip(driverLogin.accessToken, {
        busId,
        routeId,
        tripDate: "2026-03-14",
        tripType: "pickup"
      });
      const enabledTripId = enabledTripResponse.body.data.id as string;

      const startEnabledTripResponse = await request(context.app)
        .post(`/api/v1/transport/trips/${enabledTripId}/start`)
        .set("Authorization", `Bearer ${driverLogin.accessToken}`)
        .send({});
      const eventEnabledTripResponse = await request(context.app)
        .post(`/api/v1/transport/trips/${enabledTripId}/events`)
        .set("Authorization", `Bearer ${driverLogin.accessToken}`)
        .send({
          studentId: "1",
          eventType: "dropped_off",
          stopId
        });
      const endEnabledTripResponse = await request(context.app)
        .post(`/api/v1/transport/trips/${enabledTripId}/end`)
        .set("Authorization", `Bearer ${driverLogin.accessToken}`)
        .send({});

      expect(startEnabledTripResponse.status).toBe(200);
      expect(eventEnabledTripResponse.status).toBe(201);
      expect(endEnabledTripResponse.status).toBe(200);

      const enabledOutboxRows = await context.pool.query<{ event_type: string }>(
        `
          SELECT event_type
          FROM integration_outbox
          WHERE provider_key = 'pushNotifications'
          ORDER BY id ASC
        `
      );

      expect(enabledOutboxRows.rows.map((row) => row.event_type)).toEqual([
        "fcm.transport.trip_started",
        "fcm.transport.trip_student_event",
        "fcm.transport.trip_ended"
      ]);
    });

    it("emits transport ETA outbox events from trip start and debounces heartbeats by UTC minute bucket", async () => {
      const toUtcMinuteBucket = (value: string): string => value.slice(0, 16);
      const adminLogin = await context.loginAsAdmin();
      const driverLogin = await context.loginAsDriver();

      const routeResponse = await context.createRoute(adminLogin.accessToken, {
        routeName: "ETA Outbox Route"
      });
      const routeId = routeResponse.body.data.id as string;
      const stopResponse = await context.createRouteStop(adminLogin.accessToken, routeId, {
        stopName: "ETA Outbox Stop"
      });
      const stopId = stopResponse.body.data.stopId as string;
      const busResponse = await context.createBus(adminLogin.accessToken, {
        plateNumber: "BUS-ETA-OUTBOX-001"
      });
      const busId = busResponse.body.data.id as string;

      await context.createAssignment(adminLogin.accessToken, {
        studentId: "1",
        routeId,
        stopId,
        startDate: "2026-03-13"
      });

      const tripResponse = await context.createTrip(driverLogin.accessToken, {
        busId,
        routeId,
        tripDate: "2026-03-13",
        tripType: "pickup"
      });
      const tripId = tripResponse.body.data.id as string;

      const startResponse = await request(context.app)
        .post(`/api/v1/transport/trips/${tripId}/start`)
        .set("Authorization", `Bearer ${driverLogin.accessToken}`)
        .send({});
      const firstLocationResponse = await request(context.app)
        .post(`/api/v1/transport/trips/${tripId}/locations`)
        .set("Authorization", `Bearer ${driverLogin.accessToken}`)
        .send({
          latitude: 14.221,
          longitude: 44.221
        });
      const secondLocationResponse = await request(context.app)
        .post(`/api/v1/transport/trips/${tripId}/locations`)
        .set("Authorization", `Bearer ${driverLogin.accessToken}`)
        .send({
          latitude: 14.222,
          longitude: 44.222
        });

      expect(startResponse.status).toBe(200);
      expect(firstLocationResponse.status).toBe(201);
      expect(secondLocationResponse.status).toBe(201);

      const etaOutboxRows = await context.pool.query<{
        event_type: string;
        idempotency_key: string | null;
        payload_json: {
          trigger?: string;
          tripId?: string;
          heartbeatRecordedAt?: string;
        };
      }>(
        `
          SELECT event_type, idempotency_key, payload_json
          FROM integration_outbox
          WHERE provider_key = 'transportMaps'
            AND aggregate_type = 'trip'
            AND aggregate_id = $1
          ORDER BY id ASC
        `,
        [tripId]
      );

      const tripStartedRows = etaOutboxRows.rows.filter(
        (row) => row.payload_json?.trigger === "trip_started"
      );
      const heartbeatRows = etaOutboxRows.rows.filter(
        (row) => row.payload_json?.trigger === "heartbeat"
      );
      const expectedHeartbeatBucketCount = new Set(
        [
          firstLocationResponse.body.data.recordedAt,
          secondLocationResponse.body.data.recordedAt
        ].map((value: string) => toUtcMinuteBucket(value))
      ).size;

      expect(tripStartedRows).toHaveLength(1);
      expect(tripStartedRows[0]).toMatchObject({
        event_type: "transport_eta_refresh",
        payload_json: {
          tripId,
          trigger: "trip_started"
        },
        idempotency_key: `eta:transport_eta_refresh:trip_started:${tripId}`
      });
      expect(heartbeatRows).toHaveLength(expectedHeartbeatBucketCount);
      expect(heartbeatRows.every((row) => row.event_type === "transport_eta_refresh")).toBe(true);
      expect(heartbeatRows.every((row) => row.idempotency_key?.includes(`heartbeat:${tripId}:`))).toBe(
        true
      );
    });
  });
};
