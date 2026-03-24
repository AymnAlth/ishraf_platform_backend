export interface BehaviorCategoryIdParamsDto {
  id: string;
}

export interface BehaviorRecordIdParamsDto {
  id: string;
}

export interface BehaviorStudentIdParamsDto {
  studentId: string;
}

export interface CreateBehaviorCategoryRequestDto {
  code: string;
  name: string;
  behaviorType: "positive" | "negative";
  defaultSeverity: number;
  isActive?: boolean;
}

export interface BehaviorCategoryResponseDto {
  id: string;
  code: string;
  name: string;
  behaviorType: "positive" | "negative";
  defaultSeverity: number;
  isActive: boolean;
}

export interface CreateBehaviorRecordRequestDto {
  studentId: string;
  behaviorCategoryId: string;
  academicYearId: string;
  semesterId: string;
  description?: string | null;
  severity?: number;
  behaviorDate: string;
  teacherId?: string;
  supervisorId?: string;
}

export interface ListBehaviorRecordsQueryDto {
  page: number;
  limit: number;
  sortBy: "behaviorDate" | "createdAt" | "severity";
  sortOrder: "asc" | "desc";
  studentId?: string;
  behaviorCategoryId?: string;
  behaviorType?: "positive" | "negative";
  academicYearId?: string;
  semesterId?: string;
  teacherId?: string;
  supervisorId?: string;
  behaviorDate?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface UpdateBehaviorRecordRequestDto {
  behaviorCategoryId?: string;
  academicYearId?: string;
  semesterId?: string;
  description?: string | null;
  severity?: number;
  behaviorDate?: string;
}

export interface BehaviorRecordResponseDto {
  id: string;
  student: {
    id: string;
    academicNo: string;
    fullName: string;
  };
  category: {
    id: string;
    code: string;
    name: string;
    behaviorType: "positive" | "negative";
  };
  actorType: "teacher" | "supervisor";
  actor: {
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
  description: string | null;
  severity: number;
  behaviorDate: string;
  createdAt: string;
}

export interface StudentBehaviorSummaryDto {
  totalBehaviorRecords: number;
  positiveCount: number;
  negativeCount: number;
  negativeSeverityTotal: number;
}

export interface StudentBehaviorRecordsResponseDto {
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
  summary: StudentBehaviorSummaryDto;
  records: BehaviorRecordResponseDto[];
}
