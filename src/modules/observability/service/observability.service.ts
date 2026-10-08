import { performanceTelemetryService } from "../../../common/services/performance-telemetry.service";
import type {
  ObservabilityPerformanceSampleQueryDto,
  ObservabilityPerformanceSummaryResponseDto,
  ObservabilityQuerySamplesResponseDto,
  ObservabilityRequestSamplesResponseDto
} from "../dto/observability.dto";

export class ObservabilityService {
  getPerformanceSummary(): ObservabilityPerformanceSummaryResponseDto {
    return performanceTelemetryService.buildSummary();
  }

  listRequestSamples(
    query: ObservabilityPerformanceSampleQueryDto
  ): ObservabilityRequestSamplesResponseDto {
    return performanceTelemetryService.listRequestSamples(query);
  }

  listQuerySamples(
    query: ObservabilityPerformanceSampleQueryDto
  ): ObservabilityQuerySamplesResponseDto {
    return performanceTelemetryService.listQuerySamples(query);
  }
}
