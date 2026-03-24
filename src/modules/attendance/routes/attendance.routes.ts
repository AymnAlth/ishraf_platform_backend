import { Router } from "express";

import { validateRequest } from "../../../common/middlewares/validation.middleware";
import { asyncHandler } from "../../../common/utils/async-handler";
import type { AttendanceController } from "../controller/attendance.controller";
import { attendancePolicies } from "../policies/attendance.policy";
import {
  attendanceRecordIdParamsSchema,
  attendanceSessionIdParamsSchema,
  createAttendanceSessionSchema,
  listAttendanceSessionsQuerySchema,
  saveAttendanceRecordsSchema,
  updateAttendanceRecordSchema
} from "../validator/attendance.validator";

export const createAttendanceRouter = (controller: AttendanceController): Router => {
  const router = Router();

  router.post(
    "/sessions",
    ...attendancePolicies.createSession,
    validateRequest({ body: createAttendanceSessionSchema }),
    asyncHandler((req, res) => controller.createSession(req, res))
  );

  router.get(
    "/sessions",
    ...attendancePolicies.accessSessions,
    validateRequest({ query: listAttendanceSessionsQuerySchema }),
    asyncHandler((req, res) => controller.listSessions(req, res))
  );

  router.get(
    "/sessions/:id",
    ...attendancePolicies.accessSessions,
    validateRequest({ params: attendanceSessionIdParamsSchema }),
    asyncHandler((req, res) => controller.getSessionById(req, res))
  );

  router.put(
    "/sessions/:id/records",
    ...attendancePolicies.updateRecords,
    validateRequest({
      params: attendanceSessionIdParamsSchema,
      body: saveAttendanceRecordsSchema
    }),
    asyncHandler((req, res) => controller.saveRecords(req, res))
  );

  router.patch(
    "/records/:attendanceId",
    ...attendancePolicies.updateRecords,
    validateRequest({
      params: attendanceRecordIdParamsSchema,
      body: updateAttendanceRecordSchema
    }),
    asyncHandler((req, res) => controller.updateRecord(req, res))
  );

  return router;
};
