import request from "supertest";
import { describe, expect, it } from "vitest";

import type { IntegrationTestContext } from "../../helpers/integration-context";

export const registerBehaviorIntegrationTests = (
  context: IntegrationTestContext
): void => {
  describe("Behavior", () => {
    it("creates and lists behavior categories while keeping category creation admin-only", async () => {
      const adminLogin = await context.loginAsAdmin();
      const teacherLogin = await context.loginAsTeacher();
      const supervisorLogin = await context.loginAsSupervisor();

      const createResponse = await request(context.app)
        .post("/api/v1/behavior/categories")
        .set("Authorization", `Bearer ${adminLogin.accessToken}`)
        .send({
          code: "teamwork",
          name: "Teamwork",
          behaviorType: "positive",
          defaultSeverity: 2
        });

      const teacherListResponse = await request(context.app)
        .get("/api/v1/behavior/categories")
        .set("Authorization", `Bearer ${teacherLogin.accessToken}`);
      const supervisorListResponse = await request(context.app)
        .get("/api/v1/behavior/categories")
        .set("Authorization", `Bearer ${supervisorLogin.accessToken}`);
      const teacherCreateResponse = await request(context.app)
        .post("/api/v1/behavior/categories")
        .set("Authorization", `Bearer ${teacherLogin.accessToken}`)
        .send({
          code: "forbidden-category",
          name: "Forbidden Category",
          behaviorType: "negative",
          defaultSeverity: 2
        });

      expect(createResponse.status).toBe(201);
      expect(createResponse.body.data.code).toBe("teamwork");
      expect(teacherListResponse.status).toBe(200);
      expect(teacherListResponse.body.data).toHaveLength(9);
      expect(supervisorListResponse.status).toBe(200);
      expect(supervisorListResponse.body.data).toHaveLength(9);
      expect(teacherCreateResponse.status).toBe(403);
    });

    it("creates behavior records for teachers, supervisors, and admins on behalf of staff", async () => {
      await context.seedTeacherAssignment("1", "1", "1", "1");
      await context.seedSupervisorAssignment("1", "1", "1");

      const teacherLogin = await context.loginAsTeacher();
      const supervisorLogin = await context.loginAsSupervisor();
      const adminLogin = await context.loginAsAdmin();

      const teacherCreateResponse = await request(context.app)
        .post("/api/v1/behavior/records")
        .set("Authorization", `Bearer ${teacherLogin.accessToken}`)
        .send({
          studentId: "1",
          behaviorCategoryId: "5",
          academicYearId: "1",
          semesterId: "2",
          behaviorDate: "2026-03-10",
          description: "Student arrived late"
        });

      const supervisorCreateResponse = await request(context.app)
        .post("/api/v1/behavior/records")
        .set("Authorization", `Bearer ${supervisorLogin.accessToken}`)
        .send({
          studentId: "1",
          behaviorCategoryId: "1",
          academicYearId: "1",
          semesterId: "2",
          behaviorDate: "2026-03-11",
          description: "Student showed respect"
        });

      const adminCreateResponse = await request(context.app)
        .post("/api/v1/behavior/records")
        .set("Authorization", `Bearer ${adminLogin.accessToken}`)
        .send({
          studentId: "2",
          behaviorCategoryId: "6",
          academicYearId: "1",
          semesterId: "2",
          supervisorId: "1",
          behaviorDate: "2026-03-12",
          severity: 4,
          description: "Repeated disruption"
        });

      expect(teacherCreateResponse.status).toBe(201);
      expect(teacherCreateResponse.body.data.actorType).toBe("teacher");
      expect(teacherCreateResponse.body.data.severity).toBe(2);
      expect(supervisorCreateResponse.status).toBe(201);
      expect(supervisorCreateResponse.body.data.actorType).toBe("supervisor");
      expect(supervisorCreateResponse.body.data.severity).toBe(1);
      expect(adminCreateResponse.status).toBe(201);
      expect(adminCreateResponse.body.data.actorType).toBe("supervisor");
      expect(adminCreateResponse.body.data.actor.id).toBe("1");
    });

    it("scopes behavior record listing and detail access by actor", async () => {
      await context.seedTeacherAssignment("1", "1", "1", "1");
      await context.seedSupervisorAssignment("1", "1", "1");

      const teacherLogin = await context.loginAsTeacher();
      const supervisorLogin = await context.loginAsSupervisor();
      const adminLogin = await context.loginAsAdmin();

      const teacherRecord = await request(context.app)
        .post("/api/v1/behavior/records")
        .set("Authorization", `Bearer ${teacherLogin.accessToken}`)
        .send({
          studentId: "1",
          behaviorCategoryId: "5",
          academicYearId: "1",
          semesterId: "2",
          behaviorDate: "2026-03-13"
        });
      const supervisorRecord = await request(context.app)
        .post("/api/v1/behavior/records")
        .set("Authorization", `Bearer ${supervisorLogin.accessToken}`)
        .send({
          studentId: "1",
          behaviorCategoryId: "1",
          academicYearId: "1",
          semesterId: "2",
          behaviorDate: "2026-03-14"
        });

      const teacherListResponse = await request(context.app)
        .get("/api/v1/behavior/records")
        .set("Authorization", `Bearer ${teacherLogin.accessToken}`);
      const supervisorListResponse = await request(context.app)
        .get("/api/v1/behavior/records")
        .set("Authorization", `Bearer ${supervisorLogin.accessToken}`);
      const adminFilteredResponse = await request(context.app)
        .get("/api/v1/behavior/records")
        .query({
          behaviorType: "positive"
        })
        .set("Authorization", `Bearer ${adminLogin.accessToken}`);
      const teacherOwnDetailResponse = await request(context.app)
        .get(`/api/v1/behavior/records/${teacherRecord.body.data.id}`)
        .set("Authorization", `Bearer ${teacherLogin.accessToken}`);
      const teacherForbiddenDetailResponse = await request(context.app)
        .get(`/api/v1/behavior/records/${supervisorRecord.body.data.id}`)
        .set("Authorization", `Bearer ${teacherLogin.accessToken}`);

      expect(teacherListResponse.status).toBe(200);
      expect(teacherListResponse.body.data.items).toHaveLength(1);
      expect(teacherListResponse.body.data.pagination).toMatchObject({
        page: 1,
        limit: 20,
        totalItems: 1,
        totalPages: 1
      });
      expect(teacherListResponse.body.data.items[0].actorType).toBe("teacher");
      expect(supervisorListResponse.status).toBe(200);
      expect(supervisorListResponse.body.data.items).toHaveLength(1);
      expect(supervisorListResponse.body.data.items[0].actorType).toBe("supervisor");
      expect(adminFilteredResponse.status).toBe(200);
      expect(adminFilteredResponse.body.data.items).toHaveLength(1);
      expect(adminFilteredResponse.body.data.items[0].category.behaviorType).toBe(
        "positive"
      );
      expect(teacherOwnDetailResponse.status).toBe(200);
      expect(teacherForbiddenDetailResponse.status).toBe(403);
    });

    it("updates behavior records and returns student behavior records with summary", async () => {
      await context.seedTeacherAssignment("1", "1", "1", "1");
      await context.seedSupervisorAssignment("1", "1", "1");

      const teacherLogin = await context.loginAsTeacher();
      const supervisorLogin = await context.loginAsSupervisor();
      const adminLogin = await context.loginAsAdmin();

      const teacherRecord = await request(context.app)
        .post("/api/v1/behavior/records")
        .set("Authorization", `Bearer ${teacherLogin.accessToken}`)
        .send({
          studentId: "1",
          behaviorCategoryId: "5",
          academicYearId: "1",
          semesterId: "2",
          behaviorDate: "2026-03-15"
        });
      await request(context.app)
        .post("/api/v1/behavior/records")
        .set("Authorization", `Bearer ${supervisorLogin.accessToken}`)
        .send({
          studentId: "1",
          behaviorCategoryId: "1",
          academicYearId: "1",
          semesterId: "2",
          behaviorDate: "2026-03-16"
        });

      const updateResponse = await request(context.app)
        .patch(`/api/v1/behavior/records/${teacherRecord.body.data.id}`)
        .set("Authorization", `Bearer ${teacherLogin.accessToken}`)
        .send({
          behaviorCategoryId: "6",
          severity: 4,
          description: "Escalated disruption",
          behaviorDate: "2026-03-17"
        });
      const invalidActorUpdateResponse = await request(context.app)
        .patch(`/api/v1/behavior/records/${teacherRecord.body.data.id}`)
        .set("Authorization", `Bearer ${teacherLogin.accessToken}`)
        .send({
          teacherId: "1"
        });
      const studentRecordsResponse = await request(context.app)
        .get("/api/v1/behavior/students/1/records")
        .set("Authorization", `Bearer ${adminLogin.accessToken}`);

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.data.category.id).toBe("6");
      expect(updateResponse.body.data.severity).toBe(4);
      expect(updateResponse.body.data.description).toBe("Escalated disruption");
      expect(invalidActorUpdateResponse.status).toBe(400);
      expect(studentRecordsResponse.status).toBe(200);
      expect(studentRecordsResponse.body.data.records).toHaveLength(2);
      expect(studentRecordsResponse.body.data.summary.totalBehaviorRecords).toBe(2);
      expect(studentRecordsResponse.body.data.summary.positiveCount).toBe(1);
      expect(studentRecordsResponse.body.data.summary.negativeCount).toBe(1);
      expect(studentRecordsResponse.body.data.student.currentClass.id).toBe("1");
    });

    it("returns domain-aware behavior errors for duplicate categories and invalid actor flows", async () => {
      await context.seedTeacherAssignment("1", "1", "1", "1");
      await context.seedSupervisorAssignment("1", "1", "1");
      const adminLogin = await context.loginAsAdmin();

      await context.pool.query(
        `
          INSERT INTO academic_years (
            name,
            start_date,
            end_date,
            is_active
          )
          VALUES ($1, $2, $3, false)
        `,
        ["2026-2027", "2026-09-01", "2027-06-30"]
      );
      await context.pool.query(
        `
          INSERT INTO semesters (
            academic_year_id,
            name,
            start_date,
            end_date,
            is_active
          )
          VALUES ($1, $2, $3, $4, false)
        `,
        [2, "Semester Y", "2026-09-01", "2027-01-31"]
      );

      const duplicateCodeResponse = await request(context.app)
        .post("/api/v1/behavior/categories")
        .set("Authorization", `Bearer ${adminLogin.accessToken}`)
        .send({
          code: "respect",
          name: "Respect 2",
          behaviorType: "positive",
          defaultSeverity: 1
        });
      const missingActorResponse = await request(context.app)
        .post("/api/v1/behavior/records")
        .set("Authorization", `Bearer ${adminLogin.accessToken}`)
        .send({
          studentId: "1",
          behaviorCategoryId: "5",
          academicYearId: "1",
          semesterId: "2",
          behaviorDate: "2026-03-18"
        });
      const bothActorsResponse = await request(context.app)
        .post("/api/v1/behavior/records")
        .set("Authorization", `Bearer ${adminLogin.accessToken}`)
        .send({
          studentId: "1",
          behaviorCategoryId: "5",
          academicYearId: "1",
          semesterId: "2",
          teacherId: "1",
          supervisorId: "1",
          behaviorDate: "2026-03-18"
        });
      const invalidSeverityResponse = await request(context.app)
        .post("/api/v1/behavior/records")
        .set("Authorization", `Bearer ${adminLogin.accessToken}`)
        .send({
          studentId: "1",
          behaviorCategoryId: "5",
          academicYearId: "1",
          semesterId: "2",
          teacherId: "1",
          behaviorDate: "2026-03-18",
          severity: 6
        });
      const semesterMismatchResponse = await request(context.app)
        .post("/api/v1/behavior/records")
        .set("Authorization", `Bearer ${adminLogin.accessToken}`)
        .send({
          studentId: "1",
          behaviorCategoryId: "5",
          academicYearId: "1",
          semesterId: "3",
          teacherId: "1",
          behaviorDate: "2026-03-18"
        });

      expect(duplicateCodeResponse.status).toBe(409);
      expect(duplicateCodeResponse.body.message).toBe("Behavior category code already exists");
      expect(missingActorResponse.status).toBe(400);
      expect(bothActorsResponse.status).toBe(400);
      expect(invalidSeverityResponse.status).toBe(400);
      expect(semesterMismatchResponse.status).toBe(400);
      expect(semesterMismatchResponse.body.message).toBe(
        "Semester must belong to the selected academic year"
      );
    });
  });
};
