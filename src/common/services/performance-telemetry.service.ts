import { env } from "../../config/env";

interface DurationStats {
  sampleCount: number;
  avgDurationInMs: number;
  p50DurationInMs: number;
  p95DurationInMs: number;
  maxDurationInMs: number;
}

export interface PerformanceTelemetryRequestSample {
  recordedAt: string;
  requestId: string | null;
  method: string;
  routePattern: string;
  originalPath: string;
  statusCode: number;
  durationInMs: number;
}

export interface PerformanceTelemetryQuerySample {
  recordedAt: string;
  requestId: string | null;
  method: string;
  routePattern: string;
  originalPath: string;
  normalizedSql: string;
  durationInMs: number;
  rowCount: number | null;
}

export interface PerformanceTelemetryRouteSummary extends DurationStats {
  method: string;
  routePattern: string;
  slowCount: number;
  non2xxCount: number;
}

export interface PerformanceTelemetryStatementSummary extends DurationStats {
  method: string;
  routePattern: string;
  normalizedSql: string;
  totalDurationInMs: number;
  slowCount: number;
}

export interface PerformanceTelemetryQueryRouteSummary extends DurationStats {
  method: string;
  routePattern: string;
  totalDurationInMs: number;
  slowCount: number;
  topStatements: PerformanceTelemetryStatementSummary[];
}

export interface PerformanceTelemetrySampleList<TSample> {
  enabled: boolean;
  appliedFilters: {
    route?: string;
    slowOnly: boolean;
    limit: number;
  };
  totalMatchedItems: number;
  items: TSample[];
}

export interface PerformanceTelemetrySummaryReport {
  enabled: boolean;
  startedAt: string;
  config: {
    requestSampleLimit: number;
    querySampleLimit: number;
    slowRequestThresholdMs: number;
    slowQueryThresholdMs: number;
  };
  requests: {
    sampleCount: number;
    slowCount: number;
    overall: DurationStats;
    topRoutes: PerformanceTelemetryRouteSummary[];
    slowest: PerformanceTelemetryRequestSample[];
  };
  queries: {
    sampleCount: number;
    slowCount: number;
    overall: DurationStats & {
      totalDurationInMs: number;
    };
    topRoutes: PerformanceTelemetryQueryRouteSummary[];
    topStatements: PerformanceTelemetryStatementSummary[];
    slowest: PerformanceTelemetryQuerySample[];
  };
}

export interface PerformanceTelemetryConfig {
  enabled: boolean;
  requestSampleLimit: number;
  querySampleLimit: number;
  slowRequestThresholdMs: number;
  slowQueryThresholdMs: number;
}

interface RequestSampleFilter {
  route?: string;
  slowOnly?: boolean;
  limit?: number;
}

interface QuerySampleFilter {
  route?: string;
  slowOnly?: boolean;
  limit?: number;
}

interface RequestRecordInput {
  requestId?: string | null;
  method?: string;
  routePattern?: string | null;
  originalPath?: string;
  statusCode: number;
  durationInMs: number;
}

interface QueryRecordInput {
  requestId?: string | null;
  method?: string;
  routePattern?: string | null;
  originalPath?: string;
  sql: string;
  durationInMs: number;
  rowCount: number | null;
}

class RingBuffer<TItem> {
  private readonly items: TItem[];

  private nextIndex = 0;

  private size = 0;

  constructor(private readonly capacity: number) {
    this.items = new Array<TItem>(capacity);
  }

  push(item: TItem): void {
    this.items[this.nextIndex] = item;
    this.nextIndex = (this.nextIndex + 1) % this.capacity;
    this.size = Math.min(this.size + 1, this.capacity);
  }

  valuesOldestFirst(): TItem[] {
    if (this.size === 0) {
      return [];
    }

    if (this.size < this.capacity) {
      return this.items.slice(0, this.size);
    }

    return [...this.items.slice(this.nextIndex), ...this.items.slice(0, this.nextIndex)];
  }

  clear(): void {
    this.nextIndex = 0;
    this.size = 0;
  }
}

const normalizeSql = (sql: string): string => sql.replace(/\s+/g, " ").trim();

