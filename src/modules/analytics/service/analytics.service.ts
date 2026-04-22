import { ConflictError } from "../../../common/errors/conflict-error";
import { ForbiddenError } from "../../../common/errors/forbidden-error";
import { NotFoundError } from "../../../common/errors/not-found-error";
import type { Queryable } from "../../../common/interfaces/queryable.interface";
import { ActiveAcademicContextService } from "../../../common/services/active-academic-context.service";
import { OwnershipService } from "../../../common/services/ownership.service";
import { ProfileResolutionService } from "../../../common/services/profile-resolution.service";
import { requestExecutionContextService } from "../../../common/services/request-execution-context.service";
import type { AuthenticatedUser } from "../../../common/types/auth.types";
import { logger } from "../../../config/logger";
import { db } from "../../../database/db";
import type { AiAnalyticsProviderResolverPort } from "../../../integrations/ai/ai-analytics-provider.resolver";
import { aiAnalyticsProviderResolver } from "../../../integrations/ai/ai-analytics-provider.resolver";
import type {
  AdminOperationalDigestFeaturePayload,
  AdminOperationalDigestInsight,
  AnalyticsNarrativeRefinementContext,
  ClassOverviewFeaturePayload,
  ClassOverviewInsight,
  StudentRiskFeaturePayload,
  StudentRiskInsight,
  TeacherComplianceFeaturePayload,
  TeacherComplianceInsight,
  TransportRouteAnomalyFeaturePayload,
  TransportRouteAnomalyInsight
} from "../../../integrations/ai/types/ai-analytics-provider.types";
import type { AcademicStructureRepository } from "../../academic-structure/repository/academic-structure.repository";
import { AcademicStructureRepository as AcademicStructureRepositoryImpl } from "../../academic-structure/repository/academic-structure.repository";
import type { ReportingRepository } from "../../reporting/repository/reporting.repository";
import { ReportingRepository as ReportingRepositoryImpl } from "../../reporting/repository/reporting.repository";
import type { SystemSettingsReadService } from "../../system-settings/service/system-settings-read.service";
import type { AnalyticsSettings } from "../../system-settings/types/system-settings.types";
import type { UsersRepository } from "../../users/repository/users.repository";
import { UsersRepository as UsersRepositoryImpl } from "../../users/repository/users.repository";
import type { TransportRepository } from "../../transport/repository/transport.repository";
import { TransportRepository as TransportRepositoryImpl } from "../../transport/repository/transport.repository";
import type {
  AnalyticsAdminOperationalDigestSummaryResponseDto,
  AnalyticsClassOverviewSummaryResponseDto,
  AnalyticsFeedbackListResponseDto,
  AnalyticsFeedbackResponseDto,
  AnalyticsJobDispatchResponseDto,
  AnalyticsSnapshotReviewResponseDto,
  AnalyticsJobResponseDto,
  AnalyticsRecomputeResponseDto,
  AnalyticsRetentionCleanupResponseDto,
  AnalyticsScheduledDispatchBreakdownItemDto,
  AnalyticsScheduledDispatchResponseDto,
  AnalyticsStudentRiskSummaryResponseDto,
  AnalyticsTeacherComplianceSummaryResponseDto,
  AnalyticsTransportRouteAnomalySummaryResponseDto,
  CreateAdminOperationalDigestJobRequestDto,
  CreateAnalyticsFeedbackRequestDto,
  CreateAnalyticsRecomputeJobRequestDto,
  ReviewAnalyticsSnapshotRequestDto,
  CreateClassOverviewJobRequestDto,
  CreateStudentRiskJobRequestDto,
  CreateTeacherComplianceJobRequestDto,
  CreateTransportRouteAnomalyJobRequestDto
} from "../dto/analytics.dto";
import {
  toAnalyticsAdminOperationalDigestSummaryResponseDto,
  toAnalyticsClassOverviewSummaryResponseDto,
  toAnalyticsFeedbackListResponseDto,
  toAnalyticsFeedbackResponseDto,
  toAnalyticsJobDispatchResponseDto,
  toAnalyticsJobResponseDto,
  toAnalyticsRecomputeResponseDto,
  toAnalyticsRetentionCleanupResponseDto,
  toAnalyticsScheduledDispatchResponseDto,
  toAnalyticsSnapshotReviewResponseDto,
  toAnalyticsStudentRiskSummaryResponseDto,
  toAnalyticsTeacherComplianceSummaryResponseDto,
  toAnalyticsTransportRouteAnomalySummaryResponseDto
} from "../mapper/analytics.mapper";
import type { AnalyticsOutboxRepository } from "../repository/analytics-outbox.repository";
import { AnalyticsOutboxRepository as AnalyticsOutboxRepositoryImpl } from "../repository/analytics-outbox.repository";
import type { AnalyticsRepository } from "../repository/analytics.repository";
import { AnalyticsRepository as AnalyticsRepositoryImpl } from "../repository/analytics.repository";
import {
  ANALYTICS_ADMIN_DIGEST_SUBJECT_ID,
  type AnalyticsAdminOperationalDigestSnapshot,
  type AnalyticsAnalysisType,
  type AnalyticsClassOverviewSnapshot,
  type AnalyticsJobExecuteOutboxPayload,
  type AnalyticsJobRow,
  type AnalyticsJobStatus,
  type AnalyticsRecomputeTarget,
  type AnalyticsSnapshotRow,
  type AnalyticsStudentRiskSnapshot,
  type AnalyticsTeacherComplianceSnapshot,
  type AnalyticsTransportRouteAnomalySnapshot
} from "../types/analytics.types";
import {
  buildAdminOperationalDigestFeaturePayload,
  buildClassOverviewFeaturePayload,
  buildStudentRiskFeaturePayload,
  buildTeacherComplianceFeaturePayload,
  buildTransportRouteAnomalyFeaturePayload
} from "./analytics-scorer";
import {
  buildDeterministicAdminOperationalDigestInsight,
  buildDeterministicClassOverviewInsight,
  buildDeterministicStudentRiskInsight,
  buildDeterministicTeacherComplianceInsight,
  buildDeterministicTransportRouteAnomalyInsight,
  mergeAdminOperationalDigestNarrative,
  mergeClassOverviewNarrative,
  mergeStudentRiskNarrative,
  mergeTeacherComplianceNarrative,
  mergeTransportRouteAnomalyNarrative,
  refineAdminOperationalDigestInsightWithFeedback,
  refineClassOverviewInsightWithFeedback,
  refineStudentRiskInsightWithFeedback,
  refineTeacherComplianceInsightWithFeedback,
  refineTransportRouteAnomalyInsightWithFeedback
} from "./analytics-narrative";

const ANALYTICS_DISABLED_CODE = "ANALYTICS_DISABLED";
const ANALYTICS_SCHEDULED_RECOMPUTE_DISABLED_CODE = "ANALYTICS_SCHEDULED_RECOMPUTE_DISABLED";
const ANALYTICS_RETENTION_CLEANUP_DISABLED_CODE = "ANALYTICS_RETENTION_CLEANUP_DISABLED";
const STUDENT_CONTEXT_MISMATCH_CODE = "STUDENT_OUTSIDE_ACTIVE_CONTEXT";
const CLASS_CONTEXT_MISMATCH_CODE = "CLASS_OUTSIDE_ACTIVE_CONTEXT";

const assertFound = <T>(value: T | null, label: string): T => {
  if (!value) {
    throw new NotFoundError(`${label} not found`);
  }

  return value;
};

const buildAnalyticsDisabledError = (): ConflictError =>
  new ConflictError("AI analytics is disabled", [
    {
      field: "analytics",
      code: ANALYTICS_DISABLED_CODE,
      message: "Enable analytics.aiAnalyticsEnabled before creating analytics jobs"
    }
  ]);

const buildStudentContextMismatchError = (): ConflictError =>
  new ConflictError("Student does not belong to the active academic year", [
    {
      field: "studentId",
      code: STUDENT_CONTEXT_MISMATCH_CODE,
      message: "The requested student is not aligned with the active academic year"
    }
  ]);

const buildClassContextMismatchError = (): ConflictError =>
  new ConflictError("Class does not belong to the active academic year", [
    {
      field: "classId",
      code: CLASS_CONTEXT_MISMATCH_CODE,
      message: "The requested class is not aligned with the active academic year"
    }
  ]);

const buildScheduledRecomputeDisabledError = (): ConflictError =>
  new ConflictError("Scheduled analytics recompute is disabled", [
    {
      field: "analytics",
      code: ANALYTICS_SCHEDULED_RECOMPUTE_DISABLED_CODE,
      message: "Enable analytics.scheduledRecomputeEnabled before dispatching a scheduled recompute cycle"
    }
  ]);

const buildRetentionCleanupDisabledError = (): ConflictError =>
  new ConflictError("Analytics retention cleanup is disabled", [
    {
      field: "analytics",
      code: ANALYTICS_RETENTION_CLEANUP_DISABLED_CODE,
      message: "Enable analytics.retentionCleanupEnabled before running analytics retention cleanup"
    }
  ]);

const isObjectRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const extractContextNames = (
  inputJson: unknown,
  fallback: { academicYearName: string; semesterName: string }
): { academicYearName: string; semesterName: string } => {
  if (!isObjectRecord(inputJson)) {
    return fallback;
  }

  return {
    academicYearName:
      typeof inputJson.academicYearName === "string" && inputJson.academicYearName.trim().length > 0
        ? inputJson.academicYearName
        : fallback.academicYearName,
    semesterName:
      typeof inputJson.semesterName === "string" && inputJson.semesterName.trim().length > 0
        ? inputJson.semesterName
        : fallback.semesterName
  };
};

