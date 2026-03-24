import type { HomeworkSubmissionStatus } from "../types/homework.types";

export interface HomeworkIdParamsDto {
  id: string;
}

export interface HomeworkStudentIdParamsDto {
  studentId: string;
}

export interface CreateHomeworkRequestDto {
  teacherId?: string;
  classId: string;
  subjectId: string;
  academicYearId: string;
  semesterId: string;
  title: string;
  description?: string | null;
  assignedDate: string;
  dueDate: string;
}

export interface ListHomeworkQueryDto {
  page: number;
  limit: number;
  sortBy: "dueDate" | "assignedDate" | "createdAt" | "title";
  sortOrder: "asc" | "desc";
  classId?: string;
  subjectId?: string;
  teacherId?: string;
  academicYearId?: string;
  semesterId?: string;
  assignedDate?: string;
  dueDate?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface SaveHomeworkSubmissionsRequestDto {
  records: Array<{
    studentId: string;
    status: HomeworkSubmissionStatus;
    submittedAt?: string | null;
    notes?: string | null;
  }>;
}

export interface HomeworkListItemResponseDto {
  id: string;
  title: string;
  description: string | null;
  assignedDate: string;
  dueDate: string;
  class: {
    id: string;
    className: string;
    section: string;
    gradeLevel: {
      id: string;
      name: string;
    };
  };
  subject: {
    id: string;
    name: string;
  };
  teacher: {
    id: string;
    userId: string;
    fullName: string;
    email: string | null;
    phone: string | null;
  };
  academicYear: {
    id: string;
    name: string;
  };
  semester: {
    id: string;
    name: string;
  };
  summary: {
    submittedCount: number;
    notSubmittedCount: number;
    lateCount: number;
    recordedCount: number;
    expectedCount: number;
  };
}

export interface HomeworkStudentSubmissionResponseDto {
  studentId: string;
  academicNo: string;
  fullName: string;
  studentStatus: string;
  submissionId: string | null;
  status: HomeworkSubmissionStatus | null;
  submittedAt: string | null;
  notes: string | null;
}

export interface HomeworkDetailResponseDto {
  homework: HomeworkListItemResponseDto;
  students: HomeworkStudentSubmissionResponseDto[];
}

export interface StudentHomeworkItemResponseDto {
  homeworkId: string;
  title: string;
  description: string | null;
  assignedDate: string;
  dueDate: string;
  class: {
    id: string;
    className: string;
    section: string;
  };
  subject: {
    id: string;
    name: string;
  };
  teacher: {
    id: string;
    fullName: string;
  };
  academicYear: {
    id: string;
    name: string;
  };
  semester: {
    id: string;
    name: string;
  };
  submission: {
    submissionId: string | null;
    status: HomeworkSubmissionStatus | null;
    submittedAt: string | null;
    notes: string | null;
  };
}

export interface StudentHomeworkListResponseDto {
  student: {
    id: string;
    academicNo: string;
    fullName: string;
    currentClass: {
      id: string;
      className: string;
      section: string;
      academicYear: {
        id: string;
        name: string;
      };
    };
  };
  items: StudentHomeworkItemResponseDto[];
}
