import { beforeEach, describe, expect, it, vi } from "vitest";

import { db } from "../../src/database/db";
import type {
  MapsEtaProviderResolverPort,
  ResolvedMapsEtaProvider
} from "../../src/integrations/maps/maps-eta-provider.resolver";
import type { MapsEtaProviderPort } from "../../src/integrations/maps/types/maps-eta-provider.types";
import type { TransportMapsSettings } from "../../src/modules/system-settings/types/system-settings.types";
import { TransportEtaRepository } from "../../src/modules/transport/repository/transport-eta.repository";
import type { TransportProximityServicePort } from "../../src/modules/transport/service/transport-proximity.service";
import type { TransportRepository } from "../../src/modules/transport/repository/transport.repository";
import { TransportEtaService } from "../../src/modules/transport/service/transport-eta.service";

const tripRow = {
  id: "30",
  tripDate: "2026-03-13",
  tripType: "pickup" as const,
  tripStatus: "started" as const,
  startedAt: new Date("2026-03-13T10:00:00.000Z"),
  endedAt: null,
  createdAt: new Date("2026-03-13T09:55:00.000Z"),
  updatedAt: new Date("2026-03-13T10:00:00.000Z"),
  busId: "1",
  plateNumber: "BUS-001",
  driverId: "1",
  driverName: "Ali Driver",
  routeId: "1",
  routeName: "Route 1",
  latestLatitude: null,
  latestLongitude: null,
  latestRecordedAt: null,
  boardedCount: 0,
  droppedOffCount: 0,
  absentCount: 0,
  totalEvents: 0
};

const routeStops = [
  {
    routeId: "1",
    routeName: "Route 1",
    stopId: "10",
    stopName: "First Stop",
    latitude: 14,
    longitude: 44,
    stopOrder: 1
  },
  {
    routeId: "1",
    routeName: "Route 1",
    stopId: "11",
    stopName: "Second Stop",
    latitude: 14,
    longitude: 44.01,
    stopOrder: 2
  }
];

const routeMapCache = {
  id: "700",
  routeId: "1",
  stopSignatureHash: "signature",
  providerKey: "mapboxDirections",
  encodedPolyline: "",
  totalDistanceMeters: 1_000,
  totalDurationSeconds: 100,
  stopMetricsJson: [
    { stopId: "10", stopOrder: 1, cumulativeDistanceMeters: 0 },
    { stopId: "11", stopOrder: 2, cumulativeDistanceMeters: 1_000 }
  ],
  computedAt: new Date("2026-03-13T10:00:00.000Z"),
  lastErrorCode: null,
  lastErrorMessage: null
};

const latestLocations = [
  {
    id: "900",
    tripId: "30",
    latitude: 14,
    longitude: 44.005,
    recordedAt: new Date("2026-03-13T10:10:00.000Z")
  },
  {
    id: "899",
    tripId: "30",
    latitude: 14,
    longitude: 44.004,
    recordedAt: new Date("2026-03-13T10:09:00.000Z")
  }
];

const createTransportMapsSettings = (
  overrides: Partial<TransportMapsSettings> = {}
): TransportMapsSettings => ({
  etaProvider: "mapbox",
  etaDerivedEstimateEnabled: true,
  googleMapsEtaEnabled: false,
  etaProviderRefreshIntervalSeconds: 300,
  etaProviderDeviationThresholdMeters: 300,
  ...overrides
});

const createResolvedProvider = (
  overrides: Partial<ResolvedMapsEtaProvider> = {}
): ResolvedMapsEtaProvider => ({
  selection: "mapbox",
  providerKey: "mapboxDirections",
  provider: null,
  isProviderEnabled: true,
  isProviderConfigured: false,
  ...overrides
});

