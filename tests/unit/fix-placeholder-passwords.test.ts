import bcrypt from "bcrypt";
import { describe, expect, it, vi } from "vitest";

import {
  getPlaceholderPasswordMarker,
  updatePlaceholderPasswords
} from "../../src/scripts/fix-placeholder-passwords";

describe("fix-placeholder-passwords", () => {
  it("updates only hashes that match the placeholder marker pattern", async () => {
    const query = vi.fn().mockResolvedValue({
      rows: [
        {
          id: "1",
          email: "admin@eshraf.local",
          phone: "700000001"
        }
      ]
    });

    vi.spyOn(bcrypt, "hash").mockResolvedValue("hashed-password");

    const rows = await updatePlaceholderPasswords(
      {
        query
      },
      {
        schema: "eshraf",
        temporaryPassword: "ChangeMe123!",
        saltRounds: 12
      }
    );

    expect(rows).toHaveLength(1);
    expect(query).toHaveBeenCalledOnce();
    expect(query.mock.calls[0][0]).toContain("UPDATE eshraf.users");
    expect(query.mock.calls[0][1]).toEqual([
      "hashed-password",
      `%${getPlaceholderPasswordMarker()}%`
    ]);
  });
});
