import { beforeEach, describe, expect, it, vi } from "vitest";

import { ForbiddenError } from "../../src/common/errors/forbidden-error";
import { ValidationError } from "../../src/common/errors/validation-error";
import type { ActiveAcademicContext } from "../../src/common/services/active-academic-context.service";
import { db } from "../../src/database/db";
import { AssessmentsService } from "../../src/modules/assessments/service/assessments.service";
import type { AssessmentsRepository } from "../../src/modules/assessments/repository/assessments.repository";
import type {
  AssessmentRow,
  AssessmentScoreRosterRow,
  AssessmentTypeRow,
  ClassReferenceRow,
  SemesterReferenceRow,
  StudentAssessmentRow,
  SubjectReferenceRow,
  TeacherProfileRow
} from "../../src/modules/assessments/types/assessments.types";

const assessmentTypeRow = (
  overrides: Partial<AssessmentTypeRow> = {}
): AssessmentTypeRow => ({
  id: "1",
  code: "exam",
  name: "Exam",
  description: null,
  isActive: true,
  ...overrides
});

const teacherProfile = (
  overrides: Partial<TeacherProfileRow> = {}
): TeacherProfileRow => ({
  teacherId: "1",
  teacherUserId: "1002",
  teacherFullName: "Sara Teacher",
  teacherEmail: "teacher@example.com",
  teacherPhone: "700000003",
  ...overrides
});

const classRow = (overrides: Partial<ClassReferenceRow> = {}): ClassReferenceRow => ({
  id: "1",
  className: "A",
  section: "A",
  gradeLevelId: "1",
  gradeLevelName: "Grade 1",
  academicYearId: "1",
  academicYearName: "2025-2026",
  ...overrides
});

const subjectRow = (overrides: Partial<SubjectReferenceRow> = {}): SubjectReferenceRow => ({
  id: "1",
  name: "Science",
  code: "SCI-G1",
  gradeLevelId: "1",
  gradeLevelName: "Grade 1",
  ...overrides
});

const semesterRow = (
  overrides: Partial<SemesterReferenceRow> = {}
): SemesterReferenceRow => ({
  id: "2",
  name: "Semester 2",
  academicYearId: "1",
  ...overrides
});

const assessmentRow = (overrides: Partial<AssessmentRow> = {}): AssessmentRow => ({
  id: "10",
  assessmentTypeId: "1",
  assessmentTypeCode: "exam",
  assessmentTypeName: "Exam",
  classId: "1",
  className: "A",
  section: "A",
  gradeLevelId: "1",
  gradeLevelName: "Grade 1",
  subjectId: "1",
  subjectName: "Science",
  subjectCode: "SCI-G1",
  teacherId: "1",
  teacherUserId: "1002",
  teacherFullName: "Sara Teacher",
  teacherEmail: "teacher@example.com",
  teacherPhone: "700000003",
  academicYearId: "1",
  academicYearName: "2025-2026",
  semesterId: "2",
  semesterName: "Semester 2",
  title: "Monthly Exam",
  description: null,
  maxScore: 100,
  weight: 10,
  assessmentDate: "2026-03-01",
  isPublished: false,
  createdAt: new Date("2026-03-13T10:00:00.000Z"),
  updatedAt: new Date("2026-03-13T10:00:00.000Z"),
  gradedCount: 1,
  expectedCount: 2,
  averageScore: 80,
  averagePercentage: 80,
  ...overrides
});

const rosterRow = (
  overrides: Partial<AssessmentScoreRosterRow> = {}
): AssessmentScoreRosterRow => ({
  studentId: "1",
  academicNo: "STU-1001",
  fullName: "Student One",
  studentStatus: "active",
  studentAssessmentId: null,
  score: null,
  remarks: null,
  gradedAt: null,
  percentage: null,
  ...overrides
});

const studentAssessmentRow = (
  overrides: Partial<StudentAssessmentRow> = {}
): StudentAssessmentRow => ({
  studentAssessmentId: "100",
  assessmentId: "10",
  studentId: "1",
  academicNo: "STU-1001",
  fullName: "Student One",
  score: 75,
  remarks: null,
  gradedAt: new Date("2026-03-13T11:00:00.000Z"),
  percentage: 75,
  classId: "1",
  teacherId: "1",
  academicYearId: "1",
  maxScore: 100,
  ...overrides
});

