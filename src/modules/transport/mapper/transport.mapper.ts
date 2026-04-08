import { toDateOnly } from "../../../common/utils/date.util";

import type {
  TransportBusResponseDto,
  TransportLatestLocationResponseDto,
  TransportRouteResponseDto,
  TransportRouteAssignmentResponseDto,
  TransportRouteStopResponseDto,
  TransportStudentHomeLocationResponseDto,
  TransportStudentBusAssignmentResponseDto,
  TransportStudentSummaryDto,
  TransportTripDetailResponseDto,
  TransportTripEventSummaryDto,
  TransportTripLiveStatusResponseDto,
  TransportTripLiveStatusStopSnapshotDto,
  TransportTripListItemResponseDto,
  TransportTripRosterResponseDto,
  TransportTripRosterStudentResponseDto,
  TransportTripResponseDto,
  TransportTripSummaryResponseDto,
  TransportTripStudentEventResponseDto,
  TransportTripEtaResponseDto
} from "../dto/transport.dto";
import type {
  BusRow,
  LatestTripLocationRow,
  RouteRow,
  TransportRouteAssignmentRow,
  RouteStopRow,
  StudentHomeLocationRow,
  StudentBusAssignmentRow,
  TripRow,
  TripStudentRosterRow,
  TripStudentEventRow
} from "../types/transport.types";
import type {
  TransportTripEtaReadModel,
  TransportTripEtaStopSnapshotRow
} from "../types/transport-eta.types";

const toNumber = (value: number | string): number => Number(value);
const toNullableNumber = (value: number | string | null): number | null =>
  value === null ? null : Number(value);

const toTripEventSummary = (row: TripRow): TransportTripEventSummaryDto => ({
  boardedCount: row.boardedCount,
  droppedOffCount: row.droppedOffCount,
  absentCount: row.absentCount,
  totalEvents: row.totalEvents
});

export const toBusResponseDto = (row: BusRow): TransportBusResponseDto => ({
  id: row.id,
  plateNumber: row.plateNumber,
  capacity: row.capacity,
  status: row.status,
  driver:
    row.driverId && row.driverUserId
      ? {
          driverId: row.driverId,
          userId: row.driverUserId,
          fullName: row.driverFullName ?? "",
          email: row.driverEmail,
          phone: row.driverPhone
        }
      : null
});

export const toRouteResponseDto = (row: RouteRow): TransportRouteResponseDto => ({
  id: row.id,
  routeName: row.routeName,
  startPoint: row.startPoint,
  endPoint: row.endPoint,
  estimatedDurationMinutes: row.estimatedDurationMinutes,
  isActive: row.isActive
});

export const toRouteStopResponseDto = (
  row: RouteStopRow
): TransportRouteStopResponseDto => ({
  stopId: row.stopId,
  stopName: row.stopName,
  latitude: toNumber(row.latitude),
  longitude: toNumber(row.longitude),
  stopOrder: row.stopOrder
});

export const toStudentBusAssignmentResponseDto = (
  row: StudentBusAssignmentRow
): TransportStudentBusAssignmentResponseDto => ({
  assignmentId: row.assignmentId,
  student: {
    studentId: row.studentId,
    academicNo: row.academicNo,
    fullName: row.studentFullName
  },
  route: {
    id: row.routeId,
    routeName: row.routeName
  },
  stop: {
    id: row.stopId,
    stopName: row.stopName
  },
  startDate: toDateOnly(row.startDate),
  endDate: row.endDate ? toDateOnly(row.endDate) : null,
  isActive: row.isActive
});

const toStudentSummaryDto = (
  studentId: string,
  academicNo: string,
  fullName: string
): TransportStudentSummaryDto => ({
  studentId,
  academicNo,
  fullName
});

export const toRouteAssignmentResponseDto = (
  row: TransportRouteAssignmentRow
): TransportRouteAssignmentResponseDto => ({
  routeAssignmentId: row.routeAssignmentId,
  bus: {
    id: row.busId,
    plateNumber: row.plateNumber,
    capacity: row.capacity,
    status: row.busStatus
  },
  driver:
    row.driverId && row.driverUserId
      ? {
          driverId: row.driverId,
          userId: row.driverUserId,
          fullName: row.driverFullName ?? "",
          email: row.driverEmail,
          phone: row.driverPhone
        }
      : null,
  route: {
    id: row.routeId,
    routeName: row.routeName,
    startPoint: row.startPoint,
    endPoint: row.endPoint,
    estimatedDurationMinutes: row.estimatedDurationMinutes,
    isActive: row.routeIsActive
  },
  startDate: toDateOnly(row.startDate),
  endDate: row.endDate ? toDateOnly(row.endDate) : null,
  isActive: row.isActive
});

