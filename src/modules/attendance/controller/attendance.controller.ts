import type { Request, Response } from "express";

import { buildSuccessResponse } from "../../../common/base/http-response";
import type { AuthenticatedUser } from "../../../common/types/auth.types";
import type {
  AttendanceRecordIdParamsDto,
  AttendanceSessionIdParamsDto,
  CreateAttendanceSessionRequestDto,
  ListAttendanceSessionsQueryDto,
  SaveAttendanceRecordsRequestDto,
  UpdateAttendanceRecordRequestDto
} from "../dto/attendance.dto";
import type { AttendanceService } from "../service/attendance.service";

const assertAuthUser = (req: Request): AuthenticatedUser => req.authUser as AuthenticatedUser;

export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  async createSession(req: Request, res: Response): Promise<void> {
    const payload = req.validated?.body as CreateAttendanceSessionRequestDto;
    const response = await this.attendanceService.createSession(assertAuthUser(req), payload);

    res
      .status(201)
      .json(buildSuccessResponse("Attendance session created successfully", response));
  }

  async listSessions(req: Request, res: Response): Promise<void> {
    const query = req.validated?.query as ListAttendanceSessionsQueryDto;
    const response = await this.attendanceService.listSessions(assertAuthUser(req), query);

    res
      .status(200)
      .json(buildSuccessResponse("Attendance sessions fetched successfully", response));
  }

  async getSessionById(req: Request, res: Response): Promise<void> {
    const params = req.validated?.params as AttendanceSessionIdParamsDto;
    const response = await this.attendanceService.getSessionById(
      assertAuthUser(req),
      params.id
    );

    res
      .status(200)
      .json(buildSuccessResponse("Attendance session fetched successfully", response));
  }

  async saveRecords(req: Request, res: Response): Promise<void> {
    const params = req.validated?.params as AttendanceSessionIdParamsDto;
    const payload = req.validated?.body as SaveAttendanceRecordsRequestDto;
    const response = await this.attendanceService.saveSessionAttendance(
      assertAuthUser(req),
      params.id,
      payload
    );

    res
      .status(200)
      .json(buildSuccessResponse("Attendance records saved successfully", response));
  }

  async updateRecord(req: Request, res: Response): Promise<void> {
    const params = req.validated?.params as AttendanceRecordIdParamsDto;
    const payload = req.validated?.body as UpdateAttendanceRecordRequestDto;
    const response = await this.attendanceService.updateAttendanceRecord(
      assertAuthUser(req),
      params.attendanceId,
      payload
    );

    res
      .status(200)
      .json(buildSuccessResponse("Attendance record updated successfully", response));
  }
}
