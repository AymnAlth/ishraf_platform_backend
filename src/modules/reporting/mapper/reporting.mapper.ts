import type {
  ReportingAdminDashboardResponseDto,
  ReportingAdminDashboardSummaryDto,
  ReportingAnnouncementDto,
  ReportingAssessmentSubjectSummaryDto,
  ReportingAssessmentSummaryDto,
  ReportingAttendanceSummaryDto,
  ReportingBehaviorSummaryDto,
  ReportingNotificationDto,
  ReportingParentChildDto,
  ReportingParentDashboardResponseDto,
  ReportingParentDto,
  ReportingRecentAssessmentDto,
  ReportingRecentAttendanceSessionDto,
  ReportingRecentBehaviorRecordDto,
  ReportingRecentStudentDto,
  ReportingStudentAssessmentReportResponseDto,
  ReportingStudentAttendanceReportResponseDto,
  ReportingStudentBehaviorReportResponseDto,
  ReportingStudentDto,
  ReportingStudentParentDto,
  ReportingStudentProfileResponseDto,
  ReportingTeacherAssignmentDto,
  ReportingTeacherDashboardResponseDto,
  ReportingTeacherDto,
  ReportingTransportSummaryResponseDto,
  ReportingTransportTripDto,
  ReportingTripEventDto
} from "../dto/reporting.dto";
import type {
  ActiveTripLiveStatusRow,
  AdminDashboardSummaryRow,
  AnnouncementRow,
  NotificationRow,
  ParentProfileRow,
  RecentAssessmentRow,
  RecentAttendanceSessionRow,
  RecentBehaviorRecordRow,
  RecentStudentRow,
  ReportingStudentParentRow,
  ReportingStudentRow,
  StudentAssessmentSummaryRow,
  StudentAttendanceSummaryRow,
  StudentBehaviorSummaryRow,
  TeacherAssignmentRow,
  TeacherProfileRow,
  TripStudentEventRow
} from "../types/reporting.types";

const toDateOnly = (value: Date | string): string =>
  typeof value === "string" ? value.slice(0, 10) : value.toISOString().slice(0, 10);

const toIsoString = (value: Date): string => value.toISOString();

const toNumber = (value: number | string | null | undefined): number =>
  value === null || value === undefined ? 0 : Number(value);

const toNullableNumber = (value: number | string | null | undefined): number | null =>
  value === null || value === undefined ? null : Number(value);

export const emptyAttendanceSummary = (): ReportingAttendanceSummaryDto => ({
  totalSessions: 0,
  presentCount: 0,
  absentCount: 0,
  lateCount: 0,
  excusedCount: 0,
  attendancePercentage: 0
});

export const emptyBehaviorSummary = (): ReportingBehaviorSummaryDto => ({
  totalBehaviorRecords: 0,
  positiveCount: 0,
  negativeCount: 0,
  negativeSeverityTotal: 0
});

export const emptyAssessmentSummary = (): ReportingAssessmentSummaryDto => ({
  totalAssessments: 0,
  totalScore: 0,
  totalMaxScore: 0,
  overallPercentage: 0,
  subjects: []
});

const toStudentClassDto = (row: ReportingStudentRow) => ({
  id: row.classId,
  className: row.className,
  section: row.section,
  gradeLevel: {
    id: row.gradeLevelId,
    name: row.gradeLevelName
  },
  academicYear: {
    id: row.academicYearId,
    name: row.academicYearName
  }
});

export const toReportingStudentDto = (row: ReportingStudentRow): ReportingStudentDto => ({
  id: row.studentId,
  academicNo: row.academicNo,
  fullName: row.fullName,
  dateOfBirth: toDateOnly(row.dateOfBirth),
  gender: row.gender,
  status: row.status,
  enrollmentDate: toDateOnly(row.enrollmentDate),
  currentClass: toStudentClassDto(row)
});

export const toReportingStudentParentDto = (
  row: ReportingStudentParentRow
): ReportingStudentParentDto => ({
  linkId: row.linkId,
  parentId: row.parentId,
  userId: row.userId,
  fullName: row.fullName,
  email: row.email,
  phone: row.phone,
  relationType: row.relationType,
  isPrimary: row.isPrimary,
  address: row.address
});

