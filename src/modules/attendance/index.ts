import type { AppModule } from "../../common/interfaces/app-module.interface";
import { automationService } from "../automation";
import { AttendanceController } from "./controller/attendance.controller";
import { AttendanceRepository } from "./repository/attendance.repository";
import { createAttendanceRouter } from "./routes/attendance.routes";
import { AttendanceService } from "./service/attendance.service";

const attendanceRepository = new AttendanceRepository();
const attendanceService = new AttendanceService(
  attendanceRepository,
  undefined,
  undefined,
  undefined,
  automationService
);
const attendanceController = new AttendanceController(attendanceService);

export const attendanceModule: AppModule = {
  name: "attendance",
  basePath: "/attendance",
  router: createAttendanceRouter(attendanceController)
};
