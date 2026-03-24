import type { Request, Response } from "express";

import { buildSuccessResponse } from "../../../common/base/http-response";
import type { AuthenticatedUser } from "../../../common/types/auth.types";
import type {
  CreateHomeworkRequestDto,
  HomeworkIdParamsDto,
  HomeworkStudentIdParamsDto,
  ListHomeworkQueryDto,
  SaveHomeworkSubmissionsRequestDto
} from "../dto/homework.dto";
import type { HomeworkService } from "../service/homework.service";

const assertAuthUser = (req: Request): AuthenticatedUser => req.authUser as AuthenticatedUser;

export class HomeworkController {
  constructor(private readonly homeworkService: HomeworkService) {}

  async create(req: Request, res: Response): Promise<void> {
    const payload = req.validated?.body as CreateHomeworkRequestDto;
    const response = await this.homeworkService.createHomework(assertAuthUser(req), payload);

    res.status(201).json(buildSuccessResponse("Homework created successfully", response));
  }

  async list(req: Request, res: Response): Promise<void> {
    const query = req.validated?.query as ListHomeworkQueryDto;
    const response = await this.homeworkService.listHomework(assertAuthUser(req), query);

    res.status(200).json(buildSuccessResponse("Homework fetched successfully", response));
  }

  async getById(req: Request, res: Response): Promise<void> {
    const params = req.validated?.params as HomeworkIdParamsDto;
    const response = await this.homeworkService.getHomeworkById(assertAuthUser(req), params.id);

    res.status(200).json(buildSuccessResponse("Homework fetched successfully", response));
  }

  async saveSubmissions(req: Request, res: Response): Promise<void> {
    const params = req.validated?.params as HomeworkIdParamsDto;
    const payload = req.validated?.body as SaveHomeworkSubmissionsRequestDto;
    const response = await this.homeworkService.saveHomeworkSubmissions(
      assertAuthUser(req),
      params.id,
      payload
    );

    res
      .status(200)
      .json(buildSuccessResponse("Homework submissions saved successfully", response));
  }

  async listStudentHomework(req: Request, res: Response): Promise<void> {
    const params = req.validated?.params as HomeworkStudentIdParamsDto;
    const response = await this.homeworkService.listStudentHomework(
      assertAuthUser(req),
      params.studentId
    );

    res
      .status(200)
      .json(buildSuccessResponse("Student homework fetched successfully", response));
  }
}
