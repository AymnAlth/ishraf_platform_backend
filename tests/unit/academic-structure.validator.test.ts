import { describe, expect, it } from "vitest";

import {
  createClassSchema,
  createSemesterSchema,
  updateAcademicYearSchema
} from "../../src/modules/academic-structure/validator/academic-structure.validator";

describe("academic-structure.validator", () => {
  it("accepts numeric ids and normalizes them to strings", () => {
    const result = createClassSchema.safeParse({
      gradeLevelId: 1,
      academicYearId: "2",
      className: "A",
      section: "A",
      capacity: 30
    });

    expect(result.success).toBe(true);

    if (result.success) {
      expect(result.data.gradeLevelId).toBe("1");
      expect(result.data.academicYearId).toBe("2");
    }
  });

  it("rejects reversed semester dates", () => {
    const result = createSemesterSchema.safeParse({
      name: "Semester 1",
      startDate: "2026-01-01",
      endDate: "2025-12-31"
    });

    expect(result.success).toBe(false);
  });

  it("rejects empty academic year patches", () => {
    const result = updateAcademicYearSchema.safeParse({});

    expect(result.success).toBe(false);
  });
});
