import type { TransportRouteStopMetric } from "../../../modules/transport/types/transport-eta.types";

export interface GoogleMapsCoordinateInput {
  latitude: number;
  longitude: number;
}

export interface GoogleMapsRouteStopInput extends GoogleMapsCoordinateInput {
  stopId: string;
  stopOrder: number;
}

export interface GoogleMapsTripEtaStopResult {
  stopId: string;
  stopOrder: number;
  distanceMeters: number;
  durationSeconds: number;
}

export interface GoogleMapsRouteGeometryResult {
  encodedPolyline: string;
  totalDistanceMeters: number;
  totalDurationSeconds: number;
  stopMetrics: TransportRouteStopMetric[];
}

export interface GoogleMapsTripEtaResult {
  totalDistanceMeters: number;
  totalDurationSeconds: number;
  remainingStops: GoogleMapsTripEtaStopResult[];
}

export class GoogleMapsProviderError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly retryable = true
  ) {
    super(message);
    this.name = "GoogleMapsProviderError";
  }
}

export interface GoogleMapsRoutesAdapterPort {
  isConfigured(): boolean;
  computeRouteGeometryForStops(
    stops: GoogleMapsRouteStopInput[]
  ): Promise<GoogleMapsRouteGeometryResult>;
  computeTrafficAwareTripEta(
    origin: GoogleMapsCoordinateInput,
    remainingStops: GoogleMapsRouteStopInput[]
  ): Promise<GoogleMapsTripEtaResult>;
}
