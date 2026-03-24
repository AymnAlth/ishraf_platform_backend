import { describe, expect, it } from "vitest";

import {
  compareTokenHash,
  getAccessTokenExpiresInSeconds,
  hashToken,
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken
} from "../../src/common/utils/token.util";

describe("token.util", () => {
  it("signs and verifies an access token", () => {
    const token = signAccessToken({
      userId: "11111111-1111-4111-8111-111111111111",
      role: "admin",
      email: "admin@example.com",
      isActive: true
    });

    const payload = verifyAccessToken(token);

    expect(payload.sub).toBe("11111111-1111-4111-8111-111111111111");
    expect(payload.type).toBe("access");
    expect(payload.role).toBe("admin");
  });

  it("signs and verifies a refresh token", () => {
    const token = signRefreshToken({
      userId: "11111111-1111-4111-8111-111111111111"
    });

    const payload = verifyRefreshToken(token);

    expect(payload.sub).toBe("11111111-1111-4111-8111-111111111111");
    expect(payload.type).toBe("refresh");
    expect("sid" in payload).toBe(false);
  });

  it("issues distinct refresh tokens for the same user", () => {
    const firstToken = signRefreshToken({
      userId: "11111111-1111-4111-8111-111111111111"
    });
    const secondToken = signRefreshToken({
      userId: "11111111-1111-4111-8111-111111111111"
    });

    expect(firstToken).not.toBe(secondToken);
  });

  it("hashes opaque tokens consistently", () => {
    const token = "refresh-token-value";
    const tokenHash = hashToken(token);

    expect(compareTokenHash(token, tokenHash)).toBe(true);
    expect(compareTokenHash("other-token", tokenHash)).toBe(false);
  });

  it("exposes the access token expiry in seconds", () => {
    expect(getAccessTokenExpiresInSeconds()).toBe(900);
  });
});
