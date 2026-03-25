import type {
  BusStatus,
  TripRosterEventType,
  TripStatus,
  TripStudentEventType,
  TripType
} from "../types/transport.types";

export interface RouteIdParamsDto {
  routeId: string;
}

export interface AssignmentIdParamsDto {
  id: string;
}

export interface TripIdParamsDto {
  id: string;
}

export interface TripStudentRosterQueryDto {
  search?: string;
  stopId?: string;
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

export interface CreateTripRequestDto {
  busId: string;
  routeId: string;
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

export interface TransportTripRosterStudentResponseDto {
  studentId: string;
  academicNo: string;
  fullName: string;
  assignedStop: {
    stopId: string;
    stopName: string;
    stopOrder: number;
  };
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
