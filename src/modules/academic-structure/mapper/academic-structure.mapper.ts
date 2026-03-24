import type {
  AcademicYearResponseDto,
  AcademicYearSummaryDto,
  ClassResponseDto,
  ClassSummaryDto,
  GradeLevelResponseDto,
  GradeLevelSummaryDto,
  SemesterResponseDto,
  SubjectResponseDto,
  SubjectSummaryDto,
  SupervisorAssignmentResponseDto,
  TeacherAssignmentResponseDto,
  UserSummaryDto
} from "../dto/academic-structure.dto";
import type {
  AcademicYearRow,
  ClassRow,
  GradeLevelRow,
  SemesterRow,
  SubjectRow,
  SupervisorAssignmentRow,
  TeacherAssignmentRow
} from "../types/academic-structure.types";

const padDatePart = (value: number): string => value.toString().padStart(2, "0");

const toDateOnly = (value: Date): string =>
  `${value.getFullYear()}-${padDatePart(value.getMonth() + 1)}-${padDatePart(
    value.getDate()
  )}`;

const toAcademicYearSummary = (
  id: string,
  name: string
): AcademicYearSummaryDto => ({
  id,
  name
});

const toGradeLevelSummary = (
  id: string,
  name: string,
  levelOrder: number
): GradeLevelSummaryDto => ({
  id,
  name,
  levelOrder
});

const toUserSummary = (
  id: string,
  userId: string,
  fullName: string,
  email: string | null,
  phone: string | null
): UserSummaryDto => ({
  id,
  userId,
  fullName,
  email,
  phone
});

export const toAcademicYearResponseDto = (
  row: AcademicYearRow
): AcademicYearResponseDto => ({
  id: row.id,
  name: row.name,
  startDate: toDateOnly(row.startDate),
  endDate: toDateOnly(row.endDate),
  isActive: row.isActive,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString()
});

export const toSemesterResponseDto = (row: SemesterRow): SemesterResponseDto => ({
  id: row.id,
  academicYear: toAcademicYearSummary(row.academicYearId, row.academicYearName),
  name: row.name,
  startDate: toDateOnly(row.startDate),
  endDate: toDateOnly(row.endDate),
  isActive: row.isActive,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString()
});

export const toGradeLevelResponseDto = (
  row: GradeLevelRow
): GradeLevelResponseDto => ({
  id: row.id,
  name: row.name,
  levelOrder: row.levelOrder,
  createdAt: row.createdAt.toISOString()
});

export const toClassSummaryDto = (row: ClassRow): ClassSummaryDto => ({
  id: row.id,
  className: row.className,
  section: row.section,
  isActive: row.isActive,
  gradeLevel: toGradeLevelSummary(row.gradeLevelId, row.gradeLevelName, row.gradeLevelOrder)
});

export const toClassResponseDto = (row: ClassRow): ClassResponseDto => ({
  id: row.id,
  className: row.className,
  section: row.section,
  capacity: row.capacity,
  isActive: row.isActive,
  academicYear: toAcademicYearSummary(row.academicYearId, row.academicYearName),
  gradeLevel: toGradeLevelSummary(row.gradeLevelId, row.gradeLevelName, row.gradeLevelOrder),
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString()
});

export const toSubjectSummaryDto = (row: SubjectRow): SubjectSummaryDto => ({
  id: row.id,
  name: row.name,
  code: row.code,
  isActive: row.isActive,
  gradeLevel: toGradeLevelSummary(row.gradeLevelId, row.gradeLevelName, row.gradeLevelOrder)
});

export const toSubjectResponseDto = (row: SubjectRow): SubjectResponseDto => ({
  id: row.id,
  name: row.name,
  code: row.code,
  isActive: row.isActive,
  gradeLevel: toGradeLevelSummary(row.gradeLevelId, row.gradeLevelName, row.gradeLevelOrder),
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString()
});

export const toTeacherAssignmentResponseDto = (
  row: TeacherAssignmentRow
): TeacherAssignmentResponseDto => ({
  id: row.id,
  academicYear: toAcademicYearSummary(row.academicYearId, row.academicYearName),
  class: {
    id: row.classId,
    className: row.className,
    section: row.classSection,
    isActive: row.classIsActive,
    gradeLevel: toGradeLevelSummary(
      row.classGradeLevelId,
      row.classGradeLevelName,
      row.classGradeLevelOrder
    )
  },
  subject: {
    id: row.subjectId,
    name: row.subjectName,
    code: row.subjectCode,
    isActive: row.subjectIsActive,
    gradeLevel: toGradeLevelSummary(
      row.classGradeLevelId,
      row.classGradeLevelName,
      row.classGradeLevelOrder
    )
  },
  teacher: toUserSummary(
    row.teacherId,
    row.teacherUserId,
    row.teacherFullName,
    row.teacherEmail,
    row.teacherPhone
  ),
  createdAt: row.createdAt.toISOString()
});

export const toSupervisorAssignmentResponseDto = (
  row: SupervisorAssignmentRow
): SupervisorAssignmentResponseDto => ({
  id: row.id,
  academicYear: toAcademicYearSummary(row.academicYearId, row.academicYearName),
  class: {
    id: row.classId,
    className: row.className,
    section: row.classSection,
    isActive: row.classIsActive,
    gradeLevel: toGradeLevelSummary(
      row.classGradeLevelId,
      row.classGradeLevelName,
      row.classGradeLevelOrder
    )
  },
  supervisor: toUserSummary(
    row.supervisorId,
    row.supervisorUserId,
    row.supervisorFullName,
    row.supervisorEmail,
    row.supervisorPhone
  ),
  createdAt: row.createdAt.toISOString()
});
