import type { Request, Response } from "express";

import { buildSuccessResponse } from "../../../common/base/http-response";
import type { AuthenticatedUser } from "../../../common/types/auth.types";
import type {
  ReportingParentPreviewParamsDto,
  ReportingParentPreviewStudentParamsDto,
  ReportingStudentIdParamsDto,
  ReportingSupervisorPreviewParamsDto,
  ReportingTeacherPreviewParamsDto
} from "../dto/reporting.dto";
import type { ReportingService } from "../service/reporting.service";

const assertAuthUser = (req: Request): AuthenticatedUser => req.authUser as AuthenticatedUser;

export class ReportingController {
  constructor(private readonly reportingService: ReportingService) {}

  async getStudentProfile(req: Request, res: Response): Promise<void> {
    const params = req.validated?.params as ReportingStudentIdParamsDto;
    const response = await this.reportingService.getStudentProfile(
      assertAuthUser(req),
      params.studentId
    );
    res.status(200).json(buildSuccessResponse("Student profile fetched successfully", response));
  }

  async getStudentAttendanceReport(req: Request, res: Response): Promise<void> {
    const params = req.validated?.params as ReportingStudentIdParamsDto;
    const response = await this.reportingService.getStudentAttendanceReport(
      assertAuthUser(req),
      params.studentId
    );
    res
      .status(200)
      .json(buildSuccessResponse("Student attendance summary fetched successfully", response));
  }

  async getStudentAssessmentReport(req: Request, res: Response): Promise<void> {
    const params = req.validated?.params as ReportingStudentIdParamsDto;
    const response = await this.reportingService.getStudentAssessmentReport(
      assertAuthUser(req),
      params.studentId
    );
    res
      .status(200)
      .json(buildSuccessResponse("Student assessment summary fetched successfully", response));
  }

  async getStudentBehaviorReport(req: Request, res: Response): Promise<void> {
    const params = req.validated?.params as ReportingStudentIdParamsDto;
    const response = await this.reportingService.getStudentBehaviorReport(
      assertAuthUser(req),
      params.studentId
    );
    res
      .status(200)
      .json(buildSuccessResponse("Student behavior summary fetched successfully", response));
  }

  async getAdminPreviewParentDashboard(req: Request, res: Response): Promise<void> {
    const params = req.validated?.params as ReportingParentPreviewParamsDto;
    const response = await this.reportingService.getAdminPreviewParentDashboard(
      assertAuthUser(req),
      params.parentUserId
    );
    res
      .status(200)
      .json(buildSuccessResponse("Admin preview parent dashboard fetched successfully", response));
  }

  async getAdminPreviewParentStudentProfile(req: Request, res: Response): Promise<void> {
    const params = req.validated?.params as ReportingParentPreviewStudentParamsDto;
    const response = await this.reportingService.getAdminPreviewParentStudentProfile(
      assertAuthUser(req),
      params.parentUserId,
      params.studentId
    );
    res
      .status(200)
      .json(buildSuccessResponse("Admin preview child profile fetched successfully", response));
  }

  async getAdminPreviewParentStudentAttendanceReport(
    req: Request,
    res: Response
  ): Promise<void> {
    const params = req.validated?.params as ReportingParentPreviewStudentParamsDto;
    const response = await this.reportingService.getAdminPreviewParentStudentAttendanceReport(
      assertAuthUser(req),
      params.parentUserId,
      params.studentId
    );
    res.status(200).json(
      buildSuccessResponse("Admin preview child attendance summary fetched successfully", response)
    );
  }

  async getAdminPreviewParentStudentAssessmentReport(
    req: Request,
    res: Response
  ): Promise<void> {
    const params = req.validated?.params as ReportingParentPreviewStudentParamsDto;
    const response = await this.reportingService.getAdminPreviewParentStudentAssessmentReport(
      assertAuthUser(req),
      params.parentUserId,
      params.studentId
    );
    res.status(200).json(
      buildSuccessResponse("Admin preview child assessment summary fetched successfully", response)
    );
  }

  async getAdminPreviewParentStudentBehaviorReport(
    req: Request,
    res: Response
  ): Promise<void> {
    const params = req.validated?.params as ReportingParentPreviewStudentParamsDto;
    const response = await this.reportingService.getAdminPreviewParentStudentBehaviorReport(
      assertAuthUser(req),
      params.parentUserId,
      params.studentId
    );
    res.status(200).json(
      buildSuccessResponse("Admin preview child behavior summary fetched successfully", response)
    );
  }

