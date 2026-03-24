import type { Request, Response } from "express";

import { buildSuccessResponse } from "../../../common/base/http-response";
import type { AuthenticatedUser } from "../../../common/types/auth.types";
import type {
  AssessmentIdParamsDto,
  CreateAssessmentRequestDto,
  CreateAssessmentTypeRequestDto,
  ListAssessmentsQueryDto,
  SaveAssessmentScoresRequestDto,
  StudentAssessmentIdParamsDto,
  UpdateStudentAssessmentRequestDto
} from "../dto/assessments.dto";
import type { AssessmentsService } from "../service/assessments.service";

const assertAuthUser = (req: Request): AuthenticatedUser => req.authUser as AuthenticatedUser;

export class AssessmentsController {
  constructor(private readonly assessmentsService: AssessmentsService) {}

  async createType(req: Request, res: Response): Promise<void> {
    const payload = req.validated?.body as CreateAssessmentTypeRequestDto;
    const response = await this.assessmentsService.createAssessmentType(payload);

    res.status(201).json(buildSuccessResponse("Assessment type created successfully", response));
  }

  async listTypes(_req: Request, res: Response): Promise<void> {
    const response = await this.assessmentsService.listAssessmentTypes();

    res.status(200).json(buildSuccessResponse("Assessment types fetched successfully", response));
  }

  async create(req: Request, res: Response): Promise<void> {
    const payload = req.validated?.body as CreateAssessmentRequestDto;
    const response = await this.assessmentsService.createAssessment(assertAuthUser(req), payload);

    res.status(201).json(buildSuccessResponse("Assessment created successfully", response));
  }

  async list(req: Request, res: Response): Promise<void> {
    const query = req.validated?.query as ListAssessmentsQueryDto;
    const response = await this.assessmentsService.listAssessments(assertAuthUser(req), query);

    res.status(200).json(buildSuccessResponse("Assessments fetched successfully", response));
  }

  async getById(req: Request, res: Response): Promise<void> {
    const params = req.validated?.params as AssessmentIdParamsDto;
    const response = await this.assessmentsService.getAssessmentById(
      assertAuthUser(req),
      params.id
    );

    res.status(200).json(buildSuccessResponse("Assessment fetched successfully", response));
  }

  async getScores(req: Request, res: Response): Promise<void> {
    const params = req.validated?.params as AssessmentIdParamsDto;
    const response = await this.assessmentsService.getAssessmentScores(
      assertAuthUser(req),
      params.id
    );

    res.status(200).json(buildSuccessResponse("Assessment scores fetched successfully", response));
  }

  async saveScores(req: Request, res: Response): Promise<void> {
    const params = req.validated?.params as AssessmentIdParamsDto;
    const payload = req.validated?.body as SaveAssessmentScoresRequestDto;
    const response = await this.assessmentsService.saveAssessmentScores(
      assertAuthUser(req),
      params.id,
      payload
    );

    res.status(200).json(buildSuccessResponse("Assessment scores saved successfully", response));
  }

  async updateScore(req: Request, res: Response): Promise<void> {
    const params = req.validated?.params as StudentAssessmentIdParamsDto;
    const payload = req.validated?.body as UpdateStudentAssessmentRequestDto;
    const response = await this.assessmentsService.updateStudentAssessment(
      assertAuthUser(req),
      params.studentAssessmentId,
      payload
    );

    res.status(200).json(buildSuccessResponse("Student assessment updated successfully", response));
  }
}
