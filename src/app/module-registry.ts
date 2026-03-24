import type { AppModule } from "../common/interfaces/app-module.interface";
import { assessmentsModule } from "../modules/assessments";
import { attendanceModule } from "../modules/attendance";
import { authModule } from "../modules/auth";
import { academicStructureModule } from "../modules/academic-structure";
import { behaviorModule } from "../modules/behavior";
import { communicationModule } from "../modules/communication";
import { homeworkModule } from "../modules/homework";
import { reportingModule } from "../modules/reporting";
import { studentsModule } from "../modules/students";
import { transportModule } from "../modules/transport";
import { usersModule } from "../modules/users";

export const getRegisteredModules = (): AppModule[] => [
  authModule,
  usersModule,
  academicStructureModule,
  studentsModule,
  behaviorModule,
  assessmentsModule,
  attendanceModule,
  transportModule,
  communicationModule,
  homeworkModule,
  reportingModule
];
