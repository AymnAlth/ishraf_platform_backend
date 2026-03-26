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
  TransportTripListItemResponseDto,
  TransportTripRosterResponseDto,
  TransportTripRosterStudentResponseDto,
  TransportTripResponseDto,
  TransportTripStudentEventResponseDto
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

const toNumber = (value: number | string): number => Number(value);

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
