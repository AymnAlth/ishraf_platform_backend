import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

interface RequestPerformanceSample {
  method: string;
  routePattern: string;
  originalPath: string;
  statusCode: number;
  durationInMs: number;
}

interface RequestPerformanceSummaryRow {
  method: string;
  routePattern: string;
  requestCount: number;
  avgDurationInMs: number;
  p50DurationInMs: number;
  p95DurationInMs: number;
  maxDurationInMs: number;
  non2xxCount: number;
}

interface RequestPerformanceAuditReport {
  generatedAt: string;
  requestCount: number;
  uniqueRouteCount: number;
  slowestRequests: RequestPerformanceSample[];
  routes: RequestPerformanceSummaryRow[];
}

class RequestPerformanceAuditService {
  private readonly enabled = process.env.REQUEST_PERF_AUDIT_ENABLED === "true";

  private readonly outputPath =
    process.env.REQUEST_PERF_AUDIT_OUTPUT_PATH ??
    path.resolve(process.cwd(), ".tmp", "request-performance-audit.json");

  private readonly samples: RequestPerformanceSample[] = [];

  private flushRegistered = false;

  record(sample: RequestPerformanceSample): void {
    if (!this.enabled) {
      return;
    }

    this.samples.push(sample);
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

    const report: RequestPerformanceAuditReport = {
      generatedAt: new Date().toISOString(),
      requestCount: this.samples.length,
      uniqueRouteCount: this.buildRouteSummaries().length,
      slowestRequests: [...this.samples]
        .sort((left, right) => right.durationInMs - left.durationInMs)
        .slice(0, 25),
      routes: this.buildRouteSummaries()
    };

    mkdirSync(path.dirname(this.outputPath), { recursive: true });
    writeFileSync(this.outputPath, JSON.stringify(report, null, 2), "utf8");
  }

  private buildRouteSummaries(): RequestPerformanceSummaryRow[] {
    const groups = new Map<string, RequestPerformanceSample[]>();

    for (const sample of this.samples) {
      const key = `${sample.method} ${sample.routePattern}`;
      const group = groups.get(key);

      if (group) {
        group.push(sample);
      } else {
        groups.set(key, [sample]);
      }
    }

    return [...groups.entries()]
      .map(([key, samples]) => {
        const [method, ...routeParts] = key.split(" ");
        const routePattern = routeParts.join(" ");
        const durations = samples
          .map((sample) => sample.durationInMs)
          .sort((left, right) => left - right);

        return {
          method,
          routePattern,
          requestCount: samples.length,
          avgDurationInMs: this.round(
            durations.reduce((total, duration) => total + duration, 0) / durations.length
          ),
          p50DurationInMs: this.percentile(durations, 0.5),
          p95DurationInMs: this.percentile(durations, 0.95),
          maxDurationInMs: this.round(durations[durations.length - 1] ?? 0),
          non2xxCount: samples.filter((sample) => sample.statusCode < 200 || sample.statusCode >= 300)
            .length
        };
      })
      .sort((left, right) => right.p95DurationInMs - left.p95DurationInMs);
  }

  private percentile(durations: number[], ratio: number): number {
    if (durations.length === 0) {
      return 0;
    }

    const index = Math.min(
      durations.length - 1,
      Math.max(0, Math.ceil(durations.length * ratio) - 1)
    );

    return this.round(durations[index] ?? 0);
  }

  private round(value: number): number {
    return Number(value.toFixed(2));
  }
}

export const requestPerformanceAuditService = new RequestPerformanceAuditService();
