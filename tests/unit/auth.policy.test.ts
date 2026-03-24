import { describe, expect, it } from "vitest";

import { TooManyRequestsError } from "../../src/common/errors/too-many-requests-error";
import {
  assertForgotPasswordAttemptAllowed,
  assertLoginAttemptAllowed,
  assertResetPasswordAttemptAllowed,
  buildForgotPasswordRateLimitKey,
  buildLoginRateLimitKey,
  buildResetPasswordRateLimitKey,
  clearLoginAttempts,
  registerForgotPasswordAttempt,
  registerFailedLoginAttempt,
  registerResetPasswordAttempt,
  resetAuthRateLimiters
} from "../../src/modules/auth/policies/auth.policy";

describe("auth.policy login rate limiting", () => {
  it("blocks the sixth failed attempt within fifteen minutes", () => {
    resetAuthRateLimiters();
    const now = Date.now();
    const key = buildLoginRateLimitKey("teacher1@eshraf.local", "127.0.0.1");

    for (let attempt = 0; attempt < 5; attempt += 1) {
      registerFailedLoginAttempt(key, now + attempt);
    }

    expect(() => assertLoginAttemptAllowed(key, now + 10)).toThrow(
      TooManyRequestsError
    );
  });

  it("allows attempts again after the rate-limit window passes", () => {
    resetAuthRateLimiters();
    const now = Date.now();
    const key = buildLoginRateLimitKey("teacher1@eshraf.local", "127.0.0.1");

    for (let attempt = 0; attempt < 5; attempt += 1) {
      registerFailedLoginAttempt(key, now + attempt);
    }

    expect(() => assertLoginAttemptAllowed(key, now + 15 * 60 * 1000 + 1)).not.toThrow();
  });

  it("clears stored attempts after a successful login", () => {
    resetAuthRateLimiters();
    const key = buildLoginRateLimitKey("teacher1@eshraf.local", "127.0.0.1");

    registerFailedLoginAttempt(key, Date.now());
    clearLoginAttempts(key);

    expect(() => assertLoginAttemptAllowed(key, Date.now())).not.toThrow();
  });
});

describe("auth.policy password reset rate limiting", () => {
  it("blocks forgot-password requests after the configured limit", () => {
    resetAuthRateLimiters();
    const now = Date.now();
    const key = buildForgotPasswordRateLimitKey("parent1@eshraf.local", "127.0.0.1");

    for (let attempt = 0; attempt < 5; attempt += 1) {
      registerForgotPasswordAttempt(key, now + attempt);
    }

    expect(() => assertForgotPasswordAttemptAllowed(key, now + 10)).toThrow(
      TooManyRequestsError
    );
  });

  it("blocks reset-password requests after the configured limit", () => {
    resetAuthRateLimiters();
    const now = Date.now();
    const key = buildResetPasswordRateLimitKey("127.0.0.1");

    for (let attempt = 0; attempt < 5; attempt += 1) {
      registerResetPasswordAttempt(key, now + attempt);
    }

    expect(() => assertResetPasswordAttemptAllowed(key, now + 10)).toThrow(
      TooManyRequestsError
    );
  });
});
