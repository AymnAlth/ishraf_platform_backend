import type {
  AdminOperationalDigestFeaturePayload,
  AdminOperationalDigestInsight,
  ClassOverviewFeaturePayload,
  ClassOverviewInsight,
  StudentRiskFeaturePayload,
  StudentRiskInsight,
  TeacherComplianceFeaturePayload,
  TeacherComplianceInsight,
  TransportRouteAnomalyFeaturePayload,
  TransportRouteAnomalyInsight
} from "../../../integrations/ai/types/ai-analytics-provider.types";
import type { AiAnalyticsProvider } from "../../system-settings/types/system-settings.types";

export const ANALYTICS_ANALYSIS_TYPE_VALUES = [
  "student_risk_summary",
  "teacher_compliance_summary",
  "admin_operational_digest",
  "class_overview",
  "transport_route_anomaly_summary"
] as const;
export const ANALYTICS_RECOMPUTE_TARGET_VALUES = [
  "student_risk_summary",
  "teacher_compliance_summary",
  "admin_operational_digest",
  "class_overview",
  "transport_route_anomaly_summary",
  "all_supported"
] as const;

export const ANALYTICS_SUBJECT_TYPE_VALUES = ["student", "teacher", "system", "class", "route"] as const;
export const ANALYTICS_JOB_STATUS_VALUES = [
  "pending",
  "processing",
  "completed",
  "failed",
  "dead"
] as const;
export const ANALYTICS_SCHEDULER_TRIGGER_MODE_VALUES = ["autonomous_dispatch"] as const;
export const ANALYTICS_SCHEDULER_RUN_STATUS_VALUES = ["processing", "completed", "failed"] as const;
export const ANALYTICS_SNAPSHOT_REVIEW_STATUS_VALUES = [
  "draft",
  "approved",
  "rejected",
  "superseded"
] as const;
export const ANALYTICS_OUTBOX_PROVIDER_KEY = "analytics";
export const ANALYTICS_OUTBOX_EVENT_TYPE = "analytics_job_execute";
export const ANALYTICS_ADMIN_DIGEST_SUBJECT_ID = "0";

export type AnalyticsAnalysisType = (typeof ANALYTICS_ANALYSIS_TYPE_VALUES)[number];
export type AnalyticsRecomputeTarget = (typeof ANALYTICS_RECOMPUTE_TARGET_VALUES)[number];
export type AnalyticsSubjectType = (typeof ANALYTICS_SUBJECT_TYPE_VALUES)[number];
export type AnalyticsJobStatus = (typeof ANALYTICS_JOB_STATUS_VALUES)[number];
export type AnalyticsSchedulerTriggerMode = (typeof ANALYTICS_SCHEDULER_TRIGGER_MODE_VALUES)[number];
export type AnalyticsSchedulerRunStatus = (typeof ANALYTICS_SCHEDULER_RUN_STATUS_VALUES)[number];
export type AnalyticsSnapshotReviewStatus =
  (typeof ANALYTICS_SNAPSHOT_REVIEW_STATUS_VALUES)[number];

