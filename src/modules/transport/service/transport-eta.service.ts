import { createHash } from "node:crypto";

import { logger } from "../../../config/logger";
import { db } from "../../../database/db";
import type { MapsEtaProviderResolverPort } from "../../../integrations/maps/maps-eta-provider.resolver";
import { mapsEtaProviderResolver } from "../../../integrations/maps/maps-eta-provider.resolver";
import type { SystemSettingsReadService } from "../../system-settings/service/system-settings-read.service";
import { getSystemSettingsDefaultValues } from "../../system-settings/system-settings.registry";
import type { TransportMapsSettings } from "../../system-settings/types/system-settings.types";
import type { TransportRepository } from "../repository/transport.repository";
import { TransportEtaRepository } from "../repository/transport-eta.repository";
import {
  decodeGooglePolyline,
  haversineDistanceMeters,
  projectPointOntoPolyline
} from "./transport-eta.geometry";
import type {
  TransportEtaRefreshReason,
  TransportEtaRouteStop,
  TransportEtaStatus,
  TransportRouteMapCacheRow,
  TransportTripEtaReadModel,
  TransportTripEtaSnapshotRow,
  TransportTripEtaSnapshotWriteInput,
  TransportTripEtaStopReadModel,
  TransportTripEtaStopSnapshotWriteInput,
  TransportTripLocationPointRow
} from "../types/transport-eta.types";
import {
  normalizeTransportEtaCalculationMode,
  PROVIDER_SNAPSHOT_PERSISTED_MODE
} from "../types/transport-eta.types";
import type { TransportProximityServicePort } from "./transport-proximity.service";

const DERIVED_REFRESH_INTERVAL_MS = 60_000;
const LOCATION_STALE_THRESHOLD_MS = 120_000;
const STOP_COMPLETION_TOLERANCE_METERS = 25;
const MIN_SPEED_KPH = 15;
const MAX_SPEED_KPH = 80;
const MIN_SPEED_MPS = MIN_SPEED_KPH / 3.6;
const MAX_SPEED_MPS = MAX_SPEED_KPH / 3.6;

const toNumber = (value: number | string | null | undefined): number | null =>
  value === null || value === undefined ? null : Number(value);

const clamp = (value: number, minimum: number, maximum: number): number =>
  Math.max(minimum, Math.min(maximum, value));

const addSeconds = (value: Date, seconds: number): Date =>
  new Date(value.getTime() + seconds * 1000);

const normalizeRouteStops = (
  stops: Array<{
    stopId: string;
    stopName: string;
    stopOrder: number;
    latitude: number | string;
    longitude: number | string;
    routeId: string;
    routeName: string;
  }>
): TransportEtaRouteStop[] =>
  stops.map((stop) => ({
    ...stop,
    latitude: Number(stop.latitude),
    longitude: Number(stop.longitude)
  }));

const buildStopSignature = (stops: TransportEtaRouteStop[]): string =>
  createHash("sha256")
    .update(
      JSON.stringify(
        stops.map((stop) => ({
          stopId: stop.stopId,
          stopOrder: stop.stopOrder,
          latitude: stop.latitude,
          longitude: stop.longitude
        }))
      )
    )
    .digest("hex");

const getRouteAverageSpeedMps = (routeMapCache: TransportRouteMapCacheRow): number => {
  if (routeMapCache.totalDistanceMeters <= 0 || routeMapCache.totalDurationSeconds <= 0) {
    return MIN_SPEED_MPS;
  }

  return clamp(
    routeMapCache.totalDistanceMeters / routeMapCache.totalDurationSeconds,
    MIN_SPEED_MPS,
    MAX_SPEED_MPS
  );
};

const scaleProjectedDistance = (
  geometryProjectedDistanceMeters: number,
  geometryTotalDistanceMeters: number,
  routeMapCache: TransportRouteMapCacheRow
): number => {
  if (geometryTotalDistanceMeters <= 0 || routeMapCache.totalDistanceMeters <= 0) {
    return 0;
  }

  return clamp(
    (geometryProjectedDistanceMeters / geometryTotalDistanceMeters) * routeMapCache.totalDistanceMeters,
    0,
    routeMapCache.totalDistanceMeters
  );
};

