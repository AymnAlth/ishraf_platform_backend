import request from "supertest";
import { describe, expect, it } from "vitest";

import type { IntegrationTestContext } from "../../helpers/integration-context";
import {
  SCHOOL_ONBOARDING_SHEET_DEFINITIONS,
  SCHOOL_ONBOARDING_SHEET_IDS,
  SCHOOL_ONBOARDING_TEMPLATE_VERSION,
  type SchoolOnboardingSheetId
} from "../../../src/modules/admin-imports/school-onboarding.constants";

type WorkbookSheetPayload = {
  sheetId: SchoolOnboardingSheetId;
  present: boolean;
  headers: string[];
  rows: Array<{
    rowNumber: number;
    values: Record<string, string | number | boolean | null>;
  }>;
};

const buildWorkbook = (
  overrides: Partial<Record<SchoolOnboardingSheetId, WorkbookSheetPayload["rows"]>> = {}
) => ({
  sheets: Object.fromEntries(
    SCHOOL_ONBOARDING_SHEET_IDS.map((sheetId) => [
      sheetId,
      {
        sheetId,
        present: true,
        headers: [...SCHOOL_ONBOARDING_SHEET_DEFINITIONS[sheetId].expectedHeaders],
        rows: overrides[sheetId] ?? []
      }
    ])
  ) as Record<SchoolOnboardingSheetId, WorkbookSheetPayload>
});

