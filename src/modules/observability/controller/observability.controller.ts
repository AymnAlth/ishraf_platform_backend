import type { Request, Response } from "express";

import { buildSuccessResponse } from "../../../common/base/http-response";
import type { ObservabilityPerformanceSampleQueryDto } from "../dto/observability.dto";
import type { ObservabilityService } from "../service/observability.service";

export class ObservabilityController {
  constructor(private readonly observabilityService: ObservabilityService) {}

  async getPerformanceSummary(_req: Request, res: Response): Promise<void> {
    res.status(200).json(
      buildSuccessResponse(
        "Performance telemetry summary retrieved successfully",
        this.observabilityService.getPerformanceSummary()
      )
    );
  }

  async listRequestSamples(req: Request, res: Response): Promise<void> {
    const query = req.validated?.query as ObservabilityPerformanceSampleQueryDto;

    res.status(200).json(
      buildSuccessResponse(
        "Performance request samples retrieved successfully",
        this.observabilityService.listRequestSamples(query)
      )
    );
  }

  async listQuerySamples(req: Request, res: Response): Promise<void> {
    const query = req.validated?.query as ObservabilityPerformanceSampleQueryDto;

    res.status(200).json(
      buildSuccessResponse(
        "Performance query samples retrieved successfully",
        this.observabilityService.listQuerySamples(query)
      )
    );
  }
}