const buildSyntheticSingleStopRouteCache = (
  routeId: string,
  providerKey: string,
  stopSignatureHash: string,
  stop: TransportEtaRouteStop,
  computedAt: Date
): Omit<TransportRouteMapCacheRow, "id"> => ({
  routeId,
  stopSignatureHash,
  providerKey,
  encodedPolyline: "",
  totalDistanceMeters: 0,
  totalDurationSeconds: 0,
  stopMetricsJson: [
    {
      stopId: stop.stopId,
      stopOrder: stop.stopOrder,
      cumulativeDistanceMeters: 0
    }
  ],
  computedAt,
  lastErrorCode: null,
  lastErrorMessage: null
});

const isLocationStale = (recordedAt: Date, now: Date): boolean =>
  now.getTime() - recordedAt.getTime() > LOCATION_STALE_THRESHOLD_MS;

const getSnapshotStatus = (
  latestLocation: TransportTripLocationPointRow,
  now: Date,
  hasRemainingStops: boolean
): TransportEtaStatus => {
  if (!hasRemainingStops) {
    return "completed";
  }

  return isLocationStale(latestLocation.recordedAt, now) ? "stale" : "fresh";
};

const buildRemainingStopMap = (routeMapCache: TransportRouteMapCacheRow): Map<string, number> =>
  new Map(
    routeMapCache.stopMetricsJson.map(
      (metric) => [metric.stopId, metric.cumulativeDistanceMeters] as const
    )
  );

const buildProjectionPoints = (
  routeStops: TransportEtaRouteStop[],
  routeMapCache: TransportRouteMapCacheRow
) => {
  const decodedPolyline = decodeGooglePolyline(routeMapCache.encodedPolyline);

  if (decodedPolyline.length > 0) {
    return decodedPolyline;
  }

  return routeStops.map((stop) => ({
    latitude: stop.latitude,
    longitude: stop.longitude
  }));
};

const resolveObservedSpeedMps = (locations: TransportTripLocationPointRow[]): number | null => {
  if (locations.length < 2) {
    return null;
  }

  const [latest, previous] = locations;
  const elapsedSeconds = (latest.recordedAt.getTime() - previous.recordedAt.getTime()) / 1000;

  if (elapsedSeconds <= 0) {
    return null;
  }

  const distanceMeters = haversineDistanceMeters(
    {
      latitude: Number(previous.latitude),
      longitude: Number(previous.longitude)
    },
    {
      latitude: Number(latest.latitude),
      longitude: Number(latest.longitude)
    }
  );

  return clamp(distanceMeters / elapsedSeconds, MIN_SPEED_MPS, MAX_SPEED_MPS);
};

const buildReadModel = (
  tripId: string,
  routeId: string,
  routeMapCache: TransportRouteMapCacheRow | null,
  snapshot: TransportTripEtaSnapshotRow | null,
  stopSnapshots: Array<{
    stopId: string;
    stopName: string;
    stopOrder: number;
    etaAt: Date | null;
    remainingDistanceMeters: number | string | null;
    remainingDurationSeconds: number | string | null;
    isNextStop: boolean;
    isCompleted: boolean;
  }>
): TransportTripEtaReadModel => {
  const remainingStops: TransportTripEtaStopReadModel[] = stopSnapshots.map((stop) => ({
    stopId: stop.stopId,
    stopName: stop.stopName,
    stopOrder: stop.stopOrder,
    etaAt: stop.etaAt,
    remainingDistanceMeters: toNumber(stop.remainingDistanceMeters),
    remainingDurationSeconds: toNumber(stop.remainingDurationSeconds),
    isNextStop: stop.isNextStop,
    isCompleted: stop.isCompleted
  }));
  const nextStop = snapshot?.nextStopId
    ? remainingStops.find((stop) => stop.stopId === snapshot.nextStopId) ?? null
    : null;

  return {
    tripId,
    routeId,
    routePolyline: routeMapCache
      ? {
          encodedPolyline: routeMapCache.encodedPolyline
        }
      : null,
    etaSummary: snapshot
      ? {
          status: snapshot.status,
          calculationMode: normalizeTransportEtaCalculationMode(snapshot.calculationMode),
          nextStop: nextStop
            ? {
                stopId: nextStop.stopId,
                stopName: nextStop.stopName,
                stopOrder: nextStop.stopOrder
              }
            : null,
          nextStopEtaAt: snapshot.nextStopEtaAt,
          finalEtaAt: snapshot.finalEtaAt,
          remainingDistanceMeters: toNumber(snapshot.remainingDistanceMeters),
          remainingDurationSeconds: toNumber(snapshot.remainingDurationSeconds),
          computedAt: snapshot.computedAt,
          isStale: snapshot.status === "stale"
        }
      : null,
    remainingStops,
    computedAt: snapshot?.computedAt ?? null
  };
};

