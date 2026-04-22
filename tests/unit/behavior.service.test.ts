import { beforeEach, describe, expect, it, vi } from "vitest";

import { ForbiddenError } from "../../src/common/errors/forbidden-error";
import { ValidationError } from "../../src/common/errors/validation-error";
import type { ActiveAcademicContext } from "../../src/common/services/active-academic-context.service";
import { db } from "../../src/database/db";
import type { AutomationPort } from "../../src/modules/automation/types/automation.types";
import { BehaviorService } from "../../src/modules/behavior/service/behavior.service";
import type { BehaviorRepository } from "../../src/modules/behavior/repository/behavior.repository";
import type {
  BehaviorCategoryRow,
  BehaviorRecordRow,
  StudentBehaviorReferenceRow} from "../../src/modules/behavior/types/behavior.types";

const categoryRow = (
  overrides: Partial<BehaviorCategoryRow> = {}
): BehaviorCategoryRow => ({
  id: "5",
  code: "lateness",
  name: "Lateness",
  behaviorType: "negative",
  defaultSeverity: 2,
  isActive: true,
  ...overrides
});

const studentRow = (
  overrides: Partial<StudentBehaviorReferenceRow> = {}
): StudentBehaviorReferenceRow => ({
  studentId: "1",
  academicNo: "STU-1001",
  fullName: "Student One",
  classId: "1",
  className: "A",
  section: "A",
  academicYearId: "1",
  academicYearName: "2025-2026",
  ...overrides
});



const behaviorRecordRow = (
  overrides: Partial<BehaviorRecordRow> = {}
): BehaviorRecordRow => ({
  id: "10",
  studentId: "1",
  academicNo: "STU-1001",
  studentFullName: "Student One",
  behaviorCategoryId: "5",
  behaviorCode: "lateness",
  behaviorName: "Lateness",
  behaviorType: "negative",
  severity: 2,
  description: "Late to class",
  behaviorDate: "2026-03-10",
  teacherId: "1",
  teacherFullName: "Sara Teacher",
  supervisorId: null,
  supervisorFullName: null,
  academicYearId: "1",
  academicYearName: "2025-2026",
  semesterId: "2",
  semesterName: "Semester 2",
  createdAt: new Date("2026-03-13T10:00:00.000Z"),
  ...overrides
});

