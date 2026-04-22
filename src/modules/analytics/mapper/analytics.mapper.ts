import type {
  AnalyticsAdminOperationalDigestSummaryResponseDto,
  AnalyticsClassOverviewSummaryResponseDto,
  AnalyticsFeedbackListResponseDto,
  AnalyticsFeedbackResponseDto,
  AnalyticsJobDispatchResponseDto,
  AnalyticsSnapshotPublicationDto,
  AnalyticsSnapshotReviewResponseDto,
  AnalyticsJobResponseDto,
  AnalyticsRecomputeResponseDto,
  AnalyticsRetentionCleanupResponseDto,
  AnalyticsScheduledDispatchBreakdownItemDto,
  AnalyticsScheduledDispatchResponseDto,
  AnalyticsStudentRiskSummaryResponseDto,
  AnalyticsTeacherComplianceSummaryResponseDto,
  AnalyticsTransportRouteAnomalySummaryResponseDto
} from "../dto/analytics.dto";
import type {
  AnalyticsAdminOperationalDigestSnapshot,
  AnalyticsAnalysisType,
  AnalyticsClassOverviewSnapshot,
  AnalyticsFeedbackRow,
  AnalyticsJobRow,
  AnalyticsRecomputeTarget,
  AnalyticsSnapshotRow,
  AnalyticsStudentRiskSnapshot,
  AnalyticsTeacherComplianceSnapshot,
  AnalyticsTransportRouteAnomalySnapshot
} from "../types/analytics.types";

const toIsoString = (value: Date | null): string | null => (value ? value.toISOString() : null);

export const toAnalyticsSnapshotPublicationDto = (
  row: AnalyticsSnapshotRow
): AnalyticsSnapshotPublicationDto => ({
  snapshotId: row.id,
  reviewStatus: row.reviewStatus,
  reviewedAt: toIsoString(row.reviewedAt),
  publishedAt: toIsoString(row.publishedAt)
});

export const toAnalyticsSnapshotReviewResponseDto = (
  row: AnalyticsSnapshotRow
): AnalyticsSnapshotReviewResponseDto => ({
  ...toAnalyticsSnapshotPublicationDto(row),
  reviewedByUserId: row.reviewedByUserId,
  reviewNotes: row.reviewNotes
});

export const toAnalyticsRetentionCleanupResponseDto = (
  executedAt: Date,
  retention: {
    obsoleteSnapshotRetentionDays: number;
    jobRetentionDays: number;
    schedulerRunRetentionDays: number;
    obsoleteSnapshotCutoff: Date;
    jobCutoff: Date;
    schedulerRunCutoff: Date;
  },
  summary: {
    deletedSnapshots: number;
    cascadedFeedbackCount: number;
    deletedJobs: number;
    deletedSchedulerRuns: number;
  }
): AnalyticsRetentionCleanupResponseDto => ({
  executedAt: executedAt.toISOString(),
  retention: {
    obsoleteSnapshotRetentionDays: retention.obsoleteSnapshotRetentionDays,
    jobRetentionDays: retention.jobRetentionDays,
    schedulerRunRetentionDays: retention.schedulerRunRetentionDays,
    obsoleteSnapshotCutoff: retention.obsoleteSnapshotCutoff.toISOString(),
    jobCutoff: retention.jobCutoff.toISOString(),
    schedulerRunCutoff: retention.schedulerRunCutoff.toISOString()
  },
  summary
});

export const toAnalyticsJobResponseDto = (row: AnalyticsJobRow): AnalyticsJobResponseDto => ({
  jobId: row.id,
  analysisType: row.analysisType,
  subjectType: row.subjectType,
  subjectId: row.subjectId,
  academicYearId: row.academicYearId,
  semesterId: row.semesterId,
  status: row.status,
  primaryProvider: row.primaryProvider,
  fallbackProvider: row.fallbackProvider,
  selectedProvider: row.selectedProvider,
  fallbackUsed: row.fallbackUsed,
  snapshotId: row.snapshotId,
  lastErrorCode: row.lastErrorCode,
  lastErrorMessage: row.lastErrorMessage,
  createdAt: row.createdAt.toISOString(),
  startedAt: toIsoString(row.startedAt),
  completedAt: toIsoString(row.completedAt)
});

export const toAnalyticsJobDispatchResponseDto = (
  created: boolean,
  row: AnalyticsJobRow
): AnalyticsJobDispatchResponseDto => ({
  created,
  job: toAnalyticsJobResponseDto(row)
});

export const toAnalyticsRecomputeResponseDto = (
  target: AnalyticsRecomputeTarget,
  activeContext: {
    academicYearId: string;
    academicYearName: string;
    semesterId: string;
    semesterName: string;
  },
  items: AnalyticsJobDispatchResponseDto[]
): AnalyticsRecomputeResponseDto => {
  const breakdownMap = new Map<
    AnalyticsAnalysisType,
    { analysisType: AnalyticsAnalysisType; totalJobs: number; createdCount: number; reusedCount: number }
  >();

  for (const item of items) {
    const current = breakdownMap.get(item.job.analysisType) ?? {
      analysisType: item.job.analysisType,
      totalJobs: 0,
      createdCount: 0,
      reusedCount: 0
    };

    current.totalJobs += 1;
    current.createdCount += item.created ? 1 : 0;
    current.reusedCount += item.created ? 0 : 1;
    breakdownMap.set(item.job.analysisType, current);
  }

  return {
    target,
    activeContext,
    summary: {
      totalJobs: items.length,
      createdCount: items.filter((item) => item.created).length,
      reusedCount: items.filter((item) => !item.created).length
    },
    breakdown: Array.from(breakdownMap.values()),
    items
  };
};