const buildUnavailableSnapshot = (
  tripId: string,
  routeId: string,
  routeMapCacheId: string | null,
  providerKey: string,
  refreshReason: TransportEtaRefreshReason | null,
  location: TransportTripLocationPointRow | null,
  computedAt: Date,
  errorCode: string,
  errorMessage: string,
  previousSnapshot: TransportTripEtaSnapshotRow | null
): TransportTripEtaSnapshotWriteInput => ({
  tripId,
  routeId,
  routeMapCacheId,
  providerKey,
  refreshReason,
  status: "unavailable",
  calculationMode: previousSnapshot?.calculationMode ?? null,
  basedOnLocationId: location?.id ?? null,
  basedOnLatitude: location ? Number(location.latitude) : null,
  basedOnLongitude: location ? Number(location.longitude) : null,
  basedOnRecordedAt: location?.recordedAt ?? null,
  projectedDistanceMeters: null,
  remainingDistanceMeters: null,
  remainingDurationSeconds: null,
  estimatedSpeedMps: previousSnapshot ? toNumber(previousSnapshot.estimatedSpeedMps) : null,
  nextStopId: null,
  nextStopOrder: null,
  nextStopEtaAt: null,
  finalEtaAt: null,
  providerRefreshedAt: previousSnapshot?.providerRefreshedAt ?? null,
  computedAt,
  lastDeviationMeters: previousSnapshot ? toNumber(previousSnapshot.lastDeviationMeters) : null,
  lastErrorCode: errorCode,
  lastErrorMessage: errorMessage
});

const hasMatchingSignature = (
  routeMapCache: TransportRouteMapCacheRow | null,
  stopSignatureHash: string
): routeMapCache is TransportRouteMapCacheRow =>
  Boolean(routeMapCache && routeMapCache.stopSignatureHash === stopSignatureHash);

const resolveProviderRefreshReason = (
  currentSnapshot: TransportTripEtaSnapshotRow | null,
  selectedProviderKey: string,
  deviationExceeded: boolean,
  refreshIntervalExceeded: boolean
): TransportEtaRefreshReason | null => {
  if (!currentSnapshot?.providerRefreshedAt) {
    return "trip_started";
  }

  if (currentSnapshot.providerKey !== selectedProviderKey) {
    return "manual_rebuild";
  }

  if (deviationExceeded) {
    return "deviation_threshold";
  }

  if (refreshIntervalExceeded) {
    return "heartbeat_window";
  }

  return null;
};

export interface TransportEtaReadServicePort {
  getTripEtaReadModel(tripId: string): Promise<TransportTripEtaReadModel>;
  markTripCompleted(tripId: string): Promise<void>;
}

export interface TransportEtaRefreshServicePort {
  refreshTripEtaSnapshot(tripId: string): Promise<boolean>;
}

