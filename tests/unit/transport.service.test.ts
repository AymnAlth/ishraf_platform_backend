import { beforeEach, describe, expect, it, vi } from "vitest";

import { ConflictError } from "../../src/common/errors/conflict-error";
import { ForbiddenError } from "../../src/common/errors/forbidden-error";
import { ValidationError } from "../../src/common/errors/validation-error";
import { db } from "../../src/database/db";
import type { AutomationPort } from "../../src/modules/automation/types/automation.types";
import { TransportService } from "../../src/modules/transport/service/transport.service";
import type { TransportRepository } from "../../src/modules/transport/repository/transport.repository";
import type {
  BusRow,
  DriverReferenceRow,
  LatestTripLocationRow,
  RouteRow,
  RouteStopRow,
  StudentHomeLocationRow,
  StudentBusAssignmentRow,
  StudentTransportReferenceRow,
  TransportRouteAssignmentRow,
  TripRow,
  TripStudentEventRow
} from "../../src/modules/transport/types/transport.types";

const driverRow = (overrides: Partial<DriverReferenceRow> = {}): DriverReferenceRow => ({
  driverId: "1",
  driverUserId: "1004",
  driverFullName: "Ali Driver",
  driverEmail: "driver@example.com",
  driverPhone: "01000000004",
  ...overrides
});

const busRow = (overrides: Partial<BusRow> = {}): BusRow => ({
  id: "1",
  plateNumber: "BUS-001",
  capacity: 40,
  status: "active",
  driverId: "1",
  driverUserId: "1004",
  driverFullName: "Ali Driver",
  driverEmail: "driver@example.com",
  driverPhone: "01000000004",
  createdAt: new Date("2026-03-13T10:00:00.000Z"),
  updatedAt: new Date("2026-03-13T10:00:00.000Z"),
  ...overrides
});

const routeRow = (overrides: Partial<RouteRow> = {}): RouteRow => ({
  id: "1",
  routeName: "Route 1",
  startPoint: "School",
  endPoint: "Dhamar",
  estimatedDurationMinutes: 35,
  isActive: true,
  createdAt: new Date("2026-03-13T10:00:00.000Z"),
  updatedAt: new Date("2026-03-13T10:00:00.000Z"),
  ...overrides
});

const routeStopRow = (overrides: Partial<RouteStopRow> = {}): RouteStopRow => ({
  routeId: "1",
  routeName: "Route 1",
  stopId: "10",
  stopName: "Main Stop",
  latitude: 14.1234567,
  longitude: 44.1234567,
  stopOrder: 1,
  ...overrides
});

const studentRow = (
  overrides: Partial<StudentTransportReferenceRow> = {}
): StudentTransportReferenceRow => ({
  studentId: "1",
  academicNo: "STU-1001",
  fullName: "Student One",
  classId: "1",
  className: "A",
  section: "A",
  academicYearId: "1",
  academicYearName: "2025-2026",
  ...overrides
});

const assignmentRow = (
  overrides: Partial<StudentBusAssignmentRow> = {}
): StudentBusAssignmentRow => ({
  assignmentId: "20",
  studentId: "1",
  academicNo: "STU-1001",
  studentFullName: "Student One",
  routeId: "1",
  routeName: "Route 1",
  stopId: "10",
  stopName: "Main Stop",
  startDate: "2026-03-13",
  endDate: null,
  isActive: true,
  ...overrides
});

const routeAssignmentRow = (
  overrides: Partial<TransportRouteAssignmentRow> = {}
): TransportRouteAssignmentRow => ({
  routeAssignmentId: "50",
  busId: "1",
  plateNumber: "BUS-001",
  capacity: 40,
  busStatus: "active",
  driverId: "1",
  driverUserId: "1004",
  driverFullName: "Ali Driver",
  driverEmail: "driver@example.com",
  driverPhone: "01000000004",
  routeId: "1",
  routeName: "Route 1",
  startPoint: "School",
  endPoint: "Dhamar",
  estimatedDurationMinutes: 35,
  routeIsActive: true,
  startDate: "2026-03-01",
  endDate: null,
  isActive: true,
  createdAt: new Date("2026-03-01T10:00:00.000Z"),
  updatedAt: new Date("2026-03-01T10:00:00.000Z"),
  ...overrides
});

