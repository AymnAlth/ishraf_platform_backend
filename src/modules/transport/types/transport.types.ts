import type {
  PaginationQuery,
  SortQuery
} from "../../../common/types/pagination.types";

export const BUS_STATUS_VALUES = ["active", "inactive", "maintenance"] as const;
export const TRIP_TYPE_VALUES = ["pickup", "dropoff"] as const;
export const TRIP_STATUS_VALUES = [
  "scheduled",
  "started",
  "ended",
  "cancelled"
] as const;
export const TRIP_STUDENT_EVENT_TYPE_VALUES = [
  "boarded",
  "dropped_off",
  "absent"
] as const;

export type BusStatus = (typeof BUS_STATUS_VALUES)[number];
export type TripType = (typeof TRIP_TYPE_VALUES)[number];
export type TripStatus = (typeof TRIP_STATUS_VALUES)[number];
export type TripStudentEventType = (typeof TRIP_STUDENT_EVENT_TYPE_VALUES)[number];

export interface DriverReferenceRow {
  driverId: string;
  driverUserId: string;
  driverFullName: string;
  driverEmail: string | null;
  driverPhone: string | null;
}

export interface BusRow {
  id: string;
  plateNumber: string;
  capacity: number;
  status: BusStatus;
  driverId: string | null;
  driverUserId: string | null;
  driverFullName: string | null;
  driverEmail: string | null;
  driverPhone: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface RouteRow {
  id: string;
  routeName: string;
  startPoint: string;
  endPoint: string;
  estimatedDurationMinutes: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface RouteStopRow {
  routeId: string;
  routeName: string;
  stopId: string;
  stopName: string;
  latitude: number | string;
  longitude: number | string;
  stopOrder: number;
  createdAt?: Date;
}

export interface StudentTransportReferenceRow {
  studentId: string;
  academicNo: string;
  fullName: string;
  classId: string;
  className: string;
  section: string;
  academicYearId: string;
  academicYearName: string;
}

export interface StudentBusAssignmentRow {
  assignmentId: string;
  studentId: string;
  academicNo: string;
  studentFullName: string;
  routeId: string;
  routeName: string;
  stopId: string;
  stopName: string;
  startDate: Date | string;
  endDate: Date | string | null;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface LatestTripLocationRow {
  tripId: string;
  latitude: number | string;
  longitude: number | string;
  recordedAt: Date;
}

export interface TripRow {
  id: string;
  tripDate: Date | string;
  tripType: TripType;
  tripStatus: TripStatus;
  startedAt: Date | null;
  endedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  busId: string;
  plateNumber: string;
  driverId: string | null;
  driverName: string | null;
  routeId: string;
  routeName: string;
  latestLatitude: number | string | null;
  latestLongitude: number | string | null;
  latestRecordedAt: Date | null;
  boardedCount: number;
  droppedOffCount: number;
  absentCount: number;
  totalEvents: number;
}

export interface TripStudentEventRow {
  tripStudentEventId: string;
  tripId: string;
  tripDate: Date | string;
  tripType: TripType;
  tripStatus: TripStatus;
  studentId: string;
  academicNo: string;
  studentFullName: string;
  eventType: TripStudentEventType;
  eventTime: Date;
  stopId: string | null;
  stopName: string | null;
  notes: string | null;
}

export interface BusWriteInput {
  plateNumber: string;
  driverId?: string;
  capacity: number;
  status: BusStatus;
}

export interface RouteWriteInput {
  routeName: string;
  startPoint: string;
  endPoint: string;
  estimatedDurationMinutes: number;
  isActive: boolean;
}

export interface RouteStopWriteInput {
  routeId: string;
  stopName: string;
  latitude: number;
  longitude: number;
  stopOrder: number;
}

export interface StudentBusAssignmentWriteInput {
  studentId: string;
  routeId: string;
  stopId: string;
  startDate: string;
  endDate?: string | null;
}

export interface DeactivateStudentBusAssignmentInput {
  endDate: string;
}

export interface TripWriteInput {
  busId: string;
  routeId: string;
  tripDate: string;
  tripType: TripType;
}

export interface TripFilters {
  busId?: string;
  routeId?: string;
  tripType?: TripType;
  tripStatus?: TripStatus;
  tripDate?: string;
  dateFrom?: string;
  dateTo?: string;
}

export const TRIP_LIST_SORT_FIELDS = [
  "tripDate",
  "tripStatus",
  "startedAt",
  "createdAt"
] as const;

export type TripListSortField = (typeof TRIP_LIST_SORT_FIELDS)[number];

export interface TripListQuery
  extends TripFilters,
    PaginationQuery,
    SortQuery<TripListSortField> {}

export interface TripScope {
  driverId?: string;
}

export interface TripLocationWriteInput {
  tripId: string;
  latitude: number;
  longitude: number;
}

export interface TripStudentEventWriteInput {
  tripId: string;
  studentId: string;
  eventType: TripStudentEventType;
  stopId?: string | null;
  notes?: string | null;
}
