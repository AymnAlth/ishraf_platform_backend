import { env } from "../../config/env";
import { logger } from "../../config/logger";
import type {
  MapsEtaCoordinateInput,
  MapsEtaProviderPort,
  MapsEtaRouteGeometryResult,
  MapsEtaRouteStopInput,
  MapsEtaTripEtaResult
} from "./types/maps-eta-provider.types";
import { MapsEtaProviderError } from "./types/maps-eta-provider.types";

const MAPBOX_DIRECTIONS_BASE_URL = "https://api.mapbox.com/directions/v5/mapbox";
const MAX_TOTAL_COORDINATES = 25;
const ROUTE_GEOMETRY_PROFILE = "driving";
const TRIP_ETA_PROFILE = "driving-traffic";

interface MapboxDirectionsRouteLeg {
  distance?: number;
  duration?: number;
}

interface MapboxDirectionsResponse {
  code?: string;
  message?: string;
  routes?: Array<{
    distance?: number;
    duration?: number;
    geometry?: string;
    legs?: MapboxDirectionsRouteLeg[];
  }>;
}

const toCoordinatesPath = (points: MapsEtaCoordinateInput[]): string =>
  points.map((point) => `${point.longitude},${point.latitude}`).join(";");

const ensureCoordinateLimit = (count: number): void => {
  if (count > MAX_TOTAL_COORDINATES) {
    throw new MapsEtaProviderError(
      "mapboxDirections",
      "MAPBOX_DIRECTIONS_WAYPOINT_LIMIT",
      `Mapbox Directions supports at most ${MAX_TOTAL_COORDINATES} coordinates in this phase`,
      false
    );
  }
};

const toRoundedSeconds = (value: number | undefined): number =>
  value && Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;

export class MapboxAdapter implements MapsEtaProviderPort {
  readonly providerKey = "mapboxDirections";

  constructor(
    private readonly apiKey: string | undefined = env.MAPBOX_API_KEY,
    private readonly timeoutMs = env.MAPBOX_API_TIMEOUT_MS
  ) {}

  isConfigured(): boolean {
    return typeof this.apiKey === "string" && this.apiKey.trim().length > 0;
  }

  async computeRouteGeometryForStops(
    stops: MapsEtaRouteStopInput[]
  ): Promise<MapsEtaRouteGeometryResult> {
    if (stops.length < 2) {
      throw new MapsEtaProviderError(
        this.providerKey,
        "MAPBOX_DIRECTIONS_INSUFFICIENT_STOPS",
        "Route geometry requires at least two ordered stops",
        false
      );
    }

    ensureCoordinateLimit(stops.length);
    const response = await this.requestDirections(
      ROUTE_GEOMETRY_PROFILE,
      stops,
      {
        alternatives: "false",
        geometries: "polyline",
        overview: "full",
        steps: "false"
      }
    );
    const route = response.routes?.[0];

    if (!route?.geometry) {
      throw new MapsEtaProviderError(
        this.providerKey,
        "MAPBOX_DIRECTIONS_EMPTY_RESPONSE",
        "Mapbox Directions did not return route geometry",
        true
      );
    }

    const legs = route.legs ?? [];

    if (legs.length !== Math.max(0, stops.length - 1)) {
      throw new MapsEtaProviderError(
        this.providerKey,
        "MAPBOX_DIRECTIONS_INVALID_LEGS",
        "Mapbox Directions returned an unexpected leg count for route geometry",
        true
      );
    }

    let cumulativeDistanceMeters = 0;
    const stopMetrics = stops.map((stop, index) => {
      if (index > 0) {
        cumulativeDistanceMeters += Math.round(legs[index - 1]?.distance ?? 0);
      }

      return {
        stopId: stop.stopId,
        stopOrder: stop.stopOrder,
        cumulativeDistanceMeters
      };
    });

    return {
      encodedPolyline: route.geometry,
      totalDistanceMeters: Math.round(route.distance ?? cumulativeDistanceMeters),
      totalDurationSeconds: toRoundedSeconds(route.duration),
      stopMetrics
    };
  }

