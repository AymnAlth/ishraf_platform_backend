import { ConflictError } from "../../../common/errors/conflict-error";
import { ForbiddenError } from "../../../common/errors/forbidden-error";
import { NotFoundError } from "../../../common/errors/not-found-error";
import { ValidationError } from "../../../common/errors/validation-error";
import { OwnershipService } from "../../../common/services/ownership.service";
import { ProfileResolutionService } from "../../../common/services/profile-resolution.service";
import type { AuthenticatedUser } from "../../../common/types/auth.types";
import type { PaginatedData } from "../../../common/types/pagination.types";
import type { DriverProfile } from "../../../common/types/profile.types";
import { toDateOnly } from "../../../common/utils/date.util";
import { toPaginatedData } from "../../../common/utils/pagination.util";
import { db } from "../../../database/db";
import type { AutomationPort } from "../../automation/types/automation.types";
import type {
  CreateBusRequestDto,
  CreateRouteRequestDto,
  CreateRouteStopRequestDto,
  CreateStudentBusAssignmentRequestDto,
  CreateTransportRouteAssignmentRequestDto,
  CreateTripRequestDto,
  CreateTripStudentEventRequestDto,
  DeactivateStudentBusAssignmentRequestDto,
  DeactivateTransportRouteAssignmentRequestDto,
  EnsureDailyTripRequestDto,
  ListTripsQueryDto,
  RecordTripLocationRequestDto,
  SaveStudentHomeLocationRequestDto,
  TransportEnsureDailyTripResponseDto,
  TransportTripRosterResponseDto,
  TransportBusResponseDto,
  TransportLatestLocationResponseDto,
  TransportRouteResponseDto,
  TransportRouteAssignmentResponseDto,
  TransportRouteStopResponseDto,
  TransportStudentHomeLocationResponseDto,
  TransportStudentBusAssignmentResponseDto,
  TransportTripDetailResponseDto,
  TransportTripListItemResponseDto,
  TripStudentRosterQueryDto,
  TransportTripStudentEventResponseDto
} from "../dto/transport.dto";
import {
  toBusResponseDto,
  toRouteResponseDto,
  toRouteAssignmentResponseDto,
  toRouteStopResponseDto,
  toStudentHomeLocationResponseDto,
  toStudentBusAssignmentResponseDto,
  toTripDetailResponseDto,
  toTripListItemResponseDto,
  toTripRosterResponseDto,
  toTripLocationResponseDto,
  toTripStudentEventResponseDto
} from "../mapper/transport.mapper";
import type { TransportRepository } from "../repository/transport.repository";
import type {
  HomeLocationStatus,
  TransportRouteAssignmentRow,
  TripRow,
  TripStudentEventType
} from "../types/transport.types";

const assertFound = <T>(entity: T | null, label: string): T => {
  if (!entity) {
    throw new NotFoundError(`${label} not found`);
  }

  return entity;
};

const todayDateString = (): string => toDateOnly(new Date());

const toDateOnlyString = (value: Date | string): string => toDateOnly(value);

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

