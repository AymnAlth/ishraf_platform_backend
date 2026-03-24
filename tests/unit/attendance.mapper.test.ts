import { describe, expect, it } from "vitest";

import {
  toAttendanceRecordResponseDto,
  toAttendanceSessionDetailResponseDto,
  toAttendanceSessionListItemResponseDto
} from "../../src/modules/attendance/mapper/attendance.mapper";
import type {
  AttendanceRecordRow,
  AttendanceSessionRow,
  AttendanceSessionStudentRow
} from "../../src/modules/attendance/types/attendance.types";

const sessionRow = (overrides: Partial<AttendanceSessionRow> = {}): AttendanceSessionRow => ({
  id: "10",
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
  sessionDate: "2026-02-16",
  periodNo: 1,
  title: "Morning Science",
  notes: null,
  createdAt: new Date("2026-03-13T10:00:00.000Z"),
  presentCount: 1,
  absentCount: 1,
  lateCount: 0,
  excusedCount: 0,
  recordedCount: 2,
  expectedCount: 2,
  ...overrides
});

const studentRow = (
  overrides: Partial<AttendanceSessionStudentRow> = {}
): AttendanceSessionStudentRow => ({
  studentId: "1",
  academicNo: "STU-1001",
  fullName: "Student One",
  studentStatus: "active",
  attendanceId: "100",
  attendanceStatus: "present",
  notes: null,
  recordedAt: new Date("2026-03-13T10:00:00.000Z"),
  ...overrides
});

const attendanceRecordRow = (
  overrides: Partial<AttendanceRecordRow> = {}
): AttendanceRecordRow => ({
  attendanceId: "100",
  attendanceSessionId: "10",
  studentId: "1",
  academicNo: "STU-1001",
  fullName: "Student One",
  status: "present",
  notes: null,
  recordedAt: new Date("2026-03-13T10:00:00.000Z"),
  classId: "1",
  teacherId: "1",
  academicYearId: "1",
  ...overrides
});

describe("attendance.mapper", () => {
  it("maps session list items with nested summaries and counts", () => {
    const response = toAttendanceSessionListItemResponseDto(sessionRow());

    expect(response.class.gradeLevel.name).toBe("Grade 1");
    expect(response.teacher.teacherId).toBe("1");
    expect(response.counts.expected).toBe(2);
    expect(response.sessionDate).toBe("2026-02-16");
  });

  it("maps session detail students and record timestamps", () => {
    const response = toAttendanceSessionDetailResponseDto(sessionRow(), [studentRow()]);

    expect(response.students[0].studentId).toBe("1");
    expect(response.students[0].recordedAt).toBe("2026-03-13T10:00:00.000Z");
  });

  it("maps attendance record updates to the public response shape", () => {
    const response = toAttendanceRecordResponseDto(attendanceRecordRow());

    expect(response.attendanceId).toBe("100");
    expect(response.status).toBe("present");
    expect(response.recordedAt).toBe("2026-03-13T10:00:00.000Z");
  });
});
