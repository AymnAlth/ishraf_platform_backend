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
import type {
  AnalyticsAnalysisType,
  AnalyticsJobStatus,
  AnalyticsRecomputeTarget,
  AnalyticsSnapshotReviewStatus,
  AnalyticsSubjectType
} from "../types/analytics.types";

export interface AnalyticsJobIdParamsDto {
  jobId: string;
}

export interface AnalyticsSnapshotIdParamsDto {
  snapshotId: string;
}

export interface AnalyticsStudentIdParamsDto {
  studentId: string;
}

export interface AnalyticsTeacherIdParamsDto {
  teacherId: string;
}

export interface AnalyticsClassIdParamsDto {
  classId: string;
}

export interface AnalyticsRouteIdParamsDto {
  routeId: string;
}

export interface CreateStudentRiskJobRequestDto {
  studentId: string;
}

export interface CreateTeacherComplianceJobRequestDto {
  teacherId: string;
}

export interface CreateAdminOperationalDigestJobRequestDto {}

export interface CreateClassOverviewJobRequestDto {
  classId: string;
}

export interface CreateTransportRouteAnomalyJobRequestDto {
  routeId: string;
}

export interface CreateAnalyticsRecomputeJobRequestDto {
  target: AnalyticsRecomputeTarget;
  studentIds?: string[];
  teacherIds?: string[];
  classIds?: string[];
  routeIds?: string[];
}

export interface CreateAnalyticsRetentionCleanupRequestDto {}

export interface CreateAnalyticsFeedbackRequestDto {
  rating?: number;
  feedbackText?: string;
}

export interface ReviewAnalyticsSnapshotRequestDto {
  action: "approve" | "reject";
  reviewNotes?: string;
}

export interface AnalyticsSnapshotPublicationDto {
  snapshotId: string;
  reviewStatus: AnalyticsSnapshotReviewStatus;
  reviewedAt: string | null;
  publishedAt: string | null;
}

export interface AnalyticsSnapshotReviewResponseDto extends AnalyticsSnapshotPublicationDto {
  reviewedByUserId: string | null;
  reviewNotes: string | null;
}

export interface AnalyticsRetentionCleanupResponseDto {
  executedAt: string;
  retention: {
    obsoleteSnapshotRetentionDays: number;
    jobRetentionDays: number;
    schedulerRunRetentionDays: number;
    obsoleteSnapshotCutoff: string;
    jobCutoff: string;
    schedulerRunCutoff: string;
  };
  summary: {
    deletedSnapshots: number;
    cascadedFeedbackCount: number;
    deletedJobs: number;
    deletedSchedulerRuns: number;
  };
}

export interface AnalyticsJobResponseDto {
  jobId: string;
  analysisType: AnalyticsAnalysisType;
  subjectType: AnalyticsSubjectType;
  subjectId: string;
  academicYearId: string;
  semesterId: string;
  status: AnalyticsJobStatus;
  primaryProvider: string;
  fallbackProvider: string;
  selectedProvider: string | null;
  fallbackUsed: boolean;
  snapshotId: string | null;
  lastErrorCode: string | null;
  lastErrorMessage: string | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
}

export interface AnalyticsJobDispatchResponseDto {
  created: boolean;
  job: AnalyticsJobResponseDto;
}

export interface AnalyticsRecomputeBreakdownItemDto {
  analysisType: AnalyticsAnalysisType;
  totalJobs: number;
  createdCount: number;
  reusedCount: number;
}

export interface AnalyticsRecomputeResponseDto {
  target: AnalyticsRecomputeTarget;
  activeContext: {
    academicYearId: string;
    academicYearName: string;
    semesterId: string;
    semesterName: string;
  };
  summary: {
    totalJobs: number;
    createdCount: number;
    reusedCount: number;
  };
  breakdown: AnalyticsRecomputeBreakdownItemDto[];
  items: AnalyticsJobDispatchResponseDto[];
}

export interface AnalyticsScheduledDispatchBreakdownItemDto {
  analysisType: AnalyticsAnalysisType;
  eligibleCount: number;
  dispatchedCount: number;
  reusedCount: number;
}

export interface AnalyticsScheduledDispatchResponseDto {
  triggerMode: "admin_scheduled_dispatch";
  activeContext: {
    academicYearId: string;
    academicYearName: string;
    semesterId: string;
    semesterName: string;
  };
  schedule: {
    intervalMinutes: number;
    maxSubjectsPerTarget: number;
    staleBefore: string;
    targets: AnalyticsAnalysisType[];
  };
  summary: {
    totalEligibleSubjects: number;
    dispatchedCount: number;
    reusedCount: number;
  };
  breakdown: AnalyticsScheduledDispatchBreakdownItemDto[];
  items: AnalyticsJobDispatchResponseDto[];
}

export interface AnalyticsFeedbackResponseDto {
  feedbackId: string;
  snapshotId: string;
  user: {
    userId: string;
    fullName: string;
    role: string;
  };
  rating: number | null;
  feedbackText: string | null;
  createdAt: string;
}

export interface AnalyticsFeedbackListResponseDto {
  items: AnalyticsFeedbackResponseDto[];
}

export interface AnalyticsStudentRiskSummaryResponseDto {
  snapshot: AnalyticsSnapshotPublicationDto;
  student: StudentRiskFeaturePayload["student"];
  analysisMode: "ai_assisted" | "deterministic_only";
  providerKey: string | null;
  fallbackUsed: boolean;
  computedAt: string;
  featurePayload: StudentRiskFeaturePayload;
  insight: StudentRiskInsight;
}

export interface AnalyticsTeacherComplianceSummaryResponseDto {
  snapshot: AnalyticsSnapshotPublicationDto;
  teacher: TeacherComplianceFeaturePayload["teacher"];
  analysisMode: "ai_assisted" | "deterministic_only";
  providerKey: string | null;
  fallbackUsed: boolean;
  computedAt: string;
  featurePayload: TeacherComplianceFeaturePayload;
  insight: TeacherComplianceInsight;
}

export interface AnalyticsAdminOperationalDigestSummaryResponseDto {
  snapshot: AnalyticsSnapshotPublicationDto;
  context: AdminOperationalDigestFeaturePayload["context"];
  analysisMode: "ai_assisted" | "deterministic_only";
  providerKey: string | null;
  fallbackUsed: boolean;
  computedAt: string;
  featurePayload: AdminOperationalDigestFeaturePayload;
  insight: AdminOperationalDigestInsight;
}

export interface AnalyticsClassOverviewSummaryResponseDto {
  snapshot: AnalyticsSnapshotPublicationDto;
  class: ClassOverviewFeaturePayload["class"];
  analysisMode: "ai_assisted" | "deterministic_only";
  providerKey: string | null;
  fallbackUsed: boolean;
  computedAt: string;
  featurePayload: ClassOverviewFeaturePayload;
  insight: ClassOverviewInsight;
}

export interface AnalyticsTransportRouteAnomalySummaryResponseDto {
  snapshot: AnalyticsSnapshotPublicationDto;
  route: TransportRouteAnomalyFeaturePayload["route"];
  analysisMode: "ai_assisted" | "deterministic_only";
  providerKey: string | null;
  fallbackUsed: boolean;
  computedAt: string;
  featurePayload: TransportRouteAnomalyFeaturePayload;
  insight: TransportRouteAnomalyInsight;
}