export const toAttendanceSummaryDto = (
  row: StudentAttendanceSummaryRow | null
): ReportingAttendanceSummaryDto =>
  row
    ? {
        totalSessions: toNumber(row.totalSessions),
        presentCount: toNumber(row.presentCount),
        absentCount: toNumber(row.absentCount),
        lateCount: toNumber(row.lateCount),
        excusedCount: toNumber(row.excusedCount),
        attendancePercentage: toNumber(row.attendancePercentage)
      }
    : emptyAttendanceSummary();

export const toBehaviorSummaryDto = (
  row: StudentBehaviorSummaryRow | null
): ReportingBehaviorSummaryDto =>
  row
    ? {
        totalBehaviorRecords: toNumber(row.totalBehaviorRecords),
        positiveCount: toNumber(row.positiveCount),
        negativeCount: toNumber(row.negativeCount),
        negativeSeverityTotal: toNumber(row.negativeSeverityTotal)
      }
    : emptyBehaviorSummary();

export const toAssessmentSummaryDto = (
  rows: StudentAssessmentSummaryRow[]
): ReportingAssessmentSummaryDto => {
  if (rows.length === 0) {
    return emptyAssessmentSummary();
  }

  const subjects: ReportingAssessmentSubjectSummaryDto[] = rows.map((row) => ({
    subject: {
      id: row.subjectId,
      name: row.subjectName
    },
    totalAssessments: toNumber(row.totalAssessments),
    totalScore: toNumber(row.totalScore),
    totalMaxScore: toNumber(row.totalMaxScore),
    overallPercentage: toNumber(row.overallPercentage)
  }));

  const totalAssessments = subjects.reduce((sum, item) => sum + item.totalAssessments, 0);
  const totalScore = subjects.reduce((sum, item) => sum + item.totalScore, 0);
  const totalMaxScore = subjects.reduce((sum, item) => sum + item.totalMaxScore, 0);

  return {
    totalAssessments,
    totalScore,
    totalMaxScore,
    overallPercentage:
      totalMaxScore > 0 ? Number(((100 * totalScore) / totalMaxScore).toFixed(2)) : 0,
    subjects
  };
};

export const toStudentProfileResponseDto = (
  student: ReportingStudentRow,
  parents: ReportingStudentParentRow[],
  attendanceSummary: StudentAttendanceSummaryRow | null,
  behaviorSummary: StudentBehaviorSummaryRow | null,
  assessmentSummary: StudentAssessmentSummaryRow[]
): ReportingStudentProfileResponseDto => ({
  student: toReportingStudentDto(student),
  parents: parents.map((row) => toReportingStudentParentDto(row)),
  attendanceSummary: toAttendanceSummaryDto(attendanceSummary),
  behaviorSummary: toBehaviorSummaryDto(behaviorSummary),
  assessmentSummary: toAssessmentSummaryDto(assessmentSummary)
});

export const toStudentAttendanceReportResponseDto = (
  student: ReportingStudentRow,
  summary: StudentAttendanceSummaryRow | null
): ReportingStudentAttendanceReportResponseDto => ({
  student: toReportingStudentDto(student),
  attendanceSummary: toAttendanceSummaryDto(summary)
});

export const toStudentAssessmentReportResponseDto = (
  student: ReportingStudentRow,
  summaryRows: StudentAssessmentSummaryRow[]
): ReportingStudentAssessmentReportResponseDto => ({
  student: toReportingStudentDto(student),
  assessmentSummary: toAssessmentSummaryDto(summaryRows)
});

export const toStudentBehaviorReportResponseDto = (
  student: ReportingStudentRow,
  summary: StudentBehaviorSummaryRow | null
): ReportingStudentBehaviorReportResponseDto => ({
  student: toReportingStudentDto(student),
  behaviorSummary: toBehaviorSummaryDto(summary)
});

export const toParentDto = (row: ParentProfileRow): ReportingParentDto => ({
  parentId: row.parentId,
  userId: row.userId,
  fullName: row.fullName,
  email: row.email,
  phone: row.phone,
  address: row.address,
  relationType: row.relationType
});

