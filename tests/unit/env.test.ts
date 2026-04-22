import { describe, expect, it } from "vitest";

import { buildEnv } from "../../src/config/env";

const createValidEnv = (overrides: Record<string, string> = {}): NodeJS.ProcessEnv => ({
  NODE_ENV: "test",
  PORT: "4001",
  APP_NAME: "ishraf-platform-backend",
  API_PREFIX: "/api/v1",
  PUBLIC_ROOT_URL: "https://ishraf-platform-backend-staging.onrender.com",
  PUBLIC_API_BASE_URL: "https://ishraf-platform-backend-staging.onrender.com/api/v1",
  DATABASE_URL: "postgresql://localhost:5432/test_db",
  DATABASE_URL_MIGRATIONS: "postgresql://localhost:5432/test_db_direct",
  DATABASE_SCHEMA: "public",
  ACCESS_TOKEN_SECRET: "access-secret",
  ACCESS_TOKEN_TTL_MINUTES: "15",
  REFRESH_TOKEN_SECRET: "refresh-secret",
  REFRESH_TOKEN_TTL_DAYS: "7",
  PASSWORD_RESET_TOKEN_TTL_MINUTES: "30",
  CORS_ALLOWED_ORIGINS: "http://localhost:3000,http://localhost:5173",
  TRUST_PROXY: "false",
  REQUEST_BODY_LIMIT: "1mb",
  AUTH_LOGIN_RATE_LIMIT_MAX: "5",
  AUTH_LOGIN_RATE_LIMIT_WINDOW_MS: "900000",
  AUTH_PASSWORD_RESET_RATE_LIMIT_MAX: "5",
  AUTH_PASSWORD_RESET_RATE_LIMIT_WINDOW_MS: "900000",
  AUTH_EXPOSE_RESET_TOKEN_IN_RESPONSE: "true",
  BCRYPT_SALT_ROUNDS: "10",
  FIREBASE_PROJECT_ID: "",
  FIREBASE_CLIENT_EMAIL: "",
  FIREBASE_PRIVATE_KEY: "",
  FIREBASE_DATABASE_URL: "",
  OPENAI_API_KEY: "",
  OPENAI_API_MODEL: "gpt-5-mini",
  OPENAI_API_TIMEOUT_MS: "15000",
  GROQ_API_KEY: "",
  GROQ_API_MODEL: "openai/gpt-oss-20b",
  GROQ_API_TIMEOUT_MS: "15000",
  MAPBOX_API_KEY: "",
  MAPBOX_API_TIMEOUT_MS: "4000",
  GOOGLE_MAPS_API_KEY: "",
  GOOGLE_MAPS_API_TIMEOUT_MS: "4000",
  LOG_LEVEL: "silent",
  ...overrides
});

