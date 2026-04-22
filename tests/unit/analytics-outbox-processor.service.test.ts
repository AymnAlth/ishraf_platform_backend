import { beforeEach, describe, expect, it, vi } from "vitest";

import { db } from "../../src/database/db";
import type { AnalyticsOutboxRepository } from "../../src/modules/analytics/repository/analytics-outbox.repository";
import { AnalyticsOutboxProcessorService } from "../../src/modules/analytics/service/analytics-outbox-processor.service";
import type { AnalyticsJobExecutionServicePort } from "../../src/modules/analytics/service/analytics.service";

describe("AnalyticsOutboxProcessorService", () => {
  const outboxRepositoryMock = {
    claimJobExecutionDispatchBatch: vi.fn(),
    markDelivered: vi.fn(),
    markFailed: vi.fn()
  };
  const analyticsServiceMock = {
    executeJob: vi.fn(),
    markJobFailure: vi.fn()
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
    Object.values(analyticsServiceMock).forEach((mockFn) => mockFn.mockReset());
    vi.mocked(outboxRepositoryMock.claimJobExecutionDispatchBatch).mockResolvedValue([]);
    vi.mocked(outboxRepositoryMock.markDelivered).mockResolvedValue(undefined);
    vi.mocked(outboxRepositoryMock.markFailed).mockResolvedValue(undefined);
    vi.mocked(analyticsServiceMock.executeJob).mockResolvedValue(true);
    vi.mocked(analyticsServiceMock.markJobFailure).mockResolvedValue(undefined);
  });

  it("marks analytics outbox rows as delivered when the payload is valid", async () => {
    vi.mocked(outboxRepositoryMock.claimJobExecutionDispatchBatch).mockResolvedValue([
      {
        id: "200",
        providerKey: "analytics",
        eventType: "analytics_job_execute",
        aggregateType: "analytics_job",
        aggregateId: "301",
        status: "processing",
        payloadJson: {
          jobId: "301"
        },
        headersJson: {},
        idempotencyKey: "analytics:job-execute:301",
        availableAt: new Date("2026-04-22T10:00:00.000Z"),
        reservedAt: new Date("2026-04-22T10:00:01.000Z"),
        processedAt: null,
        attemptCount: 0,
        maxAttempts: 10,
        lastErrorCode: null,
        lastErrorMessage: null,
        createdByUserId: null,
        requestId: null,
        createdAt: new Date("2026-04-22T10:00:00.000Z"),
        updatedAt: new Date("2026-04-22T10:00:01.000Z")
      }
    ]);

    const service = new AnalyticsOutboxProcessorService(
      outboxRepositoryMock as unknown as AnalyticsOutboxRepository,
      analyticsServiceMock as unknown as AnalyticsJobExecutionServicePort
    );

    const claimed = await service.processNextBatch(20, 5);

    expect(claimed).toBe(1);
    expect(analyticsServiceMock.executeJob).toHaveBeenCalledWith("301");
    expect(outboxRepositoryMock.markDelivered).toHaveBeenCalledWith("200");
    expect(outboxRepositoryMock.markFailed).not.toHaveBeenCalled();
  });

  it("moves invalid payload rows to dead without calling analytics execution", async () => {
    vi.mocked(outboxRepositoryMock.claimJobExecutionDispatchBatch).mockResolvedValue([
      {
        id: "201",
        providerKey: "analytics",
        eventType: "analytics_job_execute",
        aggregateType: "analytics_job",
        aggregateId: "302",
        status: "processing",
        payloadJson: {
          invalid: true
        },
        headersJson: {},
        idempotencyKey: "analytics:job-execute:302",
        availableAt: new Date("2026-04-22T10:00:00.000Z"),
        reservedAt: new Date("2026-04-22T10:00:01.000Z"),
        processedAt: null,
        attemptCount: 0,
        maxAttempts: 10,
        lastErrorCode: null,
        lastErrorMessage: null,
        createdByUserId: null,
        requestId: null,
        createdAt: new Date("2026-04-22T10:00:00.000Z"),
        updatedAt: new Date("2026-04-22T10:00:01.000Z")
      }
    ]);

    const service = new AnalyticsOutboxProcessorService(
      outboxRepositoryMock as unknown as AnalyticsOutboxRepository,
      analyticsServiceMock as unknown as AnalyticsJobExecutionServicePort
    );

    await service.processNextBatch(20, 5);

    expect(analyticsServiceMock.executeJob).not.toHaveBeenCalled();
    expect(outboxRepositoryMock.markFailed).toHaveBeenCalledWith("201", {
      nextStatus: "dead",
      errorCode: "INVALID_OUTBOX_PAYLOAD",
      errorMessage: "Outbox payload does not match the analytics job execution contract"
    });
    expect(analyticsServiceMock.markJobFailure).not.toHaveBeenCalled();
  });

  it("retries with backoff and marks the analytics job failed or dead based on attempts", async () => {
    vi.mocked(outboxRepositoryMock.claimJobExecutionDispatchBatch).mockResolvedValue([
      {
        id: "202",
        providerKey: "analytics",
        eventType: "analytics_job_execute",
        aggregateType: "analytics_job",
        aggregateId: "303",
        status: "processing",
        payloadJson: {
          jobId: "303"
        },
        headersJson: {},
        idempotencyKey: "analytics:job-execute:303",
        availableAt: new Date("2026-04-22T10:00:00.000Z"),
        reservedAt: new Date("2026-04-22T10:00:01.000Z"),
        processedAt: null,
        attemptCount: 1,
        maxAttempts: 10,
        lastErrorCode: null,
        lastErrorMessage: null,
        createdByUserId: null,
        requestId: null,
        createdAt: new Date("2026-04-22T10:00:00.000Z"),
        updatedAt: new Date("2026-04-22T10:00:01.000Z")
      },
      {
        id: "203",
        providerKey: "analytics",
        eventType: "analytics_job_execute",
        aggregateType: "analytics_job",
        aggregateId: "304",
        status: "processing",
        payloadJson: {
          jobId: "304"
        },
        headersJson: {},
        idempotencyKey: "analytics:job-execute:304",
        availableAt: new Date("2026-04-22T10:00:00.000Z"),
        reservedAt: new Date("2026-04-22T10:00:01.000Z"),
        processedAt: null,
        attemptCount: 9,
        maxAttempts: 10,
        lastErrorCode: null,
        lastErrorMessage: null,
        createdByUserId: null,
        requestId: null,
        createdAt: new Date("2026-04-22T10:00:00.000Z"),
        updatedAt: new Date("2026-04-22T10:00:01.000Z")
      }
    ]);
    vi.mocked(analyticsServiceMock.executeJob).mockRejectedValue(new Error("Worker crashed"));

    const service = new AnalyticsOutboxProcessorService(
      outboxRepositoryMock as unknown as AnalyticsOutboxRepository,
      analyticsServiceMock as unknown as AnalyticsJobExecutionServicePort
    );

    await service.processNextBatch(20, 2);

    expect(outboxRepositoryMock.markDelivered).not.toHaveBeenCalled();
    expect(analyticsServiceMock.markJobFailure).toHaveBeenCalledTimes(2);
    expect(analyticsServiceMock.markJobFailure).toHaveBeenNthCalledWith(
      1,
      "303",
      "failed",
      "ANALYTICS_JOB_PROCESSING_FAILED",
      "Worker crashed"
    );
    expect(analyticsServiceMock.markJobFailure).toHaveBeenNthCalledWith(
      2,
      "304",
      "dead",
      "ANALYTICS_JOB_PROCESSING_FAILED",
      "Worker crashed"
    );
    expect(outboxRepositoryMock.markFailed.mock.calls[0][1]).toMatchObject({
      nextStatus: "failed",
      errorCode: "ANALYTICS_JOB_PROCESSING_FAILED",
      errorMessage: "Worker crashed",
      nextAvailableAt: expect.any(Date)
    });
    expect(outboxRepositoryMock.markFailed.mock.calls[1][1]).toMatchObject({
      nextStatus: "dead",
      errorCode: "ANALYTICS_JOB_PROCESSING_FAILED",
      errorMessage: "Worker crashed",
      nextAvailableAt: null
    });
  });
});
