import type {
  PerformanceTelemetryQuerySample,
  PerformanceTelemetryRequestSample,
  PerformanceTelemetrySampleList,
  PerformanceTelemetrySummaryReport
} from "../../../common/services/performance-telemetry.service";

export interface ObservabilityPerformanceSampleQueryDto {
  route?: string;
  slowOnly: boolean;
  limit: number;
}

export type ObservabilityPerformanceSummaryResponseDto = PerformanceTelemetrySummaryReport;

export type ObservabilityRequestSamplesResponseDto =
  PerformanceTelemetrySampleList<PerformanceTelemetryRequestSample>;

export type ObservabilityQuerySamplesResponseDto =
  PerformanceTelemetrySampleList<PerformanceTelemetryQuerySample>;
