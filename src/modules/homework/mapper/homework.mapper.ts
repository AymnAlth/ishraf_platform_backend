import type {
  HomeworkDetailResponseDto,
  HomeworkListItemResponseDto,
  HomeworkStudentSubmissionResponseDto,
  StudentHomeworkItemResponseDto,
  StudentHomeworkListResponseDto
} from "../dto/homework.dto";
import type {
  HomeworkRow,
  HomeworkSubmissionRosterRow,
  StudentHomeworkRow,
  StudentReferenceRow
} from "../types/homework.types";

const toDateOnly = (value: Date | string): string =>
  typeof value === "string" ? value.slice(0, 10) : value.toISOString().slice(0, 10);

const toIsoString = (value: Date | string | null): string | null => {
  if (!value) {
    return null;
  }

  if (typeof value === "string") {
    return value;
  }

  return value.toISOString();
};

export const toHomeworkListItemResponseDto = (
  row: HomeworkRow
): HomeworkListItemResponseDto => ({
  id: row.id,
  title: row.title,
  description: row.description,
  assignedDate: toDateOnly(row.assignedDate),
  dueDate: toDateOnly(row.dueDate),
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
    name: row.subjectName
  },
  teacher: {
    id: row.teacherId,
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
  summary: {
    submittedCount: row.submittedCount,
    notSubmittedCount: row.notSubmittedCount,
    lateCount: row.lateCount,
    recordedCount: row.recordedCount,
    expectedCount: row.expectedCount
  }
});

export const toHomeworkStudentSubmissionResponseDto = (
  row: HomeworkSubmissionRosterRow
): HomeworkStudentSubmissionResponseDto => ({
  studentId: row.studentId,
  academicNo: row.academicNo,
  fullName: row.fullName,
  studentStatus: row.studentStatus,
  submissionId: row.submissionId,
  status: row.status,
  submittedAt: toIsoString(row.submittedAt),
  notes: row.notes
});

export const toHomeworkDetailResponseDto = (
  homework: HomeworkRow,
  students: HomeworkSubmissionRosterRow[]
): HomeworkDetailResponseDto => ({
  homework: toHomeworkListItemResponseDto(homework),
  students: students.map((row) => toHomeworkStudentSubmissionResponseDto(row))
});

export const toStudentHomeworkItemResponseDto = (
  row: StudentHomeworkRow
): StudentHomeworkItemResponseDto => ({
  homeworkId: row.homeworkId,
  title: row.title,
  description: row.description,
  assignedDate: toDateOnly(row.assignedDate),
  dueDate: toDateOnly(row.dueDate),
  class: {
    id: row.classId,
    className: row.className,
    section: row.section
  },
  subject: {
    id: row.subjectId,
    name: row.subjectName
  },
  teacher: {
    id: row.teacherId,
    fullName: row.teacherName
  },
  academicYear: {
    id: row.academicYearId,
    name: row.academicYearName
  },
  semester: {
    id: row.semesterId,
    name: row.semesterName
  },
  submission: {
    submissionId: row.submissionId,
    status: row.status,
    submittedAt: toIsoString(row.submittedAt),
    notes: row.notes
  }
});

export const toStudentHomeworkListResponseDto = (
  student: StudentReferenceRow,
  items: StudentHomeworkRow[]
): StudentHomeworkListResponseDto => ({
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
  items: items.map((row) => toStudentHomeworkItemResponseDto(row))
});
