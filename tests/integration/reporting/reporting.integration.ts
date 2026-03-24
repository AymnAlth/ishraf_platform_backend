import request from "supertest";
import { describe, expect, it } from "vitest";

import { hashPassword } from "../../../src/common/utils/password.util";
import type { IntegrationTestContext } from "../../helpers/integration-context";

export const registerReportingIntegrationTests = (
  context: IntegrationTestContext
): void => {
  describe("Reporting", () => {
    it("returns student reporting endpoints for admin, teacher, and supervisor while blocking parents", async () => {
      await context.seedTeacherAssignment();
      await context.seedSupervisorAssignment();

      const adminLogin = await context.loginAsAdmin();
      const teacherLogin = await context.loginAsTeacher();
      const supervisorLogin = await context.loginAsSupervisor();
      const parentAccount = await context.createAdditionalParentAccount();
      const parentLogin = await context.login(parentAccount.email, parentAccount.password);

      const attendanceSessionResponse = await request(context.app)
        .post("/api/v1/attendance/sessions")
        .set("Authorization", `Bearer ${adminLogin.accessToken}`)
        .send({
          classId: "1",
          subjectId: "1",
          teacherId: "1",
          academicYearId: "1",
          semesterId: "2",
          sessionDate: "2026-03-05",
          periodNo: 1,
          title: "Morning Attendance"
        });

      await request(context.app)
        .put(`/api/v1/attendance/sessions/${attendanceSessionResponse.body.data.id}/records`)
        .set("Authorization", `Bearer ${adminLogin.accessToken}`)
        .send({
          records: [
            { studentId: "1", status: "present" },
            { studentId: "2", status: "late" }
          ]
        });

      const assessmentResponse = await request(context.app)
        .post("/api/v1/assessments")
        .set("Authorization", `Bearer ${teacherLogin.accessToken}`)
        .send({
          assessmentTypeId: "1",
          classId: "1",
          subjectId: "1",
          academicYearId: "1",
          semesterId: "2",
          title: "Science Quiz 1",
          maxScore: 20,
          assessmentDate: "2026-03-06"
        });
      const assessmentId = assessmentResponse.body.data.assessment.id as string;

      const saveScoresResponse = await request(context.app)
        .put(`/api/v1/assessments/${assessmentId}/scores`)
        .set("Authorization", `Bearer ${teacherLogin.accessToken}`)
        .send({
          records: [
            { studentId: "1", score: 18, remarks: "Good work" },
            { studentId: "2", score: 14, remarks: "Needs revision" }
          ]
        });

      await request(context.app)
        .post("/api/v1/behavior/records")
        .set("Authorization", `Bearer ${teacherLogin.accessToken}`)
        .send({
          studentId: "1",
          behaviorCategoryId: "1",
          academicYearId: "1",
          semesterId: "2",
          description: "Respectful participation",
          severity: 2,
          behaviorDate: "2026-03-06"
        });

      const adminProfileResponse = await request(context.app)
        .get("/api/v1/reporting/students/1/profile")
        .set("Authorization", `Bearer ${adminLogin.accessToken}`);
      const teacherProfileResponse = await request(context.app)
        .get("/api/v1/reporting/students/1/profile")
        .set("Authorization", `Bearer ${teacherLogin.accessToken}`);
      const supervisorProfileResponse = await request(context.app)
        .get("/api/v1/reporting/students/1/profile")
        .set("Authorization", `Bearer ${supervisorLogin.accessToken}`);
      const attendanceReportResponse = await request(context.app)
        .get("/api/v1/reporting/students/1/reports/attendance-summary")
        .set("Authorization", `Bearer ${adminLogin.accessToken}`);
      const assessmentReportResponse = await request(context.app)
        .get("/api/v1/reporting/students/1/reports/assessment-summary")
        .set("Authorization", `Bearer ${adminLogin.accessToken}`);
      const behaviorReportResponse = await request(context.app)
        .get("/api/v1/reporting/students/1/reports/behavior-summary")
        .set("Authorization", `Bearer ${adminLogin.accessToken}`);
      const parentForbiddenResponse = await request(context.app)
        .get("/api/v1/reporting/students/1/profile")
        .set("Authorization", `Bearer ${parentLogin.body.data.tokens.accessToken}`);

      expect(assessmentResponse.status).toBe(201);
      expect(saveScoresResponse.status).toBe(200);
      expect(adminProfileResponse.status).toBe(200);
      expect(adminProfileResponse.body.data.attendanceSummary.totalSessions).toBe(1);
      expect(adminProfileResponse.body.data.assessmentSummary.totalAssessments).toBe(1);
      expect(adminProfileResponse.body.data.behaviorSummary.totalBehaviorRecords).toBe(1);
      expect(teacherProfileResponse.status).toBe(200);
      expect(supervisorProfileResponse.status).toBe(200);
      expect(attendanceReportResponse.status).toBe(200);
      expect(assessmentReportResponse.status).toBe(200);
      expect(behaviorReportResponse.status).toBe(200);
      expect(parentForbiddenResponse.status).toBe(403);
    });

    it("returns parent-owned child reporting endpoints and blocks unrelated children", async () => {
      const adminLogin = await context.loginAsAdmin();
      const parentAccount = await context.createAdditionalParentAccount();

      await request(context.app)
        .post("/api/v1/students/1/parents")
        .set("Authorization", `Bearer ${adminLogin.accessToken}`)
        .send({
          parentId: parentAccount.parentId,
          relationType: "mother",
          isPrimary: false
        });

      const parentLogin = await context.login(parentAccount.email, parentAccount.password);
      const parentAccessToken = parentLogin.body.data.tokens.accessToken as string;

      const profileResponse = await request(context.app)
        .get("/api/v1/reporting/dashboards/parent/me/students/1/profile")
        .set("Authorization", `Bearer ${parentAccessToken}`);
      const attendanceResponse = await request(context.app)
        .get("/api/v1/reporting/dashboards/parent/me/students/1/reports/attendance-summary")
        .set("Authorization", `Bearer ${parentAccessToken}`);
      const assessmentResponse = await request(context.app)
        .get("/api/v1/reporting/dashboards/parent/me/students/1/reports/assessment-summary")
        .set("Authorization", `Bearer ${parentAccessToken}`);
      const behaviorResponse = await request(context.app)
        .get("/api/v1/reporting/dashboards/parent/me/students/1/reports/behavior-summary")
        .set("Authorization", `Bearer ${parentAccessToken}`);
      const unrelatedChildResponse = await request(context.app)
        .get("/api/v1/reporting/dashboards/parent/me/students/2/profile")
        .set("Authorization", `Bearer ${parentAccessToken}`);

      expect(profileResponse.status).toBe(200);
      expect(profileResponse.body.data.student.id).toBe("1");
      expect(attendanceResponse.status).toBe(200);
      expect(assessmentResponse.status).toBe(200);
      expect(behaviorResponse.status).toBe(200);
      expect(unrelatedChildResponse.status).toBe(403);
    });

    it("returns the parent dashboard with linked children and latest notifications", async () => {
      const adminLogin = await context.loginAsAdmin();
      const parentAccount = await context.createAdditionalParentAccount();

      await request(context.app)
        .post("/api/v1/students/1/parents")
        .set("Authorization", `Bearer ${adminLogin.accessToken}`)
        .send({
          parentId: parentAccount.parentId,
          relationType: "mother",
          isPrimary: false
        });

      await context.createNotification(adminLogin.accessToken, {
        userId: parentAccount.userId,
        title: "Welcome",
        message: "Your dashboard is ready",
        notificationType: "system"
      });

      const parentLogin = await context.login(parentAccount.email, parentAccount.password);
      const dashboardResponse = await request(context.app)
        .get("/api/v1/reporting/dashboards/parent/me")
        .set("Authorization", `Bearer ${parentLogin.body.data.tokens.accessToken}`);

      expect(dashboardResponse.status).toBe(200);
      expect(dashboardResponse.body.data.parent.parentId).toBe(parentAccount.parentId);
      expect(dashboardResponse.body.data.children).toHaveLength(1);
      expect(dashboardResponse.body.data.children[0].student.id).toBe("1");
      expect(dashboardResponse.body.data.latestNotifications).toHaveLength(1);
      expect(dashboardResponse.body.data.unreadNotifications).toBe(1);
    });

    it("returns the teacher dashboard with assignments and recent operational activity", async () => {
      await context.seedTeacherAssignment();
      const teacherLogin = await context.loginAsTeacher();

      await request(context.app)
        .post("/api/v1/attendance/sessions")
        .set("Authorization", `Bearer ${teacherLogin.accessToken}`)
        .send({
          classId: "1",
          subjectId: "1",
          academicYearId: "1",
          semesterId: "2",
          sessionDate: "2026-03-08",
          periodNo: 2,
          title: "Science Attendance"
        });

      await request(context.app)
        .post("/api/v1/assessments")
        .set("Authorization", `Bearer ${teacherLogin.accessToken}`)
        .send({
          assessmentTypeId: "2",
          classId: "1",
          subjectId: "1",
          academicYearId: "1",
          semesterId: "2",
          title: "Science Quiz 2",
          maxScore: 10,
          assessmentDate: "2026-03-08"
        });

      await request(context.app)
        .post("/api/v1/behavior/records")
        .set("Authorization", `Bearer ${teacherLogin.accessToken}`)
        .send({
          studentId: "1",
          behaviorCategoryId: "2",
          academicYearId: "1",
          semesterId: "2",
          description: "Strong participation",
          behaviorDate: "2026-03-08"
        });

      const dashboardResponse = await request(context.app)
        .get("/api/v1/reporting/dashboards/teacher/me")
        .set("Authorization", `Bearer ${teacherLogin.accessToken}`);

      expect(dashboardResponse.status).toBe(200);
      expect(dashboardResponse.body.data.assignments).toHaveLength(1);
      expect(dashboardResponse.body.data.recentAttendanceSessions).toHaveLength(1);
      expect(dashboardResponse.body.data.recentAssessments).toHaveLength(1);
      expect(dashboardResponse.body.data.recentBehaviorRecords).toHaveLength(1);
    });

    it("returns the supervisor dashboard with assignments, student summaries, and recent behavior", async () => {
      await context.seedSupervisorAssignment();
      const supervisorLogin = await context.loginAsSupervisor();

      await request(context.app)
        .post("/api/v1/behavior/records")
        .set("Authorization", `Bearer ${supervisorLogin.accessToken}`)
        .send({
          studentId: "1",
          behaviorCategoryId: "5",
          academicYearId: "1",
          semesterId: "2",
          description: "Late arrival",
          severity: 2,
          behaviorDate: "2026-03-09"
        });

      const dashboardResponse = await request(context.app)
        .get("/api/v1/reporting/dashboards/supervisor/me")
        .set("Authorization", `Bearer ${supervisorLogin.accessToken}`);

      expect(dashboardResponse.status).toBe(200);
      expect(dashboardResponse.body.data.assignments).toHaveLength(1);
      expect(dashboardResponse.body.data.studentSummaries.length).toBeGreaterThan(0);
      expect(dashboardResponse.body.data.recentBehaviorRecords).toHaveLength(1);
    });

    it("returns admin dashboard data and live transport summaries for admin and driver", async () => {
      const adminLogin = await context.loginAsAdmin();
      const driverLogin = await context.loginAsDriver();

      await context.createAnnouncement(adminLogin.accessToken, {
        title: "Operations notice",
        content: "Morning transport is active"
      });

      const routeResponse = await context.createRoute(adminLogin.accessToken);
      const routeId = routeResponse.body.data.id as string;
      const stopResponse = await context.createRouteStop(adminLogin.accessToken, routeId);
      const busResponse = await context.createBus(adminLogin.accessToken);
      const busId = busResponse.body.data.id as string;

      await context.createAssignment(adminLogin.accessToken, {
        studentId: "1",
        routeId,
        stopId: stopResponse.body.data.stopId as string
      });

      const tripResponse = await context.createTrip(driverLogin.accessToken, {
        busId,
        routeId
      });
      const tripId = tripResponse.body.data.id as string;

      await request(context.app)
        .post(`/api/v1/transport/trips/${tripId}/start`)
        .set("Authorization", `Bearer ${driverLogin.accessToken}`)
        .send({});
      await request(context.app)
        .post(`/api/v1/transport/trips/${tripId}/locations`)
        .set("Authorization", `Bearer ${driverLogin.accessToken}`)
        .send({
          latitude: 14.2233445,
          longitude: 44.2233445
        });
      await request(context.app)
        .post(`/api/v1/transport/trips/${tripId}/events`)
        .set("Authorization", `Bearer ${driverLogin.accessToken}`)
        .send({
          studentId: "1",
          eventType: "boarded",
          stopId: stopResponse.body.data.stopId
        });

      const adminDashboardResponse = await request(context.app)
        .get("/api/v1/reporting/dashboards/admin/me")
        .set("Authorization", `Bearer ${adminLogin.accessToken}`);
      const transportSummaryResponse = await request(context.app)
        .get("/api/v1/reporting/transport/summary")
        .set("Authorization", `Bearer ${driverLogin.accessToken}`);

      expect(adminDashboardResponse.status).toBe(200);
      expect(adminDashboardResponse.body.data.summary.totalActiveUsers).toBeGreaterThan(0);
      expect(adminDashboardResponse.body.data.recentAnnouncements).toHaveLength(1);
      expect(adminDashboardResponse.body.data.activeTrips).toHaveLength(1);
      expect(transportSummaryResponse.status).toBe(200);
      expect(transportSummaryResponse.body.data.activeTrips).toHaveLength(1);
      expect(transportSummaryResponse.body.data.activeTrips[0].latestLocation).not.toBeNull();
      expect(transportSummaryResponse.body.data.activeTrips[0].latestEvents).toHaveLength(1);
    });

    it("returns parent transport live status for linked children only", async () => {
      const adminLogin = await context.loginAsAdmin();
      const driverLogin = await context.loginAsDriver();
      const parentAccount = await context.createAdditionalParentAccount();

      await request(context.app)
        .post("/api/v1/students/1/parents")
        .set("Authorization", `Bearer ${adminLogin.accessToken}`)
        .send({
          parentId: parentAccount.parentId,
          relationType: "mother",
          isPrimary: false
        });

      const routeResponse = await context.createRoute(adminLogin.accessToken, {
        routeName: "Route Live"
      });
      const routeId = routeResponse.body.data.id as string;
      const stopResponse = await context.createRouteStop(adminLogin.accessToken, routeId, {
        stopName: "Live Stop"
      });
      const busResponse = await context.createBus(adminLogin.accessToken, {
        plateNumber: "BUS-LIVE"
      });
      const tripDate = "2026-03-13";

      await context.createAssignment(adminLogin.accessToken, {
        studentId: "1",
        routeId,
        stopId: stopResponse.body.data.stopId as string,
        startDate: tripDate
      });

      const tripResponse = await context.createTrip(driverLogin.accessToken, {
        busId: busResponse.body.data.id as string,
        routeId,
        tripDate
      });
      const tripId = tripResponse.body.data.id as string;

      await request(context.app)
        .post(`/api/v1/transport/trips/${tripId}/start`)
        .set("Authorization", `Bearer ${driverLogin.accessToken}`)
        .send({});
      await request(context.app)
        .post(`/api/v1/transport/trips/${tripId}/locations`)
        .set("Authorization", `Bearer ${driverLogin.accessToken}`)
        .send({
          latitude: 14.5555555,
          longitude: 44.5555555
        });
      await request(context.app)
        .post(`/api/v1/transport/trips/${tripId}/events`)
        .set("Authorization", `Bearer ${driverLogin.accessToken}`)
        .send({
          studentId: "1",
          eventType: "boarded",
          stopId: stopResponse.body.data.stopId
        });

      const parentLogin = await context.login(parentAccount.email, parentAccount.password);
      const parentAccessToken = parentLogin.body.data.tokens.accessToken as string;

      const liveStatusResponse = await request(context.app)
        .get("/api/v1/reporting/transport/parent/me/students/1/live-status")
        .set("Authorization", `Bearer ${parentAccessToken}`);
      const unrelatedStudentResponse = await request(context.app)
        .get("/api/v1/reporting/transport/parent/me/students/2/live-status")
        .set("Authorization", `Bearer ${parentAccessToken}`);

      expect(liveStatusResponse.status).toBe(200);
      expect(liveStatusResponse.body.data.assignment).not.toBeNull();
      expect(liveStatusResponse.body.data.activeTrip).not.toBeNull();
      expect(liveStatusResponse.body.data.activeTrip.latestLocation).not.toBeNull();
      expect(liveStatusResponse.body.data.activeTrip.latestEvents).toHaveLength(1);
      expect(unrelatedStudentResponse.status).toBe(403);
    });

    it("returns a domain-aware 404 when a teacher account has no teacher profile", async () => {
      const orphanTeacherPassword = "OrphanTeacher123!";
      const orphanTeacherHash = await hashPassword(orphanTeacherPassword);

      await context.pool.query(
        `
          INSERT INTO users (
            full_name,
            email,
            phone,
            password_hash,
            role,
            is_active
          )
          VALUES ($1, $2, $3, $4, $5, true)
        `,
        [
          "Orphan Teacher",
          "orphan-teacher@example.com",
          "01000000009",
          orphanTeacherHash,
          "teacher"
        ]
      );

      const orphanTeacherLogin = await context.login(
        "orphan-teacher@example.com",
        orphanTeacherPassword
      );
      const dashboardResponse = await request(context.app)
        .get("/api/v1/reporting/dashboards/teacher/me")
        .set("Authorization", `Bearer ${orphanTeacherLogin.body.data.tokens.accessToken}`);

      expect(orphanTeacherLogin.status).toBe(200);
      expect(dashboardResponse.status).toBe(404);
      expect(dashboardResponse.body.message).toBe("Teacher profile not found");
    });
  });
};