export interface AnalyticsJobRow {
  id: string;
  analysisType: AnalyticsAnalysisType;
  subjectType: AnalyticsSubjectType;
  subjectId: string;
  academicYearId: string;
  semesterId: string;
  requestedByUserId: string;
  status: AnalyticsJobStatus;
  primaryProvider: AiAnalyticsProvider;
  fallbackProvider: AiAnalyticsProvider;
  selectedProvider: AiAnalyticsProvider | null;
  fallbackUsed: boolean;
  inputJson: unknown;
  snapshotId: string | null;
  startedAt: Date | null;
  completedAt: Date | null;
  lastErrorCode: string | null;
  lastErrorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AnalyticsSnapshotRow {
  id: string;
  analysisType: AnalyticsAnalysisType;
  subjectType: AnalyticsSubjectType;
  subjectId: string;
  academicYearId: string;
  semesterId: string;
  sourceJobId: string | null;
  providerKey: AiAnalyticsProvider | null;
  fallbackUsed: boolean;
  reviewStatus: AnalyticsSnapshotReviewStatus;
  reviewedByUserId: string | null;
  reviewedAt: Date | null;
  publishedAt: Date | null;
  reviewNotes: string | null;
  featurePayloadJson: unknown;
  resultJson: unknown;
  computedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface AnalyticsFeedbackRow {
  id: string;
  snapshotId: string;
  userId: string;
  userFullName: string;
  userRole: string;
  rating: number | null;
  feedbackText: string | null;
  createdAt: Date;
}

export interface AnalyticsFeedbackAggregateRow {
  analysisType: AnalyticsAnalysisType;
  subjectType: AnalyticsSubjectType;
  subjectId: string;
  academicYearId: string;
  semesterId: string;
  totalFeedbackCount: number;
  averageRating: number | null;
  positiveFeedbackCount: number;
  negativeFeedbackCount: number;
  neutralFeedbackCount: number;
  latestFeedbackAt: Date | null;
  recentFeedbackTexts: string[];
}

export interface AnalyticsSchedulerRunRow {
  id: string;
  triggerMode: AnalyticsSchedulerTriggerMode;
  status: AnalyticsSchedulerRunStatus;
  requestedByUserId: string;
  academicYearId: string;
  semesterId: string;
  staleBefore: Date;
  scheduledTargetsJson: AnalyticsAnalysisType[];
  summaryJson: unknown;
  startedAt: Date;
  completedAt: Date | null;
  lastErrorCode: string | null;
  lastErrorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AnalyticsJobWriteInput {
  analysisType: AnalyticsAnalysisType;
  subjectType: AnalyticsSubjectType;
  subjectId: string;
  academicYearId: string;
  semesterId: string;
  requestedByUserId: string;
  primaryProvider: AiAnalyticsProvider;
  fallbackProvider: AiAnalyticsProvider;
  inputJson: unknown;
}

export interface AnalyticsSnapshotWriteInput {
  analysisType: AnalyticsAnalysisType;
  subjectType: AnalyticsSubjectType;
  subjectId: string;
  academicYearId: string;
  semesterId: string;
  sourceJobId: string | null;
  providerKey: AiAnalyticsProvider | null;
  fallbackUsed: boolean;
  featurePayloadJson: unknown;
  resultJson: unknown;
  computedAt: Date;
}

export interface AnalyticsSnapshotReviewWriteInput {
  reviewStatus: Extract<AnalyticsSnapshotReviewStatus, "approved" | "rejected" | "superseded">;
  reviewedByUserId: string;
  reviewedAt: Date;
  publishedAt: Date | null;
  reviewNotes: string | null;
}

export interface AnalyticsFeedbackWriteInput {
  snapshotId: string;
  userId: string;
  rating: number | null;
  feedbackText: string | null;
}

export interface AnalyticsSchedulerRunWriteInput {
  triggerMode: AnalyticsSchedulerTriggerMode;
  requestedByUserId: string;
  academicYearId: string;
  semesterId: string;
  staleBefore: Date;
  scheduledTargetsJson: AnalyticsAnalysisType[];
  summaryJson?: unknown;
}

export interface AnalyticsObsoleteSnapshotCleanupResult {
  deletedSnapshotCount: number;
  cascadedFeedbackCount: number;
}

export interface AnalyticsStudentSubjectRow {
  studentId: string;
  fullName: string;
}

export interface AnalyticsScheduledStudentCandidateRow {
  studentId: string;
  fullName: string;
  latestComputedAt: Date | null;
}

export interface AnalyticsScheduledTeacherCandidateRow {
  teacherId: string;
  teacherUserId: string;
  fullName: string;
  latestComputedAt: Date | null;
}

export interface AnalyticsScheduledClassCandidateRow {
  classId: string;
  className: string;
  section: string | null;
  gradeLevelName: string;
  latestComputedAt: Date | null;
}

export interface AnalyticsScheduledRouteCandidateRow {
  routeId: string;
  routeName: string;
  latestComputedAt: Date | null;
}

export interface AnalyticsJobExecuteOutboxPayload {
  jobId: string;
}

export interface AnalyticsStudentHomeworkSummaryRow {
  totalHomework: number;
  submittedCount: number;
  lateCount: number;
  notSubmittedCount: number;
}

export interface AnalyticsTeacherAttendanceSummaryRow {
  sessionCount: number;
  recordedCount: number;
  expectedCount: number;
  coveragePercentage: number | null;
  lastSessionDate: Date | null;
}

export interface AnalyticsTeacherAssessmentSummaryRow {
  assessmentCount: number;
  publishedCount: number;
  gradedCount: number;
  expectedCount: number;
  publicationPercentage: number | null;
  gradingCoveragePercentage: number | null;
  lastAssessmentDate: Date | null;
}

export interface AnalyticsTeacherHomeworkSummaryRow {
  homeworkCount: number;
  recordedCount: number;
  expectedCount: number;
  submissionCoveragePercentage: number | null;
  lastDueDate: Date | null;
}

export interface AnalyticsTeacherBehaviorSummaryRow {
  totalRecords: number;
  positiveRecords: number;
  negativeRecords: number;
  lastBehaviorDate: Date | null;
}

export interface AnalyticsTeacherAssignmentCountRow {
  totalAssignments: number;
}

export interface AnalyticsOperationalAttendanceSummaryRow {
  sessionCount: number;
  recordedCount: number;
  expectedCount: number;
  coveragePercentage: number | null;
}

export interface AnalyticsOperationalAssessmentSummaryRow {
  assessmentCount: number;
  publishedCount: number;
  gradedCount: number;
  expectedCount: number;
  publicationPercentage: number | null;
  gradingCoveragePercentage: number | null;
}

export interface AnalyticsOperationalHomeworkSummaryRow {
  homeworkCount: number;
  recordedCount: number;
  expectedCount: number;
  submissionCoveragePercentage: number | null;
}

export interface AnalyticsOperationalBehaviorSummaryRow {
  totalRecords: number;
  negativeRecords: number;
  highSeverityNegativeRecords: number;
}

export interface AnalyticsClassHomeworkSummaryRow {
  totalHomework: number;
  submittedCount: number;
  lateCount: number;
  notSubmittedCount: number;
  averageSubmissionPercentage: number | null;
  studentsBelowSubmissionThreshold: number;
}

export interface AnalyticsTransportRouteOperationalSummaryRow {
  totalTrips: number;
  completedTrips: number;
  endedTrips: number;
  cancelledTrips: number;
  activeTrips: number;
  tripsWithLocations: number;
  tripsWithoutLocations: number;
  tripsWithEvents: number;
  tripsWithoutEvents: number;
  totalBoardedCount: number;
  totalDroppedOffCount: number;
  totalAbsentCount: number;
  etaFreshCount: number;
  etaStaleCount: number;
  etaUnavailableCount: number;
  etaCompletedCount: number;
  averageStopCompletionPercentage: number | null;
  averageActualDurationMinutes: number | null;
  delayedTripsCount: number;
  staleActiveTripsCount: number;
}

export interface AnalyticsStudentRiskSnapshot {
  featurePayload: StudentRiskFeaturePayload;
  insight: StudentRiskInsight;
}

export interface AnalyticsTeacherComplianceSnapshot {
  featurePayload: TeacherComplianceFeaturePayload;
  insight: TeacherComplianceInsight;
}

export interface AnalyticsAdminOperationalDigestSnapshot {
  featurePayload: AdminOperationalDigestFeaturePayload;
  insight: AdminOperationalDigestInsight;
}

export interface AnalyticsClassOverviewSnapshot {
  featurePayload: ClassOverviewFeaturePayload;
  insight: ClassOverviewInsight;
}

export interface AnalyticsTransportRouteAnomalySnapshot {
  featurePayload: TransportRouteAnomalyFeaturePayload;
  insight: TransportRouteAnomalyInsight;
}

export const isAnalyticsJobExecuteOutboxPayload = (
  value: unknown
): value is AnalyticsJobExecuteOutboxPayload => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const payload = value as Record<string, unknown>;

  return typeof payload.jobId === "string" && payload.jobId.trim().length > 0;
};
