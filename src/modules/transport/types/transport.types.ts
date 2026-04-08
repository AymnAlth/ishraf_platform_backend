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
  "completed",
  "cancelled"
] as const;
export const TRIP_STUDENT_EVENT_TYPE_VALUES = [
  "boarded",
  "dropped_off",
  "absent"
] as const;
export const TRIP_STOP_ATTENDANCE_STATUS_VALUES = ["present", "absent"] as const;
export const HOME_LOCATION_SOURCE_VALUES = ["admin", "parent"] as const;
export const HOME_LOCATION_STATUS_VALUES = [
  "pending",
  "approved",
  "rejected"
] as const;

export type BusStatus = (typeof BUS_STATUS_VALUES)[number];
export type TripType = (typeof TRIP_TYPE_VALUES)[number];
export type TripStatus = (typeof TRIP_STATUS_VALUES)[number];
export type TripStudentEventType = (typeof TRIP_STUDENT_EVENT_TYPE_VALUES)[number];
export type TripStopAttendanceStatus = (typeof TRIP_STOP_ATTENDANCE_STATUS_VALUES)[number];
export type TripRosterEventType = TripStudentEventType | "not_marked";
export type HomeLocationSource = (typeof HOME_LOCATION_SOURCE_VALUES)[number];
export type HomeLocationStatus = (typeof HOME_LOCATION_STATUS_VALUES)[number];

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

export interface TransportRouteAssignmentRow {
  routeAssignmentId: string;
  busId: string;
  plateNumber: string;
  capacity: number;
  busStatus: BusStatus;
  driverId: string | null;
  driverUserId: string | null;
  driverFullName: string | null;
  driverEmail: string | null;
  driverPhone: string | null;
  routeId: string;
  routeName: string;
  startPoint: string;
  endPoint: string;
  estimatedDurationMinutes: number;
  routeIsActive: boolean;
  startDate: Date | string;
  endDate: Date | string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface StudentHomeLocationRow {
  studentId: string;
  academicNo: string;
  studentFullName: string;
  locationId: string | null;
  addressLabel: string | null;
  addressText: string | null;
  latitude: number | string | null;
  longitude: number | string | null;
  source: HomeLocationSource | null;
  status: HomeLocationStatus | null;
  submittedByUserId: string | null;
  approvedByUserId: string | null;
  approvedAt: Date | null;
  notes: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
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

export interface TripStudentRosterFilters {
  search?: string;
  stopId?: string;
}

export interface TripStudentRosterRow {
  studentId: string;
  academicNo: string;
  fullName: string;
  stopId: string;
  stopName: string;
  stopLatitude: number | string;
  stopLongitude: number | string;
  stopOrder: number;
  homeLatitude: number | string | null;
  homeLongitude: number | string | null;
  homeAddressLabel: string | null;
  homeAddressText: string | null;
  lastEventType: TripStudentEventType | null;
  lastEventTime: Date | null;
  lastEventStopId: string | null;
}

export interface ParentTripStopRow {
  stopId: string;
  stopName: string;
  stopOrder: number;
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

export interface TransportRouteAssignmentWriteInput {
  busId: string;
  routeId: string;
  startDate: string;
  endDate?: string | null;
}

export interface DeactivateTransportRouteAssignmentInput {
  endDate: string;
}

export interface TripWriteInput {
  busId: string;
  routeId: string;
  tripDate: string;
  tripType: TripType;
}

export interface TripNaturalKey {
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

export interface RouteAssignmentScope {
  driverId?: string;
  applicableOnDate?: string;
  isActive?: boolean;
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

export interface StudentHomeLocationWriteInput {
  studentId: string;
  addressLabel?: string | null;
  addressText?: string | null;
  latitude: number;
  longitude: number;
  source: HomeLocationSource;
  status: HomeLocationStatus;
  submittedByUserId: string;
  approvedByUserId?: string | null;
  approvedAt?: Date | null;
  notes?: string | null;
}
