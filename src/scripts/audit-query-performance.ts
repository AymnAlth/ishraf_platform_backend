import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

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
  routes: QueryPerformanceRouteSummaryRow[];
}

const pnpmCommand = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const outputPath = path.resolve(process.cwd(), ".tmp", "query-performance-audit.json");

const main = (): void => {
  execSync(`${pnpmCommand} exec vitest run tests/integration`, {
    cwd: process.cwd(),
    env: {
      ...process.env,
      RUN_DESTRUCTIVE_INTEGRATION_TESTS: "true",
      QUERY_PERF_AUDIT_ENABLED: "true",
      QUERY_PERF_AUDIT_OUTPUT_PATH: outputPath
    },
    stdio: "inherit"
  });

  if (!existsSync(outputPath)) {
    throw new Error(`Query performance audit output not found: ${outputPath}`);
  }

  const report = JSON.parse(readFileSync(outputPath, "utf8")) as QueryPerformanceAuditReport;
  const topRoutes = report.routes.slice(0, 10);

  console.log("");
  console.log("Query performance audit summary");
  console.log(`- Output: ${outputPath}`);
  console.log(`- Queries: ${report.queryCount}`);
  console.log(`- Unique statements: ${report.uniqueStatementCount}`);
  console.log("");
  console.log("Slowest routes by total SQL time:");

  for (const route of topRoutes) {
    console.log(
      `- ${route.method} ${route.routePattern}: total=${route.totalDurationInMs}ms avg=${route.avgDurationInMs}ms p95=${route.p95DurationInMs}ms max=${route.maxDurationInMs}ms queries=${route.queryCount}`
    );

    for (const query of route.topQueries.slice(0, 3)) {
      console.log(
        `  * total=${query.totalDurationInMs}ms avg=${query.avgDurationInMs}ms count=${query.queryCount} sql=${query.normalizedSql}`
      );
    }
  }
};

main();
