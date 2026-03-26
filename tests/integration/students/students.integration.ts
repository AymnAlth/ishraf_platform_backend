import request from "supertest";
import { describe, expect, it } from "vitest";

import { AUTH_TEST_FIXTURES } from "../../fixtures/auth.fixture";
import type { IntegrationTestContext } from "../../helpers/integration-context";
import { SEEDED_STUDENTS } from "../../setup/seed-test-data";

export const registerStudentsIntegrationTests = (
  context: IntegrationTestContext
): void => {
  describe("Students", () => {
    it("creates a student and returns the joined current class response", async () => {
      const { accessToken } = await context.loginAsAdmin();

      const response = await request(context.app)
        .post("/api/v1/students")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          academicNo: "STU-2000",
          fullName: "New Student",
          dateOfBirth: "2017-01-15",
          gender: "female",
          classId: "1"
        });

      expect(response.status).toBe(201);
      expect(response.body.data.academicNo).toBe("STU-2000");
      expect(response.body.data.currentClass.id).toBe("1");
      expect(response.body.data.primaryParent).toBeNull();
    });

    it("lists seeded students and fetches a single student profile", async () => {
      const { accessToken } = await context.loginAsAdmin();

      const listResponse = await request(context.app)
        .get("/api/v1/students")
        .set("Authorization", `Bearer ${accessToken}`);
      const detailResponse = await request(context.app)
        .get("/api/v1/students/1")
        .set("Authorization", `Bearer ${accessToken}`);

      expect(listResponse.status).toBe(200);
      expect(listResponse.body.data.items).toHaveLength(3);
      expect(listResponse.body.data.pagination).toMatchObject({
        page: 1,
        limit: 20,
        totalItems: 3,
        totalPages: 1
      });
      expect(listResponse.body.data.items[0].currentClass).toBeDefined();
      expect(detailResponse.status).toBe(200);
      expect(detailResponse.body.data.id).toBe("1");
      expect(detailResponse.body.data.primaryParent.parentId).toBe("1");
    });

    it("updates allowed student fields and rejects class changes through PATCH", async () => {
      const { accessToken } = await context.loginAsAdmin();

      const updateResponse = await request(context.app)
        .patch("/api/v1/students/2")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          fullName: "Student Two Updated",
          status: "suspended"
        });
      const invalidResponse = await request(context.app)
        .patch("/api/v1/students/2")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          classId: "2"
        });

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.data.fullName).toBe("Student Two Updated");
      expect(updateResponse.body.data.status).toBe("suspended");
      expect(invalidResponse.status).toBe(400);
    });

    it("links a parent to a student using the parent user id returned by /users", async () => {
      const { accessToken } = await context.loginAsAdmin();
      const parentsResponse = await request(context.app)
        .get("/api/v1/users")
        .query({ role: "parent" })
        .set("Authorization", `Bearer ${accessToken}`);
      const selectedParentUserId = parentsResponse.body.data.items[0].id;

      const createResponse = await request(context.app)
        .post("/api/v1/students/2/parents")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          parentId: selectedParentUserId,
          relationType: "father",
          isPrimary: true
        });
      const listResponse = await request(context.app)
        .get("/api/v1/students/2/parents")
        .set("Authorization", `Bearer ${accessToken}`);

      expect(parentsResponse.status).toBe(200);
      expect(createResponse.status).toBe(201);
      expect(createResponse.body.data.parentId).toBe("1");
      expect(createResponse.body.data.userId).toBe(AUTH_TEST_FIXTURES.inactiveUser.id);
      expect(createResponse.body.data.isPrimary).toBe(true);
      expect(listResponse.status).toBe(200);
      expect(listResponse.body.data).toHaveLength(1);
      expect(listResponse.body.data[0].userId).toBe(AUTH_TEST_FIXTURES.inactiveUser.id);
    });

    it("switches the primary parent without violating the unique primary index", async () => {
      const { accessToken } = await context.loginAsAdmin();
      const secondParent = await context.createAdditionalParentAccount();

      const linkSecondParentResponse = await request(context.app)
        .post("/api/v1/students/1/parents")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          parentId: secondParent.userId,
          relationType: "mother",
          isPrimary: false
        });
      const primaryResponse = await request(context.app)
        .patch(`/api/v1/students/1/parents/${secondParent.userId}/primary`)
        .set("Authorization", `Bearer ${accessToken}`);
      const linksInDatabase = await context.pool.query<{
        parent_id: string;
        is_primary: boolean;
      }>(
        `
          SELECT parent_id, is_primary
          FROM student_parents
          WHERE student_id = 1
          ORDER BY parent_id ASC
        `
      );

      expect(linkSecondParentResponse.status).toBe(201);
      expect(primaryResponse.status).toBe(200);
      expect(primaryResponse.body.data.parentId).toBe(secondParent.parentId);
      expect(primaryResponse.body.data.userId).toBe(secondParent.userId);
      expect(primaryResponse.body.data.isPrimary).toBe(true);
      expect(
        linksInDatabase.rows.filter((row) => row.is_primary).map((row) => row.parent_id)
      ).toEqual([secondParent.parentId]);
    });

    it("promotes a student and updates the stored class in the same request", async () => {
      const { accessToken } = await context.loginAsAdmin();

      const response = await request(context.app)
        .post("/api/v1/students/1/promotions")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          toClassId: "2",
          academicYearId: "1",
          notes: "Moved to the next class"
        });
      const studentClass = await context.pool.query<{ class_id: string }>(
        `
          SELECT class_id
          FROM students
          WHERE id = 1
        `
      );

      expect(response.status).toBe(201);
      expect(response.body.data.student.currentClass.id).toBe("2");
      expect(response.body.data.promotion.toClass.id).toBe("2");
      expect(studentClass.rows[0].class_id).toBe("2");
    });

    it("returns 409 instead of 500 for duplicate academic numbers", async () => {
      const { accessToken } = await context.loginAsAdmin();

      const response = await request(context.app)
        .post("/api/v1/students")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          academicNo: SEEDED_STUDENTS[0].academicNo,
          fullName: "Duplicate Student",
          dateOfBirth: "2017-01-15",
          gender: "female",
          classId: "1"
        });

      expect(response.status).toBe(409);
      expect(response.body.message).toBe("Academic number already exists");
    });

    it("returns 409 for duplicate parent links and 400 for class-year mismatches", async () => {
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
          INSERT INTO classes (
            grade_level_id,
            academic_year_id,
            class_name,
            section,
            capacity,
            is_active
          )
          VALUES ($1, $2, $3, $4, $5, true)
        `,
        [1, 2, "B", "B", 35]
      );

      const duplicateParentResponse = await request(context.app)
        .post("/api/v1/students/1/parents")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          parentId: "1",
          relationType: "father"
        });
      const promotionMismatchResponse = await request(context.app)
        .post("/api/v1/students/1/promotions")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          toClassId: "4",
          academicYearId: "1"
        });

      expect(duplicateParentResponse.status).toBe(409);
      expect(promotionMismatchResponse.status).toBe(400);
    });
  });
};