describe("buildEnv", () => {
  it("parses a valid environment object", () => {
    const env = buildEnv(createValidEnv());

    expect(env.PORT).toBe(4001);
    expect(env.NODE_ENV).toBe("test");
    expect(env.DATABASE_SCHEMA).toBe("public");
    expect(env.REFRESH_TOKEN_TTL_DAYS).toBe(7);
    expect(env.BCRYPT_SALT_ROUNDS).toBe(10);
    expect(env.TRUST_PROXY).toBe(false);
    expect(env.PUBLIC_ROOT_URL).toBe("https://ishraf-platform-backend-staging.onrender.com");
    expect(env.OPENAI_API_KEY).toBeUndefined();
    expect(env.GROQ_API_KEY).toBeUndefined();
    expect(env.OPENAI_API_MODEL).toBe("gpt-5-mini");
    expect(env.GROQ_API_MODEL).toBe("openai/gpt-oss-20b");
    expect(env.MAPBOX_API_KEY).toBeUndefined();
    expect(env.GOOGLE_MAPS_API_KEY).toBeUndefined();
  });

  it("accepts blank AI and maps provider keys with explicit timeout overrides", () => {
    const env = buildEnv(
      createValidEnv({
        OPENAI_API_KEY: "",
        OPENAI_API_TIMEOUT_MS: "12000",
        GROQ_API_KEY: "",
        GROQ_API_TIMEOUT_MS: "9000",
        MAPBOX_API_KEY: "",
        MAPBOX_API_TIMEOUT_MS: "4500",
        GOOGLE_MAPS_API_KEY: ""
      })
    );

    expect(env.OPENAI_API_KEY).toBeUndefined();
    expect(env.GROQ_API_KEY).toBeUndefined();
    expect(env.OPENAI_API_TIMEOUT_MS).toBe(12000);
    expect(env.GROQ_API_TIMEOUT_MS).toBe(9000);
    expect(env.MAPBOX_API_KEY).toBeUndefined();
    expect(env.GOOGLE_MAPS_API_KEY).toBeUndefined();
    expect(env.MAPBOX_API_TIMEOUT_MS).toBe(4500);
    expect(env.GOOGLE_MAPS_API_TIMEOUT_MS).toBe(4000);
  });

  it("throws when required values are missing", () => {
    expect(() =>
      buildEnv({
        NODE_ENV: "test"
      })
    ).toThrow(/Invalid environment configuration/i);
  });

  it("rejects bcrypt rounds below the security minimum", () => {
    expect(() => buildEnv(createValidEnv({ BCRYPT_SALT_ROUNDS: "9" }))).toThrow(
      /Invalid environment configuration/i
    );
  });

  it("rejects weak placeholder secrets in production", () => {
    expect(() =>
      buildEnv(
        createValidEnv({
          NODE_ENV: "production",
          PORT: "4000",
          DATABASE_URL: "postgresql://localhost:5432/prod_db",
          ACCESS_TOKEN_SECRET: "change-me-access-secret-at-least-32-characters",
          REFRESH_TOKEN_SECRET: "change-me-refresh-secret-at-least-32-characters",
          CORS_ALLOWED_ORIGINS: "https://frontend.example.com",
          TRUST_PROXY: "true",
          AUTH_EXPOSE_RESET_TOKEN_IN_RESPONSE: "false",
          BCRYPT_SALT_ROUNDS: "12",
          LOG_LEVEL: "info"
        })
      )
    ).toThrow(/ACCESS_TOKEN_SECRET/i);
  });

  it("rejects exposing reset tokens in production", () => {
    expect(() =>
      buildEnv(
        createValidEnv({
          NODE_ENV: "production",
          PORT: "4000",
          DATABASE_URL: "postgresql://localhost:5432/prod_db",
          ACCESS_TOKEN_SECRET: "production-access-secret-that-is-over-32-chars",
          REFRESH_TOKEN_SECRET: "production-refresh-secret-that-is-over-32-chars",
          CORS_ALLOWED_ORIGINS: "https://frontend.example.com",
          TRUST_PROXY: "true",
          AUTH_EXPOSE_RESET_TOKEN_IN_RESPONSE: "true",
          BCRYPT_SALT_ROUNDS: "12",
          LOG_LEVEL: "info"
        })
      )
    ).toThrow(/AUTH_EXPOSE_RESET_TOKEN_IN_RESPONSE/i);
  });

  it("rejects mismatched public API URLs in production", () => {
    expect(() =>
      buildEnv(
        createValidEnv({
          NODE_ENV: "production",
          PORT: "4000",
          PUBLIC_ROOT_URL: "https://ishraf-platform-backend-staging.onrender.com",
          PUBLIC_API_BASE_URL: "https://ishraf-platform-backend-staging.onrender.com/backend",
          DATABASE_URL: "postgresql://localhost:5432/prod_db",
          ACCESS_TOKEN_SECRET: "production-access-secret-that-is-over-32-chars",
          REFRESH_TOKEN_SECRET: "production-refresh-secret-that-is-over-32-chars",
          CORS_ALLOWED_ORIGINS: "https://frontend.example.com",
          TRUST_PROXY: "true",
          AUTH_EXPOSE_RESET_TOKEN_IN_RESPONSE: "false",
          BCRYPT_SALT_ROUNDS: "12",
          LOG_LEVEL: "info"
        })
      )
    ).toThrow(/PUBLIC_API_BASE_URL/i);
  });
});
