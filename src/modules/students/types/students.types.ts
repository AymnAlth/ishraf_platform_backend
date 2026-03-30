import type { PaginationQuery, SortQuery } from "../../../common/types/pagination.types";

export const STUDENT_GENDER_VALUES = ["male", "female"] as const;
export const STUDENT_STATUS_VALUES = [
  "active",
  "transferred",
  "graduated",
  "dropped",
  "suspended"
] as const;

export type StudentGender = (typeof STUDENT_GENDER_VALUES)[number];
export type StudentStatus = (typeof STUDENT_STATUS_VALUES)[number];

export interface StudentReadRow {
  id: string;
  academicNo: string;
  fullName: string;
  dateOfBirth: Date;
  gender: StudentGender;
  status: StudentStatus;
  enrollmentDate: Date;
  createdAt: Date;
  updatedAt: Date;
  classId: string;
  className: string;
  section: string;
  gradeLevelId: string;
  gradeLevelName: string;
  academicYearId: string;
  academicYearName: string;
  primaryParentId: string | null;
  primaryParentName: string | null;
  primaryParentEmail: string | null;
  primaryParentPhone: string | null;
  primaryParentRelationType: string | null;
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

export interface AcademicYearReferenceRow {
  id: string;
  name: string;
}

export interface ParentReferenceRow {
  parentId: string;
  userId: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  address: string | null;
}

export interface StudentParentLinkRow {
  linkId: string;
  studentId: string;
  parentId: string;
  userId: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  relationType: string;
  isPrimary: boolean;
  address: string | null;
  createdAt: Date;
}

export interface StudentPromotionRow {
  id: string;
  academicYearId: string;
  academicYearName: string;
  fromClassId: string;
  fromClassName: string;
  fromClassSection: string;
  fromClassGradeLevelId: string;
  fromClassGradeLevelName: string;
  fromClassAcademicYearId: string;
  fromClassAcademicYearName: string;
  toClassId: string;
  toClassName: string;
  toClassSection: string;
  toClassGradeLevelId: string;
  toClassGradeLevelName: string;
  toClassAcademicYearId: string;
  toClassAcademicYearName: string;
  promotedAt: Date;
  notes: string | null;
}

export interface StudentAcademicEnrollmentRow {
  id: string;
  studentId: string;
  academicNo: string;
  studentFullName: string;
  academicYearId: string;
  academicYearName: string;
  classId: string;
  className: string;
  classSection: string;
  classIsActive: boolean;
  gradeLevelId: string;
  gradeLevelName: string;
  gradeLevelOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateStudentRowInput {
  academicNo: string;
  fullName: string;
  dateOfBirth: string;
  gender: StudentGender;
  classId: string;
  status: StudentStatus;
  enrollmentDate?: string;
}

export interface UpdateStudentRowInput {
  academicNo?: string;
  fullName?: string;
  dateOfBirth?: string;
  gender?: StudentGender;
  status?: StudentStatus;
}

export interface CreateStudentParentLinkInput {
  studentId: string;
  parentId: string;
  relationType: string;
  isPrimary: boolean;
}

export interface CreateStudentPromotionInput {
  studentId: string;
  fromClassId: string;
  toClassId: string;
  academicYearId: string;
  notes?: string;
}

export interface CreateStudentAcademicEnrollmentInput {
  studentId: string;
  academicYearId: string;
  classId: string;
}

export interface UpdateStudentAcademicEnrollmentInput {
  classId?: string;
}

export const STUDENT_LIST_SORT_FIELDS = [
  "createdAt",
  "academicNo",
  "fullName",
  "enrollmentDate"
] as const;

export type StudentListSortField = (typeof STUDENT_LIST_SORT_FIELDS)[number];

export interface StudentListQuery
  extends PaginationQuery,
    SortQuery<StudentListSortField> {
  classId?: string;
  academicYearId?: string;
  status?: StudentStatus;
  gender?: StudentGender;
}

export interface StudentAcademicEnrollmentListQuery {
  studentId?: string;
  academicYearId?: string;
  classId?: string;
}
