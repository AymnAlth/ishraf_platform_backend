import type { AppModule } from "../../common/interfaces/app-module.interface";
import { AssessmentsController } from "./controller/assessments.controller";
import { AssessmentsRepository } from "./repository/assessments.repository";
import { createAssessmentsRouter } from "./routes/assessments.routes";
import { AssessmentsService } from "./service/assessments.service";

const assessmentsRepository = new AssessmentsRepository();
const assessmentsService = new AssessmentsService(assessmentsRepository);
const assessmentsController = new AssessmentsController(assessmentsService);

export const assessmentsModule: AppModule = {
  name: "assessments",
  basePath: "/assessments",
  router: createAssessmentsRouter(assessmentsController)
};