const tripRow = (overrides: Partial<TripRow> = {}): TripRow => ({
  id: "30",
  tripDate: "2026-03-13",
  tripType: "pickup",
  tripStatus: "scheduled",
  startedAt: null,
  endedAt: null,
  createdAt: new Date("2026-03-13T10:00:00.000Z"),
  updatedAt: new Date("2026-03-13T10:00:00.000Z"),
  busId: "1",
  plateNumber: "BUS-001",
  driverId: "1",
  driverName: "Ali Driver",
  routeId: "1",
  routeName: "Route 1",
  latestLatitude: null,
  latestLongitude: null,
  latestRecordedAt: null,
  boardedCount: 0,
  droppedOffCount: 0,
  absentCount: 0,
  totalEvents: 0,
  ...overrides
});

const studentHomeLocationRow = (
  overrides: Partial<StudentHomeLocationRow> = {}
): StudentHomeLocationRow => ({
  studentId: "1",
  academicNo: "STU-1001",
  studentFullName: "Student One",
  locationId: "60",
  addressLabel: "Main Home",
  addressText: "Near the market",
  latitude: 14.4455667,
  longitude: 44.5566778,
  source: "admin",
  status: "approved",
  submittedByUserId: "1001",
  approvedByUserId: "1001",
  approvedAt: new Date("2026-03-13T10:00:00.000Z"),
  notes: null,
  createdAt: new Date("2026-03-13T10:00:00.000Z"),
  updatedAt: new Date("2026-03-13T10:00:00.000Z"),
  ...overrides
});

const latestLocationRow = (
  overrides: Partial<LatestTripLocationRow> = {}
): LatestTripLocationRow => ({
  tripId: "30",
  latitude: 14.2233445,
  longitude: 44.2233445,
  recordedAt: new Date("2026-03-13T10:15:00.000Z"),
  ...overrides
});

const tripEventRow = (
  overrides: Partial<TripStudentEventRow> = {}
): TripStudentEventRow => ({
  tripStudentEventId: "40",
  tripId: "30",
  tripDate: "2026-03-13",
  tripType: "pickup",
  tripStatus: "started",
  studentId: "1",
  academicNo: "STU-1001",
  studentFullName: "Student One",
  eventType: "boarded",
  eventTime: new Date("2026-03-13T10:20:00.000Z"),
  stopId: "10",
  stopName: "Main Stop",
  notes: null,
  ...overrides
});

