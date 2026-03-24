import type { AppModule } from "../../common/interfaces/app-module.interface";
import { CommunicationController } from "./controller/communication.controller";
import { CommunicationRepository } from "./repository/communication.repository";
import { createCommunicationRouter } from "./routes/communication.routes";
import { CommunicationService } from "./service/communication.service";

const communicationRepository = new CommunicationRepository();
const communicationService = new CommunicationService(communicationRepository);
const communicationController = new CommunicationController(communicationService);

export const communicationModule: AppModule = {
  name: "communication",
  basePath: "/communication",
  router: createCommunicationRouter(communicationController)
};
