import { describe, expect, it } from "vitest";

import {
  createStudentSchema,
  linkStudentParentSchema,
  promoteStudentSchema,
  updateStudentSchema
} from "../../src/modules/students/validator/students.validator";

describe("students.validator", () => {
  it("accepts numeric ids and normalizes them to strings", () => {
    const createResult = createStudentSchema.safeParse({
      academicNo: "STU-1001",
      fullName: "Student One",
      dateOfBirth: "2016-09-01",
      gender: "male",
      classId: 1
    });
    const linkResult = linkStudentParentSchema.safeParse({
      parentId: "2",
      relationType: "father",
      isPrimary: true
    });
    const promoteResult = promoteStudentSchema.safeParse({
      toClassId: 4,
      academicYearId: "1"
    });

    expect(createResult.success).toBe(true);
    expect(linkResult.success).toBe(true);
    expect(promoteResult.success).toBe(true);

    if (createResult.success && linkResult.success && promoteResult.success) {
      expect(createResult.data.classId).toBe("1");
      expect(linkResult.data.parentId).toBe("2");
      expect(promoteResult.data.toClassId).toBe("4");
    }
  });

  it("rejects update payloads that try to change class or enrollment date", () => {
    const result = updateStudentSchema.safeParse({
      classId: "3",
      enrollmentDate: "2026-03-13"
    });

    expect(result.success).toBe(false);
  });

  it("rejects empty update payloads", () => {
    const result = updateStudentSchema.safeParse({});

    expect(result.success).toBe(false);
  });
});
