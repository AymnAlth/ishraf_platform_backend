import type { Request, Response } from "express";

import { buildSuccessResponse } from "../../../common/base/http-response";
import type { AuthenticatedUser } from "../../../common/types/auth.types";
import type {
  BehaviorRecordIdParamsDto,
  BehaviorStudentIdParamsDto,
  CreateBehaviorCategoryRequestDto,
  CreateBehaviorRecordRequestDto,
  ListBehaviorRecordsQueryDto,
  UpdateBehaviorRecordRequestDto
} from "../dto/behavior.dto";
import type { BehaviorService } from "../service/behavior.service";

const assertAuthUser = (req: Request): AuthenticatedUser => req.authUser as AuthenticatedUser;

export class BehaviorController {
  constructor(private readonly behaviorService: BehaviorService) {}

  async createCategory(req: Request, res: Response): Promise<void> {
    const payload = req.validated?.body as CreateBehaviorCategoryRequestDto;
    const response = await this.behaviorService.createCategory(payload);

    res.status(201).json(buildSuccessResponse("Behavior category created successfully", response));
  }

  async listCategories(_req: Request, res: Response): Promise<void> {
    const response = await this.behaviorService.listCategories();

    res.status(200).json(buildSuccessResponse("Behavior categories fetched successfully", response));
  }

  async createRecord(req: Request, res: Response): Promise<void> {
    const payload = req.validated?.body as CreateBehaviorRecordRequestDto;
    const response = await this.behaviorService.createRecord(assertAuthUser(req), payload);

    res.status(201).json(buildSuccessResponse("Behavior record created successfully", response));
  }

  async listRecords(req: Request, res: Response): Promise<void> {
    const query = req.validated?.query as ListBehaviorRecordsQueryDto;
    const response = await this.behaviorService.listRecords(assertAuthUser(req), query);

    res.status(200).json(buildSuccessResponse("Behavior records fetched successfully", response));
  }

  async getRecordById(req: Request, res: Response): Promise<void> {
    const params = req.validated?.params as BehaviorRecordIdParamsDto;
    const response = await this.behaviorService.getRecordById(assertAuthUser(req), params.id);

    res.status(200).json(buildSuccessResponse("Behavior record fetched successfully", response));
  }

  async updateRecord(req: Request, res: Response): Promise<void> {
    const params = req.validated?.params as BehaviorRecordIdParamsDto;
    const payload = req.validated?.body as UpdateBehaviorRecordRequestDto;
    const response = await this.behaviorService.updateRecord(
      assertAuthUser(req),
      params.id,
      payload
    );

    res.status(200).json(buildSuccessResponse("Behavior record updated successfully", response));
  }

  async listStudentRecords(req: Request, res: Response): Promise<void> {
    const params = req.validated?.params as BehaviorStudentIdParamsDto;
    const response = await this.behaviorService.listStudentRecords(
      assertAuthUser(req),
      params.studentId
    );

    res
      .status(200)
      .json(buildSuccessResponse("Student behavior records fetched successfully", response));
  }
}
