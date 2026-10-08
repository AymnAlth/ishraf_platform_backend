import type { AppModule } from "../../common/interfaces/app-module.interface";
import { ObservabilityController } from "./controller/observability.controller";
import { createObservabilityRouter } from "./routes/observability.routes";
import { ObservabilityService } from "./service/observability.service";

const observabilityService = new ObservabilityService();
const observabilityController = new ObservabilityController(observabilityService);

export const observabilityModule: AppModule = {
  name: "observability",
  basePath: "/observability",
  router: createObservabilityRouter(observabilityController)
};