export const toTripLocationResponseDto = (
  row: LatestTripLocationRow
): TransportLatestLocationResponseDto => ({
  latitude: toNumber(row.latitude),
  longitude: toNumber(row.longitude),
  recordedAt: row.recordedAt.toISOString()
});

export const toTripResponseDto = (row: TripRow): TransportTripResponseDto => ({
  id: row.id,
  tripDate: toDateOnly(row.tripDate),
  tripType: row.tripType,
  tripStatus: row.tripStatus,
  startedAt: row.startedAt ? row.startedAt.toISOString() : null,
  endedAt: row.endedAt ? row.endedAt.toISOString() : null,
  bus: {
    id: row.busId,
    plateNumber: row.plateNumber
  },
  driver: {
    driverId: row.driverId,
    fullName: row.driverName
  },
  route: {
    id: row.routeId,
    routeName: row.routeName
  }
});

export const toTripListItemResponseDto = (
  row: TripRow
): TransportTripListItemResponseDto => ({
  ...toTripResponseDto(row),
  latestLocation:
    row.latestLatitude !== null && row.latestLongitude !== null && row.latestRecordedAt
      ? {
          latitude: toNumber(row.latestLatitude),
          longitude: toNumber(row.latestLongitude),
          recordedAt: row.latestRecordedAt.toISOString()
        }
      : null,
  eventSummary: toTripEventSummary(row)
});

export const toTripDetailResponseDto = (
  row: TripRow,
  routeStops: RouteStopRow[]
): TransportTripDetailResponseDto => ({
  trip: toTripResponseDto(row),
  latestLocation:
    row.latestLatitude !== null && row.latestLongitude !== null && row.latestRecordedAt
      ? {
          latitude: toNumber(row.latestLatitude),
          longitude: toNumber(row.latestLongitude),
          recordedAt: row.latestRecordedAt.toISOString()
        }
      : null,
  routeStops: routeStops.map((stop) => toRouteStopResponseDto(stop)),
  eventSummary: toTripEventSummary(row)
});

export const toTripRosterStudentResponseDto = (
  row: TripStudentRosterRow
): TransportTripRosterStudentResponseDto => ({
  studentId: row.studentId,
  academicNo: row.academicNo,
  fullName: row.fullName,
  assignedStop: {
    stopId: row.stopId,
    stopName: row.stopName,
    latitude: toNumber(row.stopLatitude),
    longitude: toNumber(row.stopLongitude),
    stopOrder: row.stopOrder
  },
  homeLocation:
    row.homeLatitude !== null && row.homeLongitude !== null
      ? {
          latitude: toNumber(row.homeLatitude),
          longitude: toNumber(row.homeLongitude),
          addressLabel: row.homeAddressLabel,
          addressText: row.homeAddressText
        }
      : null,
  currentTripEventType: row.lastEventType ?? "not_marked",
  lastEvent: {
    eventType: row.lastEventType,
    eventTime: row.lastEventTime ? row.lastEventTime.toISOString() : null,
    stopId: row.lastEventStopId
  }
});

export const toTripRosterResponseDto = (
  trip: TripRow,
  rows: TripStudentRosterRow[]
): TransportTripRosterResponseDto => ({
  tripId: trip.id,
  tripStatus: trip.tripStatus,
  students: rows.map((row) => toTripRosterStudentResponseDto(row))
});

export const toTripStudentEventResponseDto = (
  row: TripStudentEventRow
): TransportTripStudentEventResponseDto => ({
  tripStudentEventId: row.tripStudentEventId,
  student: toStudentSummaryDto(row.studentId, row.academicNo, row.studentFullName),
  eventType: row.eventType,
  eventTime: row.eventTime.toISOString(),
  stop:
    row.stopId && row.stopName
      ? {
          stopId: row.stopId,
          stopName: row.stopName
        }
      : null,
  notes: row.notes
});