const assertStudentRiskSnapshot = (row: AnalyticsSnapshotRow): AnalyticsStudentRiskSnapshot => ({
  featurePayload: row.featurePayloadJson as StudentRiskFeaturePayload,
  insight: row.resultJson as StudentRiskInsight
});

const assertTeacherComplianceSnapshot = (
  row: AnalyticsSnapshotRow
): AnalyticsTeacherComplianceSnapshot => ({
  featurePayload: row.featurePayloadJson as TeacherComplianceFeaturePayload,
  insight: row.resultJson as TeacherComplianceInsight
});

const assertAdminOperationalDigestSnapshot = (
  row: AnalyticsSnapshotRow
): AnalyticsAdminOperationalDigestSnapshot => ({
  featurePayload: row.featurePayloadJson as AdminOperationalDigestFeaturePayload,
  insight: row.resultJson as AdminOperationalDigestInsight
});

const assertClassOverviewSnapshot = (
  row: AnalyticsSnapshotRow
): AnalyticsClassOverviewSnapshot => ({
  featurePayload: row.featurePayloadJson as ClassOverviewFeaturePayload,
  insight: row.resultJson as ClassOverviewInsight
});

const assertTransportRouteAnomalySnapshot = (
  row: AnalyticsSnapshotRow
): AnalyticsTransportRouteAnomalySnapshot => ({
  featurePayload: row.featurePayloadJson as TransportRouteAnomalyFeaturePayload,
  insight: row.resultJson as TransportRouteAnomalyInsight
});

interface ProviderExecutionResult<TInsight> {
  providerKey: AnalyticsJobRow["selectedProvider"];
  fallbackUsed: boolean;
  insight: TInsight;
}

type ActiveAnalyticsContext = Awaited<
  ReturnType<ActiveAcademicContextService["requireActiveContext"]>
>;

interface ResolvedAnalyticsJobSubject {
  analysisType: AnalyticsAnalysisType;
  subjectType: AnalyticsJobRow["subjectType"];
  subjectId: string;
  inputJson: Record<string, unknown>;
}

interface ScheduledDispatchContext {
  intervalMinutes: number;
  maxSubjectsPerTarget: number;
  staleBefore: Date;
  targets: AnalyticsAnalysisType[];
}

interface RetentionCleanupContext {
  obsoleteSnapshotRetentionDays: number;
  jobRetentionDays: number;
  schedulerRunRetentionDays: number;
  obsoleteSnapshotCutoff: Date;
  jobCutoff: Date;
  schedulerRunCutoff: Date;
}

type AnalyticsAutonomousDispatchSkipReason =
  | "analytics_disabled"
  | "scheduled_recompute_disabled"
  | "autonomous_dispatch_disabled"
  | "autonomous_actor_unconfigured"
  | "autonomous_actor_invalid"
  | "cooldown_active";

interface ScheduledDispatchExecutionResult {
  response: AnalyticsScheduledDispatchResponseDto;
  breakdown: AnalyticsScheduledDispatchBreakdownItemDto[];
  items: AnalyticsJobDispatchResponseDto[];
}

export interface AnalyticsAutonomousDispatchResult {
  skipped: boolean;
  reason: AnalyticsAutonomousDispatchSkipReason | null;
  runId: string | null;
  response: AnalyticsScheduledDispatchResponseDto | null;
  nextEligibleAt: string | null;
}

const buildClassSubjectDisplayName = (classRow: {
  gradeLevelName: string;
  className: string;
  section: string | null;
}): string =>
  `${classRow.gradeLevelName} ${classRow.className}${classRow.section ? `/${classRow.section}` : ""}`;

const buildRouteSubjectDisplayName = (routeRow: { routeName: string }): string => routeRow.routeName;

const toDateOnly = (value: Date): string => value.toISOString().slice(0, 10);

const buildTransportInputWindow = (context: {
  semesterStartDate: Date;
  semesterEndDate: Date;
}): {
  fromDate: string;
  toDate: string;
  totalDays: number;
} => {
  const now = new Date();
  const windowEnd =
    context.semesterEndDate.getTime() < now.getTime() ? context.semesterEndDate : now;
  const fromDate = toDateOnly(context.semesterStartDate);
  const toDate = toDateOnly(windowEnd);
  const totalDays = Math.max(
    1,
    Math.ceil((windowEnd.getTime() - context.semesterStartDate.getTime()) / 86_400_000) + 1
  );

  return {
    fromDate,
    toDate,
    totalDays
  };
};

export interface AnalyticsJobExecutionServicePort {
  executeJob(jobId: string): Promise<boolean>;
  markJobFailure(
    jobId: string,
    status: Extract<AnalyticsJobStatus, "failed" | "dead">,
    errorCode: string,
    errorMessage: string
  ): Promise<void>;
}

export class AnalyticsService implements AnalyticsJobExecutionServicePort {
  constructor(
    private readonly systemSettingsReadService: SystemSettingsReadService,
    private readonly analyticsRepository: AnalyticsRepository = new AnalyticsRepositoryImpl(),
    private readonly analyticsOutboxRepository: AnalyticsOutboxRepository = new AnalyticsOutboxRepositoryImpl(),
    private readonly reportingRepository: ReportingRepository = new ReportingRepositoryImpl(),
    private readonly academicStructureRepository: AcademicStructureRepository = new AcademicStructureRepositoryImpl(),
    private readonly transportRepository: TransportRepository = new TransportRepositoryImpl(),
    private readonly activeAcademicContextService: ActiveAcademicContextService = new ActiveAcademicContextService(),
    private readonly profileResolutionService: ProfileResolutionService = new ProfileResolutionService(),
    private readonly ownershipService: OwnershipService = new OwnershipService(),
    private readonly usersRepository: UsersRepository = new UsersRepositoryImpl(),
    private readonly providerResolver: AiAnalyticsProviderResolverPort = aiAnalyticsProviderResolver
  ) {}

  async createStudentRiskJob(
    authUser: AuthenticatedUser,
    payload: CreateStudentRiskJobRequestDto
  ): Promise<AnalyticsJobDispatchResponseDto> {
    return this.createAnalyticsJob(authUser, async (client, context) =>
      this.resolveStudentRiskSubject(payload.studentId, client, context, "admin_manual")
    );
  }

  async createTeacherComplianceJob(
    authUser: AuthenticatedUser,
    payload: CreateTeacherComplianceJobRequestDto
  ): Promise<AnalyticsJobDispatchResponseDto> {
    return this.createAnalyticsJob(authUser, async (client, context) =>
      this.resolveTeacherComplianceSubject(payload.teacherId, client, context, "admin_manual")
    );
  }

  async createAdminOperationalDigestJob(
    authUser: AuthenticatedUser,
    _payload: CreateAdminOperationalDigestJobRequestDto
  ): Promise<AnalyticsJobDispatchResponseDto> {
    return this.createAnalyticsJob(authUser, async (_client, context) =>
      this.resolveAdminOperationalDigestSubject(context, "admin_manual")
    );
  }

  async createClassOverviewJob(
    authUser: AuthenticatedUser,
    payload: CreateClassOverviewJobRequestDto
  ): Promise<AnalyticsJobDispatchResponseDto> {
    return this.createAnalyticsJob(authUser, async (client, context) =>
      this.resolveClassOverviewSubject(payload.classId, client, context, "admin_manual")
    );
  }

  async createTransportRouteAnomalyJob(
    authUser: AuthenticatedUser,
    payload: CreateTransportRouteAnomalyJobRequestDto
  ): Promise<AnalyticsJobDispatchResponseDto> {
    return this.createAnalyticsJob(authUser, async (client, context) =>
      this.resolveTransportRouteAnomalySubject(payload.routeId, client, context, "admin_manual")
    );
  }

  async dispatchScheduledRecomputeJobs(
    authUser: AuthenticatedUser
  ): Promise<AnalyticsScheduledDispatchResponseDto> {
    return db.withTransaction(async (client) => {
      const analyticsSettings = await this.systemSettingsReadService.getAnalyticsSettings(client);

      if (!analyticsSettings.aiAnalyticsEnabled) {
        throw buildAnalyticsDisabledError();
      }

      if (!analyticsSettings.scheduledRecomputeEnabled) {
        throw buildScheduledRecomputeDisabledError();
      }

      const activeContext = await this.activeAcademicContextService.requireActiveContext(client);
      const scheduleContext = this.buildScheduledDispatchContext(analyticsSettings);
      const execution = await this.executeScheduledDispatchCycle(
        authUser,
        analyticsSettings,
        activeContext,
        scheduleContext,
        client
      );

      return execution.response;
    });
  }

