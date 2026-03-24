import { describe, expect, it } from "vitest";

import {
  emptyAssessmentSummary,
  toAssessmentSummaryDto,
  toStudentProfileResponseDto
} from "../../src/modules/reporting/mapper/reporting.mapper";
import type {
  ReportingStudentParentRow,
  ReportingStudentRow,
  StudentAssessmentSummaryRow
} from "../../src/modules/reporting/types/reporting.types";

const studentRow = (overrides: Partial<ReportingStudentRow> = {}): ReportingStudentRow => ({
  studentId: "1",
  academicNo: "STU-1001",
  fullName: "Student One",
  dateOfBirth: new Date("2016-09-01T00:00:00.000Z"),
  gender: "male",
  status: "active",
  enrollmentDate: new Date("2025-09-01T00:00:00.000Z"),
  classId: "1",
  className: "A",
  section: "A",
  gradeLevelId: "1",
  gradeLevelName: "Grade 1",
  academicYearId: "1",
  academicYearName: "2025-2026",
  ...overrides
});

const parentRow = (
  overrides: Partial<ReportingStudentParentRow> = {}
): ReportingStudentParentRow => ({
  linkId: "1",
  parentId: "1",
  userId: "1003",
  fullName: "Parent User",
  email: "parent@example.com",
  phone: "700000001",
  relationType: "father",
  isPrimary: true,
  address: "Dhamar",
  ...overrides
});

const assessmentRow = (
  overrides: Partial<StudentAssessmentSummaryRow> = {}
): StudentAssessmentSummaryRow => ({
  studentId: "1",
  academicNo: "STU-1001",
  studentName: "Student One",
  classId: "1",
  className: "A",
  section: "A",
  academicYearId: "1",
  academicYearName: "2025-2026",
  semesterId: "2",
  semesterName: "Semester 2",
  subjectId: "1",
  subjectName: "Science",
  totalAssessments: 2,
  totalScore: 35,
  totalMaxScore: 40,
  overallPercentage: 87.5,
  ...overrides
});

describe("reporting.mapper", () => {
  it("aggregates subject-level assessment summaries into an overall summary", () => {
    const summary = toAssessmentSummaryDto([
      assessmentRow(),
      assessmentRow({
        subjectId: "2",
        subjectName: "Math",
        totalAssessments: 1,
        totalScore: 18,
        totalMaxScore: 20,
        overallPercentage: 90
      })
    ]);

    expect(summary.totalAssessments).toBe(3);
    expect(summary.totalScore).toBe(53);
    expect(summary.totalMaxScore).toBe(60);
    expect(summary.overallPercentage).toBeCloseTo(88.33, 2);
    expect(summary.subjects).toHaveLength(2);
  });

  it("returns a zero-safe assessment summary when there is no data", () => {
    expect(toAssessmentSummaryDto([])).toEqual(emptyAssessmentSummary());
  });

  it("maps a full student profile response with null-safe summaries", () => {
    const response = toStudentProfileResponseDto(studentRow(), [parentRow()], null, null, []);

    expect(response.student.fullName).toBe("Student One");
    expect(response.parents[0].isPrimary).toBe(true);
    expect(response.attendanceSummary.totalSessions).toBe(0);
    expect(response.behaviorSummary.totalBehaviorRecords).toBe(0);
    expect(response.assessmentSummary.subjects).toHaveLength(0);
  });
});
