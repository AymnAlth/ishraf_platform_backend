import { z } from "zod";

const PLACEHOLDER_SECRET_PATTERNS = [
  /change[-_ ]?me/i,
  /local[-_ ]?dev/i,
  /test[-_ ]?access[-_ ]?secret/i,
  /test[-_ ]?refresh[-_ ]?secret/i,
  /replace[-_ ]?me/i,
  /^secret$/i
];

const trustProxySchema = z
  .union([z.enum(["true", "false"]), z.string().regex(/^\d+$/)])
  .default("false")
  .transform((value) => {
    if (value === "true") {
      return true;
    }

    if (value === "false") {
      return false;
    }

    return Number(value);
  });

const booleanStringSchema = z
  .union([z.boolean(), z.enum(["true", "false"])])
  .default(false)
  .transform((value) => (typeof value === "boolean" ? value : value === "true"));

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  APP_NAME: z.string().min(1).default("ishraf-platform-backend"),
  API_PREFIX: z.string().min(1).default("/api/v1"),
  DATABASE_URL: z.string().min(1),
  DATABASE_URL_MIGRATIONS: z.string().min(1).optional(),
  DATABASE_SCHEMA: z
    .string()
    .regex(/^[A-Za-z_][A-Za-z0-9_]*$/)
    .default("eshraf"),
  ACCESS_TOKEN_SECRET: z.string().min(1),
  ACCESS_TOKEN_TTL_MINUTES: z.coerce.number().int().positive().default(15),
  REFRESH_TOKEN_SECRET: z.string().min(1),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(7),
  PASSWORD_RESET_TOKEN_TTL_MINUTES: z.coerce.number().int().positive().default(30),
  CORS_ALLOWED_ORIGINS: z.string().default(""),
  TRUST_PROXY: trustProxySchema,
  REQUEST_BODY_LIMIT: z.string().min(1).default("1mb"),
  AUTH_LOGIN_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(5),
  AUTH_LOGIN_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(15 * 60 * 1000),
  AUTH_PASSWORD_RESET_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(5),
  AUTH_PASSWORD_RESET_RATE_LIMIT_WINDOW_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(15 * 60 * 1000),
  AUTH_EXPOSE_RESET_TOKEN_IN_RESPONSE: booleanStringSchema,
  BCRYPT_SALT_ROUNDS: z.coerce.number().int().min(10).max(15).default(12),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
    .default("info")
});

export type AppEnv = z.infer<typeof envSchema>;

const isWeakSecret = (value: string): boolean =>
  value.length < 32 ||
  PLACEHOLDER_SECRET_PATTERNS.some((pattern) => pattern.test(value));

const validateProductionSafety = (source: AppEnv): string[] => {
  if (source.NODE_ENV !== "production") {
    return [];
  }

  const issues: string[] = [];

  if (!source.CORS_ALLOWED_ORIGINS.trim()) {
    issues.push("CORS_ALLOWED_ORIGINS must be set in production");
  }

  if (source.AUTH_EXPOSE_RESET_TOKEN_IN_RESPONSE) {
    issues.push("AUTH_EXPOSE_RESET_TOKEN_IN_RESPONSE must be false in production");
  }

  if (isWeakSecret(source.ACCESS_TOKEN_SECRET)) {
    issues.push("ACCESS_TOKEN_SECRET must be at least 32 characters and non-placeholder in production");
  }

  if (isWeakSecret(source.REFRESH_TOKEN_SECRET)) {
    issues.push("REFRESH_TOKEN_SECRET must be at least 32 characters and non-placeholder in production");
  }

  if (source.ACCESS_TOKEN_SECRET === source.REFRESH_TOKEN_SECRET) {
    issues.push("ACCESS_TOKEN_SECRET and REFRESH_TOKEN_SECRET must not be identical in production");
  }

  return issues;
};

export const buildEnv = (source: NodeJS.ProcessEnv = process.env): AppEnv => {
  const parsed = envSchema.safeParse(source);

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `${issue.path.join(".") || "env"}: ${issue.message}`)
      .join(", ");

    throw new Error(`Invalid environment configuration: ${issues}`);
  }

  const productionIssues = validateProductionSafety(parsed.data);

  if (productionIssues.length > 0) {
    throw new Error(`Invalid environment configuration: ${productionIssues.join(", ")}`);
  }

  return parsed.data;
};

export const env = buildEnv();
