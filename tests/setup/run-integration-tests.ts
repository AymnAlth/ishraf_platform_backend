import { execSync } from "node:child_process";

import { loadTestEnvironment } from "./test-db";

const pnpmCommand = process.platform === "win32" ? "pnpm.cmd" : "pnpm";

const main = (): void => {
  loadTestEnvironment();
  process.env.RUN_DESTRUCTIVE_INTEGRATION_TESTS = "true";

  execSync(`${pnpmCommand} exec vitest run tests/integration`, {
    cwd: process.cwd(),
    env: process.env,
    stdio: "inherit"
  });
};

main();
