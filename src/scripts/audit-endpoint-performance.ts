import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
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

const pnpmCommand = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const outputPath = path.resolve(process.cwd(), ".tmp", "request-performance-audit.json");

const main = (): void => {
  execSync(`${pnpmCommand} exec vitest run tests/integration`, {
    cwd: process.cwd(),
    env: {
      ...process.env,
      RUN_DESTRUCTIVE_INTEGRATION_TESTS: "true",
      REQUEST_PERF_AUDIT_ENABLED: "true",
      REQUEST_PERF_AUDIT_OUTPUT_PATH: outputPath
    },
    stdio: "inherit"
  });

  if (!existsSync(outputPath)) {
    throw new Error(`Performance audit output not found: ${outputPath}`);
  }

  const report = JSON.parse(
    readFileSync(outputPath, "utf8")
  ) as RequestPerformanceAuditReport;

  const topRoutes = report.routes.slice(0, 15);
  const slowestRequests = report.slowestRequests.slice(0, 10);

  console.log("");
  console.log("Endpoint performance audit summary");
  console.log(`- Output: ${outputPath}`);
  console.log(`- Requests: ${report.requestCount}`);
  console.log(`- Unique routes: ${report.uniqueRouteCount}`);
  console.log("");
  console.log("Slowest routes by p95:");

  for (const route of topRoutes) {
    console.log(
      `- ${route.method} ${route.routePattern}: p95=${route.p95DurationInMs}ms avg=${route.avgDurationInMs}ms max=${route.maxDurationInMs}ms count=${route.requestCount} non2xx=${route.non2xxCount}`
    );
  }

  console.log("");
  console.log("Slowest individual requests:");

  for (const sample of slowestRequests) {
    console.log(
      `- ${sample.method} ${sample.originalPath}: ${sample.durationInMs}ms status=${sample.statusCode}`
    );
  }
};

main();
