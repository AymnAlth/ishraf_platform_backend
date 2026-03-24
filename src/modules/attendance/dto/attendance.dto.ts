import type { AttendanceStatus } from "../types/attendance.types";

export interface AttendanceSessionIdParamsDto {
  id: string;
}

export interface AttendanceRecordIdParamsDto {
  attendanceId: string;
}

export interface CreateAttendanceSessionRequestDto {
  classId: string;
  subjectId: string;
  academicYearId: string;
  semesterId: string;
  sessionDate: string;
  periodNo: number;
  title?: string | null;
  notes?: string | null;
  teacherId?: string;
}

export interface ListAttendanceSessionsQueryDto {
  page: number;
  limit: number;
  sortBy: "sessionDate" | "periodNo" | "createdAt";
  sortOrder: "asc" | "desc";
  classId?: string;
  subjectId?: string;
  teacherId?: string;
  academicYearId?: string;
  semesterId?: string;
  sessionDate?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface AttendanceRecordInputDto {
  studentId: string;
  status: AttendanceStatus;
  notes?: string | null;
}

export interface SaveAttendanceRecordsRequestDto {
  records: AttendanceRecordInputDto[];
}

export interface UpdateAttendanceRecordRequestDto {
  status?: AttendanceStatus;
  notes?: string | null;
}

export interface AttendanceSessionCountsDto {
  present: number;
  absent: number;
  late: number;
  excused: number;
  recorded: number;
  expected: number;
}

export interface AttendanceClassSummaryDto {
  id: string;
  className: string;
  section: string;
  gradeLevel: {
    id: string;
    name: string;
  };
}

export interface AttendanceSubjectSummaryDto {
  id: string;
  name: string;
  code: string | null;
}

export interface AttendanceTeacherSummaryDto {
  teacherId: string;
  userId: string;
  fullName: string;
  email: string | null;
  phone: string | null;
}

export interface AttendanceAcademicYearSummaryDto {
  id: string;
  name: string;
}

export interface AttendanceSemesterSummaryDto {
  id: string;
  name: string;
}

export interface AttendanceSessionHeaderResponseDto {
  id: string;
  sessionDate: string;
  periodNo: number;
  title: string | null;
  notes: string | null;
  class: AttendanceClassSummaryDto;
  subject: AttendanceSubjectSummaryDto;
  teacher: AttendanceTeacherSummaryDto;
  academicYear: AttendanceAcademicYearSummaryDto;
  semester: AttendanceSemesterSummaryDto;
}

export interface AttendanceSessionListItemResponseDto
  extends AttendanceSessionHeaderResponseDto {
  counts: AttendanceSessionCountsDto;
}

export interface AttendanceSessionStudentResponseDto {
  studentId: string;
  academicNo: string;
  fullName: string;
  status: string;
  attendanceId: string | null;
  attendanceStatus: AttendanceStatus | null;
  notes: string | null;
  recordedAt: string | null;
}

export interface AttendanceSessionDetailResponseDto {
  session: AttendanceSessionHeaderResponseDto;
  students: AttendanceSessionStudentResponseDto[];
  counts: AttendanceSessionCountsDto;
}

export interface AttendanceRecordResponseDto {
  attendanceId: string;
  attendanceSessionId: string;
  studentId: string;
  academicNo: string;
  fullName: string;
  status: AttendanceStatus;
  notes: string | null;
  recordedAt: string;
}
