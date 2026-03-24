import { ConflictError } from "../../../common/errors/conflict-error";
import { ForbiddenError } from "../../../common/errors/forbidden-error";
import { NotFoundError } from "../../../common/errors/not-found-error";
import { ValidationError } from "../../../common/errors/validation-error";
import { OwnershipService } from "../../../common/services/ownership.service";
import { ProfileResolutionService } from "../../../common/services/profile-resolution.service";
import type { AuthenticatedUser } from "../../../common/types/auth.types";
import type { PaginatedData } from "../../../common/types/pagination.types";
import type { DriverProfile } from "../../../common/types/profile.types";
import { toPaginatedData } from "../../../common/utils/pagination.util";
import { db } from "../../../database/db";
import type { AutomationPort } from "../../automation/types/automation.types";
import type {
  CreateBusRequestDto,
  CreateRouteRequestDto,
  CreateRouteStopRequestDto,
  CreateStudentBusAssignmentRequestDto,
  CreateTripRequestDto,
  CreateTripStudentEventRequestDto,
  DeactivateStudentBusAssignmentRequestDto,
  ListTripsQueryDto,
  RecordTripLocationRequestDto,
  TransportBusResponseDto,
  TransportLatestLocationResponseDto,
  TransportRouteResponseDto,
  TransportRouteStopResponseDto,
  TransportStudentBusAssignmentResponseDto,
  TransportTripDetailResponseDto,
  TransportTripListItemResponseDto,
  TransportTripStudentEventResponseDto
} from "../dto/transport.dto";
import {
  toBusResponseDto,
  toRouteResponseDto,
  toRouteStopResponseDto,
  toStudentBusAssignmentResponseDto,
  toTripDetailResponseDto,
  toTripListItemResponseDto,
  toTripLocationResponseDto,
  toTripStudentEventResponseDto
} from "../mapper/transport.mapper";
import type { TransportRepository } from "../repository/transport.repository";
import type { TripRow, TripStudentEventType } from "../types/transport.types";

const assertFound = <T>(entity: T | null, label: string): T => {
  if (!entity) {
    throw new NotFoundError(`${label} not found`);
  }

  return entity;
};

const todayDateString = (): string => new Date().toISOString().slice(0, 10);

const buildValidationError = (
  message: string,
  field: string,
  code: string
): ValidationError =>
  new ValidationError(message, [
    {
      field,
      code,
      message
    }
  ]);

const assertAdmin = (authUser: AuthenticatedUser): void => {
  if (authUser.role !== "admin") {
    throw new ForbiddenError("You do not have permission to access transport management");
  }
};

const assertTripOperator = (authUser: AuthenticatedUser): void => {
  if (authUser.role !== "admin" && authUser.role !== "driver") {
    throw new ForbiddenError("You do not have permission to access transport trips");
  }
};

const assertStopBelongsToRoute = (stopRouteId: string, routeId: string): void => {
  if (stopRouteId !== routeId) {
    throw buildValidationError(
      "Bus stop must belong to the selected route",
      "stopId",
      "BUS_STOP_ROUTE_MISMATCH"
    );
  }
};

const assertTripStatus = (
  trip: TripRow,
  expectedStatus: "scheduled" | "started",
  message: string,
  code: string
): void => {
  if (trip.tripStatus !== expectedStatus) {
    throw buildValidationError(message, "tripStatus", code);
  }
};

const assertTripEventStatus = (trip: TripRow): void => {
  if (trip.tripStatus !== "started" && trip.tripStatus !== "ended") {
    throw buildValidationError(
      "Trip student events can only be recorded for started or ended trips",
      "tripStatus",
      "TRIP_EVENT_STATUS_INVALID"
    );
  }
};

const assertLocationStatus = (trip: TripRow): void => {
  if (trip.tripStatus !== "started") {
    throw buildValidationError(
      "Trip locations can only be recorded for started trips",
      "tripStatus",
      "TRIP_LOCATION_STATUS_INVALID"
    );
  }
};

