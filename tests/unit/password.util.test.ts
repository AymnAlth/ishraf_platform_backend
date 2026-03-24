import { describe, expect, it } from "vitest";

import { comparePassword, hashPassword } from "../../src/common/utils/password.util";

describe("password.util", () => {
  it("hashes and verifies passwords", async () => {
    const plainPassword = "Password123!";
    const passwordHash = await hashPassword(plainPassword);

    expect(passwordHash).not.toBe(plainPassword);
    await expect(comparePassword(plainPassword, passwordHash)).resolves.toBe(true);
    await expect(comparePassword("wrong-password", passwordHash)).resolves.toBe(false);
  });
});