  async dispatchAutonomousScheduledRecomputeJobs(): Promise<AnalyticsAutonomousDispatchResult> {
    const preparation = await db.withTransaction(async (client) => {
      const analyticsSettings = await this.systemSettingsReadService.getAnalyticsSettings(client);

      if (!analyticsSettings.aiAnalyticsEnabled) {
        return {
          skipped: true as const,
          reason: "analytics_disabled" as const,
          runId: null,
          authUser: null,
          activeContext: null,
          analyticsSettings,
          scheduleContext: null,
          nextEligibleAt: null
        };
      }

      if (!analyticsSettings.scheduledRecomputeEnabled) {
        return {
          skipped: true as const,
          reason: "scheduled_recompute_disabled" as const,
          runId: null,
          authUser: null,
          activeContext: null,
          analyticsSettings,
          scheduleContext: null,
          nextEligibleAt: null
        };
      }

      if (!analyticsSettings.autonomousDispatchEnabled) {
        return {
          skipped: true as const,
          reason: "autonomous_dispatch_disabled" as const,
          runId: null,
          authUser: null,
          activeContext: null,
          analyticsSettings,
          scheduleContext: null,
          nextEligibleAt: null
        };
      }

      if (!analyticsSettings.autonomousDispatchActorUserId) {
        return {
          skipped: true as const,
          reason: "autonomous_actor_unconfigured" as const,
          runId: null,
          authUser: null,
          activeContext: null,
          analyticsSettings,
          scheduleContext: null,
          nextEligibleAt: null
        };
      }

      const actor = await this.usersRepository.findUserById(
        analyticsSettings.autonomousDispatchActorUserId,
        client
      );

      if (!actor || !actor.isActive || actor.role !== "admin") {
        return {
          skipped: true as const,
          reason: "autonomous_actor_invalid" as const,
          runId: null,
          authUser: null,
          activeContext: null,
          analyticsSettings,
          scheduleContext: null,
          nextEligibleAt: null
        };
      }

      const activeContext = await this.activeAcademicContextService.requireActiveContext(client);
      const scheduleContext = this.buildScheduledDispatchContext(analyticsSettings);
      const latestRun = await this.analyticsRepository.findLatestSchedulerRun(
        "autonomous_dispatch",
        client
      );
      const nextEligibleAt = latestRun
        ? new Date(latestRun.startedAt.getTime() + analyticsSettings.scheduledRecomputeIntervalMinutes * 60_000)
        : null;

      if (nextEligibleAt && nextEligibleAt.getTime() > Date.now()) {
        return {
          skipped: true as const,
          reason: "cooldown_active" as const,
          runId: null,
          authUser: null,
          activeContext: null,
          analyticsSettings,
          scheduleContext: null,
          nextEligibleAt
        };
      }

      const run = await this.analyticsRepository.createSchedulerRun(
        {
          triggerMode: "autonomous_dispatch",
          requestedByUserId: actor.id,
          academicYearId: activeContext.academicYearId,
          semesterId: activeContext.semesterId,
          staleBefore: scheduleContext.staleBefore,
          scheduledTargetsJson: scheduleContext.targets,
          summaryJson: {
            triggerMode: "autonomous_dispatch",
            state: "started"
          }
        },
        client
      );

      return {
        skipped: false as const,
        reason: null,
        runId: run.id,
        authUser: {
          userId: actor.id,
          role: actor.role,
          email: actor.email,
          isActive: actor.isActive
        } satisfies AuthenticatedUser,
        activeContext,
        analyticsSettings,
        scheduleContext,
        nextEligibleAt: null
      };
    });

    if (preparation.skipped) {
      return {
        skipped: true,
        reason: preparation.reason,
        runId: null,
        response: null,
        nextEligibleAt: preparation.nextEligibleAt ? preparation.nextEligibleAt.toISOString() : null
      };
    }

    try {
      const execution = await db.withTransaction((client) =>
        this.executeScheduledDispatchCycle(
          preparation.authUser,
          preparation.analyticsSettings,
          preparation.activeContext,
          preparation.scheduleContext,
          client
        )
      );

      await this.analyticsRepository.markSchedulerRunCompleted(preparation.runId, {
        triggerMode: "autonomous_dispatch",
        activeContext: execution.response.activeContext,
        schedule: execution.response.schedule,
        summary: execution.response.summary,
        breakdown: execution.response.breakdown
      });

      return {
        skipped: false,
        reason: null,
        runId: preparation.runId,
        response: execution.response,
        nextEligibleAt: null
      };
    } catch (error) {
      await this.analyticsRepository.markSchedulerRunFailed(preparation.runId, {
        errorCode: "AUTONOMOUS_DISPATCH_FAILED",
        errorMessage: error instanceof Error ? error.message : "Unknown autonomous dispatch error"
      });
      throw error;
    }
  }

  async createRecomputeJobs(
    authUser: AuthenticatedUser,
    payload: CreateAnalyticsRecomputeJobRequestDto
  ): Promise<AnalyticsRecomputeResponseDto> {
    return db.withTransaction(async (client) => {
      const analyticsSettings = await this.systemSettingsReadService.getAnalyticsSettings(client);

      if (!analyticsSettings.aiAnalyticsEnabled) {
        throw buildAnalyticsDisabledError();
      }

      const activeContext = await this.activeAcademicContextService.requireActiveContext(client);
      const subjects = await this.buildRecomputeSubjects(payload, client, activeContext);
      const items: AnalyticsJobDispatchResponseDto[] = [];

      for (const subject of subjects) {
        items.push(
          await this.dispatchAnalyticsJob(authUser, subject, analyticsSettings, activeContext, client)
        );
      }

      return toAnalyticsRecomputeResponseDto(
        payload.target,
        {
          academicYearId: activeContext.academicYearId,
          academicYearName: activeContext.academicYearName,
          semesterId: activeContext.semesterId,
          semesterName: activeContext.semesterName
        },
        items
      );
    });
  }

  async runRetentionCleanup(
    _authUser: AuthenticatedUser
  ): Promise<AnalyticsRetentionCleanupResponseDto> {
    return db.withTransaction(async (client) => {
      const analyticsSettings = await this.systemSettingsReadService.getAnalyticsSettings(client);

      if (!analyticsSettings.aiAnalyticsEnabled) {
        throw buildAnalyticsDisabledError();
      }

      if (!analyticsSettings.retentionCleanupEnabled) {
        throw buildRetentionCleanupDisabledError();
      }

      const retentionContext = this.buildRetentionCleanupContext(analyticsSettings);
      const snapshotCleanup = await this.analyticsRepository.deleteObsoleteSnapshots(
        {
          obsoleteSnapshotCutoff: retentionContext.obsoleteSnapshotCutoff
        },
        client
      );
      const deletedJobs = await this.analyticsRepository.deleteStaleTerminalJobs(
        {
          jobCutoff: retentionContext.jobCutoff
        },
        client
      );
      const deletedSchedulerRuns = await this.analyticsRepository.deleteStaleSchedulerRuns(
        {
          schedulerRunCutoff: retentionContext.schedulerRunCutoff
        },
        client
      );
      const executedAt = new Date();

      return toAnalyticsRetentionCleanupResponseDto(executedAt, retentionContext, {
        deletedSnapshots: snapshotCleanup.deletedSnapshotCount,
        cascadedFeedbackCount: snapshotCleanup.cascadedFeedbackCount,
        deletedJobs,
        deletedSchedulerRuns
      });
    });
  }

  async getJobById(jobId: string): Promise<AnalyticsJobResponseDto> {
    const job = assertFound(await this.analyticsRepository.findJobById(jobId), "Analytics job");

    return toAnalyticsJobResponseDto(job);
  }

  async reviewSnapshot(
    authUser: AuthenticatedUser,
    snapshotId: string,
    payload: ReviewAnalyticsSnapshotRequestDto
  ): Promise<AnalyticsSnapshotReviewResponseDto> {
    return db.withTransaction(async (client) => {
      const snapshotRow = assertFound(
        await this.analyticsRepository.findSnapshotById(snapshotId, client),
        "Analytics snapshot"
      );
      const reviewedAt = new Date();

      if (payload.action === "approve") {
        await this.analyticsRepository.supersedeApprovedSnapshotsForContext(
          {
            analysisType: snapshotRow.analysisType,
            subjectType: snapshotRow.subjectType,
            subjectId: snapshotRow.subjectId,
            academicYearId: snapshotRow.academicYearId,
            semesterId: snapshotRow.semesterId,
            excludeSnapshotId: snapshotRow.id,
            reviewedByUserId: authUser.userId,
            reviewedAt
          },
          client
        );
      }

      const reviewedSnapshot = await this.analyticsRepository.reviewSnapshot(
        snapshotRow.id,
        {
          reviewStatus: payload.action === "approve" ? "approved" : "rejected",
          reviewedByUserId: authUser.userId,
          reviewedAt,
          publishedAt: payload.action === "approve" ? snapshotRow.publishedAt ?? reviewedAt : null,
          reviewNotes: payload.reviewNotes ?? null
        },
        client
      );

      return toAnalyticsSnapshotReviewResponseDto(reviewedSnapshot);
    });
  }

  async createSnapshotFeedback(
    authUser: AuthenticatedUser,
    snapshotId: string,
    payload: CreateAnalyticsFeedbackRequestDto
  ): Promise<AnalyticsFeedbackResponseDto> {
    return db.withTransaction(async (client) => {
      const snapshotRow = assertFound(
        await this.analyticsRepository.findSnapshotById(snapshotId, client),
        "Analytics snapshot"
      );

      await this.assertSnapshotFeedbackAccess(authUser, snapshotRow, client);

      if (authUser.role !== "admin" && snapshotRow.reviewStatus !== "approved") {
        throw new ForbiddenError(
          "You do not have permission to submit feedback for an unpublished analytics snapshot"
        );
      }

      const feedbackRow = await this.analyticsRepository.createFeedback(
        {
          snapshotId: snapshotRow.id,
          userId: authUser.userId,
          rating: payload.rating ?? null,
          feedbackText: payload.feedbackText ?? null
        },
        client
      );

      return toAnalyticsFeedbackResponseDto(feedbackRow);
    });
  }

