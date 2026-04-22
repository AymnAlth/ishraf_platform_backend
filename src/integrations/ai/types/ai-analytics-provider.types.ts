export const AI_ANALYTICS_PROVIDER_KEYS = ["openai", "groq"] as const;

export type AiAnalyticsProviderKey = (typeof AI_ANALYTICS_PROVIDER_KEYS)[number];

export const STUDENT_RISK_LEVEL_VALUES = ["low", "medium", "high"] as const;
export const TEACHER_COMPLIANCE_LEVEL_VALUES = ["strong", "watch", "critical"] as const;
export const ADMIN_OPERATIONAL_STATUS_VALUES = ["stable", "watch", "critical"] as const;
export const CLASS_HEALTH_STATUS_VALUES = ["stable", "watch", "critical"] as const;
export const TRANSPORT_ROUTE_ANOMALY_STATUS_VALUES = ["stable", "watch", "critical"] as const;

export type StudentRiskLevel = (typeof STUDENT_RISK_LEVEL_VALUES)[number];
export type TeacherComplianceLevel = (typeof TEACHER_COMPLIANCE_LEVEL_VALUES)[number];
export type AdminOperationalStatus = (typeof ADMIN_OPERATIONAL_STATUS_VALUES)[number];
export type ClassHealthStatus = (typeof CLASS_HEALTH_STATUS_VALUES)[number];
export type TransportRouteAnomalyStatus =
  (typeof TRANSPORT_ROUTE_ANOMALY_STATUS_VALUES)[number];

export interface AnalyticsNarrativeFeedbackContext {
  totalFeedbackCount: number;
  averageRating: number | null;
  positiveFeedbackCount: number;
  negativeFeedbackCount: number;
  neutralFeedbackCount: number;
  latestFeedbackAt: string | null;
  recentFeedbackTexts: string[];
}

export interface AnalyticsNarrativeRefinementContext {
  feedback: AnalyticsNarrativeFeedbackContext | null;
}

export interface StudentRiskFeaturePayload {
  student: {
    studentId: string;
    academicNo: string;
    fullName: string;
    classId: string;
    className: string;
    section: string | null;
    academicYearId: string;
    academicYearName: string;
    semesterId: string;
    semesterName: string;
  };
  attendance: {
    totalSessions: number;
    presentCount: number;
    absentCount: number;
    lateCount: number;
    excusedCount: number;
    attendancePercentage: number | null;
  };
  assessments: {
    totalSubjects: number;
    averagePercentage: number | null;
    lowPerformanceSubjects: Array<{
      subjectId: string;
      subjectName: string;
      overallPercentage: number | null;
    }>;
  };
  behavior: {
    totalBehaviorRecords: number;
    positiveCount: number;
    negativeCount: number;
    negativeSeverityTotal: number;
  };
  homework: {
    totalHomework: number;
    submittedCount: number;
    lateCount: number;
    notSubmittedCount: number;
    submissionPercentage: number | null;
  };
  computed: {
    riskScore: number;
    riskLevel: StudentRiskLevel;
    confidenceScore: number;
    keySignals: string[];
  };
}

export interface TeacherComplianceFeaturePayload {
  teacher: {
    teacherId: string;
    teacherUserId: string;
    fullName: string;
    specialization: string | null;
    academicYearId: string;
    academicYearName: string;
    semesterId: string;
    semesterName: string;
  };
  assignments: {
    totalAssignments: number;
  };
  attendance: {
    sessionCount: number;
    recordedCount: number;
    expectedCount: number;
    coveragePercentage: number | null;
    lastSessionDate: string | null;
  };
  assessments: {
    assessmentCount: number;
    publishedCount: number;
    gradedCount: number;
    expectedCount: number;
    publicationPercentage: number | null;
    gradingCoveragePercentage: number | null;
    lastAssessmentDate: string | null;
  };
  homework: {
    homeworkCount: number;
    recordedCount: number;
    expectedCount: number;
    submissionCoveragePercentage: number | null;
    lastDueDate: string | null;
  };
  behavior: {
    totalRecords: number;
    positiveRecords: number;
    negativeRecords: number;
    lastBehaviorDate: string | null;
  };
  computed: {
    complianceScore: number;
    complianceLevel: TeacherComplianceLevel;
    confidenceScore: number;
    keySignals: string[];
    operationalGaps: string[];
  };
}

export interface AdminOperationalDigestFeaturePayload {
  context: {
    academicYearId: string;
    academicYearName: string;
    semesterId: string;
    semesterName: string;
  };
  overview: {
    totalActiveStudents: number;
    totalActiveClasses: number;
    totalTeachers: number;
    totalSupervisors: number;
    totalDrivers: number;
    totalActiveTrips: number;
    totalActiveRoutes: number;
    totalActiveBuses: number;
  };
  attendance: {
    sessionCount: number;
    recordedCount: number;
    expectedCount: number;
    coveragePercentage: number | null;
  };
  assessments: {
    assessmentCount: number;
    publishedCount: number;
    gradedCount: number;
    expectedCount: number;
    publicationPercentage: number | null;
    gradingCoveragePercentage: number | null;
  };
  homework: {
    homeworkCount: number;
    recordedCount: number;
    expectedCount: number;
    submissionCoveragePercentage: number | null;
  };
  behavior: {
    totalRecords: number;
    negativeRecords: number;
    highSeverityNegativeRecords: number;
  };
  computed: {
    operationalScore: number;
    status: AdminOperationalStatus;
    confidenceScore: number;
    keySignals: string[];
  };
}