const buildValidDryRunPayload = () => ({
  templateVersion: SCHOOL_ONBOARDING_TEMPLATE_VERSION,
  fileName: "school-onboarding-valid.json",
  fileHash: "sha256-valid-import-v1",
  fileSize: 1024,
  config: {
    activateAfterImport: false
  },
  workbook: buildWorkbook({
    AcademicYears: [
      {
        rowNumber: 2,
        values: {
          year_name: "2026-2027",
          start_date: "2026-09-01",
          end_date: "2027-06-30"
        }
      }
    ],
    Semesters: [
      {
        rowNumber: 2,
        values: {
          academic_year_name: "2026-2027",
          semester_name: "الفصل الأول",
          start_date: "2026-09-01",
          end_date: "2027-01-31"
        }
      }
    ],
    GradeLevels: [
      {
        rowNumber: 2,
        values: {
          grade_level_name: "الصف الرابع",
          level_order: 4
        }
      }
    ],
    Classes: [
      {
        rowNumber: 2,
        values: {
          academic_year_name: "2026-2027",
          grade_level_name: "الصف الرابع",
          class_name: "أ",
          section: "علوم",
          capacity: 35,
          is_active: "true"
        }
      }
    ],
    Subjects: [
      {
        rowNumber: 2,
        values: {
          grade_level_name: "الصف الرابع",
          subject_code: "AR4",
          subject_name: "اللغة العربية",
          is_active: "true"
        }
      }
    ],
    Users_Teachers: [
      {
        rowNumber: 2,
        values: {
          full_name: "المعلم سامي",
          phone: "0900000101",
          email: "teacher-import@example.com",
          specialization: "لغة عربية",
          qualification: "بكالوريوس",
          hire_date: "2026-09-01"
        }
      }
    ],
    Users_Supervisors: [
      {
        rowNumber: 2,
        values: {
          full_name: "المشرف أمين",
          phone: "0900000102",
          email: "supervisor-import@example.com",
          department: "شؤون الطلاب"
        }
      }
    ],
    Users_Parents: [
      {
        rowNumber: 2,
        values: {
          full_name: "ولي الأمر خالد",
          phone: "0900000103",
          email: "parent-import@example.com",
          address: "صنعاء"
        }
      }
    ],
    Users_Drivers: [
      {
        rowNumber: 2,
        values: {
          full_name: "السائق هلال",
          phone: "0900000104",
          email: "driver-import@example.com",
          license_number: "DRV-IMPORT-01",
          driver_status: "active"
        }
      }
    ],
    Students: [
      {
        rowNumber: 2,
        values: {
          academic_number: "STU-IMPORT-01",
          full_name: "الطالب يحيى",
          gender: "male",
          date_of_birth: "2017-02-01",
          status: "active",
          enrollment_date: "2026-09-01",
          address: "صنعاء"
        }
      }
    ],
    StudentParentLinks: [
      {
        rowNumber: 2,
        values: {
          student_academic_number: "STU-IMPORT-01",
          parent_phone_or_email: "0900000103",
          relation_type: "father",
          is_primary: "true"
        }
      }
    ],
    StudentEnrollments: [
      {
        rowNumber: 2,
        values: {
          student_academic_number: "STU-IMPORT-01",
          academic_year_name: "2026-2027",
          grade_level_name: "الصف الرابع",
          class_name: "أ",
          section: "علوم"
        }
      }
    ],
    SubjectOfferings: [
      {
        rowNumber: 2,
        values: {
          academic_year_name: "2026-2027",
          semester_name: "الفصل الأول",
          grade_level_name: "الصف الرابع",
          subject_code: "AR4",
          is_active: "true"
        }
      }
    ],
    TeacherAssignments: [
      {
        rowNumber: 2,
        values: {
          academic_year_name: "2026-2027",
          grade_level_name: "الصف الرابع",
          class_name: "أ",
          section: "علوم",
          subject_code: "AR4",
          teacher_phone_or_email: "0900000101"
        }
      }
    ],
    SupervisorAssignments: [
      {
        rowNumber: 2,
        values: {
          academic_year_name: "2026-2027",
          grade_level_name: "الصف الرابع",
          class_name: "أ",
          section: "علوم",
          supervisor_phone_or_email: "0900000102"
        }
      }
    ],
    Buses: [
      {
        rowNumber: 2,
        values: {
          plate_number: "BUS-IMPORT-01",
          capacity: 30,
          driver_phone_or_email: "0900000104",
          status: "active"
        }
      }
    ],
    Routes: [
      {
        rowNumber: 2,
        values: {
          route_name: "خط الاستيراد",
          start_point: "المدرسة",
          end_point: "الحي الشرقي",
          estimated_duration_minutes: 25,
          is_active: "true"
        }
      }
    ],
    RouteStops: [
      {
        rowNumber: 2,
        values: {
          route_name: "خط الاستيراد",
          stop_order: 1,
          stop_name: "المحطة الأولى",
          latitude: 15.3694,
          longitude: 44.191
        }
      }
    ],
    RouteAssignments: [
      {
        rowNumber: 2,
        values: {
          bus_plate_number: "BUS-IMPORT-01",
          route_name: "خط الاستيراد",
          start_date: "2026-09-01",
          end_date: null
        }
      }
    ],
    StudentTransportAssignments: [
      {
        rowNumber: 2,
        values: {
          student_academic_number: "STU-IMPORT-01",
          route_name: "خط الاستيراد",
          stop_order: 1,
          start_date: "2026-09-01",
          end_date: null
        }
      }
    ],
    StudentHomeLocations: [
      {
        rowNumber: 2,
        values: {
          student_academic_number: "STU-IMPORT-01",
          address_label: "منزل الطالب",
          address_text: "حي التحرير",
          latitude: 15.3695,
          longitude: 44.1911,
          status: "approved",
          notes: "تمت المراجعة"
        }
      }
    ]
  })
});

const buildDuplicateGradeLevelPayload = () => ({
  templateVersion: SCHOOL_ONBOARDING_TEMPLATE_VERSION,
  fileName: "school-onboarding-duplicate.json",
  fileHash: "sha256-duplicate-import-v1",
  config: {
    activateAfterImport: false
  },
  workbook: buildWorkbook({
    GradeLevels: [
      {
        rowNumber: 2,
        values: {
          grade_level_name: "Grade 1",
          level_order: 1
        }
      }
    ]
  })
});