const assertEventStopRequirements = (
  eventType: TripStudentEventType,
  stopId?: string
): void => {
  if ((eventType === "boarded" || eventType === "dropped_off") && !stopId) {
    throw buildValidationError(
      "stopId is required for boarded and dropped_off events",
      "stopId",
      "TRIP_EVENT_STOP_REQUIRED"
    );
  }

  if (eventType === "absent" && stopId) {
    throw buildValidationError(
      "stopId is not allowed for absent events",
      "stopId",
      "TRIP_EVENT_STOP_NOT_ALLOWED"
    );
  }
};

export class TransportService {
  constructor(
    private readonly transportRepository: TransportRepository,
    private readonly profileResolutionService = new ProfileResolutionService(),
    private readonly ownershipService = new OwnershipService(),
    private readonly automationService: AutomationPort | null = null
  ) {}

  async createBus(
    authUser: AuthenticatedUser,
    payload: CreateBusRequestDto
  ): Promise<TransportBusResponseDto> {
    assertAdmin(authUser);

    if (payload.driverId) {
      assertFound(await this.transportRepository.findDriverById(payload.driverId), "Driver");
    }

    const bus = await db.withTransaction(async (client) => {
      const busId = await this.transportRepository.createBus(
        {
          plateNumber: payload.plateNumber,
          driverId: payload.driverId,
          capacity: payload.capacity,
          status: payload.status ?? "active"
        },
        client
      );

      return assertFound(await this.transportRepository.findBusById(busId, client), "Bus");
    });

    return toBusResponseDto(bus);
  }

  async listBuses(authUser: AuthenticatedUser): Promise<TransportBusResponseDto[]> {
    assertAdmin(authUser);
    const rows = await this.transportRepository.listBuses();

    return rows.map((row) => toBusResponseDto(row));
  }

  async createRoute(
    authUser: AuthenticatedUser,
    payload: CreateRouteRequestDto
  ): Promise<TransportRouteResponseDto> {
    assertAdmin(authUser);

    const route = await db.withTransaction(async (client) => {
      const routeId = await this.transportRepository.createRoute(
        {
          routeName: payload.routeName,
          startPoint: payload.startPoint,
          endPoint: payload.endPoint,
          estimatedDurationMinutes: payload.estimatedDurationMinutes ?? 0,
          isActive: payload.isActive ?? true
        },
        client
      );

      return assertFound(await this.transportRepository.findRouteById(routeId, client), "Route");
    });

    return toRouteResponseDto(route);
  }

  async listRoutes(authUser: AuthenticatedUser): Promise<TransportRouteResponseDto[]> {
    assertAdmin(authUser);
    const rows = await this.transportRepository.listRoutes();

    return rows.map((row) => toRouteResponseDto(row));
  }

  async createRouteStop(
    authUser: AuthenticatedUser,
    routeId: string,
    payload: CreateRouteStopRequestDto
  ): Promise<TransportRouteStopResponseDto> {
    assertAdmin(authUser);
    assertFound(await this.transportRepository.findRouteById(routeId), "Route");

    const routeStop = await db.withTransaction(async (client) => {
      const stopId = await this.transportRepository.createRouteStop(
        {
          routeId,
          stopName: payload.stopName,
          latitude: payload.latitude,
          longitude: payload.longitude,
          stopOrder: payload.stopOrder
        },
        client
      );

      return assertFound(
        await this.transportRepository.findRouteStopById(stopId, client),
        "Route stop"
      );
    });

    return toRouteStopResponseDto(routeStop);
  }

  async listRouteStops(
    authUser: AuthenticatedUser,
    routeId: string
  ): Promise<TransportRouteStopResponseDto[]> {
    assertAdmin(authUser);
    assertFound(await this.transportRepository.findRouteById(routeId), "Route");
    const rows = await this.transportRepository.listRouteStopsByRouteId(routeId);

    return rows.map((row) => toRouteStopResponseDto(row));
  }

