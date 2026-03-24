export interface AcademicYearRequestDto {
  name: string;
  startDate: string;
  endDate: string;
  isActive?: boolean;
}

export interface UpdateAcademicYearRequestDto {
  name?: string;
  startDate?: string;
  endDate?: string;
  isActive?: boolean;
}

export interface SemesterRequestDto {
  name: string;
  startDate: string;
  endDate: string;
  isActive?: boolean;
}

export interface UpdateSemesterRequestDto {
  name?: string;
  startDate?: string;
  endDate?: string;
  isActive?: boolean;
}

export interface GradeLevelRequestDto {
  name: string;
  levelOrder: number;
}

export interface ClassRequestDto {
  gradeLevelId: string;
  academicYearId: string;
  className: string;
  section: string;
  capacity?: number;
  isActive?: boolean;
}

export interface SubjectRequestDto {
  name: string;
  gradeLevelId: string;
  code?: string;
  isActive?: boolean;
}

export interface TeacherAssignmentRequestDto {
  teacherId: string;
  classId: string;
  subjectId: string;
  academicYearId: string;
}

export interface SupervisorAssignmentRequestDto {
  supervisorId: string;
  classId: string;
  academicYearId: string;
}

export interface EntityIdParamsDto {
  id: string;
}

export interface AcademicYearParamsDto {
  academicYearId: string;
}

export interface AcademicYearSummaryDto {
  id: string;
  name: string;
}

export interface GradeLevelSummaryDto {
  id: string;
  name: string;
  levelOrder: number;
}

export interface UserSummaryDto {
  id: string;
  userId: string;
  fullName: string;
  email: string | null;
  phone: string | null;
}

export interface ClassSummaryDto {
  id: string;
  className: string;
  section: string;
  isActive: boolean;
  gradeLevel: GradeLevelSummaryDto;
}

export interface SubjectSummaryDto {
  id: string;
  name: string;
  code: string | null;
  isActive: boolean;
  gradeLevel: GradeLevelSummaryDto;
}

export interface AcademicYearResponseDto {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SemesterResponseDto {
  id: string;
  academicYear: AcademicYearSummaryDto;
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GradeLevelResponseDto {
  id: string;
  name: string;
  levelOrder: number;
  createdAt: string;
}

export interface ClassResponseDto {
  id: string;
  className: string;
  section: string;
  capacity: number | null;
  isActive: boolean;
  academicYear: AcademicYearSummaryDto;
  gradeLevel: GradeLevelSummaryDto;
  createdAt: string;
  updatedAt: string;
}

export interface SubjectResponseDto {
  id: string;
  name: string;
  code: string | null;
  isActive: boolean;
  gradeLevel: GradeLevelSummaryDto;
  createdAt: string;
  updatedAt: string;
}

export interface TeacherAssignmentResponseDto {
  id: string;
  academicYear: AcademicYearSummaryDto;
  class: ClassSummaryDto;
  subject: SubjectSummaryDto;
  teacher: UserSummaryDto;
  createdAt: string;
}

export interface SupervisorAssignmentResponseDto {
  id: string;
  academicYear: AcademicYearSummaryDto;
  class: ClassSummaryDto;
  supervisor: UserSummaryDto;
  createdAt: string;
}
