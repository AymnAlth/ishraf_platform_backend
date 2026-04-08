import { beforeEach, describe, expect, it, vi } from "vitest";

import { db } from "../../src/database/db";
import type { IntegrationOutboxRepository } from "../../src/common/repositories/integration-outbox.repository";
import type { SystemSettingsReadService } from "../../src/modules/system-settings/service/system-settings-read.service";
import type { TransportEtaRepository } from "../../src/modules/transport/repository/transport-eta.repository";
import { TransportProximityService } from "../../src/modules/transport/service/transport-proximity.service";

describe("TransportProximityService", () => {
  const transportEtaRepositoryMock = {
    claimApproachingStopNotifications: vi.fn(),
    claimArrivedStopNotifications: vi.fn(),
    listStopRecipientsByTripStops: vi.fn()
  };
  const integrationOutboxRepositoryMock = {
    enqueueEvent: vi.fn()
  };
  const systemSettingsReadServiceMock = {
    getPushNotificationsSettings: vi.fn()
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

    vi.mocked(transportEtaRepositoryMock.claimApproachingStopNotifications).mockReset();
    vi.mocked(transportEtaRepositoryMock.claimArrivedStopNotifications).mockReset();
    vi.mocked(transportEtaRepositoryMock.listStopRecipientsByTripStops).mockReset();
    vi.mocked(integrationOutboxRepositoryMock.enqueueEvent).mockReset();
    vi.mocked(systemSettingsReadServiceMock.getPushNotificationsSettings).mockReset();

    vi.mocked(transportEtaRepositoryMock.claimApproachingStopNotifications).mockResolvedValue([]);
    vi.mocked(transportEtaRepositoryMock.claimArrivedStopNotifications).mockResolvedValue([]);
    vi.mocked(transportEtaRepositoryMock.listStopRecipientsByTripStops).mockResolvedValue([]);
    vi.mocked(integrationOutboxRepositoryMock.enqueueEvent).mockResolvedValue("1");
    vi.mocked(systemSettingsReadServiceMock.getPushNotificationsSettings).mockResolvedValue({
      fcmEnabled: true,
      transportRealtimeEnabled: true
    });
  });

  it("enqueues approaching notifications per parent per stop with aggregated students", async () => {
    vi.mocked(transportEtaRepositoryMock.claimApproachingStopNotifications).mockResolvedValue([
      {
        tripId: "30",
        stopId: "10",
        stopOrder: 1,
        stopName: "Main Stop"
      }
    ]);
    vi.mocked(transportEtaRepositoryMock.listStopRecipientsByTripStops)
      .mockResolvedValueOnce([
        {
          stopId: "10",
          parentUserId: "200",
          studentId: "501",
          studentFullName: "Ahmad"
        },
        {
          stopId: "10",
          parentUserId: "200",
          studentId: "502",
          studentFullName: "Ziad"
        },
        {
          stopId: "10",
          parentUserId: "201",
          studentId: "503",
          studentFullName: "Mona"
        }
      ])
      .mockResolvedValueOnce([]);

    const service = new TransportProximityService(
      transportEtaRepositoryMock as unknown as TransportEtaRepository,
      integrationOutboxRepositoryMock as unknown as IntegrationOutboxRepository,
      systemSettingsReadServiceMock as unknown as SystemSettingsReadService
    );

    const count = await service.evaluateTripProximityAlerts("30", "1");

    expect(count).toBe(2);
    expect(integrationOutboxRepositoryMock.enqueueEvent).toHaveBeenCalledTimes(2);
    expect(integrationOutboxRepositoryMock.enqueueEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        providerKey: "pushNotifications",
        eventType: "fcm.transport.bus_approaching",
        aggregateType: "trip_stop",
        aggregateId: "30:10",
        payloadJson: expect.objectContaining({
          targetUserIds: ["200"],
          subscriptionKey: "transportRealtime",
          title: "اقتراب الحافلة",
          body: "حافلة الطلاب Ahmad، Ziad تقترب من المحطة، ستصل خلال دقائق.",
          data: expect.objectContaining({
            eventType: "bus_approaching",
            tripId: "30",
            routeId: "1",
            studentIds: ["501", "502"],
            notificationType: "transport_bus_approaching"
          }),
          referenceType: "trip_stop",
          referenceId: "30:10"
        }),
        idempotencyKey: "fcm:fcm.transport.bus_approaching:trip:30:stop:10:parent:200"
      }),
      expect.any(Object)
    );
  });

  it("enqueues arrival notifications using aggregated student names", async () => {
    vi.mocked(transportEtaRepositoryMock.claimArrivedStopNotifications).mockResolvedValue([
      {
        tripId: "30",
        stopId: "10",
        stopOrder: 1,
        stopName: "Main Stop"
      }
    ]);
    vi.mocked(transportEtaRepositoryMock.listStopRecipientsByTripStops)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          stopId: "10",
          parentUserId: "200",
          studentId: "501",
          studentFullName: "Ahmad"
        },
        {
          stopId: "10",
          parentUserId: "200",
          studentId: "502",
          studentFullName: "Sara"
        }
      ]);

    const service = new TransportProximityService(
      transportEtaRepositoryMock as unknown as TransportEtaRepository,
      integrationOutboxRepositoryMock as unknown as IntegrationOutboxRepository,
      systemSettingsReadServiceMock as unknown as SystemSettingsReadService
    );

    const count = await service.evaluateTripProximityAlerts("30", "1");

    expect(count).toBe(1);
    expect(integrationOutboxRepositoryMock.enqueueEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "fcm.transport.bus_arrived",
        payloadJson: expect.objectContaining({
          title: "وصول الحافلة",
          body: "الحافلة بالخارج في انتظار الطلاب Ahmad و Sara.",
          data: expect.objectContaining({
            eventType: "bus_arrived",
            notificationType: "transport_bus_arrived",
            studentIds: ["501", "502"]
          })
        }),
        idempotencyKey: "fcm:fcm.transport.bus_arrived:trip:30:stop:10:parent:200"
      }),
      expect.any(Object)
    );
  });

  it("does not enqueue when no eligible approaching or arrived stops are claimed", async () => {
    const service = new TransportProximityService(
      transportEtaRepositoryMock as unknown as TransportEtaRepository,
      integrationOutboxRepositoryMock as unknown as IntegrationOutboxRepository,
      systemSettingsReadServiceMock as unknown as SystemSettingsReadService
    );

    const count = await service.evaluateTripProximityAlerts("30", "1");

    expect(count).toBe(0);
    expect(transportEtaRepositoryMock.listStopRecipientsByTripStops).toHaveBeenCalledTimes(2);
    expect(integrationOutboxRepositoryMock.enqueueEvent).not.toHaveBeenCalled();
  });

  it("does not enqueue again when a subsequent run claims no stops", async () => {
    vi.mocked(transportEtaRepositoryMock.claimApproachingStopNotifications)
      .mockResolvedValueOnce([
        {
          tripId: "30",
          stopId: "10",
          stopOrder: 1,
          stopName: "Main Stop"
        }
      ])
      .mockResolvedValueOnce([]);
    vi.mocked(transportEtaRepositoryMock.claimArrivedStopNotifications)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    vi.mocked(transportEtaRepositoryMock.listStopRecipientsByTripStops)
      .mockResolvedValueOnce([
        {
          stopId: "10",
          parentUserId: "200",
          studentId: "501",
          studentFullName: "Ahmad"
        }
      ])
      .mockResolvedValue([]);

    const service = new TransportProximityService(
      transportEtaRepositoryMock as unknown as TransportEtaRepository,
      integrationOutboxRepositoryMock as unknown as IntegrationOutboxRepository,
      systemSettingsReadServiceMock as unknown as SystemSettingsReadService
    );

    const firstCount = await service.evaluateTripProximityAlerts("30", "1");
    const secondCount = await service.evaluateTripProximityAlerts("30", "1");

    expect(firstCount).toBe(1);
    expect(secondCount).toBe(0);
    expect(integrationOutboxRepositoryMock.enqueueEvent).toHaveBeenCalledTimes(1);
  });

  it("skips proximity enqueue when push notifications are disabled in settings", async () => {
    vi.mocked(systemSettingsReadServiceMock.getPushNotificationsSettings).mockResolvedValue({
      fcmEnabled: false,
      transportRealtimeEnabled: true
    });

    const service = new TransportProximityService(
      transportEtaRepositoryMock as unknown as TransportEtaRepository,
      integrationOutboxRepositoryMock as unknown as IntegrationOutboxRepository,
      systemSettingsReadServiceMock as unknown as SystemSettingsReadService
    );

    const count = await service.evaluateTripProximityAlerts("30", "1");

    expect(count).toBe(0);
    expect(transportEtaRepositoryMock.claimApproachingStopNotifications).not.toHaveBeenCalled();
    expect(transportEtaRepositoryMock.claimArrivedStopNotifications).not.toHaveBeenCalled();
    expect(integrationOutboxRepositoryMock.enqueueEvent).not.toHaveBeenCalled();
  });
});