export const toNotificationDto = (row: NotificationRow): ReportingNotificationDto => ({
  id: row.id,
  title: row.title,
  message: row.message,
  notificationType: row.notificationType,
  referenceType: row.referenceType,
  referenceId: row.referenceId,
  isRead: row.isRead,
  createdAt: toIsoString(row.createdAt),
  readAt: row.readAt ? toIsoString(row.readAt) : null
});

export const toParentChildDto = (
  student: ReportingStudentRow,
  attendanceSummary: StudentAttendanceSummaryRow | null,
  behaviorSummary: StudentBehaviorSummaryRow | null,
  assessmentSummary: StudentAssessmentSummaryRow[]
): ReportingParentChildDto => ({
  student: toReportingStudentDto(student),
  attendanceSummary: toAttendanceSummaryDto(attendanceSummary),
  behaviorSummary: toBehaviorSummaryDto(behaviorSummary),
  assessmentSummary: toAssessmentSummaryDto(assessmentSummary)
});

export const toParentDashboardResponseDto = (
  parent: ParentProfileRow,
  children: ReportingParentChildDto[],
  notifications: NotificationRow[],
  unreadNotifications: number
): ReportingParentDashboardResponseDto => ({
  parent: toParentDto(parent),
  children,
  latestNotifications: notifications.map((row) => toNotificationDto(row)),
  unreadNotifications
});

export const toTeacherDto = (row: TeacherProfileRow): ReportingTeacherDto => ({
  teacherId: row.teacherId,
  userId: row.userId,
  fullName: row.fullName,
  email: row.email,
  phone: row.phone,
  specialization: row.specialization,
  qualification: row.qualification,
  hireDate: row.hireDate ? toDateOnly(row.hireDate) : null
});

export const toTeacherAssignmentDto = (
  row: TeacherAssignmentRow
): ReportingTeacherAssignmentDto => ({
  teacherClassId: row.teacherClassId,
  class: {
    id: row.classId,
    className: row.className,
    section: row.section,
    gradeLevel: {
      id: row.gradeLevelId,
      name: row.gradeLevelName
    },
    academicYear: {
      id: row.academicYearId,
      name: row.academicYearName
    }
  },
  subject: {
    id: row.subjectId,
    name: row.subjectName,
    code: row.subjectCode
  },
  academicYear: {
    id: row.academicYearId,
    name: row.academicYearName
  },
  createdAt: toIsoString(row.createdAt)
});

export const toRecentAttendanceSessionDto = (
  row: RecentAttendanceSessionRow
): ReportingRecentAttendanceSessionDto => ({
  id: row.id,
  sessionDate: toDateOnly(row.sessionDate),
  periodNo: row.periodNo,
  title: row.title,
  class: {
    id: row.classId,
    className: row.className,
    section: row.section
  },
  subject: {
    id: row.subjectId,
    name: row.subjectName
  },
  counts: {
    presentCount: row.presentCount,
    absentCount: row.absentCount,
    lateCount: row.lateCount,
    excusedCount: row.excusedCount,
    recordedCount: row.recordedCount,
    expectedCount: row.expectedCount
  }
});

export const toRecentAssessmentDto = (
  row: RecentAssessmentRow
): ReportingRecentAssessmentDto => ({
  id: row.id,
  title: row.title,
  assessmentDate: toDateOnly(row.assessmentDate),
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
  summary: {
    gradedCount: row.gradedCount,
    expectedCount: row.expectedCount,
    averageScore: toNullableNumber(row.averageScore),
    averagePercentage: toNullableNumber(row.averagePercentage)
  }
});

export const toRecentBehaviorRecordDto = (
  row: RecentBehaviorRecordRow
): ReportingRecentBehaviorRecordDto => ({
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
  description: row.description,
  severity: row.severity,
  behaviorDate: toDateOnly(row.behaviorDate),
  createdAt: toIsoString(row.createdAt)
});

export const toTeacherDashboardResponseDto = (
  teacher: TeacherProfileRow,
  assignments: TeacherAssignmentRow[],
  recentAttendanceSessions: RecentAttendanceSessionRow[],
  recentAssessments: RecentAssessmentRow[],
  recentBehaviorRecords: RecentBehaviorRecordRow[]
): ReportingTeacherDashboardResponseDto => ({
  teacher: toTeacherDto(teacher),
  assignments: assignments.map((row) => toTeacherAssignmentDto(row)),
  recentAttendanceSessions: recentAttendanceSessions.map((row) =>
    toRecentAttendanceSessionDto(row)
  ),
  recentAssessments: recentAssessments.map((row) => toRecentAssessmentDto(row)),
  recentBehaviorRecords: recentBehaviorRecords.map((row) =>
    toRecentBehaviorRecordDto(row)
  )
});

