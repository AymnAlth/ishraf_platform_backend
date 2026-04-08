import type { RouteStopRow } from "./transport.types";

export const TRANSPORT_ETA_STATUS_VALUES = [
  "fresh",
  "stale",
  "unavailable",
  "completed"
] as const;

export const PERSISTED_TRANSPORT_ETA_CALCULATION_MODE_VALUES = [
  "provider_snapshot",
  "derived_estimate"
] as const;

export const TRANSPORT_ETA_CALCULATION_MODE_VALUES = [
  "provider_snapshot",
  "derived_estimate"
] as const;

export const TRANSPORT_ETA_REFRESH_REASON_VALUES = [
  "trip_started",
  "heartbeat_window",
  "deviation_threshold",
  "manual_rebuild"
] as const;

export const TRANSPORT_ETA_REFRESH_EVENT_TRIGGER_VALUES = [
  "trip_started",
  "heartbeat"
] as const;
export const TRANSPORT_ETA_OUTBOX_PROVIDER_KEY = "transportMaps";
export const TRANSPORT_ETA_OUTBOX_EVENT_TYPE = "transport_eta_refresh";

export type TransportEtaStatus = (typeof TRANSPORT_ETA_STATUS_VALUES)[number];
export type PersistedTransportEtaCalculationMode =
  (typeof PERSISTED_TRANSPORT_ETA_CALCULATION_MODE_VALUES)[number];
export type TransportEtaCalculationMode =
  (typeof TRANSPORT_ETA_CALCULATION_MODE_VALUES)[number];
export type TransportEtaRefreshReason = (typeof TRANSPORT_ETA_REFRESH_REASON_VALUES)[number];
export type TransportEtaRefreshEventTrigger =
  (typeof TRANSPORT_ETA_REFRESH_EVENT_TRIGGER_VALUES)[number];

export interface TransportRouteStopMetric {
  stopId: string;
  stopOrder: number;
  cumulativeDistanceMeters: number;
}

export interface TransportRouteMapCacheRow {
  id: string;
  routeId: string;
  stopSignatureHash: string;
  providerKey: string;
  encodedPolyline: string;
  totalDistanceMeters: number;
  totalDurationSeconds: number;
  stopMetricsJson: TransportRouteStopMetric[];
  computedAt: Date;
  lastErrorCode: string | null;
  lastErrorMessage: string | null;
}

export interface TransportTripLocationPointRow {
  id: string;
  tripId: string;
  latitude: number | string;
  longitude: number | string;
  recordedAt: Date;
}

export interface TransportTripEtaSnapshotRow {
  tripId: string;
  routeId: string;
  routeMapCacheId: string | null;
  providerKey: string;
  refreshReason: TransportEtaRefreshReason | null;
  status: TransportEtaStatus;
  calculationMode: PersistedTransportEtaCalculationMode | null;
  basedOnLocationId: string | null;
  basedOnLatitude: number | string | null;
  basedOnLongitude: number | string | null;
  basedOnRecordedAt: Date | null;
  projectedDistanceMeters: number | string | null;
  remainingDistanceMeters: number | string | null;
  remainingDurationSeconds: number | string | null;
  estimatedSpeedMps: number | string | null;
  nextStopId: string | null;
  nextStopOrder: number | null;
  nextStopEtaAt: Date | null;
  finalEtaAt: Date | null;
  providerRefreshedAt: Date | null;
  computedAt: Date;
  lastDeviationMeters: number | string | null;
  lastErrorCode: string | null;
  lastErrorMessage: string | null;
}

export interface TransportTripEtaStopSnapshotRow {
  tripId: string;
  stopId: string;
  stopOrder: number;
  stopName: string;
  etaAt: Date | null;
  remainingDistanceMeters: number | string | null;
  remainingDurationSeconds: number | string | null;
  isNextStop: boolean;
  isCompleted: boolean;
  approachingNotified: boolean;
  arrivedNotified: boolean;
  updatedAt: Date;
}

export interface TransportTripEtaSnapshotWriteInput {
  tripId: string;
  routeId: string;
  routeMapCacheId: string | null;
  providerKey: string;
  refreshReason: TransportEtaRefreshReason | null;
  status: TransportEtaStatus;
  calculationMode: PersistedTransportEtaCalculationMode | null;
  basedOnLocationId: string | null;
  basedOnLatitude: number | null;
  basedOnLongitude: number | null;
  basedOnRecordedAt: Date | null;
  projectedDistanceMeters: number | null;
  remainingDistanceMeters: number | null;
  remainingDurationSeconds: number | null;
  estimatedSpeedMps: number | null;
  nextStopId: string | null;
  nextStopOrder: number | null;
  nextStopEtaAt: Date | null;
  finalEtaAt: Date | null;
  providerRefreshedAt: Date | null;
  computedAt: Date;
  lastDeviationMeters: number | null;
  lastErrorCode: string | null;
  lastErrorMessage: string | null;
}

export interface TransportTripEtaStopSnapshotWriteInput {
  tripId: string;
  stopId: string;
  stopOrder: number;
  stopName: string;
  etaAt: Date | null;
  remainingDistanceMeters: number | null;
  remainingDurationSeconds: number | null;
  isNextStop: boolean;
  isCompleted: boolean;
  approachingNotified: boolean;
  arrivedNotified: boolean;
  updatedAt: Date;
}

export interface TransportEtaApproachingStopClaimRow {
  tripId: string;
  stopId: string;
  stopOrder: number;
  stopName: string;
}

export interface TransportEtaArrivedStopClaimRow {
  tripId: string;
  stopId: string;
  stopOrder: number;
  stopName: string;
}

export interface TransportEtaApproachingRecipientRow {
  stopId: string;
  parentUserId: string;
  studentId: string;
  studentFullName: string;
}

export type TransportEtaStopRecipientRow = TransportEtaApproachingRecipientRow;

export interface TransportTripEtaSummaryReadModel {
  status: TransportEtaStatus;
  calculationMode: TransportEtaCalculationMode | null;
  nextStop: {
    stopId: string;
    stopName: string;
    stopOrder: number;
  } | null;
  nextStopEtaAt: Date | null;
  finalEtaAt: Date | null;
  remainingDistanceMeters: number | null;
  remainingDurationSeconds: number | null;
  computedAt: Date;
  isStale: boolean;
}

export interface TransportTripEtaStopReadModel {
  stopId: string;
  stopName: string;
  stopOrder: number;
  etaAt: Date | null;
  remainingDistanceMeters: number | null;
  remainingDurationSeconds: number | null;
  isNextStop: boolean;
  isCompleted: boolean;
}

export interface TransportTripEtaReadModel {
  tripId: string;
  routeId: string;
  routePolyline: {
    encodedPolyline: string;
  } | null;
  etaSummary: TransportTripEtaSummaryReadModel | null;
  remainingStops: TransportTripEtaStopReadModel[];
  computedAt: Date | null;
}

export interface TransportEtaRefreshOutboxPayload {
  tripId: string;
  trigger: TransportEtaRefreshEventTrigger;
  heartbeatRecordedAt?: string;
}

export interface TransportEtaRouteStop extends RouteStopRow {
  latitude: number;
  longitude: number;
}

export const PROVIDER_SNAPSHOT_PERSISTED_MODE: PersistedTransportEtaCalculationMode =
  "provider_snapshot";

export const normalizeTransportEtaCalculationMode = (
  value: PersistedTransportEtaCalculationMode | null
): TransportEtaCalculationMode | null => {
  if (!value) {
    return null;
  }

  return value === "derived_estimate" ? "derived_estimate" : "provider_snapshot";
};
