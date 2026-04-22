import type { Request, Response } from "express";

import { buildSuccessResponse } from "../../../common/base/http-response";
import type { AuthenticatedUser } from "../../../common/types/auth.types";
import type {
  AnalyticsClassIdParamsDto,
  AnalyticsJobIdParamsDto,
  AnalyticsRouteIdParamsDto,
  AnalyticsSnapshotIdParamsDto,
  AnalyticsStudentIdParamsDto,
  AnalyticsTeacherIdParamsDto,
  CreateAdminOperationalDigestJobRequestDto,
  CreateAnalyticsFeedbackRequestDto,
  CreateAnalyticsRecomputeJobRequestDto,
  CreateAnalyticsRetentionCleanupRequestDto,
  ReviewAnalyticsSnapshotRequestDto,
  CreateClassOverviewJobRequestDto,
  CreateStudentRiskJobRequestDto,
  CreateTeacherComplianceJobRequestDto,
  CreateTransportRouteAnomalyJobRequestDto
} from "../dto/analytics.dto";
import type { AnalyticsService } from "../service/analytics.service";

const assertAuthUser = (req: Request): AuthenticatedUser => req.authUser as AuthenticatedUser;

export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  async createStudentRiskJob(req: Request, res: Response): Promise<void> {
    const payload = req.validated?.body as CreateStudentRiskJobRequestDto;
    const response = await this.analyticsService.createStudentRiskJob(assertAuthUser(req), payload);
    res.status(response.created ? 201 : 200).json(
      buildSuccessResponse(
        response.created
          ? "Student risk analytics job created successfully"
          : "Student risk analytics job already pending",
        response
      )
    );
  }

  async createTeacherComplianceJob(req: Request, res: Response): Promise<void> {
    const payload = req.validated?.body as CreateTeacherComplianceJobRequestDto;
    const response = await this.analyticsService.createTeacherComplianceJob(
      assertAuthUser(req),
      payload
    );
    res.status(response.created ? 201 : 200).json(
      buildSuccessResponse(
        response.created
          ? "Teacher compliance analytics job created successfully"
          : "Teacher compliance analytics job already pending",
        response
      )
    );
  }

  async createAdminOperationalDigestJob(req: Request, res: Response): Promise<void> {
    const payload = (req.validated?.body ?? {}) as CreateAdminOperationalDigestJobRequestDto;
    const response = await this.analyticsService.createAdminOperationalDigestJob(
      assertAuthUser(req),
      payload
    );
    res.status(response.created ? 201 : 200).json(
      buildSuccessResponse(
        response.created
          ? "Admin operational digest analytics job created successfully"
          : "Admin operational digest analytics job already pending",
        response
      )
    );
  }

  async createClassOverviewJob(req: Request, res: Response): Promise<void> {
    const payload = req.validated?.body as CreateClassOverviewJobRequestDto;
    const response = await this.analyticsService.createClassOverviewJob(assertAuthUser(req), payload);
    res.status(response.created ? 201 : 200).json(
      buildSuccessResponse(
        response.created
          ? "Class overview analytics job created successfully"
          : "Class overview analytics job already pending",
        response
      )
    );
  }

  async createTransportRouteAnomalyJob(req: Request, res: Response): Promise<void> {
    const payload = req.validated?.body as CreateTransportRouteAnomalyJobRequestDto;
    const response = await this.analyticsService.createTransportRouteAnomalyJob(
      assertAuthUser(req),
      payload
    );
    res.status(response.created ? 201 : 200).json(
      buildSuccessResponse(
        response.created
          ? "Transport route anomaly analytics job created successfully"
          : "Transport route anomaly analytics job already pending",
        response
      )
    );
  }

  async createScheduledDispatch(req: Request, res: Response): Promise<void> {
    const response = await this.analyticsService.dispatchScheduledRecomputeJobs(assertAuthUser(req));
    res.status(200).json(
      buildSuccessResponse("Scheduled analytics recompute dispatch completed successfully", response)
    );
  }

  async createRecomputeJob(req: Request, res: Response): Promise<void> {
    const payload = req.validated?.body as CreateAnalyticsRecomputeJobRequestDto;
    const response = await this.analyticsService.createRecomputeJobs(assertAuthUser(req), payload);
    res.status(200).json(
      buildSuccessResponse("Analytics recompute jobs dispatched successfully", response)
    );
  }

  async runRetentionCleanup(req: Request, res: Response): Promise<void> {
    const _payload = (req.validated?.body ?? {}) as CreateAnalyticsRetentionCleanupRequestDto;
    const response = await this.analyticsService.runRetentionCleanup(assertAuthUser(req));
    res.status(200).json(
      buildSuccessResponse("Analytics retention cleanup completed successfully", response)
    );
  }

  async reviewSnapshot(req: Request, res: Response): Promise<void> {
    const params = req.validated?.params as AnalyticsSnapshotIdParamsDto;
    const payload = req.validated?.body as ReviewAnalyticsSnapshotRequestDto;
    const response = await this.analyticsService.reviewSnapshot(
      assertAuthUser(req),
      params.snapshotId,
      payload
    );
    res
      .status(200)
      .json(buildSuccessResponse("Analytics snapshot review updated successfully", response));
  }

  async createSnapshotFeedback(req: Request, res: Response): Promise<void> {
    const params = req.validated?.params as AnalyticsSnapshotIdParamsDto;
    const payload = req.validated?.body as CreateAnalyticsFeedbackRequestDto;
    const response = await this.analyticsService.createSnapshotFeedback(
      assertAuthUser(req),
      params.snapshotId,
      payload
    );
    res
      .status(201)
      .json(buildSuccessResponse("Analytics feedback created successfully", response));
  }

  async getJobById(req: Request, res: Response): Promise<void> {
    const params = req.validated?.params as AnalyticsJobIdParamsDto;
    const response = await this.analyticsService.getJobById(params.jobId);
    res.status(200).json(buildSuccessResponse("Analytics job fetched successfully", response));
  }

  async listSnapshotFeedback(req: Request, res: Response): Promise<void> {
    const params = req.validated?.params as AnalyticsSnapshotIdParamsDto;
    const response = await this.analyticsService.listSnapshotFeedback(params.snapshotId);
    res
      .status(200)
      .json(buildSuccessResponse("Analytics feedback fetched successfully", response));
  }

  async getStudentRiskSummary(req: Request, res: Response): Promise<void> {
    const params = req.validated?.params as AnalyticsStudentIdParamsDto;
    const response = await this.analyticsService.getStudentRiskSummary(
      assertAuthUser(req),
      params.studentId
    );
    res
      .status(200)
      .json(buildSuccessResponse("Student risk analytics snapshot fetched successfully", response));
  }

  async getTeacherComplianceSummary(req: Request, res: Response): Promise<void> {
    const params = req.validated?.params as AnalyticsTeacherIdParamsDto;
    const response = await this.analyticsService.getTeacherComplianceSummary(params.teacherId);
    res.status(200).json(
      buildSuccessResponse("Teacher compliance analytics snapshot fetched successfully", response)
    );
  }

  async getAdminOperationalDigestSummary(req: Request, res: Response): Promise<void> {
    const response = await this.analyticsService.getAdminOperationalDigestSummary();
    res.status(200).json(
      buildSuccessResponse("Admin operational digest analytics snapshot fetched successfully", response)
    );
  }

  async getClassOverviewSummary(req: Request, res: Response): Promise<void> {
    const params = req.validated?.params as AnalyticsClassIdParamsDto;
    const response = await this.analyticsService.getClassOverviewSummary(
      assertAuthUser(req),
      params.classId
    );
    res.status(200).json(
      buildSuccessResponse("Class overview analytics snapshot fetched successfully", response)
    );
  }

  async getTransportRouteAnomalySummary(req: Request, res: Response): Promise<void> {
    const params = req.validated?.params as AnalyticsRouteIdParamsDto;
    const response = await this.analyticsService.getTransportRouteAnomalySummary(params.routeId);
    res.status(200).json(
      buildSuccessResponse(
        "Transport route anomaly analytics snapshot fetched successfully",
        response
      )
    );
  }
}
