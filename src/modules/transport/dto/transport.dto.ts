import type {
  BusStatus,
  HomeLocationStatus,
  TripStatus,
  TripRosterEventType,
  TripStopAttendanceStatus,
  TripStudentEventType,
  TripType
} from "../types/transport.types";
import type {
  TransportEtaCalculationMode,
  TransportEtaStatus
} from "../types/transport-eta.types";

export interface RouteIdParamsDto {
  routeId: string;
}

export interface AssignmentIdParamsDto {
  id: string;
}

export interface StudentIdParamsDto {
  studentId: string;
}

export interface TripIdParamsDto {
  id: string;
}

export interface TripResourceParamsDto {
  tripId: string;
}

export interface TripStopAttendanceParamsDto {
  tripId: string;
  stopId: string;
}

export interface TripStudentRosterQueryDto {
  search?: string;
  stopId?: string;
}

export interface TransportRealtimeTokenQueryDto {
  tripId: string;
}

export interface CreateBusRequestDto {
  plateNumber: string;
  driverId?: string;
  capacity: number;
  status?: BusStatus;
}

export interface CreateRouteRequestDto {
  routeName: string;
  startPoint: string;
  endPoint: string;
  estimatedDurationMinutes?: number;
  isActive?: boolean;
}

export interface CreateRouteStopRequestDto {
  stopName: string;
  latitude: number;
  longitude: number;
  stopOrder: number;
}

export interface CreateStudentBusAssignmentRequestDto {
  studentId: string;
  routeId: string;
  stopId: string;
  startDate: string;
  endDate?: string | null;
}

export interface DeactivateStudentBusAssignmentRequestDto {
  endDate?: string;
}

export interface CreateTransportRouteAssignmentRequestDto {
  busId: string;
  routeId: string;
  startDate: string;
  endDate?: string | null;
}

export interface DeactivateTransportRouteAssignmentRequestDto {
  endDate?: string;
}

export interface CreateTripRequestDto {
  busId: string;
  routeId: string;
  tripDate: string;
  tripType: TripType;
}

export interface EnsureDailyTripRequestDto {
  routeAssignmentId: string;
  tripDate: string;
  tripType: TripType;
}

