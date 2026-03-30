import type {
  StudentAcademicEnrollmentResponseDto,
  PromoteStudentResponseDto,
  StudentClassSummaryDto,
  StudentDetailResponseDto,
  StudentParentLinkResponseDto,
  StudentPromotionResponseDto,
  StudentSummaryResponseDto
} from "../dto/students.dto";
import type {
  StudentAcademicEnrollmentRow,
  StudentParentLinkRow,
  StudentPromotionRow,
  StudentReadRow
} from "../types/students.types";

const toDateOnly = (value: Date): string => value.toISOString().slice(0, 10);

type StudentClassLikeRow = Pick<
  StudentReadRow,
  | "classId"
  | "className"
  | "section"
  | "gradeLevelId"
  | "gradeLevelName"
  | "academicYearId"
  | "academicYearName"
>;

type PromotionFromClassLikeRow = Pick<
  StudentPromotionRow,
  | "fromClassId"
  | "fromClassName"
  | "fromClassSection"
  | "fromClassGradeLevelId"
  | "fromClassGradeLevelName"
  | "fromClassAcademicYearId"
  | "fromClassAcademicYearName"
>;

type PromotionToClassLikeRow = Pick<
  StudentPromotionRow,
  | "toClassId"
  | "toClassName"
  | "toClassSection"
  | "toClassGradeLevelId"
  | "toClassGradeLevelName"
  | "toClassAcademicYearId"
  | "toClassAcademicYearName"
>;

const toStudentClassSummaryDto = (row: StudentClassLikeRow): StudentClassSummaryDto => ({
  id: row.classId,
  className: row.className,
  section: row.section,
  gradeLevel: {
    id: row.gradeLevelId,
    name: row.gradeLevelName
  },
  academicYear: {
    id: row.academicYearId,
    name: row.academicYearName
  }
});

const toPromotionClassSummaryDto = (
  row: PromotionFromClassLikeRow
): StudentClassSummaryDto => ({
  id: row.fromClassId,
  className: row.fromClassName,
  section: row.fromClassSection,
  gradeLevel: {
    id: row.fromClassGradeLevelId,
    name: row.fromClassGradeLevelName
  },
  academicYear: {
    id: row.fromClassAcademicYearId,
    name: row.fromClassAcademicYearName
  }
});

const toTargetPromotionClassSummaryDto = (
  row: PromotionToClassLikeRow
): StudentClassSummaryDto => ({
  id: row.toClassId,
  className: row.toClassName,
  section: row.toClassSection,
  gradeLevel: {
    id: row.toClassGradeLevelId,
    name: row.toClassGradeLevelName
  },
  academicYear: {
    id: row.toClassAcademicYearId,
    name: row.toClassAcademicYearName
  }
});

const toPrimaryParentSummaryDto = (row: StudentReadRow) =>
  row.primaryParentId
    ? {
        parentId: row.primaryParentId,
        fullName: row.primaryParentName!,
        email: row.primaryParentEmail,
        phone: row.primaryParentPhone,
        relationType: row.primaryParentRelationType!
      }
    : null;

export const toStudentSummaryResponseDto = (
  row: StudentReadRow
): StudentSummaryResponseDto => ({
  id: row.id,
  academicNo: row.academicNo,
  fullName: row.fullName,
  gender: row.gender,
  status: row.status,
  enrollmentDate: toDateOnly(row.enrollmentDate),
  currentClass: toStudentClassSummaryDto(row),
  primaryParent: toPrimaryParentSummaryDto(row)
});

export const toStudentDetailResponseDto = (
  row: StudentReadRow
): StudentDetailResponseDto => ({
  ...toStudentSummaryResponseDto(row),
  dateOfBirth: toDateOnly(row.dateOfBirth),
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString()
});

export const toStudentParentLinkResponseDto = (
  row: StudentParentLinkRow
): StudentParentLinkResponseDto => ({
  linkId: row.linkId,
  parentId: row.parentId,
  userId: row.userId,
  fullName: row.fullName,
  email: row.email,
  phone: row.phone,
  relationType: row.relationType,
  isPrimary: row.isPrimary,
  address: row.address
});

export const toStudentPromotionResponseDto = (
  row: StudentPromotionRow
): StudentPromotionResponseDto => ({
  id: row.id,
  fromClass: toPromotionClassSummaryDto(row),
  toClass: toTargetPromotionClassSummaryDto(row),
  academicYear: {
    id: row.academicYearId,
    name: row.academicYearName
  },
  promotedAt: row.promotedAt.toISOString(),
  notes: row.notes
});

export const toPromoteStudentResponseDto = (
  student: StudentReadRow,
  promotion: StudentPromotionRow
): PromoteStudentResponseDto => ({
  student: toStudentDetailResponseDto(student),
  promotion: toStudentPromotionResponseDto(promotion)
});

export const toStudentAcademicEnrollmentResponseDto = (
  row: StudentAcademicEnrollmentRow
): StudentAcademicEnrollmentResponseDto => ({
  id: row.id,
  student: {
    id: row.studentId,
    academicNo: row.academicNo,
    fullName: row.studentFullName
  },
  academicYear: {
    id: row.academicYearId,
    name: row.academicYearName
  },
  class: {
    id: row.classId,
    className: row.className,
    section: row.classSection,
    isActive: row.classIsActive,
    gradeLevel: {
      id: row.gradeLevelId,
      name: row.gradeLevelName,
      levelOrder: row.gradeLevelOrder
    }
  },
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString()
});
