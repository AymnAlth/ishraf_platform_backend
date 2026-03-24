import type {
  AttendanceRecordResponseDto,
  AttendanceSessionCountsDto,
  AttendanceSessionDetailResponseDto,
  AttendanceSessionHeaderResponseDto,
  AttendanceSessionListItemResponseDto,
  AttendanceSessionStudentResponseDto
} from "../dto/attendance.dto";
import type {
  AttendanceRecordRow,
  AttendanceSessionRow,
  AttendanceSessionStudentRow
} from "../types/attendance.types";

const toDateOnlySafe = (value: Date | string): string =>
  typeof value === "string" ? value.slice(0, 10) : value.toISOString().slice(0, 10);

const toCountsDto = (row: AttendanceSessionRow): AttendanceSessionCountsDto => ({
  present: row.presentCount,
  absent: row.absentCount,
  late: row.lateCount,
  excused: row.excusedCount,
  recorded: row.recordedCount,
  expected: row.expectedCount
});

export const toAttendanceSessionHeaderResponseDto = (
  row: AttendanceSessionRow
): AttendanceSessionHeaderResponseDto => ({
  id: row.id,
  sessionDate: toDateOnlySafe(row.sessionDate),
  periodNo: row.periodNo,
  title: row.title,
  notes: row.notes,
  class: {
    id: row.classId,
    className: row.className,
    section: row.section,
    gradeLevel: {
      id: row.gradeLevelId,
      name: row.gradeLevelName
    }
  },
  subject: {
    id: row.subjectId,
    name: row.subjectName,
    code: row.subjectCode
  },
  teacher: {
    teacherId: row.teacherId,
    userId: row.teacherUserId,
    fullName: row.teacherFullName,
    email: row.teacherEmail,
    phone: row.teacherPhone
  },
  academicYear: {
    id: row.academicYearId,
    name: row.academicYearName
  },
  semester: {
    id: row.semesterId,
    name: row.semesterName
  }
});

export const toAttendanceSessionListItemResponseDto = (
  row: AttendanceSessionRow
): AttendanceSessionListItemResponseDto => ({
  ...toAttendanceSessionHeaderResponseDto(row),
  counts: toCountsDto(row)
});

export const toAttendanceSessionStudentResponseDto = (
  row: AttendanceSessionStudentRow
): AttendanceSessionStudentResponseDto => ({
  studentId: row.studentId,
  academicNo: row.academicNo,
  fullName: row.fullName,
  status: row.studentStatus,
  attendanceId: row.attendanceId,
  attendanceStatus: row.attendanceStatus,
  notes: row.notes,
  recordedAt: row.recordedAt ? row.recordedAt.toISOString() : null
});

export const toAttendanceSessionDetailResponseDto = (
  session: AttendanceSessionRow,
  students: AttendanceSessionStudentRow[]
): AttendanceSessionDetailResponseDto => ({
  session: toAttendanceSessionHeaderResponseDto(session),
  students: students.map((student) => toAttendanceSessionStudentResponseDto(student)),
  counts: toCountsDto(session)
});

export const toAttendanceRecordResponseDto = (
  row: AttendanceRecordRow
): AttendanceRecordResponseDto => ({
  attendanceId: row.attendanceId,
  attendanceSessionId: row.attendanceSessionId,
  studentId: row.studentId,
  academicNo: row.academicNo,
  fullName: row.fullName,
  status: row.status,
  notes: row.notes,
  recordedAt: row.recordedAt.toISOString()
});
