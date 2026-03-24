export interface ActivePeriodRow {
  academicYearId: string;
  academicYearName: string;
  semesterId: string;
  semesterName: string;
}

export interface ReportingStudentRow {
  studentId: string;
  academicNo: string;
  fullName: string;
  dateOfBirth: Date;
  gender: "male" | "female";
  status: string;
  enrollmentDate: Date;
  classId: string;
  className: string;
  section: string;
  gradeLevelId: string;
  gradeLevelName: string;
  academicYearId: string;
  academicYearName: string;
}

export interface ReportingStudentParentRow {
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

export interface StudentAttendanceSummaryRow {
  studentId: string;
  academicNo: string;
  studentName: string;
  classId: string;
  className: string;
  section: string;
  academicYearId: string;
  academicYearName: string;
  semesterId: string;
  semesterName: string;
  totalSessions: number | string;
  presentCount: number | string;
  absentCount: number | string;
  lateCount: number | string;
  excusedCount: number | string;
  attendancePercentage: number | string | null;
}

export interface StudentAssessmentSummaryRow {
  studentId: string;
  academicNo: string;
  studentName: string;
  classId: string;
  className: string;
  section: string;
  academicYearId: string;
  academicYearName: string;
  semesterId: string;
  semesterName: string;
  subjectId: string;
  subjectName: string;
  totalAssessments: number | string;
  totalScore: number | string | null;
  totalMaxScore: number | string | null;
  overallPercentage: number | string | null;
}

export interface StudentBehaviorSummaryRow {
  studentId: string;
  academicNo: string;
  studentName: string;
  academicYearId: string;
  academicYearName: string;
  semesterId: string;
  semesterName: string;
  totalBehaviorRecords: number | string;
  positiveCount: number | string;
  negativeCount: number | string;
  negativeSeverityTotal: number | string;
}

export interface ParentProfileRow {
  parentId: string;
  userId: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  relationType: string | null;
}

export interface TeacherProfileRow {
  teacherId: string;
  userId: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  specialization: string | null;
  qualification: string | null;
  hireDate: Date | null;
}

export interface SupervisorProfileRow {
  supervisorId: string;
  userId: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  department: string | null;
}

export interface DriverProfileRow {
  driverId: string;
  userId: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  licenseNumber: string;
  driverStatus: string;
}

export interface NotificationRow {
  id: string;
  userId: string;
  userName: string;
  title: string;
  message: string;
  notificationType: string;
  referenceType: string | null;
  referenceId: string | null;
  isRead: boolean;
  createdAt: Date;
  readAt: Date | null;
}

export interface NotificationSummaryRow {
  totalNotifications: number | string;
  unreadNotifications: number | string;
}

export interface TeacherAssignmentRow {
  teacherClassId: string;
  classId: string;
  className: string;
  section: string;
  gradeLevelId: string;
  gradeLevelName: string;
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  academicYearId: string;
  academicYearName: string;
  createdAt: Date;
}

export interface RecentAttendanceSessionRow {
  id: string;
  classId: string;
  className: string;
  section: string;
  subjectId: string;
  subjectName: string;
  academicYearId: string;
  academicYearName: string;
  semesterId: string;
  semesterName: string;
  sessionDate: Date | string;
  periodNo: number;
  title: string | null;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  excusedCount: number;
  recordedCount: number;
  expectedCount: number;
}

export interface RecentAssessmentRow {
  id: string;
  assessmentTypeId: string;
  assessmentTypeCode: string;
  assessmentTypeName: string;
  classId: string;
  className: string;
  section: string;
  gradeLevelId: string;
  gradeLevelName: string;
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  teacherId: string;
  teacherUserId: string;
  teacherFullName: string;
  teacherEmail: string | null;
  teacherPhone: string | null;
  academicYearId: string;
  academicYearName: string;
  semesterId: string;
  semesterName: string;
  title: string;
  description: string | null;
  maxScore: number | string;
  weight: number | string;
  assessmentDate: Date | string;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
  gradedCount: number;
  expectedCount: number;
  averageScore: number | string | null;
  averagePercentage: number | string | null;
}

export interface RecentBehaviorRecordRow {
  id: string;
  studentId: string;
  academicNo: string;
  studentFullName: string;
  behaviorCategoryId: string;
  behaviorCode: string;
  behaviorName: string;
  behaviorType: "positive" | "negative";
  teacherId: string | null;
  teacherFullName: string | null;
  supervisorId: string | null;
  supervisorFullName: string | null;
  academicYearId: string;
  academicYearName: string;
  semesterId: string;
  semesterName: string;
  description: string | null;
  severity: number;
  behaviorDate: Date | string;
  createdAt: Date;
}

export interface AdminDashboardSummaryRow {
  totalActiveUsers: number | string;
  totalActiveStudents: number | string;
  totalTeachers: number | string;
  totalSupervisors: number | string;
  totalDrivers: number | string;
  totalActiveClasses: number | string;
  totalActiveRoutes: number | string;
  totalActiveBuses: number | string;
  totalActiveTrips: number | string;
}

export interface RecentStudentRow {
  studentId: string;
  academicNo: string;
  fullName: string;
  status: string;
  classId: string;
  className: string;
  section: string;
  gradeLevelId: string;
  gradeLevelName: string;
  academicYearId: string;
  academicYearName: string;
  createdAt: Date;
}

export interface AnnouncementRow {
  id: string;
  title: string;
  content: string;
  targetRole: string | null;
  publishedAt: Date;
  expiresAt: Date | null;
  createdBy: string;
  createdByName: string;
}

export interface ActiveTripLiveStatusRow {
  tripId: string;
  tripDate: Date | string;
  tripType: string;
  tripStatus: string;
  busId: string;
  plateNumber: string;
  driverId: string | null;
  driverName: string | null;
  routeId: string;
  routeName: string;
  latitude: number | string | null;
  longitude: number | string | null;
  lastLocationAt: Date | null;
}

export interface TripStudentEventRow {
  tripStudentEventId: string;
  tripId: string;
  tripDate: Date | string;
  tripType: string;
  tripStatus: string;
  studentId: string;
  academicNo: string;
  studentName: string;
  eventType: "boarded" | "dropped_off" | "absent";
  eventTime: Date;
  stopId: string | null;
  stopName: string | null;
  notes: string | null;
}

export interface SupervisorAssignmentRow {
  supervisorClassId: string;
  classId: string;
  className: string;
  section: string;
  gradeLevelId: string;
  gradeLevelName: string;
  academicYearId: string;
  academicYearName: string;
  createdAt: Date;
}

export interface ActiveStudentTransportAssignmentRow {
  assignmentId: string;
  studentId: string;
  academicNo: string;
  studentName: string;
  routeId: string;
  routeName: string;
  stopId: string;
  stopName: string;
  startDate: Date | string;
  endDate: Date | string | null;
  isActive: boolean;
}
