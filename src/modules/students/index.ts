import type { AppModule } from "../../common/interfaces/app-module.interface";
import { StudentsController } from "./controller/students.controller";
import { StudentsRepository } from "./repository/students.repository";
import { createStudentsRouter } from "./routes/students.routes";
import { StudentsService } from "./service/students.service";

const studentsRepository = new StudentsRepository();
const studentsService = new StudentsService(studentsRepository);
const studentsController = new StudentsController(studentsService);

export const studentsModule: AppModule = {
  name: "students",
  basePath: "/students",
  router: createStudentsRouter(studentsController)
};
