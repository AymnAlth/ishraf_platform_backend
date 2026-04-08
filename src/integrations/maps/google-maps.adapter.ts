import {
  googleMapsRoutesAdapter,
  GoogleMapsRoutesAdapter
} from "../google-maps/google-maps-routes.adapter";
import type {
  GoogleMapsRoutesAdapterPort,
  GoogleMapsRouteStopInput
} from "../google-maps/types/google-maps.types";
import type {
  MapsEtaCoordinateInput,
  MapsEtaProviderPort,
  MapsEtaRouteGeometryResult,
  MapsEtaRouteStopInput,
  MapsEtaTripEtaResult
} from "./types/maps-eta-provider.types";
import { MapsEtaProviderError } from "./types/maps-eta-provider.types";

const toGoogleStops = (stops: MapsEtaRouteStopInput[]): GoogleMapsRouteStopInput[] =>
  stops.map((stop) => ({
    stopId: stop.stopId,
    stopOrder: stop.stopOrder,
    latitude: stop.latitude,
    longitude: stop.longitude
  }));

const toProviderError = (error: unknown): MapsEtaProviderError => {
  if (error instanceof MapsEtaProviderError) {
    return error;
  }

  if (error && typeof error === "object" && "code" in error) {
    return new MapsEtaProviderError(
      "googleRoutes",
      String((error as { code: unknown }).code),
      error instanceof Error ? error.message : "Google Maps provider error",
      Boolean((error as { retryable?: unknown }).retryable ?? true)
    );
  }

  return new MapsEtaProviderError(
    "googleRoutes",
    "GOOGLE_ROUTES_REQUEST_FAILED",
    error instanceof Error ? error.message : "Google Maps provider error",
    true
  );
};

export class GoogleMapsAdapter implements MapsEtaProviderPort {
  readonly providerKey = "googleRoutes";

  constructor(
    private readonly routesAdapter: GoogleMapsRoutesAdapterPort = googleMapsRoutesAdapter
  ) {}

  isConfigured(): boolean {
    return this.routesAdapter.isConfigured();
  }

  async computeRouteGeometryForStops(
    stops: MapsEtaRouteStopInput[]
  ): Promise<MapsEtaRouteGeometryResult> {
    try {
      return await this.routesAdapter.computeRouteGeometryForStops(toGoogleStops(stops));
    } catch (error) {
      throw toProviderError(error);
    }
  }

  async computeTrafficAwareTripEta(
    origin: MapsEtaCoordinateInput,
    remainingStops: MapsEtaRouteStopInput[]
  ): Promise<MapsEtaTripEtaResult> {
    try {
      return await this.routesAdapter.computeTrafficAwareTripEta(origin, toGoogleStops(remainingStops));
    } catch (error) {
      throw toProviderError(error);
    }
  }
}

export const googleMapsAdapter = new GoogleMapsAdapter();
export { GoogleMapsRoutesAdapter };