  async createStudentAssignment(
    authUser: AuthenticatedUser,
    payload: CreateStudentBusAssignmentRequestDto
  ): Promise<TransportStudentBusAssignmentResponseDto> {
    assertAdmin(authUser);
    assertFound(
      await this.transportRepository.findStudentTransportReferenceById(payload.studentId),
      "Student"
    );
    assertFound(await this.transportRepository.findRouteById(payload.routeId), "Route");
    const stop = assertFound(
      await this.transportRepository.findRouteStopById(payload.stopId),
      "Bus stop"
    );

    assertStopBelongsToRoute(stop.routeId, payload.routeId);

    const activeAssignment =
      await this.transportRepository.findActiveStudentAssignmentByStudentId(payload.studentId);

    if (activeAssignment) {
      throw new ConflictError("Student already has an active transport assignment", [
        {
          field: "studentId",
          code: "STUDENT_ACTIVE_TRANSPORT_ASSIGNMENT_EXISTS",
          message: "Student already has an active transport assignment"
        }
      ]);
    }

    const assignment = await db.withTransaction(async (client) => {
      const assignmentId = await this.transportRepository.createStudentBusAssignment(
        {
          studentId: payload.studentId,
          routeId: payload.routeId,
          stopId: payload.stopId,
          startDate: payload.startDate,
          endDate: payload.endDate
        },
        client
      );

      return assertFound(
        await this.transportRepository.findStudentBusAssignmentById(assignmentId, client),
        "Student transport assignment"
      );
    });

    return toStudentBusAssignmentResponseDto(assignment);
  }

  async deactivateStudentAssignment(
    authUser: AuthenticatedUser,
    assignmentId: string,
    payload: DeactivateStudentBusAssignmentRequestDto
  ): Promise<TransportStudentBusAssignmentResponseDto> {
    assertAdmin(authUser);
    assertFound(
      await this.transportRepository.findStudentBusAssignmentById(assignmentId),
      "Student transport assignment"
    );

    const assignment = await db.withTransaction(async (client) => {
      await this.transportRepository.deactivateStudentBusAssignment(
        assignmentId,
        {
          endDate: payload.endDate ?? todayDateString()
        },
        client
      );

      return assertFound(
        await this.transportRepository.findStudentBusAssignmentById(assignmentId, client),
        "Student transport assignment"
      );
    });

    return toStudentBusAssignmentResponseDto(assignment);
  }

  async listActiveAssignments(
    authUser: AuthenticatedUser
  ): Promise<TransportStudentBusAssignmentResponseDto[]> {
    assertAdmin(authUser);
    const rows = await this.transportRepository.listActiveStudentAssignments();

    return rows.map((row) => toStudentBusAssignmentResponseDto(row));
  }

  async createTrip(
    authUser: AuthenticatedUser,
    payload: CreateTripRequestDto
  ): Promise<TransportTripListItemResponseDto> {
    assertTripOperator(authUser);
    const driver = await this.resolveDriverProfile(authUser);
    assertFound(await this.transportRepository.findBusById(payload.busId), "Bus");
    assertFound(await this.transportRepository.findRouteById(payload.routeId), "Route");

    if (driver) {
      const hasOwnership =
        typeof this.transportRepository.hasDriverBusOwnership === "function"
          ? await this.transportRepository.hasDriverBusOwnership(
              driver.driverId,
              payload.busId
            )
          : await this.ownershipService.hasDriverBusOwnership(
              driver.driverId,
              payload.busId
            );

      if (!hasOwnership) {
        throw new ForbiddenError("You do not have permission to access this bus");
      }
    }

    const trip = await db.withTransaction(async (client) => {
      const tripId = await this.transportRepository.createTrip(
        {
          busId: payload.busId,
          routeId: payload.routeId,
          tripDate: payload.tripDate,
          tripType: payload.tripType
        },
        client
      );

      return assertFound(await this.transportRepository.findTripById(tripId, client), "Trip");
    });

    return toTripListItemResponseDto(trip);
  }

