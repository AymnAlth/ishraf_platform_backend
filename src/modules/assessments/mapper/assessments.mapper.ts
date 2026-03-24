import type {
  AssessmentDetailResponseDto,
  AssessmentListItemResponseDto,
  AssessmentResponseDto,
  AssessmentScoresResponseDto,
  AssessmentStudentScoreResponseDto,
  AssessmentSummaryDto,
  AssessmentTypeResponseDto,
  StudentAssessmentResponseDto
} from "../dto/assessments.dto";
import type {
  AssessmentRow,
  AssessmentScoreRosterRow,
  AssessmentTypeRow,
  StudentAssessmentRow
} from "../types/assessments.types";

const toDateOnly = (value: Date | string): string =>
  typeof value === "string" ? value.slice(0, 10) : value.toISOString().slice(0, 10);

const toNullableNumber = (value: number | string | null): number | null =>
  value === null ? null : Number(value);

const toNumber = (value: number | string): number => Number(value);

export const toAssessmentTypeResponseDto = (
  row: AssessmentTypeRow
): AssessmentTypeResponseDto => ({
  id: row.id,
  code: row.code,
  name: row.name,
  description: row.description,
  isActive: row.isActive
});

export const toAssessmentSummaryDto = (row: AssessmentRow): AssessmentSummaryDto => ({
  gradedCount: row.gradedCount,
  expectedCount: row.expectedCount,
  averageScore: toNullableNumber(row.averageScore),
  averagePercentage: toNullableNumber(row.averagePercentage)
});

export const toAssessmentResponseDto = (row: AssessmentRow): AssessmentResponseDto => ({
  id: row.id,
  assessmentType: {
    id: row.assessmentTypeId,
    code: row.assessmentTypeCode,
    name: row.assessmentTypeName
  },
  class: {
    id: row.classId,
    className: row.className,
    section: row.section,
    gradeLevel: {
      id: row.gradeLevelId,
      name: row.gradeLevelName
    }
  },
  subject: {
    id: row.subjectId,
    name: row.subjectName,
    code: row.subjectCode
  },
  teacher: {
    teacherId: row.teacherId,
    userId: row.teacherUserId,
    fullName: row.teacherFullName,
    email: row.teacherEmail,
    phone: row.teacherPhone
  },
  academicYear: {
    id: row.academicYearId,
    name: row.academicYearName
  },
  semester: {
    id: row.semesterId,
    name: row.semesterName
  },
  title: row.title,
  description: row.description,
  maxScore: toNumber(row.maxScore),
  weight: toNumber(row.weight),
  assessmentDate: toDateOnly(row.assessmentDate),
  isPublished: row.isPublished,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString()
});

export const toAssessmentListItemResponseDto = (
  row: AssessmentRow
): AssessmentListItemResponseDto => ({
  ...toAssessmentResponseDto(row),
  summary: toAssessmentSummaryDto(row)
});

export const toAssessmentDetailResponseDto = (
  row: AssessmentRow
): AssessmentDetailResponseDto => ({
  assessment: toAssessmentResponseDto(row),
  summary: toAssessmentSummaryDto(row)
});

export const toAssessmentStudentScoreResponseDto = (
  row: AssessmentScoreRosterRow
): AssessmentStudentScoreResponseDto => ({
  studentId: row.studentId,
  academicNo: row.academicNo,
  fullName: row.fullName,
  status: row.studentStatus,
  studentAssessmentId: row.studentAssessmentId,
  score: toNullableNumber(row.score),
  remarks: row.remarks,
  gradedAt: row.gradedAt ? row.gradedAt.toISOString() : null,
  percentage: toNullableNumber(row.percentage)
});

export const toAssessmentScoresResponseDto = (
  assessment: AssessmentRow,
  students: AssessmentScoreRosterRow[]
): AssessmentScoresResponseDto => ({
  assessment: toAssessmentResponseDto(assessment),
  students: students.map((student) => toAssessmentStudentScoreResponseDto(student)),
  summary: toAssessmentSummaryDto(assessment)
});

export const toStudentAssessmentResponseDto = (
  row: StudentAssessmentRow
): StudentAssessmentResponseDto => ({
  studentAssessmentId: row.studentAssessmentId,
  assessmentId: row.assessmentId,
  studentId: row.studentId,
  academicNo: row.academicNo,
  fullName: row.fullName,
  score: toNumber(row.score),
  remarks: row.remarks,
  gradedAt: row.gradedAt ? row.gradedAt.toISOString() : null,
  percentage: toNullableNumber(row.percentage)
});