export const registerAdminImportsIntegrationTests = (
  context: IntegrationTestContext
): void => {
  describe("Admin Imports", () => {
    it("runs school onboarding dry-run, stores history, and blocks non-admin callers", async () => {
      const adminLogin = await context.loginAsAdmin();
      const teacherLogin = await context.loginAsTeacher();
      const payload = buildDuplicateGradeLevelPayload();

      const forbiddenResponse = await request(context.app)
        .post("/api/v1/admin-imports/school-onboarding/dry-run")
        .set("Authorization", `Bearer ${teacherLogin.accessToken}`)
        .send(payload);

      const dryRunResponse = await request(context.app)
        .post("/api/v1/admin-imports/school-onboarding/dry-run")
        .set("Authorization", `Bearer ${adminLogin.accessToken}`)
        .send(payload);

      const historyResponse = await request(context.app)
        .get("/api/v1/admin-imports/school-onboarding/history")
        .set("Authorization", `Bearer ${adminLogin.accessToken}`);

      const importId = dryRunResponse.body.data.importId as string;
      const historyDetailResponse = await request(context.app)
        .get(`/api/v1/admin-imports/school-onboarding/history/${importId}`)
        .set("Authorization", `Bearer ${adminLogin.accessToken}`);

      expect(forbiddenResponse.status).toBe(403);
      expect(dryRunResponse.status).toBe(200);
      expect(dryRunResponse.body.data).toMatchObject({
        mode: "dry-run",
        status: "rejected",
        canApply: false
      });
      expect(
        dryRunResponse.body.data.issues.some(
          (issue: { code: string }) => issue.code === "duplicate_existing_record"
        )
      ).toBe(true);
      expect(historyResponse.status).toBe(200);
      expect(historyResponse.body.data.items).toHaveLength(1);
      expect(historyDetailResponse.status).toBe(200);
      expect(historyDetailResponse.body.data.importId).toBe(importId);
      expect(historyDetailResponse.body.data.result.status).toBe("rejected");
    });

    it("applies a validated school onboarding import and returns the existing result on retry", async () => {
      const adminLogin = await context.loginAsAdmin();
      const payload = buildValidDryRunPayload();

      const dryRunResponse = await request(context.app)
        .post("/api/v1/admin-imports/school-onboarding/dry-run")
        .set("Authorization", `Bearer ${adminLogin.accessToken}`)
        .send(payload);

      const dryRunId = dryRunResponse.body.data.importId as string;

      const applyResponse = await request(context.app)
        .post("/api/v1/admin-imports/school-onboarding/apply")
        .set("Authorization", `Bearer ${adminLogin.accessToken}`)
        .send({
          dryRunId,
          fallbackPassword: "ImportSeed123!"
        });

      const secondApplyResponse = await request(context.app)
        .post("/api/v1/admin-imports/school-onboarding/apply")
        .set("Authorization", `Bearer ${adminLogin.accessToken}`)
        .send({
          dryRunId,
          fallbackPassword: "ImportSeed123!"
        });

      const historyResponse = await request(context.app)
        .get("/api/v1/admin-imports/school-onboarding/history")
        .set("Authorization", `Bearer ${adminLogin.accessToken}`);

      const usersResponse = await request(context.app)
        .get("/api/v1/users?role=teacher")
        .set("Authorization", `Bearer ${adminLogin.accessToken}`);

      expect(dryRunResponse.status).toBe(200);
      expect(dryRunResponse.body.data).toMatchObject({
        mode: "dry-run",
        status: "validated",
        canApply: true
      });
      expect(applyResponse.status).toBe(200);
      expect(applyResponse.body.data).toMatchObject({
        mode: "apply",
        status: "applied",
        canApply: false,
        alreadyApplied: false
      });
      expect(secondApplyResponse.status).toBe(200);
      expect(secondApplyResponse.body.data.alreadyApplied).toBe(true);
      expect(historyResponse.status).toBe(200);
      expect(historyResponse.body.data.items).toHaveLength(2);
      expect(usersResponse.status).toBe(200);
      expect(
        usersResponse.body.data.items.some(
          (item: { email: string | null }) => item.email === "teacher-import@example.com"
        )
      ).toBe(true);
    });
  });
};

