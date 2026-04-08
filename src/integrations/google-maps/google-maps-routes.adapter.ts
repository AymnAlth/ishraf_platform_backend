import { env } from "../../config/env";
import { logger } from "../../config/logger";
import type {
  GoogleMapsCoordinateInput,
  GoogleMapsRouteGeometryResult,
  GoogleMapsRouteStopInput,
  GoogleMapsRoutesAdapterPort,
  GoogleMapsTripEtaResult
} from "./types/google-maps.types";
import { GoogleMapsProviderError } from "./types/google-maps.types";

const COMPUTE_ROUTES_URL = "https://routes.googleapis.com/directions/v2:computeRoutes";
const MAX_TOTAL_WAYPOINTS = 27;
const FIELD_MASK_ROUTE_GEOMETRY = [
  "routes.distanceMeters",
  "routes.duration",
  "routes.polyline.encodedPolyline",
  "routes.legs.distanceMeters"
].join(",");
const FIELD_MASK_TRIP_ETA = [
  "routes.distanceMeters",
  "routes.duration",
  "routes.legs.distanceMeters",
  "routes.legs.duration"
].join(",");

interface GoogleRoutesLeg {
  distanceMeters?: number;
  duration?: string;
}

interface GoogleRoutesResponse {
  routes?: Array<{
    distanceMeters?: number;
    duration?: string;
    polyline?: {
      encodedPolyline?: string;
    };
    legs?: GoogleRoutesLeg[];
  }>;
}

const toWaypoint = ({ latitude, longitude }: GoogleMapsCoordinateInput) => ({
  location: {
    latLng: {
      latitude,
      longitude
    }
  }
});

const parseDurationSeconds = (value: string | undefined): number => {
  if (!value) {
    return 0;
  }

  const match = value.match(/^(-?\d+(?:\.\d+)?)s$/);

  if (!match) {
    throw new GoogleMapsProviderError(
      "GOOGLE_ROUTES_INVALID_DURATION",
      `Unexpected Google Routes duration value: ${value}`,
      false
    );
  }

  return Math.max(0, Math.round(Number(match[1])));
};

const ensureWaypointLimit = (count: number): void => {
  if (count > MAX_TOTAL_WAYPOINTS) {
    throw new GoogleMapsProviderError(
      "GOOGLE_ROUTES_WAYPOINT_LIMIT",
      `Google Routes supports at most ${MAX_TOTAL_WAYPOINTS} total waypoints in this phase`,
      false
    );
  }
};

export class GoogleMapsRoutesAdapter implements GoogleMapsRoutesAdapterPort {
  constructor(
    private readonly apiKey: string | undefined = env.GOOGLE_MAPS_API_KEY,
    private readonly timeoutMs = env.GOOGLE_MAPS_API_TIMEOUT_MS
  ) {}

  isConfigured(): boolean {
    return typeof this.apiKey === "string" && this.apiKey.trim().length > 0;
  }

  async computeRouteGeometryForStops(
    stops: GoogleMapsRouteStopInput[]
  ): Promise<GoogleMapsRouteGeometryResult> {
    if (stops.length < 2) {
      throw new GoogleMapsProviderError(
        "GOOGLE_ROUTES_INSUFFICIENT_STOPS",
        "Route geometry requires at least two ordered stops",
        false
      );
    }

    ensureWaypointLimit(stops.length);
    const response = await this.requestComputeRoutes(
      {
        origin: toWaypoint(stops[0]),
        destination: toWaypoint(stops[stops.length - 1]),
        intermediates: stops.slice(1, -1).map((stop) => toWaypoint(stop)),
        travelMode: "DRIVE",
        routingPreference: "TRAFFIC_UNAWARE",
        polylineQuality: "HIGH_QUALITY",
        computeAlternativeRoutes: false,
        languageCode: "en-US",
        units: "METRIC"
      },
      FIELD_MASK_ROUTE_GEOMETRY
    );
    const route = response.routes?.[0];

    if (!route?.polyline?.encodedPolyline) {
      throw new GoogleMapsProviderError(
        "GOOGLE_ROUTES_EMPTY_RESPONSE",
        "Google Routes did not return route geometry",
        true
      );
    }

    const legs = route.legs ?? [];

    if (legs.length !== Math.max(0, stops.length - 1)) {
      throw new GoogleMapsProviderError(
        "GOOGLE_ROUTES_INVALID_LEGS",
        "Google Routes returned an unexpected leg count for route geometry",
        true
      );
    }

    let cumulativeDistanceMeters = 0;
    const stopMetrics = stops.map((stop, index) => {
      if (index > 0) {
        cumulativeDistanceMeters += legs[index - 1]?.distanceMeters ?? 0;
      }

      return {
        stopId: stop.stopId,
        stopOrder: stop.stopOrder,
        cumulativeDistanceMeters
      };
    });

    return {
      encodedPolyline: route.polyline.encodedPolyline,
      totalDistanceMeters: route.distanceMeters ?? cumulativeDistanceMeters,
      totalDurationSeconds: parseDurationSeconds(route.duration),
      stopMetrics
    };
  }

