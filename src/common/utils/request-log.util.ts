const REDACTED_VALUE = "[REDACTED]";
const SENSITIVE_KEYS = new Set([
  "authorization",
  "password",
  "currentpassword",
  "newpassword",
  "accesstoken",
  "refreshtoken"
]);

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const sanitizeLogValue = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map((entry) => sanitizeLogValue(entry));
  }

  if (!isPlainObject(value)) {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, entryValue]) => [
      key,
      SENSITIVE_KEYS.has(key.toLowerCase())
        ? REDACTED_VALUE
        : sanitizeLogValue(entryValue)
    ])
  );
};

export const buildSafeRequestLog = (request: {
  body?: unknown;
  authorization?: string | null;
}) => ({
  requestBody: sanitizeLogValue(request.body),
  requestHeaders: sanitizeLogValue({
    authorization: request.authorization ?? undefined
  })
});
