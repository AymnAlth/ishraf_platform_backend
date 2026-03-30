export interface StudentIdParamsDto {
  id: string;
}

export interface StudentParentParamsDto {
  studentId: string;
  parentId: string;
}

export interface StudentAcademicEnrollmentIdParamsDto {
  enrollmentId: string;
}

export interface CreateStudentRequestDto {
  academicNo: string;
  fullName: string;
  dateOfBirth: string;
  gender: "male" | "female";
  classId: string;
  status?: "active" | "transferred" | "graduated" | "dropped" | "suspended";
  enrollmentDate?: string;
}

export interface UpdateStudentRequestDto {
  academicNo?: string;
  fullName?: string;
  dateOfBirth?: string;
  gender?: "male" | "female";
  status?: "active" | "transferred" | "graduated" | "dropped" | "suspended";
}

export interface ListStudentsQueryDto {
  page: number;
  limit: number;
  sortBy: "createdAt" | "academicNo" | "fullName" | "enrollmentDate";
  sortOrder: "asc" | "desc";
  classId?: string;
  academicYearId?: string;
  status?: "active" | "transferred" | "graduated" | "dropped" | "suspended";
  gender?: "male" | "female";
}

export interface LinkStudentParentRequestDto {
  parentId: string;
  relationType: string;
  isPrimary?: boolean;
}

export interface PromoteStudentRequestDto {
  toClassId: string;
  academicYearId: string;
  notes?: string;
}

export interface ListStudentAcademicEnrollmentsQueryDto {
  studentId?: string;
  academicYearId?: string;
  classId?: string;
}

export interface CreateStudentAcademicEnrollmentRequestDto {
  academicYearId: string;
  classId: string;
}

export interface UpdateStudentAcademicEnrollmentRequestDto {
  classId?: string;
}

export interface BulkStudentAcademicEnrollmentsRequestDto {
  items: Array<{
    studentId: string;
    academicYearId: string;
    classId: string;
  }>;
}

export interface StudentClassSummaryDto {
  id: string;
  className: string;
  section: string;
  gradeLevel: {
    id: string;
    name: string;
  };
  academicYear: {
    id: string;
    name: string;
  };
}

export interface StudentPrimaryParentSummaryDto {
  parentId: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  relationType: string;
}

export interface StudentSummaryResponseDto {
  id: string;
  academicNo: string;
  fullName: string;
  gender: "male" | "female";
  status: "active" | "transferred" | "graduated" | "dropped" | "suspended";
  enrollmentDate: string;
  currentClass: StudentClassSummaryDto;
  primaryParent: StudentPrimaryParentSummaryDto | null;
}

export interface StudentDetailResponseDto extends StudentSummaryResponseDto {
  dateOfBirth: string;
  createdAt: string;
  updatedAt: string;
}

export interface StudentParentLinkResponseDto {
  linkId: string;
  parentId: string;
  userId: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  relationType: string;
  isPrimary: boolean;
  address: string | null;
}

export interface StudentPromotionResponseDto {
  id: string;
  fromClass: StudentClassSummaryDto;
  toClass: StudentClassSummaryDto;
  academicYear: {
    id: string;
    name: string;
  };
  promotedAt: string;
  notes: string | null;
}

export interface PromoteStudentResponseDto {
  student: StudentDetailResponseDto;
  promotion: StudentPromotionResponseDto;
}

export interface StudentAcademicEnrollmentResponseDto {
  id: string;
  student: {
    id: string;
    academicNo: string;
    fullName: string;
  };
  academicYear: {
    id: string;
    name: string;
  };
  class: {
    id: string;
    className: string;
    section: string;
    isActive: boolean;
    gradeLevel: {
      id: string;
      name: string;
      levelOrder: number;
    };
  };
  createdAt: string;
  updatedAt: string;
}
