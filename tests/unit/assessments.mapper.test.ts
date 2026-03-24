import { describe, expect, it } from "vitest";

import {
  toAssessmentDetailResponseDto,
  toAssessmentListItemResponseDto,
  toAssessmentScoresResponseDto,
  toAssessmentTypeResponseDto,
  toStudentAssessmentResponseDto
} from "../../src/modules/assessments/mapper/assessments.mapper";
import type {
  AssessmentRow,
  AssessmentScoreRosterRow,
  AssessmentTypeRow,
  StudentAssessmentRow
} from "../../src/modules/assessments/types/assessments.types";

const assessmentTypeRow = (
  overrides: Partial<AssessmentTypeRow> = {}
): AssessmentTypeRow => ({
  id: "1",
  code: "exam",
  name: "Exam",
  description: "Formal exam",
  isActive: true,
  ...overrides
});

const assessmentRow = (overrides: Partial<AssessmentRow> = {}): AssessmentRow => ({
  id: "10",
  assessmentTypeId: "1",
  assessmentTypeCode: "exam",
  assessmentTypeName: "Exam",
  classId: "1",
  className: "A",
  section: "A",
  gradeLevelId: "1",
  gradeLevelName: "Grade 1",
  subjectId: "1",
  subjectName: "Science",
  subjectCode: "SCI-G1",
  teacherId: "1",
  teacherUserId: "1002",
  teacherFullName: "Sara Teacher",
  teacherEmail: "teacher@example.com",
  teacherPhone: "700000003",
  academicYearId: "1",
  academicYearName: "2025-2026",
  semesterId: "2",
  semesterName: "Semester 2",
  title: "Monthly Exam",
  description: null,
  maxScore: "100.00",
  weight: "15.00",
  assessmentDate: "2026-03-01",
  isPublished: false,
  createdAt: new Date("2026-03-13T10:00:00.000Z"),
  updatedAt: new Date("2026-03-13T10:30:00.000Z"),
  gradedCount: 1,
  expectedCount: 2,
  averageScore: "85.50",
  averagePercentage: "85.50",
  ...overrides
});

const rosterRow = (
  overrides: Partial<AssessmentScoreRosterRow> = {}
): AssessmentScoreRosterRow => ({
  studentId: "1",
  academicNo: "STU-1001",
  fullName: "Student One",
  studentStatus: "active",
  studentAssessmentId: "100",
  score: "85.50",
  remarks: "Well done",
  gradedAt: new Date("2026-03-13T11:00:00.000Z"),
  percentage: "85.50",
  ...overrides
});

const studentAssessmentRow = (
  overrides: Partial<StudentAssessmentRow> = {}
): StudentAssessmentRow => ({
  studentAssessmentId: "100",
  assessmentId: "10",
  studentId: "1",
  academicNo: "STU-1001",
  fullName: "Student One",
  score: "88.00",
  remarks: "Regraded",
  gradedAt: new Date("2026-03-13T11:30:00.000Z"),
  percentage: "88.00",
  classId: "1",
  teacherId: "1",
  academicYearId: "1",
  maxScore: "100.00",
  ...overrides
});

describe("assessments.mapper", () => {
  it("maps assessment types to the public response", () => {
    const response = toAssessmentTypeResponseDto(assessmentTypeRow());

    expect(response.id).toBe("1");
    expect(response.code).toBe("exam");
    expect(response.isActive).toBe(true);
  });

  it("maps assessment list items and details with nested objects", () => {
    const listItem = toAssessmentListItemResponseDto(assessmentRow());
    const detail = toAssessmentDetailResponseDto(assessmentRow());

    expect(listItem.class.gradeLevel.name).toBe("Grade 1");
    expect(listItem.summary.averageScore).toBe(85.5);
    expect(detail.assessment.teacher.teacherId).toBe("1");
    expect(detail.assessment.assessmentDate).toBe("2026-03-01");
  });

  it("maps score rosters with nullable and numeric values", () => {
    const response = toAssessmentScoresResponseDto(assessmentRow(), [
      rosterRow(),
      rosterRow({
        studentId: "2",
        academicNo: "STU-1002",
        fullName: "Student Two",
        studentAssessmentId: null,
        score: null,
        remarks: null,
        gradedAt: null,
        percentage: null
      })
    ]);

    expect(response.students[0].score).toBe(85.5);
    expect(response.students[0].gradedAt).toBe("2026-03-13T11:00:00.000Z");
    expect(response.students[1].score).toBeNull();
  });

  it("maps single student assessment updates", () => {
    const response = toStudentAssessmentResponseDto(studentAssessmentRow());

    expect(response.studentAssessmentId).toBe("100");
    expect(response.score).toBe(88);
    expect(response.gradedAt).toBe("2026-03-13T11:30:00.000Z");
  });
});
