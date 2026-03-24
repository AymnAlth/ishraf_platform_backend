import { describe, expect, it } from "vitest";

import {
  toCurrentUserResponseDto,
  toLoginResponseDto,
  toRefreshTokenResponseDto
} from "../../src/modules/auth/mapper/auth.mapper";
import type { AuthUserRow } from "../../src/modules/auth/types/auth.types";

const userRow: AuthUserRow = {
  id: "11111111-1111-4111-8111-111111111111",
  fullName: "Sara Teacher",
  email: "teacher1@eshraf.local",
  phone: "700000003",
  passwordHash: "hashed-password",
  role: "teacher",
  isActive: true,
  lastLoginAt: new Date("2026-03-13T10:00:00.000Z")
};

describe("auth.mapper", () => {
  it("maps login responses with nested tokens", () => {
    const response = toLoginResponseDto(
      userRow,
      "jwt-access-token",
      "jwt-refresh-token",
      900
    );

    expect(response).toEqual({
      user: {
        id: userRow.id,
        fullName: userRow.fullName,
        email: userRow.email,
        phone: userRow.phone,
        role: userRow.role,
        isActive: true
      },
      tokens: {
        accessToken: "jwt-access-token",
        refreshToken: "jwt-refresh-token",
        expiresIn: 900
      }
    });
  });

  it("maps refresh responses", () => {
    expect(
      toRefreshTokenResponseDto("new-access-token", "new-refresh-token", 900)
    ).toEqual({
      accessToken: "new-access-token",
      refreshToken: "new-refresh-token",
      expiresIn: 900
    });
  });

  it("maps current-user responses with lastLoginAt", () => {
    expect(toCurrentUserResponseDto(userRow)).toEqual({
      id: userRow.id,
      fullName: userRow.fullName,
      email: userRow.email,
      phone: userRow.phone,
      role: userRow.role,
      isActive: true,
      lastLoginAt: "2026-03-13T10:00:00.000Z"
    });
  });
});
