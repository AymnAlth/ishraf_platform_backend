import request from "supertest";
import { describe, expect, it } from "vitest";

import { AUTH_TEST_FIXTURES } from "../../fixtures/auth.fixture";
import type { IntegrationTestContext } from "../../helpers/integration-context";

export const registerAttendanceIntegrationTests = (
  context: IntegrationTestContext
): void => {
  describe("Attendance", () => {
    it("creates an attendance session as admin and returns joined session data", async () => {
      await context.seedTeacherAssignment();
      const { accessToken } = await context.loginAsAdmin();

      const response = await request(context.app)
        .post("/api/v1/attendance/sessions")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          classId: "1",
          subjectId: "1",
          teacherId: "1",
          academicYearId: "1",
          semesterId: "2",
          sessionDate: "2026-02-16",
          periodNo: 1,
          title: "Morning Science"
        });

      expect(response.status).toBe(201);
      expect(response.body.data.class.id).toBe("1");
      expect(response.body.data.subject.id).toBe("1");
      expect(response.body.data.teacher.teacherId).toBe("1");
      expect(response.body.data.counts.expected).toBe(2);
      expect(response.body.data.counts.recorded).toBe(0);
    });

    it("allows an assigned teacher to create sessions and blocks supervisors from creating them", async () => {
      await context.seedTeacherAssignment();
      const teacherLogin = await context.loginAsTeacher();
      const supervisorLogin = await context.loginAsSupervisor();

      const teacherResponse = await request(context.app)
        .post("/api/v1/attendance/sessions")
        .set("Authorization", `Bearer ${teacherLogin.accessToken}`)
        .send({
          classId: "1",
          subjectId: "1",
          academicYearId: "1",
          semesterId: "2",
          sessionDate: "2026-02-17",
          periodNo: 2,
          title: "Teacher Session"
        });

      const supervisorResponse = await request(context.app)
        .post("/api/v1/attendance/sessions")
        .set("Authorization", `Bearer ${supervisorLogin.accessToken}`)
        .send({
          classId: "1",
          subjectId: "1",
          academicYearId: "1",
          semesterId: "2",
          sessionDate: "2026-02-18",
          periodNo: 1
        });

      expect(teacherResponse.status).toBe(201);
      expect(teacherResponse.body.data.teacher.userId).toBe(
        AUTH_TEST_FIXTURES.activePhoneUser.id
      );
      expect(supervisorResponse.status).toBe(403);
    });

    it("lists attendance sessions with role scoping and filters", async () => {
      await context.seedTeacherAssignment("1", "1", "1", "1");
      await context.seedSupervisorAssignment("1", "1", "1");
      const secondTeacher = await context.createAdditionalTeacher();
      await context.seedTeacherAssignment(secondTeacher.teacherId, "2", "4", "1");

      const adminLogin = await context.loginAsAdmin();

      await request(context.app)
        .post("/api/v1/attendance/sessions")
        .set("Authorization", `Bearer ${adminLogin.accessToken}`)
        .send({
          classId: "1",
          subjectId: "1",
          teacherId: "1",
          academicYearId: "1",
          semesterId: "2",
          sessionDate: "2026-02-19",
          periodNo: 1
        });

      await request(context.app)
        .post("/api/v1/attendance/sessions")
        .set("Authorization", `Bearer ${adminLogin.accessToken}`)
        .send({
          classId: "2",
          subjectId: "4",
          teacherId: secondTeacher.teacherId,
          academicYearId: "1",
          semesterId: "2",
          sessionDate: "2026-02-20",
          periodNo: 1
        });

      const teacherLogin = await context.loginAsTeacher();
      const supervisorLogin = await context.loginAsSupervisor();

      const teacherList = await request(context.app)
        .get("/api/v1/attendance/sessions")
        .set("Authorization", `Bearer ${teacherLogin.accessToken}`);
      const supervisorList = await request(context.app)
        .get("/api/v1/attendance/sessions")
        .set("Authorization", `Bearer ${supervisorLogin.accessToken}`);
      const adminFilteredList = await request(context.app)
        .get("/api/v1/attendance/sessions")
        .query({
          classId: "2"
        })
        .set("Authorization", `Bearer ${adminLogin.accessToken}`);

      expect(teacherList.status).toBe(200);
      expect(teacherList.body.data.items).toHaveLength(1);
      expect(teacherList.body.data.pagination).toMatchObject({
        page: 1,
        limit: 20,
        totalItems: 1,
        totalPages: 1
      });
      expect(teacherList.body.data.items[0].class.id).toBe("1");

      expect(supervisorList.status).toBe(200);
      expect(supervisorList.body.data.items).toHaveLength(1);
      expect(supervisorList.body.data.items[0].class.id).toBe("1");

      expect(adminFilteredList.status).toBe(200);
      expect(adminFilteredList.body.data.items).toHaveLength(1);
      expect(adminFilteredList.body.data.items[0].teacher.teacherId).toBe(
        secondTeacher.teacherId
      );
    });

    it("returns the full active roster for a session and upserts attendance records", async () => {
      await context.seedTeacherAssignment();
      const { accessToken } = await context.loginAsAdmin();

      const createSessionResponse = await request(context.app)
        .post("/api/v1/attendance/sessions")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          classId: "1",
          subjectId: "1",
          teacherId: "1",
          academicYearId: "1",
          semesterId: "2",
          sessionDate: "2026-02-21",
          periodNo: 1
        });

      const sessionId = createSessionResponse.body.data.id as string;
      const beforeResponse = await request(context.app)
        .get(`/api/v1/attendance/sessions/${sessionId}`)
        .set("Authorization", `Bearer ${accessToken}`);

      const saveResponse = await request(context.app)
        .put(`/api/v1/attendance/sessions/${sessionId}/records`)
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          records: [
            {
              studentId: "1",
              status: "present"
            },
            {
              studentId: "2",
              status: "absent",
              notes: "Family emergency"
            }
          ]
        });

      expect(beforeResponse.status).toBe(200);
      expect(beforeResponse.body.data.students).toHaveLength(2);
      expect(beforeResponse.body.data.counts.recorded).toBe(0);

      expect(saveResponse.status).toBe(200);
      expect(saveResponse.body.data.counts.present).toBe(1);
      expect(saveResponse.body.data.counts.absent).toBe(1);
      expect(saveResponse.body.data.counts.recorded).toBe(2);
      expect(saveResponse.body.data.students[1].attendanceStatus).toBe("absent");
    });

    it("lets supervisors update one attendance record within their assigned class", async () => {
      await context.seedTeacherAssignment();
      await context.seedSupervisorAssignment();
      const adminLogin = await context.loginAsAdmin();

      const createSessionResponse = await request(context.app)
        .post("/api/v1/attendance/sessions")
        .set("Authorization", `Bearer ${adminLogin.accessToken}`)
        .send({
          classId: "1",
          subjectId: "1",
          teacherId: "1",
          academicYearId: "1",
          semesterId: "2",
          sessionDate: "2026-02-22",
          periodNo: 1
        });

      const sessionId = createSessionResponse.body.data.id as string;

      const saveResponse = await request(context.app)
        .put(`/api/v1/attendance/sessions/${sessionId}/records`)
        .set("Authorization", `Bearer ${adminLogin.accessToken}`)
        .send({
          records: [
            {
              studentId: "1",
              status: "present"
            },
            {
              studentId: "2",
              status: "late"
            }
          ]
        });

      const lateStudentRecord = saveResponse.body.data.students.find(
        (student: { studentId: string }) => student.studentId === "2"
      );

      const supervisorLogin = await context.loginAsSupervisor();
      const updateResponse = await request(context.app)
        .patch(`/api/v1/attendance/records/${lateStudentRecord.attendanceId}`)
        .set("Authorization", `Bearer ${supervisorLogin.accessToken}`)
        .send({
          status: "excused",
          notes: "Documented excuse"
        });

      const detailResponse = await request(context.app)
        .get(`/api/v1/attendance/sessions/${sessionId}`)
        .set("Authorization", `Bearer ${adminLogin.accessToken}`);

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.data.status).toBe("excused");
      expect(detailResponse.body.data.counts.excused).toBe(1);
      expect(detailResponse.body.data.counts.late).toBe(0);
    });

    it("returns 409 for duplicate sessions and 400 for invalid attendance payloads", async () => {
      await context.seedTeacherAssignment();
      const { accessToken } = await context.loginAsAdmin();

      const firstSessionResponse = await request(context.app)
        .post("/api/v1/attendance/sessions")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          classId: "1",
          subjectId: "1",
          teacherId: "1",
          academicYearId: "1",
          semesterId: "2",
          sessionDate: "2026-02-23",
          periodNo: 1
        });

      const duplicateSessionResponse = await request(context.app)
        .post("/api/v1/attendance/sessions")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          classId: "1",
          subjectId: "1",
          teacherId: "1",
          academicYearId: "1",
          semesterId: "2",
          sessionDate: "2026-02-23",
          periodNo: 1
        });

      const invalidPayloadResponse = await request(context.app)
        .put(`/api/v1/attendance/sessions/${firstSessionResponse.body.data.id}/records`)
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          records: [
            {
              studentId: "1",
              status: "present"
            }
          ]
        });

      expect(duplicateSessionResponse.status).toBe(409);
      expect(invalidPayloadResponse.status).toBe(400);
    });

    it("rejects session creation when the subject is not offered in the selected semester", async () => {
      const { accessToken } = await context.loginAsAdmin();

      const createSubjectResponse = await request(context.app)
        .post("/api/v1/academic-structure/subjects")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          name: "Unscheduled Science",
          gradeLevelId: "1",
          code: "SCI-NO-OFFER"
        });

      const subjectId = createSubjectResponse.body.data.id as string;
      await context.seedTeacherAssignment("1", "1", subjectId, "1");

      const createSessionResponse = await request(context.app)
        .post("/api/v1/attendance/sessions")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          classId: "1",
          subjectId,
          teacherId: "1",
          academicYearId: "1",
          semesterId: "2",
          sessionDate: "2026-02-24",
          periodNo: 1
        });

      expect(createSessionResponse.status).toBe(400);
      expect(createSessionResponse.body.message).toBe(
        "Subject is not offered in the selected semester"
      );
    });
  });
};
