import { describe, expect, it, vi } from "vitest";

import { ForbiddenError } from "../../src/common/errors/forbidden-error";
import { buildCorsOptions, parseCorsAllowedOrigins } from "../../src/config/http";

describe("http config", () => {
  it("parses and trims comma-separated CORS origins", () => {
    expect(
      parseCorsAllowedOrigins(" http://localhost:3000,https://app.example.com , ,")
    ).toEqual(["http://localhost:3000", "https://app.example.com"]);
  });

  it("allows any browser origin in non-production when no allowlist is configured", () => {
    const options = buildCorsOptions({
      NODE_ENV: "development",
      CORS_ALLOWED_ORIGINS: ""
    });
    const callback = vi.fn();

    if (typeof options.origin !== "function") {
      throw new Error("Expected CORS origin handler to be a function");
    }

    options.origin("https://random.example.com", callback);

    expect(callback).toHaveBeenCalledWith(null, true);
  });

  it("blocks disallowed origins when an allowlist is configured", () => {
    const options = buildCorsOptions({
      NODE_ENV: "production",
      CORS_ALLOWED_ORIGINS: "https://frontend.example.com"
    });
    const callback = vi.fn();

    if (typeof options.origin !== "function") {
      throw new Error("Expected CORS origin handler to be a function");
    }

    options.origin("https://evil.example.com", callback);

    expect(callback.mock.calls[0]?.[0]).toBeInstanceOf(ForbiddenError);
  });
});