describe("AssessmentsService", () => {
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
    createAssessmentType: vi.fn(),
    listActiveAssessmentTypes: vi.fn(),
    findAssessmentTypeById: vi.fn(),
    findTeacherProfileByUserId: vi.fn(),
    findTeacherById: vi.fn(),
    findClassById: vi.fn(),
    findSubjectById: vi.fn(),
    findAcademicYearById: vi.fn(),
    findSemesterById: vi.fn(),
    hasActiveSubjectOffering: vi.fn(),
    hasTeacherAssignment: vi.fn(),
    createAssessment: vi.fn(),
    listAssessments: vi.fn(),
    findAssessmentById: vi.fn(),
    listAssessmentScores: vi.fn(),
    upsertStudentAssessments: vi.fn(),
    findStudentAssessmentById: vi.fn(),
    updateStudentAssessment: vi.fn()
  };
  const profileResolutionServiceMock = {
    requireTeacherProfileIdentifier: vi.fn()
  };
  const activeAcademicContextServiceMock = {
    getActiveContext: vi.fn(),
    requireActiveContext: vi.fn(),
    resolveActiveAcademicYear: vi.fn(),
    resolveOperationalContext: vi.fn()
  };

  let assessmentsService: AssessmentsService;

  beforeEach(() => {
    assessmentsService = new AssessmentsService(
      repositoryMock as unknown as AssessmentsRepository,
      profileResolutionServiceMock as never,
      undefined,
      activeAcademicContextServiceMock as never
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

  it("creates an assessment for an assigned admin-selected teacher user id", async () => {
    vi.mocked(repositoryMock.findAssessmentTypeById).mockResolvedValue(assessmentTypeRow());
    vi.mocked(repositoryMock.findClassById).mockResolvedValue(classRow());
    vi.mocked(repositoryMock.findSubjectById).mockResolvedValue(subjectRow());
    vi.mocked(repositoryMock.findAcademicYearById).mockResolvedValue({
      id: "1",
      name: "2025-2026"
    });
    vi.mocked(repositoryMock.findSemesterById).mockResolvedValue(semesterRow());
    vi.mocked(repositoryMock.hasActiveSubjectOffering).mockResolvedValue(true);
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
    vi.mocked(repositoryMock.hasTeacherAssignment).mockResolvedValue(true);
    vi.mocked(repositoryMock.createAssessment).mockResolvedValue("10");
    vi.mocked(repositoryMock.findAssessmentById).mockResolvedValue(assessmentRow());

    const response = await assessmentsService.createAssessment(
      {
        userId: "1001",
        role: "admin",
        email: "admin@example.com",
        isActive: true
      },
        {
          assessmentTypeId: "1",
          classId: "1",
          subjectId: "1",
          teacherId: "1002",
          academicYearId: "1",
          semesterId: "2",
          title: "Monthly Exam",
        maxScore: 100,
        weight: 10,
        assessmentDate: "2026-03-01"
      }
    );

    expect(response.assessment.id).toBe("10");
    expect(repositoryMock.createAssessment).toHaveBeenCalledOnce();
  });

  it("normalizes teacher user ids in assessment list filters", async () => {
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
    vi.mocked(repositoryMock.listAssessments).mockResolvedValue({
      rows: [assessmentRow()],
      totalItems: 1
    });

    const response = await assessmentsService.listAssessments(
      {
        userId: "1001",
        role: "admin",
        email: "admin@example.com",
        isActive: true
      },
      {
        page: 1,
        limit: 20,
        sortBy: "assessmentDate",
        sortOrder: "desc",
        teacherId: "1002"
      }
    );

    expect(response.items).toHaveLength(1);
    expect(repositoryMock.listAssessments).toHaveBeenCalledWith(
      expect.objectContaining({
        teacherId: "1"
      }),
      {}
    );
  });

  it("rejects teachers that send teacherId in create assessment payloads", async () => {
    vi.mocked(repositoryMock.findTeacherProfileByUserId).mockResolvedValue(teacherProfile());
    vi.mocked(repositoryMock.findAssessmentTypeById).mockResolvedValue(assessmentTypeRow());
    vi.mocked(repositoryMock.findClassById).mockResolvedValue(classRow());
    vi.mocked(repositoryMock.findSubjectById).mockResolvedValue(subjectRow());
    vi.mocked(repositoryMock.findAcademicYearById).mockResolvedValue({
      id: "1",
      name: "2025-2026"
    });
    vi.mocked(repositoryMock.findSemesterById).mockResolvedValue(semesterRow());
    vi.mocked(repositoryMock.hasActiveSubjectOffering).mockResolvedValue(true);

    await expect(
      assessmentsService.createAssessment(
        {
          userId: "1002",
          role: "teacher",
          email: "teacher@example.com",
          isActive: true
        },
        {
          assessmentTypeId: "1",
          classId: "1",
          subjectId: "1",
          teacherId: "99",
          academicYearId: "1",
          semesterId: "2",
          title: "Teacher Quiz",
          maxScore: 20,
          assessmentDate: "2026-03-02"
        }
      )
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("rejects class and semester mismatches before inserting assessments", async () => {
    vi.mocked(repositoryMock.findAssessmentTypeById).mockResolvedValue(assessmentTypeRow());
    vi.mocked(repositoryMock.findClassById).mockResolvedValue(
      classRow({
        academicYearId: "2"
      })
    );
    vi.mocked(repositoryMock.findSubjectById).mockResolvedValue(subjectRow());
    vi.mocked(repositoryMock.findAcademicYearById).mockResolvedValue({
      id: "1",
      name: "2025-2026"
    });
    vi.mocked(repositoryMock.findSemesterById).mockResolvedValue(
      semesterRow({
        academicYearId: "2"
      })
    );

    await expect(
      assessmentsService.createAssessment(
        {
          userId: "1001",
          role: "admin",
          email: "admin@example.com",
          isActive: true
        },
        {
          assessmentTypeId: "1",
          classId: "1",
          subjectId: "1",
          teacherId: "1",
          academicYearId: "1",
          semesterId: "2",
          title: "Invalid Assessment",
          maxScore: 50,
          assessmentDate: "2026-03-03"
        }
      )
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("rejects assessment creation when the subject is not offered in the selected semester", async () => {
    vi.mocked(repositoryMock.findAssessmentTypeById).mockResolvedValue(assessmentTypeRow());
    vi.mocked(repositoryMock.findClassById).mockResolvedValue(classRow());
    vi.mocked(repositoryMock.findSubjectById).mockResolvedValue(subjectRow());
    vi.mocked(repositoryMock.findAcademicYearById).mockResolvedValue({
      id: "1",
      name: "2025-2026"
    });
    vi.mocked(repositoryMock.findSemesterById).mockResolvedValue(semesterRow());
    vi.mocked(repositoryMock.hasActiveSubjectOffering).mockResolvedValue(false);

    await expect(
      assessmentsService.createAssessment(
        {
          userId: "1001",
          role: "admin",
          email: "admin@example.com",
          isActive: true
        },
        {
          assessmentTypeId: "1",
          classId: "1",
          subjectId: "1",
          teacherId: "1",
          academicYearId: "1",
          semesterId: "2",
          title: "Invalid Offering",
          maxScore: 50,
          assessmentDate: "2026-03-03"
        }
      )
    ).rejects.toMatchObject({
      message: "Subject is not offered in the selected semester"
    });
  });

  it("rejects duplicate students and students outside the assessment roster", async () => {
    vi.mocked(repositoryMock.findAssessmentById).mockResolvedValue(assessmentRow());
    vi.mocked(repositoryMock.listAssessmentScores).mockResolvedValue([rosterRow()]);

    await expect(
      assessmentsService.saveAssessmentScores(
        {
          userId: "1001",
          role: "admin",
          email: "admin@example.com",
          isActive: true
        },
        "10",
        {
          records: [
            {
              studentId: "1",
              score: 10
            },
            {
              studentId: "1",
              score: 12
            }
          ]
        }
      )
    ).rejects.toBeInstanceOf(ValidationError);

    await expect(
      assessmentsService.saveAssessmentScores(
        {
          userId: "1001",
          role: "admin",
          email: "admin@example.com",
          isActive: true
        },
        "10",
        {
          records: [
            {
              studentId: "2",
              score: 10
            }
          ]
        }
      )
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("updates one student assessment and blocks teachers from editing other teachers' records", async () => {
    vi.mocked(repositoryMock.findTeacherProfileByUserId).mockResolvedValue(teacherProfile());
    vi.mocked(repositoryMock.findStudentAssessmentById)
      .mockResolvedValueOnce(
        studentAssessmentRow({
          teacherId: "2"
        })
      )
      .mockResolvedValueOnce(studentAssessmentRow());
    vi.mocked(repositoryMock.updateStudentAssessment).mockResolvedValue(undefined);

    await expect(
      assessmentsService.updateStudentAssessment(
        {
          userId: "1002",
          role: "teacher",
          email: "teacher@example.com",
          isActive: true
        },
        "100",
        {
          score: 80
        }
      )
    ).rejects.toBeInstanceOf(ForbiddenError);

    vi.mocked(repositoryMock.findStudentAssessmentById).mockReset();
    vi.mocked(repositoryMock.findStudentAssessmentById)
      .mockResolvedValueOnce(studentAssessmentRow())
      .mockResolvedValueOnce(
        studentAssessmentRow({
          score: 85,
          remarks: "Regraded"
        })
      );

    const response = await assessmentsService.updateStudentAssessment(
      {
        userId: "1001",
        role: "admin",
        email: "admin@example.com",
        isActive: true
      },
      "100",
      {
        score: 85,
        remarks: "Regraded"
      }
    );

    expect(response.score).toBe(85);
    expect(repositoryMock.updateStudentAssessment).toHaveBeenCalledOnce();
  });
});
