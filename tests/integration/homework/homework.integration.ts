import request from "supertest";
import { describe, expect, it } from "vitest";

import type { IntegrationTestContext } from "../../helpers/integration-context";

export const registerHomeworkIntegrationTests = (
  context: IntegrationTestContext
): void => {
  describe("Homework", () => {
    it("allows teacher to create homework, list it, fetch detail, and save submissions", async () => {
      await context.seedTeacherAssignment();
      const teacherLogin = await context.loginAsTeacher();

      const createResponse = await request(context.app)
        .post("/api/v1/homework")
        .set("Authorization", `Bearer ${teacherLogin.accessToken}`)
        .send({
          classId: "1",
          subjectId: "1",
          academicYearId: "1",
          semesterId: "2",
          title: "Science Homework 1",
          description: "Read chapter 2",
          assignedDate: "2026-03-10",
          dueDate: "2026-03-12"
        });

      const homeworkId = createResponse.body.data.id as string;

      const listResponse = await request(context.app)
        .get("/api/v1/homework?page=1&limit=20&sortBy=dueDate&sortOrder=desc")
        .set("Authorization", `Bearer ${teacherLogin.accessToken}`);
      const detailResponse = await request(context.app)
        .get(`/api/v1/homework/${homeworkId}`)
        .set("Authorization", `Bearer ${teacherLogin.accessToken}`);
      const saveSubmissionsResponse = await request(context.app)
        .put(`/api/v1/homework/${homeworkId}/submissions`)
        .set("Authorization", `Bearer ${teacherLogin.accessToken}`)
        .send({
          records: [
            {
              studentId: "1",
              status: "submitted",
              notes: "Completed"
            },
            {
              studentId: "2",
              status: "not_submitted",
              notes: "Missing"
            }
          ]
        });

      expect(createResponse.status).toBe(201);
      expect(listResponse.status).toBe(200);
      expect(listResponse.body.data.items).toHaveLength(1);
      expect(detailResponse.status).toBe(200);
      expect(detailResponse.body.data.students).toHaveLength(2);
      expect(saveSubmissionsResponse.status).toBe(200);
      expect(saveSubmissionsResponse.body.data.students[0].status).toBe("submitted");
      expect(saveSubmissionsResponse.body.data.students[1].status).toBe("not_submitted");
    });

    it("allows admin-created homework and parent-owned child homework retrieval only for linked students", async () => {
      await context.seedTeacherAssignment();
      const adminLogin = await context.loginAsAdmin();
      const parentAccount = await context.createAdditionalParentAccount();

      const createResponse = await request(context.app)
        .post("/api/v1/homework")
        .set("Authorization", `Bearer ${adminLogin.accessToken}`)
        .send({
          teacherId: "1",
          classId: "1",
          subjectId: "1",
          academicYearId: "1",
          semesterId: "2",
          title: "Admin Homework",
          description: "Prepared by admin",
          assignedDate: "2026-03-11",
          dueDate: "2026-03-13"
        });

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

      const linkedStudentResponse = await request(context.app)
        .get("/api/v1/homework/students/1")
        .set("Authorization", `Bearer ${parentAccessToken}`);
      const unrelatedStudentResponse = await request(context.app)
        .get("/api/v1/homework/students/2")
        .set("Authorization", `Bearer ${parentAccessToken}`);

      expect(createResponse.status).toBe(201);
      expect(linkedStudentResponse.status).toBe(200);
      expect(linkedStudentResponse.body.data.student.id).toBe("1");
      expect(linkedStudentResponse.body.data.items).toHaveLength(1);
      expect(unrelatedStudentResponse.status).toBe(403);
    });

    it("rejects homework submissions for students outside the homework class", async () => {
      await context.seedTeacherAssignment();
      const teacherLogin = await context.loginAsTeacher();

      const createResponse = await request(context.app)
        .post("/api/v1/homework")
        .set("Authorization", `Bearer ${teacherLogin.accessToken}`)
        .send({
          classId: "1",
          subjectId: "1",
          academicYearId: "1",
          semesterId: "2",
          title: "Science Homework 2",
          assignedDate: "2026-03-14",
          dueDate: "2026-03-16"
        });
      const homeworkId = createResponse.body.data.id as string;

      const invalidSubmissionResponse = await request(context.app)
        .put(`/api/v1/homework/${homeworkId}/submissions`)
        .set("Authorization", `Bearer ${teacherLogin.accessToken}`)
        .send({
          records: [
            {
              studentId: "3",
              status: "submitted"
            }
          ]
        });

      expect(createResponse.status).toBe(201);
      expect(invalidSubmissionResponse.status).toBe(400);
      expect(invalidSubmissionResponse.body.message).toBe(
        "One or more students do not belong to the homework class"
      );
    });

    it("rejects homework creation when the subject is not offered in the selected semester", async () => {
      const { accessToken } = await context.loginAsAdmin();

      const createSubjectResponse = await request(context.app)
        .post("/api/v1/academic-structure/subjects")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          name: "Unscheduled Homework Subject",
          gradeLevelId: "1",
          code: "HW-NO-OFFER"
        });

      const subjectId = createSubjectResponse.body.data.id as string;
      await context.seedTeacherAssignment("1", "1", subjectId, "1");

      const createHomeworkResponse = await request(context.app)
        .post("/api/v1/homework")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          teacherId: "1",
          classId: "1",
          subjectId,
          academicYearId: "1",
          semesterId: "2",
          title: "Homework Without Offering",
          assignedDate: "2026-03-17",
          dueDate: "2026-03-18"
        });

      expect(createHomeworkResponse.status).toBe(400);
      expect(createHomeworkResponse.body.message).toBe(
        "Subject is not offered in the selected semester"
      );
    });
  });
};

