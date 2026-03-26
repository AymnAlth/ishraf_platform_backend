import { Router } from "express";

import { validateRequest } from "../../../common/middlewares/validation.middleware";
import { asyncHandler } from "../../../common/utils/async-handler";
import type { TransportController } from "../controller/transport.controller";
import { transportPolicies } from "../policies/transport.policy";
import {
  assignmentIdParamsSchema,
  createBusSchema,
  createRouteSchema,
  createRouteStopSchema,
  createStudentBusAssignmentSchema,
  createTransportRouteAssignmentSchema,
  createTripSchema,
  createTripStudentEventSchema,
  deactivateStudentBusAssignmentSchema,
  deactivateTransportRouteAssignmentSchema,
  ensureDailyTripSchema,
  listTripsQuerySchema,
  recordTripLocationSchema,
  routeIdParamsSchema,
  studentIdParamsSchema,
  tripIdParamsSchema,
  tripStudentRosterQuerySchema,
  saveStudentHomeLocationSchema
} from "../validator/transport.validator";

export const createTransportRouter = (controller: TransportController): Router => {
  const router = Router();

  router.post(
    "/buses",
    ...transportPolicies.manageStatic,
    validateRequest({ body: createBusSchema }),
    asyncHandler((req, res) => controller.createBus(req, res))
  );

  router.get(
    "/buses",
    ...transportPolicies.manageStatic,
    asyncHandler((req, res) => controller.listBuses(req, res))
  );

  router.post(
    "/routes",
    ...transportPolicies.manageStatic,
    validateRequest({ body: createRouteSchema }),
    asyncHandler((req, res) => controller.createRoute(req, res))
  );

  router.get(
    "/routes",
    ...transportPolicies.manageStatic,
    asyncHandler((req, res) => controller.listRoutes(req, res))
  );

  router.post(
    "/routes/:routeId/stops",
    ...transportPolicies.manageStatic,
    validateRequest({
      params: routeIdParamsSchema,
      body: createRouteStopSchema
    }),
    asyncHandler((req, res) => controller.createRouteStop(req, res))
  );

  router.get(
    "/routes/:routeId/stops",
    ...transportPolicies.manageStatic,
    validateRequest({ params: routeIdParamsSchema }),
    asyncHandler((req, res) => controller.listRouteStops(req, res))
  );

  router.post(
    "/assignments",
    ...transportPolicies.manageAssignments,
    validateRequest({ body: createStudentBusAssignmentSchema }),
    asyncHandler((req, res) => controller.createStudentAssignment(req, res))
  );

  router.patch(
    "/assignments/:id/deactivate",
    ...transportPolicies.manageAssignments,
    validateRequest({
      params: assignmentIdParamsSchema,
      body: deactivateStudentBusAssignmentSchema
    }),
    asyncHandler((req, res) => controller.deactivateStudentAssignment(req, res))
  );

  router.get(
    "/assignments/active",
    ...transportPolicies.manageAssignments,
    asyncHandler((req, res) => controller.listActiveAssignments(req, res))
  );

  router.post(
    "/route-assignments",
    ...transportPolicies.manageRouteAssignments,
    validateRequest({ body: createTransportRouteAssignmentSchema }),
    asyncHandler((req, res) => controller.createRouteAssignment(req, res))
  );

  router.get(
    "/route-assignments",
    ...transportPolicies.manageRouteAssignments,
    asyncHandler((req, res) => controller.listRouteAssignments(req, res))
  );

  router.get(
    "/route-assignments/me",
    ...transportPolicies.driverRouteAssignments,
    asyncHandler((req, res) => controller.listMyRouteAssignments(req, res))
  );

  router.patch(
    "/route-assignments/:id/deactivate",
    ...transportPolicies.manageRouteAssignments,
    validateRequest({
      params: assignmentIdParamsSchema,
      body: deactivateTransportRouteAssignmentSchema
    }),
    asyncHandler((req, res) => controller.deactivateRouteAssignment(req, res))
  );

  router.post(
    "/trips",
    ...transportPolicies.accessTrips,
    validateRequest({ body: createTripSchema }),
    asyncHandler((req, res) => controller.createTrip(req, res))
  );

  router.post(
    "/trips/ensure-daily",
    ...transportPolicies.accessTrips,
    validateRequest({ body: ensureDailyTripSchema }),
    asyncHandler((req, res) => controller.ensureDailyTrip(req, res))
  );

  router.get(
    "/trips",
    ...transportPolicies.accessTrips,
    validateRequest({ query: listTripsQuerySchema }),
    asyncHandler((req, res) => controller.listTrips(req, res))
  );

  router.get(
    "/trips/:id",
    ...transportPolicies.accessTrips,
    validateRequest({ params: tripIdParamsSchema }),
    asyncHandler((req, res) => controller.getTripById(req, res))
  );

  router.get(
    "/trips/:id/students",
    ...transportPolicies.accessTrips,
    validateRequest({
      params: tripIdParamsSchema,
      query: tripStudentRosterQuerySchema
    }),
    asyncHandler((req, res) => controller.getTripStudentRoster(req, res))
  );

  router.post(
    "/trips/:id/start",
    ...transportPolicies.operateTrips,
    validateRequest({ params: tripIdParamsSchema }),
    asyncHandler((req, res) => controller.startTrip(req, res))
  );

  router.post(
    "/trips/:id/end",
    ...transportPolicies.operateTrips,
    validateRequest({ params: tripIdParamsSchema }),
    asyncHandler((req, res) => controller.endTrip(req, res))
  );

  router.post(
    "/trips/:id/locations",
    ...transportPolicies.operateTrips,
    validateRequest({
      params: tripIdParamsSchema,
      body: recordTripLocationSchema
    }),
    asyncHandler((req, res) => controller.recordTripLocation(req, res))
  );

  router.post(
    "/trips/:id/events",
    ...transportPolicies.operateTrips,
    validateRequest({
      params: tripIdParamsSchema,
      body: createTripStudentEventSchema
    }),
    asyncHandler((req, res) => controller.createTripStudentEvent(req, res))
  );

  router.get(
    "/trips/:id/events",
    ...transportPolicies.accessTrips,
    validateRequest({ params: tripIdParamsSchema }),
    asyncHandler((req, res) => controller.listTripEvents(req, res))
  );

  router.get(
    "/students/:studentId/home-location",
    ...transportPolicies.manageHomeLocations,
    validateRequest({ params: studentIdParamsSchema }),
    asyncHandler((req, res) => controller.getStudentHomeLocation(req, res))
  );

  router.put(
    "/students/:studentId/home-location",
    ...transportPolicies.manageHomeLocations,
    validateRequest({
      params: studentIdParamsSchema,
      body: saveStudentHomeLocationSchema
    }),
    asyncHandler((req, res) => controller.saveStudentHomeLocation(req, res))
  );

  router.delete(
    "/students/:studentId/home-location",
    ...transportPolicies.manageHomeLocations,
    validateRequest({ params: studentIdParamsSchema }),
    asyncHandler((req, res) => controller.deleteStudentHomeLocation(req, res))
  );

  return router;
};
