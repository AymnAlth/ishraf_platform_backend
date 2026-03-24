import type {
  PaginationQuery,
  SortQuery
} from "../../../common/types/pagination.types";

export interface BehaviorCategoryRow {
  id: string;
  code: string;
  name: string;
  behaviorType: "positive" | "negative";
  defaultSeverity: number;
  isActive: boolean;
}

export interface BehaviorRecordRow {
  id: string;
  studentId: string;
  academicNo: string;
  studentFullName: string;
  behaviorCategoryId: string;
  behaviorCode: string;
  behaviorName: string;
  behaviorType: "positive" | "negative";
  severity: number;
  description: string | null;
  behaviorDate: Date | string;
  teacherId: string | null;
  teacherFullName: string | null;
  supervisorId: string | null;
  supervisorFullName: string | null;
  academicYearId: string;
  academicYearName: string;
  semesterId: string;
  semesterName: string;
  createdAt: Date;
}

export interface StudentBehaviorReferenceRow {
  studentId: string;
  academicNo: string;
  fullName: string;
  classId: string;
  className: string;
  section: string;
  academicYearId: string;
  academicYearName: string;
}

export interface BehaviorStudentSummaryRow {
  totalBehaviorRecords: number | string;
  positiveCount: number | string;
  negativeCount: number | string;
  negativeSeverityTotal: number | string;
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

export interface AcademicYearReferenceRow {
  id: string;
  name: string;
}

export interface SemesterReferenceRow {
  id: string;
  name: string;
  academicYearId: string;
}

export interface BehaviorCategoryWriteInput {
  code: string;
  name: string;
  behaviorType: "positive" | "negative";
  defaultSeverity: number;
  isActive: boolean;
}

export interface BehaviorRecordWriteInput {
  studentId: string;
  behaviorCategoryId: string;
  teacherId?: string | null;
  supervisorId?: string | null;
  academicYearId: string;
  semesterId: string;
  description?: string | null;
  severity: number;
  behaviorDate: string;
}

export interface BehaviorRecordUpdateInput {
  behaviorCategoryId?: string;
  academicYearId?: string;
  semesterId?: string;
  description?: string | null;
  severity?: number;
  behaviorDate?: string;
}

export interface BehaviorRecordFilters {
  studentId?: string;
  behaviorCategoryId?: string;
  behaviorType?: "positive" | "negative";
  academicYearId?: string;
  semesterId?: string;
  teacherId?: string;
  supervisorId?: string;
  behaviorDate?: string;
  dateFrom?: string;
  dateTo?: string;
}

export const BEHAVIOR_RECORD_SORT_FIELDS = [
  "behaviorDate",
  "createdAt",
  "severity"
] as const;

export type BehaviorRecordSortField = (typeof BEHAVIOR_RECORD_SORT_FIELDS)[number];

export interface BehaviorRecordListQuery
  extends BehaviorRecordFilters,
    PaginationQuery,
    SortQuery<BehaviorRecordSortField> {}

export interface BehaviorRecordScope {
  teacherId?: string;
  supervisorId?: string;
}