  async listTrips(
    authUser: AuthenticatedUser,
    filters: ListTripsQueryDto
  ): Promise<PaginatedData<TransportTripListItemResponseDto>> {
    assertTripOperator(authUser);
    const driver = await this.resolveDriverProfile(authUser);
    const { rows, totalItems } = await this.transportRepository.listTrips(
      filters,
      driver
        ? {
            driverId: driver.driverId
          }
        : {}
    );

    return toPaginatedData(
      rows.map((row) => toTripListItemResponseDto(row)),
      filters.page,
      filters.limit,
      totalItems
    );
  }

  async getTripById(
    authUser: AuthenticatedUser,
    tripId: string
  ): Promise<TransportTripDetailResponseDto> {
    assertTripOperator(authUser);
    await this.assertDriverTripOwnership(authUser, tripId);
    const trip = assertFound(await this.transportRepository.findTripById(tripId), "Trip");
    const routeStops = await this.transportRepository.listRouteStopsByRouteId(trip.routeId);

    return toTripDetailResponseDto(trip, routeStops);
  }

  async startTrip(
    authUser: AuthenticatedUser,
    tripId: string
  ): Promise<TransportTripListItemResponseDto> {
    assertTripOperator(authUser);
    await this.assertDriverTripOwnership(authUser, tripId);
    const trip = assertFound(await this.transportRepository.findTripById(tripId), "Trip");

    assertTripStatus(
      trip,
      "scheduled",
      "Trip can only be started from scheduled status",
      "TRIP_STATUS_START_INVALID"
    );

    const updatedTrip = await db.withTransaction(async (client) => {
      await this.transportRepository.updateTripStatus(tripId, "started", client);

      return assertFound(await this.transportRepository.findTripById(tripId, client), "Trip");
    });

    await (this.automationService?.onTripStarted({
      tripId: updatedTrip.id,
      routeId: updatedTrip.routeId,
      routeName: updatedTrip.routeName,
      tripDate: updatedTrip.tripDate
    }) ?? Promise.resolve());

    return toTripListItemResponseDto(updatedTrip);
  }

  async endTrip(
    authUser: AuthenticatedUser,
    tripId: string
  ): Promise<TransportTripListItemResponseDto> {
    assertTripOperator(authUser);
    await this.assertDriverTripOwnership(authUser, tripId);
    const trip = assertFound(await this.transportRepository.findTripById(tripId), "Trip");

    assertTripStatus(
      trip,
      "started",
      "Trip can only be ended from started status",
      "TRIP_STATUS_END_INVALID"
    );

    const updatedTrip = await db.withTransaction(async (client) => {
      await this.transportRepository.updateTripStatus(tripId, "ended", client);

      return assertFound(await this.transportRepository.findTripById(tripId, client), "Trip");
    });

    return toTripListItemResponseDto(updatedTrip);
  }

  async recordTripLocation(
    authUser: AuthenticatedUser,
    tripId: string,
    payload: RecordTripLocationRequestDto
  ): Promise<TransportLatestLocationResponseDto> {
    assertTripOperator(authUser);
    await this.assertDriverTripOwnership(authUser, tripId);
    const trip = assertFound(await this.transportRepository.findTripById(tripId), "Trip");

    assertLocationStatus(trip);

    const location = await db.withTransaction(async (client) => {
      await this.transportRepository.createTripLocation(
        {
          tripId,
          latitude: payload.latitude,
          longitude: payload.longitude
        },
        client
      );

      return assertFound(
        await this.transportRepository.findLatestTripLocationByTripId(tripId, client),
        "Trip location"
      );
    });

    return toTripLocationResponseDto(location);
  }

