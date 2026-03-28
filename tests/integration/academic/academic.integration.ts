import request from "supertest";
import { describe, expect, it } from "vitest";

import { AUTH_TEST_FIXTURES } from "../../fixtures/auth.fixture";
import type { IntegrationTestContext } from "../../helpers/integration-context";
import { SEEDED_SUPERVISOR } from "../../setup/seed-test-data";

export const registerAcademicIntegrationTests = (
  context: IntegrationTestContext
): void => {
  describe("Academic Structure", () => {
    it("creates an active academic year and deactivates the previous one", async () => {
      const { accessToken } = await context.loginAsAdmin();

      const response = await request(context.app)
        .post("/api/v1/academic-structure/academic-years")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          name: "2026-2027",
          startDate: "2026-09-01",
          endDate: "2027-06-30",
          isActive: true
        });

      const oldYear = await context.pool.query<{ is_active: boolean }>(
        `
          SELECT is_active
          FROM academic_years
          WHERE id = 1
        `
      );

      expect(response.status).toBe(201);
      expect(response.body.data.isActive).toBe(true);
      expect(oldYear.rows[0].is_active).toBe(false);
    });

    it("creates and updates semesters while rejecting dates outside the academic year", async () => {
      const { accessToken } = await context.loginAsAdmin();

      const createResponse = await request(context.app)
        .post("/api/v1/academic-structure/academic-years/1/semesters")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          name: "Summer Term",
          startDate: "2026-05-01",
          endDate: "2026-05-31",
          isActive: false
        });

      const listResponse = await request(context.app)
        .get("/api/v1/academic-structure/academic-years/1/semesters")
        .set("Authorization", `Bearer ${accessToken}`);

      const updateResponse = await request(context.app)
        .patch(`/api/v1/academic-structure/semesters/${createResponse.body.data.id}`)
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          name: "Summer Term Updated"
        });

      const invalidResponse = await request(context.app)
        .post("/api/v1/academic-structure/academic-years/1/semesters")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          name: "Invalid Term",
          startDate: "2025-08-01",
          endDate: "2025-08-31"
        });

      expect(createResponse.status).toBe(201);
      expect(listResponse.status).toBe(200);
      expect(listResponse.body.data).toHaveLength(3);
      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.data.name).toBe("Summer Term Updated");
      expect(invalidResponse.status).toBe(400);
    });

    it("creates grade levels, classes, and subjects and can fetch them back", async () => {
      const { accessToken } = await context.loginAsAdmin();

      const gradeLevelResponse = await request(context.app)
        .post("/api/v1/academic-structure/grade-levels")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          name: "Kindergarten",
          levelOrder: 20
        });

      const subjectResponse = await request(context.app)
        .post("/api/v1/academic-structure/subjects")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          name: "English",
          gradeLevelId: gradeLevelResponse.body.data.id,
          code: "ENG-KG"
        });

      const classResponse = await request(context.app)
        .post("/api/v1/academic-structure/classes")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          gradeLevelId: gradeLevelResponse.body.data.id,
          academicYearId: "1",
          className: "B",
          section: "B",
          capacity: 25
        });

      const getSubjectResponse = await request(context.app)
        .get(`/api/v1/academic-structure/subjects/${subjectResponse.body.data.id}`)
        .set("Authorization", `Bearer ${accessToken}`);

      const getClassResponse = await request(context.app)
        .get(`/api/v1/academic-structure/classes/${classResponse.body.data.id}`)
        .set("Authorization", `Bearer ${accessToken}`);

      expect(gradeLevelResponse.status).toBe(201);
      expect(subjectResponse.status).toBe(201);
      expect(classResponse.status).toBe(201);
      expect(getSubjectResponse.body.data.gradeLevel.name).toBe("Kindergarten");
      expect(getClassResponse.body.data.gradeLevel.name).toBe("Kindergarten");
    });

    it("creates, lists, fetches, and updates subject offerings", async () => {
      const { accessToken } = await context.loginAsAdmin();

      const subjectResponse = await request(context.app)
        .post("/api/v1/academic-structure/subjects")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          name: "Quran",
          gradeLevelId: "1",
          code: "QUR-G1"
        });

      const createOfferingResponse = await request(context.app)
        .post("/api/v1/academic-structure/subject-offerings")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          subjectId: subjectResponse.body.data.id,
          semesterId: "1",
          isActive: true
        });

      const listResponse = await request(context.app)
        .get("/api/v1/academic-structure/subject-offerings")
        .query({
          semesterId: "1",
          subjectId: subjectResponse.body.data.id
        })
        .set("Authorization", `Bearer ${accessToken}`);

      const getResponse = await request(context.app)
        .get(`/api/v1/academic-structure/subject-offerings/${createOfferingResponse.body.data.id}`)
        .set("Authorization", `Bearer ${accessToken}`);

      const updateResponse = await request(context.app)
        .patch(`/api/v1/academic-structure/subject-offerings/${createOfferingResponse.body.data.id}`)
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          isActive: false
        });

      expect(createOfferingResponse.status).toBe(201);
      expect(createOfferingResponse.body.data.subject.id).toBe(subjectResponse.body.data.id);
      expect(createOfferingResponse.body.data.semester.id).toBe("1");
      expect(listResponse.status).toBe(200);
      expect(listResponse.body.data).toHaveLength(1);
      expect(getResponse.status).toBe(200);
      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.data.isActive).toBe(false);
    });

    it("creates teacher assignments and rejects grade-level mismatches", async () => {
      const { accessToken } = await context.loginAsAdmin();

      const createResponse = await request(context.app)
        .post("/api/v1/academic-structure/teacher-assignments")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          teacherId: AUTH_TEST_FIXTURES.activePhoneUser.id,
          classId: "1",
          subjectId: "1",
          academicYearId: "1"
        });

      const listResponse = await request(context.app)
        .get("/api/v1/academic-structure/teacher-assignments")
        .set("Authorization", `Bearer ${accessToken}`);

      const mismatchResponse = await request(context.app)
        .post("/api/v1/academic-structure/teacher-assignments")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          teacherId: AUTH_TEST_FIXTURES.activePhoneUser.id,
          classId: "1",
          subjectId: "4",
          academicYearId: "1"
        });
      const invalidTeacherResponse = await request(context.app)
        .post("/api/v1/academic-structure/teacher-assignments")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          teacherId: AUTH_TEST_FIXTURES.activeEmailUser.id,
          classId: "1",
          subjectId: "1",
          academicYearId: "1"
        });

      expect(createResponse.status).toBe(201);
      expect(createResponse.body.data.teacher.fullName).toBe(
        AUTH_TEST_FIXTURES.activePhoneUser.fullName
      );
      expect(listResponse.status).toBe(200);
      expect(listResponse.body.data).toHaveLength(1);
      expect(mismatchResponse.status).toBe(400);
      expect(invalidTeacherResponse.status).toBe(404);
    });

    it("creates supervisor assignments and lists them with joined data", async () => {
      const { accessToken } = await context.loginAsAdmin();

      const createResponse = await request(context.app)
        .post("/api/v1/academic-structure/supervisor-assignments")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          supervisorId: SEEDED_SUPERVISOR.id,
          classId: "1",
          academicYearId: "1"
        });

      const listResponse = await request(context.app)
        .get("/api/v1/academic-structure/supervisor-assignments")
        .set("Authorization", `Bearer ${accessToken}`);
      const invalidSupervisorResponse = await request(context.app)
        .post("/api/v1/academic-structure/supervisor-assignments")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          supervisorId: AUTH_TEST_FIXTURES.activePhoneUser.id,
          classId: "1",
          academicYearId: "1"
        });

      expect(createResponse.status).toBe(201);
      expect(createResponse.body.data.supervisor.fullName).toBe(SEEDED_SUPERVISOR.fullName);
      expect(listResponse.status).toBe(200);
      expect(listResponse.body.data).toHaveLength(1);
      expect(invalidSupervisorResponse.status).toBe(404);
    });
  });
};