export interface ClassOverviewFeaturePayload {
  class: {
    classId: string;
    className: string;
    section: string | null;
    capacity: number | null;
    gradeLevelId: string;
    gradeLevelName: string;
    academicYearId: string;
    academicYearName: string;
    semesterId: string;
    semesterName: string;
  };
  roster: {
    activeStudents: number;
    capacity: number | null;
    occupancyPercentage: number | null;
  };
  attendance: {
    studentsWithSessions: number;
    averageAttendancePercentage: number | null;
    studentsBelowThreshold: number;
    chronicAbsenceStudents: number;
  };
  assessments: {
    studentsWithAssessments: number;
    overallAveragePercentage: number | null;
    lowPerformanceStudents: number;
    lowPerformanceSubjects: Array<{
      subjectId: string;
      subjectName: string;
      averagePercentage: number | null;
    }>;
  };
  behavior: {
    studentsWithNegativeRecords: number;
    totalNegativeRecords: number;
    negativeSeverityTotal: number;
    positiveRecords: number;
  };
  homework: {
    totalHomework: number;
    submittedCount: number;
    lateCount: number;
    notSubmittedCount: number;
    averageSubmissionPercentage: number | null;
    studentsBelowSubmissionThreshold: number;
  };
  computed: {
    classHealthScore: number;
    status: ClassHealthStatus;
    confidenceScore: number;
    keySignals: string[];
  };
}

export interface TransportRouteAnomalyFeaturePayload {
  route: {
    routeId: string;
    routeName: string;
    startPoint: string;
    endPoint: string;
    stopCount: number;
    estimatedDurationMinutes: number;
    academicYearId: string;
    academicYearName: string;
    semesterId: string;
    semesterName: string;
  };
  inputWindow: {
    fromDate: string;
    toDate: string;
    totalDays: number;
  };
  trips: {
    totalTrips: number;
    completedTrips: number;
    endedTrips: number;
    cancelledTrips: number;
    activeTrips: number;
    completionPercentage: number | null;
    manualClosurePercentage: number | null;
    cancellationPercentage: number | null;
    tripsWithLocations: number;
    tripsWithoutLocations: number;
    tripsWithEvents: number;
    tripsWithoutEvents: number;
    averageActualDurationMinutes: number | null;
    delayedTripsCount: number;
    staleActiveTripsCount: number;
  };
  events: {
    totalBoardedCount: number;
    totalDroppedOffCount: number;
    totalAbsentCount: number;
    averageBoardedPerTrip: number | null;
    averageAbsentPerTrip: number | null;
  };
  eta: {
    freshSnapshots: number;
    staleSnapshots: number;
    unavailableSnapshots: number;
    completedSnapshots: number;
    averageStopCompletionPercentage: number | null;
  };
  computed: {
    anomalyScore: number;
    status: TransportRouteAnomalyStatus;
    confidenceScore: number;
    keySignals: string[];
    anomalyFlags: string[];
  };
}

export interface StudentRiskInsight {
  riskLevel: StudentRiskLevel;
  confidenceScore: number;
  summary: string;
  keySignals: string[];
  adminRecommendations: string[];
  parentGuidance: string[];
}

export interface TeacherComplianceInsight {
  complianceLevel: TeacherComplianceLevel;
  confidenceScore: number;
  summary: string;
  keySignals: string[];
  operationalGaps: string[];
  adminRecommendations: string[];
}

export interface AdminOperationalDigestInsight {
  status: AdminOperationalStatus;
  confidenceScore: number;
  summary: string;
  keySignals: string[];
  adminRecommendations: string[];
  priorityActions: string[];
}

export interface ClassOverviewInsight {
  status: ClassHealthStatus;
  confidenceScore: number;
  summary: string;
  keySignals: string[];
  recommendedActions: string[];
  focusAreas: string[];
}

export interface TransportRouteAnomalyInsight {
  status: TransportRouteAnomalyStatus;
  confidenceScore: number;
  summary: string;
  keySignals: string[];
  anomalyFlags: string[];
  recommendedActions: string[];
}

export class AiAnalyticsProviderError extends Error {
  constructor(
    public readonly providerKey: AiAnalyticsProviderKey,
    public readonly code: string,
    message: string,
    public readonly retryable = true
  ) {
    super(message);
    this.name = "AiAnalyticsProviderError";
  }
}

export interface AiAnalyticsProviderPort {
  readonly providerKey: AiAnalyticsProviderKey;
  isConfigured(): boolean;
  generateStudentRiskInsight(
    payload: StudentRiskFeaturePayload,
    refinementContext?: AnalyticsNarrativeRefinementContext
  ): Promise<StudentRiskInsight>;
  generateTeacherComplianceInsight(
    payload: TeacherComplianceFeaturePayload,
    refinementContext?: AnalyticsNarrativeRefinementContext
  ): Promise<TeacherComplianceInsight>;
  generateAdminOperationalDigestInsight(
    payload: AdminOperationalDigestFeaturePayload,
    refinementContext?: AnalyticsNarrativeRefinementContext
  ): Promise<AdminOperationalDigestInsight>;
  generateClassOverviewInsight(
    payload: ClassOverviewFeaturePayload,
    refinementContext?: AnalyticsNarrativeRefinementContext
  ): Promise<ClassOverviewInsight>;
  generateTransportRouteAnomalyInsight(
    payload: TransportRouteAnomalyFeaturePayload,
    refinementContext?: AnalyticsNarrativeRefinementContext
  ): Promise<TransportRouteAnomalyInsight>;
}