  async listSnapshotFeedback(snapshotId: string): Promise<AnalyticsFeedbackListResponseDto> {
    const snapshotRow = assertFound(
      await this.analyticsRepository.findSnapshotById(snapshotId),
      "Analytics snapshot"
    );
    const feedbackRows = await this.analyticsRepository.listFeedbackBySnapshotId(snapshotRow.id);

    return toAnalyticsFeedbackListResponseDto(feedbackRows);
  }

  async getStudentRiskSummary(
    authUser: AuthenticatedUser,
    studentId: string
  ): Promise<AnalyticsStudentRiskSummaryResponseDto> {
    const activeContext = await this.activeAcademicContextService.requireActiveContext();

    if (authUser.role === "parent") {
      const parentProfile = await this.profileResolutionService.requireParentProfile(authUser.userId);
      await this.ownershipService.assertParentOwnsStudent(parentProfile.parentId, studentId);
    }

    const snapshotRow = assertFound(
      await this.analyticsRepository.findLatestSnapshot({
        analysisType: "student_risk_summary",
        subjectType: "student",
        subjectId: studentId,
        academicYearId: activeContext.academicYearId,
        semesterId: activeContext.semesterId,
        reviewStatuses: authUser.role === "admin" ? undefined : ["approved"]
      }),
      "Student analytics snapshot"
    );

    return toAnalyticsStudentRiskSummaryResponseDto(
      snapshotRow,
      assertStudentRiskSnapshot(snapshotRow),
      authUser.role === "admin"
    );
  }

  async getTeacherComplianceSummary(
    teacherId: string
  ): Promise<AnalyticsTeacherComplianceSummaryResponseDto> {
    const activeContext = await this.activeAcademicContextService.requireActiveContext();
    const teacher = await this.profileResolutionService.requireTeacherProfileIdentifier(
      teacherId,
      db,
      "teacherId"
    );

    const snapshotRow = assertFound(
      await this.analyticsRepository.findLatestSnapshot({
        analysisType: "teacher_compliance_summary",
        subjectType: "teacher",
        subjectId: teacher.teacherId,
        academicYearId: activeContext.academicYearId,
        semesterId: activeContext.semesterId
      }),
      "Teacher analytics snapshot"
    );

    return toAnalyticsTeacherComplianceSummaryResponseDto(
      snapshotRow,
      assertTeacherComplianceSnapshot(snapshotRow)
    );
  }

  async getAdminOperationalDigestSummary(): Promise<AnalyticsAdminOperationalDigestSummaryResponseDto> {
    const activeContext = await this.activeAcademicContextService.requireActiveContext();

    const snapshotRow = assertFound(
      await this.analyticsRepository.findLatestSnapshot({
        analysisType: "admin_operational_digest",
        subjectType: "system",
        subjectId: ANALYTICS_ADMIN_DIGEST_SUBJECT_ID,
        academicYearId: activeContext.academicYearId,
        semesterId: activeContext.semesterId
      }),
      "Admin operational digest analytics snapshot"
    );

    return toAnalyticsAdminOperationalDigestSummaryResponseDto(
      snapshotRow,
      assertAdminOperationalDigestSnapshot(snapshotRow)
    );
  }

  async getClassOverviewSummary(
    authUser: AuthenticatedUser,
    classId: string
  ): Promise<AnalyticsClassOverviewSummaryResponseDto> {
    const activeContext = await this.activeAcademicContextService.requireActiveContext();
    const classRow = assertFound(
      await this.academicStructureRepository.findClassById(classId),
      "Class"
    );

    if (classRow.academicYearId !== activeContext.academicYearId) {
      throw buildClassContextMismatchError();
    }

    if (authUser.role === "teacher") {
      const teacherProfile = await this.profileResolutionService.requireTeacherProfile(authUser.userId);
      await this.ownershipService.assertTeacherAssignedToClassYear(
        teacherProfile.teacherId,
        classId,
        activeContext.academicYearId
      );
    }

    if (authUser.role === "supervisor") {
      const supervisorProfile = await this.profileResolutionService.requireSupervisorProfile(authUser.userId);
      await this.ownershipService.assertSupervisorAssignedToClassYear(
        supervisorProfile.supervisorId,
        classId,
        activeContext.academicYearId
      );
    }

    const snapshotRow = assertFound(
      await this.analyticsRepository.findLatestSnapshot({
        analysisType: "class_overview",
        subjectType: "class",
        subjectId: classId,
        academicYearId: activeContext.academicYearId,
        semesterId: activeContext.semesterId,
        reviewStatuses: authUser.role === "admin" ? undefined : ["approved"]
      }),
      "Class analytics snapshot"
    );

    return toAnalyticsClassOverviewSummaryResponseDto(
      snapshotRow,
      assertClassOverviewSnapshot(snapshotRow)
    );
  }

  async getTransportRouteAnomalySummary(
    routeId: string
  ): Promise<AnalyticsTransportRouteAnomalySummaryResponseDto> {
    const activeContext = await this.activeAcademicContextService.requireActiveContext();
    assertFound(await this.transportRepository.findRouteById(routeId), "Route");

    const snapshotRow = assertFound(
      await this.analyticsRepository.findLatestSnapshot({
        analysisType: "transport_route_anomaly_summary",
        subjectType: "route",
        subjectId: routeId,
        academicYearId: activeContext.academicYearId,
        semesterId: activeContext.semesterId
      }),
      "Transport route anomaly analytics snapshot"
    );

    return toAnalyticsTransportRouteAnomalySummaryResponseDto(
      snapshotRow,
      assertTransportRouteAnomalySnapshot(snapshotRow)
    );
  }

  async executeJob(jobId: string): Promise<boolean> {
    const claimedJob = await db.withTransaction((client) =>
      this.analyticsRepository.claimJobForExecution(jobId, client)
    );

    if (!claimedJob) {
      const currentJob = await this.analyticsRepository.findJobById(jobId);

      if (!currentJob) {
        throw new NotFoundError("Analytics job not found");
      }

      return currentJob.status !== "pending" && currentJob.status !== "failed";
    }

    const executionResult =
      claimedJob.analysisType === "student_risk_summary"
        ? await this.buildStudentRiskSnapshot(claimedJob)
        : claimedJob.analysisType === "teacher_compliance_summary"
          ? await this.buildTeacherComplianceSnapshot(claimedJob)
          : claimedJob.analysisType === "class_overview"
            ? await this.buildClassOverviewSnapshot(claimedJob)
            : claimedJob.analysisType === "transport_route_anomaly_summary"
              ? await this.buildTransportRouteAnomalySnapshot(claimedJob)
              : await this.buildAdminOperationalDigestSnapshot(claimedJob);

    await db.withTransaction(async (client) => {
      const snapshotRow = await this.analyticsRepository.createSnapshot(
        {
          analysisType: claimedJob.analysisType,
          subjectType: claimedJob.subjectType,
          subjectId: claimedJob.subjectId,
          academicYearId: claimedJob.academicYearId,
          semesterId: claimedJob.semesterId,
          sourceJobId: claimedJob.id,
          providerKey: executionResult.providerKey,
          fallbackUsed: executionResult.fallbackUsed,
          featurePayloadJson: executionResult.snapshot.featurePayload,
          resultJson: executionResult.snapshot.insight,
          computedAt: new Date()
        },
        client
      );

      await this.analyticsRepository.markJobCompleted(
        claimedJob.id,
        {
          selectedProvider: executionResult.providerKey,
          fallbackUsed: executionResult.fallbackUsed,
          snapshotId: snapshotRow.id
        },
        client
      );
    });

    return true;
  }

  async markJobFailure(
    jobId: string,
    status: Extract<AnalyticsJobStatus, "failed" | "dead">,
    errorCode: string,
    errorMessage: string
  ): Promise<void> {
    await this.analyticsRepository.markJobFailed(jobId, {
      status,
      errorCode,
      errorMessage
    });
  }

  private async executeScheduledDispatchCycle(
    authUser: AuthenticatedUser,
    analyticsSettings: AnalyticsSettings,
    activeContext: ActiveAnalyticsContext,
    scheduleContext: ScheduledDispatchContext,
    queryable: Queryable
  ): Promise<ScheduledDispatchExecutionResult> {
    const breakdown: AnalyticsScheduledDispatchBreakdownItemDto[] = [];
    const items: AnalyticsJobDispatchResponseDto[] = [];

    for (const target of scheduleContext.targets) {
      const subjects = await this.buildScheduledSubjectsForTarget(
        target,
        queryable,
        activeContext,
        scheduleContext
      );
      let dispatchedCount = 0;
      let reusedCount = 0;

      for (const subject of subjects) {
        const dispatchResult = await this.dispatchAnalyticsJob(
          authUser,
          subject,
          analyticsSettings,
          activeContext,
          queryable
        );

        items.push(dispatchResult);
        dispatchedCount += dispatchResult.created ? 1 : 0;
        reusedCount += dispatchResult.created ? 0 : 1;
      }

      breakdown.push({
        analysisType: target,
        eligibleCount: subjects.length,
        dispatchedCount,
        reusedCount
      });
    }

    return {
      breakdown,
      items,
      response: toAnalyticsScheduledDispatchResponseDto(
        {
          academicYearId: activeContext.academicYearId,
          academicYearName: activeContext.academicYearName,
          semesterId: activeContext.semesterId,
          semesterName: activeContext.semesterName
        },
        scheduleContext,
        breakdown,
        items
      )
    };
  }