  async getAdminPreviewParentTransportLiveStatus(req: Request, res: Response): Promise<void> {
    const params = req.validated?.params as ReportingParentPreviewStudentParamsDto;
    const response = await this.reportingService.getAdminPreviewParentTransportLiveStatus(
      assertAuthUser(req),
      params.parentUserId,
      params.studentId
    );

    res.status(200).json(
      buildSuccessResponse(
        "Admin preview child transport live status fetched successfully",
        response
      )
    );
  }

  async getAdminPreviewTeacherDashboard(req: Request, res: Response): Promise<void> {
    const params = req.validated?.params as ReportingTeacherPreviewParamsDto;
    const response = await this.reportingService.getAdminPreviewTeacherDashboard(
      assertAuthUser(req),
      params.teacherUserId
    );
    res
      .status(200)
      .json(buildSuccessResponse("Admin preview teacher dashboard fetched successfully", response));
  }

  async getAdminPreviewSupervisorDashboard(req: Request, res: Response): Promise<void> {
    const params = req.validated?.params as ReportingSupervisorPreviewParamsDto;
    const response = await this.reportingService.getAdminPreviewSupervisorDashboard(
      assertAuthUser(req),
      params.supervisorUserId
    );
    res.status(200).json(
      buildSuccessResponse("Admin preview supervisor dashboard fetched successfully", response)
    );
  }

  async getParentStudentProfile(req: Request, res: Response): Promise<void> {
    const params = req.validated?.params as ReportingStudentIdParamsDto;
    const response = await this.reportingService.getParentStudentProfile(
      assertAuthUser(req),
      params.studentId
    );
    res.status(200).json(buildSuccessResponse("Child profile fetched successfully", response));
  }

  async getParentStudentAttendanceReport(req: Request, res: Response): Promise<void> {
    const params = req.validated?.params as ReportingStudentIdParamsDto;
    const response = await this.reportingService.getParentStudentAttendanceReport(
      assertAuthUser(req),
      params.studentId
    );
    res
      .status(200)
      .json(buildSuccessResponse("Child attendance summary fetched successfully", response));
  }

  async getParentStudentAssessmentReport(req: Request, res: Response): Promise<void> {
    const params = req.validated?.params as ReportingStudentIdParamsDto;
    const response = await this.reportingService.getParentStudentAssessmentReport(
      assertAuthUser(req),
      params.studentId
    );
    res
      .status(200)
      .json(buildSuccessResponse("Child assessment summary fetched successfully", response));
  }

  async getParentStudentBehaviorReport(req: Request, res: Response): Promise<void> {
    const params = req.validated?.params as ReportingStudentIdParamsDto;
    const response = await this.reportingService.getParentStudentBehaviorReport(
      assertAuthUser(req),
      params.studentId
    );
    res
      .status(200)
      .json(buildSuccessResponse("Child behavior summary fetched successfully", response));
  }

  async getParentDashboard(req: Request, res: Response): Promise<void> {
    const response = await this.reportingService.getParentDashboard(assertAuthUser(req));
    res.status(200).json(buildSuccessResponse("Parent dashboard fetched successfully", response));
  }

  async getTeacherDashboard(req: Request, res: Response): Promise<void> {
    const response = await this.reportingService.getTeacherDashboard(assertAuthUser(req));
    res.status(200).json(buildSuccessResponse("Teacher dashboard fetched successfully", response));
  }

  async getSupervisorDashboard(req: Request, res: Response): Promise<void> {
    const response = await this.reportingService.getSupervisorDashboard(assertAuthUser(req));
    res.status(200).json(buildSuccessResponse("Supervisor dashboard fetched successfully", response));
  }

  async getAdminDashboard(req: Request, res: Response): Promise<void> {
    const response = await this.reportingService.getAdminDashboard(assertAuthUser(req));
    res.status(200).json(buildSuccessResponse("Admin dashboard fetched successfully", response));
  }

  async getTransportSummary(req: Request, res: Response): Promise<void> {
    const response = await this.reportingService.getTransportSummary(assertAuthUser(req));
    res.status(200).json(buildSuccessResponse("Transport summary fetched successfully", response));
  }

  async getParentTransportLiveStatus(req: Request, res: Response): Promise<void> {
    const params = req.validated?.params as ReportingStudentIdParamsDto;
    const response = await this.reportingService.getParentTransportLiveStatus(
      assertAuthUser(req),
      params.studentId
    );

    res.status(200).json(buildSuccessResponse("Child transport live status fetched successfully", response));
  }
}
