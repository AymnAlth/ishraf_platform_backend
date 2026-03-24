import type { AppModule } from "../../common/interfaces/app-module.interface";
import { automationService } from "../automation";
import { TransportController } from "./controller/transport.controller";
import { TransportRepository } from "./repository/transport.repository";
import { createTransportRouter } from "./routes/transport.routes";
import { TransportService } from "./service/transport.service";

const transportRepository = new TransportRepository();
const transportService = new TransportService(
  transportRepository,
  undefined,
  undefined,
  automationService
);
const transportController = new TransportController(transportService);

export const transportModule: AppModule = {
  name: "transport",
  basePath: "/transport",
  router: createTransportRouter(transportController)
};