  async createTripStudentEvent(
    authUser: AuthenticatedUser,
    tripId: string,
    payload: CreateTripStudentEventRequestDto
  ): Promise<TransportTripStudentEventResponseDto> {
    assertTripOperator(authUser);
    await this.assertDriverTripOwnership(authUser, tripId);
    const trip = assertFound(await this.transportRepository.findTripById(tripId), "Trip");

    assertTripEventStatus(trip);
    assertEventStopRequirements(payload.eventType, payload.stopId);
    assertFound(
      await this.transportRepository.findStudentTransportReferenceById(payload.studentId),
      "Student"
    );

    const assignment = await this.transportRepository.findActiveStudentAssignmentByStudentId(
      payload.studentId
    );

    if (!assignment) {
      throw buildValidationError(
        "Student does not have an active bus assignment",
        "studentId",
        "STUDENT_ACTIVE_BUS_ASSIGNMENT_NOT_FOUND"
      );
    }

    if (assignment.routeId !== trip.routeId) {
      throw buildValidationError(
        "Student bus assignment does not match the trip route",
        "studentId",
        "TRIP_STUDENT_ROUTE_MISMATCH"
      );
    }

    if (payload.stopId) {
      const stop = assertFound(
        await this.transportRepository.findRouteStopById(payload.stopId),
        "Bus stop"
      );

      if (stop.routeId !== trip.routeId) {
        throw buildValidationError(
          "Stop must belong to the trip route",
          "stopId",
          "TRIP_EVENT_STOP_ROUTE_MISMATCH"
        );
      }
    }

    const event = await db.withTransaction(async (client) => {
      const eventId = await this.transportRepository.createTripStudentEvent(
        {
          tripId,
          studentId: payload.studentId,
          eventType: payload.eventType,
          stopId: payload.stopId,
          notes: payload.notes
        },
        client
      );

      return assertFound(
        await this.transportRepository.findTripStudentEventById(eventId, client),
        "Trip student event"
      );
    });

    if (event.eventType === "dropped_off") {
      await (this.automationService?.onStudentDroppedOff({
        tripStudentEventId: event.tripStudentEventId,
        studentId: event.studentId,
        studentName: event.studentFullName,
        stopName: event.stopName ?? "نقطة غير معروفة"
      }) ?? Promise.resolve());
    }

    return toTripStudentEventResponseDto(event);
  }

  async listTripEvents(
    authUser: AuthenticatedUser,
    tripId: string
  ): Promise<TransportTripStudentEventResponseDto[]> {
    assertTripOperator(authUser);
    await this.assertDriverTripOwnership(authUser, tripId);
    assertFound(await this.transportRepository.findTripById(tripId), "Trip");
    const rows = await this.transportRepository.listTripEventsByTripId(tripId);

    return rows.map((row) => toTripStudentEventResponseDto(row));
  }

  private async resolveDriverProfile(
    authUser: AuthenticatedUser
  ): Promise<DriverProfile | null> {
    if (authUser.role !== "driver") {
      return null;
    }

    if (typeof this.transportRepository.findDriverProfileByUserId !== "function") {
      return null;
    }

    const driver = await this.transportRepository.findDriverProfileByUserId(authUser.userId);

    if (driver) {
      return {
        driverId: driver.driverId,
        userId: driver.driverUserId,
        fullName: driver.driverFullName,
        email: driver.driverEmail,
        phone: driver.driverPhone,
        licenseNumber: "",
        driverStatus: "active"
      };
    }

    throw new NotFoundError("Driver profile not found");
  }

  private async assertDriverTripOwnership(
    authUser: AuthenticatedUser,
    tripId: string
  ): Promise<void> {
    if (authUser.role !== "driver") {
      return;
    }

    const driver = await this.resolveDriverProfile(authUser);

    if (!driver) {
      return;
    }

    const hasOwnership =
      typeof this.transportRepository.hasDriverTripOwnership === "function"
        ? await this.transportRepository.hasDriverTripOwnership(driver.driverId, tripId)
        : await this.ownershipService.hasDriverTripOwnership(driver.driverId, tripId);

    if (!hasOwnership) {
      throw new ForbiddenError("You do not have permission to access this trip");
    }
  }
}
