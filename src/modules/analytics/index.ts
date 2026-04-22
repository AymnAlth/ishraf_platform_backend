import type { AppModule } from "../../common/interfaces/app-module.interface";
import { ActiveAcademicContextService } from "../../common/services/active-academic-context.service";
import { OwnershipService } from "../../common/services/ownership.service";
import { ProfileResolutionService } from "../../common/services/profile-resolution.service";
import { aiAnalyticsProviderResolver } from "../../integrations/ai/ai-analytics-provider.resolver";
import { AcademicStructureRepository } from "../academic-structure/repository/academic-structure.repository";
import { ReportingRepository } from "../reporting/repository/reporting.repository";
import { systemSettingsReadService } from "../system-settings";
import { TransportRepository } from "../transport/repository/transport.repository";
import { UsersRepository } from "../users/repository/users.repository";
import { AnalyticsController } from "./controller/analytics.controller";
import { AnalyticsOutboxRepository } from "./repository/analytics-outbox.repository";
import { AnalyticsRepository } from "./repository/analytics.repository";
import { createAnalyticsRouter } from "./routes/analytics.routes";
import { AnalyticsOutboxProcessorService } from "./service/analytics-outbox-processor.service";
import { AnalyticsService } from "./service/analytics.service";

const analyticsRepository = new AnalyticsRepository();
const analyticsOutboxRepository = new AnalyticsOutboxRepository();
const reportingRepository = new ReportingRepository();
const academicStructureRepository = new AcademicStructureRepository();
const transportRepository = new TransportRepository();
const usersRepository = new UsersRepository();

export const analyticsService = new AnalyticsService(
  systemSettingsReadService,
  analyticsRepository,
  analyticsOutboxRepository,
  reportingRepository,
  academicStructureRepository,
  transportRepository,
  new ActiveAcademicContextService(),
  new ProfileResolutionService(),
  new OwnershipService(),
  usersRepository,
  aiAnalyticsProviderResolver
);

export const analyticsOutboxProcessorService = new AnalyticsOutboxProcessorService(
  analyticsOutboxRepository,
  analyticsService
);

const analyticsController = new AnalyticsController(analyticsService);

export const analyticsModule: AppModule = {
  name: "analytics",
  basePath: "/analytics",
  router: createAnalyticsRouter(analyticsController)
};
