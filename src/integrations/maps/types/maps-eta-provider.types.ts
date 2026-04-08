import type { TransportRouteStopMetric } from "../../../modules/transport/types/transport-eta.types";

export interface MapsEtaCoordinateInput {
  latitude: number;
  longitude: number;
}

export interface MapsEtaRouteStopInput extends MapsEtaCoordinateInput {
  stopId: string;
  stopOrder: number;
}

export interface MapsEtaTripEtaStopResult {
  stopId: string;
  stopOrder: number;
  distanceMeters: number;
  durationSeconds: number;
}

export interface MapsEtaRouteGeometryResult {
  encodedPolyline: string;
  totalDistanceMeters: number;
  totalDurationSeconds: number;
  stopMetrics: TransportRouteStopMetric[];
}

export interface MapsEtaTripEtaResult {
  totalDistanceMeters: number;
  totalDurationSeconds: number;
  remainingStops: MapsEtaTripEtaStopResult[];
}

export class MapsEtaProviderError extends Error {
  constructor(
    public readonly providerKey: string,
    public readonly code: string,
    message: string,
    public readonly retryable = true
  ) {
    super(message);
    this.name = "MapsEtaProviderError";
  }
}

export interface MapsEtaProviderPort {
  readonly providerKey: string;
  isConfigured(): boolean;
  computeRouteGeometryForStops(
    stops: MapsEtaRouteStopInput[]
  ): Promise<MapsEtaRouteGeometryResult>;
  computeTrafficAwareTripEta(
    origin: MapsEtaCoordinateInput,
    remainingStops: MapsEtaRouteStopInput[]
  ): Promise<MapsEtaTripEtaResult>;
}