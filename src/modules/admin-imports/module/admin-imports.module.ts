import type { AppModule } from "../../../common/interfaces/app-module.interface";
import { systemSettingsReadService } from "../../system-settings";
import { AdminImportsController } from "../controller/admin-imports.controller";
import { AdminImportsRepository } from "../repository/admin-imports.repository";
import { createAdminImportsRouter } from "../routes/admin-imports.routes";
import { AdminImportsService } from "../service/admin-imports.service";

const adminImportsRepository = new AdminImportsRepository();
const adminImportsService = new AdminImportsService(
  adminImportsRepository,
  systemSettingsReadService
);
const adminImportsController = new AdminImportsController(adminImportsService);

export const adminImportsModule: AppModule = {
  name: "admin-imports",
  basePath: "/admin-imports",
  router: createAdminImportsRouter(adminImportsController)
};
