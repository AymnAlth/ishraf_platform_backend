import type { Request, Response } from "express";

import { buildSuccessResponse } from "../../../common/base/http-response";
import type {
  ListSystemSettingAuditLogsQueryDto,
  SystemSettingsGroupParamsDto,
  SystemSettingsPatchRequestDto
} from "../dto/system-settings.dto";
import type { SystemSettingsService } from "../service/system-settings.service";

export class SystemSettingsController {
  constructor(private readonly systemSettingsService: SystemSettingsService) {}

  async listSettings(_req: Request, res: Response): Promise<void> {
    const response = await this.systemSettingsService.listSettings();

    res.status(200).json(buildSuccessResponse("System settings fetched successfully", response));
  }

  async getSettingsGroup(req: Request, res: Response): Promise<void> {
    const params = req.validated?.params as SystemSettingsGroupParamsDto;
    const response = await this.systemSettingsService.getSettingsGroup(params.group);

    res
      .status(200)
      .json(buildSuccessResponse("System settings group fetched successfully", response));
  }

  async updateSettingsGroup(req: Request, res: Response): Promise<void> {
    const params = req.validated?.params as SystemSettingsGroupParamsDto;
    const payload = req.validated?.body as SystemSettingsPatchRequestDto;
    const response = await this.systemSettingsService.updateSettingsGroup(
      req.authUser!,
      params.group,
      payload
    );

    res
      .status(200)
      .json(buildSuccessResponse("System settings group updated successfully", response));
  }

  async listAuditLogs(req: Request, res: Response): Promise<void> {
    const query = req.validated?.query as ListSystemSettingAuditLogsQueryDto;
    const response = await this.systemSettingsService.listAuditLogs(query);

    res
      .status(200)
      .json(buildSuccessResponse("System settings audit logs fetched successfully", response));
  }

  async getIntegrationsStatus(_req: Request, res: Response): Promise<void> {
    const response = await this.systemSettingsService.getIntegrationsStatus();

    res
      .status(200)
      .json(buildSuccessResponse("System integration status fetched successfully", response));
  }
}
