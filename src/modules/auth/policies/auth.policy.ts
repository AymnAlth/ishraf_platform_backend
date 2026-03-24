import {
  authenticate,
  authorize,
  requireActiveUser
} from "../../../common/middlewares/auth.middleware";
import { TooManyRequestsError } from "../../../common/errors/too-many-requests-error";
import { env } from "../../../config/env";

type AttemptStore = Map<string, number[]>;

const loginAttempts = new Map<string, number[]>();
const forgotPasswordAttempts = new Map<string, number[]>();
const resetPasswordAttempts = new Map<string, number[]>();

const normalizeIdentifier = (identifier: string): string => identifier.trim().toLowerCase();
const normalizeIpAddress = (ipAddress: string | null): string => ipAddress?.trim() || "unknown";

const getFreshAttempts = (key: string, now = Date.now()): number[] => {
  const attempts = loginAttempts.get(key) ?? [];
  const freshAttempts = attempts.filter(
    (attemptTimestamp) => now - attemptTimestamp < env.AUTH_LOGIN_RATE_LIMIT_WINDOW_MS
  );

  if (freshAttempts.length === 0) {
    loginAttempts.delete(key);
    return [];
  }

  loginAttempts.set(key, freshAttempts);
  return freshAttempts;
};

const getFreshAttemptsForStore = (
  store: AttemptStore,
  key: string,
  windowMs: number,
  now = Date.now()
): number[] => {
  const attempts = store.get(key) ?? [];
  const freshAttempts = attempts.filter(
    (attemptTimestamp) => now - attemptTimestamp < windowMs
  );

  if (freshAttempts.length === 0) {
    store.delete(key);
    return [];
  }

  store.set(key, freshAttempts);
  return freshAttempts;
};

export const buildLoginRateLimitKey = (
  identifier: string,
  ipAddress: string | null
): string => `${normalizeIpAddress(ipAddress)}:${normalizeIdentifier(identifier)}`;

export const buildForgotPasswordRateLimitKey = buildLoginRateLimitKey;

export const buildResetPasswordRateLimitKey = (ipAddress: string | null): string =>
  `${normalizeIpAddress(ipAddress)}:password-reset`;

export const assertLoginAttemptAllowed = (key: string, now = Date.now()): void => {
  if (getFreshAttempts(key, now).length >= env.AUTH_LOGIN_RATE_LIMIT_MAX) {
    throw new TooManyRequestsError(
      "Too many login attempts. Please try again later."
    );
  }
};

export const registerFailedLoginAttempt = (key: string, now = Date.now()): void => {
  const attempts = getFreshAttempts(key, now);
  attempts.push(now);
  loginAttempts.set(key, attempts);
};

const assertAttemptAllowed = (
  store: AttemptStore,
  key: string,
  maxAttempts: number,
  windowMs: number,
  message: string,
  now = Date.now()
): void => {
  if (getFreshAttemptsForStore(store, key, windowMs, now).length >= maxAttempts) {
    throw new TooManyRequestsError(message);
  }
};

const registerAttempt = (
  store: AttemptStore,
  key: string,
  windowMs: number,
  now = Date.now()
): void => {
  const attempts = getFreshAttemptsForStore(store, key, windowMs, now);
  attempts.push(now);
  store.set(key, attempts);
};

export const assertForgotPasswordAttemptAllowed = (
  key: string,
  now = Date.now()
): void => {
  assertAttemptAllowed(
    forgotPasswordAttempts,
    key,
    env.AUTH_PASSWORD_RESET_RATE_LIMIT_MAX,
    env.AUTH_PASSWORD_RESET_RATE_LIMIT_WINDOW_MS,
    "Too many password reset requests. Please try again later.",
    now
  );
};

export const registerForgotPasswordAttempt = (key: string, now = Date.now()): void => {
  registerAttempt(
    forgotPasswordAttempts,
    key,
    env.AUTH_PASSWORD_RESET_RATE_LIMIT_WINDOW_MS,
    now
  );
};

export const assertResetPasswordAttemptAllowed = (
  key: string,
  now = Date.now()
): void => {
  assertAttemptAllowed(
    resetPasswordAttempts,
    key,
    env.AUTH_PASSWORD_RESET_RATE_LIMIT_MAX,
    env.AUTH_PASSWORD_RESET_RATE_LIMIT_WINDOW_MS,
    "Too many password reset requests. Please try again later.",
    now
  );
};

export const registerResetPasswordAttempt = (key: string, now = Date.now()): void => {
  registerAttempt(
    resetPasswordAttempts,
    key,
    env.AUTH_PASSWORD_RESET_RATE_LIMIT_WINDOW_MS,
    now
  );
};

export const clearLoginAttempts = (key: string): void => {
  loginAttempts.delete(key);
};

export const resetLoginRateLimiter = (): void => {
  loginAttempts.clear();
};

export const resetAuthRateLimiters = (): void => {
  loginAttempts.clear();
  forgotPasswordAttempts.clear();
  resetPasswordAttempts.clear();
};

export const authPolicies = {
  authenticated: [authenticate],
  activeUser: [authenticate, requireActiveUser],
  adminOnly: [authenticate, requireActiveUser, authorize("admin")]
} as const;