export const toAdminDashboardSummaryDto = (
  row: AdminDashboardSummaryRow
): ReportingAdminDashboardSummaryDto => ({
  totalActiveUsers: toNumber(row.totalActiveUsers),
  totalActiveStudents: toNumber(row.totalActiveStudents),
  totalTeachers: toNumber(row.totalTeachers),
  totalSupervisors: toNumber(row.totalSupervisors),
  totalDrivers: toNumber(row.totalDrivers),
  totalActiveClasses: toNumber(row.totalActiveClasses),
  totalActiveRoutes: toNumber(row.totalActiveRoutes),
  totalActiveBuses: toNumber(row.totalActiveBuses),
  totalActiveTrips: toNumber(row.totalActiveTrips)
});

export const toRecentStudentDto = (row: RecentStudentRow): ReportingRecentStudentDto => ({
  studentId: row.studentId,
  academicNo: row.academicNo,
  fullName: row.fullName,
  status: row.status,
  currentClass: {
    id: row.classId,
    className: row.className,
    section: row.section,
    gradeLevel: {
      id: row.gradeLevelId,
      name: row.gradeLevelName
    },
    academicYear: {
      id: row.academicYearId,
      name: row.academicYearName
    }
  },
  createdAt: toIsoString(row.createdAt)
});

export const toAnnouncementDto = (row: AnnouncementRow): ReportingAnnouncementDto => ({
  id: row.id,
  title: row.title,
  content: row.content,
  targetRole: row.targetRole,
  publishedAt: toIsoString(row.publishedAt),
  expiresAt: row.expiresAt ? toIsoString(row.expiresAt) : null,
  createdBy: {
    userId: row.createdBy,
    fullName: row.createdByName
  }
});

export const toTripEventDto = (row: TripStudentEventRow): ReportingTripEventDto => ({
  tripStudentEventId: row.tripStudentEventId,
  student: {
    studentId: row.studentId,
    academicNo: row.academicNo,
    fullName: row.studentName
  },
  eventType: row.eventType,
  eventTime: toIsoString(row.eventTime),
  stop:
    row.stopId && row.stopName
      ? {
          stopId: row.stopId,
          stopName: row.stopName
        }
      : null,
  notes: row.notes
});

export const toTransportTripDto = (
  row: ActiveTripLiveStatusRow,
  latestEvents: TripStudentEventRow[]
): ReportingTransportTripDto => ({
  tripId: row.tripId,
  tripDate: toDateOnly(row.tripDate),
  tripType: row.tripType,
  tripStatus: row.tripStatus,
  bus: {
    busId: row.busId,
    plateNumber: row.plateNumber
  },
  driver: {
    driverId: row.driverId,
    fullName: row.driverName
  },
  route: {
    routeId: row.routeId,
    routeName: row.routeName
  },
  latestLocation:
    row.latitude !== null && row.longitude !== null && row.lastLocationAt
      ? {
          latitude: Number(row.latitude),
          longitude: Number(row.longitude),
          recordedAt: toIsoString(row.lastLocationAt)
        }
      : null,
  latestEvents: latestEvents.map((event) => toTripEventDto(event))
});

export const toAdminDashboardResponseDto = (
  summary: AdminDashboardSummaryRow,
  recentStudents: RecentStudentRow[],
  recentAnnouncements: AnnouncementRow[],
  activeTrips: ReportingTransportTripDto[]
): ReportingAdminDashboardResponseDto => ({
  summary: toAdminDashboardSummaryDto(summary),
  recentStudents: recentStudents.map((row) => toRecentStudentDto(row)),
  recentAnnouncements: recentAnnouncements.map((row) => toAnnouncementDto(row)),
  activeTrips
});

export const toTransportSummaryResponseDto = (
  activeTrips: ReportingTransportTripDto[]
): ReportingTransportSummaryResponseDto => ({
  activeTrips
});
