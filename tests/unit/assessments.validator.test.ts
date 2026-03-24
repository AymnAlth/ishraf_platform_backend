import { describe, expect, it } from "vitest";

import {
  createAssessmentSchema,
  createAssessmentTypeSchema,
  listAssessmentsQuerySchema,
  saveAssessmentScoresSchema,
  updateStudentAssessmentSchema
} from "../../src/modules/assessments/validator/assessments.validator";

describe("assessments.validator", () => {
  it("accepts numeric identifiers and normalizes them to strings", () => {
    const result = createAssessmentSchema.safeParse({
      assessmentTypeId: 1,
      classId: "2",
      subjectId: 3,
      teacherId: "4",
      academicYearId: 1,
      semesterId: "2",
      title: "Monthly Exam",
      maxScore: "100",
      weight: "15.5",
      assessmentDate: "2026-03-01",
      isPublished: true
    });

    expect(result.success).toBe(true);

    if (result.success) {
      expect(result.data.assessmentTypeId).toBe("1");
      expect(result.data.classId).toBe("2");
      expect(result.data.subjectId).toBe("3");
      expect(result.data.teacherId).toBe("4");
      expect(result.data.maxScore).toBe(100);
      expect(result.data.weight).toBe(15.5);
    }
  });

  it("accepts create assessment type payloads", () => {
    const result = createAssessmentTypeSchema.safeParse({
      code: "quiz",
      name: "Quiz",
      description: "Short quiz",
      isActive: true
    });

    expect(result.success).toBe(true);
  });

  it("rejects invalid assessment date filters", () => {
    const result = listAssessmentsQuerySchema.safeParse({
      dateFrom: "2026-03-10",
      dateTo: "2026-03-09"
    });

    expect(result.success).toBe(false);
  });

  it("accepts partial score payloads and normalizes student ids", () => {
    const result = saveAssessmentScoresSchema.safeParse({
      records: [
        {
          studentId: 1,
          score: "18.5"
        },
        {
          studentId: "2",
          score: 20,
          remarks: "Excellent"
        }
      ]
    });

    expect(result.success).toBe(true);

    if (result.success) {
      expect(result.data.records[0].studentId).toBe("1");
      expect(result.data.records[0].score).toBe(18.5);
      expect(result.data.records[1].studentId).toBe("2");
    }
  });

  it("rejects empty student assessment updates", () => {
    const result = updateStudentAssessmentSchema.safeParse({});

    expect(result.success).toBe(false);
  });
});