  async computeTrafficAwareTripEta(
    origin: MapsEtaCoordinateInput,
    remainingStops: MapsEtaRouteStopInput[]
  ): Promise<MapsEtaTripEtaResult> {
    if (remainingStops.length === 0) {
      return {
        totalDistanceMeters: 0,
        totalDurationSeconds: 0,
        remainingStops: []
      };
    }

    const routePoints = [origin, ...remainingStops];
    ensureCoordinateLimit(routePoints.length);
    const response = await this.requestDirections(
      TRIP_ETA_PROFILE,
      routePoints,
      {
        alternatives: "false",
        geometries: "polyline",
        overview: "false",
        steps: "false"
      }
    );
    const route = response.routes?.[0];

    if (!route) {
      throw new MapsEtaProviderError(
        this.providerKey,
        "MAPBOX_DIRECTIONS_EMPTY_RESPONSE",
        "Mapbox Directions did not return an ETA route",
        true
      );
    }

    const legs = route.legs ?? [];

    if (legs.length !== remainingStops.length) {
      throw new MapsEtaProviderError(
        this.providerKey,
        "MAPBOX_DIRECTIONS_INVALID_LEGS",
        "Mapbox Directions returned an unexpected leg count for trip ETA",
        true
      );
    }

    let cumulativeDistanceMeters = 0;
    let cumulativeDurationSeconds = 0;
    const stops = remainingStops.map((stop, index) => {
      cumulativeDistanceMeters += Math.round(legs[index]?.distance ?? 0);
      cumulativeDurationSeconds += toRoundedSeconds(legs[index]?.duration);

      return {
        stopId: stop.stopId,
        stopOrder: stop.stopOrder,
        distanceMeters: cumulativeDistanceMeters,
        durationSeconds: cumulativeDurationSeconds
      };
    });

    return {
      totalDistanceMeters: Math.round(route.distance ?? cumulativeDistanceMeters),
      totalDurationSeconds: toRoundedSeconds(route.duration) || cumulativeDurationSeconds,
      remainingStops: stops
    };
  }

  private async requestDirections(
    profile: string,
    points: MapsEtaCoordinateInput[],
    queryOptions: Record<string, string>
  ): Promise<MapboxDirectionsResponse> {
    if (!this.isConfigured()) {
      throw new MapsEtaProviderError(
        this.providerKey,
        "INTEGRATION_NOT_CONFIGURED",
        "Mapbox Directions API key is not configured",
        false
      );
    }

    const controller = new AbortController();
    const timeoutHandle = setTimeout(() => controller.abort(), this.timeoutMs);
    const query = new URLSearchParams({
      access_token: this.apiKey!,
      ...queryOptions
    });
    const requestUrl = `${MAPBOX_DIRECTIONS_BASE_URL}/${profile}/${toCoordinatesPath(points)}?${query.toString()}`;

    try {
      const response = await fetch(requestUrl, {
        method: "GET",
        signal: controller.signal
      });

      if (!response.ok) {
        const responseBody = await response.text();

        logger.warn(
          {
            providerKey: this.providerKey,
            status: response.status,
            body: responseBody.slice(0, 500)
          },
          "Mapbox Directions request failed"
        );

        throw new MapsEtaProviderError(
          this.providerKey,
          "MAPBOX_DIRECTIONS_HTTP_ERROR",
          `Mapbox Directions request failed with status ${response.status}`,
          response.status >= 500 || response.status === 429
        );
      }

      const payload = (await response.json()) as MapboxDirectionsResponse;

      if (payload.code && payload.code !== "Ok") {
        throw new MapsEtaProviderError(
          this.providerKey,
          "MAPBOX_DIRECTIONS_API_ERROR",
          payload.message ?? `Mapbox Directions returned code ${payload.code}`,
          payload.code !== "NoRoute"
        );
      }

      return payload;
    } catch (error) {
      if (error instanceof MapsEtaProviderError) {
        throw error;
      }

      if (error instanceof Error && error.name === "AbortError") {
        throw new MapsEtaProviderError(
          this.providerKey,
          "MAPBOX_DIRECTIONS_TIMEOUT",
          "Mapbox Directions request timed out",
          true
        );
      }

      throw new MapsEtaProviderError(
        this.providerKey,
        "MAPBOX_DIRECTIONS_REQUEST_FAILED",
        error instanceof Error ? error.message : "Unknown Mapbox Directions error",
        true
      );
    } finally {
      clearTimeout(timeoutHandle);
    }
  }
}

export const mapboxAdapter = new MapboxAdapter();