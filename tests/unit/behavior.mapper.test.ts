import { describe, expect, it } from "vitest";

import {
  toBehaviorCategoryResponseDto,
  toBehaviorRecordResponseDto,
  toBehaviorStudentSummaryDto,
  toStudentBehaviorRecordsResponseDto
} from "../../src/modules/behavior/mapper/behavior.mapper";
import type {
  BehaviorCategoryRow,
  BehaviorRecordRow,
  BehaviorStudentSummaryRow,
  StudentBehaviorReferenceRow
} from "../../src/modules/behavior/types/behavior.types";

const categoryRow = (
  overrides: Partial<BehaviorCategoryRow> = {}
): BehaviorCategoryRow => ({
  id: "1",
  code: "respect",
  name: "Respect",
  behaviorType: "positive",
  defaultSeverity: 1,
  isActive: true,
  ...overrides
});

const behaviorRecordRow = (
  overrides: Partial<BehaviorRecordRow> = {}
): BehaviorRecordRow => ({
  id: "10",
  studentId: "1",
  academicNo: "STU-1001",
  studentFullName: "Student One",
  behaviorCategoryId: "5",
  behaviorCode: "lateness",
  behaviorName: "Lateness",
  behaviorType: "negative",
  severity: 2,
  description: "Late to class",
  behaviorDate: "2026-03-10",
  teacherId: "1",
  teacherFullName: "Sara Teacher",
  supervisorId: null,
  supervisorFullName: null,
  academicYearId: "1",
  academicYearName: "2025-2026",
  semesterId: "2",
  semesterName: "Semester 2",
  createdAt: new Date("2026-03-13T10:00:00.000Z"),
  ...overrides
});

const studentRow = (
  overrides: Partial<StudentBehaviorReferenceRow> = {}
): StudentBehaviorReferenceRow => ({
  studentId: "1",
  academicNo: "STU-1001",
  fullName: "Student One",
  classId: "1",
  className: "A",
  section: "A",
  academicYearId: "1",
  academicYearName: "2025-2026",
  ...overrides
});

const summaryRow = (
  overrides: Partial<BehaviorStudentSummaryRow> = {}
): BehaviorStudentSummaryRow => ({
  totalBehaviorRecords: "2",
  positiveCount: "1",
  negativeCount: "1",
  negativeSeverityTotal: "3",
  ...overrides
});

describe("behavior.mapper", () => {
  it("maps behavior categories", () => {
    const response = toBehaviorCategoryResponseDto(categoryRow());

    expect(response.code).toBe("respect");
    expect(response.defaultSeverity).toBe(1);
  });

  it("maps behavior records with teacher and supervisor actors", () => {
    const teacherResponse = toBehaviorRecordResponseDto(behaviorRecordRow());
    const supervisorResponse = toBehaviorRecordResponseDto(
      behaviorRecordRow({
        teacherId: null,
        teacherFullName: null,
        supervisorId: "1",
        supervisorFullName: "Mona Supervisor",
        behaviorType: "positive",
        behaviorCode: "respect",
        behaviorName: "Respect"
      })
    );

    expect(teacherResponse.actorType).toBe("teacher");
    expect(teacherResponse.actor.id).toBe("1");
    expect(supervisorResponse.actorType).toBe("supervisor");
    expect(supervisorResponse.actor.fullName).toBe("Mona Supervisor");
  });

  it("maps student behavior summaries and student record responses", () => {
    const summary = toBehaviorStudentSummaryDto(summaryRow());
    const response = toStudentBehaviorRecordsResponseDto(studentRow(), summary, [
      behaviorRecordRow()
    ]);

    expect(summary.totalBehaviorRecords).toBe(2);
    expect(response.student.currentClass.id).toBe("1");
    expect(response.records[0].category.code).toBe("lateness");
  });
});
