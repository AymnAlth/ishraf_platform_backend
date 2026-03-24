import type { AppModule } from "../../common/interfaces/app-module.interface";
import { HomeworkController } from "./controller/homework.controller";
import { HomeworkRepository } from "./repository/homework.repository";
import { createHomeworkRouter } from "./routes/homework.routes";
import { HomeworkService } from "./service/homework.service";

const homeworkRepository = new HomeworkRepository();
const homeworkService = new HomeworkService(homeworkRepository);
const homeworkController = new HomeworkController(homeworkService);

export const homeworkModule: AppModule = {
  name: "homework",
  basePath: "/homework",
  router: createHomeworkRouter(homeworkController)
};
