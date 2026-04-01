import type { Request, Response } from "express";

import { buildSuccessResponse } from "../../../common/base/http-response";
import type {
  SchoolOnboardingApplyRequestDto,
  SchoolOnboardingDryRunRequestDto,
  SchoolOnboardingImportHistoryParamsDto
} from "../dto/admin-imports.dto";
import type { AdminImportsService } from "../service/admin-imports.service";

export class AdminImportsController {
  constructor(private readonly adminImportsService: AdminImportsService) {}

  async runSchoolOnboardingDryRun(req: Request, res: Response): Promise<void> {
    const payload = req.validated?.body as SchoolOnboardingDryRunRequestDto;
    const response = await this.adminImportsService.runSchoolOnboardingDryRun(
      req.authUser!,
      payload
    );

    res.status(200).json(buildSuccessResponse("School onboarding dry-run completed", response));
  }

  async applySchoolOnboardingImport(req: Request, res: Response): Promise<void> {
    const payload = req.validated?.body as SchoolOnboardingApplyRequestDto;
    const response = await this.adminImportsService.applySchoolOnboardingImport(
      req.authUser!,
      payload
    );

    res.status(200).json(buildSuccessResponse("School onboarding import applied", response));
  }

  async listSchoolOnboardingImportHistory(req: Request, res: Response): Promise<void> {
    const response = await this.adminImportsService.listSchoolOnboardingImportHistory(
      req.validated?.query as { page: number; limit: number }
    );

    res
      .status(200)
      .json(buildSuccessResponse("School onboarding import history fetched successfully", response));
  }

  async getSchoolOnboardingImportHistoryDetail(req: Request, res: Response): Promise<void> {
    const params = req.validated?.params as SchoolOnboardingImportHistoryParamsDto;
    const response = await this.adminImportsService.getSchoolOnboardingImportHistoryDetail(
      params.importId
    );

    res
      .status(200)
      .json(buildSuccessResponse("School onboarding import fetched successfully", response));
  }
}
