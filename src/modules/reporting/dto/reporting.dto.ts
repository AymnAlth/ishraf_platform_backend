export interface ReportingAcademicYearDto {
  id: string;
  name: string;
}

export interface ReportingGradeLevelDto {
  id: string;
  name: string;
}

export interface ReportingClassDto {
  id: string;
  className: string;
  section: string;
  gradeLevel: ReportingGradeLevelDto;
  academicYear: ReportingAcademicYearDto;
}

export interface ReportingStudentDto {
  id: string;
  academicNo: string;
  fullName: string;
  dateOfBirth: string;
  gender: "male" | "female";
  status: string;
  enrollmentDate: string;
  currentClass: ReportingClassDto;
}

export interface ReportingStudentParentDto {
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

export interface ReportingAttendanceSummaryDto {
  totalSessions: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  excusedCount: number;
  attendancePercentage: number;
}

export interface ReportingBehaviorSummaryDto {
  totalBehaviorRecords: number;
  positiveCount: number;
  negativeCount: number;
  negativeSeverityTotal: number;
}

export interface ReportingAssessmentSubjectSummaryDto {
  subject: {
    id: string;
    name: string;
  };
  totalAssessments: number;
  totalScore: number;
  totalMaxScore: number;
  overallPercentage: number;
}

export interface ReportingAssessmentSummaryDto {
  totalAssessments: number;
  totalScore: number;
  totalMaxScore: number;
  overallPercentage: number;
  subjects: ReportingAssessmentSubjectSummaryDto[];
}

export interface ReportingStudentProfileResponseDto {
  student: ReportingStudentDto;
  parents: ReportingStudentParentDto[];
  attendanceSummary: ReportingAttendanceSummaryDto;
  behaviorSummary: ReportingBehaviorSummaryDto;
  assessmentSummary: ReportingAssessmentSummaryDto;
}

export interface ReportingStudentAttendanceReportResponseDto {
  student: ReportingStudentDto;
  attendanceSummary: ReportingAttendanceSummaryDto;
}

export interface ReportingStudentAssessmentReportResponseDto {
  student: ReportingStudentDto;
  assessmentSummary: ReportingAssessmentSummaryDto;
}

export interface ReportingStudentBehaviorReportResponseDto {
  student: ReportingStudentDto;
  behaviorSummary: ReportingBehaviorSummaryDto;
}

export interface ReportingParentDto {
  parentId: string;
  userId: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  relationType: string | null;
}

export interface ReportingParentChildDto {
  student: ReportingStudentDto;
  attendanceSummary: ReportingAttendanceSummaryDto;
  behaviorSummary: ReportingBehaviorSummaryDto;
  assessmentSummary: ReportingAssessmentSummaryDto;
}

export interface ReportingNotificationDto {
  id: string;
  title: string;
  message: string;
  notificationType: string;
  referenceType: string | null;
  referenceId: string | null;
  isRead: boolean;
  createdAt: string;
  readAt: string | null;
}

export interface ReportingParentDashboardResponseDto {
  parent: ReportingParentDto;
  children: ReportingParentChildDto[];
  latestNotifications: ReportingNotificationDto[];
  unreadNotifications: number;
}

export interface ReportingTeacherDto {
  teacherId: string;
  userId: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  specialization: string | null;
  qualification: string | null;
  hireDate: string | null;
}

export interface ReportingTeacherAssignmentDto {
  teacherClassId: string;
  class: ReportingClassDto;
  subject: {
    id: string;
    name: string;
    code: string;
  };
  academicYear: ReportingAcademicYearDto;
  createdAt: string;
}

export interface ReportingRecentAttendanceSessionDto {
  id: string;
  sessionDate: string;
  periodNo: number;
  title: string | null;
  class: {
    id: string;
    className: string;
    section: string;
  };
  subject: {
    id: string;
    name: string;
  };
  counts: {
    presentCount: number;
    absentCount: number;
    lateCount: number;
    excusedCount: number;
    recordedCount: number;
    expectedCount: number;
  };
}

export interface ReportingRecentAssessmentDto {
  id: string;
  title: string;
  assessmentDate: string;
  assessmentType: {
    id: string;
    code: string;
    name: string;
  };
  class: {
    id: string;
    className: string;
    section: string;
    gradeLevel: ReportingGradeLevelDto;
  };
  subject: {
    id: string;
    name: string;
    code: string;
  };
  summary: {
    gradedCount: number;
    expectedCount: number;
    averageScore: number | null;
    averagePercentage: number | null;
  };
}

export interface ReportingRecentBehaviorRecordDto {
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
  description: string | null;
  severity: number;
  behaviorDate: string;
  createdAt: string;
}

export interface ReportingTeacherDashboardResponseDto {
  teacher: ReportingTeacherDto;
  assignments: ReportingTeacherAssignmentDto[];
  recentAttendanceSessions: ReportingRecentAttendanceSessionDto[];
  recentAssessments: ReportingRecentAssessmentDto[];
  recentBehaviorRecords: ReportingRecentBehaviorRecordDto[];
}

export interface ReportingAdminDashboardSummaryDto {
  totalActiveUsers: number;
  totalActiveStudents: number;
  totalTeachers: number;
  totalSupervisors: number;
  totalDrivers: number;
  totalActiveClasses: number;
  totalActiveRoutes: number;
  totalActiveBuses: number;
  totalActiveTrips: number;
}

export interface ReportingRecentStudentDto {
  studentId: string;
  academicNo: string;
  fullName: string;
  status: string;
  currentClass: ReportingClassDto;
  createdAt: string;
}

export interface ReportingAnnouncementDto {
  id: string;
  title: string;
  content: string;
  targetRole: string | null;
  publishedAt: string;
  expiresAt: string | null;
  createdBy: {
    userId: string;
    fullName: string;
  };
}

export interface ReportingTripEventDto {
  tripStudentEventId: string;
  student: {
    studentId: string;
    academicNo: string;
    fullName: string;
  };
  eventType: "boarded" | "dropped_off" | "absent";
  eventTime: string;
  stop: {
    stopId: string;
    stopName: string;
  } | null;
  notes: string | null;
}

export interface ReportingTransportTripDto {
  tripId: string;
  tripDate: string;
  tripType: string;
  tripStatus: string;
  bus: {
    busId: string;
    plateNumber: string;
  };
  driver: {
    driverId: string | null;
    fullName: string | null;
  };
  route: {
    routeId: string;
    routeName: string;
  };
  latestLocation: {
    latitude: number;
    longitude: number;
    recordedAt: string;
  } | null;
  latestEvents: ReportingTripEventDto[];
}

export interface ReportingAdminDashboardResponseDto {
  summary: ReportingAdminDashboardSummaryDto;
  recentStudents: ReportingRecentStudentDto[];
  recentAnnouncements: ReportingAnnouncementDto[];
  activeTrips: ReportingTransportTripDto[];
}

export interface ReportingTransportSummaryResponseDto {
  activeTrips: ReportingTransportTripDto[];
}

export interface ReportingStudentIdParamsDto {
  studentId: string;
}

export interface ReportingParentPreviewParamsDto {
  parentUserId: string;
}

export interface ReportingParentPreviewStudentParamsDto {
  parentUserId: string;
  studentId: string;
}

export interface ReportingTeacherPreviewParamsDto {
  teacherUserId: string;
}

export interface ReportingSupervisorPreviewParamsDto {
  supervisorUserId: string;
}

export interface ReportingSupervisorDto {
  supervisorId: string;
  userId: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  department: string | null;
}

export interface ReportingSupervisorAssignmentDto {
  supervisorClassId: string;
  class: ReportingClassDto;
  academicYear: ReportingAcademicYearDto;
  createdAt: string;
}

export interface ReportingSupervisorStudentSummaryDto {
  student: ReportingStudentDto;
  attendanceSummary: ReportingAttendanceSummaryDto;
  behaviorSummary: ReportingBehaviorSummaryDto;
  assessmentSummary: ReportingAssessmentSummaryDto;
}

export interface ReportingSupervisorDashboardResponseDto {
  supervisor: ReportingSupervisorDto;
  assignments: ReportingSupervisorAssignmentDto[];
  studentSummaries: ReportingSupervisorStudentSummaryDto[];
  recentBehaviorRecords: ReportingRecentBehaviorRecordDto[];
}

export interface ReportingParentTransportAssignmentDto {
  assignmentId: string;
  route: {
    routeId: string;
    routeName: string;
  };
  stop: {
    stopId: string;
    stopName: string;
  };
  startDate: string;
  endDate: string | null;
  isActive: boolean;
}

export interface ReportingParentTransportLiveStatusResponseDto {
  student: ReportingStudentDto;
  assignment: ReportingParentTransportAssignmentDto | null;
  activeTrip: {
    tripId: string;
    tripDate: string;
    tripType: string;
    tripStatus: string;
    bus: {
      busId: string;
      plateNumber: string;
    };
    driver: {
      driverId: string | null;
      fullName: string | null;
    };
    latestLocation: {
      latitude: number;
      longitude: number;
      recordedAt: string;
    } | null;
    latestEvents: ReportingTripEventDto[];
  } | null;
}
