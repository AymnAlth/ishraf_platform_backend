import { describe, expect, it } from "vitest";

import { buildSafeRequestLog } from "../../src/common/utils/request-log.util";

describe("request-log sanitization", () => {
  it("redacts passwords and tokens from request logs", () => {
    const result = buildSafeRequestLog({
      authorization: "Bearer jwt-access-token",
      body: {
        identifier: "teacher1@eshraf.local",
        password: "123456",
        nested: {
          currentPassword: "123456",
          newPassword: "newStrongPass123",
          tokens: {
            accessToken: "jwt-access-token",
            refreshToken: "jwt-refresh-token"
          }
        }
      }
    });

    expect(result.requestHeaders).toEqual({
      authorization: "[REDACTED]"
    });
    expect(result.requestBody).toEqual({
      identifier: "teacher1@eshraf.local",
      password: "[REDACTED]",
      nested: {
        currentPassword: "[REDACTED]",
        newPassword: "[REDACTED]",
        tokens: {
          accessToken: "[REDACTED]",
          refreshToken: "[REDACTED]"
        }
      }
    });
  });
});
