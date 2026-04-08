import { ConflictError } from "../../../common/errors/conflict-error";
import { ForbiddenError } from "../../../common/errors/forbidden-error";
import { NotFoundError } from "../../../common/errors/not-found-error";
import { ValidationError } from "../../../common/errors/validation-error";
import type { Queryable } from "../../../common/interfaces/queryable.interface";
import { OwnershipService } from "../../../common/services/ownership.service";
import { ProfileResolutionService } from "../../../common/services/profile-resolution.service";
import { requestExecutionContextService } from "../../../common/services/request-execution-context.service";
import type { AuthenticatedUser } from "../../../common/types/auth.types";
import type { PaginatedData } from "../../../common/types/pagination.types";
import type { DriverProfile } from "../../../common/types/profile.types";
import { toDateOnly } from "../../../common/utils/date.util";
import { toPaginatedData } from "../../../common/utils/pagination.util";
import { db } from "../../../database/db";
import type { FirebaseRealtimeAuthService } from "../../../integrations/firebase/firebase-realtime-auth.service";
import type { AutomationPort } from "../../automation/types/automation.types";
import type { SystemSettingsReadService } from "../../system-settings/service/system-settings-read.service";
import { TransportEtaRepository } from "../repository/transport-eta.repository";
import { TransportEtaOutboxRepository } from "../repository/transport-eta-outbox.repository";
import type { TransportEtaReadServicePort } from "./transport-eta.service";
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
  RecordTripStopAttendanceRequestDto,
  RecordTripLocationRequestDto,
  SaveStudentHomeLocationRequestDto,
  TransportTripStopAttendanceResponseDto,
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
  TransportTripLiveStatusResponseDto,
  TransportTripListItemResponseDto,
  TransportTripEtaResponseDto,
  TransportTripSummaryResponseDto,
  TransportRealtimeTokenQueryDto,
  TransportRealtimeTokenResponseDto,
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
  toTripEtaResponseDto,
  toTripListItemResponseDto,
  toTripLiveStatusResponseDto,
  toTripRosterResponseDto,
  toTripLocationResponseDto,
  toTripSummaryResponseDto,
  toTripStudentEventResponseDto
} from "../mapper/transport.mapper";
import type { TransportRepository } from "../repository/transport.repository";
import type {
  HomeLocationStatus,
  TransportRouteAssignmentRow,
  TripRow,
  TripStopAttendanceStatus,
  TripStudentEventRow,
  TripStudentEventType
} from "../types/transport.types";
import {
  type TransportEtaRefreshEventTrigger,
  type TransportEtaRefreshOutboxPayload,
  type TransportTripEtaStopSnapshotRow,
  TRANSPORT_ETA_OUTBOX_EVENT_TYPE
} from "../types/transport-eta.types";

const assertFound = <T>(entity: T | null, label: string): T => {
  if (!entity) {
    throw new NotFoundError(`${label} not found`);
  }

  return entity;
};

const todayDateString = (): string => toDateOnly(new Date());

const toDateOnlyString = (value: Date | string): string => toDateOnly(value);

const toUtcMinuteBucket = (value: Date): string => value.toISOString().slice(0, 16);

const buildTripStartedEtaRefreshIdempotencyKey = (tripId: string): string =>
  `eta:${TRANSPORT_ETA_OUTBOX_EVENT_TYPE}:trip_started:${tripId}`;

const buildHeartbeatEtaRefreshIdempotencyKey = (tripId: string, recordedAt: Date): string =>
  `eta:${TRANSPORT_ETA_OUTBOX_EVENT_TYPE}:heartbeat:${tripId}:${toUtcMinuteBucket(recordedAt)}`;

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

