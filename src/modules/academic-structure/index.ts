import type { AppModule } from "../../common/interfaces/app-module.interface";
import { AcademicStructureController } from "./controller/academic-structure.controller";
import { AcademicStructureRepository } from "./repository/academic-structure.repository";
import { createAcademicStructureRouter } from "./routes/academic-structure.routes";
import { AcademicStructureService } from "./service/academic-structure.service";

const academicStructureRepository = new AcademicStructureRepository();
const academicStructureService = new AcademicStructureService(academicStructureRepository);
const academicStructureController = new AcademicStructureController(
  academicStructureService
);

export const academicStructureModule: AppModule = {
  name: "academic-structure",
  basePath: "/academic-structure",
  router: createAcademicStructureRouter(academicStructureController)
};
