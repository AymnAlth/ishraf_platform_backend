import type {
  PaginationQuery,
  SortQuery
} from "../../../common/types/pagination.types";

export type HomeworkSubmissionStatus = "submitted" | "not_submitted" | "late";

export interface HomeworkRow {
  id: string;
  title: string;
  description: string | null;
  assignedDate: Date | string;
  dueDate: Date | string;
  classId: string;
  className: string;
  section: string;
  gradeLevelId: string;
  gradeLevelName: string;
  subjectId: string;
  subjectName: string;
  teacherId: string;
  teacherUserId: string;
  teacherFullName: string;
  teacherEmail: string | null;
  teacherPhone: string | null;
  academicYearId: string;
  academicYearName: string;
  semesterId: string;
  semesterName: string;
  createdAt: Date;
  updatedAt: Date;
  submittedCount: number;
  notSubmittedCount: number;
  lateCount: number;
  recordedCount: number;
  expectedCount: number;
}

export interface HomeworkSubmissionRosterRow {
  studentId: string;
  academicNo: string;
  fullName: string;
  studentStatus: string;
  submissionId: string | null;
  status: HomeworkSubmissionStatus | null;
  submittedAt: Date | string | null;
  notes: string | null;
}

export interface StudentHomeworkRow {
  homeworkId: string;
  title: string;
  description: string | null;
  assignedDate: Date | string;
  dueDate: Date | string;
  classId: string;
  className: string;
  section: string;
  subjectId: string;
  subjectName: string;
  teacherId: string;
  teacherName: string;
  academicYearId: string;
  academicYearName: string;
  semesterId: string;
  semesterName: string;
  submissionId: string | null;
  status: HomeworkSubmissionStatus | null;
  submittedAt: Date | string | null;
  notes: string | null;
}

export interface StudentReferenceRow {
  studentId: string;
  academicNo: string;
  fullName: string;
  classId: string;
  className: string;
  section: string;
  academicYearId: string;
  academicYearName: string;
}

export interface TeacherReferenceRow {
  teacherId: string;
  teacherUserId: string;
  teacherFullName: string;
  teacherEmail: string | null;
  teacherPhone: string | null;
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
  code: string;
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

export interface HomeworkWriteInput {
  teacherId: string;
  classId: string;
  subjectId: string;
  academicYearId: string;
  semesterId: string;
  title: string;
  description?: string | null;
  assignedDate: string;
  dueDate: string;
}

export interface HomeworkSubmissionWriteInput {
  studentId: string;
  status: HomeworkSubmissionStatus;
  submittedAt?: string | null;
  notes?: string | null;
}

export interface HomeworkFilters {
  classId?: string;
  subjectId?: string;
  teacherId?: string;
  academicYearId?: string;
  semesterId?: string;
  assignedDate?: string;
  dueDate?: string;
  dateFrom?: string;
  dateTo?: string;
}

export const HOMEWORK_SORT_FIELDS = [
  "dueDate",
  "assignedDate",
  "createdAt",
  "title"
] as const;

export type HomeworkSortField = (typeof HOMEWORK_SORT_FIELDS)[number];

export interface HomeworkListQuery
  extends HomeworkFilters,
    PaginationQuery,
    SortQuery<HomeworkSortField> {}

export interface HomeworkScope {
  teacherId?: string;
}
