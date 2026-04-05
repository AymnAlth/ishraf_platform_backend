export const ATTENDANCE_STATUS_VALUES = [
  "present",
  "absent",
  "late",
  "excused"
] as const;

export type AttendanceStatus = (typeof ATTENDANCE_STATUS_VALUES)[number];

export interface AttendanceSessionRow {
  id: string;
  classId: string;
  className: string;
  section: string;
  gradeLevelId: string;
  gradeLevelName: string;
  subjectId: string;
  subjectName: string;
  subjectCode: string | null;
  teacherId: string;
  teacherUserId: string;
  teacherFullName: string;
  teacherEmail: string | null;
  teacherPhone: string | null;
  academicYearId: string;
  academicYearName: string;
  semesterId: string;
  semesterName: string;
  sessionDate: Date | string;
  periodNo: number;
  title: string | null;
  notes: string | null;
  createdAt: Date;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  excusedCount: number;
  recordedCount: number;
  expectedCount: number;
}

export interface AttendanceSessionStudentRow {
  studentId: string;
  academicNo: string;
  fullName: string;
  studentStatus: string;
  attendanceId: string | null;
  attendanceStatus: AttendanceStatus | null;
  notes: string | null;
  recordedAt: Date | null;
}

export interface AttendanceRecordRow {
  attendanceId: string;
  attendanceSessionId: string;
  studentId: string;
  academicNo: string;
  fullName: string;
  status: AttendanceStatus;
  notes: string | null;
  recordedAt: Date;
  classId: string;
  teacherId: string;
  academicYearId: string;
  sessionDate: Date | string;
  subjectId: string;
  subjectName: string;
}

export interface TeacherProfileRow {
  teacherId: string;
  teacherUserId: string;
  teacherFullName: string;
  teacherEmail: string | null;
  teacherPhone: string | null;
}

export interface SupervisorProfileRow {
  supervisorId: string;
  supervisorUserId: string;
  supervisorFullName: string;
  supervisorEmail: string | null;
  supervisorPhone: string | null;
}

export interface ClassReferenceRow {
  id: string;
  className: string;
  section: string;
  gradeLevelId: string;
  gradeLevelName: string;
  academicYearId: string;
  academicYearName: string;
}

export interface SubjectReferenceRow {
  id: string;
  name: string;
  code: string | null;
  gradeLevelId: string;
  gradeLevelName: string;
}

export interface AcademicYearReferenceRow {
  id: string;
  name: string;
}

export interface SemesterReferenceRow {
  id: string;
  name: string;
  academicYearId: string;
}

export interface AttendanceSessionWriteInput {
  classId: string;
  subjectId: string;
  teacherId: string;
  academicYearId: string;
  semesterId: string;
  sessionDate: string;
  periodNo: number;
  title?: string | null;
  notes?: string | null;
}

export interface AttendanceRecordWriteInput {
  studentId: string;
  status: AttendanceStatus;
  notes?: string | null;
}

export interface AttendanceRecordUpdateInput {
  status?: AttendanceStatus;
  notes?: string | null;
}

export interface AttendanceRecordUpsertRow {
  attendanceId: string;
  studentId: string;
  status: AttendanceStatus;
  notes: string | null;
  recordedAt: Date;
}

export interface AttendanceSessionFilters {
  page: number;
  limit: number;
  sortBy: AttendanceSessionSortField;
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

export interface AttendanceSessionScope {
  teacherId?: string;
  supervisorId?: string;
}

export const ATTENDANCE_SESSION_SORT_FIELDS = [
  "sessionDate",
  "periodNo",
  "createdAt"
] as const;

export type AttendanceSessionSortField = (typeof ATTENDANCE_SESSION_SORT_FIELDS)[number];
