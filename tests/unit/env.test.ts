import { describe, expect, it } from "vitest";

import { buildEnv } from "../../src/config/env";

describe("buildEnv", () => {
  it("parses a valid environment object", () => {
    const env = buildEnv({
      NODE_ENV: "test",
      PORT: "4001",
      APP_NAME: "ishraf-platform-backend",
      API_PREFIX: "/api/v1",
      DATABASE_URL: "postgresql://localhost:5432/test_db",
      DATABASE_URL_MIGRATIONS: "postgresql://localhost:5432/test_db_direct",
      DATABASE_SCHEMA: "eshraf",
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
      LOG_LEVEL: "silent"
    });

    expect(env.PORT).toBe(4001);
    expect(env.NODE_ENV).toBe("test");
    expect(env.DATABASE_SCHEMA).toBe("eshraf");
    expect(env.REFRESH_TOKEN_TTL_DAYS).toBe(7);
    expect(env.BCRYPT_SALT_ROUNDS).toBe(10);
    expect(env.TRUST_PROXY).toBe(false);
  });

  it("throws when required values are missing", () => {
    expect(() =>
      buildEnv({
        NODE_ENV: "test"
      })
    ).toThrow(/Invalid environment configuration/i);
  });

  it("rejects bcrypt rounds below the security minimum", () => {
    expect(() =>
      buildEnv({
        NODE_ENV: "test",
        PORT: "4001",
        APP_NAME: "ishraf-platform-backend",
        API_PREFIX: "/api/v1",
        DATABASE_URL: "postgresql://localhost:5432/test_db",
        DATABASE_SCHEMA: "eshraf",
        ACCESS_TOKEN_SECRET: "access-secret",
        ACCESS_TOKEN_TTL_MINUTES: "15",
        REFRESH_TOKEN_SECRET: "refresh-secret",
        REFRESH_TOKEN_TTL_DAYS: "7",
        PASSWORD_RESET_TOKEN_TTL_MINUTES: "30",
        CORS_ALLOWED_ORIGINS: "http://localhost:3000",
        TRUST_PROXY: "false",
        REQUEST_BODY_LIMIT: "1mb",
        AUTH_LOGIN_RATE_LIMIT_MAX: "5",
        AUTH_LOGIN_RATE_LIMIT_WINDOW_MS: "900000",
        AUTH_PASSWORD_RESET_RATE_LIMIT_MAX: "5",
        AUTH_PASSWORD_RESET_RATE_LIMIT_WINDOW_MS: "900000",
        AUTH_EXPOSE_RESET_TOKEN_IN_RESPONSE: "false",
        BCRYPT_SALT_ROUNDS: "9",
        LOG_LEVEL: "silent"
      })
    ).toThrow(/Invalid environment configuration/i);
  });

  it("rejects weak placeholder secrets in production", () => {
    expect(() =>
      buildEnv({
        NODE_ENV: "production",
        PORT: "4000",
        APP_NAME: "ishraf-platform-backend",
        API_PREFIX: "/api/v1",
        DATABASE_URL: "postgresql://localhost:5432/prod_db",
        DATABASE_SCHEMA: "public",
        ACCESS_TOKEN_SECRET: "change-me-access-secret-at-least-32-characters",
        ACCESS_TOKEN_TTL_MINUTES: "15",
        REFRESH_TOKEN_SECRET: "change-me-refresh-secret-at-least-32-characters",
        REFRESH_TOKEN_TTL_DAYS: "7",
        PASSWORD_RESET_TOKEN_TTL_MINUTES: "30",
        CORS_ALLOWED_ORIGINS: "https://frontend.example.com",
        TRUST_PROXY: "true",
        REQUEST_BODY_LIMIT: "1mb",
        AUTH_LOGIN_RATE_LIMIT_MAX: "5",
        AUTH_LOGIN_RATE_LIMIT_WINDOW_MS: "900000",
        AUTH_PASSWORD_RESET_RATE_LIMIT_MAX: "5",
        AUTH_PASSWORD_RESET_RATE_LIMIT_WINDOW_MS: "900000",
        AUTH_EXPOSE_RESET_TOKEN_IN_RESPONSE: "false",
        BCRYPT_SALT_ROUNDS: "12",
        LOG_LEVEL: "info"
      })
    ).toThrow(/ACCESS_TOKEN_SECRET/i);
  });

  it("rejects exposing reset tokens in production", () => {
    expect(() =>
      buildEnv({
        NODE_ENV: "production",
        PORT: "4000",
        APP_NAME: "ishraf-platform-backend",
        API_PREFIX: "/api/v1",
        DATABASE_URL: "postgresql://localhost:5432/prod_db",
        DATABASE_SCHEMA: "public",
        ACCESS_TOKEN_SECRET: "production-access-secret-that-is-over-32-chars",
        ACCESS_TOKEN_TTL_MINUTES: "15",
        REFRESH_TOKEN_SECRET: "production-refresh-secret-that-is-over-32-chars",
        REFRESH_TOKEN_TTL_DAYS: "7",
        PASSWORD_RESET_TOKEN_TTL_MINUTES: "30",
        CORS_ALLOWED_ORIGINS: "https://frontend.example.com",
        TRUST_PROXY: "true",
        REQUEST_BODY_LIMIT: "1mb",
        AUTH_LOGIN_RATE_LIMIT_MAX: "5",
        AUTH_LOGIN_RATE_LIMIT_WINDOW_MS: "900000",
        AUTH_PASSWORD_RESET_RATE_LIMIT_MAX: "5",
        AUTH_PASSWORD_RESET_RATE_LIMIT_WINDOW_MS: "900000",
        AUTH_EXPOSE_RESET_TOKEN_IN_RESPONSE: "true",
        BCRYPT_SALT_ROUNDS: "12",
        LOG_LEVEL: "info"
      })
    ).toThrow(/AUTH_EXPOSE_RESET_TOKEN_IN_RESPONSE/i);
  });
});
