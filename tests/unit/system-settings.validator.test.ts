import { describe, expect, it } from "vitest";

import { getSystemSettingsGroupPatchBodySchema } from "../../src/modules/system-settings/system-settings.registry";
import { systemSettingsAuditQuerySchema } from "../../src/modules/system-settings/validator/system-settings.validator";

describe("system-settings.validator", () => {
  it("accepts group-specific imports patch payloads", () => {
    const result = getSystemSettingsGroupPatchBodySchema("imports").safeParse({
      reason: "Freeze onboarding during rollout",
      values: {
        schoolOnboardingEnabled: false
      }
    });

    expect(result.success).toBe(true);
  });

  it("accepts transport maps patches that select etaProvider and derived estimation", () => {
    const result = getSystemSettingsGroupPatchBodySchema("transportMaps").safeParse({
      reason: "Use Mapbox with derived ETA enabled",
      values: {
        etaProvider: "mapbox",
        etaDerivedEstimateEnabled: true
      }
    });

    expect(result.success).toBe(true);
  });

  it("rejects invalid transport maps provider values", () => {
    const result = getSystemSettingsGroupPatchBodySchema("transportMaps").safeParse({
      reason: "Invalid provider",
      values: {
        etaProvider: "here"
      }
    });

    expect(result.success).toBe(false);
  });

  it("rejects wrong transport maps value types", () => {
    const result = getSystemSettingsGroupPatchBodySchema("transportMaps").safeParse({
      reason: "Invalid transport maps payload",
      values: {
        etaDerivedEstimateEnabled: "true"
      }
    });

    expect(result.success).toBe(false);
  });

  it("rejects unknown keys in group-specific patch payloads", () => {
    const result = getSystemSettingsGroupPatchBodySchema("imports").safeParse({
      reason: "Invalid patch",
      values: {
        unknownFlag: true
      }
    });

    expect(result.success).toBe(false);
  });

  it("rejects wrong value types in group-specific patch payloads", () => {
    const result = getSystemSettingsGroupPatchBodySchema("imports").safeParse({
      reason: "Invalid patch",
      values: {
        schoolOnboardingEnabled: "false"
      }
    });

    expect(result.success).toBe(false);
  });

  it("rejects empty patch values objects", () => {
    const result = getSystemSettingsGroupPatchBodySchema("analytics").safeParse({
      reason: "No values",
      values: {}
    });

    expect(result.success).toBe(false);
  });

  it("accepts analytics patches that select OpenAI primary and Groq fallback", () => {
    const result = getSystemSettingsGroupPatchBodySchema("analytics").safeParse({
      reason: "Enable AI analytics with primary and fallback providers",
      values: {
        aiAnalyticsEnabled: true,
        primaryProvider: "openai",
        fallbackProvider: "groq"
      }
    });

    expect(result.success).toBe(true);
  });

  it("accepts analytics patches that configure scheduled recompute controls", () => {
    const result = getSystemSettingsGroupPatchBodySchema("analytics").safeParse({
      reason: "Enable scheduled analytics dispatch",
      values: {
        scheduledRecomputeEnabled: true,
        scheduledRecomputeIntervalMinutes: 720,
        scheduledRecomputeMaxSubjectsPerTarget: 10,
        scheduledTargets: [
          "student_risk_summary",
          "admin_operational_digest",
          "student_risk_summary"
        ]
      }
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.values.scheduledTargets).toEqual([
        "student_risk_summary",
        "admin_operational_digest"
      ]);
    }
  });

  it("rejects analytics patches that reuse the same primary and fallback provider", () => {
    const result = getSystemSettingsGroupPatchBodySchema("analytics").safeParse({
      reason: "Invalid analytics provider chain",
      values: {
        primaryProvider: "openai",
        fallbackProvider: "openai"
      }
    });

    expect(result.success).toBe(false);
  });

  it("accepts ISO datetime filters with timezone offsets", () => {
    const result = systemSettingsAuditQuerySchema.safeParse({
      page: 1,
      limit: 20,
      since: "2026-04-07T10:00:00.000Z",
      until: "2026-04-07T13:30:00+03:00"
    });

    expect(result.success).toBe(true);
  });

  it("rejects non-ISO datetime filters", () => {
    const result = systemSettingsAuditQuerySchema.safeParse({
      page: 1,
      limit: 20,
      since: "2026-04-07 10:00:00",
      until: "2026-04-07T11:00:00.000Z"
    });

    expect(result.success).toBe(false);
  });

  it("rejects audit filters when until is earlier than since", () => {
    const result = systemSettingsAuditQuerySchema.safeParse({
      page: 1,
      limit: 20,
      since: "2026-04-07T10:00:00.000Z",
      until: "2026-04-07T09:00:00.000Z"
    });

    expect(result.success).toBe(false);
  });
});