describe("TransportService", () => {
  const repositoryMock = {
    findDriverProfileByUserId: vi.fn(),
    findDriverById: vi.fn(),
    createBus: vi.fn(),
    listBuses: vi.fn(),
    findBusById: vi.fn(),
    hasDriverBusOwnership: vi.fn(),
    createRoute: vi.fn(),
    listRoutes: vi.fn(),
    findRouteById: vi.fn(),
    createRouteStop: vi.fn(),
    listRouteStopsByRouteId: vi.fn(),
    findRouteStopById: vi.fn(),
    findStudentTransportReferenceById: vi.fn(),
    findStudentBusAssignmentById: vi.fn(),
    findActiveStudentAssignmentByStudentId: vi.fn(),
    createStudentBusAssignment: vi.fn(),
    deactivateStudentBusAssignment: vi.fn(),
    listActiveStudentAssignments: vi.fn(),
    createTransportRouteAssignment: vi.fn(),
    findTransportRouteAssignmentById: vi.fn(),
    listTransportRouteAssignments: vi.fn(),
    hasDriverRouteAssignmentOwnership: vi.fn(),
    deactivateTransportRouteAssignment: vi.fn(),
    createTrip: vi.fn(),
    findTripByNaturalKey: vi.fn(),
    listTrips: vi.fn(),
    findTripById: vi.fn(),
    hasDriverTripOwnership: vi.fn(),
    updateTripStatus: vi.fn(),
    createTripLocation: vi.fn(),
    findLatestTripLocationByTripId: vi.fn(),
    createTripStudentEvent: vi.fn(),
    findTripStudentEventById: vi.fn(),
    listTripEventsByTripId: vi.fn(),
    findStudentAssignmentByStudentIdOnDate: vi.fn(),
    findStudentHomeLocationByStudentId: vi.fn(),
    upsertStudentHomeLocation: vi.fn(),
    deleteStudentHomeLocation: vi.fn()
  };

  let transportService: TransportService;
  const automationMock = {
    onStudentAbsent: vi.fn(),
    onNegativeBehavior: vi.fn(),
    onTripStarted: vi.fn(),
    onStudentDroppedOff: vi.fn()
  };

  beforeEach(() => {
    transportService = new TransportService(
      repositoryMock as unknown as TransportRepository,
      undefined,
      undefined,
      automationMock as unknown as AutomationPort
    );

    vi.restoreAllMocks();
    vi.spyOn(db, "withTransaction").mockImplementation(async (callback) => {
      const fakeClient = {
        query: vi.fn(),
        release: vi.fn()
      };

      return callback(fakeClient as never);
    });

    Object.values(repositoryMock).forEach((mockFn) => mockFn.mockReset());
    Object.values(automationMock).forEach((mockFn) => mockFn.mockReset());
    vi.mocked(repositoryMock.findDriverProfileByUserId).mockResolvedValue(driverRow());
    vi.mocked(repositoryMock.hasDriverBusOwnership).mockResolvedValue(true);
    vi.mocked(repositoryMock.hasDriverTripOwnership).mockResolvedValue(true);
    vi.mocked(repositoryMock.hasDriverRouteAssignmentOwnership).mockResolvedValue(true);
  });

  it("creates buses for admins", async () => {
    vi.mocked(repositoryMock.findDriverById).mockResolvedValue(driverRow());
    vi.mocked(repositoryMock.createBus).mockResolvedValue("1");
    vi.mocked(repositoryMock.findBusById).mockResolvedValue(busRow());

    const response = await transportService.createBus(
      {
        userId: "1001",
        role: "admin",
        email: "admin@example.com",
        isActive: true
      },
      {
        plateNumber: "BUS-001",
        driverId: "1",
        capacity: 40
      }
    );

    expect(response.id).toBe("1");
    expect(repositoryMock.createBus).toHaveBeenCalledOnce();
  });

  it("rejects non-admin access to static transport management", async () => {
    await expect(
      transportService.listBuses({
        userId: "1004",
        role: "driver",
        email: "driver@example.com",
        isActive: true
      })
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("rejects assignment creation when stop does not belong to route", async () => {
    vi.mocked(repositoryMock.findStudentTransportReferenceById).mockResolvedValue(studentRow());
    vi.mocked(repositoryMock.findRouteById).mockResolvedValue(routeRow());
    vi.mocked(repositoryMock.findRouteStopById).mockResolvedValue(
      routeStopRow({
        routeId: "2"
      })
    );

    await expect(
      transportService.createStudentAssignment(
        {
          userId: "1001",
          role: "admin",
          email: "admin@example.com",
          isActive: true
        },
        {
          studentId: "1",
          routeId: "1",
          stopId: "10",
          startDate: "2026-03-13"
        }
      )
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("rejects a second active assignment for the same student", async () => {
    vi.mocked(repositoryMock.findStudentTransportReferenceById).mockResolvedValue(studentRow());
    vi.mocked(repositoryMock.findRouteById).mockResolvedValue(routeRow());
    vi.mocked(repositoryMock.findRouteStopById).mockResolvedValue(routeStopRow());
    vi.mocked(repositoryMock.findActiveStudentAssignmentByStudentId).mockResolvedValue(
      assignmentRow()
    );

    await expect(
      transportService.createStudentAssignment(
        {
          userId: "1001",
          role: "admin",
          email: "admin@example.com",
          isActive: true
        },
        {
          studentId: "1",
          routeId: "1",
          stopId: "10",
          startDate: "2026-03-13"
        }
      )
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("creates and lists transport route assignments", async () => {
    vi.mocked(repositoryMock.findBusById).mockResolvedValue(busRow());
    vi.mocked(repositoryMock.findRouteById).mockResolvedValue(routeRow());
    vi.mocked(repositoryMock.createTransportRouteAssignment).mockResolvedValue("50");
    vi.mocked(repositoryMock.findTransportRouteAssignmentById).mockResolvedValue(
      routeAssignmentRow()
    );
    vi.mocked(repositoryMock.listTransportRouteAssignments).mockResolvedValue([
      routeAssignmentRow()
    ]);

    const created = await transportService.createRouteAssignment(
      {
        userId: "1001",
        role: "admin",
        email: "admin@example.com",
        isActive: true
      },
      {
        busId: "1",
        routeId: "1",
        startDate: "2026-03-13"
      }
    );
    const listed = await transportService.listRouteAssignments({
      userId: "1001",
      role: "admin",
      email: "admin@example.com",
      isActive: true
    });

    expect(created.routeAssignmentId).toBe("50");
    expect(listed).toHaveLength(1);
    expect(listed[0].route.routeName).toBe("Route 1");
  });

  it("ensures a daily trip by reusing an existing trip when one already exists", async () => {
    vi.mocked(repositoryMock.findTransportRouteAssignmentById).mockResolvedValue(
      routeAssignmentRow()
    );
    vi.mocked(repositoryMock.findDriverProfileByUserId).mockResolvedValue(driverRow());
    vi.mocked(repositoryMock.hasDriverRouteAssignmentOwnership).mockResolvedValue(true);
    vi.mocked(repositoryMock.findTripByNaturalKey).mockResolvedValue(
      tripRow({
        id: "88"
      })
    );

    const response = await transportService.ensureDailyTrip(
      {
        userId: "1004",
        role: "driver",
        email: "driver@example.com",
        isActive: true
      },
      {
        routeAssignmentId: "50",
        tripDate: "2026-03-13",
        tripType: "pickup"
      }
    );

    expect(response.created).toBe(false);
    expect(response.trip.id).toBe("88");
    expect(repositoryMock.createTrip).not.toHaveBeenCalled();
  });

  it("rejects ensureDailyTrip when the route assignment does not cover the requested date", async () => {
    vi.mocked(repositoryMock.findTransportRouteAssignmentById).mockResolvedValue(
      routeAssignmentRow({
        startDate: "2026-03-20",
        endDate: null
      })
    );

    await expect(
      transportService.ensureDailyTrip(
        {
          userId: "1001",
          role: "admin",
          email: "admin@example.com",
          isActive: true
        },
        {
          routeAssignmentId: "50",
          tripDate: "2026-03-13",
          tripType: "pickup"
        }
      )
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("saves approved student home locations for admins", async () => {
    vi.mocked(repositoryMock.findStudentTransportReferenceById).mockResolvedValue(studentRow());
    vi.mocked(repositoryMock.upsertStudentHomeLocation).mockResolvedValue(undefined);
    vi.mocked(repositoryMock.findStudentHomeLocationByStudentId).mockResolvedValue(
      studentHomeLocationRow()
    );

    const response = await transportService.saveStudentHomeLocation(
      {
        userId: "1001",
        role: "admin",
        email: "admin@example.com",
        isActive: true
      },
      "1",
      {
        addressLabel: "Main Home",
        latitude: 14.4455667,
        longitude: 44.5566778
      }
    );

    expect(response.student.studentId).toBe("1");
    expect(response.homeLocation?.status).toBe("approved");
    expect(response.homeLocation?.approvedByUserId).toBe("1001");
  });

  it("allows drivers to create trips and enforces started-only locations", async () => {
    vi.mocked(repositoryMock.findBusById).mockResolvedValue(busRow());
    vi.mocked(repositoryMock.findRouteById).mockResolvedValue(routeRow());
    vi.mocked(repositoryMock.createTrip).mockResolvedValue("30");
    vi.mocked(repositoryMock.findTripById)
      .mockResolvedValueOnce(tripRow())
      .mockResolvedValueOnce(
        tripRow({
          tripStatus: "scheduled"
        })
      )
      .mockResolvedValueOnce(
        tripRow({
          tripStatus: "started",
          startedAt: new Date("2026-03-13T10:05:00.000Z")
        })
      );
    vi.mocked(repositoryMock.createTripLocation).mockResolvedValue(undefined);
    vi.mocked(repositoryMock.findLatestTripLocationByTripId).mockResolvedValue(
      latestLocationRow()
    );

    const tripResponse = await transportService.createTrip(
      {
        userId: "1004",
        role: "driver",
        email: "driver@example.com",
        isActive: true
      },
      {
        busId: "1",
        routeId: "1",
        tripDate: "2026-03-13",
        tripType: "pickup"
      }
    );

    expect(tripResponse.tripStatus).toBe("scheduled");

    await expect(
      transportService.recordTripLocation(
        {
          userId: "1004",
          role: "driver",
          email: "driver@example.com",
          isActive: true
        },
        "30",
        {
          latitude: 14.22,
          longitude: 44.22
        }
      )
    ).rejects.toBeInstanceOf(ValidationError);

    const locationResponse = await transportService.recordTripLocation(
      {
        userId: "1004",
        role: "driver",
        email: "driver@example.com",
        isActive: true
      },
      "30",
      {
        latitude: 14.22,
        longitude: 44.22
      }
    );

    expect(locationResponse.latitude).toBeCloseTo(14.2233445);
  });

  it("rejects trip student events when assignment route does not match trip route", async () => {
    vi.mocked(repositoryMock.findTripById).mockResolvedValue(
      tripRow({
        tripStatus: "started"
      })
    );
    vi.mocked(repositoryMock.findStudentTransportReferenceById).mockResolvedValue(studentRow());
    vi.mocked(repositoryMock.findStudentAssignmentByStudentIdOnDate).mockResolvedValue(
      assignmentRow({
        routeId: "2",
        routeName: "Route 2"
      })
    );

    await expect(
      transportService.createTripStudentEvent(
        {
          userId: "1004",
          role: "driver",
          email: "driver@example.com",
          isActive: true
        },
        "30",
        {
          studentId: "1",
          eventType: "boarded",
          stopId: "10"
        }
      )
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("creates trip student events when trip and assignment routes align", async () => {
    vi.mocked(repositoryMock.findTripById).mockResolvedValue(
      tripRow({
        tripStatus: "started"
      })
    );
    vi.mocked(repositoryMock.findStudentTransportReferenceById).mockResolvedValue(studentRow());
    vi.mocked(repositoryMock.findStudentAssignmentByStudentIdOnDate).mockResolvedValue(
      assignmentRow()
    );
    vi.mocked(repositoryMock.findRouteStopById).mockResolvedValue(routeStopRow());
    vi.mocked(repositoryMock.createTripStudentEvent).mockResolvedValue("40");
    vi.mocked(repositoryMock.findTripStudentEventById).mockResolvedValue(tripEventRow());

    const response = await transportService.createTripStudentEvent(
      {
        userId: "1004",
        role: "driver",
        email: "driver@example.com",
        isActive: true
      },
      "30",
      {
        studentId: "1",
        eventType: "boarded",
        stopId: "10"
      }
    );

    expect(response.tripStudentEventId).toBe("40");
    expect(repositoryMock.createTripStudentEvent).toHaveBeenCalledOnce();
  });

  it("triggers trip-start automation after a successful status transition", async () => {
    vi.mocked(repositoryMock.findTripById)
      .mockResolvedValueOnce(
        tripRow({
          tripStatus: "scheduled"
        })
      )
      .mockResolvedValueOnce(
        tripRow({
          tripStatus: "started",
          startedAt: new Date("2026-03-13T10:05:00.000Z")
        })
      );
    vi.mocked(repositoryMock.updateTripStatus).mockResolvedValue(undefined);

    await transportService.startTrip(
      {
        userId: "1001",
        role: "admin",
        email: "admin@example.com",
        isActive: true
      },
      "30"
    );

    expect(automationMock.onTripStarted).toHaveBeenCalledWith({
      tripId: "30",
      routeId: "1",
      routeName: "Route 1",
      tripDate: "2026-03-13"
    });
  });

  it("triggers dropped-off automation for dropped_off trip events only", async () => {
    vi.mocked(repositoryMock.findTripById).mockResolvedValue(
      tripRow({
        tripStatus: "started"
      })
    );
    vi.mocked(repositoryMock.findStudentTransportReferenceById).mockResolvedValue(studentRow());
    vi.mocked(repositoryMock.findStudentAssignmentByStudentIdOnDate).mockResolvedValue(
      assignmentRow()
    );
    vi.mocked(repositoryMock.findRouteStopById).mockResolvedValue(routeStopRow());
    vi.mocked(repositoryMock.createTripStudentEvent).mockResolvedValue("40");
    vi.mocked(repositoryMock.findTripStudentEventById).mockResolvedValue(
      tripEventRow({
        eventType: "dropped_off",
        stopName: "Main Stop"
      })
    );

    await transportService.createTripStudentEvent(
      {
        userId: "1001",
        role: "admin",
        email: "admin@example.com",
        isActive: true
      },
      "30",
      {
        studentId: "1",
        eventType: "dropped_off",
        stopId: "10"
      }
    );

    expect(automationMock.onStudentDroppedOff).toHaveBeenCalledWith({
      tripStudentEventId: "40",
      studentId: "1",
      studentName: "Student One",
      stopName: "Main Stop"
    });
  });
});