const assertParent = (authUser: AuthenticatedUser): void => {
  if (authUser.role !== "parent") {
    throw new ForbiddenError("You do not have permission to access parent live transport tracking");
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

const assertTripAttendanceStatus = (trip: TripRow): void => {
  if (trip.tripStatus !== "started") {
    throw buildValidationError(
      "Trip stop attendance can only be recorded for started trips",
      "tripStatus",
      "TRIP_STOP_ATTENDANCE_STATUS_INVALID"
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

const mapAttendanceStatusToEventType = (
  tripType: TripRow["tripType"],
  status: TripStopAttendanceStatus
): TripStudentEventType => {
  if (status === "absent") {
    return "absent";
  }

  return tripType === "pickup" ? "boarded" : "dropped_off";
};

export class TransportService {
  constructor(
    private readonly transportRepository: TransportRepository,
    private readonly profileResolutionService = new ProfileResolutionService(),
    private readonly ownershipService = new OwnershipService(),
    private readonly automationService: AutomationPort | null = null,
    private readonly systemSettingsReadService: SystemSettingsReadService | null = null,
    private readonly firebaseRealtimeAuthService: FirebaseRealtimeAuthService | null = null,
    private readonly transportEtaService: TransportEtaReadServicePort | null = null,
    private readonly transportEtaOutboxRepository: TransportEtaOutboxRepository = new TransportEtaOutboxRepository(),
    private readonly transportEtaRepository: TransportEtaRepository = new TransportEtaRepository()
  ) {}

  async getRealtimeToken(
    authUser: AuthenticatedUser,
    query: TransportRealtimeTokenQueryDto
  ): Promise<TransportRealtimeTokenResponseDto> {
    if (authUser.role !== "admin" && authUser.role !== "parent" && authUser.role !== "driver") {
      throw new ForbiddenError("You do not have permission to access transport realtime tracking");
    }

    const pushNotificationSettings = await this.systemSettingsReadService?.getPushNotificationsSettings();

    if (!pushNotificationSettings?.transportRealtimeEnabled) {
      throw new ConflictError("Transport realtime tracking is disabled", [
        {
          field: "group",
          code: "FEATURE_DISABLED",
          message: "The pushNotifications system settings group has disabled transport realtime"
        }
      ]);
    }

    if (!this.firebaseRealtimeAuthService || !this.firebaseRealtimeAuthService.isConfigured()) {
      throw new ConflictError("Transport realtime integration is not configured", [
        {
          field: "integration",
          code: "INTEGRATION_NOT_CONFIGURED",
          message: "Firebase transport realtime integration is not configured"
        }
      ]);
    }

    const trip = assertFound(await this.transportRepository.findTripById(query.tripId), "Trip");
    let access: "read" | "write" = "read";

    if (authUser.role === "driver") {
      await this.assertDriverTripOwnership(authUser, query.tripId);
      access = "write";
    } else if (authUser.role === "parent") {
      const hasAccess =
        typeof this.transportRepository.hasParentTripAccess === "function"
          ? await this.transportRepository.hasParentTripAccess(authUser.userId, query.tripId)
          : false;

      if (!hasAccess) {
        throw new ForbiddenError("You do not have permission to access this trip");
      }
    }

    return this.firebaseRealtimeAuthService.createTransportRealtimeToken({
      backendUserId: authUser.userId,
      role: authUser.role,
      tripId: trip.id,
      access
    });
  }

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

    const driverByUserId =
      await this.profileResolutionService.findDriverProfileByUserId(driverId);

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

  async getTripEta(
    authUser: AuthenticatedUser,
    tripId: string
  ): Promise<TransportTripEtaResponseDto> {
    assertTripOperator(authUser);
    await this.assertDriverTripOwnership(authUser, tripId);
    const trip = assertFound(await this.transportRepository.findTripById(tripId), "Trip");
    const readModel = this.transportEtaService
      ? await this.transportEtaService.getTripEtaReadModel(tripId)
      : {
          tripId,
          routeId: trip.routeId,
          routePolyline: null,
          etaSummary: null,
          remainingStops: [],
          computedAt: null
        };

    return toTripEtaResponseDto(trip, readModel);
  }

  async getTripLiveStatus(
    authUser: AuthenticatedUser,
    tripId: string
  ): Promise<TransportTripLiveStatusResponseDto> {
    assertParent(authUser);
    const trip = assertFound(await this.transportRepository.findTripById(tripId), "Trip");
    const hasAccess = await this.transportRepository.hasParentTripAccess(authUser.userId, tripId);

    if (!hasAccess) {
      throw new ForbiddenError("You do not have permission to access this trip");
    }

    const parentStops = await this.transportRepository.listParentTripStops(authUser.userId, tripId);
    const stopSnapshots = await this.transportEtaRepository.listTripEtaStopSnapshotsByTripId(tripId);
    const myStopSnapshot = this.selectNearestActiveParentStopSnapshot(parentStops, stopSnapshots);
    const etaReadModel = this.transportEtaService
      ? await this.transportEtaService.getTripEtaReadModel(tripId)
      : null;

    return toTripLiveStatusResponseDto(
      trip,
      `/transport/live-trips/${tripId}/latestLocation`,
      myStopSnapshot,
      etaReadModel?.routePolyline ?? null
    );
  }

  async getTripSummary(
    authUser: AuthenticatedUser,
    tripId: string
  ): Promise<TransportTripSummaryResponseDto> {
    assertAdmin(authUser);
    const trip = assertFound(await this.transportRepository.findTripById(tripId), "Trip");

    if (trip.tripStatus !== "completed") {
      throw new ConflictError("Trip summary is only available for completed trips", [
        {
          field: "tripStatus",
          code: "TRIP_SUMMARY_REQUIRES_COMPLETED_STATUS",
          message: "Trip summary is only available for completed trips"
        }
      ]);
    }

    const rosterRows = await this.transportRepository.listTripStudentRoster(tripId, {});
    const presentCount = rosterRows.filter(
      (row) => row.lastEventType === "boarded" || row.lastEventType === "dropped_off"
    ).length;
    const absentCount = rosterRows.filter((row) => row.lastEventType === "absent").length;

    return toTripSummaryResponseDto(trip, {
      totalStudents: rosterRows.length,
      presentCount,
      absentCount
    });
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
      const refreshedTrip = assertFound(
        await this.transportRepository.findTripById(tripId, client),
        "Trip"
      );

      await this.enqueueTransportEtaRefreshEvent(
        refreshedTrip.id,
        "trip_started",
        buildTripStartedEtaRefreshIdempotencyKey(refreshedTrip.id),
        undefined,
        client
      );

      return refreshedTrip;
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

    await (this.automationService?.onTripEnded({
      tripId: updatedTrip.id,
      routeId: updatedTrip.routeId,
      routeName: updatedTrip.routeName,
      tripDate: updatedTrip.tripDate
    }) ?? Promise.resolve());
    await (this.transportEtaService?.markTripCompleted?.(updatedTrip.id) ?? Promise.resolve());

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

      const latestLocation = assertFound(
        await this.transportRepository.findLatestTripLocationByTripId(tripId, client),
        "Trip location"
      );

      await this.enqueueTransportEtaRefreshEvent(
        tripId,
        "heartbeat",
        buildHeartbeatEtaRefreshIdempotencyKey(tripId, latestLocation.recordedAt),
        latestLocation.recordedAt,
        client
      );

      return latestLocation;
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

    await (this.automationService?.onTripStudentEventRecorded({
      tripStudentEventId: event.tripStudentEventId,
      tripId: trip.id,
      routeId: trip.routeId,
      routeName: trip.routeName,
      tripDate: trip.tripDate,
      studentId: event.studentId,
      studentName: event.studentFullName,
      eventType: event.eventType,
      stopName: event.stopName
    }) ?? Promise.resolve());

    return toTripStudentEventResponseDto(event);
  }

  async recordTripStopAttendance(
    authUser: AuthenticatedUser,
    tripId: string,
    stopId: string,
    payload: RecordTripStopAttendanceRequestDto
  ): Promise<TransportTripStopAttendanceResponseDto> {
    assertTripOperator(authUser);
    await this.assertDriverTripOwnership(authUser, tripId);
    const trip = assertFound(await this.transportRepository.findTripById(tripId), "Trip");
    assertTripAttendanceStatus(trip);

    const stop = assertFound(await this.transportRepository.findRouteStopById(stopId), "Bus stop");

    if (stop.routeId !== trip.routeId) {
      throw buildValidationError(
        "Stop must belong to the trip route",
        "stopId",
        "TRIP_ATTENDANCE_STOP_ROUTE_MISMATCH"
      );
    }

    const attendanceResult = await db.withTransaction(async (client) => {
      const recordedEvents: TripStudentEventRow[] = [];

      for (const attendance of payload.attendances) {
        assertFound(
          await this.transportRepository.findStudentTransportReferenceById(attendance.studentId, client),
          "Student"
        );

        const assignment = await this.transportRepository.findStudentAssignmentByStudentIdOnDate(
          attendance.studentId,
          toDateOnlyString(trip.tripDate),
          client
        );

        if (!assignment) {
          throw buildValidationError(
            "Student does not have a transport assignment for the trip date",
            "attendances",
            "STUDENT_TRIP_DATE_ASSIGNMENT_NOT_FOUND"
          );
        }

        if (assignment.routeId !== trip.routeId) {
          throw buildValidationError(
            "Student bus assignment does not match the trip route",
            "attendances",
            "TRIP_STUDENT_ROUTE_MISMATCH"
          );
        }

        if (assignment.stopId !== stopId) {
          throw buildValidationError(
            "Student bus assignment does not match the selected stop",
            "attendances",
            "TRIP_ATTENDANCE_STOP_ASSIGNMENT_MISMATCH"
          );
        }

        const eventType = mapAttendanceStatusToEventType(trip.tripType, attendance.status);
        const eventId = await this.transportRepository.createTripStudentEvent(
          {
            tripId,
            studentId: attendance.studentId,
            eventType,
            stopId: eventType === "absent" ? undefined : stopId,
            notes: attendance.notes
          },
          client
        );
        const event = assertFound(
          await this.transportRepository.findTripStudentEventById(eventId, client),
          "Trip student event"
        );

        recordedEvents.push(event);
      }

      const stopCompleted = await this.transportEtaRepository.markTripStopCompleted(
        tripId,
        stopId,
        client
      );

      if (!stopCompleted) {
        throw buildValidationError(
          "Trip ETA stop snapshot was not found for the selected stop",
          "stopId",
          "TRIP_STOP_ETA_SNAPSHOT_NOT_FOUND"
        );
      }

      const tripCompleted = await this.transportEtaRepository.areAllTripStopsCompleted(tripId, client);

      if (tripCompleted) {
        await this.transportRepository.updateTripStatus(tripId, "completed", client);
      }

      const refreshedTrip = assertFound(
        await this.transportRepository.findTripById(tripId, client),
        "Trip"
      );

      return {
        recordedEvents,
        tripStatus: refreshedTrip.tripStatus,
        tripCompleted
      };
    });

    if (attendanceResult.tripCompleted) {
      await (this.transportEtaService?.markTripCompleted?.(tripId) ?? Promise.resolve());
    }

    return {
      tripId,
      stopId,
      tripStatus: attendanceResult.tripStatus,
      stopCompleted: true,
      tripCompleted: attendanceResult.tripCompleted,
      recordedEvents: attendanceResult.recordedEvents.map((event) =>
        toTripStudentEventResponseDto(event)
      )
    };
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

  private selectNearestActiveParentStopSnapshot(
    parentStops: Array<{ stopId: string; stopOrder: number }>,
    stopSnapshots: TransportTripEtaStopSnapshotRow[]
  ): TransportTripEtaStopSnapshotRow | null {
    if (parentStops.length === 0 || stopSnapshots.length === 0) {
      return null;
    }

    const stopSnapshotById = new Map(stopSnapshots.map((row) => [row.stopId, row]));
    const orderedParentStops = [...parentStops].sort((a, b) => {
      if (a.stopOrder !== b.stopOrder) {
        return a.stopOrder - b.stopOrder;
      }

      return a.stopId.localeCompare(b.stopId);
    });

    for (const stop of orderedParentStops) {
      const snapshot = stopSnapshotById.get(stop.stopId);

      if (snapshot && !snapshot.isCompleted) {
        return snapshot;
      }
    }

    return null;
  }

  private async enqueueTransportEtaRefreshEvent(
    tripId: string,
    trigger: TransportEtaRefreshEventTrigger,
    idempotencyKey: string,
    heartbeatRecordedAt: Date | undefined,
    queryable: Queryable
  ): Promise<void> {
    const payload: TransportEtaRefreshOutboxPayload = {
      tripId,
      trigger,
      ...(heartbeatRecordedAt
        ? { heartbeatRecordedAt: heartbeatRecordedAt.toISOString() }
        : {})
    };

    await this.transportEtaOutboxRepository.enqueueTripRefreshEvent(
      {
        tripId,
        payloadJson: payload,
        idempotencyKey,
        requestId: requestExecutionContextService.getCurrentContext()?.requestId ?? null
      },
      queryable
    );
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

    return this.profileResolutionService.requireDriverProfile(authUser.userId);
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
