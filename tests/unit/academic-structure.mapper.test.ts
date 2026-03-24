import { describe, expect, it } from "vitest";

import {
  toAcademicYearResponseDto,
  toTeacherAssignmentResponseDto
} from "../../src/modules/academic-structure/mapper/academic-structure.mapper";
import type {
  AcademicYearRow,
  TeacherAssignmentRow
} from "../../src/modules/academic-structure/types/academic-structure.types";

describe("academic-structure.mapper", () => {
  it("maps academic years with date-only fields", () => {
    const row: AcademicYearRow = {
      id: "1",
      name: "2025-2026",
      startDate: new Date("2025-09-01T00:00:00.000Z"),
      endDate: new Date("2026-06-30T00:00:00.000Z"),
      isActive: true,
      createdAt: new Date("2026-03-13T10:00:00.000Z"),
      updatedAt: new Date("2026-03-13T10:00:00.000Z")
    };

    expect(toAcademicYearResponseDto(row)).toEqual({
      id: "1",
      name: "2025-2026",
      startDate: "2025-09-01",
      endDate: "2026-06-30",
      isActive: true,
      createdAt: "2026-03-13T10:00:00.000Z",
      updatedAt: "2026-03-13T10:00:00.000Z"
    });
  });

  it("maps teacher assignments with nested summaries", () => {
    const row: TeacherAssignmentRow = {
      id: "1",
      academicYearId: "1",
      academicYearName: "2025-2026",
      classId: "10",
      className: "A",
      classSection: "A",
      classIsActive: true,
      classAcademicYearId: "1",
      classGradeLevelId: "2",
      classGradeLevelName: "Grade 2",
      classGradeLevelOrder: 2,
      subjectId: "7",
      subjectName: "Science",
      subjectCode: "SCI-G2",
      subjectIsActive: true,
      subjectGradeLevelId: "2",
      teacherId: "3",
      teacherUserId: "30",
      teacherFullName: "Sara Teacher",
      teacherEmail: "teacher1@eshraf.local",
      teacherPhone: "700000003",
      createdAt: new Date("2026-03-13T10:00:00.000Z")
    };

    expect(toTeacherAssignmentResponseDto(row)).toEqual({
      id: "1",
      academicYear: {
        id: "1",
        name: "2025-2026"
      },
      class: {
        id: "10",
        className: "A",
        section: "A",
        isActive: true,
        gradeLevel: {
          id: "2",
          name: "Grade 2",
          levelOrder: 2
        }
      },
      subject: {
        id: "7",
        name: "Science",
        code: "SCI-G2",
        isActive: true,
        gradeLevel: {
          id: "2",
          name: "Grade 2",
          levelOrder: 2
        }
      },
      teacher: {
        id: "3",
        userId: "30",
        fullName: "Sara Teacher",
        email: "teacher1@eshraf.local",
        phone: "700000003"
      },
      createdAt: "2026-03-13T10:00:00.000Z"
    });
  });
});
