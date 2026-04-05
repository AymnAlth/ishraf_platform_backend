import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

interface QueryPerformanceSample {
  requestId: string | null;
  method: string;
  routePattern: string;
  originalPath: string;
  normalizedSql: string;
  durationInMs: number;
  rowCount: number | null;
}

interface QueryPerformanceStatementSummaryRow {
  method: string;
  routePattern: string;
  normalizedSql: string;
  queryCount: number;
  totalDurationInMs: number;
  avgDurationInMs: number;
  p95DurationInMs: number;
  maxDurationInMs: number;
}

interface QueryPerformanceRouteSummaryRow {
  method: string;
  routePattern: string;
  queryCount: number;
  totalDurationInMs: number;
  avgDurationInMs: number;
  p95DurationInMs: number;
  maxDurationInMs: number;
  topQueries: QueryPerformanceStatementSummaryRow[];
}

interface QueryPerformanceAuditReport {
  generatedAt: string;
  queryCount: number;
  uniqueStatementCount: number;
  slowestQueries: QueryPerformanceSample[];
  statements: QueryPerformanceStatementSummaryRow[];
  routes: QueryPerformanceRouteSummaryRow[];
}

interface QueryPerformanceRecordInput {
  requestId?: string;
  method?: string;
  routePattern?: string | null;
  originalPath?: string;
  sql: string;
  durationInMs: number;
  rowCount: number | null;
}

const normalizeSql = (sql: string): string => sql.replace(/\s+/g, " ").trim();

const shouldSkipSql = (normalizedSql: string): boolean =>
  normalizedSql === "BEGIN" ||
  normalizedSql === "COMMIT" ||
  normalizedSql === "ROLLBACK" ||
  normalizedSql.length === 0;

class QueryPerformanceAuditService {
  private readonly enabled = process.env.QUERY_PERF_AUDIT_ENABLED === "true";

  private readonly outputPath =
    process.env.QUERY_PERF_AUDIT_OUTPUT_PATH ??
    path.resolve(process.cwd(), ".tmp", "query-performance-audit.json");

  private readonly samples: QueryPerformanceSample[] = [];

  private flushRegistered = false;

  record(input: QueryPerformanceRecordInput): void {
    if (!this.enabled) {
      return;
    }

    const normalizedSql = normalizeSql(input.sql);

    if (shouldSkipSql(normalizedSql)) {
      return;
    }

    this.samples.push({
      requestId: input.requestId ?? null,
      method: input.method ?? "unknown",
      routePattern: input.routePattern ?? "<unknown>",
      originalPath: input.originalPath ?? "<unknown>",
      normalizedSql,
      durationInMs: Number(input.durationInMs.toFixed(2)),
      rowCount: input.rowCount
    });
    this.registerFlushHook();
  }

  flushNow(): void {
    this.flushReport();
  }

  private registerFlushHook(): void {
    if (this.flushRegistered) {
      return;
    }

    this.flushRegistered = true;
    process.once("exit", () => {
      this.flushReport();
    });
  }

  private flushReport(): void {
    if (!this.enabled) {
      return;
    }

    const statements = this.buildStatementSummaries();
    const report: QueryPerformanceAuditReport = {
      generatedAt: new Date().toISOString(),
      queryCount: this.samples.length,
      uniqueStatementCount: statements.length,
      slowestQueries: [...this.samples]
        .sort((left, right) => right.durationInMs - left.durationInMs)
        .slice(0, 50),
      statements,
      routes: this.buildRouteSummaries(statements)
    };

    mkdirSync(path.dirname(this.outputPath), { recursive: true });
    writeFileSync(this.outputPath, JSON.stringify(report, null, 2), "utf8");
  }

  private buildStatementSummaries(): QueryPerformanceStatementSummaryRow[] {
    const groups = new Map<string, QueryPerformanceSample[]>();

    for (const sample of this.samples) {
      const key = `${sample.method}::${sample.routePattern}::${sample.normalizedSql}`;
      const existing = groups.get(key);

      if (existing) {
        existing.push(sample);
      } else {
        groups.set(key, [sample]);
      }
    }

    return [...groups.entries()]
      .map(([key, samples]) => {
        const [method, routePattern, normalizedSql] = key.split("::");
        const durations = samples
          .map((sample) => sample.durationInMs)
          .sort((left, right) => left - right);
        const totalDurationInMs = durations.reduce((total, value) => total + value, 0);

        return {
          method,
          routePattern,
          normalizedSql,
          queryCount: samples.length,
          totalDurationInMs: this.round(totalDurationInMs),
          avgDurationInMs: this.round(totalDurationInMs / durations.length),
          p95DurationInMs: this.percentile(durations, 0.95),
          maxDurationInMs: this.round(durations[durations.length - 1] ?? 0)
        };
      })
      .sort((left, right) => right.totalDurationInMs - left.totalDurationInMs);
  }

  private buildRouteSummaries(
    statements: QueryPerformanceStatementSummaryRow[]
  ): QueryPerformanceRouteSummaryRow[] {
    const groups = new Map<string, QueryPerformanceStatementSummaryRow[]>();

    for (const statement of statements) {
      const key = `${statement.method}::${statement.routePattern}`;
      const existing = groups.get(key);

      if (existing) {
        existing.push(statement);
      } else {
        groups.set(key, [statement]);
      }
    }

    return [...groups.entries()]
      .map(([key, routeStatements]) => {
        const [method, routePattern] = key.split("::");
        const maxDurationInMs = Math.max(
          ...routeStatements.map((statement) => statement.maxDurationInMs),
          0
        );
        const totalDurationInMs = routeStatements.reduce(
          (total, statement) => total + statement.totalDurationInMs,
          0
        );
        const queryCount = routeStatements.reduce(
          (total, statement) => total + statement.queryCount,
          0
        );
        const p95Candidates = routeStatements
          .map((statement) => statement.p95DurationInMs)
          .sort((left, right) => left - right);

        return {
          method,
          routePattern,
          queryCount,
          totalDurationInMs: this.round(totalDurationInMs),
          avgDurationInMs: this.round(totalDurationInMs / queryCount),
          p95DurationInMs: this.percentile(p95Candidates, 0.95),
          maxDurationInMs: this.round(maxDurationInMs),
          topQueries: [...routeStatements].sort(
            (left, right) => right.totalDurationInMs - left.totalDurationInMs
          ).slice(0, 10)
        };
      })
      .sort((left, right) => right.totalDurationInMs - left.totalDurationInMs);
  }

  private percentile(values: number[], ratio: number): number {
    if (values.length === 0) {
      return 0;
    }

    const index = Math.min(values.length - 1, Math.max(0, Math.ceil(values.length * ratio) - 1));

    return this.round(values[index] ?? 0);
  }

  private round(value: number): number {
    return Number(value.toFixed(2));
  }
}

export const queryPerformanceAuditService = new QueryPerformanceAuditService();