  private async createAnalyticsJob(
    authUser: AuthenticatedUser,
    resolveSubject: (
      client: Queryable,
      context: ActiveAnalyticsContext
    ) => Promise<ResolvedAnalyticsJobSubject>
  ): Promise<AnalyticsJobDispatchResponseDto> {
    return db.withTransaction(async (client) => {
      const analyticsSettings = await this.systemSettingsReadService.getAnalyticsSettings(client);

      if (!analyticsSettings.aiAnalyticsEnabled) {
        throw buildAnalyticsDisabledError();
      }

      const activeContext = await this.activeAcademicContextService.requireActiveContext(client);
      const subject = await resolveSubject(client, activeContext);

      return this.dispatchAnalyticsJob(authUser, subject, analyticsSettings, activeContext, client);
    });
  }

  private async dispatchAnalyticsJob(
    authUser: AuthenticatedUser,
    subject: ResolvedAnalyticsJobSubject,
    analyticsSettings: AnalyticsSettings,
    activeContext: ActiveAnalyticsContext,
    queryable: Queryable
  ): Promise<AnalyticsJobDispatchResponseDto> {
    const existingJob = await this.analyticsRepository.findActiveJobByNaturalKey(
      {
        analysisType: subject.analysisType,
        subjectType: subject.subjectType,
        subjectId: subject.subjectId,
        academicYearId: activeContext.academicYearId,
        semesterId: activeContext.semesterId
      },
      queryable
    );

    if (existingJob) {
      return toAnalyticsJobDispatchResponseDto(false, existingJob);
    }

    const createdJob = await this.analyticsRepository.createJob(
      {
        analysisType: subject.analysisType,
        subjectType: subject.subjectType,
        subjectId: subject.subjectId,
        academicYearId: activeContext.academicYearId,
        semesterId: activeContext.semesterId,
        requestedByUserId: authUser.userId,
        primaryProvider: analyticsSettings.primaryProvider,
        fallbackProvider: analyticsSettings.fallbackProvider,
        inputJson: subject.inputJson
      },
      queryable
    );

    const outboxPayload: AnalyticsJobExecuteOutboxPayload = {
      jobId: createdJob.id
    };

    await this.analyticsOutboxRepository.enqueueJobExecutionEvent(
      {
        jobId: createdJob.id,
        payloadJson: outboxPayload,
        idempotencyKey: `analytics:job-execute:${createdJob.id}`,
        requestId: requestExecutionContextService.getCurrentContext()?.requestId ?? null
      },
      queryable
    );

    return toAnalyticsJobDispatchResponseDto(true, createdJob);
  }

  private shouldIncludeRecomputeTarget(
    target: AnalyticsRecomputeTarget,
    analysisType: AnalyticsAnalysisType
  ): boolean {
    return target === "all_supported" || target === analysisType;
  }

  private buildScheduledDispatchContext(settings: AnalyticsSettings): ScheduledDispatchContext {
    const staleBefore = new Date(Date.now() - settings.scheduledRecomputeIntervalMinutes * 60_000);

    return {
      intervalMinutes: settings.scheduledRecomputeIntervalMinutes,
      maxSubjectsPerTarget: settings.scheduledRecomputeMaxSubjectsPerTarget,
      staleBefore,
      targets: [...settings.scheduledTargets]
    };
  }

  private buildRetentionCleanupContext(settings: AnalyticsSettings): RetentionCleanupContext {
    return {
      obsoleteSnapshotRetentionDays: settings.obsoleteSnapshotRetentionDays,
      jobRetentionDays: settings.jobRetentionDays,
      schedulerRunRetentionDays: settings.schedulerRunRetentionDays,
      obsoleteSnapshotCutoff: new Date(
        Date.now() - settings.obsoleteSnapshotRetentionDays * 86_400_000
      ),
      jobCutoff: new Date(Date.now() - settings.jobRetentionDays * 86_400_000),
      schedulerRunCutoff: new Date(
        Date.now() - settings.schedulerRunRetentionDays * 86_400_000
      )
    };
  }

  private async buildScheduledSubjectsForTarget(
    target: AnalyticsAnalysisType,
    queryable: Queryable,
    context: ActiveAnalyticsContext,
    scheduleContext: ScheduledDispatchContext
  ): Promise<ResolvedAnalyticsJobSubject[]> {
    if (target === "student_risk_summary") {
      const candidates = await this.analyticsRepository.listStaleStudentRiskCandidates(
        {
          academicYearId: context.academicYearId,
          semesterId: context.semesterId,
          staleBefore: scheduleContext.staleBefore,
          limit: scheduleContext.maxSubjectsPerTarget
        },
        queryable
      );

      return candidates.map((candidate) => ({
        analysisType: "student_risk_summary",
        subjectType: "student",
        subjectId: candidate.studentId,
        inputJson: {
          trigger: "scheduled_recompute",
          academicYearName: context.academicYearName,
          semesterName: context.semesterName,
          subjectDisplayName: candidate.fullName
        }
      }));
    }

    if (target === "teacher_compliance_summary") {
      const candidates = await this.analyticsRepository.listStaleTeacherComplianceCandidates(
        {
          academicYearId: context.academicYearId,
          semesterId: context.semesterId,
          staleBefore: scheduleContext.staleBefore,
          limit: scheduleContext.maxSubjectsPerTarget
        },
        queryable
      );

      return candidates.map((candidate) => ({
        analysisType: "teacher_compliance_summary",
        subjectType: "teacher",
        subjectId: candidate.teacherId,
        inputJson: {
          trigger: "scheduled_recompute",
          academicYearName: context.academicYearName,
          semesterName: context.semesterName,
          subjectDisplayName: candidate.fullName,
          teacherUserId: candidate.teacherUserId
        }
      }));
    }

    if (target === "class_overview") {
      const candidates = await this.analyticsRepository.listStaleClassOverviewCandidates(
        {
          academicYearId: context.academicYearId,
          semesterId: context.semesterId,
          staleBefore: scheduleContext.staleBefore,
          limit: scheduleContext.maxSubjectsPerTarget
        },
        queryable
      );

      return candidates.map((candidate) => ({
        analysisType: "class_overview",
        subjectType: "class",
        subjectId: candidate.classId,
        inputJson: {
          trigger: "scheduled_recompute",
          academicYearName: context.academicYearName,
          semesterName: context.semesterName,
          subjectDisplayName: buildClassSubjectDisplayName(candidate)
        }
      }));
    }

    if (target === "transport_route_anomaly_summary") {
      const candidates = await this.analyticsRepository.listStaleTransportRouteAnomalyCandidates(
        {
          academicYearId: context.academicYearId,
          semesterId: context.semesterId,
          staleBefore: scheduleContext.staleBefore,
          limit: scheduleContext.maxSubjectsPerTarget
        },
        queryable
      );

      return candidates.map((candidate) => ({
        analysisType: "transport_route_anomaly_summary",
        subjectType: "route",
        subjectId: candidate.routeId,
        inputJson: {
          trigger: "scheduled_recompute",
          academicYearName: context.academicYearName,
          semesterName: context.semesterName,
          subjectDisplayName: buildRouteSubjectDisplayName(candidate)
        }
      }));
    }

    const latestDigestSnapshot = await this.analyticsRepository.findLatestSnapshot(
      {
        analysisType: "admin_operational_digest",
        subjectType: "system",
        subjectId: ANALYTICS_ADMIN_DIGEST_SUBJECT_ID,
        academicYearId: context.academicYearId,
        semesterId: context.semesterId
      },
      queryable
    );

    if (latestDigestSnapshot && latestDigestSnapshot.computedAt >= scheduleContext.staleBefore) {
      return [];
    }

    return [this.resolveAdminOperationalDigestSubject(context, "scheduled_recompute")];
  }