const assertDriverOnly = (authUser: AuthenticatedUser): void => {
  if (authUser.role !== "driver") {
    throw new ForbiddenError("You do not have permission to access driver transport operations");
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

const isDateCoveredByRange = (
  targetDate: string,
  startDate: Date | string,
  endDate: Date | string | null
): boolean => {
  const start = toDateOnlyString(startDate);
  const end =
    endDate === null
      ? null
      : toDateOnlyString(endDate);

  return start <= targetDate && (end === null || end >= targetDate);
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

    const resolvedDriverId = payload.driverId
      ? await this.resolveBusDriverId(payload.driverId)
      : undefined;

    const bus = await db.withTransaction(async (client) => {
      const busId = await this.transportRepository.createBus(
        {
          plateNumber: payload.plateNumber,
          driverId: resolvedDriverId,
          capacity: payload.capacity,
          status: payload.status ?? "active"
        },
        client
      );

      return assertFound(await this.transportRepository.findBusById(busId, client), "Bus");
    });

    return toBusResponseDto(bus);
  }

  private async resolveBusDriverId(driverId: string): Promise<string> {
    const driverByProfileId = await this.transportRepository.findDriverById(driverId);

    if (driverByProfileId) {
      return driverByProfileId.driverId;
    }

    const driverByUserId = await this.transportRepository.findDriverProfileByUserId(driverId);

    return assertFound(driverByUserId, "Driver").driverId;
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

  async createRouteAssignment(
    authUser: AuthenticatedUser,
    payload: CreateTransportRouteAssignmentRequestDto
  ): Promise<TransportRouteAssignmentResponseDto> {
    assertAdmin(authUser);
    assertFound(await this.transportRepository.findBusById(payload.busId), "Bus");
    assertFound(await this.transportRepository.findRouteById(payload.routeId), "Route");

    const routeAssignment = await db.withTransaction(async (client) => {
      const routeAssignmentId = await this.transportRepository.createTransportRouteAssignment(
        {
          busId: payload.busId,
          routeId: payload.routeId,
          startDate: payload.startDate,
          endDate: payload.endDate
        },
        client
      );

      return assertFound(
        await this.transportRepository.findTransportRouteAssignmentById(routeAssignmentId, client),
        "Transport route assignment"
      );
    });

    return toRouteAssignmentResponseDto(routeAssignment);
  }

  async listRouteAssignments(
    authUser: AuthenticatedUser
  ): Promise<TransportRouteAssignmentResponseDto[]> {
    assertAdmin(authUser);
    const rows = await this.transportRepository.listTransportRouteAssignments();

    return rows.map((row) => toRouteAssignmentResponseDto(row));
  }

  async deactivateRouteAssignment(
    authUser: AuthenticatedUser,
    routeAssignmentId: string,
    payload: DeactivateTransportRouteAssignmentRequestDto
  ): Promise<TransportRouteAssignmentResponseDto> {
    assertAdmin(authUser);
    const routeAssignment = assertFound(
      await this.transportRepository.findTransportRouteAssignmentById(routeAssignmentId),
      "Transport route assignment"
    );
    const endDate = payload.endDate ?? todayDateString();

    if (endDate < toDateOnlyString(routeAssignment.startDate)) {
      throw buildValidationError(
        "Route assignment end date must be later than or equal to the start date",
        "endDate",
        "INVALID_TRANSPORT_ROUTE_ASSIGNMENT_DATE_RANGE"
      );
    }

    const updatedRouteAssignment = await db.withTransaction(async (client) => {
      await this.transportRepository.deactivateTransportRouteAssignment(
        routeAssignmentId,
        { endDate },
        client
      );

      return assertFound(
        await this.transportRepository.findTransportRouteAssignmentById(routeAssignmentId, client),
        "Transport route assignment"
      );
    });

    return toRouteAssignmentResponseDto(updatedRouteAssignment);
  }

  async listMyRouteAssignments(
    authUser: AuthenticatedUser
  ): Promise<TransportRouteAssignmentResponseDto[]> {
    assertDriverOnly(authUser);
    const driver = await this.resolveDriverProfile(authUser);

    if (!driver) {
      return [];
    }

    const rows = await this.transportRepository.listTransportRouteAssignments({
      driverId: driver.driverId,
      isActive: true
    });

    return rows.map((row) => toRouteAssignmentResponseDto(row));
  }

  async ensureDailyTrip(
    authUser: AuthenticatedUser,
    payload: EnsureDailyTripRequestDto
  ): Promise<TransportEnsureDailyTripResponseDto> {
    assertTripOperator(authUser);
    const routeAssignment = assertFound(
      await this.transportRepository.findTransportRouteAssignmentById(payload.routeAssignmentId),
      "Transport route assignment"
    );

    await this.assertDriverRouteAssignmentOwnership(authUser, payload.routeAssignmentId);
    this.assertRouteAssignmentApplicableForDate(routeAssignment, payload.tripDate);

    const existingTrip = await this.transportRepository.findTripByNaturalKey({
      busId: routeAssignment.busId,
      routeId: routeAssignment.routeId,
      tripDate: payload.tripDate,
      tripType: payload.tripType
    });

    if (existingTrip) {
      return {
        created: false,
        trip: toTripListItemResponseDto(existingTrip)
      };
    }

    const trip = await db.withTransaction(async (client) => {
      const tripId = await this.transportRepository.createTrip(
        {
          busId: routeAssignment.busId,
          routeId: routeAssignment.routeId,
          tripDate: payload.tripDate,
          tripType: payload.tripType
        },
        client
      );

      return assertFound(await this.transportRepository.findTripById(tripId, client), "Trip");
    });

    return {
      created: true,
      trip: toTripListItemResponseDto(trip)
    };
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

  async getTripStudentRoster(
    authUser: AuthenticatedUser,
    tripId: string,
    filters: TripStudentRosterQueryDto
  ): Promise<TransportTripRosterResponseDto> {
    assertTripOperator(authUser);
    await this.assertDriverTripOwnership(authUser, tripId);
    const trip = assertFound(await this.transportRepository.findTripById(tripId), "Trip");
    const students = await this.transportRepository.listTripStudentRoster(tripId, filters);

    return toTripRosterResponseDto(trip, students);
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

    const assignment = await this.transportRepository.findStudentAssignmentByStudentIdOnDate(
      payload.studentId,
      toDateOnlyString(trip.tripDate)
    );

    if (!assignment) {
      throw buildValidationError(
        "Student does not have a transport assignment for the trip date",
        "studentId",
        "STUDENT_TRIP_DATE_ASSIGNMENT_NOT_FOUND"
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

  async getStudentHomeLocation(
    authUser: AuthenticatedUser,
    studentId: string
  ): Promise<TransportStudentHomeLocationResponseDto> {
    assertAdmin(authUser);
    const row = assertFound(
      await this.transportRepository.findStudentHomeLocationByStudentId(studentId),
      "Student"
    );

    return toStudentHomeLocationResponseDto(row);
  }

  async saveStudentHomeLocation(
    authUser: AuthenticatedUser,
    studentId: string,
    payload: SaveStudentHomeLocationRequestDto
  ): Promise<TransportStudentHomeLocationResponseDto> {
    assertAdmin(authUser);
    assertFound(
      await this.transportRepository.findStudentTransportReferenceById(studentId),
      "Student"
    );

    const status: HomeLocationStatus = payload.status ?? "approved";
    const approvedByUserId = status === "approved" ? authUser.userId : null;
    const approvedAt = status === "approved" ? new Date() : null;

    const row = await db.withTransaction(async (client) => {
      await this.transportRepository.upsertStudentHomeLocation(
        {
          studentId,
          addressLabel: payload.addressLabel,
          addressText: payload.addressText,
          latitude: payload.latitude,
          longitude: payload.longitude,
          source: "admin",
          status,
          submittedByUserId: authUser.userId,
          approvedByUserId,
          approvedAt,
          notes: payload.notes
        },
        client
      );

      return assertFound(
        await this.transportRepository.findStudentHomeLocationByStudentId(studentId, client),
        "Student"
      );
    });

    return toStudentHomeLocationResponseDto(row);
  }

  async deleteStudentHomeLocation(
    authUser: AuthenticatedUser,
    studentId: string
  ): Promise<TransportStudentHomeLocationResponseDto> {
    assertAdmin(authUser);
    const student = assertFound(
      await this.transportRepository.findStudentTransportReferenceById(studentId),
      "Student"
    );

    await db.withTransaction(async (client) => {
      await this.transportRepository.deleteStudentHomeLocation(studentId, client);
      return undefined;
    });

    return {
      student: {
        studentId: student.studentId,
        academicNo: student.academicNo,
        fullName: student.fullName
      },
      homeLocation: null
    };
  }

  private assertRouteAssignmentApplicableForDate(
    routeAssignment: TransportRouteAssignmentRow,
    tripDate: string
  ): void {
    if (
      !routeAssignment.isActive ||
      !isDateCoveredByRange(tripDate, routeAssignment.startDate, routeAssignment.endDate)
    ) {
      throw buildValidationError(
        "Route assignment is not active for the requested trip date",
        "routeAssignmentId",
        "TRANSPORT_ROUTE_ASSIGNMENT_NOT_ACTIVE_FOR_TRIP_DATE"
      );
    }
  }

  private async assertDriverRouteAssignmentOwnership(
    authUser: AuthenticatedUser,
    routeAssignmentId: string
  ): Promise<void> {
    if (authUser.role !== "driver") {
      return;
    }

    const driver = await this.resolveDriverProfile(authUser);

    if (!driver) {
      return;
    }

    const hasOwnership =
      typeof this.transportRepository.hasDriverRouteAssignmentOwnership === "function"
        ? await this.transportRepository.hasDriverRouteAssignmentOwnership(
            driver.driverId,
            routeAssignmentId
          )
        : false;

    if (!hasOwnership) {
      throw new ForbiddenError("You do not have permission to access this route assignment");
    }
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
