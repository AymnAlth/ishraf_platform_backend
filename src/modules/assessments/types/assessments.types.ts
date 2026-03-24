import type {
  PaginationQuery,
  SortQuery
} from "../../../common/types/pagination.types";

export interface AssessmentTypeRow {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
}

export interface AssessmentRow {
  id: string;
  assessmentTypeId: string;
  assessmentTypeCode: string;
  assessmentTypeName: string;
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
  title: string;
  description: string | null;
  maxScore: number | string;
  weight: number | string;
  assessmentDate: Date | string;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
  gradedCount: number;
  expectedCount: number;
  averageScore: number | string | null;
  averagePercentage: number | string | null;
}

export interface AssessmentScoreRosterRow {
  studentId: string;
  academicNo: string;
  fullName: string;
  studentStatus: string;
  studentAssessmentId: string | null;
  score: number | string | null;
  remarks: string | null;
  gradedAt: Date | null;
  percentage: number | string | null;
}

export interface StudentAssessmentRow {
  studentAssessmentId: string;
  assessmentId: string;
  studentId: string;
  academicNo: string;
  fullName: string;
  score: number | string;
  remarks: string | null;
  gradedAt: Date | null;
  percentage: number | string | null;
  classId: string;
  teacherId: string;
  academicYearId: string;
  maxScore: number | string;
}

export interface TeacherProfileRow {
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

export interface AssessmentTypeWriteInput {
  code: string;
  name: string;
  description?: string | null;
  isActive: boolean;
}

export interface AssessmentWriteInput {
  assessmentTypeId: string;
  classId: string;
  subjectId: string;
  teacherId: string;
  academicYearId: string;
  semesterId: string;
  title: string;
  description?: string | null;
  maxScore: number;
  weight: number;
  assessmentDate: string;
  isPublished: boolean;
}

export interface StudentAssessmentWriteInput {
  studentId: string;
  score: number;
  remarks?: string | null;
}

export interface StudentAssessmentUpdateInput {
  score?: number;
  remarks?: string | null;
}

export interface AssessmentFilters {
  assessmentTypeId?: string;
  classId?: string;
  subjectId?: string;
  teacherId?: string;
  academicYearId?: string;
  semesterId?: string;
  assessmentDate?: string;
  dateFrom?: string;
  dateTo?: string;
  isPublished?: boolean;
}

export const ASSESSMENT_LIST_SORT_FIELDS = [
  "assessmentDate",
  "createdAt",
  "title"
] as const;

export type AssessmentListSortField = (typeof ASSESSMENT_LIST_SORT_FIELDS)[number];

export interface AssessmentListQuery
  extends AssessmentFilters,
    PaginationQuery,
    SortQuery<AssessmentListSortField> {}

export interface AssessmentScope {
  teacherId?: string;
}