describe("TransportEtaService", () => {
  const transportRepositoryMock = {
    findTripById: vi.fn(),
    listRouteStopsByRouteId: vi.fn()
  };
  const etaRepositoryMock = {
    findTripEtaSnapshotByTripId: vi.fn(),
    findRouteMapCacheById: vi.fn(),
    findRouteMapCacheBySignature: vi.fn(),
    listRecentTripLocations: vi.fn(),
    replaceTripEtaSnapshot: vi.fn(),
    upsertRouteMapCache: vi.fn(),
    markTripEtaCompleted: vi.fn(),
    listTripEtaStopSnapshotsByTripId: vi.fn()
  };
  const systemSettingsReadServiceMock = {
    getTransportMapsSettings: vi.fn()
  };
  const providerMock: MapsEtaProviderPort = {
    providerKey: "mapboxDirections",
    isConfigured: vi.fn(),
    computeRouteGeometryForStops: vi.fn(),
    computeTrafficAwareTripEta: vi.fn()
  };
  const resolverMock: MapsEtaProviderResolverPort = {
    resolve: vi.fn()
  };
  const proximityServiceMock: TransportProximityServicePort = {
    evaluateTripProximityAlerts: vi.fn()
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(db, "withTransaction").mockImplementation(async (callback) => {
      const fakeClient = {
        query: vi.fn(),
        release: vi.fn()
      };

      return callback(fakeClient as never);
    });

    Object.values(transportRepositoryMock).forEach((fn) => fn.mockReset());
    Object.values(etaRepositoryMock).forEach((fn) => fn.mockReset());
    Object.values(systemSettingsReadServiceMock).forEach((fn) => fn.mockReset());
    vi.mocked(providerMock.isConfigured).mockReset();
    vi.mocked(providerMock.computeRouteGeometryForStops).mockReset();
    vi.mocked(providerMock.computeTrafficAwareTripEta).mockReset();
    vi.mocked(resolverMock.resolve).mockReset();
    vi.mocked(proximityServiceMock.evaluateTripProximityAlerts).mockReset();

    vi.mocked(transportRepositoryMock.findTripById).mockResolvedValue(tripRow);
    vi.mocked(transportRepositoryMock.listRouteStopsByRouteId).mockResolvedValue(routeStops);
    vi.mocked(etaRepositoryMock.findTripEtaSnapshotByTripId).mockResolvedValue(null);
    vi.mocked(etaRepositoryMock.findRouteMapCacheById).mockResolvedValue(null);
    vi.mocked(etaRepositoryMock.findRouteMapCacheBySignature).mockResolvedValue(routeMapCache);
    vi.mocked(etaRepositoryMock.listRecentTripLocations).mockResolvedValue(latestLocations);
    vi.mocked(etaRepositoryMock.replaceTripEtaSnapshot).mockResolvedValue(undefined);
    vi.mocked(etaRepositoryMock.listTripEtaStopSnapshotsByTripId).mockResolvedValue([]);
    vi.mocked(systemSettingsReadServiceMock.getTransportMapsSettings).mockResolvedValue(
      createTransportMapsSettings()
    );
    vi.mocked(resolverMock.resolve).mockReturnValue(createResolvedProvider());
    vi.mocked(proximityServiceMock.evaluateTripProximityAlerts).mockResolvedValue(0);
  });

  it("derives ETA snapshots locally when the selected provider cannot run", async () => {
    const service = new TransportEtaService(
      transportRepositoryMock as unknown as TransportRepository,
      etaRepositoryMock as unknown as TransportEtaRepository,
      systemSettingsReadServiceMock as never,
      resolverMock,
      proximityServiceMock
    );

    const processed = await service.refreshTripEtaSnapshot("30");

    expect(processed).toBe(true);
    expect(etaRepositoryMock.replaceTripEtaSnapshot).toHaveBeenCalledOnce();
    expect(etaRepositoryMock.replaceTripEtaSnapshot.mock.calls[0][0]).toMatchObject({
      calculationMode: "derived_estimate",
      providerKey: "mapboxDirections",
      status: expect.stringMatching(/fresh|stale|completed/)
    });
    expect(proximityServiceMock.evaluateTripProximityAlerts).toHaveBeenCalledWith("30", "1");
    expect(providerMock.computeTrafficAwareTripEta).not.toHaveBeenCalled();
  });

  it("preserves approaching_notified flags across derived snapshot rewrites", async () => {
    vi.mocked(etaRepositoryMock.listTripEtaStopSnapshotsByTripId).mockResolvedValue([
      {
        tripId: "30",
        stopId: "10",
        stopOrder: 1,
        stopName: "First Stop",
        etaAt: new Date("2026-03-13T10:12:00.000Z"),
        remainingDistanceMeters: 300,
        remainingDurationSeconds: 90,
        isNextStop: true,
        isCompleted: false,
        approachingNotified: true,
        arrivedNotified: true,
        updatedAt: new Date("2026-03-13T10:10:00.000Z")
      },
      {
        tripId: "30",
        stopId: "11",
        stopOrder: 2,
        stopName: "Second Stop",
        etaAt: new Date("2026-03-13T10:14:00.000Z"),
        remainingDistanceMeters: 700,
        remainingDurationSeconds: 210,
        isNextStop: false,
        isCompleted: false,
        approachingNotified: false,
        arrivedNotified: false,
        updatedAt: new Date("2026-03-13T10:10:00.000Z")
      }
    ]);

    const service = new TransportEtaService(
      transportRepositoryMock as unknown as TransportRepository,
      etaRepositoryMock as unknown as TransportEtaRepository,
      systemSettingsReadServiceMock as never,
      resolverMock,
      proximityServiceMock
    );

    await service.refreshTripEtaSnapshot("30");

    const writtenStops = etaRepositoryMock.replaceTripEtaSnapshot.mock.calls[0][1];
    const firstStop = writtenStops.find((stop: { stopId: string }) => stop.stopId === "10");
    const secondStop = writtenStops.find((stop: { stopId: string }) => stop.stopId === "11");

    expect(firstStop?.approachingNotified).toBe(true);
    expect(secondStop?.approachingNotified).toBe(false);
    expect(firstStop?.arrivedNotified).toBe(true);
    expect(secondStop?.arrivedNotified).toBe(false);
  });

  it("uses the selected provider snapshot when refresh conditions are met", async () => {
    vi.mocked(resolverMock.resolve).mockReturnValue(
      createResolvedProvider({
        provider: providerMock,
        isProviderConfigured: true
      })
    );
    vi.mocked(providerMock.computeTrafficAwareTripEta).mockResolvedValue({
      totalDistanceMeters: 600,
      totalDurationSeconds: 120,
      remainingStops: [
        {
          stopId: "11",
          stopOrder: 2,
          distanceMeters: 600,
          durationSeconds: 120
        }
      ]
    });

    const service = new TransportEtaService(
      transportRepositoryMock as unknown as TransportRepository,
      etaRepositoryMock as unknown as TransportEtaRepository,
      systemSettingsReadServiceMock as never,
      resolverMock,
      proximityServiceMock
    );

    const processed = await service.refreshTripEtaSnapshot("30");

    expect(processed).toBe(true);
    expect(providerMock.computeTrafficAwareTripEta).toHaveBeenCalledOnce();
    expect(etaRepositoryMock.replaceTripEtaSnapshot.mock.calls[0][0]).toMatchObject({
      calculationMode: "provider_snapshot",
      providerKey: "mapboxDirections",
      refreshReason: "trip_started",
      providerRefreshedAt: expect.any(Date)
    });
    expect(proximityServiceMock.evaluateTripProximityAlerts).toHaveBeenCalledWith("30", "1");
  });

  it("preserves the last provider snapshot when derived estimation is disabled and no provider refresh is due", async () => {
    vi.mocked(systemSettingsReadServiceMock.getTransportMapsSettings).mockResolvedValue(
      createTransportMapsSettings({
        etaDerivedEstimateEnabled: false
      })
    );
    vi.mocked(etaRepositoryMock.findTripEtaSnapshotByTripId).mockResolvedValue({
      tripId: "30",
      routeId: "1",
      routeMapCacheId: "700",
      providerKey: "mapboxDirections",
      refreshReason: "trip_started",
      status: "fresh",
      calculationMode: "provider_snapshot",
      basedOnLocationId: "900",
      basedOnLatitude: 14,
      basedOnLongitude: 44.005,
      basedOnRecordedAt: latestLocations[0].recordedAt,
      projectedDistanceMeters: 500,
      remainingDistanceMeters: 500,
      remainingDurationSeconds: 60,
      estimatedSpeedMps: 8.3,
      nextStopId: "11",
      nextStopOrder: 2,
      nextStopEtaAt: new Date("2026-03-13T10:11:00.000Z"),
      finalEtaAt: new Date("2026-03-13T10:11:00.000Z"),
      providerRefreshedAt: new Date("2026-03-13T10:08:00.000Z"),
      computedAt: new Date("2026-03-13T10:09:50.000Z"),
      lastDeviationMeters: 12,
      lastErrorCode: null,
      lastErrorMessage: null
    });
    vi.mocked(etaRepositoryMock.findRouteMapCacheById).mockResolvedValue(routeMapCache);

    const service = new TransportEtaService(
      transportRepositoryMock as unknown as TransportRepository,
      etaRepositoryMock as unknown as TransportEtaRepository,
      systemSettingsReadServiceMock as never,
      resolverMock,
      proximityServiceMock
    );

    const processed = await service.refreshTripEtaSnapshot("30");

    expect(processed).toBe(false);
    expect(etaRepositoryMock.replaceTripEtaSnapshot).not.toHaveBeenCalled();
    expect(proximityServiceMock.evaluateTripProximityAlerts).not.toHaveBeenCalled();
    expect(providerMock.computeTrafficAwareTripEta).not.toHaveBeenCalled();
  });
});
