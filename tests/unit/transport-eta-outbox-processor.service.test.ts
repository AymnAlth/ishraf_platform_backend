import { beforeEach, describe, expect, it, vi } from "vitest";

import { db } from "../../src/database/db";
import type { TransportEtaOutboxRepository } from "../../src/modules/transport/repository/transport-eta-outbox.repository";
import { TransportEtaOutboxProcessorService } from "../../src/modules/transport/service/transport-eta-outbox-processor.service";
import type { TransportEtaRefreshServicePort } from "../../src/modules/transport/service/transport-eta.service";

describe("TransportEtaOutboxProcessorService", () => {
  const outboxRepositoryMock = {
    claimTripRefreshDispatchBatch: vi.fn(),
    markDelivered: vi.fn(),
    markFailed: vi.fn()
  };
  const transportEtaServiceMock = {
    refreshTripEtaSnapshot: vi.fn()
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

    Object.values(outboxRepositoryMock).forEach((mockFn) => mockFn.mockReset());
    Object.values(transportEtaServiceMock).forEach((mockFn) => mockFn.mockReset());
    vi.mocked(outboxRepositoryMock.claimTripRefreshDispatchBatch).mockResolvedValue([]);
    vi.mocked(outboxRepositoryMock.markDelivered).mockResolvedValue(undefined);
    vi.mocked(outboxRepositoryMock.markFailed).mockResolvedValue(undefined);
    vi.mocked(transportEtaServiceMock.refreshTripEtaSnapshot).mockResolvedValue(true);
  });

  it("marks ETA outbox rows as delivered when payload is valid", async () => {
    vi.mocked(outboxRepositoryMock.claimTripRefreshDispatchBatch).mockResolvedValue([
      {
        id: "100",
        providerKey: "transportMaps",
        eventType: "transport_eta_refresh",
        aggregateType: "trip",
        aggregateId: "30",
        status: "processing",
        payloadJson: {
          tripId: "30",
          trigger: "trip_started"
        },
        headersJson: {},
        idempotencyKey: "eta:key",
        availableAt: new Date("2026-03-13T10:00:00.000Z"),
        reservedAt: new Date("2026-03-13T10:00:01.000Z"),
        processedAt: null,
        attemptCount: 0,
        maxAttempts: 10,
        lastErrorCode: null,
        lastErrorMessage: null,
        createdByUserId: null,
        requestId: null,
        createdAt: new Date("2026-03-13T10:00:00.000Z"),
        updatedAt: new Date("2026-03-13T10:00:01.000Z")
      }
    ]);

    const service = new TransportEtaOutboxProcessorService(
      outboxRepositoryMock as unknown as TransportEtaOutboxRepository,
      transportEtaServiceMock as unknown as TransportEtaRefreshServicePort
    );

    const claimed = await service.processNextBatch(20, 5);

    expect(claimed).toBe(1);
    expect(transportEtaServiceMock.refreshTripEtaSnapshot).toHaveBeenCalledWith("30");
    expect(outboxRepositoryMock.markDelivered).toHaveBeenCalledWith("100");
    expect(outboxRepositoryMock.markFailed).not.toHaveBeenCalled();
  });

  it("moves invalid payload rows to dead without calling ETA refresh", async () => {
    vi.mocked(outboxRepositoryMock.claimTripRefreshDispatchBatch).mockResolvedValue([
      {
        id: "101",
        providerKey: "transportMaps",
        eventType: "transport_eta_refresh",
        aggregateType: "trip",
        aggregateId: "30",
        status: "processing",
        payloadJson: {
          tripId: "30"
        },
        headersJson: {},
        idempotencyKey: "eta:key",
        availableAt: new Date("2026-03-13T10:00:00.000Z"),
        reservedAt: new Date("2026-03-13T10:00:01.000Z"),
        processedAt: null,
        attemptCount: 0,
        maxAttempts: 10,
        lastErrorCode: null,
        lastErrorMessage: null,
        createdByUserId: null,
        requestId: null,
        createdAt: new Date("2026-03-13T10:00:00.000Z"),
        updatedAt: new Date("2026-03-13T10:00:01.000Z")
      }
    ]);

    const service = new TransportEtaOutboxProcessorService(
      outboxRepositoryMock as unknown as TransportEtaOutboxRepository,
      transportEtaServiceMock as unknown as TransportEtaRefreshServicePort
    );

    await service.processNextBatch(20, 5);

    expect(transportEtaServiceMock.refreshTripEtaSnapshot).not.toHaveBeenCalled();
    expect(outboxRepositoryMock.markFailed).toHaveBeenCalledWith("101", {
      nextStatus: "dead",
      errorCode: "INVALID_OUTBOX_PAYLOAD",
      errorMessage: "Outbox payload does not match the transport ETA refresh contract"
    });
    expect(outboxRepositoryMock.markDelivered).not.toHaveBeenCalled();
  });

  it("retries with backoff and then marks dead when attempts are exhausted", async () => {
    vi.mocked(outboxRepositoryMock.claimTripRefreshDispatchBatch).mockResolvedValue([
      {
        id: "102",
        providerKey: "transportMaps",
        eventType: "transport_eta_refresh",
        aggregateType: "trip",
        aggregateId: "30",
        status: "processing",
        payloadJson: {
          tripId: "30",
          trigger: "heartbeat",
          heartbeatRecordedAt: "2026-03-13T10:15:40.000Z"
        },
        headersJson: {},
        idempotencyKey: "eta:key",
        availableAt: new Date("2026-03-13T10:00:00.000Z"),
        reservedAt: new Date("2026-03-13T10:00:01.000Z"),
        processedAt: null,
        attemptCount: 1,
        maxAttempts: 10,
        lastErrorCode: null,
        lastErrorMessage: null,
        createdByUserId: null,
        requestId: null,
        createdAt: new Date("2026-03-13T10:00:00.000Z"),
        updatedAt: new Date("2026-03-13T10:00:01.000Z")
      },
      {
        id: "103",
        providerKey: "transportMaps",
        eventType: "transport_eta_refresh",
        aggregateType: "trip",
        aggregateId: "31",
        status: "processing",
        payloadJson: {
          tripId: "31",
          trigger: "heartbeat",
          heartbeatRecordedAt: "2026-03-13T10:16:10.000Z"
        },
        headersJson: {},
        idempotencyKey: "eta:key:terminal",
        availableAt: new Date("2026-03-13T10:00:00.000Z"),
        reservedAt: new Date("2026-03-13T10:00:01.000Z"),
        processedAt: null,
        attemptCount: 9,
        maxAttempts: 10,
        lastErrorCode: null,
        lastErrorMessage: null,
        createdByUserId: null,
        requestId: null,
        createdAt: new Date("2026-03-13T10:00:00.000Z"),
        updatedAt: new Date("2026-03-13T10:00:01.000Z")
      }
    ]);
    vi.mocked(transportEtaServiceMock.refreshTripEtaSnapshot).mockRejectedValue(
      new Error("ETA refresh failed")
    );

    const service = new TransportEtaOutboxProcessorService(
      outboxRepositoryMock as unknown as TransportEtaOutboxRepository,
      transportEtaServiceMock as unknown as TransportEtaRefreshServicePort
    );

    await service.processNextBatch(20, 2);

    expect(outboxRepositoryMock.markDelivered).not.toHaveBeenCalled();
    expect(outboxRepositoryMock.markFailed).toHaveBeenCalledTimes(2);
    expect(outboxRepositoryMock.markFailed.mock.calls[0][0]).toBe("102");
    expect(outboxRepositoryMock.markFailed.mock.calls[0][1]).toMatchObject({
      nextStatus: "failed",
      errorCode: "TRANSPORT_ETA_PROCESSING_FAILED",
      errorMessage: "ETA refresh failed",
      nextAvailableAt: expect.any(Date)
    });
    expect(outboxRepositoryMock.markFailed.mock.calls[1][0]).toBe("103");
    expect(outboxRepositoryMock.markFailed.mock.calls[1][1]).toMatchObject({
      nextStatus: "dead",
      errorCode: "TRANSPORT_ETA_PROCESSING_FAILED",
      errorMessage: "ETA refresh failed",
      nextAvailableAt: null
    });
  });
});
