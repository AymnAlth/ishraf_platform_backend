import request from "supertest";
import { describe, expect, it } from "vitest";

import type { IntegrationTestContext } from "../../helpers/integration-context";

export const registerAssessmentsIntegrationTests = (
  context: IntegrationTestContext
): void => {
  describe("Assessments", () => {
    it("creates and lists assessment types while keeping type creation admin-only", async () => {
      const adminLogin = await context.loginAsAdmin();
      const teacherLogin = await context.loginAsTeacher();

      const createResponse = await request(context.app)
        .post("/api/v1/assessments/types")
        .set("Authorization", `Bearer ${adminLogin.accessToken}`)
        .send({
          code: "project",
          name: "Project",
          description: "Project-based assessment"
        });

      const adminListResponse = await request(context.app)
        .get("/api/v1/assessments/types")
        .set("Authorization", `Bearer ${adminLogin.accessToken}`);
      const teacherListResponse = await request(context.app)
        .get("/api/v1/assessments/types")
        .set("Authorization", `Bearer ${teacherLogin.accessToken}`);
      const teacherCreateResponse = await request(context.app)
        .post("/api/v1/assessments/types")
        .set("Authorization", `Bearer ${teacherLogin.accessToken}`)
        .send({
          code: "forbidden",
          name: "Forbidden"
        });

      expect(createResponse.status).toBe(201);
      expect(createResponse.body.data.code).toBe("project");
      expect(adminListResponse.status).toBe(200);
      expect(adminListResponse.body.data).toHaveLength(7);
      expect(teacherListResponse.status).toBe(200);
      expect(teacherListResponse.body.data).toHaveLength(7);
      expect(teacherCreateResponse.status).toBe(403);
    });

    it("creates assessments for admins and teachers and scopes teacher access", async () => {
      await context.seedTeacherAssignment("1", "1", "1", "1");
      const secondTeacher = await context.createAdditionalTeacher();
      await context.seedTeacherAssignment(secondTeacher.teacherId, "2", "4", "1");

      const adminLogin = await context.loginAsAdmin();
      const teacherLogin = await context.loginAsTeacher();
      const secondTeacherLogin = await context.login(secondTeacher.email, secondTeacher.password);

      const adminCreateResponse = await request(context.app)
        .post("/api/v1/assessments")
        .set("Authorization", `Bearer ${adminLogin.accessToken}`)
        .send({
          assessmentTypeId: "1",
          classId: "2",
          subjectId: "4",
          teacherId: secondTeacher.teacherId,
          academicYearId: "1",
          semesterId: "2",
          title: "Admin Science Exam",
          maxScore: 100,
          weight: 20,
          assessmentDate: "2026-03-01",
          isPublished: false
        });

      const teacherCreateResponse = await request(context.app)
        .post("/api/v1/assessments")
        .set("Authorization", `Bearer ${teacherLogin.accessToken}`)
        .send({
          assessmentTypeId: "2",
          classId: "1",
          subjectId: "1",
          academicYearId: "1",
          semesterId: "2",
          title: "Teacher Quiz",
          maxScore: 20,
          weight: 5,
          assessmentDate: "2026-03-02",
          isPublished: true
        });

      const teacherListResponse = await request(context.app)
        .get("/api/v1/assessments")
        .set("Authorization", `Bearer ${teacherLogin.accessToken}`);
      const teacherOwnDetailResponse = await request(context.app)
        .get(`/api/v1/assessments/${teacherCreateResponse.body.data.assessment.id}`)
        .set("Authorization", `Bearer ${teacherLogin.accessToken}`);
      const teacherForbiddenDetailResponse = await request(context.app)
        .get(`/api/v1/assessments/${adminCreateResponse.body.data.assessment.id}`)
        .set("Authorization", `Bearer ${teacherLogin.accessToken}`);
      const secondTeacherListResponse = await request(context.app)
        .get("/api/v1/assessments")
        .set(
          "Authorization",
          `Bearer ${secondTeacherLogin.body.data.tokens.accessToken as string}`
        );

      expect(adminCreateResponse.status).toBe(201);
      expect(teacherCreateResponse.status).toBe(201);
      expect(teacherCreateResponse.body.data.assessment.teacher.teacherId).toBe("1");
      expect(teacherListResponse.status).toBe(200);
      expect(teacherListResponse.body.data.items).toHaveLength(1);
      expect(teacherListResponse.body.data.pagination).toMatchObject({
        page: 1,
        limit: 20,
        totalItems: 1,
        totalPages: 1
      });
      expect(teacherListResponse.body.data.items[0].title).toBe("Teacher Quiz");
      expect(teacherOwnDetailResponse.status).toBe(200);
      expect(teacherOwnDetailResponse.body.data.assessment.title).toBe("Teacher Quiz");
      expect(teacherForbiddenDetailResponse.status).toBe(403);
      expect(secondTeacherListResponse.status).toBe(200);
      expect(secondTeacherListResponse.body.data.items).toHaveLength(1);
      expect(secondTeacherListResponse.body.data.items[0].title).toBe("Admin Science Exam");
    });

    it("returns a full active roster for assessment scores and supports partial score upserts", async () => {
      await context.seedTeacherAssignment();
      const { accessToken } = await context.loginAsAdmin();

      const createAssessmentResponse = await request(context.app)
        .post("/api/v1/assessments")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          assessmentTypeId: "1",
          classId: "1",
          subjectId: "1",
          teacherId: "1",
          academicYearId: "1",
          semesterId: "2",
          title: "Monthly Exam",
          maxScore: 100,
          weight: 10,
          assessmentDate: "2026-03-03"
        });

      const assessmentId = createAssessmentResponse.body.data.assessment.id as string;

      const beforeResponse = await request(context.app)
        .get(`/api/v1/assessments/${assessmentId}/scores`)
        .set("Authorization", `Bearer ${accessToken}`);

      const firstSaveResponse = await request(context.app)
        .put(`/api/v1/assessments/${assessmentId}/scores`)
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          records: [
            {
              studentId: "1",
              score: 85,
              remarks: "Good job"
            }
          ]
        });

      const secondSaveResponse = await request(context.app)
        .put(`/api/v1/assessments/${assessmentId}/scores`)
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          records: [
            {
              studentId: "1",
              score: 90
            },
            {
              studentId: "2",
              score: 70,
              remarks: "Needs practice"
            }
          ]
        });

      expect(beforeResponse.status).toBe(200);
      expect(beforeResponse.body.data.students).toHaveLength(2);
      expect(beforeResponse.body.data.students[0].score).toBeNull();
      expect(firstSaveResponse.status).toBe(200);
      expect(firstSaveResponse.body.data.students[0].score).toBe(85);
      expect(firstSaveResponse.body.data.students[1].score).toBeNull();
      expect(secondSaveResponse.status).toBe(200);
      expect(secondSaveResponse.body.data.summary.gradedCount).toBe(2);
      expect(secondSaveResponse.body.data.students[0].score).toBe(90);
      expect(secondSaveResponse.body.data.students[1].score).toBe(70);
    });

    it("updates a single student assessment record", async () => {
      await context.seedTeacherAssignment();
      const { accessToken } = await context.loginAsAdmin();

      const createAssessmentResponse = await request(context.app)
        .post("/api/v1/assessments")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          assessmentTypeId: "2",
          classId: "1",
          subjectId: "1",
          teacherId: "1",
          academicYearId: "1",
          semesterId: "2",
          title: "Quick Quiz",
          maxScore: 20,
          weight: 5,
          assessmentDate: "2026-03-04"
        });

      const assessmentId = createAssessmentResponse.body.data.assessment.id as string;

      const saveResponse = await request(context.app)
        .put(`/api/v1/assessments/${assessmentId}/scores`)
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          records: [
            {
              studentId: "1",
              score: 12
            }
          ]
        });

      const studentAssessmentId = saveResponse.body.data.students[0].studentAssessmentId as string;
      const updateResponse = await request(context.app)
        .patch(`/api/v1/assessments/scores/${studentAssessmentId}`)
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          score: 15,
          remarks: "Regraded"
        });

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.data.studentAssessmentId).toBe(studentAssessmentId);
      expect(updateResponse.body.data.score).toBe(15);
      expect(updateResponse.body.data.remarks).toBe("Regraded");
    });

    it("returns domain-aware errors for duplicate types and invalid assessment score flows", async () => {
      await context.seedTeacherAssignment();
      const { accessToken } = await context.loginAsAdmin();

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
        [2, "Semester X", "2026-09-01", "2027-01-31"]
      );

      const duplicateCodeResponse = await request(context.app)
        .post("/api/v1/assessments/types")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          code: "exam",
          name: "Exam 2"
        });

      const duplicateNameResponse = await request(context.app)
        .post("/api/v1/assessments/types")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          code: "exam-2",
          name: "Exam"
        });

      const mismatchedSemesterResponse = await request(context.app)
        .post("/api/v1/assessments")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          assessmentTypeId: "1",
          classId: "1",
          subjectId: "1",
          teacherId: "1",
          academicYearId: "1",
          semesterId: "3",
          title: "Year Mismatch",
          maxScore: 50,
          assessmentDate: "2026-03-05"
        });

      const createAssessmentResponse = await request(context.app)
        .post("/api/v1/assessments")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          assessmentTypeId: "1",
          classId: "1",
          subjectId: "1",
          teacherId: "1",
          academicYearId: "1",
          semesterId: "2",
          title: "Scored Assessment",
          maxScore: 10,
          assessmentDate: "2026-03-06"
        });

      const assessmentId = createAssessmentResponse.body.data.assessment.id as string;
      const scoreTooHighResponse = await request(context.app)
        .put(`/api/v1/assessments/${assessmentId}/scores`)
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          records: [
            {
              studentId: "1",
              score: 11
            }
          ]
        });
      const wrongClassStudentResponse = await request(context.app)
        .put(`/api/v1/assessments/${assessmentId}/scores`)
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          records: [
            {
              studentId: "3",
              score: 9
            }
          ]
        });

      expect(duplicateCodeResponse.status).toBe(409);
      expect(duplicateCodeResponse.body.message).toBe("Assessment type code already exists");
      expect(duplicateNameResponse.status).toBe(409);
      expect(duplicateNameResponse.body.message).toBe("Assessment type name already exists");
      expect(mismatchedSemesterResponse.status).toBe(400);
      expect(scoreTooHighResponse.status).toBe(400);
      expect(scoreTooHighResponse.body.message).toBe(
        "Score cannot exceed the assessment maximum score"
      );
      expect(wrongClassStudentResponse.status).toBe(400);
      expect(wrongClassStudentResponse.body.message).toBe(
        "One or more students do not belong to the assessment class"
      );
    });

    it("rejects assessment creation when the subject is not offered in the selected semester", async () => {
      const { accessToken } = await context.loginAsAdmin();

      const createSubjectResponse = await request(context.app)
        .post("/api/v1/academic-structure/subjects")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          name: "Unscheduled Math",
          gradeLevelId: "1",
          code: "MATH-NO-OFFER"
        });

      const subjectId = createSubjectResponse.body.data.id as string;
      await context.seedTeacherAssignment("1", "1", subjectId, "1");

      const createAssessmentResponse = await request(context.app)
        .post("/api/v1/assessments")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          assessmentTypeId: "1",
          classId: "1",
          subjectId,
          teacherId: "1",
          academicYearId: "1",
          semesterId: "2",
          title: "No Offering Assessment",
          maxScore: 30,
          assessmentDate: "2026-03-07"
        });

      expect(createAssessmentResponse.status).toBe(400);
      expect(createAssessmentResponse.body.message).toBe(
        "Subject is not offered in the selected semester"
      );
    });
  });
};