  private async buildRecomputeSubjects(
    payload: CreateAnalyticsRecomputeJobRequestDto,
    queryable: Queryable,
    context: ActiveAnalyticsContext
  ): Promise<ResolvedAnalyticsJobSubject[]> {
    const subjects: ResolvedAnalyticsJobSubject[] = [];

    if (this.shouldIncludeRecomputeTarget(payload.target, "student_risk_summary")) {
      if (payload.studentIds) {
        for (const studentId of payload.studentIds) {
          subjects.push(
            await this.resolveStudentRiskSubject(studentId, queryable, context, "admin_recompute")
          );
        }
      } else {
        const students = await this.analyticsRepository.listActiveStudentSubjectsByAcademicYear(
          context.academicYearId,
          queryable
        );

        for (const student of students) {
          subjects.push({
            analysisType: "student_risk_summary",
            subjectType: "student",
            subjectId: student.studentId,
            inputJson: {
              trigger: "admin_recompute",
              academicYearName: context.academicYearName,
              semesterName: context.semesterName,
              subjectDisplayName: student.fullName
            }
          });
        }
      }
    }

    if (this.shouldIncludeRecomputeTarget(payload.target, "teacher_compliance_summary")) {
      if (payload.teacherIds) {
        for (const teacherId of payload.teacherIds) {
          subjects.push(
            await this.resolveTeacherComplianceSubject(
              teacherId,
              queryable,
              context,
              "admin_recompute"
            )
          );
        }
      } else {
        const assignments = await this.academicStructureRepository.listTeacherAssignments(
          { academicYearId: context.academicYearId },
          queryable
        );
        const dedupedTeachers = Array.from(
          new Map(assignments.map((assignment) => [assignment.teacherId, assignment])).values()
        ).sort((left, right) =>
          left.teacherFullName.localeCompare(right.teacherFullName, "en", { sensitivity: "base" })
        );

        for (const teacher of dedupedTeachers) {
          subjects.push({
            analysisType: "teacher_compliance_summary",
            subjectType: "teacher",
            subjectId: teacher.teacherId,
            inputJson: {
              trigger: "admin_recompute",
              academicYearName: context.academicYearName,
              semesterName: context.semesterName,
              subjectDisplayName: teacher.teacherFullName,
              teacherUserId: teacher.teacherUserId
            }
          });
        }
      }
    }

    if (this.shouldIncludeRecomputeTarget(payload.target, "class_overview")) {
      if (payload.classIds) {
        for (const classId of payload.classIds) {
          subjects.push(
            await this.resolveClassOverviewSubject(classId, queryable, context, "admin_recompute")
          );
        }
      } else {
        const classRows = await this.academicStructureRepository.listClasses(
          {
            academicYearId: context.academicYearId,
            isActive: true
          },
          queryable
        );

        for (const classRow of classRows) {
          subjects.push({
            analysisType: "class_overview",
            subjectType: "class",
            subjectId: classRow.id,
            inputJson: {
              trigger: "admin_recompute",
              academicYearName: context.academicYearName,
              semesterName: context.semesterName,
              subjectDisplayName: buildClassSubjectDisplayName(classRow)
            }
          });
        }
      }
    }

    if (this.shouldIncludeRecomputeTarget(payload.target, "transport_route_anomaly_summary")) {
      if (payload.routeIds) {
        for (const routeId of payload.routeIds) {
          subjects.push(
            await this.resolveTransportRouteAnomalySubject(
              routeId,
              queryable,
              context,
              "admin_recompute"
            )
          );
        }
      } else {
        const routes = (await this.transportRepository.listRoutes(queryable))
          .filter((route) => route.isActive)
          .sort((left, right) =>
            left.routeName.localeCompare(right.routeName, "en", { sensitivity: "base" })
          );

        for (const route of routes) {
          subjects.push({
            analysisType: "transport_route_anomaly_summary",
            subjectType: "route",
            subjectId: route.id,
            inputJson: {
              trigger: "admin_recompute",
              academicYearName: context.academicYearName,
              semesterName: context.semesterName,
              subjectDisplayName: buildRouteSubjectDisplayName(route)
            }
          });
        }
      }
    }

    if (this.shouldIncludeRecomputeTarget(payload.target, "admin_operational_digest")) {
      subjects.push(this.resolveAdminOperationalDigestSubject(context, "admin_recompute"));
    }

    return subjects;
  }

  private async resolveStudentRiskSubject(
    studentId: string,
    queryable: Queryable,
    context: ActiveAnalyticsContext,
    trigger: "admin_manual" | "admin_recompute" | "scheduled_recompute"
  ): Promise<ResolvedAnalyticsJobSubject> {
    const student = assertFound(
      await this.reportingRepository.findStudentById(studentId, queryable),
      "Student"
    );

    if (student.academicYearId !== context.academicYearId) {
      throw buildStudentContextMismatchError();
    }

    return {
      analysisType: "student_risk_summary",
      subjectType: "student",
      subjectId: student.studentId,
      inputJson: {
        trigger,
        academicYearName: context.academicYearName,
        semesterName: context.semesterName,
        subjectDisplayName: student.fullName
      }
    };
  }

  private async resolveTeacherComplianceSubject(
    teacherId: string,
    queryable: Queryable,
    context: ActiveAnalyticsContext,
    trigger: "admin_manual" | "admin_recompute" | "scheduled_recompute"
  ): Promise<ResolvedAnalyticsJobSubject> {
    const teacher = await this.profileResolutionService.requireTeacherProfileIdentifier(
      teacherId,
      queryable,
      "teacherId"
    );

    return {
      analysisType: "teacher_compliance_summary",
      subjectType: "teacher",
      subjectId: teacher.teacherId,
      inputJson: {
        trigger,
        academicYearName: context.academicYearName,
        semesterName: context.semesterName,
        subjectDisplayName: teacher.fullName,
        teacherUserId: teacher.userId
      }
    };
  }

  private resolveAdminOperationalDigestSubject(
    context: ActiveAnalyticsContext,
    trigger: "admin_manual" | "admin_recompute" | "scheduled_recompute"
  ): ResolvedAnalyticsJobSubject {
    return {
      analysisType: "admin_operational_digest",
      subjectType: "system",
      subjectId: ANALYTICS_ADMIN_DIGEST_SUBJECT_ID,
      inputJson: {
        trigger,
        academicYearName: context.academicYearName,
        semesterName: context.semesterName,
        subjectDisplayName: "Admin Operational Digest"
      }
    };
  }

  private async resolveClassOverviewSubject(
    classId: string,
    queryable: Queryable,
    context: ActiveAnalyticsContext,
    trigger: "admin_manual" | "admin_recompute" | "scheduled_recompute"
  ): Promise<ResolvedAnalyticsJobSubject> {
    const classRow = assertFound(
      await this.academicStructureRepository.findClassById(classId, queryable),
      "Class"
    );

    if (classRow.academicYearId !== context.academicYearId) {
      throw buildClassContextMismatchError();
    }

    return {
      analysisType: "class_overview",
      subjectType: "class",
      subjectId: classRow.id,
      inputJson: {
        trigger,
        academicYearName: context.academicYearName,
        semesterName: context.semesterName,
        subjectDisplayName: buildClassSubjectDisplayName(classRow)
      }
    };
  }

  private async resolveTransportRouteAnomalySubject(
    routeId: string,
    queryable: Queryable,
    context: ActiveAnalyticsContext,
    trigger: "admin_manual" | "admin_recompute" | "scheduled_recompute"
  ): Promise<ResolvedAnalyticsJobSubject> {
    const route = assertFound(await this.transportRepository.findRouteById(routeId, queryable), "Route");

    return {
      analysisType: "transport_route_anomaly_summary",
      subjectType: "route",
      subjectId: route.id,
      inputJson: {
        trigger,
        academicYearName: context.academicYearName,
        semesterName: context.semesterName,
        subjectDisplayName: buildRouteSubjectDisplayName(route)
      }
    };
  }

  private async assertSnapshotFeedbackAccess(
    authUser: AuthenticatedUser,
    snapshotRow: AnalyticsSnapshotRow,
    queryable: Queryable = db
  ): Promise<void> {
    if (authUser.role === "admin") {
      return;
    }

    if (snapshotRow.analysisType === "student_risk_summary" && authUser.role === "parent") {
      const parentProfile = await this.profileResolutionService.requireParentProfile(
        authUser.userId,
        queryable
      );
      await this.ownershipService.assertParentOwnsStudent(
        parentProfile.parentId,
        snapshotRow.subjectId,
        queryable
      );
      return;
    }

    if (snapshotRow.analysisType === "class_overview" && authUser.role === "teacher") {
      const teacherProfile = await this.profileResolutionService.requireTeacherProfile(
        authUser.userId,
        queryable
      );
      await this.ownershipService.assertTeacherAssignedToClassYear(
        teacherProfile.teacherId,
        snapshotRow.subjectId,
        snapshotRow.academicYearId,
        undefined,
        queryable
      );
      return;
    }

    if (snapshotRow.analysisType === "class_overview" && authUser.role === "supervisor") {
      const supervisorProfile = await this.profileResolutionService.requireSupervisorProfile(
        authUser.userId,
        queryable
      );
      await this.ownershipService.assertSupervisorAssignedToClassYear(
        supervisorProfile.supervisorId,
        snapshotRow.subjectId,
        snapshotRow.academicYearId,
        queryable
      );
      return;
    }

    throw new ForbiddenError(
      "You do not have permission to submit feedback for this analytics snapshot"
    );
  }

  private async buildNarrativeRefinementContext(
    job: AnalyticsJobRow
  ): Promise<AnalyticsNarrativeRefinementContext> {
    const feedback = await this.analyticsRepository.aggregateFeedbackForSubjectContext({
      analysisType: job.analysisType,
      subjectType: job.subjectType,
      subjectId: job.subjectId,
      academicYearId: job.academicYearId,
      semesterId: job.semesterId
    });

    return {
      feedback: feedback
        ? {
            totalFeedbackCount: feedback.totalFeedbackCount,
            averageRating: feedback.averageRating,
            positiveFeedbackCount: feedback.positiveFeedbackCount,
            negativeFeedbackCount: feedback.negativeFeedbackCount,
            neutralFeedbackCount: feedback.neutralFeedbackCount,
            latestFeedbackAt: feedback.latestFeedbackAt
              ? feedback.latestFeedbackAt.toISOString()
              : null,
            recentFeedbackTexts: feedback.recentFeedbackTexts
          }
        : null
    };
  }