export const toAnalyticsScheduledDispatchResponseDto = (
  activeContext: {
    academicYearId: string;
    academicYearName: string;
    semesterId: string;
    semesterName: string;
  },
  schedule: {
    intervalMinutes: number;
    maxSubjectsPerTarget: number;
    staleBefore: Date;
    targets: AnalyticsAnalysisType[];
  },
  breakdown: AnalyticsScheduledDispatchBreakdownItemDto[],
  items: AnalyticsJobDispatchResponseDto[]
): AnalyticsScheduledDispatchResponseDto => ({
  triggerMode: "admin_scheduled_dispatch",
  activeContext,
  schedule: {
    intervalMinutes: schedule.intervalMinutes,
    maxSubjectsPerTarget: schedule.maxSubjectsPerTarget,
    staleBefore: schedule.staleBefore.toISOString(),
    targets: schedule.targets
  },
  summary: {
    totalEligibleSubjects: breakdown.reduce((total, item) => total + item.eligibleCount, 0),
    dispatchedCount: items.filter((item) => item.created).length,
    reusedCount: items.filter((item) => !item.created).length
  },
  breakdown,
  items
});

export const toAnalyticsFeedbackResponseDto = (
  row: AnalyticsFeedbackRow
): AnalyticsFeedbackResponseDto => ({
  feedbackId: row.id,
  snapshotId: row.snapshotId,
  user: {
    userId: row.userId,
    fullName: row.userFullName,
    role: row.userRole
  },
  rating: row.rating,
  feedbackText: row.feedbackText,
  createdAt: row.createdAt.toISOString()
});

export const toAnalyticsFeedbackListResponseDto = (
  rows: AnalyticsFeedbackRow[]
): AnalyticsFeedbackListResponseDto => ({
  items: rows.map(toAnalyticsFeedbackResponseDto)
});

export const toAnalyticsStudentRiskSummaryResponseDto = (
  snapshotRow: AnalyticsSnapshotRow,
  snapshot: AnalyticsStudentRiskSnapshot,
  includeAdminRecommendations: boolean
): AnalyticsStudentRiskSummaryResponseDto => ({
  snapshot: toAnalyticsSnapshotPublicationDto(snapshotRow),
  student: snapshot.featurePayload.student,
  analysisMode: snapshotRow.providerKey ? "ai_assisted" : "deterministic_only",
  providerKey: snapshotRow.providerKey,
  fallbackUsed: snapshotRow.fallbackUsed,
  computedAt: snapshotRow.computedAt.toISOString(),
  featurePayload: snapshot.featurePayload,
  insight: {
    ...snapshot.insight,
    adminRecommendations: includeAdminRecommendations ? snapshot.insight.adminRecommendations : []
  }
});

export const toAnalyticsTeacherComplianceSummaryResponseDto = (
  snapshotRow: AnalyticsSnapshotRow,
  snapshot: AnalyticsTeacherComplianceSnapshot
): AnalyticsTeacherComplianceSummaryResponseDto => ({
  snapshot: toAnalyticsSnapshotPublicationDto(snapshotRow),
  teacher: snapshot.featurePayload.teacher,
  analysisMode: snapshotRow.providerKey ? "ai_assisted" : "deterministic_only",
  providerKey: snapshotRow.providerKey,
  fallbackUsed: snapshotRow.fallbackUsed,
  computedAt: snapshotRow.computedAt.toISOString(),
  featurePayload: snapshot.featurePayload,
  insight: snapshot.insight
});

export const toAnalyticsAdminOperationalDigestSummaryResponseDto = (
  snapshotRow: AnalyticsSnapshotRow,
  snapshot: AnalyticsAdminOperationalDigestSnapshot
): AnalyticsAdminOperationalDigestSummaryResponseDto => ({
  snapshot: toAnalyticsSnapshotPublicationDto(snapshotRow),
  context: snapshot.featurePayload.context,
  analysisMode: snapshotRow.providerKey ? "ai_assisted" : "deterministic_only",
  providerKey: snapshotRow.providerKey,
  fallbackUsed: snapshotRow.fallbackUsed,
  computedAt: snapshotRow.computedAt.toISOString(),
  featurePayload: snapshot.featurePayload,
  insight: snapshot.insight
});

export const toAnalyticsClassOverviewSummaryResponseDto = (
  snapshotRow: AnalyticsSnapshotRow,
  snapshot: AnalyticsClassOverviewSnapshot
): AnalyticsClassOverviewSummaryResponseDto => ({
  snapshot: toAnalyticsSnapshotPublicationDto(snapshotRow),
  class: snapshot.featurePayload.class,
  analysisMode: snapshotRow.providerKey ? "ai_assisted" : "deterministic_only",
  providerKey: snapshotRow.providerKey,
  fallbackUsed: snapshotRow.fallbackUsed,
  computedAt: snapshotRow.computedAt.toISOString(),
  featurePayload: snapshot.featurePayload,
  insight: snapshot.insight
});

export const toAnalyticsTransportRouteAnomalySummaryResponseDto = (
  snapshotRow: AnalyticsSnapshotRow,
  snapshot: AnalyticsTransportRouteAnomalySnapshot
): AnalyticsTransportRouteAnomalySummaryResponseDto => ({
  snapshot: toAnalyticsSnapshotPublicationDto(snapshotRow),
  route: snapshot.featurePayload.route,
  analysisMode: snapshotRow.providerKey ? "ai_assisted" : "deterministic_only",
  providerKey: snapshotRow.providerKey,
  fallbackUsed: snapshotRow.fallbackUsed,
  computedAt: snapshotRow.computedAt.toISOString(),
  featurePayload: snapshot.featurePayload,
  insight: snapshot.insight
});
