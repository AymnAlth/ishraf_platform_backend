import type { AppModule } from "../../common/interfaces/app-module.interface";
import { automationService } from "../automation";
import { BehaviorController } from "./controller/behavior.controller";
import { BehaviorRepository } from "./repository/behavior.repository";
import { createBehaviorRouter } from "./routes/behavior.routes";
import { BehaviorService } from "./service/behavior.service";

const behaviorRepository = new BehaviorRepository();
const behaviorService = new BehaviorService(
  behaviorRepository,
  undefined,
  undefined,
  automationService
);
const behaviorController = new BehaviorController(behaviorService);

export const behaviorModule: AppModule = {
  name: "behavior",
  basePath: "/behavior",
  router: createBehaviorRouter(behaviorController)
};