  private async buildStudentRiskSnapshot(
    job: AnalyticsJobRow
  ): Promise<{
    providerKey: AnalyticsJobRow["selectedProvider"];
    fallbackUsed: boolean;
    snapshot: AnalyticsStudentRiskSnapshot;
  }> {
    const student = assertFound(
      await this.reportingRepository.findStudentById(job.subjectId),
      "Student"
    );
    const homeworkSummary = await this.analyticsRepository.findStudentHomeworkSummary(
      job.subjectId,
      job.academicYearId,
      job.semesterId
    );
    const attendanceSummary = await this.reportingRepository.findStudentAttendanceSummary(
      job.subjectId,
      job.academicYearId,
      job.semesterId
    );
    const assessmentSummaries = await this.reportingRepository.listStudentAssessmentSummaries(
      job.subjectId,
      job.academicYearId,
      job.semesterId
    );
    const behaviorSummary = await this.reportingRepository.findStudentBehaviorSummary(
      job.subjectId,
      job.academicYearId,
      job.semesterId
    );
    const contextNames = extractContextNames(job.inputJson, {
      academicYearName: student.academicYearName,
      semesterName: job.semesterId
    });

    const featurePayload = buildStudentRiskFeaturePayload({
      student,
      activeContext: {
        academicYearId: job.academicYearId,
        academicYearName: contextNames.academicYearName,
        semesterId: job.semesterId,
        semesterName: contextNames.semesterName
      },
      attendanceSummary,
      assessmentSummaries,
      behaviorSummary,
      homeworkSummary
    });

    const deterministicInsight = buildDeterministicStudentRiskInsight(featurePayload);
    const refinementContext = await this.buildNarrativeRefinementContext(job);
    const providerResult = await this.generateStudentNarrative(
      job,
      featurePayload,
      deterministicInsight,
      refinementContext
    );

    return {
      providerKey: providerResult.providerKey,
      fallbackUsed: providerResult.fallbackUsed,
      snapshot: {
        featurePayload,
        insight: providerResult.insight
      }
    };
  }

  private async buildTeacherComplianceSnapshot(
    job: AnalyticsJobRow
  ): Promise<{
    providerKey: AnalyticsJobRow["selectedProvider"];
    fallbackUsed: boolean;
    snapshot: AnalyticsTeacherComplianceSnapshot;
  }> {
    const teacher = await this.profileResolutionService.requireTeacherProfileIdentifier(
      job.subjectId,
      db,
      "teacherId"
    );
    const assignmentCount = await this.analyticsRepository.findTeacherAssignmentCount(
      teacher.teacherId,
      job.academicYearId
    );
    const attendanceSummary = await this.analyticsRepository.findTeacherAttendanceSummary(
      teacher.teacherId,
      job.academicYearId,
      job.semesterId
    );
    const assessmentSummary = await this.analyticsRepository.findTeacherAssessmentSummary(
      teacher.teacherId,
      job.academicYearId,
      job.semesterId
    );
    const homeworkSummary = await this.analyticsRepository.findTeacherHomeworkSummary(
      teacher.teacherId,
      job.academicYearId,
      job.semesterId
    );
    const behaviorSummary = await this.analyticsRepository.findTeacherBehaviorSummary(
      teacher.teacherId,
      job.academicYearId,
      job.semesterId
    );
    const contextNames = extractContextNames(job.inputJson, {
      academicYearName: job.academicYearId,
      semesterName: job.semesterId
    });

    const featurePayload = buildTeacherComplianceFeaturePayload({
      teacher,
      activeContext: {
        academicYearId: job.academicYearId,
        academicYearName: contextNames.academicYearName,
        semesterId: job.semesterId,
        semesterName: contextNames.semesterName
      },
      assignmentCount,
      attendanceSummary,
      assessmentSummary,
      homeworkSummary,
      behaviorSummary
    });

    const deterministicInsight = buildDeterministicTeacherComplianceInsight(featurePayload);
    const refinementContext = await this.buildNarrativeRefinementContext(job);
    const providerResult = await this.generateTeacherNarrative(
      job,
      featurePayload,
      deterministicInsight,
      refinementContext
    );

    return {
      providerKey: providerResult.providerKey,
      fallbackUsed: providerResult.fallbackUsed,
      snapshot: {
        featurePayload,
        insight: providerResult.insight
      }
    };
  }

  private async buildAdminOperationalDigestSnapshot(
    job: AnalyticsJobRow
  ): Promise<{
    providerKey: AnalyticsJobRow["selectedProvider"];
    fallbackUsed: boolean;
    snapshot: AnalyticsAdminOperationalDigestSnapshot;
  }> {
    const dashboardSummary = assertFound(
      await this.reportingRepository.findAdminDashboardSummary(),
      "Admin dashboard summary"
    );
    const attendanceSummary = await this.analyticsRepository.findOperationalAttendanceSummary(
      job.academicYearId,
      job.semesterId
    );
    const assessmentSummary = await this.analyticsRepository.findOperationalAssessmentSummary(
      job.academicYearId,
      job.semesterId
    );
    const homeworkSummary = await this.analyticsRepository.findOperationalHomeworkSummary(
      job.academicYearId,
      job.semesterId
    );
    const behaviorSummary = await this.analyticsRepository.findOperationalBehaviorSummary(
      job.academicYearId,
      job.semesterId
    );
    const contextNames = extractContextNames(job.inputJson, {
      academicYearName: job.academicYearId,
      semesterName: job.semesterId
    });

    const featurePayload = buildAdminOperationalDigestFeaturePayload({
      activeContext: {
        academicYearId: job.academicYearId,
        academicYearName: contextNames.academicYearName,
        semesterId: job.semesterId,
        semesterName: contextNames.semesterName
      },
      dashboardSummary,
      attendanceSummary,
      assessmentSummary,
      homeworkSummary,
      behaviorSummary
    });

    const deterministicInsight = buildDeterministicAdminOperationalDigestInsight(featurePayload);
    const refinementContext = await this.buildNarrativeRefinementContext(job);
    const providerResult = await this.generateAdminOperationalDigestNarrative(
      job,
      featurePayload,
      deterministicInsight,
      refinementContext
    );

    return {
      providerKey: providerResult.providerKey,
      fallbackUsed: providerResult.fallbackUsed,
      snapshot: {
        featurePayload,
        insight: providerResult.insight
      }
    };
  }

  private async buildClassOverviewSnapshot(
    job: AnalyticsJobRow
  ): Promise<{
    providerKey: AnalyticsJobRow["selectedProvider"];
    fallbackUsed: boolean;
    snapshot: AnalyticsClassOverviewSnapshot;
  }> {
    const classRow = assertFound(
      await this.academicStructureRepository.findClassById(job.subjectId),
      "Class"
    );

    if (classRow.academicYearId !== job.academicYearId) {
      throw buildClassContextMismatchError();
    }

    const students = await this.reportingRepository.listStudentsByClass(
      job.subjectId,
      job.academicYearId
    );
    const studentIds = students.map((student) => student.studentId);
    const attendanceSummaries = await this.reportingRepository.listStudentAttendanceSummaries(
      studentIds,
      job.academicYearId,
      job.semesterId
    );
    const assessmentSummaries =
      await this.reportingRepository.listStudentAssessmentSummariesByStudentIds(
        studentIds,
        job.academicYearId,
        job.semesterId
      );
    const behaviorSummaries = await this.reportingRepository.listStudentBehaviorSummaries(
      studentIds,
      job.academicYearId,
      job.semesterId
    );
    const homeworkSummary = await this.analyticsRepository.findClassHomeworkSummary(
      job.subjectId,
      job.academicYearId,
      job.semesterId
    );
    const contextNames = extractContextNames(job.inputJson, {
      academicYearName: classRow.academicYearName,
      semesterName: job.semesterId
    });

    const featurePayload = buildClassOverviewFeaturePayload({
      classRow,
      activeContext: {
        academicYearId: job.academicYearId,
        academicYearName: contextNames.academicYearName,
        semesterId: job.semesterId,
        semesterName: contextNames.semesterName
      },
      students,
      attendanceSummaries,
      assessmentSummaries,
      behaviorSummaries,
      homeworkSummary
    });

    const deterministicInsight = buildDeterministicClassOverviewInsight(featurePayload);
    const refinementContext = await this.buildNarrativeRefinementContext(job);
    const providerResult = await this.generateClassOverviewNarrative(
      job,
      featurePayload,
      deterministicInsight,
      refinementContext
    );

    return {
      providerKey: providerResult.providerKey,
      fallbackUsed: providerResult.fallbackUsed,
      snapshot: {
        featurePayload,
        insight: providerResult.insight
      }
    };
  }

  private async buildTransportRouteAnomalySnapshot(
    job: AnalyticsJobRow
  ): Promise<{
    providerKey: AnalyticsJobRow["selectedProvider"];
    fallbackUsed: boolean;
    snapshot: AnalyticsTransportRouteAnomalySnapshot;
  }> {
    const route = assertFound(await this.transportRepository.findRouteById(job.subjectId), "Route");
    const semester = assertFound(
      await this.academicStructureRepository.findSemesterById(job.semesterId),
      "Semester"
    );
    const stopCount = (await this.transportRepository.listRouteStopsByRouteId(job.subjectId)).length;
    const contextNames = extractContextNames(job.inputJson, {
      academicYearName: job.academicYearId,
      semesterName: semester.name
    });
    const inputWindow = buildTransportInputWindow({
      semesterStartDate: semester.startDate,
      semesterEndDate: semester.endDate
    });
    const delayedThresholdMinutes = Math.max(route.estimatedDurationMinutes * 1.25, 15);
    const staleActiveThresholdMinutes = Math.max(route.estimatedDurationMinutes * 1.5, 30);
    const operationalSummary = await this.analyticsRepository.findTransportRouteOperationalSummary({
      routeId: job.subjectId,
      dateFrom: inputWindow.fromDate,
      dateTo: inputWindow.toDate,
      delayThresholdMinutes: delayedThresholdMinutes,
      staleActiveThresholdMinutes
    });

    const featurePayload = buildTransportRouteAnomalyFeaturePayload({
      route,
      stopCount,
      activeContext: {
        academicYearId: job.academicYearId,
        academicYearName: contextNames.academicYearName,
        semesterId: job.semesterId,
        semesterName: contextNames.semesterName
      },
      inputWindow,
      operationalSummary
    });

    const deterministicInsight = buildDeterministicTransportRouteAnomalyInsight(featurePayload);
    const refinementContext = await this.buildNarrativeRefinementContext(job);
    const providerResult = await this.generateTransportRouteAnomalyNarrative(
      job,
      featurePayload,
      deterministicInsight,
      refinementContext
    );

    return {
      providerKey: providerResult.providerKey,
      fallbackUsed: providerResult.fallbackUsed,
      snapshot: {
        featurePayload,
        insight: providerResult.insight
      }
    };
  }