describe("BehaviorService", () => {
  const activeContext = (
    overrides: Partial<ActiveAcademicContext> = {}
  ): ActiveAcademicContext => ({
    academicYearId: "1",
    academicYearName: "2025-2026",
    academicYearStartDate: new Date("2025-09-01T00:00:00.000Z"),
    academicYearEndDate: new Date("2026-06-30T00:00:00.000Z"),
    academicYearCreatedAt: new Date("2026-03-13T10:00:00.000Z"),
    academicYearUpdatedAt: new Date("2026-03-13T10:00:00.000Z"),
    semesterId: "2",
    semesterName: "Semester 2",
    semesterStartDate: new Date("2026-02-01T00:00:00.000Z"),
    semesterEndDate: new Date("2026-06-30T00:00:00.000Z"),
    semesterCreatedAt: new Date("2026-03-13T10:00:00.000Z"),
    semesterUpdatedAt: new Date("2026-03-13T10:00:00.000Z"),
    ...overrides
  });

  const repositoryMock = {
    createBehaviorCategory: vi.fn(),
    findBehaviorCategoryById: vi.fn(),
    listActiveBehaviorCategories: vi.fn(),
    findTeacherProfileByUserId: vi.fn(),
    findTeacherById: vi.fn(),
    findSupervisorProfileByUserId: vi.fn(),
    findSupervisorById: vi.fn(),
    findStudentBehaviorReferenceById: vi.fn(),
    findAcademicYearById: vi.fn(),
    findSemesterById: vi.fn(),
    hasTeacherBehaviorAssignment: vi.fn(),
    hasSupervisorBehaviorAssignment: vi.fn(),
    createBehaviorRecord: vi.fn(),
    listBehaviorRecords: vi.fn(),
    findBehaviorRecordById: vi.fn(),
    updateBehaviorRecord: vi.fn(),
    findStudentBehaviorSummary: vi.fn()
  };
  const profileResolutionServiceMock = {
    requireTeacherProfile: vi.fn(),
    requireSupervisorProfile: vi.fn(),
    requireTeacherProfileIdentifier: vi.fn(),
    requireSupervisorProfileIdentifier: vi.fn()
  };
  const activeAcademicContextServiceMock = {
    getActiveContext: vi.fn(),
    requireActiveContext: vi.fn(),
    resolveActiveAcademicYear: vi.fn(),
    resolveOperationalContext: vi.fn()
  };

  let behaviorService: BehaviorService;
  const automationMock = {
    onStudentAbsent: vi.fn(),
    onNegativeBehavior: vi.fn(),
    onTripStarted: vi.fn(),
    onStudentDroppedOff: vi.fn()
  };

  beforeEach(() => {
    behaviorService = new BehaviorService(
      repositoryMock as unknown as BehaviorRepository,
      profileResolutionServiceMock as never,
      undefined,
      activeAcademicContextServiceMock as never,
      automationMock as unknown as AutomationPort
    );

    vi.restoreAllMocks();
    vi.spyOn(db, "withTransaction").mockImplementation(async (callback) => {
      const fakeClient = {
        query: vi.fn(),
        release: vi.fn()
      };

      return callback(fakeClient as never);
    });

    Object.values(repositoryMock).forEach((mockFn) => mockFn.mockReset());
    Object.values(profileResolutionServiceMock).forEach((mockFn) => mockFn.mockReset());
    Object.values(activeAcademicContextServiceMock).forEach((mockFn) => mockFn.mockReset());
    Object.values(automationMock).forEach((mockFn) => mockFn.mockReset());
    vi.mocked(activeAcademicContextServiceMock.resolveOperationalContext).mockResolvedValue({
      academicYearId: "1",
      academicYearName: "2025-2026",
      semesterId: "2",
      semesterName: "Semester 2"
    });
    vi.mocked(activeAcademicContextServiceMock.requireActiveContext).mockResolvedValue(
      activeContext()
    );
  });

  it("creates behavior categories", async () => {
    vi.mocked(repositoryMock.createBehaviorCategory).mockResolvedValue("5");
    vi.mocked(repositoryMock.findBehaviorCategoryById).mockResolvedValue(categoryRow());

    const response = await behaviorService.createCategory({
      code: "lateness",
      name: "Lateness",
      behaviorType: "negative",
      defaultSeverity: 2
    });

    expect(response.id).toBe("5");
    expect(repositoryMock.createBehaviorCategory).toHaveBeenCalledOnce();
  });

  it("creates behavior records for assigned teachers using category default severity", async () => {
    vi.mocked(profileResolutionServiceMock.requireTeacherProfile).mockResolvedValue({
      teacherId: "1",
      userId: "1002",
      fullName: "Sara Teacher",
      email: "teacher@example.com",
      phone: "700000003",
      specialization: null,
      qualification: null,
      hireDate: null
    });
    vi.mocked(repositoryMock.findStudentBehaviorReferenceById).mockResolvedValue(studentRow());
    vi.mocked(repositoryMock.findBehaviorCategoryById).mockResolvedValue(categoryRow());
    vi.mocked(repositoryMock.findAcademicYearById).mockResolvedValue({
      id: "1",
      name: "2025-2026"
    });
    vi.mocked(repositoryMock.findSemesterById).mockResolvedValue({
      id: "2",
      name: "Semester 2",
      academicYearId: "1"
    });
    vi.mocked(repositoryMock.hasTeacherBehaviorAssignment).mockResolvedValue(true);
    vi.mocked(repositoryMock.createBehaviorRecord).mockResolvedValue("10");
    vi.mocked(repositoryMock.findBehaviorRecordById).mockResolvedValue(behaviorRecordRow());

    const response = await behaviorService.createRecord(
      {
        userId: "1002",
        role: "teacher",
        email: "teacher@example.com",
        isActive: true
      },
      {
        studentId: "1",
        behaviorCategoryId: "5",
        academicYearId: "1",
        semesterId: "2",
        behaviorDate: "2026-03-10"
      }
    );

    expect(response.id).toBe("10");
    expect(repositoryMock.findStudentBehaviorReferenceById).toHaveBeenCalledWith(
      "1",
      "1"
    );
    expect(repositoryMock.createBehaviorRecord).toHaveBeenCalledOnce();
    expect(automationMock.onNegativeBehavior).toHaveBeenCalledWith({
      behaviorRecordId: "10",
      studentId: "1",
      studentName: "Student One",
      categoryName: "Lateness",
      behaviorDate: "2026-03-10"
    });
  });

  it("rejects admin record creation without exactly one actor", async () => {
    vi.mocked(repositoryMock.findStudentBehaviorReferenceById).mockResolvedValue(studentRow());
    vi.mocked(repositoryMock.findBehaviorCategoryById).mockResolvedValue(categoryRow());
    vi.mocked(repositoryMock.findAcademicYearById).mockResolvedValue({
      id: "1",
      name: "2025-2026"
    });
    vi.mocked(repositoryMock.findSemesterById).mockResolvedValue({
      id: "2",
      name: "Semester 2",
      academicYearId: "1"
    });

    await expect(
      behaviorService.createRecord(
        {
          userId: "1001",
          role: "admin",
          email: "admin@example.com",
          isActive: true
        },
        {
          studentId: "1",
          behaviorCategoryId: "5",
          academicYearId: "1",
          semesterId: "2",
          behaviorDate: "2026-03-10"
        }
      )
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("normalizes teacher user ids for admin-created behavior records", async () => {
    vi.mocked(repositoryMock.findStudentBehaviorReferenceById).mockResolvedValue(studentRow());
    vi.mocked(repositoryMock.findBehaviorCategoryById).mockResolvedValue(categoryRow());
    vi.mocked(repositoryMock.findAcademicYearById).mockResolvedValue({
      id: "1",
      name: "2025-2026"
    });
    vi.mocked(repositoryMock.findSemesterById).mockResolvedValue({
      id: "2",
      name: "Semester 2",
      academicYearId: "1"
    });
    vi.mocked(profileResolutionServiceMock.requireTeacherProfileIdentifier).mockResolvedValue({
      teacherId: "1",
      userId: "1002",
      fullName: "Sara Teacher",
      email: "teacher@example.com",
      phone: "700000003",
      specialization: null,
      qualification: null,
      hireDate: null
    });
    vi.mocked(repositoryMock.hasTeacherBehaviorAssignment).mockResolvedValue(true);
    vi.mocked(repositoryMock.createBehaviorRecord).mockResolvedValue("10");
    vi.mocked(repositoryMock.findBehaviorRecordById).mockResolvedValue(behaviorRecordRow());

    const response = await behaviorService.createRecord(
      {
        userId: "1001",
        role: "admin",
        email: "admin@example.com",
        isActive: true
      },
      {
        studentId: "1",
        behaviorCategoryId: "5",
        academicYearId: "1",
        semesterId: "2",
        teacherId: "1002",
        behaviorDate: "2026-03-10"
      }
    );

    expect(response.id).toBe("10");
    expect(repositoryMock.createBehaviorRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        teacherId: "1",
        supervisorId: undefined
      }),
      expect.anything()
    );
  });

  it("normalizes teacher and supervisor user ids in behavior list filters", async () => {
    vi.mocked(profileResolutionServiceMock.requireTeacherProfileIdentifier).mockResolvedValue({
      teacherId: "1",
      userId: "1002",
      fullName: "Sara Teacher",
      email: "teacher@example.com",
      phone: "700000003",
      specialization: null,
      qualification: null,
      hireDate: null
    });
    vi.mocked(profileResolutionServiceMock.requireSupervisorProfileIdentifier).mockResolvedValue({
      supervisorId: "1",
      userId: "1005",
      fullName: "Mona Supervisor",
      email: "supervisor@example.com",
      phone: "700000005",
      department: null
    });
    vi.mocked(repositoryMock.listBehaviorRecords).mockResolvedValue({
      rows: [behaviorRecordRow()],
      totalItems: 1
    });

    const response = await behaviorService.listRecords(
      {
        userId: "1001",
        role: "admin",
        email: "admin@example.com",
        isActive: true
      },
      {
        page: 1,
        limit: 20,
        sortBy: "behaviorDate",
        sortOrder: "desc",
        teacherId: "1002",
        supervisorId: "1005"
      }
    );

    expect(response.items).toHaveLength(1);
    expect(repositoryMock.listBehaviorRecords).toHaveBeenCalledWith(
      expect.objectContaining({
        teacherId: "1",
        supervisorId: "1"
      }),
      {}
    );
  });

  it("rejects non-admin actor ids and unauthorized record access", async () => {
    vi.mocked(profileResolutionServiceMock.requireTeacherProfile).mockResolvedValue({
      teacherId: "1",
      userId: "1002",
      fullName: "Sara Teacher",
      email: "teacher@example.com",
      phone: "700000003",
      specialization: null,
      qualification: null,
      hireDate: null
    });
    vi.mocked(repositoryMock.findStudentBehaviorReferenceById).mockResolvedValue(studentRow());
    vi.mocked(repositoryMock.findBehaviorCategoryById).mockResolvedValue(categoryRow());
    vi.mocked(repositoryMock.findAcademicYearById).mockResolvedValue({
      id: "1",
      name: "2025-2026"
    });
    vi.mocked(repositoryMock.findSemesterById).mockResolvedValue({
      id: "2",
      name: "Semester 2",
      academicYearId: "1"
    });

    await expect(
      behaviorService.createRecord(
        {
          userId: "1002",
          role: "teacher",
          email: "teacher@example.com",
          isActive: true
        },
        {
          studentId: "1",
          behaviorCategoryId: "5",
          academicYearId: "1",
          semesterId: "2",
          behaviorDate: "2026-03-10",
          supervisorId: "1"
        }
      )
    ).rejects.toBeInstanceOf(ValidationError);

    vi.mocked(repositoryMock.findBehaviorRecordById).mockResolvedValue(
      behaviorRecordRow({
        teacherId: null,
        teacherFullName: null,
        supervisorId: "1",
        supervisorFullName: "Mona Supervisor"
      })
    );

    await expect(
      behaviorService.getRecordById(
        {
          userId: "1002",
          role: "teacher",
          email: "teacher@example.com",
          isActive: true
        },
        "10"
      )
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("returns scoped student behavior records and summaries", async () => {
    vi.mocked(profileResolutionServiceMock.requireTeacherProfile).mockResolvedValue({
      teacherId: "1",
      userId: "1002",
      fullName: "Sara Teacher",
      email: "teacher@example.com",
      phone: "700000003",
      specialization: null,
      qualification: null,
      hireDate: null
    });
    vi.mocked(repositoryMock.findStudentBehaviorReferenceById).mockResolvedValue(studentRow());
    vi.mocked(repositoryMock.hasTeacherBehaviorAssignment).mockResolvedValue(true);
    vi.mocked(repositoryMock.listBehaviorRecords).mockResolvedValue([behaviorRecordRow()]);

    const response = await behaviorService.listStudentRecords(
      {
        userId: "1002",
        role: "teacher",
        email: "teacher@example.com",
        isActive: true
      },
      "1"
    );

    expect(repositoryMock.findStudentBehaviorReferenceById).toHaveBeenCalledWith(
      "1",
      "1"
    );
    expect(response.summary.totalBehaviorRecords).toBe(1);
    expect(response.records[0].actorType).toBe("teacher");
  });

  it("updates behavior records and blocks access for unrelated supervisors", async () => {
    vi.mocked(profileResolutionServiceMock.requireSupervisorProfile).mockResolvedValue({
      supervisorId: "1",
      userId: "1005",
      fullName: "Mona Supervisor",
      email: "supervisor@example.com",
      phone: "700000005",
      department: null
    });
    vi.mocked(repositoryMock.findBehaviorRecordById)
      .mockResolvedValueOnce(
        behaviorRecordRow({
          supervisorId: null
        })
      )
      .mockResolvedValueOnce(
        behaviorRecordRow({
          behaviorCategoryId: "6",
          behaviorCode: "disruption",
          behaviorName: "Disruption",
          severity: 4,
          description: "Updated"
        })
      );
    vi.mocked(repositoryMock.updateBehaviorRecord).mockResolvedValue(undefined);

    await expect(
      behaviorService.updateRecord(
        {
          userId: "1005",
          role: "supervisor",
          email: "supervisor@example.com",
          isActive: true
        },
        "10",
        {
          severity: 4
        }
      )
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("triggers negative-behavior automation after updating a record to a negative category", async () => {
    vi.mocked(repositoryMock.findBehaviorRecordById)
      .mockResolvedValueOnce(
        behaviorRecordRow({
          behaviorType: "positive",
          behaviorName: "Participation"
        })
      )
      .mockResolvedValueOnce(
        behaviorRecordRow({
          behaviorCategoryId: "6",
          behaviorCode: "disruption",
          behaviorName: "Disruption",
          behaviorType: "negative",
          severity: 4,
          description: "Updated"
        })
      );
    vi.mocked(repositoryMock.findBehaviorCategoryById).mockResolvedValue(
      categoryRow({
        id: "6",
        code: "disruption",
        name: "Disruption",
        behaviorType: "negative",
        defaultSeverity: 4
      })
    );
    vi.mocked(repositoryMock.updateBehaviorRecord).mockResolvedValue(undefined);

    await behaviorService.updateRecord(
      {
        userId: "1001",
        role: "admin",
        email: "admin@example.com",
        isActive: true
      },
      "10",
      {
        behaviorCategoryId: "6",
        severity: 4
      }
    );

    expect(automationMock.onNegativeBehavior).toHaveBeenCalledWith({
      behaviorRecordId: "10",
      studentId: "1",
      studentName: "Student One",
      categoryName: "Disruption",
      behaviorDate: "2026-03-10"
    });
  });
});