export class TransportEtaService
  implements TransportEtaReadServicePort, TransportEtaRefreshServicePort
{
  constructor(
    private readonly transportRepository: TransportRepository,
    private readonly transportEtaRepository: TransportEtaRepository = new TransportEtaRepository(),
    private readonly systemSettingsReadService: SystemSettingsReadService | null = null,
    private readonly mapsEtaProviderResolver: MapsEtaProviderResolverPort = mapsEtaProviderResolver,
    private readonly transportProximityService: TransportProximityServicePort | null = null
  ) {}

  async getTripEtaReadModel(tripId: string): Promise<TransportTripEtaReadModel> {
    const trip = await this.transportRepository.findTripById(tripId);

    if (!trip) {
      return {
        tripId,
        routeId: "",
        routePolyline: null,
        etaSummary: null,
        remainingStops: [],
        computedAt: null
      };
    }

    const routeStops = normalizeRouteStops(
      await this.transportRepository.listRouteStopsByRouteId(trip.routeId)
    );
    const snapshot = await this.transportEtaRepository.findTripEtaSnapshotByTripId(tripId);
    const settings = await this.getTransportMapsSettings();
    const providerResolution = this.mapsEtaProviderResolver.resolve(settings);
    const stopSnapshots = await this.transportEtaRepository.listTripEtaStopSnapshotsByTripId(tripId);
    const stopSignatureHash = routeStops.length > 0 ? buildStopSignature(routeStops) : null;

    let routeMapCache = snapshot?.routeMapCacheId
      ? await this.transportEtaRepository.findRouteMapCacheById(snapshot.routeMapCacheId)
      : null;

    if (
      !routeMapCache &&
      stopSignatureHash &&
      routeStops.length > 0
    ) {
      routeMapCache = await this.transportEtaRepository.findRouteMapCacheBySignature(
        trip.routeId,
        snapshot?.providerKey ?? providerResolution.providerKey,
        stopSignatureHash
      );
    }

    return buildReadModel(tripId, trip.routeId, routeMapCache, snapshot, stopSnapshots);
  }

  async markTripCompleted(tripId: string): Promise<void> {
    await db.withTransaction((client) =>
      this.transportEtaRepository.markTripEtaCompleted(tripId, new Date(), client)
    );
  }

  async refreshTripEtaSnapshot(tripId: string): Promise<boolean> {
    const now = new Date();
    const trip = await this.transportRepository.findTripById(tripId);

    if (!trip || trip.tripStatus !== "started") {
      return false;
    }

    const settings = await this.getTransportMapsSettings();
    const providerResolution = this.mapsEtaProviderResolver.resolve(settings);
    const routeStops = normalizeRouteStops(
      await this.transportRepository.listRouteStopsByRouteId(trip.routeId)
    );
    const currentSnapshot = await this.transportEtaRepository.findTripEtaSnapshotByTripId(tripId);
    const previousStopSnapshots =
      await this.transportEtaRepository.listTripEtaStopSnapshotsByTripId(tripId);
    const approachingNotifiedByStopId = new Map(
      previousStopSnapshots.map((stop) => [stop.stopId, stop.approachingNotified] as const)
    );
    const arrivedNotifiedByStopId = new Map(
      previousStopSnapshots.map((stop) => [stop.stopId, stop.arrivedNotified] as const)
    );

    if (routeStops.length === 0) {
      await db.withTransaction((client) =>
        this.transportEtaRepository.replaceTripEtaSnapshot(
          buildUnavailableSnapshot(
            tripId,
            trip.routeId,
            null,
            currentSnapshot?.providerKey ?? providerResolution.providerKey,
            currentSnapshot?.refreshReason ?? null,
            null,
            now,
            "TRANSPORT_ROUTE_STOPS_MISSING",
            "Transport route has no stops configured for ETA calculation",
            currentSnapshot
          ),
          [],
          client
        )
      );
      return true;
    }

    const stopSignatureHash = buildStopSignature(routeStops);
    const routeMapCache = await this.resolveRouteMapCache(
      trip.routeId,
      routeStops,
      stopSignatureHash,
      providerResolution.providerKey,
      providerResolution.provider,
      currentSnapshot,
      now
    );
    const latestLocations = await this.transportEtaRepository.listRecentTripLocations(tripId, 2);
    const latestLocation = latestLocations[0] ?? null;

    if (!latestLocation) {
      await db.withTransaction((client) =>
        this.transportEtaRepository.replaceTripEtaSnapshot(
          buildUnavailableSnapshot(
            tripId,
            trip.routeId,
            routeMapCache?.id ?? null,
            currentSnapshot?.providerKey ?? routeMapCache?.providerKey ?? providerResolution.providerKey,
            currentSnapshot?.refreshReason ?? null,
            null,
            now,
            "TRIP_LOCATION_MISSING",
            "Trip ETA snapshot requires at least one persisted trip location",
            currentSnapshot
          ),
          [],
          client
        )
      );
      return true;
    }

    if (!routeMapCache) {
      await db.withTransaction((client) =>
        this.transportEtaRepository.replaceTripEtaSnapshot(
          buildUnavailableSnapshot(
            tripId,
            trip.routeId,
            null,
            currentSnapshot?.providerKey ?? providerResolution.providerKey,
            currentSnapshot?.refreshReason ?? null,
            latestLocation,
            now,
            "TRANSPORT_ROUTE_GEOMETRY_UNAVAILABLE",
            "Route geometry cache is not available for ETA calculation",
            currentSnapshot
          ),
          [],
          client
        )
      );
      return true;
    }

    const projection = projectPointOntoPolyline(
      {
        latitude: Number(latestLocation.latitude),
        longitude: Number(latestLocation.longitude)
      },
      buildProjectionPoints(routeStops, routeMapCache)
    );
    const projectedDistanceMeters = scaleProjectedDistance(
      projection.geometryProjectedDistanceMeters,
      projection.geometryTotalDistanceMeters,
      routeMapCache
    );
    const refreshIntervalExceeded = Boolean(
      currentSnapshot?.providerRefreshedAt &&
        now.getTime() - currentSnapshot.providerRefreshedAt.getTime() >=
          settings.etaProviderRefreshIntervalSeconds * 1000
    );
    const deviationExceeded =
      projection.deviationMeters > settings.etaProviderDeviationThresholdMeters;
    const providerRefreshReason = resolveProviderRefreshReason(
      currentSnapshot,
      providerResolution.providerKey,
      deviationExceeded,
      refreshIntervalExceeded
    );
    const hasNewLocation = Boolean(
      !currentSnapshot?.basedOnRecordedAt ||
        latestLocation.recordedAt.getTime() > currentSnapshot.basedOnRecordedAt.getTime()
    );
    const derivedRefreshDue = Boolean(
      !currentSnapshot ||
        hasNewLocation ||
        now.getTime() - currentSnapshot.computedAt.getTime() >= DERIVED_REFRESH_INTERVAL_MS
    );
    const stopDistanceById = buildRemainingStopMap(routeMapCache);
    let providerFailure: { code: string; message: string } | null = null;

    if (providerRefreshReason && providerResolution.provider) {
      const remainingStopsForProvider = routeStops.filter((stop) => {
        const cumulativeDistanceMeters = stopDistanceById.get(stop.stopId) ?? 0;

        return cumulativeDistanceMeters + STOP_COMPLETION_TOLERANCE_METERS > projectedDistanceMeters;
      });

      if (remainingStopsForProvider.length > 0) {
        try {
          const providerResult = await providerResolution.provider.computeTrafficAwareTripEta(
            {
              latitude: Number(latestLocation.latitude),
              longitude: Number(latestLocation.longitude)
            },
            remainingStopsForProvider.map((stop) => ({
              stopId: stop.stopId,
              stopOrder: stop.stopOrder,
              latitude: stop.latitude,
              longitude: stop.longitude
            }))
          );
          const providerStopMap = new Map(
            providerResult.remainingStops.map((stop) => [stop.stopId, stop] as const)
          );
          const stopSnapshots = routeStops.map<TransportTripEtaStopSnapshotWriteInput>((stop) => {
            const providerStop = providerStopMap.get(stop.stopId);
            const isCompleted = !providerStop;

            return {
              tripId,
              stopId: stop.stopId,
              stopOrder: stop.stopOrder,
              stopName: stop.stopName,
              etaAt: providerStop ? addSeconds(now, providerStop.durationSeconds) : null,
              remainingDistanceMeters: providerStop ? providerStop.distanceMeters : 0,
              remainingDurationSeconds: providerStop ? providerStop.durationSeconds : 0,
              isNextStop: providerStop
                ? providerStop.stopId === providerResult.remainingStops[0]?.stopId
                : false,
              isCompleted,
              approachingNotified: approachingNotifiedByStopId.get(stop.stopId) ?? false,
              arrivedNotified: arrivedNotifiedByStopId.get(stop.stopId) ?? false,
              updatedAt: now
            };
          });
          const nextStop = providerResult.remainingStops[0] ?? null;
          const snapshotStatus = getSnapshotStatus(
            latestLocation,
            now,
            providerResult.remainingStops.length > 0
          );
          const snapshotWrite: TransportTripEtaSnapshotWriteInput = {
            tripId,
            routeId: trip.routeId,
            routeMapCacheId: routeMapCache.id,
            providerKey: providerResolution.providerKey,
            refreshReason: providerRefreshReason,
            status: snapshotStatus,
            calculationMode: PROVIDER_SNAPSHOT_PERSISTED_MODE,
            basedOnLocationId: latestLocation.id,
            basedOnLatitude: Number(latestLocation.latitude),
            basedOnLongitude: Number(latestLocation.longitude),
            basedOnRecordedAt: latestLocation.recordedAt,
            projectedDistanceMeters: Math.round(projectedDistanceMeters),
            remainingDistanceMeters: providerResult.totalDistanceMeters,
            remainingDurationSeconds: providerResult.totalDurationSeconds,
            estimatedSpeedMps:
              providerResult.totalDurationSeconds > 0
                ? clamp(
                    providerResult.totalDistanceMeters / providerResult.totalDurationSeconds,
                    MIN_SPEED_MPS,
                    MAX_SPEED_MPS
                  )
                : getRouteAverageSpeedMps(routeMapCache),
            nextStopId: nextStop?.stopId ?? null,
            nextStopOrder: nextStop?.stopOrder ?? null,
            nextStopEtaAt: nextStop ? addSeconds(now, nextStop.durationSeconds) : null,
            finalEtaAt:
              providerResult.totalDurationSeconds > 0
                ? addSeconds(now, providerResult.totalDurationSeconds)
                : now,
            providerRefreshedAt: now,
            computedAt: now,
            lastDeviationMeters: Math.round(projection.deviationMeters),
            lastErrorCode: null,
            lastErrorMessage: null
          };

          await db.withTransaction((client) =>
            this.transportEtaRepository.replaceTripEtaSnapshot(snapshotWrite, stopSnapshots, client)
          );
          await this.evaluateProximityAlerts(tripId, trip.routeId);
          return true;
        } catch (error) {
          providerFailure = {
            code:
              error && typeof error === "object" && "code" in error
                ? String((error as { code: unknown }).code)
                : "TRANSPORT_ETA_PROVIDER_REQUEST_FAILED",
            message:
              error instanceof Error ? error.message : "Trip ETA provider refresh failed"
          };
          logger.warn(
            {
              tripId,
              routeId: trip.routeId,
              providerKey: providerResolution.providerKey,
              err: error
            },
            "Falling back to derived ETA after provider failure"
          );
        }
      }
    }

    const shouldRunDerivedEstimate =
      settings.etaDerivedEstimateEnabled &&
      (providerRefreshReason !== null || providerFailure !== null || derivedRefreshDue);

    if (!shouldRunDerivedEstimate) {
      if (providerFailure && !currentSnapshot) {
        await db.withTransaction((client) =>
          this.transportEtaRepository.replaceTripEtaSnapshot(
            buildUnavailableSnapshot(
              tripId,
              trip.routeId,
              routeMapCache.id,
              providerResolution.providerKey,
              providerRefreshReason,
              latestLocation,
              now,
              providerFailure.code,
              providerFailure.message,
              currentSnapshot
            ),
            [],
            client
          )
        );
        return true;
      }

      return false;
    }

    const observedSpeedMps = resolveObservedSpeedMps(latestLocations);
    const previousEstimatedSpeedMps = toNumber(currentSnapshot?.estimatedSpeedMps);
    const previousRemainingDistanceMeters = toNumber(currentSnapshot?.remainingDistanceMeters);
    const previousRemainingDurationSeconds = toNumber(currentSnapshot?.remainingDurationSeconds);
    const fallbackProviderSpeed =
      previousRemainingDistanceMeters &&
      previousRemainingDurationSeconds &&
      previousRemainingDurationSeconds > 0
        ? previousRemainingDistanceMeters / previousRemainingDurationSeconds
        : null;
    const effectiveSpeedMps = clamp(
      observedSpeedMps ??
        previousEstimatedSpeedMps ??
        fallbackProviderSpeed ??
        getRouteAverageSpeedMps(routeMapCache),
      MIN_SPEED_MPS,
      MAX_SPEED_MPS
    );
    const stopSnapshots = routeStops.map<TransportTripEtaStopSnapshotWriteInput>((stop) => {
      const cumulativeDistanceMeters = stopDistanceById.get(stop.stopId) ?? 0;
      const remainingDistanceMeters = Math.max(
        0,
        Math.round(cumulativeDistanceMeters - projectedDistanceMeters)
      );
      const isCompleted = remainingDistanceMeters <= STOP_COMPLETION_TOLERANCE_METERS;
      const remainingDurationSeconds = isCompleted
        ? 0
        : Math.max(0, Math.round(remainingDistanceMeters / effectiveSpeedMps));

      return {
        tripId,
        stopId: stop.stopId,
        stopOrder: stop.stopOrder,
        stopName: stop.stopName,
        etaAt: isCompleted ? null : addSeconds(now, remainingDurationSeconds),
        remainingDistanceMeters,
        remainingDurationSeconds,
        isNextStop: false,
        isCompleted,
        approachingNotified: approachingNotifiedByStopId.get(stop.stopId) ?? false,
        arrivedNotified: arrivedNotifiedByStopId.get(stop.stopId) ?? false,
        updatedAt: now
      };
    });
    const nextStopSnapshot = stopSnapshots.find((stop) => !stop.isCompleted) ?? null;

    if (nextStopSnapshot) {
      nextStopSnapshot.isNextStop = true;
    }

    const routeRemainingDistanceMeters = nextStopSnapshot
      ? Math.max(0, Math.round(routeMapCache.totalDistanceMeters - projectedDistanceMeters))
      : 0;
    const routeRemainingDurationSeconds = nextStopSnapshot
      ? Math.max(0, Math.round(routeRemainingDistanceMeters / effectiveSpeedMps))
      : 0;
    const snapshotWrite: TransportTripEtaSnapshotWriteInput = {
      tripId,
      routeId: trip.routeId,
      routeMapCacheId: routeMapCache.id,
      providerKey: currentSnapshot?.providerKey ?? routeMapCache.providerKey,
      refreshReason: providerRefreshReason ?? currentSnapshot?.refreshReason ?? null,
      status: getSnapshotStatus(latestLocation, now, Boolean(nextStopSnapshot)),
      calculationMode: "derived_estimate",
      basedOnLocationId: latestLocation.id,
      basedOnLatitude: Number(latestLocation.latitude),
      basedOnLongitude: Number(latestLocation.longitude),
      basedOnRecordedAt: latestLocation.recordedAt,
      projectedDistanceMeters: Math.round(projectedDistanceMeters),
      remainingDistanceMeters: routeRemainingDistanceMeters,
      remainingDurationSeconds: routeRemainingDurationSeconds,
      estimatedSpeedMps: effectiveSpeedMps,
      nextStopId: nextStopSnapshot?.stopId ?? null,
      nextStopOrder: nextStopSnapshot?.stopOrder ?? null,
      nextStopEtaAt: nextStopSnapshot?.etaAt ?? null,
      finalEtaAt: nextStopSnapshot ? addSeconds(now, routeRemainingDurationSeconds) : now,
      providerRefreshedAt: currentSnapshot?.providerRefreshedAt ?? null,
      computedAt: now,
      lastDeviationMeters: Math.round(projection.deviationMeters),
      lastErrorCode: providerFailure?.code ?? null,
      lastErrorMessage: providerFailure?.message ?? null
    };

    await db.withTransaction((client) =>
      this.transportEtaRepository.replaceTripEtaSnapshot(snapshotWrite, stopSnapshots, client)
    );
    await this.evaluateProximityAlerts(tripId, trip.routeId);

    return true;
  }

  private async evaluateProximityAlerts(tripId: string, routeId: string): Promise<void> {
    if (!this.transportProximityService) {
      return;
    }

    try {
      await this.transportProximityService.evaluateTripProximityAlerts(tripId, routeId);
    } catch (error) {
      logger.warn(
        {
          tripId,
          routeId,
          err: error
        },
        "Transport proximity evaluation failed after ETA snapshot refresh"
      );
    }
  }

  private async getTransportMapsSettings(): Promise<TransportMapsSettings> {
    if (!this.systemSettingsReadService) {
      return getSystemSettingsDefaultValues("transportMaps");
    }

    return this.systemSettingsReadService.getTransportMapsSettings();
  }

  private async resolveRouteMapCache(
    routeId: string,
    routeStops: TransportEtaRouteStop[],
    stopSignatureHash: string,
    selectedProviderKey: string,
    selectedProvider: ReturnType<MapsEtaProviderResolverPort["resolve"]>["provider"],
    currentSnapshot: TransportTripEtaSnapshotRow | null,
    now: Date
  ): Promise<TransportRouteMapCacheRow | null> {
    const currentRouteMapCache = currentSnapshot?.routeMapCacheId
      ? await this.transportEtaRepository.findRouteMapCacheById(currentSnapshot.routeMapCacheId)
      : null;
    const reusableCurrentCache = hasMatchingSignature(currentRouteMapCache, stopSignatureHash)
      ? currentRouteMapCache
      : null;
    const selectedRouteMapCache = await this.transportEtaRepository.findRouteMapCacheBySignature(
      routeId,
      selectedProviderKey,
      stopSignatureHash
    );

    if (selectedRouteMapCache) {
      return selectedRouteMapCache;
    }

    if (routeStops.length === 1) {
      return db.withTransaction((client) =>
        this.transportEtaRepository.upsertRouteMapCache(
          {
            routeId,
            stopSignatureHash,
            providerKey: selectedProviderKey,
            encodedPolyline: "",
            totalDistanceMeters: 0,
            totalDurationSeconds: 0,
            stopMetricsJson: buildSyntheticSingleStopRouteCache(
              routeId,
              selectedProviderKey,
              stopSignatureHash,
              routeStops[0],
              now
            ).stopMetricsJson,
            computedAt: now
          },
          client
        )
      );
    }

    if (!selectedProvider) {
      return reusableCurrentCache;
    }

    try {
      const routeGeometry = await selectedProvider.computeRouteGeometryForStops(
        routeStops.map((stop) => ({
          stopId: stop.stopId,
          stopOrder: stop.stopOrder,
          latitude: stop.latitude,
          longitude: stop.longitude
        }))
      );

      return db.withTransaction((client) =>
        this.transportEtaRepository.upsertRouteMapCache(
          {
            routeId,
            stopSignatureHash,
            providerKey: selectedProvider.providerKey,
            encodedPolyline: routeGeometry.encodedPolyline,
            totalDistanceMeters: routeGeometry.totalDistanceMeters,
            totalDurationSeconds: routeGeometry.totalDurationSeconds,
            stopMetricsJson: routeGeometry.stopMetrics,
            computedAt: now
          },
          client
        )
      );
    } catch (error) {
      logger.warn(
        {
          routeId,
          providerKey: selectedProvider.providerKey,
          err: error
        },
        "Failed to build route geometry cache for ETA provider"
      );

      return reusableCurrentCache;
    }
  }
}
