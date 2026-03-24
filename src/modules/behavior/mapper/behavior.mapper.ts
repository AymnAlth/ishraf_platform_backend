import type {
  BehaviorCategoryResponseDto,
  BehaviorRecordResponseDto,
  StudentBehaviorRecordsResponseDto,
  StudentBehaviorSummaryDto
} from "../dto/behavior.dto";
import type {
  BehaviorCategoryRow,
  BehaviorRecordRow,
  BehaviorStudentSummaryRow,
  StudentBehaviorReferenceRow
} from "../types/behavior.types";

const toDateOnly = (value: Date | string): string =>
  typeof value === "string" ? value.slice(0, 10) : value.toISOString().slice(0, 10);

const toNumber = (value: number | string): number => Number(value);

export const toBehaviorCategoryResponseDto = (
  row: BehaviorCategoryRow
): BehaviorCategoryResponseDto => ({
  id: row.id,
  code: row.code,
  name: row.name,
  behaviorType: row.behaviorType,
  defaultSeverity: row.defaultSeverity,
  isActive: row.isActive
});

export const toBehaviorRecordResponseDto = (
  row: BehaviorRecordRow
): BehaviorRecordResponseDto => {
  const actorType = row.teacherId ? "teacher" : "supervisor";
  const actorId = row.teacherId ?? row.supervisorId ?? "";
  const actorFullName = row.teacherFullName ?? row.supervisorFullName ?? "";

  return {
    id: row.id,
    student: {
      id: row.studentId,
      academicNo: row.academicNo,
      fullName: row.studentFullName
    },
    category: {
      id: row.behaviorCategoryId,
      code: row.behaviorCode,
      name: row.behaviorName,
      behaviorType: row.behaviorType
    },
    actorType,
    actor: {
      id: actorId,
      fullName: actorFullName
    },
    academicYear: {
      id: row.academicYearId,
      name: row.academicYearName
    },
    semester: {
      id: row.semesterId,
      name: row.semesterName
    },
    description: row.description,
    severity: row.severity,
    behaviorDate: toDateOnly(row.behaviorDate),
    createdAt: row.createdAt.toISOString()
  };
};

export const toBehaviorStudentSummaryDto = (
  row: BehaviorStudentSummaryRow
): StudentBehaviorSummaryDto => ({
  totalBehaviorRecords: toNumber(row.totalBehaviorRecords),
  positiveCount: toNumber(row.positiveCount),
  negativeCount: toNumber(row.negativeCount),
  negativeSeverityTotal: toNumber(row.negativeSeverityTotal)
});

export const toStudentBehaviorRecordsResponseDto = (
  student: StudentBehaviorReferenceRow,
  summary: StudentBehaviorSummaryDto,
  records: BehaviorRecordRow[]
): StudentBehaviorRecordsResponseDto => ({
  student: {
    id: student.studentId,
    academicNo: student.academicNo,
    fullName: student.fullName,
    currentClass: {
      id: student.classId,
      className: student.className,
      section: student.section,
      academicYear: {
        id: student.academicYearId,
        name: student.academicYearName
      }
    }
  },
  summary,
  records: records.map((record) => toBehaviorRecordResponseDto(record))
});