export interface ListTripsQueryDto {
  page: number;
  limit: number;
  sortBy: "tripDate" | "tripStatus" | "startedAt" | "createdAt";
  sortOrder: "asc" | "desc";
  busId?: string;
  routeId?: string;
  tripType?: TripType;
  tripStatus?: TripStatus;
  tripDate?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface RecordTripLocationRequestDto {
  latitude: number;
  longitude: number;
}

export interface CreateTripStudentEventRequestDto {
  studentId: string;
  eventType: TripStudentEventType;
  stopId?: string;
  notes?: string | null;
}

export interface RecordTripStopAttendanceItemDto {
  studentId: string;
  status: TripStopAttendanceStatus;
  notes?: string | null;
}

export interface RecordTripStopAttendanceRequestDto {
  attendances: RecordTripStopAttendanceItemDto[];
}

export interface SaveStudentHomeLocationRequestDto {
  addressLabel?: string | null;
  addressText?: string | null;
  latitude: number;
  longitude: number;
  status?: HomeLocationStatus;
  notes?: string | null;
}

export interface TransportDriverSummaryDto {
  driverId: string;
  userId: string;
  fullName: string;
  email: string | null;
  phone: string | null;
}

export interface TransportBusResponseDto {
  id: string;
  plateNumber: string;
  capacity: number;
  status: BusStatus;
  driver: TransportDriverSummaryDto | null;
}

export interface TransportRouteResponseDto {
  id: string;
  routeName: string;
  startPoint: string;
  endPoint: string;
  estimatedDurationMinutes: number;
  isActive: boolean;
}

export interface TransportRouteStopResponseDto {
  stopId: string;
  stopName: string;
  latitude: number;
  longitude: number;
  stopOrder: number;
}

export interface TransportStudentSummaryDto {
  studentId: string;
  academicNo: string;
  fullName: string;
}

export interface TransportStudentBusAssignmentResponseDto {
  assignmentId: string;
  student: TransportStudentSummaryDto;
  route: {
    id: string;
    routeName: string;
  };
  stop: {
    id: string;
    stopName: string;
  };
  startDate: string;
  endDate: string | null;
  isActive: boolean;
}

export interface TransportRouteAssignmentResponseDto {
  routeAssignmentId: string;
  bus: {
    id: string;
    plateNumber: string;
    capacity: number;
    status: BusStatus;
  };
  driver: TransportDriverSummaryDto | null;
  route: {
    id: string;
    routeName: string;
    startPoint: string;
    endPoint: string;
    estimatedDurationMinutes: number;
    isActive: boolean;
  };
  startDate: string;
  endDate: string | null;
  isActive: boolean;
}

export interface TransportLatestLocationResponseDto {
  latitude: number;
  longitude: number;
  recordedAt: string;
}

export interface TransportTripEventSummaryDto {
  boardedCount: number;
  droppedOffCount: number;
  absentCount: number;
  totalEvents: number;
}

export interface TransportTripResponseDto {
  id: string;
  tripDate: string;
  tripType: TripType;
  tripStatus: TripStatus;
  startedAt: string | null;
  endedAt: string | null;
  bus: {
    id: string;
    plateNumber: string;
  };
  driver: {
    driverId: string | null;
    fullName: string | null;
  };
  route: {
    id: string;
    routeName: string;
  };
}

export interface TransportTripListItemResponseDto extends TransportTripResponseDto {
  latestLocation: TransportLatestLocationResponseDto | null;
  eventSummary: TransportTripEventSummaryDto;
}

export interface TransportTripDetailResponseDto {
  trip: TransportTripResponseDto;
  latestLocation: TransportLatestLocationResponseDto | null;
  routeStops: TransportRouteStopResponseDto[];
  eventSummary: TransportTripEventSummaryDto;
}

export interface TransportEnsureDailyTripResponseDto {
  created: boolean;
  trip: TransportTripListItemResponseDto;
}

export interface TransportTripRosterStudentResponseDto {
  studentId: string;
  academicNo: string;
  fullName: string;
  assignedStop: {
    stopId: string;
    stopName: string;
    latitude: number;
    longitude: number;
    stopOrder: number;
  };
  homeLocation: {
    latitude: number;
    longitude: number;
    addressLabel: string | null;
    addressText: string | null;
  } | null;
  currentTripEventType: TripRosterEventType;
  lastEvent: {
    eventType: TripStudentEventType | null;
    eventTime: string | null;
    stopId: string | null;
  };
}

export interface TransportTripRosterResponseDto {
  tripId: string;
  tripStatus: TripStatus;
  students: TransportTripRosterStudentResponseDto[];
}

export interface TransportTripStudentEventResponseDto {
  tripStudentEventId: string;
  student: TransportStudentSummaryDto;
  eventType: TripStudentEventType;
  eventTime: string;
  stop: {
    stopId: string;
    stopName: string;
  } | null;
  notes: string | null;
}

export interface TransportTripStopAttendanceResponseDto {
  tripId: string;
  stopId: string;
  tripStatus: TripStatus;
  stopCompleted: boolean;
  tripCompleted: boolean;
  recordedEvents: TransportTripStudentEventResponseDto[];
}

export interface TransportStudentHomeLocationResponseDto {
  student: TransportStudentSummaryDto;
  homeLocation: {
    locationId: string;
    addressLabel: string | null;
    addressText: string | null;
    latitude: number;
    longitude: number;
    source: "admin" | "parent";
    status: HomeLocationStatus;
    submittedByUserId: string;
    approvedByUserId: string | null;
    approvedAt: string | null;
    notes: string | null;
    createdAt: string;
    updatedAt: string;
  } | null;
}

export interface TransportRealtimeTokenResponseDto {
  customToken: string;
  databaseUrl: string;
  path: string;
  tripId: string;
  access: "read" | "write";
  refreshAfterSeconds: number;
}

export interface TransportTripEtaSummaryDto {
  status: TransportEtaStatus;
  calculationMode: TransportEtaCalculationMode | null;
  nextStop: {
    stopId: string;
    stopName: string;
    stopOrder: number;
  } | null;
  nextStopEtaAt: string | null;
  finalEtaAt: string | null;
  remainingDistanceMeters: number | null;
  remainingDurationSeconds: number | null;
  computedAt: string;
  isStale: boolean;
}

export interface TransportTripEtaStopResponseDto {
  stopId: string;
  stopName: string;
  stopOrder: number;
  etaAt: string | null;
  remainingDistanceMeters: number | null;
  remainingDurationSeconds: number | null;
  isNextStop: boolean;
  isCompleted: boolean;
}

export interface TransportTripEtaResponseDto {
  tripId: string;
  tripStatus: TripStatus;
  routePolyline: {
    encodedPolyline: string;
  } | null;
  etaSummary: TransportTripEtaSummaryDto | null;
  remainingStops: TransportTripEtaStopResponseDto[];
  computedAt: string | null;
}

export interface TransportTripLiveStatusStopSnapshotDto {
  stopId: string;
  stopName: string;
  stopOrder: number;
  etaAt: string | null;
  remainingDistanceMeters: number | null;
  remainingDurationSeconds: number | null;
  isCompleted: boolean;
  approachingNotified: boolean;
  arrivedNotified: boolean;
  updatedAt: string;
}

export interface TransportTripLiveStatusResponseDto {
  tripId: string;
  tripStatus: TripStatus;
  firebaseRtdbPath: string;
  myStopSnapshot: TransportTripLiveStatusStopSnapshotDto | null;
  routePolyline: {
    encodedPolyline: string;
  } | null;
}

export interface TransportTripSummaryResponseDto {
  tripId: string;
  tripStatus: TripStatus;
  scheduledStartTime: string | null;
  actualStartTime: string | null;
  actualEndTime: string | null;
  startDelayMinutes: number | null;
  attendance: {
    totalStudents: number;
    presentCount: number;
    absentCount: number;
  };
}
