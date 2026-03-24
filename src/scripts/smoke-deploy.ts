import "dotenv/config";

import { z } from "zod";

const scriptEnvSchema = z.object({
  SMOKE_BASE_URL: z.url().optional(),
  PUBLIC_ROOT_URL: z.url().optional(),
  PUBLIC_API_BASE_URL: z.url().optional(),
  API_PREFIX: z.string().min(1).default("/api/v1"),
  SMOKE_ADMIN_EMAIL: z.string().trim().min(1).optional(),
  SMOKE_ADMIN_PASSWORD: z.string().min(1).optional()
});

const assertOk = async (response: Response, label: string): Promise<void> => {
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`${label} failed with status ${response.status}: ${body}`);
  }
};

const normalizeBaseUrl = (baseUrl: string): string => baseUrl.replace(/\/+$/, "");

const main = async (): Promise<void> => {
  const env = scriptEnvSchema.parse(process.env);
  const resolvedBaseUrl =
    env.SMOKE_BASE_URL ??
    env.PUBLIC_ROOT_URL ??
    (env.PUBLIC_API_BASE_URL
      ? env.PUBLIC_API_BASE_URL.replace(new RegExp(`${env.API_PREFIX.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/?$`), "")
      : undefined);

  if (!resolvedBaseUrl) {
    throw new Error(
      "SMOKE_BASE_URL is required unless PUBLIC_ROOT_URL or PUBLIC_API_BASE_URL is already set"
    );
  }

  const baseUrl = normalizeBaseUrl(resolvedBaseUrl);

  const healthResponse = await fetch(`${baseUrl}/health`);
  await assertOk(healthResponse, "GET /health");

  const readinessResponse = await fetch(`${baseUrl}/health/ready`);
  await assertOk(readinessResponse, "GET /health/ready");

  console.log("Health and readiness checks passed.");

  if (!env.SMOKE_ADMIN_EMAIL || !env.SMOKE_ADMIN_PASSWORD) {
    console.log("Skipping login smoke test because SMOKE_ADMIN_EMAIL or SMOKE_ADMIN_PASSWORD is missing.");
    return;
  }

  const loginResponse = await fetch(`${baseUrl}${env.API_PREFIX}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      identifier: env.SMOKE_ADMIN_EMAIL,
      password: env.SMOKE_ADMIN_PASSWORD
    })
  });

  await assertOk(loginResponse, "POST /auth/login");
  console.log("Login smoke test passed.");
};

if (require.main === module) {
  void main().catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
}