const round = (value: number): number => Number(value.toFixed(2));

const buildGroupKey = (...segments: string[]): string => JSON.stringify(segments);

const parseGroupKey = <T extends string[]>(key: string): T => JSON.parse(key) as T;

const percentile = (values: number[], ratio: number): number => {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * ratio) - 1));

  return round(sorted[index] ?? 0);
};

const toDurationStats = (durations: number[]): DurationStats => {
  if (durations.length === 0) {
    return {
      sampleCount: 0,
      avgDurationInMs: 0,
      p50DurationInMs: 0,
      p95DurationInMs: 0,
      maxDurationInMs: 0
    };
  }

  const totalDurationInMs = durations.reduce((total, value) => total + value, 0);

  return {
    sampleCount: durations.length,
    avgDurationInMs: round(totalDurationInMs / durations.length),
    p50DurationInMs: percentile(durations, 0.5),
    p95DurationInMs: percentile(durations, 0.95),
    maxDurationInMs: round(Math.max(...durations))
  };
};

const normalizeRoutePattern = (routePattern?: string | null, originalPath?: string): string =>
  routePattern && routePattern.trim().length > 0 ? routePattern : originalPath?.trim() || "<unknown>";

const toRouteFilter = (route?: string): string | undefined => {
  const normalized = route?.trim().toLowerCase();

  return normalized ? normalized : undefined;
};

const matchesRouteFilter = (routePattern: string, routeFilter?: string): boolean => {
  if (!routeFilter) {
    return true;
  }

  return routePattern.toLowerCase().includes(routeFilter);
};

export class PerformanceTelemetryService {
  private readonly requestSamples: RingBuffer<PerformanceTelemetryRequestSample>;

  private readonly querySamples: RingBuffer<PerformanceTelemetryQuerySample>;

  private startedAt = new Date().toISOString();

  constructor(private readonly config: PerformanceTelemetryConfig = {
    enabled: env.OBSERVABILITY_PERFORMANCE_ENABLED,
    requestSampleLimit: env.OBSERVABILITY_REQUEST_SAMPLE_LIMIT,
    querySampleLimit: env.OBSERVABILITY_QUERY_SAMPLE_LIMIT,
    slowRequestThresholdMs: env.OBSERVABILITY_SLOW_REQUEST_THRESHOLD_MS,
    slowQueryThresholdMs: env.OBSERVABILITY_SLOW_QUERY_THRESHOLD_MS
  }) {
    this.requestSamples = new RingBuffer<PerformanceTelemetryRequestSample>(
      this.config.requestSampleLimit
    );
    this.querySamples = new RingBuffer<PerformanceTelemetryQuerySample>(
      this.config.querySampleLimit
    );
  }

  isEnabled(): boolean {
    return this.config.enabled;
  }

  isSlowRequest(durationInMs: number): boolean {
    return this.config.enabled && durationInMs >= this.config.slowRequestThresholdMs;
  }

  isSlowQuery(durationInMs: number): boolean {
    return this.config.enabled && durationInMs >= this.config.slowQueryThresholdMs;
  }

  reset(): void {
    this.requestSamples.clear();
    this.querySamples.clear();
    this.startedAt = new Date().toISOString();
  }

  recordRequest(input: RequestRecordInput): void {
    if (!this.config.enabled) {
      return;
    }

    this.requestSamples.push({
      recordedAt: new Date().toISOString(),
      requestId: input.requestId ?? null,
      method: input.method ?? "unknown",
      routePattern: normalizeRoutePattern(input.routePattern, input.originalPath),
      originalPath: input.originalPath?.trim() || "<unknown>",
      statusCode: input.statusCode,
      durationInMs: round(input.durationInMs)
    });
  }

  recordQuery(input: QueryRecordInput): void {
    if (!this.config.enabled) {
      return;
    }

    this.querySamples.push({
      recordedAt: new Date().toISOString(),
      requestId: input.requestId ?? null,
      method: input.method ?? "unknown",
      routePattern: normalizeRoutePattern(input.routePattern, input.originalPath),
      originalPath: input.originalPath?.trim() || "<unknown>",
      normalizedSql: normalizeSql(input.sql),
      durationInMs: round(input.durationInMs),
      rowCount: input.rowCount
    });
  }

