import type { AppModule } from "../../../common/interfaces/app-module.interface";
import { IntegrationOutboxRepository } from "../../../common/repositories/integration-outbox.repository";
import { SystemSettingsController } from "../controller/system-settings.controller";
import { SystemSettingsRepository } from "../repository/system-settings.repository";
import { createSystemSettingsRouter } from "../routes/system-settings.routes";
import { SystemSettingsReadService } from "../service/system-settings-read.service";
import { SystemSettingsService } from "../service/system-settings.service";

const systemSettingsRepository = new SystemSettingsRepository();
const integrationOutboxRepository = new IntegrationOutboxRepository();
export const systemSettingsReadService = new SystemSettingsReadService(systemSettingsRepository);
const systemSettingsService = new SystemSettingsService(
  systemSettingsRepository,
  systemSettingsReadService,
  integrationOutboxRepository
);
const systemSettingsController = new SystemSettingsController(systemSettingsService);

export const systemSettingsModule: AppModule = {
  name: "system-settings",
  basePath: "/system-settings",
  router: createSystemSettingsRouter(systemSettingsController)
};