  private async generateStudentNarrative(
    job: AnalyticsJobRow,
    featurePayload: StudentRiskFeaturePayload,
    deterministicInsight: StudentRiskInsight,
    refinementContext: AnalyticsNarrativeRefinementContext
  ): Promise<ProviderExecutionResult<StudentRiskInsight>> {
    const resolvedProviders = this.providerResolver.resolve(job.primaryProvider, job.fallbackProvider);
    const attempts = [
      {
        selection: resolvedProviders.primarySelection,
        provider: resolvedProviders.primaryProvider,
        fallbackUsed: false
      },
      {
        selection: resolvedProviders.fallbackSelection,
        provider: resolvedProviders.fallbackProvider,
        fallbackUsed: true
      }
    ];

    for (const attempt of attempts) {
      if (!attempt.provider) {
        continue;
      }

      try {
        const generated = await attempt.provider.generateStudentRiskInsight(
          featurePayload,
          refinementContext
        );

        return {
          providerKey: attempt.selection,
          fallbackUsed: attempt.fallbackUsed,
          insight: refineStudentRiskInsightWithFeedback(
            mergeStudentRiskNarrative(deterministicInsight, generated),
            refinementContext.feedback
          )
        };
      } catch (error) {
        logger.warn(
          {
            jobId: job.id,
            providerKey: attempt.selection,
            analysisType: job.analysisType,
            err: error
          },
          "Student analytics provider failed; trying fallback or deterministic narrative"
        );
      }
    }

    return {
      providerKey: null,
      fallbackUsed: false,
      insight: refineStudentRiskInsightWithFeedback(deterministicInsight, refinementContext.feedback)
    };
  }

  private async generateTeacherNarrative(
    job: AnalyticsJobRow,
    featurePayload: TeacherComplianceFeaturePayload,
    deterministicInsight: TeacherComplianceInsight,
    refinementContext: AnalyticsNarrativeRefinementContext
  ): Promise<ProviderExecutionResult<TeacherComplianceInsight>> {
    const resolvedProviders = this.providerResolver.resolve(job.primaryProvider, job.fallbackProvider);
    const attempts = [
      {
        selection: resolvedProviders.primarySelection,
        provider: resolvedProviders.primaryProvider,
        fallbackUsed: false
      },
      {
        selection: resolvedProviders.fallbackSelection,
        provider: resolvedProviders.fallbackProvider,
        fallbackUsed: true
      }
    ];

    for (const attempt of attempts) {
      if (!attempt.provider) {
        continue;
      }

      try {
        const generated = await attempt.provider.generateTeacherComplianceInsight(
          featurePayload,
          refinementContext
        );

        return {
          providerKey: attempt.selection,
          fallbackUsed: attempt.fallbackUsed,
          insight: refineTeacherComplianceInsightWithFeedback(
            mergeTeacherComplianceNarrative(deterministicInsight, generated),
            refinementContext.feedback
          )
        };
      } catch (error) {
        logger.warn(
          {
            jobId: job.id,
            providerKey: attempt.selection,
            analysisType: job.analysisType,
            err: error
          },
          "Teacher analytics provider failed; trying fallback or deterministic narrative"
        );
      }
    }

    return {
      providerKey: null,
      fallbackUsed: false,
      insight: refineTeacherComplianceInsightWithFeedback(
        deterministicInsight,
        refinementContext.feedback
      )
    };
  }

  private async generateAdminOperationalDigestNarrative(
    job: AnalyticsJobRow,
    featurePayload: AdminOperationalDigestFeaturePayload,
    deterministicInsight: AdminOperationalDigestInsight,
    refinementContext: AnalyticsNarrativeRefinementContext
  ): Promise<ProviderExecutionResult<AdminOperationalDigestInsight>> {
    const resolvedProviders = this.providerResolver.resolve(job.primaryProvider, job.fallbackProvider);
    const attempts = [
      {
        selection: resolvedProviders.primarySelection,
        provider: resolvedProviders.primaryProvider,
        fallbackUsed: false
      },
      {
        selection: resolvedProviders.fallbackSelection,
        provider: resolvedProviders.fallbackProvider,
        fallbackUsed: true
      }
    ];

    for (const attempt of attempts) {
      if (!attempt.provider) {
        continue;
      }

      try {
        const generated = await attempt.provider.generateAdminOperationalDigestInsight(
          featurePayload,
          refinementContext
        );

        return {
          providerKey: attempt.selection,
          fallbackUsed: attempt.fallbackUsed,
          insight: refineAdminOperationalDigestInsightWithFeedback(
            mergeAdminOperationalDigestNarrative(deterministicInsight, generated),
            refinementContext.feedback
          )
        };
      } catch (error) {
        logger.warn(
          {
            jobId: job.id,
            providerKey: attempt.selection,
            analysisType: job.analysisType,
            err: error
          },
          "Admin operational digest provider failed; trying fallback or deterministic narrative"
        );
      }
    }

    return {
      providerKey: null,
      fallbackUsed: false,
      insight: refineAdminOperationalDigestInsightWithFeedback(
        deterministicInsight,
        refinementContext.feedback
      )
    };
  }

  private async generateClassOverviewNarrative(
    job: AnalyticsJobRow,
    featurePayload: ClassOverviewFeaturePayload,
    deterministicInsight: ClassOverviewInsight,
    refinementContext: AnalyticsNarrativeRefinementContext
  ): Promise<ProviderExecutionResult<ClassOverviewInsight>> {
    const resolvedProviders = this.providerResolver.resolve(job.primaryProvider, job.fallbackProvider);
    const attempts = [
      {
        selection: resolvedProviders.primarySelection,
        provider: resolvedProviders.primaryProvider,
        fallbackUsed: false
      },
      {
        selection: resolvedProviders.fallbackSelection,
        provider: resolvedProviders.fallbackProvider,
        fallbackUsed: true
      }
    ];

    for (const attempt of attempts) {
      if (!attempt.provider) {
        continue;
      }

      try {
        const generated = await attempt.provider.generateClassOverviewInsight(
          featurePayload,
          refinementContext
        );

        return {
          providerKey: attempt.selection,
          fallbackUsed: attempt.fallbackUsed,
          insight: refineClassOverviewInsightWithFeedback(
            mergeClassOverviewNarrative(deterministicInsight, generated),
            refinementContext.feedback
          )
        };
      } catch (error) {
        logger.warn(
          {
            jobId: job.id,
            providerKey: attempt.selection,
            analysisType: job.analysisType,
            err: error
          },
          "Class overview provider failed; trying fallback or deterministic narrative"
        );
      }
    }

    return {
      providerKey: null,
      fallbackUsed: false,
      insight: refineClassOverviewInsightWithFeedback(deterministicInsight, refinementContext.feedback)
    };
  }

  private async generateTransportRouteAnomalyNarrative(
    job: AnalyticsJobRow,
    featurePayload: TransportRouteAnomalyFeaturePayload,
    deterministicInsight: TransportRouteAnomalyInsight,
    refinementContext: AnalyticsNarrativeRefinementContext
  ): Promise<ProviderExecutionResult<TransportRouteAnomalyInsight>> {
    const resolvedProviders = this.providerResolver.resolve(job.primaryProvider, job.fallbackProvider);
    const attempts = [
      {
        selection: resolvedProviders.primarySelection,
        provider: resolvedProviders.primaryProvider,
        fallbackUsed: false
      },
      {
        selection: resolvedProviders.fallbackSelection,
        provider: resolvedProviders.fallbackProvider,
        fallbackUsed: true
      }
    ];

    for (const attempt of attempts) {
      if (!attempt.provider) {
        continue;
      }

      try {
        const generated = await attempt.provider.generateTransportRouteAnomalyInsight(
          featurePayload,
          refinementContext
        );

        return {
          providerKey: attempt.selection,
          fallbackUsed: attempt.fallbackUsed,
          insight: refineTransportRouteAnomalyInsightWithFeedback(
            mergeTransportRouteAnomalyNarrative(deterministicInsight, generated),
            refinementContext.feedback
          )
        };
      } catch (error) {
        logger.warn(
          {
            jobId: job.id,
            providerKey: attempt.selection,
            analysisType: job.analysisType,
            err: error
          },
          "Transport route anomaly provider failed; trying fallback or deterministic narrative"
        );
      }
    }

    return {
      providerKey: null,
      fallbackUsed: false,
      insight: refineTransportRouteAnomalyInsightWithFeedback(
        deterministicInsight,
        refinementContext.feedback
      )
    };
  }
}

























































