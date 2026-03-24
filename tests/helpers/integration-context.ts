import type { Express } from "express";
import type { Pool } from "pg";

import { AUTH_TEST_FIXTURES } from "../fixtures/auth.fixture";
import {
  login,
  loginAsAdmin,
  loginAsDriver,
  loginAsSupervisor,
  loginAsTeacher,
  type AuthTokens
} from "./auth-helper";
import { api, getTestApp } from "./app-helper";
import {
  createAdditionalParentAccount as createAdditionalParentAccountInDb,
  createAdditionalTeacher as createAdditionalTeacherInDb,
  seedSupervisorAssignment as seedSupervisorAssignmentInDb,
  seedTeacherAssignment as seedTeacherAssignmentInDb
} from "../setup/seed-test-data";

export interface IntegrationTestContext {
  pool: Pool;
  app: Express;
  login: typeof login;
  loginAsAdmin: () => Promise<AuthTokens>;
  loginAsTeacher: () => Promise<AuthTokens>;
  loginAsSupervisor: () => Promise<AuthTokens>;
  loginAsDriver: () => Promise<AuthTokens>;
  createAdditionalParentAccount: typeof createAdditionalParentAccountInDb;
  createAdditionalParent: () => Promise<string>;
  createAdditionalTeacher: () => ReturnType<typeof createAdditionalTeacherInDb>;
  seedTeacherAssignment: (
    teacherId?: string,
    classId?: string,
    subjectId?: string,
    academicYearId?: string
  ) => Promise<void>;
  seedSupervisorAssignment: (
    supervisorId?: string,
    classId?: string,
    academicYearId?: string
  ) => Promise<void>;
  createRoute: (
    accessToken: string,
    overrides?: Partial<{
      routeName: string;
      startPoint: string;
      endPoint: string;
      estimatedDurationMinutes: number;
      isActive: boolean;
    }>
  ) => ReturnType<ReturnType<typeof api>["post"]>;
  createRouteStop: (
    accessToken: string,
    routeId: string,
    overrides?: Partial<{
      stopName: string;
      latitude: number;
      longitude: number;
      stopOrder: number;
    }>
  ) => ReturnType<ReturnType<typeof api>["post"]>;
  createBus: (
    accessToken: string,
    overrides?: Partial<{
      plateNumber: string;
      driverId: string;
      capacity: number;
      status: string;
    }>
  ) => ReturnType<ReturnType<typeof api>["post"]>;
  createAssignment: (
    accessToken: string,
    overrides?: Partial<{
      studentId: string;
      routeId: string;
      stopId: string;
      startDate: string;
      endDate: string | null;
    }>
  ) => ReturnType<ReturnType<typeof api>["post"]>;
  createTrip: (
    accessToken: string,
    overrides?: Partial<{
      busId: string;
      routeId: string;
      tripDate: string;
      tripType: string;
    }>
  ) => ReturnType<ReturnType<typeof api>["post"]>;
  createAnnouncement: (
    accessToken: string,
    overrides?: Partial<{
      title: string;
      content: string;
      targetRole: string | null;
      expiresAt: string | null;
    }>
  ) => ReturnType<ReturnType<typeof api>["post"]>;
  createNotification: (
    accessToken: string,
    overrides?: Partial<{
      userId: string;
      title: string;
      message: string;
      notificationType: string;
      referenceType: string | null;
      referenceId: string | null;
    }>
  ) => ReturnType<ReturnType<typeof api>["post"]>;
  listMyNotifications: (accessToken: string) => ReturnType<ReturnType<typeof api>["get"]>;
}

export const createIntegrationTestContext = (pool: Pool): IntegrationTestContext => ({
  pool,
  app: getTestApp(),
  login,
  loginAsAdmin,
  loginAsTeacher,
  loginAsSupervisor,
  loginAsDriver,
  createAdditionalParentAccount: (overrides = {}) => createAdditionalParentAccountInDb(pool, overrides),
  createAdditionalParent: async () => {
    const account = await createAdditionalParentAccountInDb(pool);

    return account.parentId;
  },
  createAdditionalTeacher: () => createAdditionalTeacherInDb(pool),
  seedTeacherAssignment: (
    teacherId = "1",
    classId = "1",
    subjectId = "1",
    academicYearId = "1"
  ) => seedTeacherAssignmentInDb(pool, teacherId, classId, subjectId, academicYearId),
  seedSupervisorAssignment: (
    supervisorId = "1",
    classId = "1",
    academicYearId = "1"
  ) => seedSupervisorAssignmentInDb(pool, supervisorId, classId, academicYearId),
  createRoute: (accessToken, overrides = {}) =>
    api()
      .post("/api/v1/transport/routes")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        routeName: overrides.routeName ?? "Route 1",
        startPoint: overrides.startPoint ?? "School",
        endPoint: overrides.endPoint ?? "Dhamar",
        estimatedDurationMinutes: overrides.estimatedDurationMinutes ?? 35,
        isActive: overrides.isActive ?? true
      }),
  createRouteStop: (accessToken, routeId, overrides = {}) =>
    api()
      .post(`/api/v1/transport/routes/${routeId}/stops`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        stopName: overrides.stopName ?? "Main Stop",
        latitude: overrides.latitude ?? 14.2233445,
        longitude: overrides.longitude ?? 44.2233445,
        stopOrder: overrides.stopOrder ?? 1
      }),
  createBus: (accessToken, overrides = {}) =>
    api()
      .post("/api/v1/transport/buses")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        plateNumber: overrides.plateNumber ?? "BUS-001",
        driverId: overrides.driverId ?? "1",
        capacity: overrides.capacity ?? 40,
        status: overrides.status ?? "active"
      }),
  createAssignment: (accessToken, overrides = {}) =>
    api()
      .post("/api/v1/transport/assignments")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        studentId: overrides.studentId ?? "1",
        routeId: overrides.routeId ?? "1",
        stopId: overrides.stopId ?? "1",
        startDate: overrides.startDate ?? "2026-03-13",
        endDate: overrides.endDate ?? undefined
      }),
  createTrip: (accessToken, overrides = {}) =>
    api()
      .post("/api/v1/transport/trips")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        busId: overrides.busId ?? "1",
        routeId: overrides.routeId ?? "1",
        tripDate: overrides.tripDate ?? "2026-03-13",
        tripType: overrides.tripType ?? "pickup"
      }),
  createAnnouncement: (accessToken, overrides = {}) =>
    api()
      .post("/api/v1/communication/announcements")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        title: overrides.title ?? "General notice",
        content: overrides.content ?? "School starts at 8 AM",
        targetRole: overrides.targetRole ?? null,
        expiresAt: overrides.expiresAt ?? undefined
      }),
  createNotification: (accessToken, overrides = {}) =>
    api()
      .post("/api/v1/communication/notifications")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        userId: overrides.userId ?? AUTH_TEST_FIXTURES.activePhoneUser.id,
        title: overrides.title ?? "Reminder",
        message: overrides.message ?? "Please check the latest announcement",
        notificationType: overrides.notificationType ?? "announcement",
        referenceType: overrides.referenceType ?? undefined,
        referenceId: overrides.referenceId ?? undefined
      }),
  listMyNotifications: (accessToken: string) =>
    api()
      .get("/api/v1/communication/notifications/me")
      .set("Authorization", `Bearer ${accessToken}`)
});