  async computeTrafficAwareTripEta(
    origin: GoogleMapsCoordinateInput,
    remainingStops: GoogleMapsRouteStopInput[]
  ): Promise<GoogleMapsTripEtaResult> {
    if (remainingStops.length === 0) {
      return {
        totalDistanceMeters: 0,
        totalDurationSeconds: 0,
        remainingStops: []
      };
    }

    ensureWaypointLimit(remainingStops.length + 1);
    const response = await this.requestComputeRoutes(
      {
        origin: toWaypoint(origin),
        destination: toWaypoint(remainingStops[remainingStops.length - 1]),
        intermediates: remainingStops.slice(0, -1).map((stop) => toWaypoint(stop)),
        travelMode: "DRIVE",
        routingPreference: "TRAFFIC_AWARE_OPTIMAL",
        computeAlternativeRoutes: false,
        languageCode: "en-US",
        units: "METRIC"
      },
      FIELD_MASK_TRIP_ETA
    );
    const route = response.routes?.[0];

    if (!route) {
      throw new GoogleMapsProviderError(
        "GOOGLE_ROUTES_EMPTY_RESPONSE",
        "Google Routes did not return an ETA route",
        true
      );
    }

    const legs = route.legs ?? [];

    if (legs.length !== remainingStops.length) {
      throw new GoogleMapsProviderError(
        "GOOGLE_ROUTES_INVALID_LEGS",
        "Google Routes returned an unexpected leg count for trip ETA",
        true
      );
    }

    let cumulativeDistanceMeters = 0;
    let cumulativeDurationSeconds = 0;
    const stops = remainingStops.map((stop, index) => {
      cumulativeDistanceMeters += legs[index]?.distanceMeters ?? 0;
      cumulativeDurationSeconds += parseDurationSeconds(legs[index]?.duration);

      return {
        stopId: stop.stopId,
        stopOrder: stop.stopOrder,
        distanceMeters: cumulativeDistanceMeters,
        durationSeconds: cumulativeDurationSeconds
      };
    });

    return {
      totalDistanceMeters: route.distanceMeters ?? cumulativeDistanceMeters,
      totalDurationSeconds: parseDurationSeconds(route.duration) || cumulativeDurationSeconds,
      remainingStops: stops
    };
  }

  private async requestComputeRoutes(
    payload: Record<string, unknown>,
    fieldMask: string
  ): Promise<GoogleRoutesResponse> {
    if (!this.isConfigured()) {
      throw new GoogleMapsProviderError(
        "INTEGRATION_NOT_CONFIGURED",
        "Google Maps Routes API key is not configured",
        false
      );
    }

    const controller = new AbortController();
    const timeoutHandle = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(COMPUTE_ROUTES_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": this.apiKey!,
          "X-Goog-FieldMask": fieldMask
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      if (!response.ok) {
        const responseBody = await response.text();

        logger.warn(
          {
            status: response.status,
            body: responseBody.slice(0, 500)
          },
          "Google Routes request failed"
        );

        throw new GoogleMapsProviderError(
          "GOOGLE_ROUTES_HTTP_ERROR",
          `Google Routes request failed with status ${response.status}`,
          response.status >= 500 || response.status === 429
        );
      }

      return (await response.json()) as GoogleRoutesResponse;
    } catch (error) {
      if (error instanceof GoogleMapsProviderError) {
        throw error;
      }

      if (error instanceof Error && error.name === "AbortError") {
        throw new GoogleMapsProviderError(
          "GOOGLE_ROUTES_TIMEOUT",
          "Google Routes request timed out",
          true
        );
      }

      throw new GoogleMapsProviderError(
        "GOOGLE_ROUTES_REQUEST_FAILED",
        error instanceof Error ? error.message : "Unknown Google Routes error",
        true
      );
    } finally {
      clearTimeout(timeoutHandle);
    }
  }
}

export const googleMapsRoutesAdapter = new GoogleMapsRoutesAdapter();
