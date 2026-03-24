export interface AssessmentIdParamsDto {
  id: string;
}

export interface StudentAssessmentIdParamsDto {
  studentAssessmentId: string;
}

export interface CreateAssessmentTypeRequestDto {
  code: string;
  name: string;
  description?: string | null;
  isActive?: boolean;
}

export interface CreateAssessmentRequestDto {
  assessmentTypeId: string;
  classId: string;
  subjectId: string;
  teacherId?: string;
  academicYearId: string;
  semesterId: string;
  title: string;
  description?: string | null;
  maxScore: number;
  weight?: number;
  assessmentDate: string;
  isPublished?: boolean;
}

export interface ListAssessmentsQueryDto {
  page: number;
  limit: number;
  sortBy: "assessmentDate" | "createdAt" | "title";
  sortOrder: "asc" | "desc";
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

export interface AssessmentScoreInputDto {
  studentId: string;
  score: number;
  remarks?: string | null;
}

export interface SaveAssessmentScoresRequestDto {
  records: AssessmentScoreInputDto[];
}

export interface UpdateStudentAssessmentRequestDto {
  score?: number;
  remarks?: string | null;
}

export interface AssessmentTypeResponseDto {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
}

export interface AssessmentTypeSummaryDto {
  id: string;
  code: string;
  name: string;
}

export interface AssessmentSummaryDto {
  gradedCount: number;
  expectedCount: number;
  averageScore: number | null;
  averagePercentage: number | null;
}

export interface AssessmentClassSummaryDto {
  id: string;
  className: string;
  section: string;
  gradeLevel: {
    id: string;
    name: string;
  };
}

export interface AssessmentSubjectSummaryDto {
  id: string;
  name: string;
  code: string | null;
}

export interface AssessmentTeacherSummaryDto {
  teacherId: string;
  userId: string;
  fullName: string;
  email: string | null;
  phone: string | null;
}

export interface AssessmentAcademicYearSummaryDto {
  id: string;
  name: string;
}

export interface AssessmentSemesterSummaryDto {
  id: string;
  name: string;
}

export interface AssessmentResponseDto {
  id: string;
  assessmentType: AssessmentTypeSummaryDto;
  class: AssessmentClassSummaryDto;
  subject: AssessmentSubjectSummaryDto;
  teacher: AssessmentTeacherSummaryDto;
  academicYear: AssessmentAcademicYearSummaryDto;
  semester: AssessmentSemesterSummaryDto;
  title: string;
  description: string | null;
  maxScore: number;
  weight: number;
  assessmentDate: string;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AssessmentListItemResponseDto extends AssessmentResponseDto {
  summary: AssessmentSummaryDto;
}

export interface AssessmentDetailResponseDto {
  assessment: AssessmentResponseDto;
  summary: AssessmentSummaryDto;
}

export interface AssessmentStudentScoreResponseDto {
  studentId: string;
  academicNo: string;
  fullName: string;
  status: string;
  studentAssessmentId: string | null;
  score: number | null;
  remarks: string | null;
  gradedAt: string | null;
  percentage: number | null;
}

export interface AssessmentScoresResponseDto {
  assessment: AssessmentResponseDto;
  students: AssessmentStudentScoreResponseDto[];
  summary: AssessmentSummaryDto;
}

export interface StudentAssessmentResponseDto {
  studentAssessmentId: string;
  assessmentId: string;
  studentId: string;
  academicNo: string;
  fullName: string;
  score: number;
  remarks: string | null;
  gradedAt: string | null;
  percentage: number | null;
}
