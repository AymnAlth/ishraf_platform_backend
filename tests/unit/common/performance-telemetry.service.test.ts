import { describe, expect, it } from "vitest";

import {
  PerformanceTelemetryService,
  type PerformanceTelemetryConfig
} from "../../../src/common/services/performance-telemetry.service";

const createConfig = (
  overrides: Partial<PerformanceTelemetryConfig> = {}
): PerformanceTelemetryConfig => ({
  enabled: true,
  requestSampleLimit: 10,
  querySampleLimit: 10,
  slowRequestThresholdMs: 500,
  slowQueryThresholdMs: 200,
  ...overrides
});

describe("PerformanceTelemetryService", () => {
  it("returns empty reports when telemetry is disabled", () => {
    const service = new PerformanceTelemetryService(
      createConfig({
        enabled: false
      })
    );

    service.recordRequest({
      requestId: "req-1",
      method: "GET",
      routePattern: "/health/ready",
      originalPath: "/api/v1/health/ready",
      statusCode: 200,
      durationInMs: 25
    });
    service.recordQuery({
      requestId: "req-1",
      method: "GET",
      routePattern: "/health/ready",
      originalPath: "/api/v1/health/ready",
      sql: "SELECT 1",
      durationInMs: 5,
      rowCount: 1
    });

    expect(service.buildSummary()).toMatchObject({
      enabled: false,
      requests: {
        sampleCount: 0,
        slowCount: 0
      },
      queries: {
        sampleCount: 0,
        slowCount: 0
      }
    });
    expect(service.listRequestSamples().items).toEqual([]);
    expect(service.listQuerySamples().items).toEqual([]);
  });

  it("keeps only the newest samples within the configured ring-buffer limits", () => {
    const service = new PerformanceTelemetryService(
      createConfig({
        requestSampleLimit: 2,
        querySampleLimit: 2
      })
    );

    service.recordRequest({
      requestId: "req-1",
      method: "GET",
      routePattern: "/alpha",
      originalPath: "/alpha",
      statusCode: 200,
      durationInMs: 100
    });
    service.recordRequest({
      requestId: "req-2",
      method: "GET",
      routePattern: "/beta",
      originalPath: "/beta",
      statusCode: 200,
      durationInMs: 200
    });
    service.recordRequest({
      requestId: "req-3",
      method: "GET",
      routePattern: "/gamma",
      originalPath: "/gamma",
      statusCode: 200,
      durationInMs: 300
    });

    service.recordQuery({
      requestId: "req-2",
      method: "GET",
      routePattern: "/beta",
      originalPath: "/beta",
      sql: "SELECT 2",
      durationInMs: 20,
      rowCount: 1
    });
    service.recordQuery({
      requestId: "req-3",
      method: "GET",
      routePattern: "/gamma",
      originalPath: "/gamma",
      sql: "SELECT 3",
      durationInMs: 30,
      rowCount: 1
    });
    service.recordQuery({
      requestId: "req-4",
      method: "GET",
      routePattern: "/delta",
      originalPath: "/delta",
      sql: "SELECT 4",
      durationInMs: 40,
      rowCount: 1
    });

    expect(service.listRequestSamples({ limit: 10 }).items.map((item) => item.requestId)).toEqual([
      "req-3",
      "req-2"
    ]);
    expect(service.listQuerySamples({ limit: 10 }).items.map((item) => item.requestId)).toEqual([
      "req-4",
      "req-3"
    ]);
  });

  it("aggregates route and statement summaries and applies sample filters", () => {
    const service = new PerformanceTelemetryService(createConfig());

    service.recordRequest({
      requestId: "req-1",
      method: "GET",
      routePattern: "/transport/trips/:tripId/live",
      originalPath: "/transport/trips/1/live",
      statusCode: 200,
      durationInMs: 320
    });
    service.recordRequest({
      requestId: "req-2",
      method: "GET",
      routePattern: "/transport/trips/:tripId/live",
      originalPath: "/transport/trips/1/live",
      statusCode: 503,
      durationInMs: 810
    });
    service.recordRequest({
      requestId: "req-3",
      method: "GET",
      routePattern: "/analytics/admin/operational-digest",
      originalPath: "/analytics/admin/operational-digest",
      statusCode: 200,
      durationInMs: 190
    });

    service.recordQuery({
      requestId: "req-1",
      method: "GET",
      routePattern: "/transport/trips/:tripId/live",
      originalPath: "/transport/trips/1/live",
      sql: "SELECT  *   FROM trips WHERE id = $1",
      durationInMs: 120,
      rowCount: 1
    });
    service.recordQuery({
      requestId: "req-2",
      method: "GET",
      routePattern: "/transport/trips/:tripId/live",
      originalPath: "/transport/trips/1/live",
      sql: "SELECT * FROM trips WHERE id = $1",
      durationInMs: 280,
      rowCount: 1
    });
    service.recordQuery({
      requestId: "req-2",
      method: "GET",
      routePattern: "/transport/trips/:tripId/live",
      originalPath: "/transport/trips/1/live",
      sql: "SELECT * FROM bus_location_history WHERE trip_id = $1",
      durationInMs: 90,
      rowCount: 5
    });

    const summary = service.buildSummary();

    expect(summary.requests.sampleCount).toBe(3);
    expect(summary.requests.slowCount).toBe(1);
    expect(summary.requests.topRoutes[0]).toMatchObject({
      method: "GET",
      routePattern: "/transport/trips/:tripId/live",
      sampleCount: 2,
      slowCount: 1,
      non2xxCount: 1
    });
    expect(summary.queries.sampleCount).toBe(3);
    expect(summary.queries.slowCount).toBe(1);
    expect(summary.queries.topStatements[0]).toMatchObject({
      routePattern: "/transport/trips/:tripId/live",
      normalizedSql: "SELECT * FROM trips WHERE id = $1",
      sampleCount: 2,
      slowCount: 1
    });
    expect(summary.queries.topRoutes[0]).toMatchObject({
      routePattern: "/transport/trips/:tripId/live",
      sampleCount: 3,
      slowCount: 1
    });

    const filteredRequests = service.listRequestSamples({
      route: "transport/trips",
      slowOnly: true,
      limit: 10
    });
    const filteredQueries = service.listQuerySamples({
      route: "transport",
      slowOnly: true,
      limit: 10
    });

    expect(filteredRequests.totalMatchedItems).toBe(1);
    expect(filteredRequests.items[0]?.requestId).toBe("req-2");
    expect(filteredQueries.totalMatchedItems).toBe(1);
    expect(filteredQueries.items[0]?.durationInMs).toBe(280);
  });

  it("clears accumulated samples on reset", () => {
    const service = new PerformanceTelemetryService(createConfig());

    service.recordRequest({
      requestId: "req-1",
      method: "GET",
      routePattern: "/health/ready",
      originalPath: "/health/ready",
      statusCode: 200,
      durationInMs: 20
    });
    service.recordQuery({
      requestId: "req-1",
      method: "GET",
      routePattern: "/health/ready",
      originalPath: "/health/ready",
      sql: "SELECT 1",
      durationInMs: 4,
      rowCount: 1
    });

    service.reset();

    expect(service.buildSummary()).toMatchObject({
      requests: {
        sampleCount: 0
      },
      queries: {
        sampleCount: 0
      }
    });
  });

  it("preserves PostgreSQL cast syntax when grouping statement summaries", () => {
    const service = new PerformanceTelemetryService(createConfig());

    service.recordQuery({
      requestId: "req-1",
      method: "GET",
      routePattern: "/reporting/dashboards/teacher/me",
      originalPath: "/api/v1/reporting/dashboards/teacher/me",
      sql: "SELECT COUNT(*)::int AS total FROM attendance_sessions",
      durationInMs: 22,
      rowCount: 1
    });

    expect(service.buildSummary().queries.topStatements[0]).toMatchObject({
      normalizedSql: "SELECT COUNT(*)::int AS total FROM attendance_sessions"
    });
  });
});
