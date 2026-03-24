import { describe, expect, it } from "vitest";

import {
  toPromoteStudentResponseDto,
  toStudentDetailResponseDto,
  toStudentParentLinkResponseDto,
  toStudentSummaryResponseDto
} from "../../src/modules/students/mapper/students.mapper";
import type {
  StudentParentLinkRow,
  StudentPromotionRow,
  StudentReadRow
} from "../../src/modules/students/types/students.types";

const studentRow: StudentReadRow = {
  id: "1",
  academicNo: "STU-1001",
  fullName: "Student One",
  dateOfBirth: new Date("2016-09-01T00:00:00.000Z"),
  gender: "male",
  status: "active",
  enrollmentDate: new Date("2025-09-01T00:00:00.000Z"),
  createdAt: new Date("2026-03-13T10:00:00.000Z"),
  updatedAt: new Date("2026-03-13T10:00:00.000Z"),
  classId: "11",
  className: "A",
  section: "A",
  gradeLevelId: "2",
  gradeLevelName: "Grade 2",
  academicYearId: "1",
  academicYearName: "2025-2026",
  primaryParentId: "7",
  primaryParentName: "Huda Parent",
  primaryParentEmail: "parent@example.com",
  primaryParentPhone: "700000011",
  primaryParentRelationType: "mother"
};

const parentLinkRow: StudentParentLinkRow = {
  linkId: "3",
  studentId: "1",
  parentId: "7",
  userId: "1003",
  fullName: "Huda Parent",
  email: "parent@example.com",
  phone: "700000011",
  relationType: "mother",
  isPrimary: true,
  address: "Dhamar",
  createdAt: new Date("2026-03-13T10:00:00.000Z")
};

const promotionRow: StudentPromotionRow = {
  id: "9",
  academicYearId: "1",
  academicYearName: "2025-2026",
  fromClassId: "11",
  fromClassName: "A",
  fromClassSection: "A",
  fromClassGradeLevelId: "2",
  fromClassGradeLevelName: "Grade 2",
  fromClassAcademicYearId: "1",
  fromClassAcademicYearName: "2025-2026",
  toClassId: "12",
  toClassName: "B",
  toClassSection: "B",
  toClassGradeLevelId: "3",
  toClassGradeLevelName: "Grade 3",
  toClassAcademicYearId: "1",
  toClassAcademicYearName: "2025-2026",
  promotedAt: new Date("2026-03-13T10:00:00.000Z"),
  notes: "Promoted successfully"
};

describe("students.mapper", () => {
  it("maps a student summary with current class and primary parent", () => {
    const response = toStudentSummaryResponseDto(studentRow);

    expect(response).toEqual({
      id: "1",
      academicNo: "STU-1001",
      fullName: "Student One",
      gender: "male",
      status: "active",
      enrollmentDate: "2025-09-01",
      currentClass: {
        id: "11",
        className: "A",
        section: "A",
        gradeLevel: {
          id: "2",
          name: "Grade 2"
        },
        academicYear: {
          id: "1",
          name: "2025-2026"
        }
      },
      primaryParent: {
        parentId: "7",
        fullName: "Huda Parent",
        email: "parent@example.com",
        phone: "700000011",
        relationType: "mother"
      }
    });
  });

  it("maps a student detail and parent link response", () => {
    const studentResponse = toStudentDetailResponseDto(studentRow);
    const parentLinkResponse = toStudentParentLinkResponseDto(parentLinkRow);

    expect(studentResponse.dateOfBirth).toBe("2016-09-01");
    expect(studentResponse.createdAt).toBe("2026-03-13T10:00:00.000Z");
    expect(parentLinkResponse).toEqual({
      linkId: "3",
      parentId: "7",
      userId: "1003",
      fullName: "Huda Parent",
      email: "parent@example.com",
      phone: "700000011",
      relationType: "mother",
      isPrimary: true,
      address: "Dhamar"
    });
  });

  it("maps a promotion response with nested student and class data", () => {
    const response = toPromoteStudentResponseDto(studentRow, promotionRow);

    expect(response.student.id).toBe("1");
    expect(response.promotion).toEqual({
      id: "9",
      fromClass: {
        id: "11",
        className: "A",
        section: "A",
        gradeLevel: {
          id: "2",
          name: "Grade 2"
        },
        academicYear: {
          id: "1",
          name: "2025-2026"
        }
      },
      toClass: {
        id: "12",
        className: "B",
        section: "B",
        gradeLevel: {
          id: "3",
          name: "Grade 3"
        },
        academicYear: {
          id: "1",
          name: "2025-2026"
        }
      },
      academicYear: {
        id: "1",
        name: "2025-2026"
      },
      promotedAt: "2026-03-13T10:00:00.000Z",
      notes: "Promoted successfully"
    });
  });
});