  buildSummary(): PerformanceTelemetrySummaryReport {
    const requestSamples = this.requestSamples.valuesOldestFirst();
    const querySamples = this.querySamples.valuesOldestFirst();
    const requestDurations = requestSamples.map((sample) => sample.durationInMs);
    const queryDurations = querySamples.map((sample) => sample.durationInMs);
    const queryTotalDurationInMs = round(
      queryDurations.reduce((total, value) => total + value, 0)
    );

    return {
      enabled: this.config.enabled,
      startedAt: this.startedAt,
      config: {
        requestSampleLimit: this.config.requestSampleLimit,
        querySampleLimit: this.config.querySampleLimit,
        slowRequestThresholdMs: this.config.slowRequestThresholdMs,
        slowQueryThresholdMs: this.config.slowQueryThresholdMs
      },
      requests: {
        sampleCount: requestSamples.length,
        slowCount: requestSamples.filter((sample) =>
          sample.durationInMs >= this.config.slowRequestThresholdMs
        ).length,
        overall: toDurationStats(requestDurations),
        topRoutes: this.buildRequestRouteSummaries(requestSamples).slice(0, 10),
        slowest: [...requestSamples]
          .sort((left, right) => right.durationInMs - left.durationInMs)
          .slice(0, 10)
      },
      queries: {
        sampleCount: querySamples.length,
        slowCount: querySamples.filter((sample) =>
          sample.durationInMs >= this.config.slowQueryThresholdMs
        ).length,
        overall: {
          ...toDurationStats(queryDurations),
          totalDurationInMs: queryTotalDurationInMs
        },
        topRoutes: this.buildQueryRouteSummaries(querySamples).slice(0, 10),
        topStatements: this.buildStatementSummaries(querySamples).slice(0, 10),
        slowest: [...querySamples]
          .sort((left, right) => right.durationInMs - left.durationInMs)
          .slice(0, 10)
      }
    };
  }

  listRequestSamples(
    filter: RequestSampleFilter = {}
  ): PerformanceTelemetrySampleList<PerformanceTelemetryRequestSample> {
    const routeFilter = toRouteFilter(filter.route);
    const limit = Math.max(1, Math.min(filter.limit ?? 20, 100));
    const filtered = this.requestSamples
      .valuesOldestFirst()
      .filter((sample) => matchesRouteFilter(sample.routePattern, routeFilter))
      .filter((sample) =>
        filter.slowOnly ? sample.durationInMs >= this.config.slowRequestThresholdMs : true
      )
      .reverse();

    return {
      enabled: this.config.enabled,
      appliedFilters: {
        route: filter.route?.trim() || undefined,
        slowOnly: Boolean(filter.slowOnly),
        limit
      },
      totalMatchedItems: filtered.length,
      items: filtered.slice(0, limit)
    };
  }

  listQuerySamples(
    filter: QuerySampleFilter = {}
  ): PerformanceTelemetrySampleList<PerformanceTelemetryQuerySample> {
    const routeFilter = toRouteFilter(filter.route);
    const limit = Math.max(1, Math.min(filter.limit ?? 20, 100));
    const filtered = this.querySamples
      .valuesOldestFirst()
      .filter((sample) => matchesRouteFilter(sample.routePattern, routeFilter))
      .filter((sample) =>
        filter.slowOnly ? sample.durationInMs >= this.config.slowQueryThresholdMs : true
      )
      .reverse();

    return {
      enabled: this.config.enabled,
      appliedFilters: {
        route: filter.route?.trim() || undefined,
        slowOnly: Boolean(filter.slowOnly),
        limit
      },
      totalMatchedItems: filtered.length,
      items: filtered.slice(0, limit)
    };
  }

