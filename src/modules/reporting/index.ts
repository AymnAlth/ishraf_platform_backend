import type { AppModule } from "../../common/interfaces/app-module.interface";
import { ReportingController } from "./controller/reporting.controller";
import { ReportingRepository } from "./repository/reporting.repository";
import { createReportingRouter } from "./routes/reporting.routes";
import { ReportingService } from "./service/reporting.service";

const reportingRepository = new ReportingRepository();
const reportingService = new ReportingService(reportingRepository);
const reportingController = new ReportingController(reportingService);

export const reportingModule: AppModule = {
  name: "reporting",
  basePath: "/reporting",
  router: createReportingRouter(reportingController)
};