export const toStudentHomeLocationResponseDto = (
  row: StudentHomeLocationRow
): TransportStudentHomeLocationResponseDto => ({
  student: toStudentSummaryDto(row.studentId, row.academicNo, row.studentFullName),
  homeLocation:
    row.locationId &&
    row.latitude !== null &&
    row.longitude !== null &&
    row.source &&
    row.status &&
    row.submittedByUserId &&
    row.createdAt &&
    row.updatedAt
      ? {
          locationId: row.locationId,
          addressLabel: row.addressLabel,
          addressText: row.addressText,
          latitude: toNumber(row.latitude),
          longitude: toNumber(row.longitude),
          source: row.source,
          status: row.status,
          submittedByUserId: row.submittedByUserId,
          approvedByUserId: row.approvedByUserId,
          approvedAt: row.approvedAt ? row.approvedAt.toISOString() : null,
          notes: row.notes,
          createdAt: row.createdAt.toISOString(),
          updatedAt: row.updatedAt.toISOString()
        }
      : null
});

export const toTripEtaResponseDto = (
  trip: TripRow,
  readModel: TransportTripEtaReadModel
): TransportTripEtaResponseDto => ({
  tripId: trip.id,
  tripStatus: trip.tripStatus,
  routePolyline: readModel.routePolyline,
  etaSummary: readModel.etaSummary
    ? {
        status: readModel.etaSummary.status,
        calculationMode: readModel.etaSummary.calculationMode,
        nextStop: readModel.etaSummary.nextStop,
        nextStopEtaAt: readModel.etaSummary.nextStopEtaAt
          ? readModel.etaSummary.nextStopEtaAt.toISOString()
          : null,
        finalEtaAt: readModel.etaSummary.finalEtaAt
          ? readModel.etaSummary.finalEtaAt.toISOString()
          : null,
        remainingDistanceMeters: readModel.etaSummary.remainingDistanceMeters,
        remainingDurationSeconds: readModel.etaSummary.remainingDurationSeconds,
        computedAt: readModel.etaSummary.computedAt.toISOString(),
        isStale: readModel.etaSummary.isStale
      }
    : null,
  remainingStops: readModel.remainingStops.map((stop) => ({
    stopId: stop.stopId,
    stopName: stop.stopName,
    stopOrder: stop.stopOrder,
    etaAt: stop.etaAt ? stop.etaAt.toISOString() : null,
    remainingDistanceMeters: stop.remainingDistanceMeters,
    remainingDurationSeconds: stop.remainingDurationSeconds,
    isNextStop: stop.isNextStop,
    isCompleted: stop.isCompleted
  })),
  computedAt: readModel.computedAt ? readModel.computedAt.toISOString() : null
});

export const toTripLiveStatusStopSnapshotDto = (
  row: TransportTripEtaStopSnapshotRow
): TransportTripLiveStatusStopSnapshotDto => ({
  stopId: row.stopId,
  stopName: row.stopName,
  stopOrder: row.stopOrder,
  etaAt: row.etaAt ? row.etaAt.toISOString() : null,
  remainingDistanceMeters: toNullableNumber(row.remainingDistanceMeters),
  remainingDurationSeconds: toNullableNumber(row.remainingDurationSeconds),
  isCompleted: row.isCompleted,
  approachingNotified: row.approachingNotified,
  arrivedNotified: row.arrivedNotified,
  updatedAt: row.updatedAt.toISOString()
});

export const toTripLiveStatusResponseDto = (
  trip: TripRow,
  firebaseRtdbPath: string,
  myStopSnapshot: TransportTripEtaStopSnapshotRow | null,
  routePolyline: {
    encodedPolyline: string;
  } | null
): TransportTripLiveStatusResponseDto => ({
  tripId: trip.id,
  tripStatus: trip.tripStatus,
  firebaseRtdbPath,
  myStopSnapshot: myStopSnapshot ? toTripLiveStatusStopSnapshotDto(myStopSnapshot) : null,
  routePolyline
});

export const toTripSummaryResponseDto = (
  trip: TripRow,
  attendance: {
    totalStudents: number;
    presentCount: number;
    absentCount: number;
  }
): TransportTripSummaryResponseDto => ({
  tripId: trip.id,
  tripStatus: trip.tripStatus,
  scheduledStartTime: null,
  actualStartTime: trip.startedAt ? trip.startedAt.toISOString() : null,
  actualEndTime: trip.endedAt ? trip.endedAt.toISOString() : null,
  startDelayMinutes: null,
  attendance
});