  private buildRequestRouteSummaries(
    samples: PerformanceTelemetryRequestSample[]
  ): PerformanceTelemetryRouteSummary[] {
    const groups = new Map<string, PerformanceTelemetryRequestSample[]>();

    for (const sample of samples) {
      const key = buildGroupKey(sample.method, sample.routePattern);
      const existing = groups.get(key);

      if (existing) {
        existing.push(sample);
      } else {
        groups.set(key, [sample]);
      }
    }

    return [...groups.entries()]
      .map(([key, routeSamples]) => {
        const [method, routePattern] = parseGroupKey<[string, string]>(key);
        const durations = routeSamples.map((sample) => sample.durationInMs);

        return {
          method,
          routePattern,
          ...toDurationStats(durations),
          slowCount: routeSamples.filter(
            (sample) => sample.durationInMs >= this.config.slowRequestThresholdMs
          ).length,
          non2xxCount: routeSamples.filter(
            (sample) => sample.statusCode < 200 || sample.statusCode >= 300
          ).length
        };
      })
      .sort((left, right) => right.p95DurationInMs - left.p95DurationInMs);
  }

  private buildStatementSummaries(
    samples: PerformanceTelemetryQuerySample[]
  ): PerformanceTelemetryStatementSummary[] {
    const groups = new Map<string, PerformanceTelemetryQuerySample[]>();

    for (const sample of samples) {
      const key = buildGroupKey(sample.method, sample.routePattern, sample.normalizedSql);
      const existing = groups.get(key);

      if (existing) {
        existing.push(sample);
      } else {
        groups.set(key, [sample]);
      }
    }

    return [...groups.entries()]
      .map(([key, statementSamples]) => {
        const [method, routePattern, normalizedSql] = parseGroupKey<
          [string, string, string]
        >(key);
        const durations = statementSamples.map((sample) => sample.durationInMs);
        const totalDurationInMs = round(durations.reduce((total, value) => total + value, 0));

        return {
          method,
          routePattern,
          normalizedSql,
          totalDurationInMs,
          ...toDurationStats(durations),
          slowCount: statementSamples.filter(
            (sample) => sample.durationInMs >= this.config.slowQueryThresholdMs
          ).length
        };
      })
      .sort((left, right) => right.totalDurationInMs - left.totalDurationInMs);
  }

  private buildQueryRouteSummaries(
    samples: PerformanceTelemetryQuerySample[]
  ): PerformanceTelemetryQueryRouteSummary[] {
    const statements = this.buildStatementSummaries(samples);
    const statementGroups = new Map<string, PerformanceTelemetryStatementSummary[]>();
    const sampleGroups = new Map<string, PerformanceTelemetryQuerySample[]>();

    for (const sample of samples) {
      const key = buildGroupKey(sample.method, sample.routePattern);
      const existing = sampleGroups.get(key);

      if (existing) {
        existing.push(sample);
      } else {
        sampleGroups.set(key, [sample]);
      }
    }

    for (const statement of statements) {
      const key = buildGroupKey(statement.method, statement.routePattern);
      const existing = statementGroups.get(key);

      if (existing) {
        existing.push(statement);
      } else {
        statementGroups.set(key, [statement]);
      }
    }

    return [...sampleGroups.entries()]
      .map(([key, routeSamples]) => {
        const [method, routePattern] = parseGroupKey<[string, string]>(key);
        const routeStatements = statementGroups.get(key) ?? [];
        const durations = routeSamples.map((sample) => sample.durationInMs);
        const totalDurationInMs = round(durations.reduce((total, value) => total + value, 0));
        const sampleCount = routeSamples.length;
        const slowCount = routeSamples.filter(
          (sample) => sample.durationInMs >= this.config.slowQueryThresholdMs
        ).length;

        return {
          method,
          routePattern,
          sampleCount,
          totalDurationInMs,
          avgDurationInMs: sampleCount === 0 ? 0 : round(totalDurationInMs / sampleCount),
          p50DurationInMs: percentile(durations, 0.5),
          p95DurationInMs: percentile(durations, 0.95),
          maxDurationInMs: round(Math.max(...durations, 0)),
          slowCount,
          topStatements: routeStatements.slice(0, 5)
        };
      })
      .sort((left, right) => right.totalDurationInMs - left.totalDurationInMs);
  }
}

export const performanceTelemetryService = new PerformanceTelemetryService();
