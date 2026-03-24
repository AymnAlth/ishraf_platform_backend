import { describe, expect, it } from "vitest";

import {
  createUserSchema,
  updateUserSchema,
  updateUserStatusSchema
} from "../../src/modules/users/validator/users.validator";

describe("users.validator", () => {
  it("accepts admin creation without profile", () => {
    const result = createUserSchema.safeParse({
      fullName: "System Admin",
      email: "ADMIN@ESHRAF.LOCAL",
      password: "StrongPass123",
      role: "admin"
    });

    expect(result.success).toBe(true);

    if (result.success) {
      expect(result.data.email).toBe("admin@eshraf.local");
    }
  });

  it("rejects driver creation without license number", () => {
    const result = createUserSchema.safeParse({
      fullName: "Ali Driver",
      phone: "700000005",
      password: "StrongPass123",
      role: "driver",
      profile: {}
    });

    expect(result.success).toBe(false);
  });

  it("rejects empty user patch payloads", () => {
    const result = updateUserSchema.safeParse({});

    expect(result.success).toBe(false);
  });

  it("rejects status payloads without a boolean", () => {
    const result = updateUserStatusSchema.safeParse({
      isActive: "false"
    });

    expect(result.success).toBe(false);
  });
});
