import { describe, expect, it } from "vitest";

import {
  createBehaviorCategorySchema,
  createBehaviorRecordSchema,
  listBehaviorRecordsQuerySchema,
  updateBehaviorRecordSchema
} from "../../src/modules/behavior/validator/behavior.validator";

describe("behavior.validator", () => {
  it("accepts behavior category payloads", () => {
    const result = createBehaviorCategorySchema.safeParse({
      code: "respect",
      name: "Respect",
      behaviorType: "positive",
      defaultSeverity: 1,
      isActive: true
    });

    expect(result.success).toBe(true);
  });

  it("accepts behavior record payloads and normalizes identifiers", () => {
    const result = createBehaviorRecordSchema.safeParse({
      studentId: 1,
      behaviorCategoryId: "5",
      academicYearId: 1,
      semesterId: "2",
      behaviorDate: "2026-03-10",
      severity: "3"
    });

    expect(result.success).toBe(true);

    if (result.success) {
      expect(result.data.studentId).toBe("1");
      expect(result.data.behaviorCategoryId).toBe("5");
      expect(result.data.severity).toBe(3);
    }
  });

  it("rejects invalid behavior record date ranges", () => {
    const result = listBehaviorRecordsQuerySchema.safeParse({
      dateFrom: "2026-03-20",
      dateTo: "2026-03-19"
    });

    expect(result.success).toBe(false);
  });

  it("rejects empty behavior updates", () => {
    const result = updateBehaviorRecordSchema.safeParse({});

    expect(result.success).toBe(false);
  });
});
